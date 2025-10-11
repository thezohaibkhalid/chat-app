import { useEffect, useRef, useState } from "react";
import { ShipWheelIcon } from "lucide-react";
import { Link } from "react-router";
import useLogin from "../hooks/useLogin";
import toast from "react-hot-toast";

const DIGITS = 6;

function OTPInputs({ value, setValue, onSubmit, disabled }) {
  const refs = useRef(Array.from({ length: DIGITS }, () => null));

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setAt = (idx, chars) => {
    const arr = value.padEnd(DIGITS, "").split("");
    let i = 0;
    while (i < chars.length && idx + i < DIGITS) {
      arr[idx + i] = chars[i];
      i++;
    }
    setValue(arr.join(""));
    return Math.min(idx + i, DIGITS - 1);
  };

  const onChange = (idx, v) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 0) {
      const arr = value.split("");
      arr[idx] = "";
      setValue(arr.join(""));
      return;
    }
    if (digits.length === 1) {
      setAt(idx, digits);
      if (idx < DIGITS - 1) refs.current[idx + 1]?.focus();
    } else {
      const nextIdx = setAt(idx, digits);
      refs.current[nextIdx]?.focus();
    }
    if (value.replace(/\D/g, "").length === DIGITS - 1 && digits.length >= 1) onSubmit?.();
  };

  const onKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.split("");
      if (arr[idx]) {
        arr[idx] = "";
        setValue(arr.join(""));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const arr2 = value.split("");
        arr2[idx - 1] = "";
        setValue(arr2.join(""));
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < DIGITS - 1) {
      refs.current[idx + 1]?.focus();
    } else if (e.key === "Enter") {
      onSubmit?.();
    }
  };

  const onPaste = (idx, e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, DIGITS);
    if (!text) return;
    const nextIdx = setAt(idx, text);
    refs.current[nextIdx]?.focus();
    if (value.replace(/\D/g, "").length + text.length >= DIGITS) onSubmit?.();
  };

  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: DIGITS }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          disabled={disabled}
          className="input input-bordered rounded-none w-11 h-12 text-center text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

const LoginPage = () => {
  const [step, setStep] = useState("creds");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [otpToken, setOtpToken] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  const { login, verifyOtp, resendOtp } = useLogin();

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setOtpError("");
    try {
      const res = await login.mutateAsync(loginData);
      if (res.status === "OTP_REQUIRED") {
        setOtpToken(res.otpToken);
        setEmailMasked(res.email);
        setExpiresIn(res.expiresInMin || 10);
        setCooldown(30);
        setOtp("");
        setStep("otp");
        toast.success("Verification code sent to your email");
      } else if (res.success) {
        window.location.href = "/";
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  const submitOTP = async () => {
    if (otp.replace(/\D/g, "").length !== DIGITS) return;
    setOtpError("");
    try {
      const res = await verifyOtp.mutateAsync({ code: otp, otpToken });
      if (res.success) window.location.href = "/";
    } catch (err) {
      setOtpError(err?.response?.data?.message || "Invalid code");
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp.mutateAsync({ otpToken });
      setCooldown(30);
      toast.success("Code resent");
    } catch (err) {
      setOtpError(err?.response?.data?.message || "Please try again shortly.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" data-theme="forest">
      <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">
        <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col">
          <div className="mb-4 flex items-center justify-start gap-2">
            <ShipWheelIcon className="size-9 text-primary" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to secondary tracking-wider">
              BitBuilders Chat
            </span>
          </div>

          {step === "creds" && login.isError && (
            <div className="alert alert-error mb-4">
              <span>{login.error?.response?.data?.message || "Login failed"}</span>
            </div>
          )}
          {step === "otp" && (otpError || verifyOtp.isError) && (
            <div className="alert alert-error mb-4">
              <span>{otpError || verifyOtp.error?.response?.data?.message || "Verification failed"}</span>
            </div>
          )}

          {step === "creds" ? (
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Welcome Back</h2>
                  <p className="text-sm opacity-70">Sign in to your account to continue your language journey</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="form-control w-full space-y-2">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="hello@example.com"
                      className="input input-bordered w-full"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control w-full space-y-2">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered w-full"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={login.isPending}>
                    {login.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Signing in…
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                  <div className="text-center mt-4">
                    <p className="text-sm">
                      Don&apos;t have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Create one
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitOTP();
              }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Verify your login</h2>
                <p className="text-sm opacity-70">
                  Enter the 6-digit code we sent to <strong>{emailMasked}</strong>
                  {expiresIn ? ` • Expires in ~${expiresIn} min` : ""}
                </p>
              </div>
              <OTPInputs value={otp} setValue={setOtp} onSubmit={submitOTP} disabled={verifyOtp.isPending} />
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={verifyOtp.isPending || otp.replace(/\D/g, "").length !== DIGITS}
              >
                {verifyOtp.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Verifying…
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResend}
                  disabled={resendOtp.isPending || cooldown > 0}
                >
                  {resendOtp.isPending ? "Resending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setStep("creds")}>
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center">
          <div className="max-w-md p-8">
            <div className="relative aspect-square max-w-sm mx-auto">
              <img src="/i.png" alt="Language connection illustration" className="w-full h-full" />
            </div>
            <div className="text-center space-y-3 mt-6">
              <h2 className="text-xl font-semibold">Connect with People who share your interests</h2>
              <p className="opacity-70">
                Chat with people who share your interests, make friends, and connect with like-minded individuals
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
