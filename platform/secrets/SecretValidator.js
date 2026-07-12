class SecretValidator {
  constructor({ requiredKeys = [] } = {}) {
    this.requiredKeys = requiredKeys;
  }

  async validate(resolver, { allowPlaceholders = true } = {}) {
    const missing = [];
    const placeholders = [];

    for (const key of this.requiredKeys) {
      const value = await resolver.resolve(key);
      if (!value) {
        missing.push(key);
      } else if (String(value).includes("placeholder") && !allowPlaceholders) {
        placeholders.push(key);
      }
    }

    return {
      valid: missing.length === 0 && placeholders.length === 0,
      missing,
      placeholders,
    };
  }
}

module.exports = SecretValidator;
