const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class DeliveryPaymentRequestValidator {
  static validate(dto) {
    const errors = [];
    if (dto.action === "settle" && !isNonEmptyString(dto.orderId)) {
      errors.push({ field: "orderId", message: "orderId is required for settle action" });
    }
    if (dto.orderSubtotal !== undefined && !isPositiveNumber(dto.orderSubtotal)) {
      errors.push({ field: "orderSubtotal", message: "orderSubtotal must be a positive number when provided" });
    }
    return result(errors);
  }
}

module.exports = DeliveryPaymentRequestValidator;
