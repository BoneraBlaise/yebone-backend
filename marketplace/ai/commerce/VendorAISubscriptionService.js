const VendorAISubscription = require("../models/VendorAISubscription");
const VendorCreditsWallet = require("../models/VendorCreditsWallet");

const DEFAULT_PLAN = {
  planId: "starter",
  monthlyCredits: 100,
  trialDays: 7,
  products: ["virtual_try_on", "ai_product_description", "ai_translation"],
};

class VendorAISubscriptionService {
  _computeTrialEnd(days = DEFAULT_PLAN.trialDays) {
    const end = new Date();
    end.setDate(end.getDate() + days);
    return end;
  }

  _computeRenewalDate(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async getSubscription(vendorId) {
    if (!vendorId) return null;
    return VendorAISubscription.findOne({ vendorId: String(vendorId) }).lean();
  }

  async ensureSubscription(vendorId, options = {}) {
    const id = String(vendorId);
    let sub = await VendorAISubscription.findOne({ vendorId: id });
    if (sub) return sub;

    const trialEndsAt = this._computeTrialEnd(options.trialDays);
    sub = await VendorAISubscription.create({
      vendorId: id,
      planId: options.planId || DEFAULT_PLAN.planId,
      status: "trial",
      trialEndsAt,
      renewalDate: this._computeRenewalDate(),
      monthlyCredits: options.monthlyCredits ?? DEFAULT_PLAN.monthlyCredits,
      products: options.products || DEFAULT_PLAN.products,
    });

    await VendorCreditsWallet.findOneAndUpdate(
      { vendorId: id },
      {
        $setOnInsert: {
          vendorId: id,
          currentCredits: sub.monthlyCredits,
          monthlyAllocation: sub.monthlyCredits,
          consumedCredits: 0,
          cycleStartedAt: new Date(),
          nextResetAt: sub.renewalDate,
        },
      },
      { upsert: true, new: true }
    );

    return sub;
  }

  isActive(subscription) {
    if (!subscription) return false;
    if (subscription.status === "cancelled" || subscription.status === "suspended") {
      return false;
    }
    if (subscription.status === "expired") return false;
    if (subscription.status === "trial" && subscription.trialEndsAt) {
      return new Date(subscription.trialEndsAt) >= new Date();
    }
    return subscription.status === "active" || subscription.status === "trial";
  }

  async subscribe(vendorId, { planId = "starter", monthlyCredits = 100, products = null } = {}) {
    const id = String(vendorId);
    const sub = await VendorAISubscription.findOneAndUpdate(
      { vendorId: id },
      {
        $set: {
          planId,
          status: "active",
          monthlyCredits,
          renewalDate: this._computeRenewalDate(),
          trialEndsAt: null,
          ...(products ? { products } : {}),
        },
      },
      { upsert: true, new: true }
    );
    return sub;
  }

  async recordUsage(vendorId, amount = 1) {
    await VendorAISubscription.findOneAndUpdate(
      { vendorId: String(vendorId) },
      { $inc: { usageThisMonth: amount } }
    );
  }

  toPublicDTO(subscription) {
    if (!subscription) return null;
    return {
      planId: subscription.planId,
      planLabel: subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1),
      status: subscription.status,
      active: this.isActive(subscription),
      trialEndsAt: subscription.trialEndsAt,
      renewalDate: subscription.renewalDate,
      monthlyCredits: subscription.monthlyCredits,
      usageThisMonth: subscription.usageThisMonth || 0,
      maxUsagePerMonth: subscription.maxUsagePerMonth || 1000,
      products: subscription.products || [],
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = VendorAISubscriptionService;
