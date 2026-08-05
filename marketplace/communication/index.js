const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../../model/user");
const Shop = require("../../model/shop");
const ErrorHandler = require("../../utils/ErrorHandler");
const { createCommunicationPlatform, getCommunicationPlatform } = require("./CommunicationPlatform");
const CommunicationAccess = require("./CommunicationAccess");
const { communicationMutationLimiter } = require("./CommunicationRateLimit");

function extractAuthToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.token || null;
}

function extractSellerToken(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.seller_token || null;
}

const authenticateUserOrSeller = catchAsyncErrors(async (req, res, next) => {
  const userToken = extractAuthToken(req);
  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      if (req.user) return next();
    } catch (_error) {
      // try seller token next
    }
  }

  const sellerToken = extractSellerToken(req);
  if (sellerToken) {
    try {
      const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
      req.seller = await Shop.findById(decoded.id);
      if (req.seller) return next();
    } catch (_error) {
      // fall through
    }
  }

  return next(new ErrorHandler("Please login to continue", 401));
});

let communicationPlatformInstance = null;

function registerCommunicationPlatform(app, options = {}) {
  const platform = createCommunicationPlatform(options);
  communicationPlatformInstance = platform;

  if (options.server) {
    platform.attachSocket(options.server);
  }

  try {
    const { getPlatformIntegration } = require("../integration/PlatformIntegration");
    const integration = getPlatformIntegration();
    if (integration?.pricing) {
      platform.bindPricing(integration.pricing);
    }
  } catch (_error) {
    // optional during tests
  }

  try {
    const { getOrderPlatform } = require("../orders");
    platform.bindOrderPlatform(getOrderPlatform());
  } catch (_error) {
    // orders may register after communication in some tests
  }

  app.locals.communicationPlatform = platform;

  const router = express.Router();
  const resolveUserId = (req) => String(req.user?._id || req.seller?._id);

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health() });
    })
  );

  router.get(
    "/push/vapid-public-key",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: { publicKey: platform.pushService.getPublicKey() } });
    })
  );

  router.post(
    "/push/subscribe",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.pushService.saveSubscription(
        resolveUserId(req),
        req.body.subscription,
        req.headers["user-agent"]
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/push/unsubscribe",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.pushService.removeSubscription(resolveUserId(req), req.body.endpoint);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/notifications",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.notificationService.listNotifications(resolveUserId(req), {
        unreadOnly: req.query.unreadOnly === "true",
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 50),
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/notifications/unread-count",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const count = await platform.notificationService.getUnreadCount(resolveUserId(req));
      res.status(200).json({ success: true, data: { count } });
    })
  );

  router.put(
    "/notifications/:id/read",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.notificationService.markRead(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.put(
    "/notifications/read-all",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.notificationService.markAllRead(resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/conversations",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.listConversations(resolveUserId(req), {
        search: req.query.search || "",
        includeArchived: req.query.archived === "true",
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/conversations/archived",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.listArchivedConversations(resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/conversations/unread-count",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const count = await platform.messagingService.getUnreadCount(resolveUserId(req));
      res.status(200).json({ success: true, data: { count } });
    })
  );

  router.get(
    "/conversations/:id",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.getConversation(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/conversations/:id/messages",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.getMessages(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/conversations/product",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const buyerId = CommunicationAccess.assertBuyer(req);
      const { productId, sellerId, productSnapshot, initialMessage } = req.body;
      await CommunicationAccess.validateProductSeller(productId, sellerId);
      const data = await platform.messagingService.startProductConversation({
        productId,
        buyerId,
        sellerId,
        productSnapshot,
        initialMessage: initialMessage
          ? CommunicationAccess.sanitizeMessageText(initialMessage)
          : undefined,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/conversations/listing",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const buyerId = CommunicationAccess.assertBuyer(req);
      const { listingId, sellerId, listingSnapshot, initialMessage } = req.body;
      if (!listingId || !sellerId) {
        return res.status(400).json({ success: false, message: "listingId and sellerId are required" });
      }
      const data = await platform.messagingService.startListingConversation({
        listingId,
        buyerId,
        sellerId,
        listingSnapshot,
        initialMessage: initialMessage
          ? CommunicationAccess.sanitizeMessageText(initialMessage)
          : undefined,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/conversations/:id/messages",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const messageText = req.body.images?.url
        ? String(req.body.text || "").trim()
        : CommunicationAccess.sanitizeMessageText(req.body.text);
      const data = await platform.messagingService.sendMessage({
        conversationId: req.params.id,
        senderId: resolveUserId(req),
        text: messageText,
        messageType: req.body.messageType,
        images: req.body.images,
        productSnapshot: req.body.productSnapshot,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.put(
    "/conversations/:id/archive",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.archiveConversation(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.put(
    "/conversations/:id/unarchive",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.messagingService.unarchiveConversation(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/offers",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const buyerId = CommunicationAccess.assertBuyer(req);
      const data = await platform.offerService.createOffer(buyerId, req.body);
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/offers/:offerId/counter",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.offerService.counterOffer(resolveUserId(req), req.params.offerId, req.body);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/offers/:offerId/:status",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.offerService.respondToOffer(
        resolveUserId(req),
        req.params.offerId,
        req.params.status
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/offers/:offerId",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.offerService.getOffer(req.params.offerId, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/conversations/:id/offers",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const data = await platform.offerService.listOfferHistory(req.params.id, resolveUserId(req));
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/checkout/negotiated",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      if (!platform.negotiatedPriceBridge) {
        return res.status(503).json({ success: false, reason: "PRICING_UNAVAILABLE" });
      }
      const data = await platform.negotiatedPriceBridge.buildCheckoutPayload(resolveUserId(req), {
        offerId: req.query.offerId,
        priceLockToken: req.query.token,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/offers/expire-due",
    catchAsyncErrors(async (req, res) => {
      CommunicationAccess.assertCronSecret(req);
      const data = await platform.offerService.expireDueOffers();
      res.status(200).json({ success: true, data });
    })
  );

  router.put(
    "/orders/:orderId/confirm-delivery",
    authenticateUserOrSeller,
    catchAsyncErrors(async (req, res) => {
      const buyerId = CommunicationAccess.assertBuyer(req);
      const { getOrderPlatform } = require("../orders");
      const orderPlatform = getOrderPlatform();
      const order = await orderPlatform.orderService.findById(req.params.orderId);
      const ownerId = order.user?._id || order.user?.id;
      if (String(ownerId) !== String(buyerId)) {
        return res.status(403).json({ success: false, reason: "NOT_OWNER" });
      }
      if (!["Shipping", "Received", "On the way", "Transferred to delivery partner"].includes(order.status)) {
        return res.status(400).json({ success: false, reason: "INVALID_STATUS" });
      }
      const updated = await orderPlatform.updateStatus(req.params.orderId, "Delivered", null);
      res.status(200).json({ success: true, data: updated });
    })
  );

  app.use("/api/v2/marketplace/communication", communicationMutationLimiter, router);
  return platform;
}

function getCommunicationPlatformSafe() {
  return communicationPlatformInstance;
}

module.exports = {
  registerCommunicationPlatform,
  getCommunicationPlatform,
  getCommunicationPlatformSafe,
};
