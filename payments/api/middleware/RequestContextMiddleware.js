class RequestContextMiddleware {
  static attach() {
    return (req, res, next) => {
      req.context = {
        receivedAt: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        apiVersion: req.apiVersion || "v1",
      };
      return next();
    };
  }
}

module.exports = RequestContextMiddleware;
