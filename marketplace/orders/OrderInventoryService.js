const Product = require("../../model/product");

/**
 * Atomic inventory reservation using MongoDB conditional updates.
 *
 * Strategy: optimistic atomic `$inc` with stock guard (`stock >= qty`).
 * Concurrent buyers race on the same document; only one succeeds when stock = 1.
 */
class OrderInventoryService {
  _error(message, statusCode = 409) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = "OUT_OF_STOCK";
    return error;
  }

  async reserveStock(productId, qty, session = null) {
    const quantity = Number(qty);
    if (!productId || !quantity || quantity <= 0) {
      throw this._error("Invalid inventory reservation request", 400);
    }

    const query = Product.findOneAndUpdate(
      {
        _id: productId,
        stock: { $gte: quantity },
      },
      {
        $inc: {
          stock: -quantity,
          sold_out: quantity,
        },
      },
      {
        new: true,
        session,
      }
    );

    const product = await query;
    if (!product) {
      throw this._error("Product is out of stock", 409);
    }

    return product;
  }

  async reserveCartItems(cartItems = [], session = null) {
    const reservations = [];

    for (const item of cartItems) {
      const productId = item._id || item.productId;
      const qty = Number(item.qty || 1);
      const product = await this.reserveStock(productId, qty, session);
      reservations.push({ productId, qty, productName: product.name });
    }

    return reservations;
  }

  async restoreStock(productId, qty, session = null) {
    const quantity = Number(qty);
    if (!productId || !quantity || quantity <= 0) return;

    await Product.findByIdAndUpdate(
      productId,
      {
        $inc: {
          stock: quantity,
          sold_out: -quantity,
        },
      },
      { session }
    );
  }

  async restoreCartItems(cartItems = [], session = null) {
    for (const item of cartItems) {
      await this.restoreStock(item._id || item.productId, item.qty, session);
    }
  }
}

module.exports = OrderInventoryService;
