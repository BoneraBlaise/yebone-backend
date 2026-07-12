/**
 * @deprecated Unused legacy PayLater product controller — not registered in app.js.
 * Retained for backwards compatibility only. Not a payment execution entry point.
 */
const express = require('express');
const PayLaterProduct = require('../model/PayLaterProduct');
const Product = require('../model/product.js');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

// Initialize router
const router = express.Router();

// Create a new PayLaterProduct
router.post('/create-paylater-product', catchAsyncErrors(async (req, res, next) => {
  const { productId, price, firstPaymentPercentage, installmentPeriod } = req.body;

  if (!productId || !price || !firstPaymentPercentage || !installmentPeriod) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  // Ensure the product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Create PayLaterProduct
  const newPayLaterProduct = new PayLaterProduct({
    productId,
    price,
    firstPaymentPercentage,
    installmentPeriod,
  });

  await newPayLaterProduct.save();

  return res.status(201).json({
    success: true,
    message: 'Pay Later product created successfully!',
    data: newPayLaterProduct,
  });
}));

// Get all PayLaterProducts
router.get('/paylater-products', catchAsyncErrors(async (req, res, next) => {
  const payLaterProducts = await PayLaterProduct.find().populate('productId', 'name description price');

  if (!payLaterProducts || payLaterProducts.length === 0) {
    return next(new ErrorHandler("No Pay Later products found", 404));
  }

  return res.status(200).json({
    success: true,
    data: payLaterProducts,
  });
}));

// Get PayLaterProduct details by ID
router.get('/paylater-product/:id', catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const payLaterProduct = await PayLaterProduct.findById(id).populate('productId', 'name description price');

  if (!payLaterProduct) {
    return next(new ErrorHandler("Pay Later product not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: payLaterProduct,
  });
}));

// Update PayLaterProduct details
router.put('/update-paylater-product/:id', catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { price, firstPaymentPercentage, installmentPeriod } = req.body;

  const updatedPayLaterProduct = await PayLaterProduct.findByIdAndUpdate(
    id,
    { price, firstPaymentPercentage, installmentPeriod, updatedAt: Date.now() },
    { new: true }
  );

  if (!updatedPayLaterProduct) {
    return next(new ErrorHandler("Pay Later product not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: updatedPayLaterProduct,
  });
}));

// Delete PayLaterProduct by ID
router.delete('/delete-paylater-product/:id', catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const deletedPayLaterProduct = await PayLaterProduct.findByIdAndDelete(id);

  if (!deletedPayLaterProduct) {
    return next(new ErrorHandler("Pay Later product not found", 404));
  }

  return res.status(200).json({
    success: true,
    message: "Pay Later product deleted successfully",
  });
}));

module.exports = router;
