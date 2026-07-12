const crypto = require("crypto");

class CorrelationIdMiddleware {
  static attach({ headerName = "x-correlation-id" } = {}) {
    return (req, res, next) => {
      const incoming = req.headers?.[headerName] || req.headers?.[headerName.toLowerCase()];
      req.correlationId = incoming || crypto.randomUUID();
      res.setHeader(headerName, req.correlationId);
      return next();
    };
  }
}

module.exports = CorrelationIdMiddleware;
