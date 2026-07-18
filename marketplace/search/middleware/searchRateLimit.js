/**
 * Configurable rate limiting for search endpoints.
 */
function createSearchRateLimiter({
  windowMs = Number(process.env.SEARCH_RATE_LIMIT_WINDOW_MS || 60_000),
  max = Number(process.env.SEARCH_RATE_LIMIT_MAX || 60),
  keyPrefix = "search",
} = {}) {
  const hits = new Map();

  return function searchRateLimiter(req, res, next) {
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
        message: "Too many search requests. Please try again shortly.",
      });
    }

    return next();
  };
}

const searchQueryLimiter = createSearchRateLimiter({
  keyPrefix: "search-query",
  max: Number(process.env.SEARCH_QUERY_RATE_LIMIT_MAX || 60),
});

module.exports = {
  createSearchRateLimiter,
  searchQueryLimiter,
};
