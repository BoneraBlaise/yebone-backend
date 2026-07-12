const { isNonEmptyString, isPositiveNumber, isNonNegativeNumber, result } = require("./validationUtils");

class SettlementRequestValidator {
  static validate(dto) {
    const errors = [];
    if (dto.action === "settle" && !isNonEmptyString(dto.orderId)) {
      errors.push({ field: "orderId", message: "orderId is required for settle action" });
    }
    if (!isPositiveNumber(dto.orderSubtotal)) {
      errors.push({ field: "orderSubtotal", message: "orderSubtotal must be a positive number" });
    }
    if (dto.deliveryFee !== undefined && !isNonNegativeNumber(dto.deliveryFee)) {
      errors.push({ field: "deliveryFee", message: "deliveryFee must be a non-negative number" });
    }
    return result(errors);
  }
}

module.exports = SettlementRequestValidator;
