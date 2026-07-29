const HIDDEN_PROVIDERS =
  /gemini|openrouter|openai|anthropic|replicate|google|gpt|claude|fashn|fashionprovider|groq/i;

const YEBO_AI_BRAND = "YEBO AI";

function sanitizeString(value) {
  if (value == null) return value;
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value;
  if (typeof value === "string" && HIDDEN_PROVIDERS.test(value)) return YEBO_AI_BRAND;
  return value;
}

function maskProviderPayload(payload = {}) {
  if (payload == null || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map((item) => maskProviderPayload(item));

  const masked = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "providerId" || key === "provider" || key === "providerCategory") {
      continue;
    }
    if (key === "predictionId" || key === "fallbackReason" || key === "fallbackUsed") {
      continue;
    }
    if (key === "providers" && typeof value === "object") {
      masked[key] = { yebo_ai: { status: "active", displayBrand: YEBO_AI_BRAND } };
      continue;
    }
    if (typeof value === "string") {
      masked[key] = sanitizeString(value);
    } else if (typeof value === "object") {
      masked[key] = maskProviderPayload(value);
    } else {
      masked[key] = value;
    }
  }

  masked.displayBrand = YEBO_AI_BRAND;
  masked.poweredBy = YEBO_AI_BRAND;
  return masked;
}

function maskForVendor(payload = {}) {
  return maskProviderPayload(payload);
}

function maskForCustomer(payload = {}) {
  return maskProviderPayload(payload);
}

function maskForAdmin(payload = {}) {
  return payload;
}

module.exports = {
  YEBO_AI_BRAND,
  sanitizeString,
  maskProviderPayload,
  maskForVendor,
  maskForCustomer,
  maskForAdmin,
};
