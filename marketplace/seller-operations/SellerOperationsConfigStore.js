const { SellerOperationsSettingsDefaults } = require("./SellerOperationsSettingsDefaults");

class SellerOperationsConfigStore {
  constructor({ useMemoryOnly = false, ConfigModel = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.ConfigModel = ConfigModel;
    this.memory = { key: "global", settings: structuredClone(SellerOperationsSettingsDefaults) };
  }

  setModel(model) {
    this.ConfigModel = model;
  }

  async initialize() {
    if (this.useMemoryOnly || !this.ConfigModel) return this.memory;
    let doc = await this.ConfigModel.findOne({ key: "global" }).lean();
    if (!doc) {
      doc = await this.ConfigModel.create({
        key: "global",
        settings: structuredClone(SellerOperationsSettingsDefaults),
      });
      doc = doc.toObject();
    }
    this.memory = doc;
    return doc;
  }

  getSettings() {
    return { ...SellerOperationsSettingsDefaults, ...(this.memory.settings || {}) };
  }

  async updateSettings(partial = {}, meta = {}) {
    const next = { ...this.getSettings(), ...partial };
    for (const key of Object.keys(SellerOperationsSettingsDefaults)) {
      if (
        SellerOperationsSettingsDefaults[key] &&
        typeof SellerOperationsSettingsDefaults[key] === "object" &&
        partial[key]
      ) {
        next[key] = { ...SellerOperationsSettingsDefaults[key], ...partial[key] };
      }
    }

    if (this.useMemoryOnly || !this.ConfigModel) {
      this.memory = { key: "global", settings: next, updatedBy: meta.admin || "system" };
      return next;
    }

    const doc = await this.ConfigModel.findOneAndUpdate(
      { key: "global" },
      { $set: { settings: next, updatedBy: meta.admin || "system" } },
      { upsert: true, new: true }
    );
    this.memory = doc.toObject();
    return next;
  }
}

module.exports = SellerOperationsConfigStore;
