/**
 * Resolve CORS allowed origins for production deployment.
 * Merges static defaults with FRONTEND_URL and optional CORS_ORIGINS env.
 * Does not change marketplace or payment business logic.
 */
function normalizeOrigin(value = "") {
  return String(value).trim().replace(/\/$/, "");
}

function resolveCorsOrigins(env = process.env) {
  const defaults = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
    "https://guriraline.com",
    "https://www.guriraline.com",
    // Live GitHub Pages origin (correct username spelling)
    "https://bonerablaise.github.io",
    "https://www.bonerablaise.github.io",
    // Legacy typo variant kept for safety during migration
    "https://bonerabliaise.github.io",
    "https://www.bonerabliaise.github.io",
  ];

  const fromFrontend = env.FRONTEND_URL
    ? [normalizeOrigin(env.FRONTEND_URL)]
    : [];

  const fromCorsEnv = String(env.CORS_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...defaults, ...fromFrontend, ...fromCorsEnv])];
}

function isOriginAllowed(origin, allowedOrigins) {
  // Allow non-browser clients (curl, health checks, server-to-server)
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
}

module.exports = {
  resolveCorsOrigins,
  isOriginAllowed,
  normalizeOrigin,
};
