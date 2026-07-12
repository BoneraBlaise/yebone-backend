/**
 * @deprecated Unused legacy PayLater installment controller — not registered in app.js.
 * Retained for backwards compatibility only. Not a payment execution entry point.
 */
const express = require('express');
const PayLaterOrder = require('../model/paylaterorder');
const PayLaterUser = require('../model/paylateruser');
const PayLaterProduct = require('../model/paylaterproduct.js');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

// Initialize router
const router = express.Router();

// Create a new PayLater Order
router.post('/create-paylater-order', catchAsyncErrors(async (req, res, next) => {
    const { payLaterUserId, payLaterProductId, firstPayment, installmentPlan } = req.body;

    if (!payLaterUserId || !payLaterProductId || !firstPayment || !installmentPlan) {
        return next(new ErrorHandler("Missing required fields", 400));
    }

    // Ensure the PayLaterUser exists
    const payLaterUser = await PayLaterUser.findById(payLaterUserId);
    if (!payLaterUser) {
        return next(new ErrorHandler("PayLaterUser not found", 404));
    }

    // Ensure the PayLaterProduct exists
    const payLaterProduct = await PayLaterProduct.findById(payLaterProductId);
    if (!payLaterProduct) {
        return next(new ErrorHandler("PayLaterProduct not found", 404));
    }

    // Calculate the total amount and remaining amount
    const totalAmount = payLaterProduct.price;
    const remainingAmount = totalAmount - firstPayment;

    // Create the PayLaterOrder
    const newPayLaterOrder = new PayLaterOrder({
        payLaterUserId,
        payLaterProductId,
        totalAmount,
        firstPayment,
        remainingAmount,
        installmentPlan,
    });

    await newPayLaterOrder.save();

    return res.status(201).json({
        success: true,
        message: 'Pay Later order created successfully!',
        data: newPayLaterOrder,
    });
}));

// Get all PayLater Orders
router.get('/paylater-orders', catchAsyncErrors(async (req, res, next) => {
    const payLaterOrders = await PayLaterOrder.find().populate('payLaterUserId', 'userId').populate('payLaterProductId', 'productId');

    if (!payLaterOrders || payLaterOrders.length === 0) {
        return next(new ErrorHandler("No Pay Later orders found", 404));
    }

    return res.status(200).json({
        success: true,
        data: payLaterOrders,
    });
}));

// Get PayLater Order details by ID
router.get('/paylater-order/:id', catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    const payLaterOrder = await PayLaterOrder.findById(id).populate('payLaterUserId', 'userId').populate('payLaterProductId', 'productId');

    if (!payLaterOrder) {
        return next(new ErrorHandler("Pay Later order not found", 404));
    }

    return res.status(200).json({
        success: true,
        data: payLaterOrder,
    });
}));

// Update PayLater Order (e.g., for payment updates, installment status, etc.)
router.put('/update-paylater-order/:id', catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const { firstPayment, installmentPlan, orderStatus, payments } = req.body;

    // Find the PayLaterOrder by ID and update
    const updatedPayLaterOrder = await PayLaterOrder.findByIdAndUpdate(
        id,
        {
            firstPayment,
            installmentPlan,
            orderStatus,
            payments,
            updatedAt: Date.now(),
        },
        { new: true }
    );

    if (!updatedPayLaterOrder) {
        return next(new ErrorHandler("Pay Later order not found", 404));
    }

    return res.status(200).json({
        success: true,
        data: updatedPayLaterOrder,
    });
}));

// Delete PayLater Order by ID
router.delete('/delete-paylater-order/:id', catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    const deletedPayLaterOrder = await PayLaterOrder.findByIdAndDelete(id);

    if (!deletedPayLaterOrder) {
        return next(new ErrorHandler("Pay Later order not found", 404));
    }

    return res.status(200).json({
        success: true,
        message: "Pay Later order deleted successfully",
    });
}));

module.exports = router;
