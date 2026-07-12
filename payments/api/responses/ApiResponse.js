class ApiResponse {
  static success(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static accepted(data, meta = {}) {
    return {
      success: true,
      status: "accepted",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }
}

module.exports = ApiResponse;
