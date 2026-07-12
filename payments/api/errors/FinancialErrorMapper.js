class FinancialErrorMapper {
  static map(error) {
    if (error.name === "InvalidStateTransitionError") {
      return {
        statusCode: 409,
        body: {
          success: false,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: error.message,
            entity: error.entity || null,
            fromState: error.fromState || null,
            toState: error.toState || null,
          },
        },
      };
    }

    if (error.message?.includes("Commission rate") || error.message?.includes("Payout amount")) {
      return {
        statusCode: 422,
        body: {
          success: false,
          error: {
            code: "FINANCIAL_RULE_VIOLATION",
            message: error.message,
          },
        },
      };
    }

    return null;
  }
}

module.exports = FinancialErrorMapper;
