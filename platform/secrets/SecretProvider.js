class SecretProvider {
  async get(_key) { throw new Error("SecretProvider.get must be implemented"); }
  async has(_key) { throw new Error("SecretProvider.has must be implemented"); }
  async list() { throw new Error("SecretProvider.list must be implemented"); }
}
module.exports = SecretProvider;
