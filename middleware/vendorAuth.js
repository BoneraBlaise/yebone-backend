/**
 * Unified Vendor Authentication
 *
 * One vendor identity = Shop linked to the authenticated User (by email).
 * Sets req.vendor, req.vendorId, req.seller (legacy alias), req.user when applicable.
 *
 * Token resolution (migration-friendly):
 * 1. User JWT (cookie `token` or Bearer) → resolve Shop by user.email
 * 2. Legacy seller JWT (cookie `seller_token` or Bearer) → load Shop by decoded.id
 */
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");
const catchAsyncErrors = require("./catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");

function extractBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function extractUserToken(req) {
  return extractBearerToken(req) || req.cookies?.token || null;
}

function extractLegacySellerToken(req) {
  return req.cookies?.seller_token || null;
}

function attachVendor(req, shop, user = null) {
  req.vendor = shop;
  req.vendorId = shop._id;
  req.seller = shop;
  if (user) req.user = user;
}

async function resolveVendorFromUserToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);
  if (!user) return null;
  const shop = await Shop.findOne({ email: user.email });
  if (!shop) return { user, shop: null };
  return { user, shop };
}

async function resolveVendorFromLegacySellerToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const shop = await Shop.findById(decoded.id);
  if (!shop) return null;
  const user = await User.findOne({ email: shop.email });
  return { user, shop };
}

/**
 * Primary middleware for ALL vendor marketplace operations.
 * Products, Property, Mobility, Events, owner/*, /vendor/* routes.
 */
const authenticateVendor = catchAsyncErrors(async (req, res, next) => {
  const userToken = extractUserToken(req);
  const legacySellerToken = extractLegacySellerToken(req);
  const bearer = extractBearerToken(req);

  if (userToken) {
    try {
      const resolved = await resolveVendorFromUserToken(userToken);
      if (resolved?.shop) {
        attachVendor(req, resolved.shop, resolved.user);
        return next();
      }
      if (resolved?.user && !resolved.shop) {
        return next(new ErrorHandler("Vendor profile not found. Complete seller onboarding.", 403));
      }
    } catch (_err) {
      /* try legacy path */
    }
  }

  const sellerToken = legacySellerToken || (bearer && bearer !== userToken ? bearer : null);
  if (sellerToken) {
    try {
      const resolved = await resolveVendorFromLegacySellerToken(sellerToken);
      if (resolved?.shop) {
        attachVendor(req, resolved.shop, resolved.user || null);
        return next();
      }
    } catch (_err) {
      /* fall through */
    }
  }

  return next(new ErrorHandler("Please login to continue", 401));
});

/**
 * Resolve vendorId for ownership checks (always Shop._id).
 */
function assertVendorResolved(req) {
  if (!req.vendorId) {
    return { valid: false, reason: "UNAUTHENTICATED", statusCode: 401 };
  }
  return {
    valid: true,
    vendorId: String(req.vendorId),
    ownerId: String(req.vendorId),
  };
}

module.exports = {
  authenticateVendor,
  assertVendorResolved,
  extractUserToken,
  extractLegacySellerToken,
  attachVendor,
  resolveVendorFromUserToken,
  resolveVendorFromLegacySellerToken,
};
