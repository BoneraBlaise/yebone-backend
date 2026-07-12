const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class VendorPayoutRequestValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.vendorId)) errors.push({ field: "vendorId", message: "vendorId is required" });
    if (!isPositiveNumber(dto.amount)) errors.push({ field: "amount", message: "amount must be a positive number" });
    if (!isNonEmptyString(dto.currency)) errors.push({ field: "currency", message: "currency is required" });
    return result(errors);
  }
}

module.exports = VendorPayoutRequestValidator;
