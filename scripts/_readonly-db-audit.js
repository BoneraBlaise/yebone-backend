/**
 * READ-ONLY MongoDB audit for production cleanup inventory.
 * Usage: node scripts/_readonly-db-audit.js
 * Does NOT modify any data.
 */
const path = require("path");
const fs = require("fs");

const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(rootEnv)) require("dotenv").config({ path: rootEnv });

const mongoose = require("mongoose");

const DEMO_PATTERNS = [
  /\be2e\b/i,
  /unified auth/i,
  /playwright/i,
  /cypress/i,
  /\bdemo\b/i,
  /\bmock\b/i,
  /\btest product\b/i,
  /\btest listing\b/i,
  /\btest house\b/i,
  /\btest car\b/i,
  /\btest event\b/i,
  /\bapi event\b/i,
  /auth pipeline/i,
  /runtime verify/i,
  /\bplaceholder\b/i,
  /\bsample\b/i,
  /\bseed\b/i,
  /\bfake\b/i,
  /\bqa\b/i,
  /\buntitled\b/i,
  /\bexample\b/i,
  /lorem ipsum/i,
  /\bdummy\b/i,
  /vendor test/i,
  /ai test/i,
  /\bdebug\b/i,
  /production test user/i,
  /development test user/i,
  /prod\.test@/i,
  /derick@gmail\.com/i,
];

const SEED_PATTERNS = [
  /prod\.test@yebone\.app/i,
  /seed\//i,
  /seed-/i,
  /production-test-user/i,
  /development-test-user/i,
];

const PROTECTED_EMAILS = new Set(["bonbreizy@gmail.com"]);

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

function classifyDocument(doc, collectionName) {
  const id = String(doc._id);
  const email =
    doc.email ||
    doc.userEmail ||
    doc.buyerEmail ||
    doc.sellerEmail ||
    doc.ownerEmail ||
    null;

  if (email && PROTECTED_EMAILS.has(String(email).toLowerCase().trim())) {
    return { category: "production", reason: "Protected owner account" };
  }

  const haystack = flattenStrings(doc).join(" ").toLowerCase();

  for (const p of SEED_PATTERNS) {
    if (p.test(haystack)) {
      return { category: "seed", reason: `Matched seed pattern: ${p}` };
    }
  }

  for (const p of DEMO_PATTERNS) {
    if (p.test(haystack)) {
      return { category: "demo", reason: `Matched demo pattern: ${p}` };
    }
  }

  if (email === "derick@gmail.com") {
    return { category: "test", reason: "Known development test user email" };
  }

  if (collectionName === "users" && doc.role === "Admin" && email === "bonbreizy@gmail.com") {
    return { category: "production", reason: "Owner admin account" };
  }

  return { category: "unknown", reason: "No demo/E2E/seed markers matched" };
}

function summarizeDoc(doc, collectionName) {
  const { category, reason } = classifyDocument(doc, collectionName);
  const label =
    doc.name ||
    doc.title ||
    doc.email ||
    doc.subject ||
    doc.type ||
    doc.status ||
    "(no label field)";
  return {
    _id: String(doc._id),
    label: String(label).slice(0, 120),
    email: doc.email ? String(doc.email) : undefined,
    createdAt: doc.createdAt || doc.created_at || doc.created || null,
    category,
    reason,
  };
}

async function main() {
  if (!process.env.DB_URL) {
    console.error("DB_URL missing");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .sort();

  const report = {
    auditedAt: new Date().toISOString(),
    database: db.databaseName,
    collectionCount: collections.length,
    collections: {},
    totals: {
      documents: 0,
      production: 0,
      demo: 0,
      test: 0,
      seed: 0,
      unknown: 0,
      proposedForRemoval: 0,
    },
  };

  for (const name of collections) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    const docs = await col.find({}).toArray();

    const bucket = {
      count,
      production: [],
      demo: [],
      test: [],
      seed: [],
      unknown: [],
      proposedForRemoval: [],
    };

    for (const doc of docs) {
      const summary = summarizeDoc(doc, name);
      bucket[summary.category].push(summary);
      if (["demo", "test", "seed"].includes(summary.category)) {
        bucket.proposedForRemoval.push(summary);
        report.totals.proposedForRemoval += 1;
      }
      report.totals[summary.category] += 1;
      report.totals.documents += 1;
    }

    report.collections[name] = bucket;
  }

  const outPath = path.join(__dirname, "_audit-output.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Wrote", outPath);
  console.log("Totals:", JSON.stringify(report.totals));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
