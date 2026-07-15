const { ProviderCapability } = require("../engine/ProviderCapabilities");
const { ProviderOperation } = require("./ProviderOperation");
const ProviderCapabilityError = require("./errors/ProviderCapabilityError");

const OPERATION_CAPABILITY_MAP = Object.freeze({
  [ProviderOperation.CHARGE]: ProviderCapability.PAYMENTS,
  [ProviderOperation.VERIFY]: ProviderCapability.PAYMENTS,
  [ProviderOperation.REFUND]: ProviderCapability.REFUNDS,
  [ProviderOperation.PAYOUT]: ProviderCapability.PAYOUTS,
  [ProviderOperation.WEBHOOK]: ProviderCapability.WEBHOOKS,
});

/**
 * Validates provider descriptor capabilities before adapter execution.
 */
class ProviderCapabilityValidator {
  validate(descriptor, operation) {
    const normalizedOperation = String(operation || "").toLowerCase();
    const capability = OPERATION_CAPABILITY_MAP[normalizedOperation];

    if (!capability) {
      throw new ProviderCapabilityError(
        descriptor?.code || "UNKNOWN",
        normalizedOperation,
        "UNKNOWN"
      );
    }

    if (!descriptor || typeof descriptor.supports !== "function") {
      throw new ProviderCapabilityError("UNKNOWN", normalizedOperation, capability);
    }

    if (!descriptor.supports(capability)) {
      throw new ProviderCapabilityError(descriptor.code, normalizedOperation, capability);
    }

    return capability;
  }

  supports(descriptor, capability) {
    return Boolean(descriptor?.supports?.(capability));
  }

  listSupported(descriptor) {
    return Object.values(ProviderCapability).filter((capability) =>
      this.supports(descriptor, capability)
    );
  }
}

module.exports = ProviderCapabilityValidator;
