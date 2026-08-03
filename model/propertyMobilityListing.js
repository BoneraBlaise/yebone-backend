const mongoose = require("mongoose");

const propertyMobilityListingSchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    agencyId: { type: String, default: null },
    category: { type: String, required: true, index: true },
    status: { type: String, default: "draft", index: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    photos: { type: [String], default: [] },
    videos: { type: [mongoose.Schema.Types.Mixed], default: [] },
    price: { type: Number, default: 0 },
    location: { type: mongoose.Schema.Types.Mixed, default: {} },
    coordinates: { type: mongoose.Schema.Types.Mixed, default: {} },
    amenities: { type: [String], default: [] },
    documents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ownerInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    homepagePromoted: { type: Boolean, default: false },
    searchBoost: { type: Boolean, default: false },
    sponsored: { type: Boolean, default: false },
    promotionExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PropertyMobilityListing", propertyMobilityListingSchema);
