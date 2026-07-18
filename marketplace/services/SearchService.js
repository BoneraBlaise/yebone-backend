const Product = require("../../model/product");
const Shop = require("../../model/shop");
const SearchTextNormalizer = require("../search/SearchTextNormalizer");

const PRODUCT_PROJECTION =
  "name description category tags originalPrice discountPrice stock sold_out ratings featured bestdeal productType condition location shopId shop images createdAt brand likes";

const SHOP_PROJECTION = "name description address phoneNumber avatar isVerified createdAt zipCode";

/**
 * Search service — executes product and shop discovery queries.
 */
class SearchService {
  constructor({ productService, shopService } = {}) {
    this.productService = productService;
    this.shopService = shopService;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _buildMeta(query, total, resultsCount) {
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    return Object.freeze({
      query: query.q || null,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      count: resultsCount,
      sort: query.sort,
      hasResults: total > 0,
      empty: total === 0,
    });
  }

  async searchProducts(query, { filters, sort } = {}) {
    const skip = (query.page - 1) * query.limit;
    const filter = filters?.filters || {};

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(PRODUCT_PROJECTION)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      products,
      meta: this._buildMeta(query, total, products.length),
    };
  }

  async searchShops(query, { filters, sort } = {}) {
    const skip = (query.page - 1) * query.limit;
    const filter = filters?.filters || {};
    const shopSort = sort?.createdAt ? sort : { createdAt: -1 };

    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .select(SHOP_PROJECTION)
        .sort(shopSort)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Shop.countDocuments(filter),
    ]);

    return {
      shops,
      meta: this._buildMeta(query, total, shops.length),
    };
  }

  async listCategories() {
    const categories = await Product.distinct("category");
    return categories.filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  async suggestProducts(term, { limit = 8 } = {}) {
    const cleaned = SearchTextNormalizer.normalizeKeyword(term, 200);
    if (!cleaned) return [];

    const regex = SearchTextNormalizer.escapeRegex(cleaned);
    return Product.find({
      $or: [
        { name: { $regex: regex, $options: "i" } },
        { category: { $regex: regex, $options: "i" } },
      ],
    })
      .select("_id name category discountPrice images shopId shop")
      .sort({ sold_out: -1, createdAt: -1 })
      .limit(Math.min(limit, 20))
      .lean();
  }

  async ensureRecommendedIndexes() {
    await Product.collection.createIndex({ name: 1 });
    await Product.collection.createIndex({ category: 1, createdAt: -1 });
    await Product.collection.createIndex({ shopId: 1, createdAt: -1 });
    await Product.collection.createIndex({ discountPrice: 1 });
    await Product.collection.createIndex({ ratings: -1 });
    await Product.collection.createIndex({ sold_out: -1 });
    await Product.collection.createIndex({ featured: -1, createdAt: -1 });
    await Product.collection.createIndex({ stock: 1 });
    await Shop.collection.createIndex({ name: 1 });
    return { indexed: true };
  }
}

module.exports = SearchService;
