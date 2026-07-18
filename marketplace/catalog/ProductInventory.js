/**
 * Product inventory helpers.
 */
class ProductInventory {
  getSummary(product = {}) {
    const stock = Number(product.stock || 0);
    const soldOut = Number(product.sold_out || 0);

    return {
      stock,
      soldOut,
      available: Math.max(stock, 0),
      isOutOfStock: stock <= 0,
    };
  }

  validateStock(input = {}) {
    const stock = Number(input.stock);
    return !Number.isNaN(stock) && stock >= 0;
  }
}

module.exports = ProductInventory;
