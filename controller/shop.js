const express = require("express");
const router = express.Router();
const sendMail = require("../utils/sendMail");
const isSmtpConfigured = require("../utils/isSmtpConfigured");
const issueShopSessionResponse = require("../utils/issueShopSessionResponse");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");
const { getVendorPlatform } = require("../marketplace");
const { optionalAuth } = require("../marketplace/ai/middleware/optionalAuth");

function handleServiceError(error, next) {
  return next(new ErrorHandler(error.message, error.statusCode || 500));
}

// create shop
router.post(
  "/create-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const { seller, activationToken } = await vendor.registerPending(req.body);
      const activationUrl = vendor.config.buildActivationUrl(activationToken);

      const mailResult = await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
      });

      const devAutoActivate =
        !isSmtpConfigured() && process.env.NODE_ENV !== "production";

      if (devAutoActivate) {
        const activatedSeller = await vendor.activateFromToken(activationToken);
        return issueShopSessionResponse(res, activatedSeller, 201, {
          autoActivated: true,
          message: "Shop created successfully",
        });
      }

      res.status(201).json({
        success: true,
        message: "Please check your email to activate your shop.",
        emailSent: Boolean(mailResult?.sent),
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// Shop activation logic
router.post(
  "/activation/:activation_token",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.activateFromToken(req.params.activation_token);
      sendShopToken(seller, 201, res);
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const user = await vendor.login(req.body.email, req.body.password);
      sendShopToken(user, 201, res);
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// Resume seller session for authenticated customers who already own a verified shop (same email).
router.get(
  "/resume-session",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.shopService.findByEmail(req.user.email);
      if (!seller) {
        return next(new ErrorHandler("No shop linked to this account", 404));
      }
      sendShopToken(seller, 200, res);
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.profile.getProfile(req.seller._id);
      const analytics = vendor.analytics.getBasicSummary(seller);

      res.status(200).json({
        success: true,
        seller,
        vendorAnalytics: analytics,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (_req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// get shop info (public storefront payload with stats)
router.get(
  "/get-shop-info/:id",
  optionalAuth,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const payload = await vendor.profile.getPublicStorefront(req.params.id);
      const followState = await vendor.profile.getFollowState(
        req.params.id,
        req.user?._id || null
      );
      res.status(200).json({
        success: true,
        shop: payload.shop,
        stats: payload.stats,
        achievements: payload.achievements,
        followState,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update shop cover image
router.put(
  "/update-shop-cover",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.profile.updateCover(req.seller._id, req.body.cover);
      vendor.hooks.afterProfileUpdated({ shopId: req.seller._id, field: "cover" });
      res.status(200).json({ success: true, seller });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update shop gallery
router.put(
  "/update-shop-gallery",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.profile.updateGallery(req.seller._id, req.body.gallery || []);
      vendor.hooks.afterProfileUpdated({ shopId: req.seller._id, field: "gallery" });
      res.status(200).json({ success: true, seller });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update business status (open / closed / busy / vacation)
router.put(
  "/update-shop-status",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.profile.updateBusinessStatus(
        req.seller._id,
        req.body.businessStatus
      );
      vendor.hooks.afterProfileUpdated({ shopId: req.seller._id, field: "businessStatus" });
      res.status(200).json({ success: true, seller, businessStatus: seller.businessStatus });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// follow / unfollow shop
router.post(
  "/:id/follow",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const result = await vendor.profile.toggleFollow(req.params.id, req.user._id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// favorite / unfavorite shop
router.post(
  "/:id/favorite",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const result = await vendor.profile.toggleFavorite(req.params.id, req.user._id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.profile.updateAvatar(req.seller._id, req.body.avatar);
      vendor.hooks.afterProfileUpdated({ shopId: req.seller._id, field: "avatar" });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const shop = await vendor.settings.updateBusinessInfo(req.seller._id, req.body);
      vendor.hooks.afterProfileUpdated({ shopId: req.seller._id, field: "businessInfo" });

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const sellers = await vendor.shopService.listAll();
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      await vendor.shopService.deleteById(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.settings.updateWithdrawMethod(
        req.seller._id,
        req.body.withdrawMethod
      );

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// delete seller withdraw methods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const seller = await vendor.settings.clearWithdrawMethod(req.seller._id);

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// Verify Shop - Admin only
router.put(
  "/verify-shop/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const { shop } = await vendor.verification.verify(req.params.id);
      vendor.hooks.afterVerified({ shopId: req.params.id, verified: true });

      res.status(200).json({
        success: true,
        message: "Shop verified successfully",
        shop,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

// Unverify Shop - Admin only
router.put(
  "/unverify-shop/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const vendor = getVendorPlatform();
      const { shop } = await vendor.verification.unverify(req.params.id);
      vendor.hooks.afterVerified({ shopId: req.params.id, verified: false });

      res.status(200).json({
        success: true,
        message: "Shop unverified successfully",
        shop,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

module.exports = router;
