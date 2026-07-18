/**
 * Search sort/ranking helpers.
 */
class SearchRanking {
  static SORT_OPTIONS = Object.freeze([
    "newest",
    "popular",
    "featured",
    "priceLowToHigh",
    "priceHighToLow",
    "rating",
    "bestSelling",
    "almostGone",
  ]);

  buildSort(sortKey = "newest") {
    switch (sortKey) {
      case "priceLowToHigh":
        return { discountPrice: 1, createdAt: -1 };
      case "priceHighToLow":
        return { discountPrice: -1, createdAt: -1 };
      case "rating":
        return { ratings: -1, createdAt: -1 };
      case "popular":
      case "bestSelling":
        return { sold_out: -1, createdAt: -1 };
      case "featured":
        return { featured: -1, createdAt: -1 };
      case "almostGone":
        return { stock: 1, sold_out: -1, createdAt: -1 };
      case "newest":
      default:
        return { createdAt: -1 };
    }
  }

  isSupported(sortKey) {
    return SearchRanking.SORT_OPTIONS.includes(sortKey);
  }
}

module.exports = SearchRanking;
