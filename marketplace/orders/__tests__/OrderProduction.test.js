const path = require("path");
const fs = require("fs");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const rootEnv = path.join(__dirname, "..", "..", "..", ".env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const OrderStateMachine = require("../OrderStateMachine");
const OrderSecurity = require("../OrderSecurity");
const OrderIdempotencyService = require("../OrderIdempotencyService");
const OrderInventoryService = require("../OrderInventoryService");
const OrderService = require("../../services/OrderService");
const OrderIdempotencyRecord = require("../models/OrderIdempotencyRecord");
const Product = require("../../../model/product");
const Order = require("../../../model/order");

const TEST_URI = process.env.MONGODB_TEST_URI || process.env.DB_URL || null;

describe("Order production hardening (unit)", () => {
  it("rejects invalid state transitions", () => {
    const machine = new OrderStateMachine();

    const pendingToDelivered = machine.assertTransition("Processing", "Delivered");
    assert.equal(pendingToDelivered.valid, false);

    const cancelledToDelivered = machine.assertTransition("Processing refund", "Delivered");
    assert.equal(cancelledToDelivered.valid, false);

    const deliveredToPending = machine.assertTransition("Delivered", "Processing");
    assert.equal(deliveredToPending.valid, false);
  });

  it("allows valid fulfillment and refund transitions", () => {
    const machine = new OrderStateMachine();

    assert.equal(machine.assertTransition("Processing", "Transferred to delivery partner").valid, true);
    assert.equal(machine.assertTransition("Shipping", "Delivered").valid, true);
    assert.equal(machine.assertTransition("Processing", "Processing refund").valid, true);
    assert.equal(machine.assertTransition("Processing refund", "Refund Success").valid, true);
  });

  it("rejects unauthorized ownership checks", () => {
    const auth = OrderSecurity.assertAuthenticatedUser({ user: null });
    assert.equal(auth.valid, false);
    assert.equal(auth.statusCode, 401);

    const ownership = OrderSecurity.assertUserOwnership(
      { user: { _id: "user-a" } },
      "user-b"
    );
    assert.equal(ownership.valid, false);
    assert.equal(ownership.statusCode, 403);

    const orderOwnership = OrderSecurity.assertOrderOwnership(
      { user: { _id: "user-a" } },
      "user-b"
    );
    assert.equal(orderOwnership.valid, false);
  });

  it("rejects seller updates for orders they do not own", async () => {
    const service = new OrderService({
      stateMachine: new OrderStateMachine(),
      inventory: new OrderInventoryService(),
    });

    service.findById = async () => ({
      status: "Processing",
      cart: [{ shopId: "shop-a" }],
      save: async () => {},
    });

    await assert.rejects(
      () => service.updateOrderStatus("507f1f77bcf86cd799439011", "Shipping", "shop-b"),
      (error) => error.statusCode === 403
    );
  });

  it("rejects invalid status updates through OrderService", async () => {
    const service = new OrderService({
      stateMachine: new OrderStateMachine(),
      inventory: new OrderInventoryService(),
    });

    service.findById = async () => ({
      status: "Processing",
      cart: [{ shopId: "shop-a" }],
      save: async () => {},
    });

    await assert.rejects(
      () => service.updateOrderStatus("507f1f77bcf86cd799439011", "Delivered", "shop-a"),
      (error) => error.statusCode === 409
    );
  });
});

describe("Order production hardening (integration)", { skip: !TEST_URI }, () => {
  let inventory;
  let idempotency;
  let productId;

  before(async () => {
    await mongoose.connect(TEST_URI);
    inventory = new OrderInventoryService();
    idempotency = new OrderIdempotencyService({ scope: "order-production-test" });

    await OrderIdempotencyRecord.deleteMany({ scope: "order-production-test" });
    await Product.deleteMany({ name: /^order-production-test-/ });
    await Order.deleteMany({ "user.email": "order-production-test@example.com" });

    const product = await Product.create({
      name: "order-production-test-product",
      description: "integration test product",
      category: "test",
      discountPrice: 900,
      stock: 1,
      sold_out: 0,
      shopId: new mongoose.Types.ObjectId().toString(),
      shop: { _id: new mongoose.Types.ObjectId().toString(), name: "Test Shop" },
      images: [{ public_id: "test-id", url: "https://example.com/image.jpg" }],
      productType: "normal",
    });
    productId = product._id;
  });

  after(async () => {
    await OrderIdempotencyRecord.deleteMany({ scope: "order-production-test" });
    await Product.deleteMany({ name: /^order-production-test-/ });
    await Order.deleteMany({ "user.email": "order-production-test@example.com" });
    await mongoose.disconnect();
  });

  it("returns cached response for duplicate idempotent create requests", async () => {
    const key = `integration-${Date.now()}-duplicate`;
    let runs = 0;

    const first = await idempotency.execute(key, { cart: [{ _id: productId, qty: 1 }] }, async () => {
      runs += 1;
      return { orders: [{ _id: "order-1" }], paymentSessions: [{ orderId: "order-1" }] };
    });

    const second = await idempotency.execute(key, { cart: [{ _id: productId, qty: 1 }] }, async () => {
      runs += 1;
      return { orders: [{ _id: "order-2" }], paymentSessions: [{ orderId: "order-2" }] };
    });

    assert.equal(runs, 1);
    assert.equal(first.fromCache, false);
    assert.equal(second.fromCache, true);
    assert.equal(second.orders[0]._id, "order-1");
  });

  it("allows only one concurrent buyer when stock is 1", async () => {
    await Product.findByIdAndUpdate(productId, { stock: 1, sold_out: 0 });

    const reserveAttempts = await Promise.allSettled([
      inventory.reserveStock(productId, 1),
      inventory.reserveStock(productId, 1),
    ]);

    const successes = reserveAttempts.filter((result) => result.status === "fulfilled");
    const failures = reserveAttempts.filter((result) => result.status === "rejected");

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].reason.code, "OUT_OF_STOCK");

    await inventory.restoreStock(productId, 1);
  });

  it("rolls back inventory reservation when order creation fails", async () => {
    await Product.findByIdAndUpdate(productId, { stock: 2, sold_out: 0 });
    const machine = new OrderStateMachine();

    await assert.rejects(async () => {
      await machine.runInTransaction(async (session) => {
        await inventory.reserveStock(productId, 1, session);
        throw new Error("Simulated order persistence failure");
      });
    });

    const product = await Product.findById(productId);
    assert.equal(product.stock, 2);
    assert.equal(product.sold_out, 0);
  });

  it("rejects refund requests from non-owners", async () => {
    const service = new OrderService();
    const order = await Order.create({
      cart: [{ _id: productId, shopId: new mongoose.Types.ObjectId().toString(), price: 900, qty: 1 }],
      shippingAddress: { city: "Kigali" },
      user: { _id: new mongoose.Types.ObjectId(), email: "order-production-test@example.com" },
      totalPrice: 900,
      paymentInfo: { type: "CARD", status: "Pending" },
      orderType: "regular",
      status: "Processing",
    });

    await assert.rejects(
      () => service.requestRefund(order._id, "Processing refund", new mongoose.Types.ObjectId()),
      (error) => error.statusCode === 403
    );
  });
});
