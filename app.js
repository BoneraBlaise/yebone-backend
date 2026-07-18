const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");

// Environment variables are loaded once in server.js before this module is required.
const passport = require('./config/passport');
const {
  resolveCorsOrigins,
  isOriginAllowed,
} = require("./platform/deployment/corsOrigins");
const {
  applyProductionMiddleware,
} = require("./platform/deployment/productionMiddleware");

const allowedOrigins = resolveCorsOrigins(process.env);

const isApiRequest = (req) => {
  const path = String(req.originalUrl || req.url || "");
  return path.startsWith("/api/") || path.startsWith("/health");
};

const wantsJsonResponse = (req) => {
  const accept = String(req.headers.accept || "");
  return (
    req.xhr ||
    accept.includes("application/json") ||
    isApiRequest(req)
  );
};

// CORS options — reflect allowed origins; never throw (throws skip CORS headers → ERR_NETWORK)
const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, origin || true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Production security headers + basic rate limiting (deployment layer only)
applyProductionMiddleware(app);

app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

// Initialize passport
app.use(passport.initialize());

// import routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const search = require("./controller/search");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const conversation = require("./controller/conversation");
const message = require("./controller/message");
const withdraw = require("./controller/withdraw");
const flashsale = require("./controller/flashsale");
const bid = require("./controller/bidController");
const commission = require("./controller/commission");

// Google Auth Routes - place these before other routes
app.get('/api/v2/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

app.get('/api/v2/auth/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`
    }, (err, user, info) => {
      if (err) {
        console.error('Passport Authentication Error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
      }
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${info?.message || 'Authentication failed'}`);
      }

      try {
        const token = user.getJwtToken();
        
        const options = {
          expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        };

        res.cookie("token", token, options)
           .redirect(`${process.env.FRONTEND_URL}/login?token=${token}`);
      } catch (error) {
        console.error('Token Generation Error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
      }
    })(req, res, next);
  }
);

app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/search", search);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/withdraw", withdraw);
app.use("/api/v2/flashsale", flashsale);
app.use("/api/v2/bids", bid);
app.use("/api/v2/commission", commission);

// Provider-independent payments module (v1) — isolated from marketplace v2 routes
const { registerPaymentRuntime } = require("./payments/runtime");
registerPaymentRuntime(app);

const { registerMarketplaceCore } = require("./marketplace");
registerMarketplaceCore(app);

const { registerPlatformRoutes } = require("./platform/runtime/registerPlatformRoutes");
registerPlatformRoutes(app);

// OAuth-only errors may redirect browser navigations; API routes defer to ErrorHandler.
app.use((err, req, res, next) => {
  if (err.name === "TokenError" && !wantsJsonResponse(req)) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=Token generation failed`
    );
  }

  if (err.name === "GoogleStrategyError" && !wantsJsonResponse(req)) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=Google authentication failed`
    );
  }

  return next(err);
});

app.use(ErrorHandler);

module.exports = app;
