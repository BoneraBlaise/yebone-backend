const { LISTING_CATEGORIES } = require("./PropertyMobilitySettingsDefaults");

const isValidMapsUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const validateCreateListingPayload = (body = {}) => {
  const errors = [];

  if (!body.category) {
    errors.push({ field: "category", message: "Category is required." });
  } else if (!LISTING_CATEGORIES.includes(body.category)) {
    errors.push({ field: "category", message: `Invalid category: ${body.category}.` });
  }

  if (!body.title?.trim()) {
    errors.push({ field: "title", message: "Title is required." });
  }

  const description = String(body.description || "").trim();
  if (!description) {
    errors.push({ field: "description", message: "Description is required." });
  } else if (description.length < 10) {
    errors.push({ field: "description", message: "Description is too short." });
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.push({ field: "price", message: "Enter a valid price." });
  }

  if (!body.location?.city?.trim()) {
    errors.push({ field: "city", message: "City is required." });
  }

  const mapsUrl = body.location?.mapsUrl?.trim();
  if (mapsUrl && !isValidMapsUrl(mapsUrl)) {
    errors.push({ field: "mapsUrl", message: "Google Maps URL is invalid." });
  }

  if (!Array.isArray(body.photos) || body.photos.length < 1) {
    errors.push({ field: "photos", message: "Please upload at least one photo." });
  }

  return errors;
};

module.exports = { validateCreateListingPayload, isValidMapsUrl };
