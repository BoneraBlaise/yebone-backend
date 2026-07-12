const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class CapturePaymentValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.orderId)) errors.push({ field: "orderId", message: "orderId is required" });
    if (!isPositiveNumber(dto.amount)) errors.push({ field: "amount", message: "amount must be a positive number" });
    return result(errors);
  }
}

module.exports = CapturePaymentValidator;
