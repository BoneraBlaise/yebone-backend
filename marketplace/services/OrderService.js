const mongoose = require("mongoose");
const Order = require("../../model/order");
const Shop = require("../../model/shop");
const Product = require("../../model/product");
const Commission = require("../../model/commission");
const {
  processOrderCommission,
  updateCommissionStatus,
} = require("../../utils/referralUtils");

/**
 * Order service — single business layer for order operations.
 * Extracted from legacy controller/order.js (Phase 5).
 */
class OrderService {
  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async createOrders(input = {}) {
    const {
      cart,
      wonBid,
      shippingAddress,
      user,
      totalPrice,
      paymentInfo,
      shipping = 0,
      subTotalPrice,
      referralCode,
    } = input;

    if (!shippingAddress || !user) {
      throw this._error("Missing required fields: shippingAddress or user");
    }

    if (!paymentInfo) {
      throw this._error("Payment information is required");
    }

    if (wonBid) {
      const order = await Order.create({
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
      });

      if (referralCode) {
        await processOrderCommission(order, referralCode);
      }

      return { orders: [order] };
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      throw this._error("Cart must be a non-empty array");
    }

    const shopItemsMap = new Map();

    for (const item of cart) {
      const itemPrice = item.discountPrice || item.originalPrice;
      if (!item.shopId || !itemPrice || !item.qty) continue;

      const normalizedItem = {
        ...item,
        price: Number(itemPrice),
        qty: Number(item.qty),
      };

      if (!shopItemsMap.has(item.shopId)) {
        shopItemsMap.set(item.shopId, []);
      }

      shopItemsMap.get(item.shopId).push(normalizedItem);
    }

    const orders = [];

    for (const [, items] of shopItemsMap) {
      const shopTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

      const order = await Order.create({
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
      });

      if (referralCode) {
        await processOrderCommission(order, referralCode);
      }

      orders.push(order);
    }

    if (orders.length === 0) {
      throw this._error("Failed to create any orders", 500);
    }

    return { orders };
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

  async _adjustProductStock(productId, qtyDelta) {
    const product = await Product.findById(productId);
    if (!product) return;

    product.stock -= qtyDelta;
    product.sold_out += qtyDelta;
    await product.save({ validateBeforeSave: false });
  }

  async _restoreProductStock(productId, qty) {
    const product = await Product.findById(productId);
    if (!product) return;

    product.stock += qty;
    product.sold_out -= qty;
    await product.save({ validateBeforeSave: false });
  }

  async updateOrderStatus(orderId, status, sellerId) {
    const order = await this.findById(orderId);

    if (sellerId && !this._orderBelongsToSeller(order, sellerId)) {
      throw this._error("You are not allowed to update this order", 403);
    }

    if (status === "Transferred to delivery partner") {
      for (const item of order.cart) {
        await this._adjustProductStock(item._id, item.qty);
      }
    }

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

  async requestRefund(orderId, status = "Processing refund") {
    const order = await this.findById(orderId);
    order.status = status;
    await order.save({ validateBeforeSave: false });
    return order;
  }

  async acceptRefund(orderId, status, sellerId) {
    const order = await this.findById(orderId);

    if (sellerId && !this._orderBelongsToSeller(order, sellerId)) {
      throw this._error("You are not allowed to update this order", 403);
    }

    order.status = status;
    await order.save();

    if (status === "Refund Success") {
      for (const item of order.cart) {
        await this._restoreProductStock(item._id, item.qty);
      }
    }

    return order;
  }
}

module.exports = OrderService;
