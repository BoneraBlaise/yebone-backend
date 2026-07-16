const AuditSanitizer = require("../../../audit/AuditSanitizer");
const AuthorizationRedactor = require("./AuthorizationRedactor");

const REDACTED = "[REDACTED]";

const CREDENTIAL_FIELD_NAMES = Object.freeze([
  "subscriptionkey",
  "apikey",
  "apiuser",
  "clientsecret",
  "clientid",
  "password",
  "webhooksecret",
  "signingsecret",
  "secret",
  "token",
  "accesstoken",
  "bearertoken",
]);

/**
 * Reusable secret redaction for headers, env, credentials, errors, and diagnostics.
 */
class SecretRedactor {
  static redact(value, depth = 0) {
    if (value === null || value === undefined) {
      return value;
    }

    if (depth > 5) {
      return "[TRUNCATED_DEPTH]";
    }

    if (Array.isArray(value)) {
      return value.map((item) => SecretRedactor.redact(item, depth + 1));
    }

    if (typeof value !== "object") {
      if (typeof value === "string" && AuthorizationRedactor.containsAuthorization(value)) {
        return REDACTED;
      }
      return AuditSanitizer.sanitize(value, depth);
    }

    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SecretRedactor._isSensitiveKey(key)) {
        output[key] = REDACTED;
        continue;
      }
      output[key] = SecretRedactor.redact(nested, depth + 1);
    }
    return output;
  }

  static redactHeaders(headers = {}) {
    return AuthorizationRedactor.redactHeaders(headers);
  }

  static redactEnvironment(env = {}) {
    const output = {};
    for (const [key, value] of Object.entries(env || {})) {
      if (SecretRedactor._isSensitiveEnvKey(key)) {
        output[key] = REDACTED;
        continue;
      }
      output[key] = value;
    }
    return Object.freeze(output);
  }

  static redactCredentials(credentials = {}) {
    const output = {};
    for (const [key, value] of Object.entries(credentials || {})) {
      if (SecretRedactor._isCredentialField(key)) {
        output[key] = value === null || value === undefined ? value : REDACTED;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        output[key] = SecretRedactor.redactCredentials(value);
        continue;
      }
      output[key] = value;
    }
    return Object.freeze(output);
  }

  static redactErrorPayload(error = {}) {
    const sanitized = SecretRedactor.redact({
      message: error.message,
      code: error.code,
      providerCode: error.providerCode,
      operation: error.operation,
      details: error.details,
      headers: error.headers,
      credentials: error.credentials,
    });
    if (sanitized.details?.headers) {
      sanitized.details.headers = SecretRedactor.redactHeaders(sanitized.details.headers);
    }
    return Object.freeze(sanitized);
  }

  static redactDiagnostics(diagnostics = {}) {
    const output = SecretRedactor.redact({
      correlationId: diagnostics.correlationId,
      executionId: diagnostics.executionId,
      counters: diagnostics.counters,
      executionDecision: diagnostics.executionDecision,
      executionTimeline: diagnostics.executionTimeline,
      metadata: diagnostics.metadata,
    });
    return Object.freeze(output);
  }

  static _isSensitiveEnvKey(key) {
    const normalized = String(key || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (CREDENTIAL_FIELD_NAMES.some((field) => normalized.includes(field))) {
      return true;
    }
    return (
      normalized.includes("password") ||
      normalized.includes("secret") ||
      normalized.includes("token") ||
      normalized.includes("apikey") ||
      normalized.includes("subscription")
    );
  }

  static _isCredentialField(key) {
    return SecretRedactor._isSensitiveKey(key);
  }

  static _isSensitiveKey(key) {
    const normalized = String(key || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (AuditSanitizer.isForbiddenKey(key)) {
      return true;
    }
    if (CREDENTIAL_FIELD_NAMES.includes(normalized)) {
      return true;
    }
    return (
      normalized.includes("password") ||
      normalized.includes("secret") ||
      normalized.includes("token") ||
      normalized.includes("apikey") ||
      normalized.includes("subscription")
    );
  }
}

module.exports = SecretRedactor;
