const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

function validatePasswordPolicy(password) {
  const errors = [];

  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password || "")) {
    errors.push("Password must include at least one uppercase letter");
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password || "")) {
    errors.push("Password must include at least one lowercase letter");
  }
  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password || "")) {
    errors.push("Password must include at least one number");
  }
  if (PASSWORD_POLICY.requireSpecial && !SPECIAL_CHAR_PATTERN.test(password || "")) {
    errors.push("Password must include at least one special character");
  }

  return { valid: errors.length === 0, errors };
}

function isPasswordPolicyValid(password) {
  return validatePasswordPolicy(password).valid;
}

module.exports = {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  MAX_REQUESTS_PER_HOUR,
  RESEND_COOLDOWN_MS,
  PASSWORD_POLICY,
  validatePasswordPolicy,
  isPasswordPolicyValid,
};
