const normalizeEmail = require("../utils/normalizeEmail");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || "unknown";
}

/**
 * Lightweight in-memory rate limiter for auth endpoints.
 */
function createAuthRateLimiter({
  name,
  windowMs,
  max,
  keyFn,
  message = "Too many attempts. Please try again later.",
}) {
  const hits = new Map();

  return function authRateLimit(req, res, next) {
    const key = `${name}:${keyFn(req)}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(key, { windowStart: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

const loginRateLimit = createAuthRateLimiter({
  name: "login",
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10),
  keyFn: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email || "")}`,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

const forgotPasswordRateLimit = createAuthRateLimiter({
  name: "forgot-password",
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_FORGOT_RATE_LIMIT_MAX || 10),
  keyFn: (req) => getClientIp(req),
  message: "Too many password reset requests. Please try again later.",
});

const verifyOtpRateLimit = createAuthRateLimiter({
  name: "verify-otp",
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_VERIFY_OTP_RATE_LIMIT_MAX || 20),
  keyFn: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email || "")}`,
  message: "Too many verification attempts. Please try again later.",
});

function authNoStore(req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  next();
}

module.exports = {
  createAuthRateLimiter,
  getClientIp,
  loginRateLimit,
  forgotPasswordRateLimit,
  verifyOtpRateLimit,
  authNoStore,
};
