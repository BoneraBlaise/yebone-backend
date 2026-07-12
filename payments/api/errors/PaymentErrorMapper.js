class PaymentErrorMapper {
  static map(error) {
    if (error.name === "NotImplementedError") {
      return {
        statusCode: 501,
        body: {
          success: false,
          error: {
            code: "NOT_IMPLEMENTED",
            message: error.message,
            provider: error.providerName || null,
            method: error.methodName || null,
          },
        },
      };
    }

    if (error.name === "DuplicateRequestError") {
      return {
        statusCode: 409,
        body: {
          success: false,
          error: {
            code: "DUPLICATE_REQUEST",
            message: error.message,
            idempotencyKey: error.idempotencyKey || null,
          },
        },
      };
    }

    if (error.name === "LockAcquisitionError") {
      return {
        statusCode: 423,
        body: {
          success: false,
          error: {
            code: "RESOURCE_LOCKED",
            message: error.message,
            resourceId: error.resourceId || null,
          },
        },
      };
    }

    return null;
  }
}

module.exports = PaymentErrorMapper;
