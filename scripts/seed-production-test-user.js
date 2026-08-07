/**
 * Seed a non-production test user in MongoDB (development / staging only).
 *
 * Usage:
 *   SEED_ALLOW=true SEED_TEST_EMAIL=... SEED_TEST_PASSWORD=... node scripts/seed-production-test-user.js
 *
 * Requires DB_URL in .env. Refuses to run when NODE_ENV=production or SEED_ALLOW is not set.
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

function requireSeedConfig() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed users when NODE_ENV=production.");
    process.exit(1);
  }
  if (process.env.SEED_ALLOW !== "true") {
    console.error(
      "Refusing to seed without SEED_ALLOW=true. This script is for local/staging only."
    );
    process.exit(1);
  }
  const email = process.env.SEED_TEST_EMAIL;
  const password = process.env.SEED_TEST_PASSWORD;
  if (!email || !password) {
    console.error("SEED_TEST_EMAIL and SEED_TEST_PASSWORD must both be set.");
    process.exit(1);
  }
  return {
    name: process.env.SEED_TEST_NAME || "Development Test User",
    email: normalizeEmail(email),
    password,
    avatar: {
      public_id: "seed/development-test-user",
      url:
        process.env.SEED_TEST_AVATAR_URL ||
        "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    },
  };
}

async function main() {
  const testUser = requireSeedConfig();

  if (!process.env.DB_URL) {
    console.error("DB_URL is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  let user = await User.findOne({ email: testUser.email }).select("+password");

  if (user) {
    console.log("Test user already exists:", testUser.email);
  } else {
    user = await User.create(testUser);
    console.log("Created test user:", testUser.email);
  }

  const loginCheck = await User.findOne({ email: testUser.email }).select("+password");
  const passwordOk = await loginCheck.comparePassword(testUser.password);
  console.log("login query match:", Boolean(loginCheck));
  console.log("password valid:", passwordOk);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
