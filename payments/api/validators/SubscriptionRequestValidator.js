const { isNonEmptyString, isPositiveNumber, result } = require("./validationUtils");

class SubscriptionRequestValidator {
  static validate(dto) {
    const errors = [];
    if (!isNonEmptyString(dto.vendorId)) errors.push({ field: "vendorId", message: "vendorId is required" });
    if (!isNonEmptyString(dto.planId)) errors.push({ field: "planId", message: "planId is required" });
    if (["create", "renew"].includes(dto.action) && !isPositiveNumber(dto.amount)) {
      errors.push({ field: "amount", message: "amount must be a positive number" });
    }
    return result(errors);
  }
}

module.exports = SubscriptionRequestValidator;
