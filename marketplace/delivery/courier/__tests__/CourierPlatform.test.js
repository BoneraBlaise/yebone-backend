const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { DeliveryPlatform, DeliveryRepository } = require("../../index");
const {
  CourierPlatform,
  CourierRepository,
  CourierValidation,
  CourierSecurity,
  registerCourierPlatform,
} = require("../index");

const SAMPLE_ADDRESS = {
  country: "Rwanda",
  province: "Kigali",
  district: "Gasabo",
  sector: "Remera",
  cell: "Rukiri I",
  village: "Amahoro",
  street: "KG 11 Ave",
};

function buildCreateInput(overrides = {}) {
  return {
    orderId: `order-${Math.random().toString(36).slice(2, 8)}`,
    customerId: "customer-1",
    vendorId: "vendor-1",
    pickupAddress: SAMPLE_ADDRESS,
    deliveryAddress: { ...SAMPLE_ADDRESS, street: "KG 15 Ave" },
    deliveryFee: 2500,
    ...overrides,
  };
}

function buildCourierInput(overrides = {}) {
  return {
    fullName: "Jean Courier",
    phoneNumber: `+25078${Math.floor(Math.random() * 1e7)}`,
    vehicleType: "motorbike",
    maximumActiveDeliveries: 2,
    ...overrides,
  };
}

function createIntegratedPlatforms() {
  const deliveryRepository = new DeliveryRepository();
  const courierRepository = new CourierRepository();
  const deliveryPlatform = new DeliveryPlatform({ repository: deliveryRepository });
  const courierPlatform = new CourierPlatform({ deliveryPlatform, repository: courierRepository });
  return { deliveryRepository, courierRepository, deliveryPlatform, courierPlatform };
}

function prepareAssignableDelivery(deliveryPlatform) {
  const delivery = deliveryPlatform.createDelivery(buildCreateInput());
  deliveryPlatform.updateStatus(delivery.deliveryId, "CONFIRMED");
  return deliveryPlatform.getDelivery(delivery.deliveryId);
}

function prepareActiveCourier(courierPlatform, overrides = {}) {
  const courier = courierPlatform.registerCourier(buildCourierInput(overrides));
  courierPlatform.activateCourier(courier.courierId);
  courierPlatform.setAvailability(courier.courierId, "AVAILABLE");
  return courierPlatform.getCourier(courier.courierId);
}

describe("Courier Platform", () => {
  let deliveryPlatform;
  let courierPlatform;

  beforeEach(() => {
    ({ deliveryPlatform, courierPlatform } = createIntegratedPlatforms());
  });

  it("registers courier with default inactive offline state", () => {
    const courier = courierPlatform.registerCourier(buildCourierInput());

    assert.ok(courier.courierId.startsWith("crr_"));
    assert.equal(courier.status, "INACTIVE");
    assert.equal(courier.availability, "OFFLINE");
    assert.equal(courier.capacity.currentActiveDeliveries, 0);
    assert.equal(courierPlatform.getMetrics().registeredCouriers, 1);
  });

  it("activates courier and sets availability", () => {
    const courier = courierPlatform.registerCourier(buildCourierInput());
    courierPlatform.activateCourier(courier.courierId);
    const available = courierPlatform.setAvailability(courier.courierId, "AVAILABLE");

    assert.equal(available.status, "ACTIVE");
    assert.equal(available.availability, "AVAILABLE");
  });

  it("rejects assignment when courier is not available", () => {
    const courier = courierPlatform.registerCourier(buildCourierInput());
    const delivery = prepareAssignableDelivery(deliveryPlatform);

    assert.throws(
      () => courierPlatform.assignDelivery(courier.courierId, delivery.deliveryId),
      (error) => error.reason === "COURIER_NOT_ACTIVE"
    );
    assert.equal(courierPlatform.getMetrics().assignmentFailures, 1);
  });

  it("assigns delivery and updates both courier and delivery platforms", () => {
    const courier = prepareActiveCourier(courierPlatform);
    const delivery = prepareAssignableDelivery(deliveryPlatform);

    const result = courierPlatform.assignDelivery(courier.courierId, delivery.deliveryId, {
      actor: "dispatcher-1",
    });

    assert.equal(result.delivery.courierId, courier.courierId);
    assert.equal(result.delivery.status, "ASSIGNED");
    assert.deepEqual(result.courier.activeDeliveries, [delivery.deliveryId]);
    assert.equal(result.courier.capacity.currentActiveDeliveries, 1);
  });

  it("enforces courier capacity limits", () => {
    const courier = prepareActiveCourier(courierPlatform, { maximumActiveDeliveries: 1 });
    const deliveryA = prepareAssignableDelivery(deliveryPlatform);
    const deliveryB = prepareAssignableDelivery(deliveryPlatform);

    courierPlatform.assignDelivery(courier.courierId, deliveryA.deliveryId);
    assert.throws(
      () => courierPlatform.assignDelivery(courier.courierId, deliveryB.deliveryId),
      (error) => error.reason === "CAPACITY_EXCEEDED"
    );
  });

  it("reassigns delivery between couriers", () => {
    const courierA = prepareActiveCourier(courierPlatform, {
      phoneNumber: "+250780000001",
    });
    const courierB = prepareActiveCourier(courierPlatform, {
      phoneNumber: "+250780000002",
    });
    const delivery = prepareAssignableDelivery(deliveryPlatform);

    courierPlatform.assignDelivery(courierA.courierId, delivery.deliveryId);
    const result = courierPlatform.assignDelivery(courierB.courierId, delivery.deliveryId);

    assert.equal(result.delivery.courierId, courierB.courierId);
    assert.deepEqual(courierPlatform.getCourier(courierA.courierId).activeDeliveries, []);
    assert.deepEqual(result.courier.activeDeliveries, [delivery.deliveryId]);
  });

  it("removes assignment from courier and delivery", () => {
    const courier = prepareActiveCourier(courierPlatform);
    const delivery = prepareAssignableDelivery(deliveryPlatform);
    courierPlatform.assignDelivery(courier.courierId, delivery.deliveryId);

    const result = courierPlatform.removeAssignment(courier.courierId, delivery.deliveryId);

    assert.equal(result.delivery.status, "CONFIRMED");
    assert.equal(result.delivery.courierId, null);
    assert.deepEqual(result.courier.activeDeliveries, []);
  });

  it("maintains immutable courier history", () => {
    const courier = prepareActiveCourier(courierPlatform);
    const delivery = prepareAssignableDelivery(deliveryPlatform);
    courierPlatform.assignDelivery(courier.courierId, delivery.deliveryId);

    const history = courierPlatform.getCourierHistory(courier.courierId);
    assert.ok(history.some((event) => event.type === "registered"));
    assert.ok(history.some((event) => event.type === "assigned"));

    history.push({ eventId: "fake", type: "hack" });
    assert.equal(courierPlatform.getCourierHistory(courier.courierId).length, history.length - 1);
  });

  it("lists couriers with filters", () => {
    const courier = prepareActiveCourier(courierPlatform);
    const inactive = courierPlatform.registerCourier(
      buildCourierInput({ phoneNumber: "+250780000010" })
    );

    const active = courierPlatform.listCouriers({ status: "ACTIVE" });
    assert.equal(active.length, 1);
    assert.equal(active[0].courierId, courier.courierId);
    assert.ok(inactive.courierId);
  });
});

describe("Courier validation and authorization", () => {
  it("validates courier status and availability enums", () => {
    assert.equal(CourierValidation.validateStatus("ACTIVE").valid, true);
    assert.equal(CourierValidation.validateAvailability("BUSY").valid, true);
    assert.equal(CourierValidation.validateStatus("INVALID").valid, false);
  });

  it("requires admin for protected operations", () => {
    const admin = CourierSecurity.assertAdmin({ user: { _id: "a1", role: "admin" } });
    assert.equal(admin.valid, true);

    const user = CourierSecurity.assertAdmin({ user: { _id: "u1", role: "user" } });
    assert.equal(user.valid, false);
    assert.equal(user.statusCode, 403);
  });
});

describe("Courier HTTP", () => {
  it("exposes courier health endpoint", async () => {
    const { deliveryPlatform, courierRepository } = createIntegratedPlatforms();
    const app = express();
    registerCourierPlatform(app, null, {
      deliveryPlatform,
      repository: courierRepository,
    });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/couriers/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();
    assert.equal(response.success, true);
    assert.equal(response.data.phase, "8.2");
    assert.equal(response.data.deliveryIntegrated, true);
  });

  it("rejects unauthenticated courier registration", async () => {
    const { deliveryPlatform, courierRepository } = createIntegratedPlatforms();
    const app = express();
    registerCourierPlatform(app, null, {
      deliveryPlatform,
      repository: courierRepository,
    });

    const server = app.listen(0);
    const { port } = server.address();

    const statusCode = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/marketplace/delivery/couriers/",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify(buildCourierInput()));
      req.end();
    });

    server.close();
    assert.equal(statusCode, 401);
  });
});
