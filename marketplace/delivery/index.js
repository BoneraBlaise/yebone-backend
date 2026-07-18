const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../middleware/auth");
const DeliveryPlatform = require("./DeliveryPlatform");
const DeliverySecurity = require("./DeliverySecurity");

let deliveryPlatformInstance = null;

function createDeliveryPlatform(marketplaceCore, options = {}) {
  deliveryPlatformInstance = new DeliveryPlatform({
    marketplaceCore,
    config: options.config,
    repository: options.repository,
    trackingService: options.trackingService,
    trackingAnalytics: options.trackingAnalytics,
  });
  return deliveryPlatformInstance;
}

function getDeliveryPlatform() {
  if (!deliveryPlatformInstance) {
    throw new Error("Delivery platform not initialized — call registerDeliveryPlatform first");
  }
  return deliveryPlatformInstance;
}

function registerDeliveryPlatform(app, marketplaceCore, options = {}) {
  const platform = createDeliveryPlatform(marketplaceCore, options);
  app.locals.deliveryPlatform = platform;

  const router = express.Router();

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check() });
    })
  );

  router.get(
    "/metrics",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }
      res.status(200).json({ success: true, data: platform.getMetrics() });
    })
  );

  router.post(
    "/",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.createDelivery(req.body);
      res.status(201).json({ success: true, data: delivery });
    })
  );

  router.get(
    "/",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAuthenticatedUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const filters = { ...req.query };
      if (!["admin", "super-admin"].includes(auth.role)) {
        filters.customerId = auth.userId;
      }

      const deliveries = platform.listDeliveries(filters);
      res.status(200).json({ success: true, data: deliveries, meta: { count: deliveries.length } });
    })
  );

  router.get(
    "/tracking/:trackingNumber/timeline",
    catchAsyncErrors(async (req, res) => {
      const result = platform.getTrackingTimelineByTrackingNumber(req.params.trackingNumber);
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/tracking/:trackingNumber",
    catchAsyncErrors(async (req, res) => {
      const delivery = platform.getDeliveryByTracking(req.params.trackingNumber);
      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.get(
    "/order/:orderId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAuthenticatedUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.getDeliveryByOrderId(req.params.orderId);
      const access = DeliverySecurity.assertCustomerAccess(req, delivery);
      if (!access.valid) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }

      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.get(
    "/:deliveryId/tracking",
    catchAsyncErrors(async (req, res) => {
      const timeline = platform.getTrackingTimeline(req.params.deliveryId);
      res.status(200).json({
        success: true,
        data: timeline,
        meta: { count: timeline.length },
      });
    })
  );

  router.get(
    "/:deliveryId/status",
    catchAsyncErrors(async (req, res) => {
      const status = platform.getCurrentTrackingStatus(req.params.deliveryId);
      res.status(200).json({ success: true, data: status });
    })
  );

  router.get(
    "/:deliveryId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAuthenticatedUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.getDelivery(req.params.deliveryId);
      const access = DeliverySecurity.assertCustomerAccess(req, delivery);
      if (!access.valid && !["admin", "super-admin", "courier", "vendor"].includes(auth.role)) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }

      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.get(
    "/:deliveryId/history",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAuthenticatedUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.getDelivery(req.params.deliveryId);
      const access = DeliverySecurity.assertCustomerAccess(req, delivery);
      if (!access.valid && !["admin", "super-admin"].includes(auth.role)) {
        return res.status(access.statusCode).json({ success: false, reason: access.reason });
      }

      const history = platform.getDeliveryHistory(req.params.deliveryId);
      res.status(200).json({ success: true, data: history, meta: { count: history.length } });
    })
  );

  router.patch(
    "/:deliveryId/status",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.updateStatus(req.params.deliveryId, req.body.status, {
        reason: req.body.reason || null,
        actor: req.user?._id ? String(req.user._id) : "system",
      });
      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.post(
    "/:deliveryId/assign",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.assignCourier(req.params.deliveryId, req.body.courierId, {
        actor: req.user?._id ? String(req.user._id) : "system",
      });
      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.delete(
    "/:deliveryId/assign",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const delivery = platform.removeCourierAssignment(req.params.deliveryId);
      res.status(200).json({ success: true, data: delivery });
    })
  );

  router.post(
    "/:deliveryId/cancel",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = DeliverySecurity.assertAuthenticatedUser(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const existing = platform.getDelivery(req.params.deliveryId);
      const isOwner = String(existing.customerId) === auth.userId;
      const isAdmin = ["admin", "super-admin"].includes(auth.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, reason: "FORBIDDEN" });
      }

      const delivery = platform.cancelDelivery(req.params.deliveryId, {
        reason: req.body.reason || null,
      });
      res.status(200).json({ success: true, data: delivery });
    })
  );

  app.use("/api/v2/marketplace/delivery", router);
  return platform;
}

module.exports = {
  DeliveryPlatform,
  DeliveryConfiguration: require("./DeliveryConfiguration"),
  DeliveryValidation: require("./DeliveryValidation"),
  DeliveryStateMachine: require("./DeliveryStateMachine"),
  DeliveryAddress: require("./DeliveryAddress"),
  DeliveryTracking: require("./DeliveryTracking"),
  DeliveryRepository: require("./DeliveryRepository"),
  DeliveryHistory: require("./DeliveryHistory"),
  DeliveryAnalytics: require("./DeliveryAnalytics"),
  DeliveryHealth: require("./DeliveryHealth"),
  DeliverySecurity: require("./DeliverySecurity"),
  DeliveryTrackingTimeline: require("./tracking/DeliveryTrackingTimeline"),
  TrackingService: require("./tracking/TrackingService"),
  DeliveryTrackingAnalytics: require("./tracking/DeliveryTrackingAnalytics"),
  createDeliveryPlatform,
  getDeliveryPlatform,
  registerDeliveryPlatform,
};
