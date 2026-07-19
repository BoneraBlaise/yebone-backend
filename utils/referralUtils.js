/**
 * Legacy referral utilities — delegates to Growth Platform orchestration.
 */

const Commission = require("../model/commission");

const isValidReferralCode = (code) => {
  const referralCodePattern = /^[0-9]{4}[0-9A-F]{8}$/;
  return code && referralCodePattern.test(code);
};

const getGrowthPlatform = () => require("../marketplace/growth").getGrowthPlatform();

const trackReferralClick = async (referralCode) => {
  try {
    if (!isValidReferralCode(referralCode)) {
      throw new Error("Invalid referral code format");
    }
    const result = await getGrowthPlatform().trackReferralClick(referralCode);
    return Boolean(result?.tracked);
  } catch (error) {
    console.error("Error tracking referral click:", error);
    return false;
  }
};

const generateShareLink = (productId, referralCode, frontendUrl) => {
  if (!productId || !referralCode || !frontendUrl) {
    throw new Error("Missing required parameters");
  }
  return `${frontendUrl}/product/${productId}?ref=${referralCode}`;
};

const processOrderCommission = async (order, referralCode, session = null, options = {}) => {
  if (!referralCode) return null;
  try {
    const growth = getGrowthPlatform();
    const resolved = growth.resolveReferralCode({
      referralCode,
      attributionTokens: options.attributionTokens || [],
    });
    if (!resolved) return null;
    return growth.processOrderCommission(order, resolved, session, options);
  } catch (error) {
    console.error("Error processing order commission:", error);
    throw error;
  }
};

const updateCommissionStatus = async (orderId, referralCode, status = "paid") => {
  try {
    if (status === "paid") {
      return getGrowthPlatform().settleOrderCommission(orderId, referralCode);
    }

    const commission = await Commission.findOne({ referralCode });
    if (!commission) return null;

    let orderCommission = 0;
    for (const sale of commission.sales) {
      if (sale.order.toString() === orderId.toString()) {
        sale.status = status;
        sale.rewardStatus = status;
        orderCommission += sale.commission;
      }
    }

    if (orderCommission > 0) {
      commission.balance.pending = Math.max(0, commission.balance.pending - orderCommission);
      await commission.save();
    }

    return commission;
  } catch (error) {
    console.error("Error updating commission status:", error);
    throw error;
  }
};

module.exports = {
  isValidReferralCode,
  trackReferralClick,
  generateShareLink,
  processOrderCommission,
  updateCommissionStatus,
};
