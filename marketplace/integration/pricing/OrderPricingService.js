const Product = require("../../../model/product");

class OrderPricingService {
  constructor({ audit, observability } = {}) {
    this.audit = audit;
    this.observability = observability;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _resolveBrand(product) {
    if (product.brand) return String(product.brand);
    if (product.tags) return String(product.tags).split(",")[0]?.trim() || null;
    return null;
  }

  _resolveUnitPrice(product) {
    const discount = Number(product.discountPrice);
    const original = Number(product.originalPrice);
    if (Number.isFinite(discount) && discount > 0) return discount;
    if (Number.isFinite(original) && original > 0) return original;
    throw this._error(`Product ${product._id} has no valid server price`, 400);
  }

  async loadProduct(productId, session = null) {
    if (!productId) throw this._error("Cart item missing product id", 400);
    let query = Product.findById(productId);
    if (session) query = query.session(session);
    const product = await query.lean();
    if (!product) throw this._error(`Product not found: ${productId}`, 404);
    if (Number(product.stock) <= 0) throw this._error(`Product out of stock: ${product.name}`, 409);
    return product;
  }

  async repriceCartItem(item, session = null) {
    const productId = item._id || item.productId || item.id;
    const product = await this.loadProduct(productId, session);
    const qty = Math.max(1, Number(item.qty || 1));
    const unitPrice = this._resolveUnitPrice(product);
    const lineTotal = unitPrice * qty;

    return {
      _id: product._id,
      productId: String(product._id),
      name: product.name,
      category: product.category,
      brand: this._resolveBrand(product),
      tags: product.tags,
      shopId: String(product.shopId),
      shop: product.shop,
      images: product.images,
      qty,
      originalPrice: Number(product.originalPrice || unitPrice),
      discountPrice: unitPrice,
      price: unitPrice,
      serverPrice: unitPrice,
      lineTotal,
      commissionBase: lineTotal,
    };
  }

  async repriceCart(cart = [], { session = null, correlationId = null } = {}) {
    if (!Array.isArray(cart) || cart.length === 0) {
      throw this._error("Cart must be a non-empty array", 400);
    }

    const repriced = [];
    for (const item of cart) {
      repriced.push(await this.repriceCartItem(item, session));
    }

    const subtotal = repriced.reduce((sum, item) => sum + item.lineTotal, 0);
    if (this.observability) this.observability.increment("repricingEvents");

    if (this.audit) {
      await this.audit.record({
        platform: "orders",
        action: "cart.repriced",
        actor: "system",
        correlationId,
        oldValue: cart.map((i) => ({ id: i._id, clientPrice: i.price || i.discountPrice })),
        newValue: { subtotal, items: repriced.length },
        reason: "server_side_repricing",
      });
    }

    return Object.freeze({ items: repriced, subtotal, itemCount: repriced.length });
  }

  async repriceWonBid(wonBid, session = null) {
    const productId = wonBid._id || wonBid.productId;
    const product = await this.loadProduct(productId, session);
    const unitPrice = this._resolveUnitPrice(product);
    return {
      ...wonBid,
      _id: product._id,
      sellerId: String(product.shopId),
      shopId: String(product.shopId),
      price: unitPrice,
      serverPrice: unitPrice,
      commissionBase: unitPrice,
      brand: this._resolveBrand(product),
      category: product.category,
    };
  }
}

module.exports = OrderPricingService;
