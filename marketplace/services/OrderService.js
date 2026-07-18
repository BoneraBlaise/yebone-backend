const mongoose = require("mongoose");
const Order = require("../../model/order");
const Shop = require("../../model/shop");
const Commission = require("../../model/commission");
const {
  processOrderCommission,
  updateCommissionStatus,
} = require("../../utils/referralUtils");
const OrderInventoryService = require("../orders/OrderInventoryService");
const OrderStateMachine = require("../orders/OrderStateMachine");

/**
 * Order service — single business layer for order operations.
 */
class OrderService {
  constructor({ inventory, stateMachine } = {}) {
    this.inventory = inventory || new OrderInventoryService();
    this.stateMachine = stateMachine || new OrderStateMachine();
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

  _normalizeCartItem(item) {
    const itemPrice = item.discountPrice || item.originalPrice || item.price;
    if (!item.shopId || !itemPrice || !item.qty) {
      return null;
    }

    return {
      ...item,
      price: Number(itemPrice),
      qty: Number(item.qty),
    };
  }

  _buildShopItemsMap(cart = []) {
    const shopItemsMap = new Map();

    for (const item of cart) {
      const normalizedItem = this._normalizeCartItem(item);
      if (!normalizedItem) continue;

      if (!shopItemsMap.has(item.shopId)) {
        shopItemsMap.set(item.shopId, []);
      }

      shopItemsMap.get(item.shopId).push(normalizedItem);
    }

    return shopItemsMap;
  }

  async _createOrderDocument(payload, session) {
    const [order] = await Order.create([payload], { session });
    return order;
  }

  async _processReferral(order, referralCode, session) {
    if (!referralCode) return;
    await processOrderCommission(order, referralCode, session);
  }

  async createOrders(input = {}) {
    const {
      cart,
      wonBid,
      shippingAddress,
      user,
      paymentInfo,
      shipping = 0,
      referralCode,
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
      if (wonBid) {
        const productId = wonBid._id || wonBid.productId;
        await this.inventory.reserveStock(productId, 1, session);

        const order = await this._createOrderDocument(
          {
            cart: [
              {
                ...wonBid,
                shopId: wonBid.sellerId,
                shop: wonBid.sellerId,
                price: wonBid.price,
                qty: 1,
              },
            ],
            shippingAddress,
            user,
            totalPrice: wonBid.price + shipping,
            subTotalPrice: wonBid.price,
            shipping,
            paymentInfo: {
              ...paymentInfo,
              status: "Pending",
            },
            orderType: "won_bid",
            referralCode,
          },
          session
        );

        await this._processReferral(order, referralCode, session);
        return { orders: [order] };
      }

      const shopItemsMap = this._buildShopItemsMap(cart);
      const allItems = [];

      for (const items of shopItemsMap.values()) {
        allItems.push(...items);
      }

      if (allItems.length === 0) {
        throw this._error("Failed to create any orders", 500);
      }

      await this.inventory.reserveCartItems(allItems, session);

      const orders = [];

      for (const [, items] of shopItemsMap) {
        const shopTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

        const order = await this._createOrderDocument(
          {
            cart: items.map((item) => ({
              ...item,
              total: item.price * item.qty,
            })),
            shippingAddress,
            user,
            totalPrice: shopTotal + shipping,
            shipping,
            subTotalPrice: shopTotal,
            paymentInfo: {
              ...paymentInfo,
              status: "Pending",
            },
            orderType: "regular",
            referralCode,
          },
          session
        );

        await this._processReferral(order, referralCode, session);
        orders.push(order);
      }

      return { orders };
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

  async getOrdersByUserId(userId) {
    return Order.find({ "user._id": userId }).sort({ createdAt: -1 });
  }

  async getOrdersByShopId(shopId) {
    return Order.find({ "cart.shopId": shopId }).sort({ createdAt: -1 });
  }

  async getAllOrdersAdmin() {
    return Order.find().sort({ deliveredAt: -1, createdAt: -1 });
  }

  async findById(orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw this._error("Invalid order ID format");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw this._error("Order not found with this id");
    }

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

  async updateOrderStatus(orderId, status, sellerId) {
    const order = await this.findById(orderId);

    if (sellerId && !this._orderBelongsToSeller(order, sellerId)) {
      throw this._error("You are not allowed to update this order", 403);
    }

    this._assertTransition(order.status, status);
    order.status = status;

    if (status === "Delivered") {
      order.deliveredAt = Date.now();
      order.paymentInfo.status = "Succeeded";

      const serviceCharge = order.totalPrice * 0.1;

      if (order.referralCode) {
        const commission = await Commission.findOne({ referralCode: order.referralCode });
        if (commission) {
          let orderCommission = 0;

          for (const sale of commission.sales) {
            if (sale.order.toString() === order._id.toString()) {
              sale.status = "paid";
              orderCommission += sale.commission;
              await commission.updateShopStats(sale.shop, sale.commission, "paid");
            }
          }

          commission.balance.pending -= orderCommission;
          commission.balance.available += orderCommission;
          await commission.save();
        }
      }

      if (sellerId) {
        const seller = await Shop.findById(sellerId);
        if (seller) {
          seller.availableBalance = order.totalPrice - serviceCharge;
          await seller.save();
        }
      }

      if (order.referralCode) {
        await updateCommissionStatus(order._id, order.referralCode, "paid");
      }
    }

    await order.save({ validateBeforeSave: false });
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
    order.status = status;
    await order.save();

    if (status === "Refund Success") {
      await this.inventory.restoreCartItems(order.cart || []);
    }

    return order;
  }
}

module.exports = OrderService;
