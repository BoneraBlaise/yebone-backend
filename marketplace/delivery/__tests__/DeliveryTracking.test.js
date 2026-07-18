const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const {
  DeliveryPlatform,
  DeliveryRepository,
  DeliveryTrackingTimeline,
  TrackingService,
  registerDeliveryPlatform,
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

describe("Delivery Tracking Timeline", () => {
  let platform;

  beforeEach(() => {
    platform = new DeliveryPlatform({ repository: new DeliveryRepository() });
  });

  it("records timeline event on delivery creation", () => {
    const created = platform.createDelivery(buildCreateInput());
    const timeline = platform.getTrackingTimeline(created.deliveryId);

    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].status, "PENDING");
    assert.equal(timeline[0].note, "Delivery Created");
    assert.ok(timeline[0].eventId);
    assert.ok(timeline[0].timestamp);
  });

  it("appends timeline events in chronological order through lifecycle", () => {
    const created = platform.createDelivery(buildCreateInput());
    platform.updateStatus(created.deliveryId, "CONFIRMED");
    platform.assignCourier(created.deliveryId, "courier-1");
    platform.updateStatus(created.deliveryId, "PICKED_UP");
    platform.updateStatus(created.deliveryId, "IN_TRANSIT");
    platform.updateStatus(created.deliveryId, "DELIVERED");

    const timeline = platform.getTrackingTimeline(created.deliveryId);
    assert.equal(timeline.length, 6);
    assert.deepEqual(
      timeline.map((event) => event.status),
      ["PENDING", "CONFIRMED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]
    );

    for (let i = 1; i < timeline.length; i += 1) {
      assert.ok(Date.parse(timeline[i].timestamp) >= Date.parse(timeline[i - 1].timestamp));
    }
  });

  it("derives latest status from newest timeline event", () => {
    const created = platform.createDelivery(buildCreateInput());
    platform.updateStatus(created.deliveryId, "CONFIRMED");

    const latest = platform.getLatestTracking(created.deliveryId);
    const current = platform.getCurrentTrackingStatus(created.deliveryId);

    assert.equal(latest.status, "CONFIRMED");
    assert.equal(current.status, "CONFIRMED");
    assert.equal(current.deliveryId, created.deliveryId);
  });

  it("keeps timeline append-only and immutable", () => {
    const timelineStore = new DeliveryTrackingTimeline();
    const service = new TrackingService({ timeline: timelineStore });

    service.recordEvent("dlv_1", { status: "PENDING" });
    service.recordEvent("dlv_1", { status: "CONFIRMED" });

    const events = service.getTimeline("dlv_1");
    assert.equal(events.length, 2);
    assert.equal(events[0].status, "PENDING");

    events.push({ eventId: "fake", deliveryId: "dlv_1", status: "HACKED" });
    assert.equal(service.getTimeline("dlv_1").length, 2);
  });

  it("supports manual tracking event recording", () => {
    const created = platform.createDelivery(buildCreateInput());
    const event = platform.recordTrackingEvent(created.deliveryId, {
      status: "CONFIRMED",
      actor: "ops-user",
      note: "Manual confirmation",
    });

    assert.equal(event.actor, "ops-user");
    assert.equal(event.note, "Manual confirmation");
  });

  it("looks up timeline by tracking number", () => {
    const created = platform.createDelivery(buildCreateInput());
    platform.updateStatus(created.deliveryId, "CONFIRMED");

    const result = platform.getTrackingTimelineByTrackingNumber(created.trackingNumber);
    assert.equal(result.deliveryId, created.deliveryId);
    assert.equal(result.timeline.length, 2);
  });

  it("rejects invalid tracking number timeline lookup", () => {
    assert.throws(
      () => platform.getTrackingTimelineByTrackingNumber("INVALID"),
      (error) => error.statusCode === 400 && error.reason === "INVALID_TRACKING"
    );
  });

  it("records tracking observability metrics", () => {
    const created = platform.createDelivery(buildCreateInput());
    platform.updateStatus(created.deliveryId, "CONFIRMED");
    platform.getTrackingTimeline(created.deliveryId);
    platform.getLatestTracking(created.deliveryId);

    const metrics = platform.getMetrics();
    assert.ok(metrics.tracking.timelineEvents >= 2);
    assert.ok(metrics.tracking.trackingLookups >= 2);
    assert.ok(metrics.tracking.averageStatusHistoryLength >= 1);
  });
});

describe("Delivery Tracking HTTP", () => {
  function createSharedPlatform() {
    const repository = new DeliveryRepository();
    const trackingAnalytics = new (require("../tracking/DeliveryTrackingAnalytics"))();
    const trackingService = new TrackingService({ analytics: trackingAnalytics });
    const platform = new DeliveryPlatform({ repository, trackingService, trackingAnalytics });
    return { repository, trackingService, trackingAnalytics, platform };
  }

  it("exposes public timeline endpoint by tracking number", async () => {
    const { repository, trackingService, trackingAnalytics, platform } = createSharedPlatform();
    const created = platform.createDelivery(buildCreateInput());
    platform.updateStatus(created.deliveryId, "CONFIRMED");

    const app = express();
    registerDeliveryPlatform(app, null, { repository, trackingService, trackingAnalytics });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${port}/api/v2/marketplace/delivery/tracking/${created.trackingNumber}/timeline`,
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
    assert.equal(response.data.timeline.length, 2);
  });

  it("exposes delivery status endpoint", async () => {
    const { repository, trackingService, trackingAnalytics, platform } = createSharedPlatform();
    const created = platform.createDelivery(buildCreateInput());

    const app = express();
    registerDeliveryPlatform(app, null, { repository, trackingService, trackingAnalytics });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${port}/api/v2/marketplace/delivery/${created.deliveryId}/status`,
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
    assert.equal(response.data.status, "PENDING");
  });

  it("exposes delivery tracking timeline endpoint", async () => {
    const { repository, trackingService, trackingAnalytics, platform } = createSharedPlatform();
    const created = platform.createDelivery(buildCreateInput());

    const app = express();
    registerDeliveryPlatform(app, null, { repository, trackingService, trackingAnalytics });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${port}/api/v2/marketplace/delivery/${created.deliveryId}/tracking`,
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
    assert.equal(response.meta.count, 1);
  });

  it("returns 404 timeline for unknown tracking number", async () => {
    const app = express();
    registerDeliveryPlatform(app);

    const server = app.listen(0);
    const { port } = server.address();

    const statusCode = await new Promise((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${port}/api/v2/marketplace/delivery/tracking/YEB-DLV-UNKNOWN-1234/timeline`,
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        }
      ).on("error", reject);
    });

    server.close();
    assert.equal(statusCode, 404);
  });
});

describe("Delivery Tracking health", () => {
  it("reports tracking service readiness", () => {
    const platform = new DeliveryPlatform({ repository: new DeliveryRepository() });
    const health = platform.health.check();

    assert.equal(health.trackingServiceReady, true);
    assert.equal(health.phase, "8.1");
  });
});
