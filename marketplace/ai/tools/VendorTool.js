const BaseTool = require("./BaseTool");

/**
 * VendorTool — shop and seller reads via VendorPlatform / ShopService.
 */
class VendorTool extends BaseTool {
  constructor({ vendorPlatform, searchPlatform } = {}) {
    super({
      id: "vendor.shop.get",
      name: "VendorTool",
      version: "7.2.0",
      capabilities: ["seller_lookup", "shop_lookup", "store_metadata", "store_statistics"],
      permissions: ["public"],
      platform: "VendorPlatform",
    });
    this.vendorPlatform = vendorPlatform;
    this.searchPlatform = searchPlatform;
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.vendorPlatform?.profile),
    });
  }

  _sanitizeShop(shop = {}) {
    return {
      id: shop._id?.toString?.() || shop.id || null,
      name: shop.name,
      description: shop.description,
      address: shop.address,
      phoneNumber: shop.phoneNumber,
      avatar: shop.avatar,
      isVerified: shop.isVerified,
      zipCode: shop.zipCode,
      createdAt: shop.createdAt,
    };
  }

  async execute(input = {}, _context = {}) {
    if (!this.vendorPlatform) {
      throw new Error("VendorTool requires VendorPlatform");
    }

    const action = String(input.action || "shop_lookup").toLowerCase();

    if (action === "search" && this.searchPlatform) {
      return this.searchPlatform.searchShops({
        q: input.q || input.query,
        page: input.page,
        limit: input.limit,
        sort: input.sort,
      });
    }

    const shopId = input.shopId || input.id || input.sellerId;
    if (!shopId) {
      const error = new Error("VendorTool requires shopId");
      error.statusCode = 400;
      error.code = "MISSING_SHOP_ID";
      throw error;
    }

    const shop = await this.vendorPlatform.profile.getPublicInfo(shopId);
    const statistics = this.vendorPlatform.analytics.getBasicSummary(shop);

    return {
      shop: this._sanitizeShop(shop),
      seller: {
        id: shop._id?.toString?.() || shop.id || null,
        name: shop.name,
        isVerified: Boolean(shop.isVerified),
      },
      storeMetadata: {
        address: shop.address,
        phoneNumber: shop.phoneNumber,
        zipCode: shop.zipCode,
        createdAt: shop.createdAt,
      },
      statistics,
    };
  }
}

module.exports = VendorTool;
