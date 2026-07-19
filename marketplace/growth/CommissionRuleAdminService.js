const { randomUUID } = require("crypto");
const GrowthConfigValidation = require("./GrowthConfigValidation");

class CommissionRuleAdminService {
  constructor({ store, audit, analytics } = {}) {
    if (!store) throw new Error("CommissionRuleAdminService requires store");
    this.store = store;
    this.audit = audit;
    this.analytics = analytics;
  }

  _rules(includeArchived = false) {
    return this.store.getCommissionRules().filter((rule) => includeArchived || !rule.archived);
  }

  _saveRules(rules, auditEntry) {
    return this.store.updateCommissionRules(rules, auditEntry);
  }

  _findIndex(rules, id) {
    return rules.findIndex((rule) => String(rule.id) === String(id));
  }

  _audit(action, rule, oldValue, newValue, meta = {}) {
    if (this.analytics) {
      if (action.includes("priority")) this.analytics.recordPriorityOverride();
      else this.analytics.recordRuleExecution();
    }
    return {
      action,
      setting: "commissionRule",
      affectedRule: rule?.id || null,
      oldValue,
      newValue,
      admin: meta.admin || "system",
      reason: meta.reason || null,
    };
  }

  list(options = {}) {
    const {
      search = "",
      strategy = null,
      status = null,
      includeArchived = false,
      sortBy = "priority",
      sortDir = "asc",
      page = 1,
      limit = 20,
    } = options;

    let rules = this._rules(includeArchived);
    const query = String(search).trim().toLowerCase();

    if (query) {
      rules = rules.filter(
        (rule) =>
          rule.name?.toLowerCase().includes(query) ||
          rule.description?.toLowerCase().includes(query) ||
          rule.strategy?.toLowerCase().includes(query) ||
          rule.id?.toLowerCase().includes(query)
      );
    }

    if (strategy) {
      rules = rules.filter((rule) => rule.strategy === String(strategy).toUpperCase());
    }

    if (status === "enabled") rules = rules.filter((rule) => rule.enabled && !rule.archived);
    if (status === "disabled") rules = rules.filter((rule) => !rule.enabled && !rule.archived);
    if (status === "archived") rules = rules.filter((rule) => rule.archived);

    rules.sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "rate") return (a.rate - b.rate) * dir;
      if (sortBy === "updatedAt") return String(a.updatedAt).localeCompare(String(b.updatedAt)) * dir;
      return (a.priority - b.priority) * dir;
    });

    const total = rules.length;
    const start = (Math.max(1, Number(page)) - 1) * Number(limit);
    const items = rules.slice(start, start + Number(limit));

    return { items, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  getById(id, { includeArchived = true } = {}) {
    const rules = this._rules(includeArchived);
    return rules.find((rule) => String(rule.id) === String(id)) || null;
  }

  async create(input, { admin, reason } = {}) {
    const validation = GrowthConfigValidation.validateCommissionRuleInput(input, { admin, reason });
    if (!validation.valid) {
      const error = new Error(validation.reason);
      error.statusCode = 400;
      throw error;
    }

    const rules = this.store.getCommissionRules();
    if (rules.some((rule) => String(rule.id) === String(validation.rule.id))) {
      validation.rule.id = randomUUID();
    }

    const next = [...rules, validation.rule];
    await this._saveRules(next, {
      admin,
      reason,
      changes: [this._audit("commissionRule.create", validation.rule, null, validation.rule, { admin, reason })],
    });

    return validation.rule;
  }

  async update(id, input, { admin, reason } = {}) {
    const rules = this.store.getCommissionRules();
    const index = this._findIndex(rules, id);
    if (index < 0) {
      const error = new Error("Commission rule not found");
      error.statusCode = 404;
      throw error;
    }

    const oldValue = { ...rules[index] };
    const merged = { ...rules[index], ...input, id: rules[index].id, createdAt: rules[index].createdAt };
    const validation = GrowthConfigValidation.validateCommissionRuleInput(merged, { admin, reason });
    if (!validation.valid) {
      const error = new Error(validation.reason);
      error.statusCode = 400;
      throw error;
    }

    rules[index] = validation.rule;
    await this._saveRules(rules, {
      admin,
      reason,
      changes: [this._audit("commissionRule.update", validation.rule, oldValue, validation.rule, { admin, reason })],
    });
    return validation.rule;
  }

  async delete(id, { admin, reason } = {}) {
    return this.archive(id, { admin, reason: reason || "Deleted by admin" });
  }

  async duplicate(id, { admin, reason } = {}) {
    const source = this.getById(id, { includeArchived: true });
    if (!source) {
      const error = new Error("Commission rule not found");
      error.statusCode = 404;
      throw error;
    }

    const copy = {
      ...source,
      id: randomUUID(),
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: admin,
      updatedBy: admin,
      archived: false,
    };

    return this.create(copy, { admin, reason: reason || "Duplicated rule" });
  }

  async archive(id, { admin, reason } = {}) {
    return this.update(id, { archived: true, enabled: false }, { admin, reason: reason || "Archived" });
  }

  async restore(id, { admin, reason } = {}) {
    return this.update(id, { archived: false, enabled: true }, { admin, reason: reason || "Restored" });
  }

  async bulkEnable(ids = [], { admin, reason } = {}) {
    return this._bulkPatch(ids, { enabled: true, archived: false }, "commissionRule.bulkEnable", { admin, reason });
  }

  async bulkDisable(ids = [], { admin, reason } = {}) {
    return this._bulkPatch(ids, { enabled: false }, "commissionRule.bulkDisable", { admin, reason });
  }

  async bulkDelete(ids = [], { admin, reason } = {}) {
    return this._bulkPatch(ids, { archived: true, enabled: false }, "commissionRule.bulkDelete", { admin, reason });
  }

  async updatePriorities(priorities = [], { admin, reason } = {}) {
    const rules = this.store.getCommissionRules();
    const oldValue = rules.map((rule) => ({ id: rule.id, priority: rule.priority }));
    const priorityMap = new Map(priorities.map((entry) => [String(entry.id), Number(entry.priority)]));

    const next = rules.map((rule) => {
      if (!priorityMap.has(String(rule.id))) return rule;
      return {
        ...rule,
        priority: priorityMap.get(String(rule.id)),
        updatedBy: admin,
        updatedAt: new Date().toISOString(),
        reason: reason || rule.reason,
      };
    });

    await this._saveRules(next, {
      admin,
      reason,
      changes: [
        this._audit("commissionRule.priority.update", null, oldValue, next.map((r) => ({ id: r.id, priority: r.priority })), {
          admin,
          reason,
        }),
      ],
    });

    return next.filter((rule) => priorityMap.has(String(rule.id)));
  }

  async _bulkPatch(ids, patch, action, { admin, reason }) {
    const rules = this.store.getCommissionRules();
    const idSet = new Set(ids.map(String));
    const updated = [];

    const next = rules.map((rule) => {
      if (!idSet.has(String(rule.id))) return rule;
      const merged = GrowthConfigValidation.normalizeCommissionRule(
        { ...rule, ...patch },
        { admin, reason }
      );
      updated.push(merged);
      return merged;
    });

    await this._saveRules(next, {
      admin,
      reason,
      changes: [this._audit(action, null, ids, updated.map((r) => r.id), { admin, reason })],
    });

    return updated;
  }

  getActiveRulesForEngine() {
    return this._rules(false).filter((rule) => rule.enabled && !rule.archived);
  }
}

module.exports = CommissionRuleAdminService;
