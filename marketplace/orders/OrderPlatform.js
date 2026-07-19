const OrderConfiguration = require("./OrderConfiguration");
const OrderLifecycle = require("./OrderLifecycle");
const OrderValidation = require("./OrderValidation");
const OrderStatus = require("./OrderStatus");
const OrderHistory = require("./OrderHistory");
const OrderAnalytics = require("./OrderAnalytics");
const OrderHealth = require("./OrderHealth");
const OrderHooks = require("./OrderHooks");
const OrderIdempotencyService = require("./OrderIdempotencyService");

/**
 * Order Platform composition root — integrates with Marketplace Core services.
 */
class OrderPlatform {
  constructor({ marketplaceCore, config } = {}) {
    if (!marketplaceCore) {
      throw new Error("OrderPlatform requires marketplaceCore");
    }

    this.marketplaceCore = marketplaceCore;
    this.config = new OrderConfiguration(config);
    this.validation = OrderValidation;
    this.lifecycle = new OrderLifecycle();
    this.status = new OrderStatus({ lifecycle: this.lifecycle });
    this.hooks = new OrderHooks({ lifecycle: this.lifecycle });
    this.idempotency = new OrderIdempotencyService({ scope: "order_create" });

    this.orderService = marketplaceCore.services.order;
    this.history = new OrderHistory({ orderService: this.orderService });
    this.analytics = new OrderAnalytics({
      lifecycle: this.lifecycle,
      config: this.config,
    });
    this.health = new OrderHealth(this);
  }

  _buildIdempotencyPayload(input = {}) {
    return {
      cart: input.cart,
      wonBid: input.wonBid,
      shippingAddress: input.shippingAddress,
      user: input.user,
      paymentInfo: input.paymentInfo,
      shipping: input.shipping,
      subTotalPrice: input.subTotalPrice,
      totalPrice: input.totalPrice,
      referralCode: input.referralCode,
    };
  }

  async createOrders(input, { idempotencyKey } = {}) {
    const sanitizedInput = OrderValidation.sanitizeCreateInput(input);
    const validation = OrderValidation.validateCreateInput(sanitizedInput);
    if (!validation.valid) {
      const error = new Error(`Missing required fields: ${validation.fields.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    const requestPayload = this._buildIdempotencyPayload(sanitizedInput);

    const result = await this.idempotency.execute(
      idempotencyKey,
      requestPayload,
      async () => {
        const { orders, correlationId } = await this.orderService.createOrders(sanitizedInput);

        let paymentSessions = [];
        try {
          paymentSessions = await this.preparePaymentSessions(orders, sanitizedInput.user, correlationId);
          await this._persistPaymentIds(orders, paymentSessions);
        } catch (paymentError) {
          await this.orderService.compensateFailedCreate(orders);
          throw paymentError;
        }

        try {
          const { getPlatformIntegration } = require("../integration/PlatformIntegration");
          const integration = getPlatformIntegration();
          await integration.deliveryBridge.onOrdersCreated(orders, {
            shippingAddress: sanitizedInput.shippingAddress,
            correlationId,
          });
        } catch (_deliveryError) {
          // Delivery optional when feature disabled.
        }

        this.hooks.afterCreate(orders);
        this.marketplaceCore.hooks.order.afterCreate({ orders });

        return { orders, paymentSessions };
      }
    );

    return result;
  }

  async preparePaymentSessions(orders, user, correlationId = null) {
    try {
      const { getPlatformIntegration } = require("../integration/PlatformIntegration");
      const integration = getPlatformIntegration();
      return integration.paymentBridge.prepareOrderPayments(orders, user, { correlationId });
    } catch (_error) {
      return this.marketplaceCore.hooks.payment.prepareForOrders(orders, user);
    }
  }

  async _persistPaymentIds(orders = [], paymentSessions = []) {
    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      const session = paymentSessions[index];
      const paymentId = session?.paymentId;
      if (!paymentId) continue;

      order.paymentInfo = {
        ...(order.paymentInfo?.toObject?.() || order.paymentInfo || {}),
        paymentId: String(paymentId),
        status: order.paymentInfo?.status || "Pending",
      };
      await order.save({ validateBeforeSave: false });
    }
  }

  async updateStatus(orderId, status, sellerId) {
    const order = await this.orderService.updateOrderStatus(orderId, status, sellerId);
    this.hooks.afterStatusUpdated(order);
    return order;
  }

  async requestRefund(orderId, status, userId) {
    const order = await this.orderService.requestRefund(orderId, status, userId);
    this.hooks.afterRefundRequested(order);
    return order;
  }

  async acceptRefund(orderId, status, sellerId) {
    const order = await this.orderService.acceptRefund(orderId, status, sellerId);
    this.hooks.afterRefundAccepted(order);
    return order;
  }
}

module.exports = OrderPlatform;
