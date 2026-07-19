const fs = require("fs");
const path = require("path");
const DeliverySettingsDefaults = require("./DeliverySettingsDefaults");

class DeliveryConfigStore {
  constructor({ dataDir, useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.dataDir = dataDir || path.join(process.cwd(), "data", "delivery-configuration");
    this.settingsPath = path.join(this.dataDir, "settings.json");
    this.auditPath = path.join(this.dataDir, "audit.json");
    this.settings = structuredClone(DeliverySettingsDefaults);
    this.auditLog = [];
    this.loaded = false;
    this.DeliveryConfigurationModel = null;
  }

  setModel(model) {
    this.DeliveryConfigurationModel = model;
  }

  initializeSync() {
    if (this.loaded) return this.settings;
    if (this.useMemoryOnly) {
      this.loaded = true;
      return this.settings;
    }
    this._loadFromFile();
    this.loaded = true;
    return this.settings;
  }

  async initialize() {
    if (this.loaded && !this._pendingMongoReload) return this.settings;
    if (this.useMemoryOnly) {
      this.loaded = true;
      return this.settings;
    }
    if (this.DeliveryConfigurationModel && mongooseConnected()) {
      await this._loadFromMongo();
    } else {
      this._loadFromFile();
    }
    this.loaded = true;
    this._pendingMongoReload = false;
    return this.settings;
  }

  scheduleMongoReload() {
    this._pendingMongoReload = true;
    this.loaded = false;
  }

  getSettings() {
    return structuredClone(this.settings);
  }

  getAuditLog(limit = 100) {
    return [...this.auditLog].slice(-limit);
  }

  async updateSettings(partial = {}, { admin = "system", reason = null } = {}) {
    const changes = [];
    const next = structuredClone(this.settings);
    Object.entries(partial).forEach(([key, value]) => {
      if (!Object.prototype.hasOwnProperty.call(next, key)) return;
      const patch = typeof value === "object" && value !== null ? value : { enabled: Boolean(value) };
      const oldValue = structuredClone(next[key]);
      next[key] = { ...next[key], ...patch };
      if (JSON.stringify(oldValue) !== JSON.stringify(next[key])) {
        changes.push({ setting: key, oldValue, newValue: next[key], admin, reason });
      }
    });
    if (!changes.length) return { settings: this.getSettings(), changes: [] };
    this.settings = next;
    const timestamp = new Date().toISOString();
    changes.forEach((entry) => this.auditLog.push({ ...entry, timestamp }));

    const PlatformAuditAdapter = require("../../integration/audit/PlatformAuditAdapter");
    for (const entry of changes) {
      PlatformAuditAdapter.recordConfiguration({
        platform: "delivery",
        resource: entry.setting || "delivery.configuration",
        action: "settings.update",
        actor: entry.admin || "system",
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason,
      }).catch(() => {});
    }

    await this._syncPlatformFlags();
    if (!this.useMemoryOnly) {
      if (this.DeliveryConfigurationModel && mongooseConnected()) {
        await this._saveToMongo(changes);
      } else {
        this._saveToFile();
      }
    }
    return { settings: this.getSettings(), changes };
  }

  async _loadFromMongo() {
    const doc = await this.DeliveryConfigurationModel.findOne({ singletonKey: "default" });
    if (doc) {
      this.settings = { ...structuredClone(DeliverySettingsDefaults), ...doc.settings };
      this.auditLog = Array.isArray(doc.auditLog) ? doc.auditLog.map((e) => ({ ...e })) : [];
      return;
    }
    await this.DeliveryConfigurationModel.create({
      singletonKey: "default",
      settings: structuredClone(DeliverySettingsDefaults),
      auditLog: [],
    });
    this.settings = structuredClone(DeliverySettingsDefaults);
    this.auditLog = [];
  }

  async _saveToMongo(changes) {
    await this.DeliveryConfigurationModel.findOneAndUpdate(
      { singletonKey: "default" },
      {
        settings: this.settings,
        $push: {
          auditLog: {
            $each: changes.map((c) => ({
              setting: c.setting,
              oldValue: c.oldValue,
              newValue: c.newValue,
              admin: c.admin,
              reason: c.reason,
              timestamp: new Date(),
            })),
            $slice: -500,
          },
        },
      },
      { upsert: true, new: true }
    );
  }

  _loadFromFile() {
    this._ensureDir();
    if (fs.existsSync(this.settingsPath)) {
      try {
        this.settings = {
          ...structuredClone(DeliverySettingsDefaults),
          ...JSON.parse(fs.readFileSync(this.settingsPath, "utf8")),
        };
      } catch (_error) {
        this.settings = structuredClone(DeliverySettingsDefaults);
      }
    } else {
      this._saveToFile();
    }
    if (fs.existsSync(this.auditPath)) {
      try {
        this.auditLog = JSON.parse(fs.readFileSync(this.auditPath, "utf8"));
      } catch (_error) {
        this.auditLog = [];
      }
    }
  }

  _saveToFile() {
    this._ensureDir();
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), "utf8");
    fs.writeFileSync(this.auditPath, JSON.stringify(this.auditLog, null, 2), "utf8");
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  async _syncPlatformFlags() {
    if (this.useMemoryOnly) return;
    try {
      const { getPlatformIntegration } = require("../../integration/PlatformIntegration");
      const integration = getPlatformIntegration();
      const current = await integration.featureFlags.getFlags();
      const deliveryPatch = {};
      for (const [key, value] of Object.entries(this.settings)) {
        deliveryPatch[key] = { enabled: value.enabled !== false };
      }
      await integration.featureFlags.store.updateFlags({
        delivery: { ...(current.delivery || {}), ...deliveryPatch },
      });
      await integration.featureFlags.refresh();
    } catch (_error) {
      // Platform integration may not be initialized in isolated tests.
    }
  }

  resetForTests() {
    this.settings = structuredClone(DeliverySettingsDefaults);
    this.auditLog = [];
    this.loaded = true;
  }
}

function mongooseConnected() {
  const mongoose = require("mongoose");
  return mongoose.connection?.readyState === 1;
}

module.exports = DeliveryConfigStore;
