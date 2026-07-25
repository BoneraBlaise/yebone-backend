const Commission = require("../../model/commission");
const Order = require("../../model/order");

class GrowthReferralAdminService {
  async getTopReferrers(limit = 25) {
    const docs = await Commission.find({ isActive: { $ne: false } })
      .sort({ clicks: -1 })
      .limit(Number(limit))
      .populate("user", "name email avatar")
      .lean();

    return docs.map((doc) => {
      const sales = doc.sales || [];
      const revenue = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
      const commissionEarned = sales.reduce((sum, sale) => sum + Number(sale.commission || 0), 0);
      const paidSales = sales.filter((sale) => ["paid", "approved"].includes(sale.status));
      return {
        userId: doc.user?._id || doc.user,
        name: doc.user?.name || "Referrer",
        email: doc.user?.email || null,
        referralCode: doc.referralCode,
        clicks: doc.clicks || 0,
        orders: sales.length,
        paidOrders: paidSales.length,
        revenue,
        commissionEarned,
        pendingPayout: doc.balance?.pending || 0,
        availableBalance: doc.balance?.available || 0,
        isActive: doc.isActive !== false,
      };
    });
  }

  async getReferralCodes(limit = 100) {
    const docs = await Commission.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("user", "name email")
      .lean();

    return docs.map((doc) => ({
      id: String(doc._id),
      referralCode: doc.referralCode,
      userId: doc.user?._id || doc.user,
      name: doc.user?.name || "User",
      email: doc.user?.email || null,
      clicks: doc.clicks || 0,
      orders: (doc.sales || []).length,
      isActive: doc.isActive !== false,
      createdAt: doc.createdAt,
    }));
  }

  async updateReferralCode(id, action, { admin = "system" } = {}) {
    const doc = await Commission.findById(id);
    if (!doc) {
      throw Object.assign(new Error("Referral code not found"), { statusCode: 404 });
    }

    if (action === "disable") doc.isActive = false;
    else if (action === "enable") doc.isActive = true;
    else if (action === "reset") doc.clicks = 0;
    else if (action === "delete") {
      doc.isActive = false;
      doc.referralCode = `${doc.referralCode}_RETIRED_${Date.now()}`;
    } else {
      throw Object.assign(new Error("Invalid action"), { statusCode: 400 });
    }

    await doc.save();
    return {
      id: String(doc._id),
      referralCode: doc.referralCode,
      isActive: doc.isActive,
      clicks: doc.clicks,
      action,
      admin,
    };
  }

  async getCommissionHistory(limit = 100) {
    const docs = await Commission.find()
      .populate("sales.order", "orderId status totalPrice createdAt")
      .populate("sales.product", "name category")
      .populate("sales.shop", "name")
      .lean();

    const rows = [];
    for (const doc of docs) {
      for (const sale of doc.sales || []) {
        rows.push({
          id: `${doc._id}-${sale._id || sale.order}`,
          vendor: sale.shop?.name || "—",
          product: sale.product?.name || "—",
          category: sale.product?.category || "—",
          order: sale.order?.orderId || String(sale.order || "—"),
          commission: Number(sale.commission || 0),
          amount: Number(sale.amount || 0),
          status: sale.status || "pending",
          referralCode: doc.referralCode,
          date: sale.createdAt || doc.createdAt,
        });
      }
    }

    return rows
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Number(limit));
  }

  async getCommissionAnalytics() {
    const history = await this.getCommissionHistory(500);
    const byCategory = {};
    const byVendor = {};
    let totalRevenue = 0;

    history.forEach((row) => {
      totalRevenue += row.commission;
      byCategory[row.category] = (byCategory[row.category] || 0) + row.commission;
      byVendor[row.vendor] = (byVendor[row.vendor] || 0) + row.commission;
    });

    const monthly = {};
    history.forEach((row) => {
      const key = new Date(row.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + row.commission;
    });

    return {
      totalCommissionRevenue: totalRevenue,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value })),
      topVendors: Object.entries(byVendor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value })),
      monthlyTrend: Object.entries(monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, value]) => ({ month, value })),
    };
  }

  async getFraudSignals(limit = 50) {
    const orders = await Order.find({ referralCode: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 3)
      .populate("user", "email")
      .lean();

    const commissions = await Commission.find().populate("user", "email").lean();
    const codeToUser = Object.fromEntries(
      commissions.map((doc) => [doc.referralCode, doc.user?.email || doc.user?._id])
    );

    const ipMap = {};
    const signals = [];

    orders.forEach((order) => {
      const ip = order.shippingAddress?.ip || order.ipAddress || null;
      if (ip) {
        ipMap[ip] = ipMap[ip] || [];
        ipMap[ip].push(order.referralCode);
      }

      const referrerIdentity = codeToUser[order.referralCode];
      const buyerIdentity = order.user?.email || order.user?._id;
      if (referrerIdentity && buyerIdentity && String(referrerIdentity) === String(buyerIdentity)) {
        signals.push({
          type: "self_purchase",
          referralCode: order.referralCode,
          orderId: order.orderId || String(order._id),
          severity: "high",
          detectedAt: order.createdAt,
        });
      }
    });

    Object.entries(ipMap).forEach(([ip, codes]) => {
      const unique = [...new Set(codes)];
      if (unique.length > 1) {
        signals.push({
          type: "duplicate_ip",
          ip,
          referralCodes: unique,
          severity: "medium",
          detectedAt: new Date().toISOString(),
        });
      }
    });

    const blocked = commissions
      .filter((doc) => doc.isActive === false)
      .map((doc) => ({
        type: "blocked_referral",
        referralCode: doc.referralCode,
        userId: doc.user?._id || doc.user,
        severity: "info",
      }));

    return {
      suspicious: signals.slice(0, Number(limit)),
      blockedReferrals: blocked.slice(0, Number(limit)),
      summary: {
        selfPurchase: signals.filter((s) => s.type === "self_purchase").length,
        duplicateIp: signals.filter((s) => s.type === "duplicate_ip").length,
        blocked: blocked.length,
      },
    };
  }
}

module.exports = GrowthReferralAdminService;
