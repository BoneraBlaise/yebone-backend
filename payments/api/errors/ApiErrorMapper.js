const ValidationErrorMapper = require("./ValidationErrorMapper");
const PaymentErrorMapper = require("./PaymentErrorMapper");
const FinancialErrorMapper = require("./FinancialErrorMapper");

class ApiErrorMapper {
  static map(error) {
    if (!error) {
      return {
        statusCode: 500,
        body: {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Unknown error" },
        },
      };
    }

    if (error.name === "ValidationError" || error.errors) {
      return ValidationErrorMapper.map(error);
    }

    const paymentMapped = PaymentErrorMapper.map(error);
    if (paymentMapped) {
      return paymentMapped;
    }

    const financialMapped = FinancialErrorMapper.map(error);
    if (financialMapped) {
      return financialMapped;
    }

    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Internal server error",
        },
      },
    };
  }
}

module.exports = ApiErrorMapper;
