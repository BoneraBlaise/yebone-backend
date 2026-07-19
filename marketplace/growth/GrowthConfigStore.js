const fs = require("fs");
const path = require("path");
const { GrowthSettingsDefaults, DEFAULT_COMMISSION_RULES } = require("./GrowthSettingsDefaults");

class GrowthConfigStore {
  constructor({ dataDir, useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.dataDir = dataDir || path.join(process.cwd(), "data", "growth-configuration");
    this.settingsPath = path.join(this.dataDir, "settings.json");
    this.rulesPath = path.join(this.dataDir, "commission-rules.json");
    this.auditPath = path.join(this.dataDir, "audit.json");
    this.settings = structuredClone(GrowthSettingsDefaults);
    this.commissionRules = structuredClone(DEFAULT_COMMISSION_RULES);
    this.auditLog = [];
    this.loaded = false;
    this.GrowthConfigurationModel = null;
  }

  setModel(model) {
    this.GrowthConfigurationModel = model;
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
    if (this.GrowthConfigurationModel && mongooseConnected()) {
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

  getCommissionRules() {
    return structuredClone(this.commissionRules);
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
        changes.push({ action: "settings.update", setting: key, oldValue, newValue: next[key], admin, reason });
      }
    });
    if (!changes.length) return { settings: this.getSettings(), changes: [] };
    this.settings = next;
    await this._persist(changes);
    return { settings: this.getSettings(), changes };
  }

  async updateCommissionRules(rules = [], { admin = "system", reason = null, changes = null } = {}) {
    const oldValue = this.getCommissionRules();
    this.commissionRules = structuredClone(rules);
    const auditChanges =
      changes ||
      [
        {
          action: "commissionRules.update",
          setting: "commissionRules",
          oldValue,
          newValue: this.getCommissionRules(),
          admin,
          reason,
        },
      ];
    await this._persist(
      auditChanges.map((entry) => ({
        ...entry,
        admin: entry.admin || admin,
        reason: entry.reason ?? reason,
      }))
    );
    return { commissionRules: this.getCommissionRules(), changes: auditChanges };
  }

  async _persist(changes) {
    const timestamp = new Date().toISOString();
    changes.forEach((entry) => this.auditLog.push({ ...entry, timestamp }));
    if (this.useMemoryOnly) return;
    if (this.GrowthConfigurationModel && mongooseConnected()) {
      await this._saveToMongo(changes);
    } else {
      this._saveToFile();
    }
  }

  async _loadFromMongo() {
    const doc = await this.GrowthConfigurationModel.findOne({ singletonKey: "default" });
    if (doc) {
      this.settings = { ...structuredClone(GrowthSettingsDefaults), ...doc.settings };
      this.commissionRules = Array.isArray(doc.commissionRules) && doc.commissionRules.length
        ? doc.commissionRules
        : structuredClone(DEFAULT_COMMISSION_RULES);
      this.auditLog = Array.isArray(doc.auditLog) ? doc.auditLog.map((e) => ({ ...e })) : [];
      return;
    }
    await this.GrowthConfigurationModel.create({
      singletonKey: "default",
      settings: structuredClone(GrowthSettingsDefaults),
      commissionRules: structuredClone(DEFAULT_COMMISSION_RULES),
      auditLog: [],
    });
    this.settings = structuredClone(GrowthSettingsDefaults);
    this.commissionRules = structuredClone(DEFAULT_COMMISSION_RULES);
    this.auditLog = [];
  }

  async _saveToMongo(changes) {
    await this.GrowthConfigurationModel.findOneAndUpdate(
      { singletonKey: "default" },
      {
        settings: this.settings,
        commissionRules: this.commissionRules,
        $push: {
          auditLog: {
            $each: changes.map((c) => ({
              action: c.action,
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
          ...structuredClone(GrowthSettingsDefaults),
          ...JSON.parse(fs.readFileSync(this.settingsPath, "utf8")),
        };
      } catch (_error) {
        this.settings = structuredClone(GrowthSettingsDefaults);
      }
    } else {
      this._saveToFile();
    }
    if (fs.existsSync(this.rulesPath)) {
      try {
        this.commissionRules = JSON.parse(fs.readFileSync(this.rulesPath, "utf8"));
      } catch (_error) {
        this.commissionRules = structuredClone(DEFAULT_COMMISSION_RULES);
      }
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
    fs.writeFileSync(this.rulesPath, JSON.stringify(this.commissionRules, null, 2), "utf8");
    fs.writeFileSync(this.auditPath, JSON.stringify(this.auditLog, null, 2), "utf8");
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  resetForTests() {
    this.settings = structuredClone(GrowthSettingsDefaults);
    this.commissionRules = structuredClone(DEFAULT_COMMISSION_RULES);
    this.auditLog = [];
    this.loaded = true;
  }
}

function mongooseConnected() {
  const mongoose = require("mongoose");
  return mongoose.connection?.readyState === 1;
}

module.exports = GrowthConfigStore;
