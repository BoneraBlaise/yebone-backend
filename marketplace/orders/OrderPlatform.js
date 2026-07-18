const OrderConfiguration = require("./OrderConfiguration");
const OrderLifecycle = require("./OrderLifecycle");
const OrderValidation = require("./OrderValidation");
const OrderStatus = require("./OrderStatus");
const OrderHistory = require("./OrderHistory");
const OrderAnalytics = require("./OrderAnalytics");
const OrderHealth = require("./OrderHealth");
const OrderHooks = require("./OrderHooks");

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

    this.orderService = marketplaceCore.services.order;
    this.history = new OrderHistory({ orderService: this.orderService });
    this.analytics = new OrderAnalytics({
      lifecycle: this.lifecycle,
      config: this.config,
    });
    this.health = new OrderHealth(this);
  }

  async createOrders(input) {
    const validation = OrderValidation.validateCreateInput(input);
    if (!validation.valid) {
      const error = new Error(`Missing required fields: ${validation.fields.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    const { orders } = await this.orderService.createOrders(input);
    this.hooks.afterCreate(orders);
    this.marketplaceCore.hooks.order.afterCreate({ orders });
    return { orders };
  }

  async preparePaymentSessions(orders, user) {
    return this.marketplaceCore.hooks.payment.prepareForOrders(orders, user);
  }

  async updateStatus(orderId, status, sellerId) {
    const order = await this.orderService.updateOrderStatus(orderId, status, sellerId);
    this.hooks.afterStatusUpdated(order);
    return order;
  }

  async requestRefund(orderId, status) {
    const order = await this.orderService.requestRefund(orderId, status);
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
