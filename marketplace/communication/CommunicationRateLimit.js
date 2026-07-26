function createCommunicationRateLimiter({
  windowMs = Number(process.env.COMMUNICATION_RATE_LIMIT_WINDOW_MS || 60_000),
  max = Number(process.env.COMMUNICATION_RATE_LIMIT_MAX || 60),
  keyPrefix = "communication",
} = {}) {
  const hits = new Map();

  return function communicationRateLimiter(req, res, next) {
    const actor =
      req.user?._id ||
      req.seller?._id ||
      req.ip ||
      req.headers["x-forwarded-for"] ||
      "anonymous";
    const routeKey = `${keyPrefix}:${req.method}:${req.baseUrl}${req.path}:${actor}`;
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
        message: "Too many requests. Please try again shortly.",
      });
    }

    return next();
  };
}

const communicationMutationLimiter = createCommunicationRateLimiter({
  keyPrefix: "communication-mutation",
  max: Number(process.env.COMMUNICATION_MUTATION_RATE_LIMIT_MAX || 30),
});

module.exports = {
  createCommunicationRateLimiter,
  communicationMutationLimiter,
};
