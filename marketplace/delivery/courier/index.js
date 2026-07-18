const express = require("express");
const catchAsyncErrors = require("../../../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../../../middleware/auth");
const CourierPlatform = require("./CourierPlatform");
const CourierSecurity = require("./CourierSecurity");
const { getDeliveryPlatform } = require("../index");

let courierPlatformInstance = null;

function createCourierPlatform(deliveryPlatform, options = {}) {
  courierPlatformInstance = new CourierPlatform({
    deliveryPlatform,
    config: options.config,
    repository: options.repository,
  });
  return courierPlatformInstance;
}

function getCourierPlatform() {
  if (!courierPlatformInstance) {
    throw new Error("Courier platform not initialized — call registerCourierPlatform first");
  }
  return courierPlatformInstance;
}

function registerCourierPlatform(app, marketplaceCore, options = {}) {
  const deliveryPlatform = options.deliveryPlatform || getDeliveryPlatform();
  const platform = createCourierPlatform(deliveryPlatform, options);
  app.locals.courierPlatform = platform;

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
      const auth = CourierSecurity.assertAdmin(req);
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
      const auth = CourierSecurity.assertAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.registerCourier(req.body);
      res.status(201).json({ success: true, data: courier });
    })
  );

  router.get(
    "/",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const couriers = platform.listCouriers(req.query);
      res.status(200).json({ success: true, data: couriers, meta: { count: couriers.length } });
    })
  );

  router.get(
    "/:courierId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.getCourier(req.params.courierId);
      res.status(200).json({ success: true, data: courier });
    })
  );

  router.patch(
    "/:courierId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.updateCourier(req.params.courierId, req.body, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data: courier });
    })
  );

  router.post(
    "/:courierId/activate",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.activateCourier(req.params.courierId, { actor: auth.userId });
      res.status(200).json({ success: true, data: courier });
    })
  );

  router.post(
    "/:courierId/deactivate",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertAdmin(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.deactivateCourier(req.params.courierId, { actor: auth.userId });
      res.status(200).json({ success: true, data: courier });
    })
  );

  router.patch(
    "/:courierId/availability",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const courier = platform.setAvailability(req.params.courierId, req.body.availability, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data: courier });
    })
  );

  router.post(
    "/:courierId/assign",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const result = platform.assignDelivery(req.params.courierId, req.body.deliveryId, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.delete(
    "/:courierId/assign/:deliveryId",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const result = platform.removeAssignment(req.params.courierId, req.params.deliveryId, {
        actor: auth.userId,
      });
      res.status(200).json({ success: true, data: result });
    })
  );

  router.get(
    "/:courierId/history",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = CourierSecurity.assertOperationalAccess(req);
      if (!auth.valid) {
        return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      }

      const history = platform.getCourierHistory(req.params.courierId);
      res.status(200).json({ success: true, data: history, meta: { count: history.length } });
    })
  );

  app.use("/api/v2/marketplace/delivery/couriers", router);
  return platform;
}

module.exports = {
  CourierPlatform,
  CourierConfiguration: require("./CourierConfiguration"),
  CourierValidation: require("./CourierValidation"),
  CourierRepository: require("./CourierRepository"),
  CourierHistory: require("./CourierHistory"),
  CourierAnalytics: require("./CourierAnalytics"),
  CourierHealth: require("./CourierHealth"),
  CourierSecurity: require("./CourierSecurity"),
  CourierAssignmentBridge: require("./CourierAssignmentBridge"),
  createCourierPlatform,
  getCourierPlatform,
  registerCourierPlatform,
};
