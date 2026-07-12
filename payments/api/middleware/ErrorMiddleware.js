const ApiErrorMapper = require("../errors/ApiErrorMapper");

class ErrorMiddleware {
  static handle() {
    return (error, req, res, next) => {
      const mapped = ApiErrorMapper.map(error);
      return res.status(mapped.statusCode).json({
        ...mapped.body,
        meta: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId || null,
          path: req.originalUrl || req.url || null,
        },
      });
    };
  }
}

module.exports = ErrorMiddleware;
