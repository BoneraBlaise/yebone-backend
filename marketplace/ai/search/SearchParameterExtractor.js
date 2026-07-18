/**
 * Natural language → structured SearchTool parameters (Phase 7.3).
 * Planner understands; SearchPlatform searches; no local filtering here.
 */
class SearchParameterExtractor {
  constructor(options = {}) {
    this.defaultLimit = options.defaultLimit || 20;
    this.defaultPage = options.defaultPage || 1;
    this.brands = options.brands || SearchParameterExtractor.DEFAULT_BRANDS;
    this.categories = options.categories || SearchParameterExtractor.DEFAULT_CATEGORIES;
  }

  extract(rawQuery = "", options = {}) {
    const originalQuery = String(rawQuery || "").trim();
    if (!originalQuery) {
      const error = new Error("search query is required");
      error.code = "EMPTY_QUERY";
      error.statusCode = 400;
      throw error;
    }

    let working = originalQuery;
    const language = this._detectLanguage(working);
    const extracted = {
      language,
      originalQuery,
      signals: [],
    };

    working = this._stripFillerWords(working, language);

    const sort = this._extractSort(working, extracted);
    if (sort.value) working = sort.text;

    const prices = this._extractPrices(working, language, extracted);
    working = prices.text;

    const condition = this._extractCondition(working, language, extracted);
    working = condition.text;

    const location = this._extractLocation(working, language, extracted);
    working = location.text;

    const availability = this._extractAvailability(working, language, extracted);
    working = availability.text;

    const brand = this._extractBrand(working, language, extracted);
    working = brand.text;

    const category = this._extractCategory(working, language, extracted);
    working = category.text;

    const pagination = this._extractPagination(options, extracted);

    const keyword = this._normalizeKeyword(working, {
      brand: brand.value,
      category: category.value,
    });

    if (!keyword && !category.value && !brand.value) {
      const error = new Error("unable to extract searchable terms from query");
      error.code = "INVALID_QUERY";
      error.statusCode = 400;
      throw error;
    }

    return Object.freeze({
      q: keyword || category.value || brand.value || originalQuery,
      category: category.value,
      brand: brand.value,
      minPrice: prices.minPrice,
      maxPrice: prices.maxPrice,
      priceMin: prices.minPrice,
      priceMax: prices.maxPrice,
      condition: condition.value,
      location: location.value,
      inStock: availability.inStock,
      sort: sort.value || options.sort || "newest",
      page: pagination.page,
      limit: pagination.limit,
      language,
      originalQuery,
      extracted: Object.freeze(extracted),
    });
  }

  _detectLanguage(text) {
    const lower = text.toLowerCase();
    const rwSignals = [
      "nshakira",
      "ndashaka",
      "mfasha",
      "kubona",
      "munsi",
      "hejuru",
      "ifite",
      "nziza",
      "ya ",
      " mu ",
      " i ",
    ];
    const rwCount = rwSignals.filter((signal) => lower.includes(signal)).length;
    const enSignals = ["show me", "find", "under", "below", "looking for", "help me"];
    const enCount = enSignals.filter((signal) => lower.includes(signal)).length;

    if (rwCount > 0 && enCount > 0) return "mixed";
    if (rwCount > 0) return "rw";
    return "en";
  }

  _stripFillerWords(text, language) {
    const fillers = [
      /\b(show me|find|search for|looking for|i need|i want|help me|please)\b/gi,
      /\b(nshakira|ndashaka|mfasha|mpagarike|ngerageza|kubona|reba|mfashe)\b/gi,
      /\b(can you|could you)\b/gi,
    ];
    let result = text;
    for (const pattern of fillers) {
      result = result.replace(pattern, " ");
    }
    if (language === "rw" || language === "mixed") {
      result = result.replace(/\b(munsi ya|hejuru ya|iri|ya|ifite|nziza|bya)\b/gi, " ");
    }
    return result.replace(/\s+/g, " ").trim();
  }

  _extractPrices(text, language, extracted) {
    let working = text;
    let minPrice = null;
    let maxPrice = null;

    const parseAmount = (raw) => {
      const cleaned = String(raw || "")
        .replace(/[,_\s]/g, "")
        .replace(/rwf|frw|rfr|francs?/gi, "")
        .trim();
      const value = Number(cleaned);
      return Number.isFinite(value) && value >= 0 ? value : null;
    };

    const betweenPattern =
      /\b(?:between|from)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|rfr))?)\s+(?:and|to|-)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|rfr))?)\b/gi;
    working = working.replace(betweenPattern, (_match, low, high) => {
      minPrice = parseAmount(low);
      maxPrice = parseAmount(high);
      extracted.signals.push("price_between");
      return " ";
    });

    const maxPatterns = [
      /\b(?:under|below|less than|at most|max|maximum|cheaper than|up to)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|rfr))?)\b/gi,
      /\b(?:munsi ya|munsi)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|francs?))?)\b/gi,
    ];
    for (const pattern of maxPatterns) {
      working = working.replace(pattern, (_match, amount) => {
        maxPrice = parseAmount(amount);
        extracted.signals.push("price_max");
        return " ";
      });
    }

    const minPatterns = [
      /\b(?:over|above|more than|at least|min|minimum|from)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|rfr))?)\b/gi,
      /\b(?:hejuru ya|hejuru)\s+([\d,\s]+(?:\.\d+)?(?:\s*(?:rwf|frw|francs?))?)\b/gi,
    ];
    for (const pattern of minPatterns) {
      working = working.replace(pattern, (_match, amount) => {
        minPrice = parseAmount(amount);
        extracted.signals.push("price_min");
        return " ";
      });
    }

    if (language === "rw" || language === "mixed") {
      const rwAmountPattern = /\b([\d,\s]{3,}(?:\s*(?:rwf|frw|francs?))?)\b/gi;
      if (maxPrice === null && minPrice === null) {
        working = working.replace(rwAmountPattern, (_match, amount) => {
          const parsed = parseAmount(amount);
          if (parsed !== null && parsed >= 1000) {
            maxPrice = parsed;
            extracted.signals.push("price_max_inferred");
            return " ";
          }
          return _match;
        });
      }
    }

    return { text: working.replace(/\s+/g, " ").trim(), minPrice, maxPrice };
  }

  _extractSort(text, extracted) {
    let value = null;
    let working = text;

    const rules = [
      { pattern: /\b(cheapest|lowest price|price low to high|low price)\b/gi, sort: "priceLowToHigh" },
      { pattern: /\b(most expensive|highest price|price high to low)\b/gi, sort: "priceHighToLow" },
      { pattern: /\b(best rated|top rated|highest rated)\b/gi, sort: "rating" },
      { pattern: /\b(best selling|popular|most popular)\b/gi, sort: "bestSelling" },
      { pattern: /\b(featured|best deal|bestdeal)\b/gi, sort: "featured" },
      { pattern: /\b(newest|latest|recent)\b/gi, sort: "newest" },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(working)) {
        value = rule.sort;
        extracted.signals.push(`sort:${rule.sort}`);
        working = working.replace(rule.pattern, " ");
        break;
      }
    }

    return { value, text: working.replace(/\s+/g, " ").trim() };
  }

  _extractCondition(text, language, extracted) {
    let value = null;
    let working = text;
    const rules = [
      { pattern: /\b(brand new|new|nshya)\b/gi, value: "new" },
      { pattern: /\b(used|refurbished|second hand|yakoreshejwe|yakoreshwaga)\b/gi, value: "used" },
    ];
    for (const rule of rules) {
      if (rule.pattern.test(working)) {
        value = rule.value;
        extracted.signals.push(`condition:${rule.value}`);
        working = working.replace(rule.pattern, " ");
        break;
      }
    }
    if (!value && (language === "rw" || language === "mixed") && /\bnshya\b/i.test(text)) {
      value = "new";
      extracted.signals.push("condition:new");
    }
    return { value, text: working.replace(/\s+/g, " ").trim() };
  }

  _extractLocation(text, language, extracted) {
    let value = null;
    let working = text;
    const pattern = /\b(?:in|at|from|around|near|mu|i|muri)\s+([a-zA-Z][a-zA-Z\s-]{2,30})\b/gi;
    working = working.replace(pattern, (_match, place) => {
      const normalized = place.trim();
      if (!this._isStopLocation(normalized)) {
        value = normalized;
        extracted.signals.push(`location:${normalized}`);
        return " ";
      }
      return _match;
    });
    return { value, text: working.replace(/\s+/g, " ").trim() };
  }

  _isStopLocation(value) {
    const blocked = new Set([
      "stock",
      "store",
      "shop",
      "price",
      "good",
      "nice",
      "size",
      "black",
      "white",
    ]);
    return blocked.has(String(value).toLowerCase());
  }

  _extractAvailability(text, language, extracted) {
    let inStock = null;
    let working = text;
    const patterns = [
      /\b(in stock|available|in-stock|birahari|bihari)\b/gi,
      /\b(out of stock|unavailable|ntabwo)\b/gi,
    ];
    if (patterns[0].test(working)) {
      inStock = true;
      extracted.signals.push("availability:in_stock");
      working = working.replace(patterns[0], " ");
    } else if (patterns[1].test(working)) {
      inStock = false;
      extracted.signals.push("availability:out_of_stock");
      working = working.replace(patterns[1], " ");
    }
    if (inStock === null && (language === "rw" || language === "mixed") && /\bbihari\b/i.test(text)) {
      inStock = true;
      extracted.signals.push("availability:in_stock");
    }
    return { inStock, text: working.replace(/\s+/g, " ").trim() };
  }

  _extractBrand(text, language, extracted) {
    let value = null;
    let working = text.toLowerCase();

    const yaBrandPattern = /\b(?:ya|bya)\s+([a-z0-9][a-z0-9&+\-.]{1,30})\b/gi;
    const yaMatch = yaBrandPattern.exec(text);
    if (yaMatch) {
      value = this._normalizeBrandToken(yaMatch[1]);
      if (value) {
        extracted.signals.push(`brand:${value}`);
        working = working.replace(new RegExp(`\\b(?:ya|bya)\\s+${yaMatch[1]}\\b`, "gi"), " ");
        working = working.replace(new RegExp(`\\b${value}\\b`, "gi"), " ");
        return { value, text: working.replace(/\s+/g, " ").trim() };
      }
    }

    for (const brand of this.brands) {
      const pattern = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(working)) {
        value = brand;
        extracted.signals.push(`brand:${brand}`);
        working = working.replace(pattern, " ");
        break;
      }
    }

    return { value, text: working.replace(/\s+/g, " ").trim() };
  }

  _normalizeBrandToken(token) {
    const cleaned = String(token || "").trim();
    if (!cleaned) return null;
    const match = this.brands.find((brand) => brand.toLowerCase() === cleaned.toLowerCase());
    if (match) return match;
    if (/^[a-z0-9&+\-.]{2,30}$/i.test(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return null;
  }

  _extractCategory(text, language, extracted) {
    let value = null;
    let working = text.toLowerCase();

    for (const [category, aliases] of Object.entries(this.categories)) {
      for (const alias of aliases) {
        const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (pattern.test(working)) {
          value = category;
          extracted.signals.push(`category:${category}`);
          working = working.replace(pattern, " ");
          break;
        }
      }
      if (value) break;
    }

    return { value, text: working.replace(/\s+/g, " ").trim() };
  }

  _extractPagination(options, extracted) {
    const page = Math.max(1, Number.parseInt(options.page, 10) || this.defaultPage);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(options.limit, 10) || this.defaultLimit)
    );
    extracted.signals.push(`page:${page}`, `limit:${limit}`);
    return { page, limit };
  }

  _normalizeKeyword(text, { brand, category } = {}) {
    let keyword = String(text || "")
      .replace(/\b(size|number|no\.?)\s*\d+\b/gi, " ")
      .replace(/\b\d+\s*(gb|tb|mb|kg|cm|mm|inch|inches|")\b/gi, " $1 ")
      .replace(/\s+/g, " ")
      .trim();

    if (brand) {
      keyword = keyword.replace(new RegExp(`\\b${brand}\\b`, "gi"), " ").trim();
    }
    if (category) {
      const aliases = this.categories[category] || [];
      for (const alias of aliases) {
        keyword = keyword.replace(new RegExp(`\\b${alias}\\b`, "gi"), " ").trim();
      }
    }

    keyword = keyword.replace(/\b(black|white|red|blue|green|gold|silver|pink)\b/gi, (color) => color);
    return keyword.replace(/\s+/g, " ").trim();
  }

  refine(previous = {}, message = "", options = {}) {
    const base = {
      ...previous,
      originalQuery: String(message || "").trim(),
      extracted: {
        ...(previous.extracted || {}),
        language: previous.language || "en",
        signals: [...(previous.extracted?.signals || []), "refinement"],
      },
    };

    const language = this._detectLanguage(message);
    base.language = language;
    let working = this._stripFillerWords(message, language);

    const insteadMatch = message.match(
      /(?:show|find|switch to|what about)\s+([a-z0-9&+\-.]{2,30})(?:\s+instead)?/i
    );
    if (insteadMatch) {
      const brand = this._normalizeBrandToken(insteadMatch[1]);
      if (brand) {
        base.brand = brand;
        base.extracted.signals.push(`brand_switch:${brand}`);
      }
    }

    const sort = this._extractSort(working, base.extracted);
    if (sort.value) {
      base.sort = sort.value;
      working = sort.text;
    }

    const prices = this._extractPrices(working, language, base.extracted);
    if (prices.minPrice !== null) base.minPrice = prices.minPrice;
    if (prices.maxPrice !== null) base.maxPrice = prices.maxPrice;
    base.priceMin = base.minPrice;
    base.priceMax = base.maxPrice;
    working = prices.text;

    const availability = this._extractAvailability(working, language, base.extracted);
    if (availability.inStock !== null) base.inStock = availability.inStock;
    working = availability.text;

    const colors = ["black", "white", "red", "blue", "green", "gold", "silver", "pink"];
    for (const color of colors) {
      if (new RegExp(`\\b(only|just)?\\s*${color}\\b`, "i").test(message)) {
        base.extracted.signals.push(`color:${color}`);
        working = `${color} ${working}`.trim();
      }
    }

    const brand = this._extractBrand(working, language, base.extracted);
    if (brand.value) base.brand = brand.value;

    const category = this._extractCategory(working, language, base.extracted);
    if (category.value) base.category = category.value;

    const pagination = this._extractPagination(options, base.extracted);
    base.page = pagination.page;
    base.limit = pagination.limit;

    base.q =
      this._normalizeKeyword(working, { brand: base.brand, category: base.category }) ||
      previous.q ||
      base.category ||
      base.brand;

    return Object.freeze(base);
  }
}

SearchParameterExtractor.DEFAULT_BRANDS = Object.freeze([
  "Samsung",
  "Apple",
  "Nike",
  "Adidas",
  "Dell",
  "HP",
  "Lenovo",
  "Sony",
  "LG",
  "Huawei",
  "Xiaomi",
  "Puma",
  "Canon",
  "Philips",
  "Hisense",
  "Tecno",
  "Infinix",
]);

SearchParameterExtractor.DEFAULT_CATEGORIES = Object.freeze({
  phones: ["phone", "phones", "smartphone", "smartphones", "simu", "telefone"],
  laptops: ["laptop", "laptops", "notebook", "notebooks"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots"],
  tv: ["tv", "tvs", "television", "televisions", "smart tv"],
  electronics: ["electronics", "electronic", "gadget", "gadgets"],
  clothing: ["shirt", "shirts", "dress", "dresses", "clothing", "fashion"],
  furniture: ["furniture", "chair", "chairs", "table", "tables", "sofa"],
  appliances: ["fridge", "refrigerator", "cooker", "microwave", "appliance"],
});

module.exports = SearchParameterExtractor;
