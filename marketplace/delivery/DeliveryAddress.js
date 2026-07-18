/**
 * Structured delivery address helpers.
 */
class DeliveryAddress {
  static REQUIRED_FIELDS = Object.freeze([
    "country",
    "province",
    "district",
    "sector",
    "cell",
    "village",
    "street",
  ]);

  static normalize(input = {}) {
    if (!input || typeof input !== "object") return null;

    const address = {
      country: DeliveryAddress._clean(input.country),
      province: DeliveryAddress._clean(input.province),
      district: DeliveryAddress._clean(input.district),
      sector: DeliveryAddress._clean(input.sector),
      cell: DeliveryAddress._clean(input.cell),
      village: DeliveryAddress._clean(input.village),
      street: DeliveryAddress._clean(input.street),
      referenceNote: DeliveryAddress._clean(input.referenceNote),
      latitude: DeliveryAddress._optionalNumber(input.latitude),
      longitude: DeliveryAddress._optionalNumber(input.longitude),
    };

    return address;
  }

  static validate(address) {
    const normalized = DeliveryAddress.normalize(address);
    if (!normalized) {
      return { valid: false, fields: DeliveryAddress.REQUIRED_FIELDS };
    }

    const missing = DeliveryAddress.REQUIRED_FIELDS.filter((field) => !normalized[field]);
    if (missing.length) {
      return { valid: false, fields: missing };
    }

    if (
      (normalized.latitude !== null && normalized.longitude === null) ||
      (normalized.latitude === null && normalized.longitude !== null)
    ) {
      return { valid: false, fields: ["latitude", "longitude"], reason: "COORDINATE_PAIR_REQUIRED" };
    }

    return { valid: true, address: normalized };
  }

  static _clean(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  static _optionalNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
}

module.exports = DeliveryAddress;
