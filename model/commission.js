const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true // Ensure one commission record per user
  },
  isActive: {
    type: Boolean,
    default: true
  },
  balance: {
    available: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    }
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  shopStats: [{
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop"
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      default: 0
    },
    completedSales: {
      type: Number,
      default: 0
    }
  }],
  sales: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop"
    },
    amount: Number,
    commission: Number,
    commissionRate: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "approved", "refunded"],
      default: "pending"
    },
    rewardStatus: {
      type: String,
      enum: ["pending", "approved", "paid", "cancelled", "refunded"],
      default: "pending"
    },
    ruleUsed: { type: String, default: null },
    referralUsed: { type: String, default: null },
    couponUsed: { type: String, default: null },
    approvalTimestamp: { type: Date, default: null },
    paymentReference: { type: String, default: null },
    walletReference: { type: String, default: null },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commissionStats: {
    twoPercent: { earned: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    fourPercent: { earned: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    sixPercent: { earned: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    tenPercent: { earned: { type: Number, default: 0 }, count: { type: Number, default: 0 } }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update commission stats
commissionSchema.pre('save', function(next) {
  if (this.isModified('sales')) {
    // Reset stats
    this.commissionStats = {
      twoPercent: { earned: 0, count: 0 },
      fourPercent: { earned: 0, count: 0 },
      sixPercent: { earned: 0, count: 0 },
      tenPercent: { earned: 0, count: 0 }
    };

    // Recalculate stats
    this.sales.forEach(sale => {
      switch(sale.commissionRate) {
        case 2:
          this.commissionStats.twoPercent.earned += sale.commission;
          this.commissionStats.twoPercent.count++;
          break;
        case 4:
          this.commissionStats.fourPercent.earned += sale.commission;
          this.commissionStats.fourPercent.count++;
          break;
        case 6:
          this.commissionStats.sixPercent.earned += sale.commission;
          this.commissionStats.sixPercent.count++;
          break;
        case 10:
          this.commissionStats.tenPercent.earned += sale.commission;
          this.commissionStats.tenPercent.count++;
          break;
      }
    });
  }
  next();
});

// Method to update shop stats
commissionSchema.methods.updateShopStats = async function(shopId, amount, status) {
  let shopStat = this.shopStats.find(s => s.shop.toString() === shopId.toString());
  
  if (!shopStat) {
    shopStat = {
      shop: shopId,
      totalEarnings: 0,
      pendingAmount: 0,
      completedSales: 0
    };
    this.shopStats.push(shopStat);
  }

  if (status === 'paid') {
    shopStat.pendingAmount -= amount;
    shopStat.totalEarnings += amount;
    shopStat.completedSales++;
  } else if (status === 'pending') {
    shopStat.pendingAmount += amount;
  }

  await this.save();
};

module.exports = mongoose.model("Commission", commissionSchema); 