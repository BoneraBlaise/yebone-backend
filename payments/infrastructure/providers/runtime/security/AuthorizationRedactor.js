const REDACTED = "[REDACTED]";

const AUTHORIZATION_HEADER_NAMES = Object.freeze([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "x-subscription-key",
  "ocp-apim-subscription-key",
  "api-key",
  "subscription-key",
]);

const BEARER_PREFIX = /^bearer\s+/i;
const BASIC_PREFIX = /^basic\s+/i;

/**
 * Centralized authorization and API-key redaction helpers.
 */
class AuthorizationRedactor {
  static redactHeaderValue(name, value) {
    if (value === null || value === undefined) {
      return value;
    }

    const normalized = String(name || "").trim().toLowerCase();
    if (AUTHORIZATION_HEADER_NAMES.includes(normalized)) {
      return REDACTED;
    }

    const stringValue = String(value);
    if (BEARER_PREFIX.test(stringValue) || BASIC_PREFIX.test(stringValue)) {
      return REDACTED;
    }

    return value;
  }

  static redactHeaders(headers = {}) {
    const output = {};
    for (const [key, value] of Object.entries(headers || {})) {
      output[key] = AuthorizationRedactor.redactHeaderValue(key, value);
    }
    return Object.freeze(output);
  }

  static containsAuthorization(value) {
    if (typeof value !== "string") {
      return false;
    }
    return BEARER_PREFIX.test(value) || BASIC_PREFIX.test(value);
  }
}

module.exports = AuthorizationRedactor;
