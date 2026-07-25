const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { PlatformConfigurationDefaults, BANNER_TYPES } = require("./PlatformConfigurationDefaults");

function mongooseConnected() {
  try {
    const mongoose = require("mongoose");
    return mongoose.connection?.readyState === 1;
  } catch {
    return false;
  }
}

class PlatformConfigurationStore {
  constructor({ dataDir, useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.dataDir = dataDir || path.join(process.cwd(), "data", "platform-configuration");
    this.configPath = path.join(this.dataDir, "business-values.json");
    this.auditPath = path.join(this.dataDir, "audit.json");
    this.businessValues = structuredClone(PlatformConfigurationDefaults);
    this.version = PlatformConfigurationDefaults.version;
    this.auditLog = [];
    this.loaded = false;
    this.PlatformConfigurationModel = null;
  }

  setModel(model) {
    this.PlatformConfigurationModel = model;
  }

  async initialize() {
    if (this.loaded && !this._pendingMongoReload) return this.getSnapshot();
    if (this.useMemoryOnly) {
      this.loaded = true;
      return this.getSnapshot();
    }
    if (this.PlatformConfigurationModel && mongooseConnected()) {
      await this._loadFromMongo();
    } else {
      this._loadFromFile();
    }
    this.loaded = true;
    this._pendingMongoReload = false;
    return this.getSnapshot();
  }

  scheduleMongoReload() {
    this._pendingMongoReload = true;
    this.loaded = false;
  }

  getBusinessValues() {
    return structuredClone(this.businessValues);
  }

  getSnapshot() {
    return {
      version: this.version,
      businessValues: this.getBusinessValues(),
      updatedAt: new Date().toISOString(),
    };
  }

  getAuditLog(limit = 100) {
    return [...this.auditLog].slice(-limit);
  }

  async updateSection(section, patch = {}, { admin = "system", reason = null } = {}) {
    if (!section || typeof patch !== "object") {
      throw Object.assign(new Error("Invalid section update"), { statusCode: 400 });
    }

    const next = structuredClone(this.businessValues);
    const oldValue = structuredClone(next[section] ?? null);

    if (section === "banners") {
      if (!Array.isArray(patch)) {
        throw Object.assign(new Error("Banners must be an array"), { statusCode: 400 });
      }
      next.banners = patch;
    } else if (next[section] && typeof next[section] === "object" && !Array.isArray(next[section])) {
      next[section] = { ...next[section], ...patch };
    } else {
      next[section] = patch;
    }

    this.version += 1;
    this.businessValues = next;
    const change = {
      action: "platformConfiguration.update",
      section,
      oldValue,
      newValue: structuredClone(next[section]),
      admin,
      reason,
    };
    await this._persist([change]);
    return { snapshot: this.getSnapshot(), change };
  }

  async upsertBanner(banner = {}, { admin = "system", reason = null } = {}) {
    const next = structuredClone(this.businessValues);
    const banners = Array.isArray(next.banners) ? next.banners : [];
    const id = banner.id || randomUUID();
    const normalized = {
      id,
      type: BANNER_TYPES.includes(banner.type) ? banner.type : "homepage_hero",
      title: String(banner.title || ""),
      image: String(banner.image || ""),
      buttonText: String(banner.buttonText || "Shop now"),
      target: String(banner.target || "/"),
      priority: Number(banner.priority ?? 0),
      schedule: {
        start: banner.schedule?.start || null,
        end: banner.schedule?.end || null,
      },
      enabled: banner.enabled !== false,
      createdAt: banner.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const index = banners.findIndex((item) => String(item.id) === String(id));
    const oldValue = index >= 0 ? banners[index] : null;
    if (index >= 0) banners[index] = normalized;
    else banners.push(normalized);
    next.banners = banners.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.version += 1;
    this.businessValues = next;
    await this._persist([
      {
        action: oldValue ? "banner.update" : "banner.create",
        section: "banners",
        oldValue,
        newValue: normalized,
        admin,
        reason,
      },
    ]);
    return normalized;
  }

  async deleteBanner(id, { admin = "system", reason = null } = {}) {
    const next = structuredClone(this.businessValues);
    const banners = Array.isArray(next.banners) ? next.banners : [];
    const oldValue = banners.find((item) => String(item.id) === String(id));
    if (!oldValue) {
      throw Object.assign(new Error("Banner not found"), { statusCode: 404 });
    }
    next.banners = banners.filter((item) => String(item.id) !== String(id));
    this.version += 1;
    this.businessValues = next;
    await this._persist([
      { action: "banner.delete", section: "banners", oldValue, newValue: null, admin, reason },
    ]);
    return { deleted: true, id };
  }

  getActiveBanners(type = null) {
    const now = Date.now();
    return (this.businessValues.banners || []).filter((banner) => {
      if (!banner.enabled) return false;
      if (type && banner.type !== type) return false;
      const start = banner.schedule?.start ? Date.parse(banner.schedule.start) : null;
      const end = banner.schedule?.end ? Date.parse(banner.schedule.end) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });
  }

  async _persist(changes) {
    const timestamp = new Date().toISOString();
    changes.forEach((entry) => this.auditLog.push({ ...entry, timestamp }));

    const PlatformAuditAdapter = require("./audit/PlatformAuditAdapter");
    for (const entry of changes) {
      PlatformAuditAdapter.recordConfiguration({
        platform: "platform-configuration",
        resource: entry.section || "platform.configuration",
        action: entry.action || "update",
        actor: entry.admin || "system",
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason,
      }).catch(() => {});
    }

    if (this.useMemoryOnly) return;
    if (this.PlatformConfigurationModel && mongooseConnected()) {
      await this._saveToMongo(changes);
    } else {
      this._saveToFile();
    }
  }

  async _loadFromMongo() {
    const doc = await this.PlatformConfigurationModel.findOne({ singletonKey: "default" });
    if (doc?.businessValues) {
      this.businessValues = this._mergeDefaults(doc.businessValues);
      this.version = doc.version || this.businessValues.version || 1;
      this.auditLog = doc.auditLog || [];
    }
  }

  async _saveToMongo(changes) {
    await this.PlatformConfigurationModel.findOneAndUpdate(
      { singletonKey: "default" },
      {
        $set: {
          version: this.version,
          businessValues: this.businessValues,
        },
        $push: {
          auditLog: {
            $each: changes.map((entry) => ({
              ...entry,
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
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (fs.existsSync(this.configPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
        this.businessValues = this._mergeDefaults(parsed.businessValues || parsed);
        this.version = parsed.version || 1;
      } catch {
        this.businessValues = structuredClone(PlatformConfigurationDefaults);
      }
    }
    if (fs.existsSync(this.auditPath)) {
      try {
        this.auditLog = JSON.parse(fs.readFileSync(this.auditPath, "utf8"));
      } catch {
        this.auditLog = [];
      }
    }
  }

  _saveToFile() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(
      this.configPath,
      JSON.stringify({ version: this.version, businessValues: this.businessValues }, null, 2)
    );
    fs.writeFileSync(this.auditPath, JSON.stringify(this.auditLog.slice(-500), null, 2));
  }

  _mergeDefaults(values = {}) {
    const merged = structuredClone(PlatformConfigurationDefaults);
    Object.keys(merged).forEach((key) => {
      if (values[key] === undefined) return;
      if (typeof merged[key] === "object" && merged[key] !== null && !Array.isArray(merged[key])) {
        merged[key] = { ...merged[key], ...values[key] };
      } else {
        merged[key] = values[key];
      }
    });
    return merged;
  }
}

module.exports = PlatformConfigurationStore;
