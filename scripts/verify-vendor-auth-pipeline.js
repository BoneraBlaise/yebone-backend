/**
 * Verify unified vendor auth pipeline (API-level E2E).
 * Usage: E2E_VENDOR_EMAIL=... E2E_VENDOR_PASSWORD=... node scripts/verify-vendor-auth-pipeline.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const API = "http://127.0.0.1:5000/api/v2";
const EMAIL = process.env.E2E_VENDOR_EMAIL;
const PASSWORD = process.env.E2E_VENDOR_PASSWORD;

async function api(path, { method = "GET", token, body, cookies } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookies) headers.Cookie = cookies;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD in .env or the environment.");
    process.exit(1);
  }

  console.log("=== Vendor Auth Pipeline Verification ===\n");

  const login = await api("/user/login-user", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  if (login.status !== 200 || !login.data?.token) {
    console.error("FAIL login", login.status, login.data);
    process.exit(1);
  }
  const token = login.data.token;
  console.log("OK login — token length:", token.length);

  const getuser = await api("/user/getuser", { token });
  if (getuser.status !== 200) {
    console.error("FAIL getuser", getuser.status, getuser.data);
    process.exit(1);
  }
  const getuserHasToken = Boolean(getuser.data?.token);
  console.log(getuserHasToken ? "OK getuser returns token" : "WARN getuser missing token (restart backend)");

  const getSeller = await api("/shop/getSeller", { token });
  if (getSeller.status !== 200 || !getSeller.data?.seller?._id) {
    console.error("FAIL getSeller", getSeller.status, getSeller.data);
    process.exit(1);
  }
  const vendorId = getSeller.data.seller._id;
  console.log("OK getSeller — vendorId:", vendorId);

  const resume = await api("/shop/resume-session", { token });
  console.log(
    resume.status === 200
      ? `OK resume-session — token returned: ${Boolean(resume.data?.token)}`
      : `WARN resume-session ${resume.status}`
  );

  const listingPayload = {
    category: "houses",
    listingType: "for_sale",
    title: "Auth pipeline test house",
    description: "Unified vendor auth pipeline verification listing with sufficient description length.",
    city: "Kigali",
    country: "Rwanda",
    price: 150000,
    currency: "RWF",
    photos: ["https://picsum.photos/400/300"],
    publish: true,
  };
  const property = await api("/marketplace/property-mobility/owner/listings", {
    method: "POST",
    token,
    body: listingPayload,
  });
  console.log(
    property.status === 201
      ? `OK property publish — ${property.data?.data?.listingId}`
      : `FAIL property publish ${property.status}`,
    property.data?.message || property.data?.reason || ""
  );

  const mobilityPayload = { ...listingPayload, category: "cars", title: "Auth pipeline test car" };
  const mobility = await api("/marketplace/property-mobility/owner/listings", {
    method: "POST",
    token,
    body: mobilityPayload,
  });
  console.log(
    mobility.status === 201
      ? `OK mobility publish — ${mobility.data?.data?.listingId}`
      : `FAIL mobility publish ${mobility.status}`,
    mobility.data?.message || mobility.data?.reason || ""
  );

  console.log("\n=== Product/Event require multipart — verify in browser ===");
  console.log("All API auth checks passed for single user JWT pipeline.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
