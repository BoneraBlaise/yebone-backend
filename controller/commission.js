const express = require("express");
const router = express.Router();
const Commission = require("../model/commission");
const User = require("../model/user");
const { isAuthenticated } = require("../middleware/auth");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const crypto = require("crypto");
const { getMarketplaceCore } = require("../marketplace");

// Generate unique referral code
const generateReferralCode = (userId) => {
  const prefix = userId.toString().substring(0, 4);
  const randomString = crypto.randomBytes(4).toString('hex');
  return `${prefix}${randomString}`.toUpperCase();
};

async function joinCommissionProgram(req, res, next) {
  try {
    const core = getMarketplaceCore();
    const commission = await core.services.commission.joinProgram(req.user.id);
    core.hooks.commission.afterJoin({ referralCode: commission.referralCode });

    res.status(201).json({
      success: true,
      message: "Successfully joined the commission program",
      commission,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, error.statusCode || 500));
  }
}

// Join commission program - canonical route
router.post("/join", isAuthenticated, catchAsyncErrors(joinCommissionProgram));

// Legacy frontend alias — same handler
router.post("/join-program", isAuthenticated, catchAsyncErrors(joinCommissionProgram));

// Get commissioner dashboard data
router.get(
  "/dashboard",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Check if user is a commissioner
      const user = await User.findById(req.user.id);
      if (!user.isCommissioner) {
        return next(new ErrorHandler("Not a commissioner. Please join the program first.", 403));
      }

      const commission = await Commission.findOne({ user: req.user.id })
        .populate({
          path: "sales.order",
          select: "totalPrice status createdAt"
        })
        .populate({
          path: "sales.product",
          select: "name discountPrice images"
        })
        .populate({
          path: "shopStats.shop",
          select: "name"
        });

      if (!commission) {
        return next(new ErrorHandler("Commission data not found", 404));
      }

      // Calculate dashboard statistics
      const stats = {
        balance: {
          available: commission.balance.available,
          pending: commission.balance.pending,
          total: commission.balance.available + commission.balance.pending
        },
        performance: {
          totalClicks: commission.clicks,
          totalSales: commission.sales.length,
          conversionRate: commission.clicks > 0 
            ? ((commission.sales.length / commission.clicks) * 100).toFixed(2) 
            : 0
        },
        commissionRates: {
          twoPercent: commission.commissionStats.twoPercent,
          fourPercent: commission.commissionStats.fourPercent,
          sixPercent: commission.commissionStats.sixPercent,
          tenPercent: commission.commissionStats.tenPercent
        },
        recentActivity: {
          sales: commission.sales
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10)
            .map(sale => ({
              orderId: sale.order?._id,
              productName: sale.product?.name,
              amount: sale.amount,
              commission: sale.commission,
              status: sale.status,
              date: sale.createdAt
            }))
        },
        shopPerformance: commission.shopStats.map(shop => ({
          shopName: shop.shop?.name || 'Unknown Shop',
          totalEarnings: shop.totalEarnings,
          pendingAmount: shop.pendingAmount,
          completedSales: shop.completedSales
        })),
        bestPerforming: {
          shop: commission.shopStats.length > 0 
            ? commission.shopStats.reduce((a, b) => 
                (a.totalEarnings > b.totalEarnings) ? a : b).shop?.name 
            : null,
          rate: Object.entries(commission.commissionStats)
            .reduce((a, b) => (a[1].earned > b[1].earned) ? a : b)[0]
        }
      };

      res.status(200).json({
        success: true,
        stats,
        referralCode: commission.referralCode
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get quick stats for commissioner (for navbar/sidebar)
router.get(
  "/quick-stats",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const commission = await Commission.findOne({ user: req.user.id })
        .select('balance referralCode clicks sales');

      if (!commission) {
        return res.status(200).json({
          success: true,
          isCommissioner: false
        });
      }

      res.status(200).json({
        success: true,
        isCommissioner: true,
        quickStats: {
          totalEarnings: commission.balance.available + commission.balance.pending,
          pendingAmount: commission.balance.pending,
          totalSales: commission.sales.length,
          referralCode: commission.referralCode
        }
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.post(
  "/generate-share-link",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { productId } = req.body;

      if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
      }

      if (!process.env.FRONTEND_URL) {
        return next(new ErrorHandler("Frontend URL is not defined in environment variables", 500));
      }

      const { getGrowthPlatform } = require("../marketplace/growth");
      const result = await getGrowthPlatform().generateShareLink(
        req.user.id,
        productId,
        process.env.FRONTEND_URL
      );

      res.status(200).json({
        success: true,
        shareLink: result.shareLink,
        referralCode: result.referralCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Server Error", 500));
    }
  })
);


// Track click on shared link
router.post(
  "/track-click",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { referralCode } = req.body;
      
      if (!referralCode) {
        return next(new ErrorHandler("Referral code is required", 400));
      }

      const commission = await Commission.findOne({ referralCode });
      if (commission) {
        commission.clicks += 1;
        await commission.save();
      }

      res.status(200).json({
        success: true
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router; 