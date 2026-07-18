function createAIRateLimiter({
  windowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000),
  max = 20,
  keyPrefix = "ai",
} = {}) {
  const hits = new Map();

  return function aiRateLimiter(req, res, next) {
    const actor = req.user?._id || req.ip || req.headers["x-forwarded-for"] || "anonymous";
    const routeKey = `${keyPrefix}:${req.method}:${req.path}:${actor}`;
    const now = Date.now();
    const entry = hits.get(routeKey);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(routeKey, { windowStart: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many AI requests. Please try again shortly.",
        requestId: req.aiRequestId || null,
      });
    }

    return next();
  };
}

const chatRateLimiter = createAIRateLimiter({
  keyPrefix: "ai-chat",
  max: Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 20),
});

const searchRateLimiter = createAIRateLimiter({
  keyPrefix: "ai-search",
  max: Number(process.env.AI_SEARCH_RATE_LIMIT_MAX || 30),
});

module.exports = {
  createAIRateLimiter,
  chatRateLimiter,
  searchRateLimiter,
};
