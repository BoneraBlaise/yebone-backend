/**
 * READ-ONLY production verification — post database cleanup.
 * Does NOT modify any data.
 */
const path = require("path");
const fs = require("fs");

const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(rootEnv)) require("dotenv").config({ path: rootEnv });

const mongoose = require("mongoose");

const PROTECTED = {
  users: ["bonbreizy@gmail.com", "derick@gmail.com"],
  shopName: /yebone/i,
  radissonId: "6a71af9e585c5be8290f6c2d",
  expectedProducts: 14,
};

async function main() {
  const uri = process.env.DB_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const results = {};

  const users = await db.collection("users").find({}).toArray();
  results.users = {
    count: users.length,
    emails: users.map((u) => u.email),
    bonbreizyExists: users.some((u) => u.email === "bonbreizy@gmail.com"),
    derickExists: users.some((u) => u.email === "derick@gmail.com"),
  };

  const shops = await db.collection("shops").find({}).toArray();
  results.shops = {
    count: shops.length,
    names: shops.map((s) => s.name || s.shopName),
    yeboneExists: shops.some((s) => PROTECTED.shopName.test(String(s.name || s.shopName || ""))),
  };

  const products = await db.collection("products").find({}).toArray();
  const e2eProducts = products.filter((p) => /\be2e\b|playwright|demo|test product/i.test(JSON.stringify(p)));
  results.products = {
    count: products.length,
    expected: PROTECTED.expectedProducts,
    match: products.length === PROTECTED.expectedProducts,
    e2eRemaining: e2eProducts.length,
    titles: products.map((p) => p.name || p.title).slice(0, 20),
  };

  const conversations = await db.collection("conversations").countDocuments();
  const messages = await db.collection("messages").countDocuments();
  const notifications = await db.collection("notifications").countDocuments();
  results.communication = { conversations, messages, notifications };

  const categories = await db.collection("categories").countDocuments().catch(() => -1);
  results.categories = { count: categories };

  const listings = await db.collection("propertymobilitylistings").find({}).toArray();
  results.propertyListings = {
    count: listings.length,
    radissonExists: listings.some((l) => String(l._id) === PROTECTED.radissonId),
    radissonTitle: listings.find((l) => String(l._id) === PROTECTED.radissonId)?.title || listings.find((l) => String(l._id) === PROTECTED.radissonId)?.name,
    titles: listings.map((l) => l.title || l.name),
  };

  const events = await db.collection("events").countDocuments();
  results.events = { count: events };

  const demoPatterns = /\be2e\b|playwright|cypress|runtime verify|auth pipeline/i;
  const remainingDemo = [];
  for (const coll of ["products", "events", "propertymobilitylistings", "messages", "notifications", "conversations"]) {
    const docs = await db.collection(coll).find({}).limit(200).toArray();
    for (const d of docs) {
      if (demoPatterns.test(JSON.stringify(d))) remainingDemo.push({ collection: coll, id: String(d._id) });
    }
  }
  results.demoArtifactsRemaining = remainingDemo;

  console.log(JSON.stringify(results, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
