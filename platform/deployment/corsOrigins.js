/**
 * Resolve CORS allowed origins for production deployment.
 * Merges static defaults with FRONTEND_URL and optional CORS_ORIGINS env.
 * Does not change marketplace or payment business logic.
 */
function resolveCorsOrigins(env = process.env) {
  const defaults = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
    "https://guriraline.com",
    "https://www.guriraline.com",
    "https://bonerabliaise.github.io",
  ];

  const fromFrontend = env.FRONTEND_URL
    ? [String(env.FRONTEND_URL).replace(/\/$/, "")]
    : [];

  const fromCorsEnv = String(env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return [...new Set([...defaults, ...fromFrontend, ...fromCorsEnv])];
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

module.exports = {
  resolveCorsOrigins,
  isOriginAllowed,
};
