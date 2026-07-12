const EnvironmentSchema = require("./EnvironmentSchema");

/**
 * Validates environment variables with profile-aware rules.
 */
class EnvironmentValidator {
  constructor(schema = EnvironmentSchema.create()) {
    this.schema = schema;
  }

  validate(loader, profile = "production") {
    const missing = [];
    const placeholders = [];
    const warnings = [];

    for (const entry of this.schema.all()) {
      const value = loader.get(entry.key);
      const isEmpty = value === undefined || value === null || String(value).trim() === "";

      if (isEmpty) {
        if (entry.required && this._isStrictProfile(profile)) {
          missing.push({ key: entry.key, description: entry.description });
        } else if (entry.defaultValue) {
          loader.set(entry.key, entry.defaultValue);
        } else if (entry.placeholder && !this._isStrictProfile(profile)) {
          loader.set(entry.key, entry.placeholder);
          placeholders.push(entry.key);
        } else if (entry.required && !this._isStrictProfile(profile)) {
          loader.set(entry.key, entry.placeholder || "placeholder");
          placeholders.push(entry.key);
        }
        continue;
      }

      if (entry.placeholder && String(value) === entry.placeholder && this._isStrictProfile(profile)) {
        placeholders.push(entry.key);
      }
    }

    if (profile === "production" && placeholders.length > 0) {
      warnings.push({
        type: "placeholder_in_production",
        keys: placeholders,
      });
    }

    return {
      valid: missing.length === 0,
      missing,
      placeholders,
      warnings,
      profile,
    };
  }

  assertValid(loader, profile = "production") {
    const result = this.validate(loader, profile);
    if (!result.valid) {
      const lines = result.missing.map(
        (m) => `  - ${m.key}: ${m.description}`
      );
      const error = new Error(
        `Startup failed: missing required environment variables.\n${lines.join("\n")}`
      );
      error.name = "EnvironmentValidationError";
      error.details = result;
      throw error;
    }
    return result;
  }

  _isStrictProfile(profile) {
    return profile === "production" || profile === "staging";
  }
}

module.exports = EnvironmentValidator;
