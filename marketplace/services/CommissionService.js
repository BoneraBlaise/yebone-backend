const crypto = require("crypto");
const Commission = require("../../model/commission");
const User = require("../../model/user");

function generateReferralCode(userId) {
  const prefix = userId.toString().substring(0, 4);
  const randomString = crypto.randomBytes(4).toString("hex");
  return `${prefix}${randomString}`.toUpperCase();
}

/**
 * Marketplace affiliate commission service — extracted from controller logic.
 */
class CommissionService {
  async joinProgram(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.isCommissioner) {
      const error = new Error("You are already a commissioner");
      error.statusCode = 400;
      throw error;
    }

    const referralCode = generateReferralCode(user._id);
    const commission = await Commission.create({
      user: user._id,
      referralCode,
      balance: { available: 0, pending: 0 },
    });

    user.isCommissioner = true;
    user.commissionProgramId = commission._id;
    await user.save();

    return {
      referralCode: commission.referralCode,
      balance: commission.balance,
    };
  }
}

module.exports = CommissionService;
