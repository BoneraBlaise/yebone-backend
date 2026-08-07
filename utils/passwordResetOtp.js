const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  MAX_REQUESTS_PER_HOUR,
} = require("./passwordPolicy");

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function hashOtp(otp) {
  return bcrypt.hash(String(otp), 10);
}

async function verifyOtp(otp, hash) {
  if (!otp || !hash) return false;
  return bcrypt.compare(String(otp).trim(), hash);
}

function isOtpExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() > new Date(expiresAt).getTime();
}

function getOtpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MS);
}

function isRateLimitExceeded(user) {
  const windowStart = user.passwordResetRequestWindowStart;
  const count = user.passwordResetRequestCount || 0;

  if (!windowStart) return false;

  const hourElapsed = Date.now() - new Date(windowStart).getTime() >= 60 * 60 * 1000;
  if (hourElapsed) return false;

  return count >= MAX_REQUESTS_PER_HOUR;
}

function incrementRequestCount(user) {
  const now = new Date();
  const windowStart = user.passwordResetRequestWindowStart;
  const hourElapsed =
    !windowStart || Date.now() - new Date(windowStart).getTime() >= 60 * 60 * 1000;

  if (hourElapsed) {
    user.passwordResetRequestWindowStart = now;
    user.passwordResetRequestCount = 1;
  } else {
    user.passwordResetRequestCount = (user.passwordResetRequestCount || 0) + 1;
  }
}

function clearOtpFields(user) {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpires = undefined;
  user.passwordResetOtpAttempts = 0;
}

function clearAllPasswordResetFields(user) {
  clearOtpFields(user);
  user.passwordResetSessionTokenId = undefined;
}

async function storeOtpOnUser(user, otp) {
  user.passwordResetOtpHash = await hashOtp(otp);
  user.passwordResetOtpExpires = getOtpExpiryDate();
  user.passwordResetOtpAttempts = 0;
  user.passwordResetSessionTokenId = undefined;
}

async function verifyOtpForUser(user, otp) {
  if (!user.passwordResetOtpHash) {
    return { ok: false, code: "NO_OTP", message: "No verification code found. Please request a new one." };
  }

  if (isOtpExpired(user.passwordResetOtpExpires)) {
    clearOtpFields(user);
    await user.save();
    return { ok: false, code: "EXPIRED", message: "Verification code has expired. Please request a new one." };
  }

  if ((user.passwordResetOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    clearOtpFields(user);
    await user.save();
    return {
      ok: false,
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many failed attempts. Please request a new verification code.",
    };
  }

  const match = await verifyOtp(otp, user.passwordResetOtpHash);
  if (!match) {
    user.passwordResetOtpAttempts = (user.passwordResetOtpAttempts || 0) + 1;
    if (user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      clearOtpFields(user);
      await user.save();
      return {
        ok: false,
        code: "TOO_MANY_ATTEMPTS",
        message: "Too many failed attempts. Please request a new verification code.",
      };
    }
    await user.save();
    const remaining = MAX_OTP_ATTEMPTS - user.passwordResetOtpAttempts;
    return {
      ok: false,
      code: "INVALID_OTP",
      message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  return { ok: true };
}

module.exports = {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  MAX_REQUESTS_PER_HOUR,
  generateOtp,
  hashOtp,
  verifyOtp,
  isOtpExpired,
  getOtpExpiryDate,
  isRateLimitExceeded,
  incrementRequestCount,
  clearOtpFields,
  clearAllPasswordResetFields,
  storeOtpOnUser,
  verifyOtpForUser,
};
