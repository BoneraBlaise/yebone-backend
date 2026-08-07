const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const normalizeEmail = require("./normalizeEmail");
const sendMail = require("./sendMail");
const {
  generateOtp,
  isRateLimitExceeded,
  incrementRequestCount,
  storeOtpOnUser,
  verifyOtpForUser,
  clearOtpFields,
  clearAllPasswordResetFields,
  OTP_TTL_MS,
} = require("./passwordResetOtp");
const { validatePasswordPolicy } = require("./passwordPolicy");
const { logAuthEvent } = require("./authAuditLog");
const {
  buildPasswordResetOtpEmail,
  buildPasswordChangedEmail,
} = require("./email/passwordResetOtpEmail");

const GENERIC_OTP_SENT_MESSAGE =
  "If an account exists, a verification code has been sent.";

function createResetSessionToken(userId, sessionId) {
  return jwt.sign(
    { userId: String(userId), purpose: "password_reset", sessionId },
    process.env.ACTIVATION_SECRET,
    { expiresIn: "10m" }
  );
}

function createBackupResetToken(userId, sessionId) {
  return jwt.sign(
    { userId: String(userId), purpose: "password_reset_backup", sessionId },
    process.env.ACTIVATION_SECRET,
    { expiresIn: "10m" }
  );
}

function verifyResetSessionToken(token) {
  const decoded = jwt.verify(token, process.env.ACTIVATION_SECRET);
  if (
    !decoded?.userId ||
    !["password_reset", "password_reset_backup"].includes(decoded.purpose)
  ) {
    throw new Error("Invalid reset session");
  }
  return decoded;
}

async function requestPasswordResetOtp({ email, User, ip }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { success: true, message: GENERIC_OTP_SENT_MESSAGE };
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordResetOtpHash"
  );

  if (!user) {
    logAuthEvent("password_reset_requested", {
      email: normalizedEmail,
      ip,
      success: true,
      reason: "no_account",
    });
    return { success: true, message: GENERIC_OTP_SENT_MESSAGE };
  }

  if (isRateLimitExceeded(user)) {
    logAuthEvent("password_reset_rate_limited", {
      userId: user._id,
      email: normalizedEmail,
      ip,
      success: false,
    });
    return { success: true, message: GENERIC_OTP_SENT_MESSAGE };
  }

  incrementRequestCount(user);

  const otp = generateOtp();
  const sessionId = crypto.randomBytes(16).toString("hex");
  await storeOtpOnUser(user, otp);
  user.passwordResetSessionTokenId = sessionId;
  await user.save();

  const frontendBase = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const backupToken = createBackupResetToken(user._id, sessionId);
  const backupResetUrl = `${frontendBase}/forgot-password?step=reset&token=${backupToken}`;

  const emailContent = buildPasswordResetOtpEmail({
    otp,
    backupResetUrl,
    userName: user.name,
  });

  const mailResult = await sendMail({
    email: user.email,
    subject: emailContent.subject,
    message: emailContent.text,
    html: emailContent.html,
  });

  logAuthEvent("password_reset_otp_sent", {
    userId: user._id,
    email: normalizedEmail,
    ip,
    success: !mailResult?.skipped,
    reason: mailResult?.skipped ? "smtp_not_configured" : undefined,
  });

  if (mailResult?.skipped) {
    clearOtpFields(user);
    await user.save();
  }

  return {
    success: true,
    message: GENERIC_OTP_SENT_MESSAGE,
    expiresInMs: OTP_TTL_MS,
    mailSkipped: Boolean(mailResult?.skipped),
  };
}

async function verifyPasswordResetOtp({ email, otp, User, ip }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordResetOtpHash"
  );

  if (!user) {
    logAuthEvent("password_reset_otp_verify", {
      email: normalizedEmail,
      ip,
      success: false,
      reason: "no_account",
    });
    return { success: false, message: "Invalid verification code." };
  }

  const result = await verifyOtpForUser(user, otp);

  if (!result.ok) {
    logAuthEvent("password_reset_otp_verify", {
      userId: user._id,
      email: normalizedEmail,
      ip,
      success: false,
      reason: result.code,
    });
    return { success: false, message: result.message, code: result.code };
  }

  const sessionId = user.passwordResetSessionTokenId || crypto.randomBytes(16).toString("hex");
  user.passwordResetSessionTokenId = sessionId;
  clearOtpFields(user);
  await user.save();

  const resetSessionToken = createResetSessionToken(user._id, sessionId);

  logAuthEvent("password_reset_otp_verify", {
    userId: user._id,
    email: normalizedEmail,
    ip,
    success: true,
  });

  return {
    success: true,
    message: "Verification successful.",
    resetSessionToken,
    expiresInMs: OTP_TTL_MS,
  };
}

async function resetPasswordWithSession({ resetSessionToken, newPassword, User, ip }) {
  let decoded;
  try {
    decoded = verifyResetSessionToken(resetSessionToken);
  } catch (err) {
    logAuthEvent("password_reset_complete", { ip, success: false, reason: "invalid_token" });
    return {
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Reset session has expired. Please start again."
          : "Invalid reset session. Please start again.",
    };
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return { success: false, message: policy.errors[0], errors: policy.errors };
  }

  const user = await User.findById(decoded.userId).select(
    "+passwordResetOtpHash +password"
  );

  if (!user) {
    logAuthEvent("password_reset_complete", {
      userId: decoded.userId,
      ip,
      success: false,
      reason: "user_not_found",
    });
    return { success: false, message: "Invalid reset session. Please start again." };
  }

  if (
    !user.passwordResetSessionTokenId ||
    user.passwordResetSessionTokenId !== decoded.sessionId
  ) {
    logAuthEvent("password_reset_complete", {
      userId: user._id,
      ip,
      success: false,
      reason: "session_replay",
    });
    return {
      success: false,
      message: "This reset link has already been used. Please start again.",
    };
  }

  user.password = newPassword;
  clearAllPasswordResetFields(user);
  await user.save();

  const changedEmail = buildPasswordChangedEmail({ userName: user.name });
  await sendMail({
    email: user.email,
    subject: changedEmail.subject,
    message: changedEmail.text,
    html: changedEmail.html,
  });

  logAuthEvent("password_reset_complete", {
    userId: user._id,
    email: user.email,
    ip,
    success: true,
  });

  return { success: true, message: "Password has been reset successfully." };
}

async function resolveBackupResetToken({ token, User, ip }) {
  let decoded;
  try {
    decoded = verifyResetSessionToken(token);
    if (decoded.purpose !== "password_reset_backup") {
      throw new Error("Invalid backup token");
    }
  } catch (err) {
    return {
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Reset link has expired. Please request a new code."
          : "Invalid reset link. Please request a new code.",
    };
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.passwordResetSessionTokenId !== decoded.sessionId) {
    logAuthEvent("password_reset_backup_link", {
      userId: decoded.userId,
      ip,
      success: false,
      reason: "invalid_session",
    });
    return {
      success: false,
      message: "This reset link has already been used or is invalid.",
    };
  }

  const resetSessionToken = createResetSessionToken(user._id, decoded.sessionId);

  logAuthEvent("password_reset_backup_link", {
    userId: user._id,
    email: user.email,
    ip,
    success: true,
  });

  return { success: true, resetSessionToken };
}

module.exports = {
  GENERIC_OTP_SENT_MESSAGE,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithSession,
  resolveBackupResetToken,
  createResetSessionToken,
  verifyResetSessionToken,
};
