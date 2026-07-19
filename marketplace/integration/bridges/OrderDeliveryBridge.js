const DeliveryStateMachine = require("../../delivery/DeliveryStateMachine");

const ORDER_TO_DELIVERY = Object.freeze({
  Processing: DeliveryStateMachine.STATUS.CONFIRMED,
  Shipping: DeliveryStateMachine.STATUS.IN_TRANSIT,
  "On the way": DeliveryStateMachine.STATUS.IN_TRANSIT,
  Delivered: DeliveryStateMachine.STATUS.DELIVERED,
});

const DELIVERY_TO_ORDER = Object.freeze({
  [DeliveryStateMachine.STATUS.DELIVERED]: "Delivered",
  [DeliveryStateMachine.STATUS.IN_TRANSIT]: "On the way",
  [DeliveryStateMachine.STATUS.PICKED_UP]: "Shipping",
  [DeliveryStateMachine.STATUS.ASSIGNED]: "Processing",
  [DeliveryStateMachine.STATUS.CONFIRMED]: "Processing",
});

class OrderDeliveryBridge {
  constructor({ audit, observability, featureFlags } = {}) {
    this.audit = audit;
    this.observability = observability;
    this.featureFlags = featureFlags;
  }

  _deliveryPlatform() {
    const { getDeliveryPlatform } = require("../../index");
    return getDeliveryPlatform();
  }

  async isDeliveryEnabled() {
    if (this.featureFlags) {
      return this.featureFlags.isEnabledSync("delivery", "yeboneDelivery.enabled");
    }
    return false;
  }

  async onOrdersCreated(orders = [], { shippingAddress, correlationId = null } = {}) {
    if (!(await this.isDeliveryEnabled())) return [];

    const deliveryPlatform = this._deliveryPlatform();
    const created = [];

    for (const order of orders) {
      const orderId = order._id?.toString?.() || order.id;
      const vendorId = order.cart?.[0]?.shopId;
      const customerId = order.user?._id || order.user?.id;

      try {
        const delivery = deliveryPlatform.createDelivery({
          orderId,
          customerId: String(customerId),
          vendorId: String(vendorId),
          pickupAddress: { shopId: String(vendorId) },
          deliveryAddress: shippingAddress,
          deliveryFee: Number(order.shipping || 0),
          metadata: { correlationId, source: "order_create" },
        });

        deliveryPlatform.updateStatus(delivery.deliveryId, DeliveryStateMachine.STATUS.CONFIRMED, {
          actor: "system",
          reason: "order_confirmed",
        });

        if (this.observability) this.observability.increment("deliveryCreations");
        if (this.audit) {
          await this.audit.record({
            platform: "delivery",
            action: "delivery.created",
            actor: "system",
            orderId,
            correlationId,
            newValue: { deliveryId: delivery.deliveryId, trackingNumber: delivery.trackingNumber },
          });
        }

        created.push(delivery);
      } catch (error) {
        if (error.reason === "ORDER_DELIVERY_EXISTS") continue;
        throw error;
      }
    }

    return created;
  }

  mapDeliveryStatusToOrder(deliveryStatus) {
    return DELIVERY_TO_ORDER[deliveryStatus] || null;
  }

  async syncOrderStatusToDelivery(order, nextStatus, { correlationId = null, actor = "system" } = {}) {
    if (!(await this.isDeliveryEnabled())) return null;

    const deliveryStatus = ORDER_TO_DELIVERY[nextStatus];
    if (!deliveryStatus) return null;

    const deliveryPlatform = this._deliveryPlatform();
    const orderId = order._id?.toString?.() || order.id;

    let delivery;
    try {
      delivery = deliveryPlatform.getDeliveryByOrderId(orderId);
    } catch (_error) {
      return null;
    }

    if (delivery.status === deliveryStatus) return delivery;

    const updated = deliveryPlatform.updateStatus(delivery.deliveryId, deliveryStatus, {
      actor,
      reason: `order_status_${nextStatus}`,
    });

    if (this.audit) {
      await this.audit.record({
        platform: "delivery",
        action: "delivery.status_synced",
        actor,
        orderId,
        correlationId,
        oldValue: delivery.status,
        newValue: updated.status,
        reason: `from_order_${nextStatus}`,
      });
    }

    return updated;
  }
}

module.exports = OrderDeliveryBridge;
