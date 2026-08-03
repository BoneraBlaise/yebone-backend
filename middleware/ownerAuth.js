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

/** User token: Authorization Bearer first (fresh), then readable cookie */
function extractUserToken(req) {
  return extractBearerToken(req) || req.cookies?.token || null;
}

/** Seller token: seller cookie first, then Bearer (client may send seller JWT) */
function extractSellerTokenOnly(req) {
  return req.cookies?.seller_token || extractBearerToken(req) || null;
}

const logAuthDebug = (label, detail) => {
  if (process.env.NODE_ENV === "production" && process.env.AUTH_DEBUG !== "1") return;
  console.info(`[ownerAuth] ${label}`, detail);
};

/**
 * Accept logged-in customer (req.user) OR vendor (req.seller).
 * Used by Property & Mobility owner routes and similar marketplace APIs.
 */
const authenticateUserOrSeller = catchAsyncErrors(async (req, res, next) => {
  const bearer = extractBearerToken(req);
  const cookieUser = req.cookies?.token || null;
  const cookieSeller = req.cookies?.seller_token || null;

  logAuthDebug("incoming", {
    path: req.originalUrl,
    method: req.method,
    hasAuthorization: Boolean(bearer),
    hasCookieToken: Boolean(cookieUser),
    hasCookieSeller: Boolean(cookieSeller),
    cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
  });

  const userToken = extractUserToken(req);
  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      if (req.user) {
        logAuthDebug("authenticated", {
          as: "user",
          userId: String(req.user._id),
          tokenSource: bearer ? "bearer" : "cookie",
        });
        return next();
      }
      logAuthDebug("user_not_found", { decodedId: decoded.id });
    } catch (err) {
      logAuthDebug("user_token_invalid", { message: err.message });
    }
  }

  const sellerToken = extractSellerTokenOnly(req);
  if (sellerToken && sellerToken !== userToken) {
    try {
      const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
      req.seller = await Shop.findById(decoded.id);
      if (req.seller) {
        logAuthDebug("authenticated", {
          as: "seller",
          sellerId: String(req.seller._id),
          tokenSource: cookieSeller ? "cookie" : "bearer",
        });
        return next();
      }
      logAuthDebug("seller_not_found", { decodedId: decoded.id });
    } catch (err) {
      logAuthDebug("seller_token_invalid", { message: err.message });
    }
  } else if (sellerToken && sellerToken === userToken) {
    try {
      const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
      req.seller = await Shop.findById(decoded.id);
      if (req.seller) {
        logAuthDebug("authenticated", { as: "seller", sellerId: String(req.seller._id), tokenSource: "shared_bearer" });
        return next();
      }
    } catch (err) {
      logAuthDebug("shared_bearer_seller_invalid", { message: err.message });
    }
  }

  console.warn("[ownerAuth] UNAUTHENTICATED", {
    path: req.originalUrl,
    hasAuthorization: Boolean(bearer),
    hasCookieToken: Boolean(cookieUser),
    hasCookieSeller: Boolean(cookieSeller),
  });

  return res.status(401).json({
    success: false,
    reason: "UNAUTHENTICATED",
    message: "Login required.",
  });
});

/** Seller-only routes (create product, create event, shop APIs) */
const authenticateSeller = catchAsyncErrors(async (req, res, next) => {
  const sellerToken = extractSellerTokenOnly(req);
  if (!sellerToken) {
    return next(new ErrorHandler("Please login to continue", 401));
  }
  try {
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
    req.seller = await Shop.findById(decoded.id);
    if (!req.seller) {
      return next(new ErrorHandler("Please login to continue", 401));
    }
    return next();
  } catch (err) {
    logAuthDebug("authenticateSeller_failed", { message: err.message });
    return next(new ErrorHandler("Please login to continue", 401));
  }
});

module.exports = {
  authenticateUserOrSeller,
  authenticateSeller,
  extractBearerToken,
  extractUserToken,
  extractSellerTokenOnly,
};
