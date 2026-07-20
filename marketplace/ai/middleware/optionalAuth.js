const jwt = require("jsonwebtoken");
const User = require("../../../model/user");
const Shop = require("../../../model/shop");
const catchAsyncErrors = require("../../../middleware/catchAsyncErrors");

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
  return req.cookies?.seller_token || null;
}

const optionalAuth = catchAsyncErrors(async (req, _res, next) => {
  const token = extractAuthToken(req);
  const sellerToken = extractSellerToken(req);

  req.user = null;
  req.seller = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
    } catch {
      req.user = null;
    }
  }

  if (sellerToken) {
    try {
      const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
      req.seller = await Shop.findById(decoded.id);
    } catch {
      req.seller = null;
    }
  }

  req.aiContext = {
    userId: req.user?._id?.toString() || null,
    vendorId: req.seller?._id?.toString() || null,
    anonymous: !req.user && !req.seller,
  };

  return next();
});

module.exports = { optionalAuth, extractAuthToken, extractSellerToken };
