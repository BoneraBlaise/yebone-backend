/**
 * Minimal production security middleware — no extra npm packages required.
 * Applies baseline security headers and a lightweight in-memory rate limit.
 */
function createSecurityHeadersMiddleware() {
  return function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains"
      );
    }
    next();
  };
}

function createBasicRateLimitMiddleware({
  windowMs = 60_000,
  max = Number(process.env.RATE_LIMIT_MAX || 120),
} = {}) {
  const hits = new Map();

  return function basicRateLimit(req, res, next) {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(key, { windowStart: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again shortly.",
      });
    }
    return next();
  };
}

function applyProductionMiddleware(app) {
  app.use(createSecurityHeadersMiddleware());
  app.use(createBasicRateLimitMiddleware());
  return app;
}

module.exports = {
  createSecurityHeadersMiddleware,
  createBasicRateLimitMiddleware,
  applyProductionMiddleware,
};
