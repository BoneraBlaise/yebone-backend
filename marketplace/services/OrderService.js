const Order = require("../../model/order");
const { processOrderCommission } = require("../../utils/referralUtils");

/**
 * Marketplace order service — preserves existing order creation behaviour.
 */
class OrderService {
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
      const error = new Error("Missing required fields: shippingAddress or user");
      error.statusCode = 400;
      throw error;
    }

    if (!paymentInfo) {
      const error = new Error("Payment information is required");
      error.statusCode = 400;
      throw error;
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
      const error = new Error("Cart must be a non-empty array");
      error.statusCode = 400;
      throw error;
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
      const error = new Error("Failed to create any orders");
      error.statusCode = 500;
      throw error;
    }

    return { orders };
  }
}

module.exports = OrderService;
