const { NOTIFICATION_TYPES } = require("./CommunicationDefaults");

class NegotiatedPriceBridge {
  constructor({ offerService, pricingService } = {}) {
    this.offerService = offerService;
    this.pricingService = pricingService;
  }

  async buildCheckoutPayload(buyerId, { offerId, priceLockToken }) {
    const offer = await this.offerService.validateAcceptedOffer(offerId, priceLockToken, buyerId);
    const repriced = await this.pricingService.repriceFromOffer(offer);
    return {
      offer,
      cart: [repriced],
      negotiatedOffer: {
        offerId: offer.offerId,
        priceLockToken: offer.priceLockToken,
        amount: offer.amount,
        productId: offer.productId,
      },
    };
  }

  async finalizeOrderFromOffer(offerId, orderId) {
    await this.offerService.markOfferOrdered(offerId, orderId);
  }
}

class OrderCommunicationHooks {
  constructor({ notificationService } = {}) {
    this.notificationService = notificationService;
  }

  register(orderPlatform) {
    if (!orderPlatform?.hooks) return;
    orderPlatform.hooks.handlers.onStatusUpdated.push(async (payload) => {
      if (!this.notificationService) return;
      let order = payload?.order;
      if (!order && payload?.orderId) {
        try {
          order = await orderPlatform.orderService.findById(payload.orderId);
        } catch (_error) {
          return;
        }
      }
      if (!order) return;
      const buyerId = order.user?._id || order.user?.id;
      const sellerId = order.cart?.[0]?.shopId;
      const orderId = order._id?.toString?.() || order.id;
      const status = payload?.status || order.status;
      const statusMap = {
        Processing: { type: NOTIFICATION_TYPES.ORDER_CONFIRMED, title: "Order confirmed", recipient: buyerId },
        Shipped: { type: NOTIFICATION_TYPES.ORDER_SHIPPED, title: "Order shipped", recipient: buyerId },
        Delivered: { type: NOTIFICATION_TYPES.ORDER_DELIVERED, title: "Order delivered", recipient: buyerId },
      };
      const config = statusMap[status];
      if (!config?.recipient) return;
      await this.notificationService.notifyUser(String(config.recipient), {
        type: config.type,
        title: config.title,
        body: `Order #${String(orderId).slice(-6)} — ${status}`,
        link: `/user-orders`,
        payload: { orderId, status },
        sourceId: orderId,
        sourceModule: "orders",
      });
      if (status === "Delivered" && sellerId) {
        await this.notificationService.notifyUser(String(sellerId), {
          type: NOTIFICATION_TYPES.DELIVERY_CONFIRMED,
          title: "Buyer confirmed delivery",
          body: `Order #${String(orderId).slice(-6)} marked delivered`,
          link: `/dashboard-orders`,
          payload: { orderId },
          sourceId: orderId,
          sourceModule: "orders",
        });
      }
    });
  }
}

module.exports = { NegotiatedPriceBridge, OrderCommunicationHooks };
