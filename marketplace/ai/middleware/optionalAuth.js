const jwt = require("jsonwebtoken");
const User = require("../../../model/user");
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

const optionalAuth = catchAsyncErrors(async (req, _res, next) => {
  const token = extractAuthToken(req);
  if (!token) {
    req.user = null;
    req.aiContext = { userId: null, anonymous: true };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    req.aiContext = {
      userId: req.user?._id?.toString() || null,
      anonymous: !req.user,
    };
  } catch {
    req.user = null;
    req.aiContext = { userId: null, anonymous: true };
  }
  return next();
});

module.exports = { optionalAuth, extractAuthToken };
