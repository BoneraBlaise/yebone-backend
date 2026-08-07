/** Shared YEBONE email branding for auth templates only. */
const BRAND = {
  name: "YEBONE",
  primary: "#29625d",
  accent: "#c9a227",
  text: "#1a1a1a",
  muted: "#6b7280",
  background: "#f8faf9",
};

function getFrontendBase() {
  return String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
}

function getLogoUrl() {
  return `${getFrontendBase()}/logo512.png`;
}

function getShopUrl() {
  return `${getFrontendBase()}/products`;
}

module.exports = { BRAND, getFrontendBase, getLogoUrl, getShopUrl };
