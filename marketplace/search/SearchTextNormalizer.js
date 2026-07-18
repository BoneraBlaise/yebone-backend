/**
 * Search text normalization — unicode, whitespace, token dedupe, regex safety.
 */
class SearchTextNormalizer {
  static escapeRegex(value = "") {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static normalizeText(value, maxLength = 200) {
    if (value === undefined || value === null) return "";
    return String(value)
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, maxLength);
  }

  static normalizeKeyword(value, maxLength = 200) {
    const normalized = SearchTextNormalizer.normalizeText(value, maxLength);
    if (!normalized) return "";

    const tokens = normalized.split(" ").filter(Boolean);
    const unique = [];
    const seen = new Set();

    for (const token of tokens) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(token);
    }

    return unique.join(" ");
  }

  static buildCaseInsensitiveRegex(value, maxLength = 200) {
    const keyword = SearchTextNormalizer.normalizeKeyword(value, maxLength);
    if (!keyword) return null;
    return SearchTextNormalizer.escapeRegex(keyword);
  }
}

module.exports = SearchTextNormalizer;
