/**
 * Resolve a safe post-OAuth redirect URL (same frontend origin only).
 */
function resolveOAuthRedirect(state) {
  const frontendBase = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const defaultRedirect = `${frontendBase}/login-success`;

  if (!state || !frontendBase) {
    return defaultRedirect;
  }

  try {
    const decoded = decodeURIComponent(String(state));
    if (decoded.startsWith(frontendBase)) {
      return decoded;
    }
  } catch (_) {
    // ignore malformed state
  }

  return defaultRedirect;
}

/**
 * Validate and normalize the redirect target before starting OAuth.
 */
function sanitizeOAuthRedirect(redirect) {
  const frontendBase = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const fallback = `${frontendBase}/login-success`;
  const candidate = String(redirect || fallback).trim();

  if (frontendBase && candidate.startsWith(frontendBase)) {
    return candidate;
  }

  return fallback;
}

module.exports = { resolveOAuthRedirect, sanitizeOAuthRedirect };
