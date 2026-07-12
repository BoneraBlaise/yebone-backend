class ApiError extends Error {
  constructor({ code, message, statusCode = 500, details = [] }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;
