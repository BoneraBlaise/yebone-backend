class ValidationErrorMapper {
  static map(error) {
    const details = error.errors || [];
    return {
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message || "Validation failed",
          details,
        },
      },
    };
  }
}

module.exports = ValidationErrorMapper;
