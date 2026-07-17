const { createPaymentFoundation } = require("../../PaymentFoundationBootstrap");
const FeatureFlagRolloutSupport = require("../../infrastructure/engine/FeatureFlagRolloutSupport");

/**
 * Application-layer bootstrap for the payment foundation Release Candidate.
 * Composes foundation only when explicitly requested — defaults preserve legacy PaymentModule.
 */
class PaymentApplicationBootstrap {
  static composeFoundation(options = {}) {
    const foundation = createPaymentFoundation(options.foundationOptions || {});

    if (options.applyFeatureFlagRollout === true) {
      FeatureFlagRolloutSupport.applyAll({
        featureFlags: foundation.featureFlags,
        runtimeFeatureFlags: foundation.runtimeFeatureFlags,
        env: options.env || process.env,
      });
    }

    return foundation;
  }

  static resolvePaymentModuleOptions(options = {}) {
    if (options.paymentFoundation) {
      return {
        ...(options.paymentModuleOptions || {}),
        paymentFoundation: options.paymentFoundation,
      };
    }

    if (options.composePaymentFoundation !== true) {
      return options.paymentModuleOptions || {};
    }

    const foundation = PaymentApplicationBootstrap.composeFoundation(options);
    return {
      ...(options.paymentModuleOptions || {}),
      paymentFoundation: foundation,
    };
  }
}

module.exports = PaymentApplicationBootstrap;
