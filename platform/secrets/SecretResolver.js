class SecretResolver {
  constructor({ provider, registry }) {
    this.provider = provider;
    this.registry = registry;
  }

  async resolve(key) {
    if (this.registry && !this.registry.get(key)) {
      this.registry.register(key, { source: "placeholder" });
    }
    return this.provider.get(key);
  }

  async resolveMany(keys = []) {
    const result = {};
    for (const key of keys) {
      result[key] = await this.resolve(key);
    }
    return result;
  }
}

module.exports = SecretResolver;
