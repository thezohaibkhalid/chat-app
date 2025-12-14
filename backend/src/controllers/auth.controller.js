import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { generateNumericOTP, hashOTP, verifyOTP } from "../utils/otp.js";
import { sendLoginOTPEmail } from "../utils/mailer.js";

const OTP_TTL_MIN = 10;
const OTP_ATTEMPT_LIMIT = 5;
const RESEND_COOLDOWN_SEC = 30;

function maskEmail(email) {
  const [u, d] = email.split("@");
  const m = u.length <= 2 ? u[0] + "*" : u[0] + "*".repeat(u.length - 2) + u.slice(-1);
  return `${m}@${d}`;
}
function signOtpToken(userId) {
  return jwt.sign({ sub: userId, purpose: "otp" }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });
}
function signAccessToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });
}
function setAuthCookie(res, token) {
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function signup(req, res) {
  const { email, password, fullName } = req.body;
  try {
    if (!email || !password || !fullName) return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const confirmPassword = password;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: "Email already exists, please use a diffrent one" });

    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const newUser = await User.create({
      email: email.toLowerCase(),
      fullName,
      password,
      confirmPassword,
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
    } catch (e) {
      console.log("Stream upsert failed:", e?.message);
    }

    // Do NOT auto-login. Force OTP on first login.
    return res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in signup controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({ message: "Account temporarily locked. Try later." });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const mustOtp = true;

    if (!mustOtp) {
      const token = signAccessToken(user);
      setAuthCookie(res, token);
      return res.status(200).json({ success: true, user });
    }

    const code = generateNumericOTP(6);
    user.otpHash = await hashOTP(code);
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    let emailSent = true;
    try {
      await sendLoginOTPEmail({ to: user.email, name: user.fullName, code });
    } catch (mailErr) {
      emailSent = false;
      console.error("sendLoginOTPEmail failed:", mailErr?.message);
      // We still proceed so you can verify via resend once SMTP is fixed.
    }

    const otpToken = signOtpToken(user._id);
    return res.status(200).json({
      status: "OTP_REQUIRED",
      otpToken,
      email: maskEmail(user.email),
      expiresInMin: OTP_TTL_MIN,
      emailSent,
    });
  } catch (error) {
    console.log("Error in login controller", error?.message || error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { code, otpToken } = req.body;
    if (!code || !otpToken) return res.status(400).json({ message: "Missing code/token" });

    let payload;
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(400).json({ message: "OTP session expired. Please login again." });
    }
    if (payload.purpose !== "otp") return res.status(400).json({ message: "Invalid token" });

    const user = await User.findById(payload.sub).select("+otpHash +otpExpiresAt +otpAttempts +lockUntil");
    if (!user || !user.otpHash || !user.otpExpiresAt) return res.status(400).json({ message: "No active verification" });

    if (new Date() > user.otpExpiresAt) return res.status(400).json({ message: "Code expired" });

    if (user.otpAttempts >= OTP_ATTEMPT_LIMIT) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      return res.status(423).json({ message: "Too many attempts. Temporarily locked." });
    }

    const ok = await verifyOTP(code, user.otpHash);
    if (!ok) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid code" });
    }

    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.lockUntil = undefined;
    if (!user.emailVerified) user.emailVerified = true;
    await user.save();

    const token = signAccessToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("verifyOtp error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function resendOtp(req, res) {
  try {
    const { otpToken } = req.body;
    if (!otpToken) return res.status(400).json({ message: "Missing otpToken" });

    let payload;
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(400).json({ message: "OTP session expired. Please login again." });
    }
    if (payload.purpose !== "otp") return res.status(400).json({ message: "Invalid token" });

    const user = await User.findById(payload.sub).select("+otpLastSentAt");
    if (!user) return res.status(400).json({ message: "Invalid user" });

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil(RESEND_COOLDOWN_SEC - (Date.now() - user.otpLastSentAt.getTime()) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before resending.` });
    }

    const code = generateNumericOTP(6);
    user.otpHash = await hashOTP(code);
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    try {
      await sendLoginOTPEmail({ to: user.email, name: user.fullName, code });
    } catch (mailErr) {
      console.error("sendLoginOTPEmail (resend) failed:", mailErr?.message);
      return res.status(200).json({ message: "OTP regenerated but email send failed; try again shortly." });
    }

    return res.status(200).json({ message: "OTP resent" });
  } catch (error) {
    console.error("resendOtp error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location",
        ].filter(Boolean),
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...req.body, isOnboarded: true },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (e) {
      console.log("Stream update failed:", e?.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
