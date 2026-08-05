/**
 * One-time migration: property-mobility listings owned by User._id → linked Shop._id
 * Safe to run repeatedly (idempotent for already-migrated records).
 */
const User = require("../../model/user");
const Shop = require("../../model/shop");

async function migrateListingOwners(repository) {
  if (!repository?.listAllListings) return { migrated: 0, skipped: 0 };

  const listings = await repository.listAllListings();
  let migrated = 0;
  let skipped = 0;

  for (const listing of listings) {
    const ownerId = String(listing.ownerId || "");
    if (!ownerId) {
      skipped += 1;
      continue;
    }

    const shop = await Shop.findById(ownerId);
    if (shop) {
      skipped += 1;
      continue;
    }

    const user = await User.findById(ownerId);
    if (!user?.email) {
      skipped += 1;
      continue;
    }

    const linkedShop = await Shop.findOne({ email: user.email });
    if (!linkedShop) {
      skipped += 1;
      continue;
    }

    await repository.updateListingOwnerId(listing.listingId, String(linkedShop._id));
    migrated += 1;
  }

  if (migrated > 0) {
    console.info(`[PropertyMobility] Migrated ${migrated} listing owner IDs to Shop._id`);
  }

  return { migrated, skipped };
}

module.exports = { migrateListingOwners };
