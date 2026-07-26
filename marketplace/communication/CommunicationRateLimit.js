const {
  getRateLimitStore,
  isRateLimitEnabled,
  resolveWindowMs,
  resolveMax,
} = require("./CommunicationRateLimitStore");

function buildRouteKey(req, keyPrefix) {
  const actor =
    req.user?._id ||
    req.seller?._id ||
    req.ip ||
    req.headers["x-forwarded-for"] ||
    "anonymous";
  return `${keyPrefix}:${req.method}:${req.baseUrl}${req.path}:${actor}`;
}

function createCommunicationRateLimiter({
  windowMs = resolveWindowMs(),
  max = resolveMax(),
  keyPrefix = "communication",
} = {}) {
  const store = getRateLimitStore();

  return function communicationRateLimiter(req, res, next) {
    if (!isRateLimitEnabled()) {
      return next();
    }

    const routeKey = buildRouteKey(req, keyPrefix);

    store
      .consume(routeKey, { windowMs, max })
      .then((result) => {
        if (!result.allowed) {
          res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
          return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again shortly.",
          });
        }
        return next();
      })
      .catch((error) => {
        console.warn(`[CommunicationRateLimit] Store error: ${error.message}. Allowing request.`);
        return next();
      });
  };
}

const communicationMutationLimiter = createCommunicationRateLimiter({
  keyPrefix: "communication-mutation",
  max: resolveMax(),
});

module.exports = {
  createCommunicationRateLimiter,
  communicationMutationLimiter,
};
