/**
 * APPROVED CUSTOM database cleanup — 2026-08-06
 * Usage: node scripts/execute-database-cleanup-custom.js
 */
const path = require("path");
const fs = require("fs");

const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(rootEnv)) require("dotenv").config({ path: rootEnv });

const mongoose = require("mongoose");

const PROTECTED_USER_IDS = new Set([
  "6a569862a85d5895dc95c1f9", // bonbreizy@gmail.com
  "6a6660d4b7c2b17054691302", // derick@gmail.com
]);
const PROTECTED_SHOP_IDS = new Set(["6a64e98ddcdc9f592fe0d774"]); // YEBONE
const KEEP_RADISSON_LISTING_ID = "6a71af9e585c5be8290f6c2d";

const DELETE_PRODUCT_IDS = [
  "6a71f349fa0d619d26683dc3",
  "6a72003afa0d619d26684147",
  "6a7200bbfa0d619d26684255",
  "6a72019ffa0d619d266843a8",
  "6a720294fa0d619d26684504",
  "6a720542fa0d619d26684640",
  "6a720610fa0d619d266847df",
  "6a721614fa0d619d26684a4e",
  "6a743994853efe2c0b53bd5f",
];

const DELETE_EVENT_IDS = [
  "6a71f34bfa0d619d26683dd4",
  "6a720626fa0d619d266848c1",
  "6a721631fa0d619d26684b31",
];

const DELETE_LISTING_IDS = [
  "6a6fbcbfbf73d96ca16bdc03",
  "6a71aaf2585c5be8290f6b3d",
  "6a71f349fa0d619d26683dc8",
  "6a71f34afa0d619d26683dce",
  "6a7200c3fa0d619d266842b5",
  "6a7201a7fa0d619d26684409",
  "6a72054bfa0d619d266846a7",
  "6a720553fa0d619d266846e3",
  "6a720618fa0d619d2668484e",
  "6a720620fa0d619d2668488b",
  "6a72161ffa0d619d26684abc",
  "6a72162afa0d619d26684afb",
  "6a723d4efa0d619d26684eec",
  "6a6fc026bf73d96ca16bdc8c", // duplicate Radisson
  "6a7219dcfa0d619d26684b76", // duplicate Radisson typo
];

const DELETE_CONVERSATION_IDS = ["6a73a0a1b1cbb895c4b9b70a"];

const DELETE_MESSAGE_IDS = [
  "6a6cdf0985db846625202099",
  "6a6cf33e1ddeaea0f666ed41",
  "6a6f03a9eb55860c457e436b",
  "6a73a0a4b1cbb895c4b9b70d",
  "6a73a2eeb1cbb895c4b9b758",
  "6a73acd0b1cbb895c4b9b920",
];

const DELETE_NOTIFICATION_IDS = [
  "6a6cdf0985db8466252020b5",
  "6a6cf33e1ddeaea0f666ed45",
  "6a6f03aaeb55860c457e436f",
  "6a73a0a6b1cbb895c4b9b711",
  "6a73a2f0b1cbb895c4b9b75c",
  "6a73acd2b1cbb895c4b9b924",
];

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

function flattenStrings(obj, out = []) {
  if (obj == null) return out;
  if (typeof obj === "string") {
    out.push(obj);
    return out;
  }
  if (typeof obj === "number" || typeof obj === "boolean") return out;
  if (Array.isArray(obj)) {
    obj.forEach((v) => flattenStrings(v, out));
    return out;
  }
  if (typeof obj === "object") {
    Object.values(obj).forEach((v) => flattenStrings(v, out));
  }
  return out;
}

function isDemoPlatformAudit(doc) {
  const haystack = flattenStrings(doc).join(" ").toLowerCase();
  if (doc?.newValue?.providerId === "mock") return true;
  if (/runtime verify/i.test(haystack)) return true;
  if (/\be2e\b/i.test(haystack)) return true;
  if (/unified auth/i.test(haystack)) return true;
  if (/visual audit test/i.test(haystack)) return true;
  if (/auth pipeline test/i.test(haystack)) return true;
  if (/\btest house\b/i.test(haystack)) return true;
  if (/\btest car\b/i.test(haystack)) return true;
  return false;
}

function isDemoProductName(name = "") {
  return /^(E2E|Runtime verify|Visual Audit Test|Auth pipeline test)/i.test(String(name).trim());
}

async function countAll(db) {
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const counts = {};
  let total = 0;
  for (const name of cols) {
    const n = await db.collection(name).countDocuments();
    counts[name] = n;
    total += n;
  }
  return { collections: cols, counts, total };
}

async function deleteByIds(db, collection, ids, log) {
  if (!ids.length) return 0;
  const result = await db.collection(collection).deleteMany({
    _id: { $in: ids.map(oid) },
  });
  ids.forEach((id) =>
    log.deleted.push({ collection, _id: id, reason: "explicit approved ID" })
  );
  return result.deletedCount;
}

async function main() {
  if (!process.env.DB_URL) {
    console.error("DB_URL missing");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  const db = mongoose.connection.db;

  const report = {
    executedAt: new Date().toISOString(),
    mode: "APPROVE DATABASE CLEANUP (CUSTOM)",
    before: await countAll(db),
    deleted: [],
    preserved: [],
    after: null,
    verification: {},
    errors: [],
  };

  // Safety: verify protected records exist before delete
  for (const id of PROTECTED_USER_IDS) {
    const u = await db.collection("users").findOne({ _id: oid(id) });
    if (!u) report.errors.push(`Protected user missing before cleanup: ${id}`);
  }
  for (const id of PROTECTED_SHOP_IDS) {
    const s = await db.collection("shops").findOne({ _id: oid(id) });
    if (!s) report.errors.push(`Protected shop missing before cleanup: ${id}`);
  }

  let deleted = 0;
  deleted += await deleteByIds(db, "products", DELETE_PRODUCT_IDS, report);
  deleted += await deleteByIds(db, "events", DELETE_EVENT_IDS, report);
  deleted += await deleteByIds(db, "propertymobilitylistings", DELETE_LISTING_IDS, report);
  deleted += await deleteByIds(db, "conversations", DELETE_CONVERSATION_IDS, report);
  deleted += await deleteByIds(db, "messages", DELETE_MESSAGE_IDS, report);
  deleted += await deleteByIds(db, "notifications", DELETE_NOTIFICATION_IDS, report);

  // Orphan messages tied to deleted E2E conversation
  const orphanMsgs = await db
    .collection("messages")
    .find({ conversationId: oid("6a73a0a1b1cbb895c4b9b70a") })
    .toArray();
  if (orphanMsgs.length) {
    const orphanIds = orphanMsgs.map((m) => String(m._id));
    deleted += await deleteByIds(db, "messages", orphanIds, report);
  }

  // Platform audits — demo/runtime verify/mock only
  const audits = await db.collection("platformaudits").find({}).toArray();
  const auditDeleteIds = audits
    .filter(isDemoPlatformAudit)
    .map((d) => String(d._id));
  deleted += await deleteByIds(db, "platformaudits", auditDeleteIds, report);

  // Guard: never deleted protected
  report.preserved = [
    { collection: "users", _id: "6a569862a85d5895dc95c1f9", email: "bonbreizy@gmail.com" },
    { collection: "users", _id: "6a6660d4b7c2b17054691302", email: "derick@gmail.com" },
    { collection: "shops", _id: "6a64e98ddcdc9f592fe0d774", name: "YEBONE" },
    {
      collection: "propertymobilitylistings",
      _id: KEEP_RADISSON_LISTING_ID,
      title: "Radisson blu hotel (primary kept)",
    },
  ];

  report.after = await countAll(db);
  report.totalDeleted = deleted;

  // Verification
  const bon = await db.collection("users").findOne({ email: "bonbreizy@gmail.com" });
  const derick = await db.collection("users").findOne({ email: "derick@gmail.com" });
  const shop = await db.collection("shops").findOne({ email: "bonbreizy@gmail.com", name: "YEBONE" });
  const radisson = await db.collection("propertymobilitylistings").findOne({ _id: oid(KEEP_RADISSON_LISTING_ID) });
  const remainingProducts = await db.collection("products").find({}).toArray();
  const demoProductsLeft = remainingProducts.filter((p) => isDemoProductName(p.name));
  const remainingListings = await db.collection("propertymobilitylistings").find({}).toArray();
  const demoListingsLeft = remainingListings.filter((p) =>
    /^(E2E|Runtime verify|Visual Audit Test)/i.test(String(p.title || ""))
  );
  const remainingEvents = await db.collection("events").find({}).toArray();
  const demoEventsLeft = remainingEvents.filter((e) => /E2E/i.test(String(e.name || "")));

  report.verification = {
    bonbreizyExists: Boolean(bon),
    derickExists: Boolean(derick),
    yeboneShopExists: Boolean(shop),
    radissonPrimaryKept: Boolean(radisson),
    realProductCount: remainingProducts.length,
    demoProductsRemaining: demoProductsLeft.map((p) => ({ _id: String(p._id), name: p.name })),
    demoListingsRemaining: demoListingsLeft.map((p) => ({ _id: String(p._id), title: p.title })),
    demoEventsRemaining: demoEventsLeft.map((e) => ({ _id: String(e._id), name: e.name })),
    remainingE2EMessages: (
      await db
        .collection("messages")
        .find({ $or: [{ text: /runtime verify/i }, { message: /runtime verify/i }] })
        .toArray()
    ).map((m) => String(m._id)),
  };

  const outPath = path.join(__dirname, "_cleanup-result.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ totalDeleted: deleted, verification: report.verification }, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
