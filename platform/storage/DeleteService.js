class DeleteService {
  constructor({ provider } = {}) {
    this.provider = provider;
  }

  async delete(key) {
    const exists = await this.provider.exists(key);
    if (!exists) {
      return { key, deleted: false, reason: "not_found" };
    }
    return this.provider.delete(key);
  }

  async deleteMany(keys = []) {
    const results = [];
    for (const key of keys) {
      results.push(await this.delete(key));
    }
    return results;
  }
}

module.exports = DeleteService;
