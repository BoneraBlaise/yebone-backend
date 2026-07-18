/**
 * Product lifecycle hooks — extension points for later phases.
 */
class ProductHooks {
  constructor({ lifecycle } = {}) {
    this.lifecycle = lifecycle;
    this.handlers = {
      onCreated: [],
      onUpdated: [],
      onDeleted: [],
      onReviewed: [],
      onLiked: [],
    };
  }

  afterCreate(product) {
    return this._emit("onCreated", this.lifecycle.afterCreate(product));
  }

  afterUpdate(product) {
    return this._emit("onUpdated", this.lifecycle.afterUpdate(product));
  }

  afterDelete(productId) {
    return this._emit("onDeleted", this.lifecycle.afterDelete(productId));
  }

  afterReview(product) {
    return this._emit("onReviewed", { productId: product._id?.toString?.() });
  }

  afterLike(payload) {
    return this._emit("onLiked", payload);
  }

  _emit(event, payload) {
    for (const handler of this.handlers[event] || []) {
      handler(payload);
    }
    return payload;
  }
}

module.exports = ProductHooks;
