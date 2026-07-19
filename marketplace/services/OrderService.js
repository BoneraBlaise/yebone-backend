const mongoose = require("mongoose");
const Order = require("../../model/order");
const OrderInventoryService = require("../orders/OrderInventoryService");
const OrderStateMachine = require("../orders/OrderStateMachine");

class OrderService {
  constructor({ inventory, stateMachine, integration } = {}) {
    this.inventory = inventory || new OrderInventoryService();
    this.stateMachine = stateMachine || new OrderStateMachine();
    this.integration = integration || null;
  }

  setIntegration(integration) {
    this.integration = integration;
    return this;
  }

  _integration() {
    if (this.integration) return this.integration;
    try {
      const { getPlatformIntegration } = require("../integration/PlatformIntegration");
      return getPlatformIntegration();
    } catch (_error) {
      return null;
    }
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _assertTransition(currentStatus, nextStatus) {
    const result = this.stateMachine.assertTransition(currentStatus, nextStatus);
    if (!result.valid) {
      throw this._error(result.message, 409);
    }
    return result;
  }

  _buildShopItemsMap(items = []) {
    const shopItemsMap = new Map();
    for (const item of items) {
      if (!shopItemsMap.has(item.shopId)) shopItemsMap.set(item.shopId, []);
      shopItemsMap.get(item.shopId).push(item);
    }
    return shopItemsMap;
  }

  async _createOrderDocument(payload, session) {
    const [order] = await Order.create([payload], { session });
    return order;
  }

  _resolveReferralCode(input, integration) {
    const { referralCode: inputReferralCode, attributionTokens = [] } = input;
    if (!integration) return null;

    try {
      const { getGrowthPlatform } = require("../growth");
      const growth = getGrowthPlatform();
      const resolved = growth.resolveReferralCode({
        referralCode: inputReferralCode,
        attributionTokens,
        requireToken: true,
      });
      return resolved || null;
    } catch (_error) {
      return null;
    }
  }

  async _processReferral(order, referralCode, session, options = {}) {
    if (!referralCode) return;
    const { getGrowthPlatform } = require("../growth");
    await getGrowthPlatform().processOrderCommission(order, referralCode, session, options);
  }

  async _validatePromotions(input, repricedItems, integration, correlationId) {
    const { getGrowthPlatform } = require("../growth");
    const growth = getGrowthPlatform();
    const cart = Array.isArray(repricedItems) ? repricedItems : [repricedItems];

    if (input.promotionId || input.promotionType || input.type) {
      const result = await growth.validatePromotion({ ...input, cart });
      if (!result.valid) {
        throw this._error(result.reason || "Invalid promotion", 400);
      }
    } else {
      for (const item of cart) {
        if (Number(item.serverPrice) < Number(item.originalPrice || item.serverPrice)) {
          const check = await growth.validatePromotion({
            type: "product_discount",
            productId: item._id,
            cart: [item],
          });
          if (!check.valid) {
            throw this._error(check.reason || "Promotion validation failed", 400);
          }
        }
      }
    }

    if (integration?.audit) {
      await integration.audit.record({
        platform: "growth",
        resource: "promotion",
        action: "promotion.validated",
        actor: "system",
        correlationId,
        newValue: { itemCount: cart.length },
        reason: "order_create",
      });
    }
  }

  async createOrders(input = {}) {
    const integration = this._integration();
    const correlationId = integration?.createCorrelationId("order") || null;

    const {
      cart,
      wonBid,
      shippingAddress,
      user,
      paymentInfo,
      shipping = 0,
      referralCode: inputReferralCode,
      attributionTokens = [],
      couponCode,
    } = input;

    if (!shippingAddress || !user) {
      throw this._error("Missing required fields: shippingAddress or user");
    }
    if (!paymentInfo) {
      throw this._error("Payment information is required");
    }
    if (!wonBid && (!Array.isArray(cart) || cart.length === 0)) {
      throw this._error("Cart must be a non-empty array");
    }

    return this.stateMachine.runInTransaction(async (session) => {
      const pricing = integration?.pricing;
      if (!pricing) throw this._error("Platform integration pricing unavailable", 503);

      const resolvedReferralCode = this._resolveReferralCode(
        { referralCode: inputReferralCode, attributionTokens },
        integration
      );

      let repricedCart = [];
      let cartSubtotal = 0;
      let repricedWonBid = null;

      if (wonBid) {
        repricedWonBid = await pricing.repriceWonBid(wonBid, session);
        cartSubtotal = repricedWonBid.commissionBase;
        await this._validatePromotions(input, repricedWonBid, integration, correlationId);
      } else {
        const repriced = await pricing.repriceCart(cart, { session, correlationId });
        repricedCart = repriced.items;
        cartSubtotal = repriced.subtotal;
        await this._validatePromotions(input, repricedCart, integration, correlationId);
      }

      const referralOptions = { attributionTokens, couponCode };
      let couponMeta = { totalDiscount: 0, couponId: null, couponCode: null };

      if (couponCode) {
        const { getGrowthPlatform } = require("../growth");
        const growth = getGrowthPlatform();
        couponMeta = await growth.redeemCouponForOrder({
          code: couponCode,
          cart: repricedCart.length ? repricedCart : repricedWonBid ? [repricedWonBid] : [],
          userId: user._id || user.id,
          session,
        });
        if (!couponMeta.valid) {
          throw this._error(couponMeta.reason || "Invalid coupon", 400);
        }
        referralOptions.couponId = couponMeta.couponId;
        referralOptions.couponCode = couponMeta.couponCode;
      }

      if (repricedWonBid) {
        await this.inventory.reserveStock(repricedWonBid._id, 1, session);

        const wonBidTotals = pricing.buildOrderTotals({
          subtotal: repricedWonBid.serverPrice,
          shipping,
          discount: couponMeta.totalDiscount || 0,
        });

        const order = await this._createOrderDocument(
          {
            cart: [
              {
                ...repricedWonBid,
                shopId: repricedWonBid.shopId,
                shop: repricedWonBid.shopId,
                price: repricedWonBid.serverPrice,
                qty: 1,
                total: repricedWonBid.serverPrice,
              },
            ],
            shippingAddress,
            user,
            totalPrice: wonBidTotals.total,
            subTotalPrice: wonBidTotals.subtotal,
            discountPrice: wonBidTotals.discount,
            taxAmount: wonBidTotals.taxAmount,
            couponCode: couponMeta.couponCode,
            shipping,
            paymentInfo: { ...paymentInfo, status: "Pending" },
            orderType: "won_bid",
            referralCode: resolvedReferralCode,
          },
          session
        );

        await this._processReferral(order, resolvedReferralCode, session, referralOptions);
        return { orders: [order], correlationId };
      }

      const shopItemsMap = this._buildShopItemsMap(repricedCart);
      const allItems = [];
      for (const items of shopItemsMap.values()) allItems.push(...items);
      if (allItems.length === 0) throw this._error("Failed to create any orders", 500);

      await this.inventory.reserveCartItems(allItems, session);

      const orders = [];
      const shopCount = shopItemsMap.size;
      let shopIndex = 0;
      for (const [, items] of shopItemsMap) {
        shopIndex += 1;
        const shopTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const orderReferralCode = resolvedReferralCode || items.find((item) => item.referralCode)?.referralCode;
        const orderDiscount =
          cartSubtotal > 0 ? (shopTotal / cartSubtotal) * (couponMeta.totalDiscount || 0) : 0;
        const allocatedShipping = shopIndex === shopCount ? shipping : 0;
        const shopTotals = pricing.buildOrderTotals({
          subtotal: shopTotal,
          shipping: allocatedShipping,
          discount: orderDiscount,
        });

        const order = await this._createOrderDocument(
          {
            cart: items.map((item) => ({
              ...item,
              price: item.serverPrice,
              total: item.lineTotal,
            })),
            shippingAddress,
            user,
            totalPrice: shopTotals.total,
            shipping: allocatedShipping,
            subTotalPrice: shopTotals.subtotal,
            discountPrice: shopTotals.discount,
            taxAmount: shopTotals.taxAmount,
            couponCode: couponMeta.couponCode,
            paymentInfo: { ...paymentInfo, status: "Pending" },
            orderType: "regular",
            referralCode: orderReferralCode,
          },
          session
        );

        await this._processReferral(order, orderReferralCode, session, referralOptions);
        orders.push(order);
      }

      return { orders, correlationId };
    });
  }

  async compensateFailedCreate(orders = []) {
    if (!Array.isArray(orders) || orders.length === 0) return;
    await this.stateMachine.runInTransaction(async (session) => {
      for (const order of orders) {
        await this.inventory.restoreCartItems(order.cart || [], session);
        await Order.deleteOne({ _id: order._id }, { session });
      }
    });
  }

  async getOrdersByUserId(userId, { page = 1, limit = 50 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    return Order.find({ "user._id": userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  async getOrdersByShopId(shopId, { page = 1, limit = 50 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    return Order.find({ "cart.shopId": shopId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  async getAllOrdersAdmin({ page = 1, limit = 100 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find().sort({ deliveredAt: -1, createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(),
    ]);
    return { orders, total, page, limit };
  }

  async findById(orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw this._error("Invalid order ID format");
    }
    const order = await Order.findById(orderId);
    if (!order) throw this._error("Order not found with this id");
    return order;
  }

  _orderBelongsToSeller(order, sellerId) {
    if (!sellerId) return false;
    return order.cart.some((item) => String(item.shopId) === String(sellerId));
  }

  _orderBelongsToUser(order, userId) {
    if (!userId) return false;
    const ownerId = order.user?._id || order.user?.id;
    return ownerId && String(ownerId) === String(userId);
  }

  async updateOrderStatus(orderId, status, sellerId, options = {}) {
    return this.updateOrderStatusIntegrated(orderId, status, sellerId, options);
  }

  async updateOrderStatusIntegrated(orderId, status, sellerId, options = {}) {
    const integration = this._integration();
    const correlationId = options.correlationId || integration?.createCorrelationId("status") || null;
    const order = await this.findById(orderId);

    if (sellerId && !this._orderBelongsToSeller(order, sellerId)) {
      throw this._error("You are not allowed to update this order", 403);
    }

    this._assertTransition(order.status, status);
    order.status = status;

    if (status === "Delivered") {
      order.deliveredAt = Date.now();
      order.paymentInfo.status = "Succeeded";

      if (integration?.settlementBridge) {
        await integration.settlementBridge.settleOrder(order, { correlationId });
      }
    }

    await order.save({ validateBeforeSave: false });

    if (!options.skipDeliverySync && integration?.deliveryBridge) {
      await integration.deliveryBridge.syncOrderStatusToDelivery(order, status, { correlationId });
    }

    return order;
  }

  async requestRefund(orderId, status = "Processing refund", userId) {
    const order = await this.findById(orderId);
    if (userId && !this._orderBelongsToUser(order, userId)) {
      throw this._error("You are not allowed to request a refund for this order", 403);
    }
    this._assertTransition(order.status, status);
    order.status = status;
    await order.save({ validateBeforeSave: false });
    return order;
  }

  async acceptRefund(orderId, status, sellerId) {
    const order = await this.findById(orderId);
    if (sellerId && !this._orderBelongsToSeller(order, sellerId)) {
      throw this._error("You are not allowed to update this order", 403);
    }
    this._assertTransition(order.status, status);

    if (status === "Refund Success") {
      const integration = this._integration();
      const correlationId = integration?.createCorrelationId("refund") || null;

      return this.stateMachine.runInTransaction(async (session) => {
        order.status = status;
        await order.save({ session });

        if (integration?.refundBridge) {
          await integration.refundBridge.executeRefund(order, {
            sellerId,
            actor: sellerId ? String(sellerId) : "system",
            correlationId,
            session,
          });
        } else {
          await this.inventory.restoreCartItems(order.cart || [], session);
        }

        return order;
      });
    }

    order.status = status;
    await order.save();
    return order;
  }
}

module.exports = OrderService;
