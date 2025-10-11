import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateNumericOTP(len = 6) {
  const n = crypto.randomInt(0, 10 ** len);
  return String(n).padStart(len, "0");
}
export async function hashOTP(otp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}
export async function verifyOTP(otp, otpHash) {
  return bcrypt.compare(otp, otpHash || "");
}
