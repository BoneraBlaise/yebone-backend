/**
 * One-shot runtime verification for Property & Mobility publish after backend restart.
 * Usage: node scripts/verify-property-mobility-publish.js
 */
const path = require("path");
const fs = require("fs");
const http = require("http");

const rootEnv = path.join(__dirname, "..", ".env");
const configEnv = path.join(__dirname, "..", "config", ".env");
if (fs.existsSync(rootEnv)) require("dotenv").config({ path: rootEnv });
else if (fs.existsSync(configEnv)) require("dotenv").config({ path: configEnv });

const API = "http://127.0.0.1:5000/api/v2";

function request(method, urlPath, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(urlPath.startsWith("http") ? urlPath : `${API}${urlPath}`);
    const headers = {
      Accept: "application/json",
      ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json = raw;
          try {
            json = JSON.parse(raw || "{}");
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, body: json, raw });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function resolveToken() {
  const email = process.env.E2E_BUYER_EMAIL || process.env.VERIFY_PM_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD || process.env.VERIFY_PM_PASSWORD;

  if (email && password) {
    const login = await request("POST", "/user/login-user", {
      body: { email, password },
    });
    if (login.status === 201 || login.status === 200) {
      return {
        token: login.body.token,
        source: "login-user",
        userId: login.body.user?._id,
        email,
      };
    }
    throw new Error(`login-user failed (${login.status}): ${JSON.stringify(login.body)}`);
  }

  const mongoose = require("mongoose");
  const User = require("../model/user");
  await mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const user = await User.findOne();
  if (!user) throw new Error("No users in MongoDB and no VERIFY_PM_EMAIL/VERIFY_PM_PASSWORD set");
  const token = user.getJwtToken();
  return {
    token,
    source: "mongodb-getJwtToken",
    userId: String(user._id),
    email: user.email,
  };
}

async function main() {
  console.log("=== Step 4: Unauthenticated fingerprint (authenticateUserOrSeller) ===");
  const unauth = await request("POST", "/marketplace/property-mobility/owner/listings", {
    body: { title: "probe" },
  });
  console.log("STATUS:", unauth.status);
  console.log("BODY:", JSON.stringify(unauth.body));
  const hasMessage = Boolean(unauth.body?.message);
  console.log("authenticateUserOrSeller fingerprint (message field):", hasMessage ? "YES" : "NO");

  console.log("\n=== Step 6: Authenticated publish ===");
  const auth = await resolveToken();
  console.log("Authorization header present: YES");
  console.log("Token source:", auth.source);
  console.log("Account email:", auth.email);
  console.log("Token preview:", `${auth.token.slice(0, 16)}…`);

  const payload = {
    category: "apartments",
    title: `Runtime verify ${Date.now()}`,
    description: "Automated runtime verification listing publish test.",
    price: 250000,
    publish: true,
    location: { city: "Kigali", district: "Gasabo", street: "KG 1", mapsUrl: "" },
    coordinates: {},
    photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
    videos: [],
    amenities: ["Parking"],
    ownerInfo: { listingType: "for_sale", priceType: "one_time", currency: "RWF" },
  };

  console.log("Request body:", JSON.stringify(payload, null, 2));

  const publish = await request("POST", "/marketplace/property-mobility/owner/listings", {
    token: auth.token,
    body: payload,
  });

  console.log("\nHTTP response code:", publish.status);
  console.log("Response body:", JSON.stringify(publish.body, null, 2));

  if (publish.status >= 400) {
    console.log("\n=== FIRST FAILURE ===");
    console.log("function: POST /marketplace/property-mobility/owner/listings");
    console.log("request body:", JSON.stringify(payload));
    console.log("response body:", JSON.stringify(publish.body));
    process.exit(1);
  }

  const listingId = publish.body?.data?.listingId;
  console.log("\nCreated listing ID:", listingId || "(missing in response)");
  console.log("Publish runtime verification: SUCCESS");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n=== FIRST FAILURE ===");
  console.error("error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
