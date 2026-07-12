const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class CheckoutRequestValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.orderId)) errors.push({ field: "orderId", message: "orderId is required" });
    if (!isNonEmptyString(dto.vendorId)) errors.push({ field: "vendorId", message: "vendorId is required" });
    if (!isPositiveNumber(dto.orderSubtotal)) {
      errors.push({ field: "orderSubtotal", message: "orderSubtotal must be a positive number" });
    }
    return result(errors);
  }
}

module.exports = CheckoutRequestValidator;
