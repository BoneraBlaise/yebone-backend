/**
 * Courier input validation.
 */
class CourierValidation {
  static STATUS = Object.freeze(["ACTIVE", "INACTIVE", "SUSPENDED"]);
  static AVAILABILITY = Object.freeze(["AVAILABLE", "BUSY", "OFFLINE"]);

  static sanitizeRegisterInput(input = {}) {
    return {
      fullName: CourierValidation._cleanText(input.fullName),
      phoneNumber: CourierValidation._cleanText(input.phoneNumber),
      email: CourierValidation._cleanText(input.email),
      vehicleType: CourierValidation._cleanText(input.vehicleType),
      vehiclePlate: CourierValidation._cleanText(input.vehiclePlate),
      maximumActiveDeliveries: input.maximumActiveDeliveries,
      metadata: CourierValidation._sanitizeMetadata(input.metadata),
    };
  }

  static validateRegisterInput(input = {}) {
    const missing = [];
    if (!input.fullName) missing.push("fullName");
    if (!input.phoneNumber) missing.push("phoneNumber");
    if (!input.vehicleType) missing.push("vehicleType");

    if (missing.length) {
      return { valid: false, fields: missing, reason: "MISSING_REQUIRED_FIELDS" };
    }

    const max = CourierValidation.validateCapacity(input.maximumActiveDeliveries ?? 5);
    if (!max.valid) {
      return { valid: false, fields: ["maximumActiveDeliveries"], reason: max.reason };
    }

    return { valid: true, maximumActiveDeliveries: max.value };
  }

  static validateCapacity(value) {
    const capacity = Number(value);
    if (!Number.isFinite(capacity) || capacity < 1) {
      return { valid: false, reason: "INVALID_CAPACITY" };
    }
    return { valid: true, value: Math.floor(capacity) };
  }

  static validateStatus(status) {
    const normalized = CourierValidation._normalizeEnum(status, CourierValidation.STATUS);
    if (!normalized) return { valid: false, reason: "INVALID_STATUS" };
    return { valid: true, status: normalized };
  }

  static validateAvailability(availability) {
    const normalized = CourierValidation._normalizeEnum(availability, CourierValidation.AVAILABILITY);
    if (!normalized) return { valid: false, reason: "INVALID_AVAILABILITY" };
    return { valid: true, availability: normalized };
  }

  static sanitizeUpdateInput(input = {}) {
    return {
      fullName: input.fullName !== undefined ? CourierValidation._cleanText(input.fullName) : undefined,
      phoneNumber:
        input.phoneNumber !== undefined ? CourierValidation._cleanText(input.phoneNumber) : undefined,
      email: input.email !== undefined ? CourierValidation._cleanText(input.email) : undefined,
      vehicleType:
        input.vehicleType !== undefined ? CourierValidation._cleanText(input.vehicleType) : undefined,
      vehiclePlate:
        input.vehiclePlate !== undefined ? CourierValidation._cleanText(input.vehiclePlate) : undefined,
      maximumActiveDeliveries: input.maximumActiveDeliveries,
      metadata: input.metadata !== undefined ? CourierValidation._sanitizeMetadata(input.metadata) : undefined,
    };
  }

  static _cleanText(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim();
    return cleaned.length ? cleaned : null;
  }

  static _sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
    return { ...metadata };
  }

  static _normalizeEnum(value, allowed) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    return allowed.includes(normalized) ? normalized : null;
  }
}

module.exports = CourierValidation;
