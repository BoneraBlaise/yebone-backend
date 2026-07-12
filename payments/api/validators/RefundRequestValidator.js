const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class RefundRequestValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.paymentId) && !isNonEmptyString(dto.orderId)) {
      errors.push({ field: "paymentId", message: "paymentId or orderId is required" });
    }
    if (!isPositiveNumber(dto.amount)) errors.push({ field: "amount", message: "amount must be a positive number" });
    return result(errors);
  }
}

module.exports = RefundRequestValidator;
