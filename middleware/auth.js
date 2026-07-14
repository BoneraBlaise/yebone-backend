const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");

function extractBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

function extractAuthToken(req) {
  return req.cookies?.token || extractBearerToken(req) || null;
}

function extractSellerToken(req) {
  return req.cookies?.seller_token || extractBearerToken(req) || null;
}

exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = extractAuthToken(req);

  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  next();
});

exports.isSeller = catchAsyncErrors(async (req, res, next) => {
  const sellerToken = extractSellerToken(req);

  if (!sellerToken) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
  req.seller = await Shop.findById(decoded.id);

  if (!req.seller) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  next();
});

exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(`${req.user.role} can not access this resources!`)
      );
    }
    next();
  };
};
