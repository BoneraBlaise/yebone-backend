/**
 * Utility functions for handling referral codes and commission tracking
 */

const Commission = require("../model/commission");
const calculateCommissionRate = require("./calculateCommission");

// Validate referral code format
const isValidReferralCode = (code) => {
  const referralCodePattern = /^[0-9]{4}[0-9A-F]{8}$/;
  return code && referralCodePattern.test(code);
};

// Track click for a referral code
const trackReferralClick = async (referralCode) => {
  try {
    if (!isValidReferralCode(referralCode)) {
      throw new Error("Invalid referral code format");
    }

    const commission = await Commission.findOne({ referralCode });
    if (!commission) {
      throw new Error("Invalid referral code");
    }

    commission.clicks += 1;
    await commission.save();

    return true;
  } catch (error) {
    console.error("Error tracking referral click:", error);
    return false;
  }
};

// Generate share link for a product
const generateShareLink = (productId, referralCode, frontendUrl) => {
  if (!productId || !referralCode || !frontendUrl) {
    throw new Error("Missing required parameters");
  }

  return `${frontendUrl}/product/${productId}?ref=${referralCode}`;
};

// Process commission for an order
const processOrderCommission = async (order, referralCode) => {
  try {
    if (!referralCode) return null;

    const commission = await Commission.findOne({ referralCode });
    if (!commission) return null;

    let totalCommission = 0;
    const commissionUpdates = [];

    // Process each item in the order cart
    for (const item of order.cart) {
      if (!item || !item._id || !item.price || !item.qty || !item.shopId) {
        console.warn("Skipping invalid cart item:", item);
        continue;
      }

      const itemTotal = item.price * item.qty;
      const commissionRate = calculateCommissionRate(itemTotal);

      if (commissionRate > 0) {
        const commissionAmount = (itemTotal * commissionRate) / 100;

        commissionUpdates.push({
          order: order._id,
          product: item._id,
          shop: item.shopId,
          amount: itemTotal,
          commission: commissionAmount,
          commissionRate,
          status: "pending"
        });

        totalCommission += commissionAmount;
      }
    }

    if (totalCommission > 0) {
      commission.sales.push(...commissionUpdates);
      commission.balance.pending += totalCommission;

      for (const update of commissionUpdates) {
        await commission.updateShopStats(update.shop, update.commission, "pending");
      }

      await commission.save();

      console.log(`✅ Commission assigned to ${referralCode}: ${totalCommission.toFixed(2)} total`);
    } else {
      console.log(`⚠️ No commission applicable for referralCode ${referralCode}`);
    }

    return commission;
  } catch (error) {
    console.error("❌ Error processing order commission:", error);
    throw error;
  }
};

// Update commission status when order is delivered
const updateCommissionStatus = async (orderId, referralCode, status = "paid") => {
  try {
    const commission = await Commission.findOne({ referralCode });
    if (!commission) return null;

    let orderCommission = 0;

    commission.sales.forEach(sale => {
      if (sale.order.toString() === orderId.toString()) {
        sale.status = status;
        orderCommission += sale.commission;
      }
    });

    if (orderCommission > 0) {
      commission.balance.pending -= orderCommission;

      if (status === "paid") {
        commission.balance.available += orderCommission;
      }

      await commission.save();
      console.log(`✅ Updated commission status for order ${orderId}, now ${status}, total: ${orderCommission}`);
    }

    return commission;
  } catch (error) {
    console.error("❌ Error updating commission status:", error);
    throw error;
  }
};

module.exports = {
  isValidReferralCode,
  trackReferralClick,
  generateShareLink,
  processOrderCommission,
  updateCommissionStatus
};
