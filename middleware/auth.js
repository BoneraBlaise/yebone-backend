const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const PlatformAuthService = require("../marketplace/integration/auth/PlatformAuthService");
const { authenticateVendor } = require("./vendorAuth");

function extractBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

function extractAuthToken(req) {
  return extractBearerToken(req) || req.cookies?.token || null;
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

/** @deprecated Use authenticateVendor — kept as alias for existing route imports */
exports.isSeller = authenticateVendor;

/** Unified vendor authentication for all marketplace operations */
exports.authenticateVendor = authenticateVendor;

exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    if (!req.user?._id) {
      return next(new ErrorHandler("Please login to continue", 401));
    }

    const normalizedRole = PlatformAuthService.normalizeRole(req.user.role);
    const normalizedAllowed = roles.map((role) => PlatformAuthService.normalizeRole(role));
    if (!normalizedAllowed.includes(normalizedRole)) {
      return next(
        new ErrorHandler(`${req.user.role} can not access this resources!`, 403)
      );
    }
    next();
  };
};
