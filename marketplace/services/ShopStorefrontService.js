const Product = require("../../model/product");
const Order = require("../../model/order");

const PUBLIC_SHOP_FIELDS = [
  "name",
  "description",
  "bio",
  "address",
  "phoneNumber",
  "avatar",
  "cover",
  "gallery",
  "isVerified",
  "zipCode",
  "website",
  "socialLinks",
  "businessStatus",
  "businessHours",
  "policies",
  "themeAccent",
  "createdAt",
  "followers",
  "favoritedBy",
];

/**
 * Storefront aggregation — extends ShopService without replacing frozen vendor logic.
 */
class ShopStorefrontService {
  toPublicShop(shop) {
    if (!shop) return null;
    const doc = typeof shop.toObject === "function" ? shop.toObject() : { ...shop };
    const publicShop = {};
    for (const key of PUBLIC_SHOP_FIELDS) {
      if (doc[key] !== undefined) publicShop[key] = doc[key];
    }
    publicShop._id = doc._id;
    publicShop.followerCount = Array.isArray(doc.followers) ? doc.followers.length : 0;
    publicShop.favoriteCount = Array.isArray(doc.favoritedBy) ? doc.favoritedBy.length : 0;
    return publicShop;
  }

  async aggregateStats(shopId) {
    const [products, orders] = await Promise.all([
      Product.find({ shopId }).select("reviews ratings sold_out category").lean(),
      Order.find({ "cart.shopId": shopId }).select("status deliveredAt").lean(),
    ]);

    const allReviews = products.flatMap((p) =>
      (p.reviews || []).map((r) => ({ ...r, productId: p._id }))
    );
    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: allReviews.filter((r) => Math.round(r.rating) === star).length,
    }));

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) =>
      ["Delivered", "Completed", "Succeeded"].includes(o.status)
    ).length;
    const deliverySuccess =
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    const totalSold = products.reduce((sum, p) => sum + (Number(p.sold_out) || 0), 0);

    const categories = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ].sort();

    return {
      productCount: products.length,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      totalOrders,
      completedOrders,
      deliverySuccess,
      totalSold,
      categories,
    };
  }

  deriveAchievements({ shop, stats }) {
    const badges = [];
    if (shop?.isVerified) {
      badges.push({ id: "verified", label: "Verified Seller", icon: "verified" });
    }
    if (stats.productCount >= 10) {
      badges.push({ id: "top-seller", label: "Top Seller", icon: "top" });
    }
    if (stats.deliverySuccess >= 90 && stats.totalOrders >= 5) {
      badges.push({ id: "fast-shipping", label: "Fast Shipping", icon: "shipping" });
    }
    if (stats.averageRating >= 4.5 && stats.totalReviews >= 3) {
      badges.push({ id: "highly-rated", label: "Highly Rated", icon: "star" });
    }
    if (stats.averageRating >= 4 && stats.totalReviews >= 10) {
      badges.push({ id: "buyer-recommended", label: "Buyer Recommended", icon: "heart" });
    }
    if (shop?.isVerified && stats.deliverySuccess >= 85 && stats.averageRating >= 4) {
      badges.push({ id: "trusted", label: "Trusted Store", icon: "shield" });
    }
    return badges;
  }

  async getStorefrontPayload(shop) {
    const shopId = shop._id?.toString?.() || shop.id;
    const stats = await this.aggregateStats(shopId);
    const achievements = this.deriveAchievements({ shop, stats });
    return {
      shop: this.toPublicShop(shop),
      stats,
      achievements,
    };
  }
}

module.exports = ShopStorefrontService;
