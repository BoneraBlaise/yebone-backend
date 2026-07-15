class InvalidPostingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "InvalidPostingError";
    this.code = "INVALID_POSTING";
    this.details = details;
  }
}

module.exports = InvalidPostingError;
