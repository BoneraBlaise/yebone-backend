const express = require('express');
const PayLaterUser = require('../model/paylateruser.js');
const User = require('../model/User');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

// Get IP address from request header (without external libraries)
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};

// Initialize router
const router = express.Router();

// Create a new PayLaterUser
router.post('/create-paylater-user', catchAsyncErrors(async (req, res, next) => {
  const { userId, occupation, income, isAgreed } = req.body;

  if (!userId || !occupation || !income || isAgreed === undefined) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  // Ensure the user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (!isAgreed) {
    return next(new ErrorHandler("User must agree to the terms and conditions", 400));
  }

  // Create PayLaterUser
  const newPayLaterUser = new PayLaterUser({
    userId,
    occupation,
    income,
    IpAddress: getClientIp(req),
    isAgreed,
    isApproved: false, // Set default approval to false
  });

  await newPayLaterUser.save();

  return res.status(201).json({
    success: true,
    message: 'Pay Later user created successfully, waiting for approval!',
    data: newPayLaterUser,
  });
}));

// Get PayLaterUser details by userId
router.get('/paylater-user/:userId', catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  const payLaterUser = await PayLaterUser.findOne({ userId }).populate('userId', 'name email');

  if (!payLaterUser) {
    return next(new ErrorHandler("Pay Later user not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: payLaterUser,
  });
}));

// Update PayLaterUser details
router.put('/update-paylater-user/:userId', catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const { occupation, income, isAgreed } = req.body;

  const updatedPayLaterUser = await PayLaterUser.findOneAndUpdate(
    { userId },
    { occupation, income, isAgreed, updatedAt: Date.now() },
    { new: true }
  );

  if (!updatedPayLaterUser) {
    return next(new ErrorHandler("Pay Later user not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: updatedPayLaterUser,
  });
}));

// Delete PayLaterUser by userId
router.delete('/delete-paylater-user/:userId', catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  const deletedPayLaterUser = await PayLaterUser.findOneAndDelete({ userId });

  if (!deletedPayLaterUser) {
    return next(new ErrorHandler("Pay Later user not found", 404));
  }

  return res.status(200).json({
    success: true,
    message: "Pay Later user deleted successfully",
  });
}));

// Update the agreement status
router.put('/update-agreement-status/:userId', catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const { isAgreed } = req.body;

  const updatedPayLaterUser = await PayLaterUser.findOneAndUpdate(
    { userId },
    { isAgreed, updatedAt: Date.now() },
    { new: true }
  );

  if (!updatedPayLaterUser) {
    return next(new ErrorHandler("Pay Later user not found", 404));
  }

  return res.status(200).json({
    success: true,
    message: "Agreement status updated successfully",
    data: updatedPayLaterUser,
  });
}));

// Approve or reject PayLaterUser (Only for Guriraline)
router.put('/approve-paylater-user/:userId', catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const { isApproved } = req.body;

  if (isApproved === undefined) {
    return next(new ErrorHandler("Approval status is required", 400));
  }

  const updatedPayLaterUser = await PayLaterUser.findOneAndUpdate(
    { userId },
    { isApproved, updatedAt: Date.now() },
    { new: true }
  );

  if (!updatedPayLaterUser) {
    return next(new ErrorHandler("Pay Later user not found", 404));
  }

  const approvalMessage = isApproved ? "approved" : "rejected";
  
  return res.status(200).json({
    success: true,
    message: `Pay Later user has been ${approvalMessage} successfully`,
    data: updatedPayLaterUser,
  });
}));

module.exports = router;
