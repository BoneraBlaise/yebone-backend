const LISTING_CATEGORIES = Object.freeze([
  "apartments",
  "houses",
  "land",
  "cars",
  "commercial_property",
]);

const PROPERTY_CATEGORIES = Object.freeze(["apartments", "houses", "land", "commercial_property"]);
const VEHICLE_CATEGORIES = Object.freeze(["cars"]);

const LISTING_STATUSES = Object.freeze([
  "draft",
  "pending_review",
  "published",
  "paused",
  "rejected",
  "suspended",
  "deleted",
]);

const AGENCY_TYPES = Object.freeze(["real_estate_agency", "car_dealer"]);

const OFFER_STATUSES = Object.freeze(["pending", "accepted", "rejected", "expired"]);
const OFFER_TYPES = Object.freeze(["contact", "appointment", "offer"]);

const REPORT_REASONS = Object.freeze([
  "fake_listing",
  "already_sold",
  "already_rented",
  "wrong_location",
  "spam",
  "duplicate",
]);

const REPORT_STATUSES = Object.freeze(["pending", "reviewed", "dismissed", "action_taken"]);

const PROMOTION_TYPES = Object.freeze(["featured", "homepage", "search_boost", "sponsored"]);

const DEFAULT_PRICING = Object.freeze({
  verifiedBadgePrice: 10000,
  verificationDurationDays: 60,
  featuredPrice: 15000,
  homepagePromotionPrice: 25000,
  searchBoostPrice: 12000,
  sponsoredPrice: 18000,
  agencySubscriptionPrice: 50000,
  promotionDurationDays: 30,
});

const PropertyMobilitySettingsDefaults = Object.freeze({
  listings: { enabled: true },
  search: { enabled: true },
  promotions: { enabled: true },
  verification: { enabled: true },
  agencies: { enabled: true },
  communication: { enabled: true },
  offers: { enabled: true },
  reports: { enabled: true },
  moderation: { enabled: true },
  pricing: { enabled: true, ...DEFAULT_PRICING },
});

module.exports = {
  PropertyMobilitySettingsDefaults,
  LISTING_CATEGORIES,
  PROPERTY_CATEGORIES,
  VEHICLE_CATEGORIES,
  LISTING_STATUSES,
  AGENCY_TYPES,
  OFFER_STATUSES,
  OFFER_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
  PROMOTION_TYPES,
  DEFAULT_PRICING,
};
