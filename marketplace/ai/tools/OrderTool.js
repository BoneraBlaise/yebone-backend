const BaseTool = require("./BaseTool");

const READ_ACTIONS = new Set(["history", "details", "get", "tracking", "status"]);
const MUTATION_ACTIONS = new Set([
  "cancel",
  "refund",
  "update",
  "update_status",
  "updatestatus",
  "accept_refund",
]);

/**
 * OrderTool — read-only order access via OrderPlatform / OrderService.
 */
class OrderTool extends BaseTool {
  constructor({ orderPlatform } = {}) {
    super({
      id: "order.get",
      name: "OrderTool",
      version: "7.2.0",
      capabilities: ["history", "tracking", "order_details", "order_status"],
      permissions: ["authenticated"],
      platform: "OrderPlatform",
    });
    this.orderPlatform = orderPlatform;
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.orderPlatform?.history),
      readOnly: true,
    });
  }

  _assertOwner(order, userId) {
    const ownerId = order?.user?._id || order?.user?.id;
    if (!userId || !ownerId || String(ownerId) !== String(userId)) {
      const error = new Error("Order access denied");
      error.statusCode = 403;
      error.code = "order_access_denied";
      throw error;
    }
  }

  _sanitizeOrder(order = {}) {
    return {
      id: order._id?.toString?.() || order.id || null,
      status: order.status,
      totalPrice: order.totalPrice,
      subTotalPrice: order.subTotalPrice,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      paymentStatus: order.paymentInfo?.status || "Pending",
      itemCount: Array.isArray(order.cart) ? order.cart.length : 0,
    };
  }

  async execute(input = {}, context = {}) {
    if (!this.orderPlatform) {
      throw new Error("OrderTool requires OrderPlatform");
    }

    const action = String(input.action || "history").toLowerCase();

    if (MUTATION_ACTIONS.has(action)) {
      const error = new Error("Order mutations are not supported in Phase 7.2");
      error.statusCode = 403;
      error.code = "mutation_not_supported";
      throw error;
    }

    if (!READ_ACTIONS.has(action)) {
      const error = new Error(`Unsupported order action: ${action}`);
      error.statusCode = 400;
      error.code = "unsupported_action";
      throw error;
    }

    if (action === "history") {
      const orders = await this.orderPlatform.history.listForUser(context.userId);
      return {
        orders: (orders || []).map((order) => this._sanitizeOrder(order)),
        meta: { count: (orders || []).length, userId: context.userId },
      };
    }

    const orderId = input.orderId || input.id;
    if (!orderId) {
      const error = new Error("OrderTool requires orderId");
      error.statusCode = 400;
      error.code = "MISSING_ORDER_ID";
      throw error;
    }

    const order = await this.orderPlatform.history.getById(orderId);
    this._assertOwner(order, context.userId);

    if (action === "tracking" || action === "status") {
      return {
        orderId,
        tracking: this.orderPlatform.status.getSummary(order),
        fulfillmentOptions: this.orderPlatform.status.getFulfillmentOptions(order.status),
      };
    }

    return {
      order: this._sanitizeOrder(order),
      cart: Array.isArray(order.cart)
        ? order.cart.map((item) => ({
            productId: item.productId,
            shopId: item.shopId,
            qty: item.qty,
            name: item.name,
          }))
        : [],
    };
  }
}

module.exports = OrderTool;
