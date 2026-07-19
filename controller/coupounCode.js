const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller, isAuthenticated } = require("../middleware/auth");
const { getGrowthPlatform } = require("../marketplace/growth");
const router = express.Router();

router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const CoupounCode = require("../model/coupounCode");
      const isCoupounCodeExists = await CoupounCode.find({ name: req.body.name });

      if (isCoupounCodeExists.length !== 0) {
        return next(new ErrorHandler("Coupoun code already exists!", 400));
      }

      const coupounCode = await CoupounCode.create({
        ...req.body,
        shopId: req.seller.id,
      });

      res.status(201).json({
        success: true,
        coupounCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const CoupounCode = require("../model/coupounCode");
      const couponCodes = await CoupounCode.find({ shopId: req.seller.id });
      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const CoupounCode = require("../model/coupounCode");
      const couponCode = await CoupounCode.findOneAndDelete({
        _id: req.params.id,
        shopId: req.seller.id,
      });

      if (!couponCode) {
        return next(new ErrorHandler("Coupon code dosen't exists!", 400));
      }
      res.status(201).json({
        success: true,
        message: "Coupon code deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

router.get(
  "/get-coupon-value/:name",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const growth = getGrowthPlatform();
      const result = await growth.validateCoupon({
        code: req.params.name,
        cartTotal: Number(req.query.cartTotal || 0),
        shopId: req.query.shopId || null,
      });

      if (!result.valid) {
        return next(new ErrorHandler(result.reason || "Invalid coupon", 400));
      }

      res.status(200).json({
        success: true,
        valid: true,
        coupon: {
          code: result.coupon?.code || req.params.name,
          discountAmount: result.coupon?.discountAmount || 0,
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

module.exports = router;
