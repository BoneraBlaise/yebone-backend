const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class CreateOrderPaymentValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.orderId)) errors.push({ field: "orderId", message: "orderId is required" });
    if (!isNonEmptyString(dto.userId)) errors.push({ field: "userId", message: "userId is required" });
    if (!isPositiveNumber(dto.amount)) errors.push({ field: "amount", message: "amount must be a positive number" });
    if (!isNonEmptyString(dto.currency)) errors.push({ field: "currency", message: "currency is required" });
    return result(errors);
  }
}

module.exports = CreateOrderPaymentValidator;
