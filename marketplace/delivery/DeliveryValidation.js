const DeliveryAddress = require("./DeliveryAddress");
const DeliveryStateMachine = require("./DeliveryStateMachine");

/**
 * Delivery input validation.
 */
class DeliveryValidation {
  static sanitizeCreateInput(input = {}) {
    return {
      orderId: DeliveryValidation._cleanId(input.orderId),
      customerId: DeliveryValidation._cleanId(input.customerId),
      vendorId: DeliveryValidation._cleanId(input.vendorId),
      pickupAddress: input.pickupAddress,
      deliveryAddress: input.deliveryAddress,
      deliveryFee: input.deliveryFee,
      metadata: DeliveryValidation._sanitizeMetadata(input.metadata),
    };
  }

  static validateCreateInput(input = {}) {
    const missing = [];
    if (!input.orderId) missing.push("orderId");
    if (!input.customerId) missing.push("customerId");
    if (!input.vendorId) missing.push("vendorId");

    const pickup = DeliveryAddress.validate(input.pickupAddress);
    if (!pickup.valid) {
      return {
        valid: false,
        fields: missing.concat(pickup.fields.map((f) => `pickupAddress.${f}`)),
        reason: pickup.reason || "INVALID_PICKUP_ADDRESS",
      };
    }

    const delivery = DeliveryAddress.validate(input.deliveryAddress);
    if (!delivery.valid) {
      return {
        valid: false,
        fields: missing.concat(delivery.fields.map((f) => `deliveryAddress.${f}`)),
        reason: delivery.reason || "INVALID_DELIVERY_ADDRESS",
      };
    }

    const fee = DeliveryValidation.validateDeliveryFee(input.deliveryFee);
    if (!fee.valid) {
      return { valid: false, fields: missing.concat(["deliveryFee"]), reason: fee.reason };
    }

    if (missing.length) {
      return { valid: false, fields: missing, reason: "MISSING_REQUIRED_FIELDS" };
    }

    return {
      valid: true,
      pickupAddress: pickup.address,
      deliveryAddress: delivery.address,
      deliveryFee: fee.value,
    };
  }

  static validateDeliveryFee(value) {
    const fee = Number(value);
    if (!Number.isFinite(fee) || fee < 0) {
      return { valid: false, reason: "INVALID_DELIVERY_FEE" };
    }
    return { valid: true, value: fee };
  }

  static validateStatusInput(status) {
    const machine = new DeliveryStateMachine();
    const normalized = machine.normalize(status);
    if (!normalized) {
      return { valid: false, reason: "UNKNOWN_STATUS" };
    }
    return { valid: true, status: normalized };
  }

  static validateCourierId(courierId) {
    const cleaned = DeliveryValidation._cleanId(courierId);
    if (!cleaned) {
      return { valid: false, reason: "INVALID_COURIER_ID" };
    }
    return { valid: true, courierId: cleaned };
  }

  static assertCustomerOwnership(delivery = {}, customerId) {
    if (!delivery.customerId || String(delivery.customerId) !== String(customerId)) {
      return { valid: false, reason: "NOT_OWNER", statusCode: 403 };
    }
    return { valid: true };
  }

  static assertVendorOwnership(delivery = {}, vendorId) {
    if (!delivery.vendorId || String(delivery.vendorId) !== String(vendorId)) {
      return { valid: false, reason: "NOT_VENDOR", statusCode: 403 };
    }
    return { valid: true };
  }

  static _cleanId(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim();
    return cleaned.length ? cleaned : null;
  }

  static _sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }
    return { ...metadata };
  }
}

module.exports = DeliveryValidation;
