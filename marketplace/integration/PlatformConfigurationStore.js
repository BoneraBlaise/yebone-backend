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
    this.draftBusinessValues = structuredClone(PlatformConfigurationDefaults);
    this.moduleDrafts = {};
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

  getDraftBusinessValues() {
    return structuredClone(this.draftBusinessValues || this.businessValues);
  }

  getModuleDraft(module) {
    return structuredClone(this.moduleDrafts?.[module] ?? null);
  }

  _computePendingChanges() {
    const live = this.getBusinessValues();
    const draft = this.getDraftBusinessValues();
    const sections = new Set([...Object.keys(live), ...Object.keys(draft)]);
    const pending = [];
    sections.forEach((section) => {
      if (JSON.stringify(live[section]) !== JSON.stringify(draft[section])) {
        pending.push(section);
      }
    });
    if (this.moduleDrafts?.delivery) pending.push("delivery");
    return pending;
  }

  getWorkflowSnapshot() {
    return {
      version: this.version,
      live: { businessValues: this.getBusinessValues() },
      draft: { businessValues: this.getDraftBusinessValues() },
      moduleDrafts: structuredClone(this.moduleDrafts || {}),
      pendingChanges: this._computePendingChanges(),
      hasPendingChanges: this._computePendingChanges().length > 0,
      updatedAt: new Date().toISOString(),
    };
  }

  getSnapshot() {
    return {
      version: this.version,
      businessValues: this.getBusinessValues(),
      draftBusinessValues: this.getDraftBusinessValues(),
      workflow: this.getWorkflowSnapshot(),
      updatedAt: new Date().toISOString(),
    };
  }

  getAuditLog(limit = 100) {
    return [...this.auditLog].slice(-limit);
  }

  async updateSection(section, patch = {}, { admin = "system", reason = null } = {}) {
    return this.saveDraftSection(section, patch, { admin, reason });
  }

  _applySectionPatch(target, section, patch) {
    const next = structuredClone(target);
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
    return next;
  }

  async saveDraftSection(section, patch = {}, { admin = "system", reason = null, module = null } = {}) {
    if (!section || typeof patch !== "object") {
      throw Object.assign(new Error("Invalid section update"), { statusCode: 400 });
    }

    const oldValue = structuredClone(this.draftBusinessValues?.[section] ?? null);
    this.draftBusinessValues = this._applySectionPatch(this.getDraftBusinessValues(), section, patch);

    const change = {
      action: "draft.save",
      section,
      oldValue,
      newValue: structuredClone(this.draftBusinessValues[section]),
      admin,
      reason,
      module,
    };
    await this._recordHistory(change);
    await this._persistDraft();
    return { snapshot: this.getSnapshot(), change, workflow: this.getWorkflowSnapshot() };
  }

  async saveModuleDraft(module, values = {}, { admin = "system", reason = null } = {}) {
    const oldValue = structuredClone(this.moduleDrafts?.[module] ?? null);
    this.moduleDrafts = { ...(this.moduleDrafts || {}), [module]: structuredClone(values) };
    await this._recordHistory({
      action: "draft.save",
      section: module,
      module,
      oldValue,
      newValue: structuredClone(values),
      admin,
      reason,
    });
    await this._persistDraft();
    return { snapshot: this.getSnapshot(), workflow: this.getWorkflowSnapshot() };
  }

  async publishDraft({ admin = "system", reason = null, sections = null } = {}) {
    const draft = this.getDraftBusinessValues();
    const live = this.getBusinessValues();
    const targetSections = sections?.length ? sections : Object.keys(draft);
    const oldPublished = structuredClone(live);
    const nextLive = structuredClone(live);

    targetSections.forEach((section) => {
      if (draft[section] !== undefined) nextLive[section] = structuredClone(draft[section]);
    });

    this.version += 1;
    this.businessValues = nextLive;
    this.draftBusinessValues = structuredClone(nextLive);

    if (this.moduleDrafts?.delivery) {
      await this._applyDeliveryDraft(this.moduleDrafts.delivery, admin, reason);
      this.moduleDrafts = { ...this.moduleDrafts, delivery: null };
    }

    const change = {
      action: "publish",
      section: sections?.join(",") || "all",
      oldValue: oldPublished,
      newValue: structuredClone(nextLive),
      admin,
      reason,
    };
    await this._persist([{ ...change, action: "platformConfiguration.publish" }]);
    await this._recordHistory({ ...change, status: "published" });

    return {
      snapshot: this.getSnapshot(),
      workflow: this.getWorkflowSnapshot(),
      published: nextLive,
    };
  }

  async rollbackFromHistory(entry = {}, { admin = "system", reason = null } = {}) {
    if (!entry?.section && !entry?.oldValue) {
      throw Object.assign(new Error("Invalid rollback entry"), { statusCode: 400 });
    }

    const oldPublished = structuredClone(this.businessValues);
    const nextLive = structuredClone(this.businessValues);

    if (entry.section && entry.section !== "all" && !entry.section.includes(",")) {
      if (entry.oldValue !== undefined) nextLive[entry.section] = structuredClone(entry.oldValue);
    } else if (entry.oldValue && typeof entry.oldValue === "object") {
      Object.assign(nextLive, structuredClone(entry.oldValue));
    }

    this.version += 1;
    this.businessValues = nextLive;
    this.draftBusinessValues = structuredClone(nextLive);

    const change = {
      action: "rollback",
      section: entry.section || "all",
      oldValue: oldPublished,
      newValue: structuredClone(nextLive),
      admin,
      reason: reason || `Rollback to ${entry.historyId || "previous version"}`,
    };
    await this._persist([{ ...change, action: "platformConfiguration.rollback" }]);
    await this._recordHistory({ ...change, status: "rollback", note: change.reason });

    return { snapshot: this.getSnapshot(), workflow: this.getWorkflowSnapshot(), restored: nextLive };
  }

  async _applyDeliveryDraft(settings, admin, reason) {
    try {
      const { getDeliveryConfigurationPlatform } = require("../delivery/configuration");
      const platform = getDeliveryConfigurationPlatform();
      await platform.updateConfiguration(settings, { admin, reason });
    } catch {
      /* delivery platform optional in tests */
    }
  }

  async _recordHistory(change) {
    try {
      const { getConfigurationHistoryService } = require("./ConfigurationHistoryService");
      const history = getConfigurationHistoryService();
      await history.record({
        module: change.module,
        section: change.section,
        action: change.action || "draft.save",
        status: change.status || (change.action === "publish" ? "published" : change.action === "rollback" ? "rollback" : "draft"),
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedBy: change.admin || "system",
        note: change.reason || null,
        version: this.version,
      });
    } catch {
      /* history optional */
    }
  }

  async upsertBanner(banner = {}, { admin = "system", reason = null } = {}) {
    const draft = this.getDraftBusinessValues();
    const banners = Array.isArray(draft.banners) ? draft.banners : [];
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
    return this.saveDraftSection("banners", banners.sort((a, b) => (b.priority || 0) - (a.priority || 0)), {
      admin,
      reason,
      module: "banners",
    }).then((result) => normalized);
  }

  async deleteBanner(id, { admin = "system", reason = null } = {}) {
    const draft = this.getDraftBusinessValues();
    const banners = Array.isArray(draft.banners) ? draft.banners : [];
    const oldValue = banners.find((item) => String(item.id) === String(id));
    if (!oldValue) {
      throw Object.assign(new Error("Banner not found"), { statusCode: 404 });
    }
    const nextBanners = banners.filter((item) => String(item.id) !== String(id));
    await this.saveDraftSection("banners", nextBanners, { admin, reason, module: "banners" });
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

  async _persistDraft() {
    if (this.useMemoryOnly) return;
    if (this.PlatformConfigurationModel && mongooseConnected()) {
      await this.PlatformConfigurationModel.findOneAndUpdate(
        { singletonKey: "default" },
        {
          $set: {
            draftBusinessValues: this.draftBusinessValues,
            moduleDrafts: this.moduleDrafts || {},
          },
        },
        { upsert: true }
      );
    } else {
      this._saveToFile();
    }
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
      this.draftBusinessValues = this._mergeDefaults(doc.draftBusinessValues || doc.businessValues);
      this.moduleDrafts = doc.moduleDrafts || {};
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
          draftBusinessValues: this.draftBusinessValues,
          moduleDrafts: this.moduleDrafts || {},
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
        this.draftBusinessValues = this._mergeDefaults(
          parsed.draftBusinessValues || parsed.businessValues || parsed
        );
        this.moduleDrafts = parsed.moduleDrafts || {};
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
      JSON.stringify(
        {
          version: this.version,
          businessValues: this.businessValues,
          draftBusinessValues: this.draftBusinessValues,
          moduleDrafts: this.moduleDrafts,
        },
        null,
        2
      )
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
