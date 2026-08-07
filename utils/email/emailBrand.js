/** Shared YEBONE email branding for auth templates only. */
const BRAND = {
  name: "YEBONE",
  primary: "#29625d",
  accent: "#c9a227",
  text: "#1a1a1a",
  muted: "#6b7280",
  background: "#f8faf9",
};

// TODO: Replace with official YEBONE CDN URL when available.
const FALLBACK_PUBLIC_FRONTEND = "https://bonerablaise.github.io/yebo-marketplace";

function getFrontendBase() {
  return String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
}

function getPublicFrontendBase() {
  const base = getFrontendBase();
  if (!base || /localhost|127\.0\.0\.1/i.test(base)) {
    return FALLBACK_PUBLIC_FRONTEND;
  }
  return base;
}

function getLogoUrl() {
  return `${getPublicFrontendBase()}/logo512.png`;
}

function getShopUrl() {
  const localBase = getFrontendBase();
  if (localBase && !/localhost|127\.0\.0\.1/i.test(localBase)) {
    return `${localBase}/products`;
  }
  return `${FALLBACK_PUBLIC_FRONTEND}/products`;
}

module.exports = {
  BRAND,
  getFrontendBase,
  getPublicFrontendBase,
  getLogoUrl,
  getShopUrl,
};
