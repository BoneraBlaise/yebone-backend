const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { registerMarketplaceCore } = require("../../index");
const {
  DeliveryPlatform,
  DeliveryValidation,
  DeliveryStateMachine,
  DeliveryAddress,
  DeliveryTracking,
  DeliveryRepository,
  DeliverySecurity,
} = require("../index");

const SAMPLE_ADDRESS = {
  country: "Rwanda",
  province: "Kigali",
  district: "Gasabo",
  sector: "Remera",
  cell: "Rukiri I",
  village: "Amahoro",
  street: "KG 11 Ave",
  referenceNote: "Near main gate",
};

function buildCreateInput(overrides = {}) {
  return {
    orderId: "order-1001",
    customerId: "customer-1",
    vendorId: "vendor-1",
    pickupAddress: SAMPLE_ADDRESS,
    deliveryAddress: { ...SAMPLE_ADDRESS, street: "KG 15 Ave" },
    deliveryFee: 2500,
    metadata: { source: "marketplace" },
    ...overrides,
  };
}

describe("Delivery Platform", () => {
  let platform;

  beforeEach(() => {
    platform = new DeliveryPlatform({ repository: new DeliveryRepository() });
  });

  it("integrates with marketplace core when provided", () => {
    const { MarketplaceCore } = require("../../index");
    const core = new MarketplaceCore();
    const integrated = new DeliveryPlatform({ marketplaceCore: core });
    assert.equal(integrated.marketplaceCore, core);
    assert.equal(integrated.config.version, "8.1.0");
  });

  it("creates delivery with unique tracking number", () => {
    const delivery = platform.createDelivery(buildCreateInput());

    assert.ok(delivery.deliveryId.startsWith("dlv_"));
    assert.match(delivery.trackingNumber, /^YEB-DLV-/);
    assert.equal(delivery.status, "PENDING");
    assert.equal(delivery.deliveryFee, 2500);
    assert.equal(platform.getMetrics().deliveriesCreated, 1);
  });

  it("rejects duplicate delivery for same order", () => {
    platform.createDelivery(buildCreateInput());
    assert.throws(
      () => platform.createDelivery(buildCreateInput()),
      (error) => error.statusCode === 409 && error.reason === "ORDER_DELIVERY_EXISTS"
    );
  });

  it("validates required addresses", () => {
    const invalid = DeliveryValidation.validateCreateInput({
      orderId: "order-1",
      customerId: "customer-1",
      vendorId: "vendor-1",
      pickupAddress: { country: "Rwanda" },
      deliveryAddress: SAMPLE_ADDRESS,
      deliveryFee: 1000,
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.fields.some((field) => field.includes("pickupAddress")));
  });

  it("looks up delivery by id, tracking, and order", () => {
    const created = platform.createDelivery(buildCreateInput({ orderId: "order-lookup" }));

    assert.deepEqual(platform.getDelivery(created.deliveryId).deliveryId, created.deliveryId);
    assert.deepEqual(
      platform.getDeliveryByTracking(created.trackingNumber).deliveryId,
      created.deliveryId
    );
    assert.deepEqual(platform.getDeliveryByOrderId("order-lookup").deliveryId, created.deliveryId);
  });

  it("assigns, reassigns, and removes courier", () => {
    const created = platform.createDelivery(buildCreateInput({ orderId: "order-assign" }));
    platform.updateStatus(created.deliveryId, "CONFIRMED");

    const assigned = platform.assignCourier(created.deliveryId, "courier-1");
    assert.equal(assigned.status, "ASSIGNED");
    assert.equal(assigned.courierId, "courier-1");
    assert.equal(platform.getMetrics().assignments, 1);

    const reassigned = platform.assignCourier(created.deliveryId, "courier-2");
    assert.equal(reassigned.courierId, "courier-2");
    assert.equal(reassigned.status, "ASSIGNED");

    const unassigned = platform.removeCourierAssignment(created.deliveryId);
    assert.equal(unassigned.courierId, null);
    assert.equal(unassigned.status, "CONFIRMED");
  });

  it("validates delivery status transitions", () => {
    const machine = new DeliveryStateMachine();
    assert.equal(machine.assertTransition("PENDING", "CONFIRMED").valid, true);
    assert.equal(machine.assertTransition("PENDING", "DELIVERED").valid, false);
    assert.equal(machine.assertTransition("IN_TRANSIT", "DELIVERED").valid, true);
  });

  it("runs full delivery lifecycle", () => {
    const created = platform.createDelivery(buildCreateInput({ orderId: "order-life" }));

    platform.updateStatus(created.deliveryId, "CONFIRMED");
    platform.assignCourier(created.deliveryId, "courier-9");
    platform.updateStatus(created.deliveryId, "PICKED_UP");
    platform.updateStatus(created.deliveryId, "IN_TRANSIT");
    const delivered = platform.updateStatus(created.deliveryId, "DELIVERED");

    assert.equal(delivered.status, "DELIVERED");
    assert.ok(platform.getMetrics().averageLifecycleDurationMs >= 0);
    assert.ok(platform.getDeliveryHistory(created.deliveryId).length >= 5);
  });

  it("cancels non-terminal deliveries", () => {
    const created = platform.createDelivery(buildCreateInput({ orderId: "order-cancel" }));
    const cancelled = platform.cancelDelivery(created.deliveryId, { reason: "Customer request" });

    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(platform.getMetrics().cancellations, 1);

    assert.throws(
      () => platform.cancelDelivery(created.deliveryId),
      (error) => error.statusCode === 409
    );
  });

  it("lists deliveries with filters", () => {
    platform.createDelivery(buildCreateInput({ orderId: "order-a", customerId: "cust-a" }));
    platform.createDelivery(
      buildCreateInput({ orderId: "order-b", customerId: "cust-b", vendorId: "vendor-2" })
    );

    const customerDeliveries = platform.listDeliveries({ customerId: "cust-a" });
    assert.equal(customerDeliveries.length, 1);
    assert.equal(customerDeliveries[0].customerId, "cust-a");
  });

  it("exposes delivery health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();
    assert.equal(response.success, true);
    assert.equal(response.data.healthy, true);
    assert.equal(response.data.phase, "8.1");
  });
});

describe("Delivery validation helpers", () => {
  it("normalizes structured addresses", () => {
    const result = DeliveryAddress.validate({
      ...SAMPLE_ADDRESS,
      latitude: -1.9441,
      longitude: 30.0619,
    });
    assert.equal(result.valid, true);
    assert.equal(result.address.latitude, -1.9441);
  });

  it("validates tracking number format", () => {
    const tracking = new DeliveryTracking({ prefix: "YEB-DLV" });
    const number = tracking.generate();
    assert.equal(tracking.isValidFormat(number), true);
    assert.equal(tracking.isValidFormat("BAD"), false);
  });
});

describe("Delivery authorization", () => {
  it("requires authentication for protected routes", () => {
    const auth = DeliverySecurity.assertAuthenticatedUser({});
    assert.equal(auth.valid, false);
    assert.equal(auth.statusCode, 401);
  });

  it("allows admin metrics access only for admin roles", () => {
    const admin = DeliverySecurity.assertAdmin({ user: { _id: "admin-1", role: "admin" } });
    assert.equal(admin.valid, true);

    const user = DeliverySecurity.assertAdmin({ user: { _id: "user-1", role: "user" } });
    assert.equal(user.valid, false);
    assert.equal(user.statusCode, 403);
  });

  it("restricts customer access to owned deliveries", () => {
    const access = DeliverySecurity.assertCustomerAccess(
      { user: { _id: "customer-1", role: "user" } },
      { customerId: "customer-2" }
    );
    assert.equal(access.valid, false);
    assert.equal(access.statusCode, 403);
  });
});

describe("Delivery HTTP authorization", () => {
  it("rejects unauthenticated delivery create", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const statusCode = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/marketplace/delivery/",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify(buildCreateInput({ orderId: "order-http" })));
      req.end();
    });

    server.close();
    assert.equal(statusCode, 401);
  });

  it("allows public tracking lookup", async () => {
    const repository = new DeliveryRepository();
    const platform = new DeliveryPlatform({ repository });
    const created = platform.createDelivery(buildCreateInput({ orderId: "order-track-public" }));

    const app = express();
    app.locals.deliveryPlatform = platform;
    const { registerDeliveryPlatform } = require("../index");
    registerDeliveryPlatform(app, null, { repository });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${port}/api/v2/marketplace/delivery/tracking/${created.trackingNumber}`,
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve(JSON.parse(data)));
        }
      ).on("error", reject);
    });

    server.close();
    assert.equal(response.success, true);
    assert.equal(response.data.deliveryId, created.deliveryId);
  });
});

describe("Delivery session isolation", () => {
  it("keeps repositories isolated between platform instances", () => {
    const repoA = new DeliveryRepository();
    const repoB = new DeliveryRepository();
    const platformA = new DeliveryPlatform({ repository: repoA });
    const platformB = new DeliveryPlatform({ repository: repoB });

    platformA.createDelivery(buildCreateInput({ orderId: "iso-a" }));
    platformB.createDelivery(buildCreateInput({ orderId: "iso-b" }));

    assert.equal(platformA.listDeliveries().length, 1);
    assert.equal(platformB.listDeliveries().length, 1);
    assert.throws(() => platformB.getDeliveryByOrderId("iso-a"), (error) => error.statusCode === 404);
  });
});
