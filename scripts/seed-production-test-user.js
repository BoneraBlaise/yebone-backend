/**
 * Seed or verify a production test user in MongoDB.
 * Usage: node scripts/seed-production-test-user.js
 * Requires DB_URL in .env (same Atlas cluster as Render).
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const User = require("../model/user");
const normalizeEmail = require("../utils/normalizeEmail");

const TEST_USER = {
  name: "Production Test User",
  email: normalizeEmail(
    process.env.SEED_TEST_EMAIL || "prod.test@yebone.app"
  ),
  password: process.env.SEED_TEST_PASSWORD || "YeboneTest2026!",
  avatar: {
    public_id: "seed/production-test-user",
    url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
  },
};

async function main() {
  if (!process.env.DB_URL) {
    console.error("DB_URL is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const totalUsers = await User.countDocuments();
  const indexes = await User.collection.indexes();
  console.log("users collection count:", totalUsers);
  console.log(
    "indexes:",
    indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique }))
  );

  let user = await User.findOne({ email: TEST_USER.email }).select("+password");

  if (user) {
    console.log("Test user already exists:", TEST_USER.email);
  } else {
    user = await User.create(TEST_USER);
    console.log("Created test user:", TEST_USER.email);
  }

  const loginCheck = await User.findOne({ email: TEST_USER.email }).select(
    "+password"
  );
  const passwordOk = await loginCheck.comparePassword(TEST_USER.password);
  console.log("login query match:", Boolean(loginCheck));
  console.log("password valid:", passwordOk);
  console.log("--- credentials for production login ---");
  console.log("email:", TEST_USER.email);
  console.log("password:", TEST_USER.password);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
