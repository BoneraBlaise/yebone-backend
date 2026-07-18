const { TOOL_DEFINITIONS } = require("./tools/index");

/**
 * AI tool registry — Phase 7.1 mock tools only.
 */
class AIToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(definition) {
    if (!definition?.id) {
      throw new Error("AIToolRegistry: tool id is required");
    }
    const entry = {
      id: definition.id,
      name: definition.name || definition.id,
      version: definition.version || "7.1.0",
      capabilities: definition.capabilities || [],
      permissions: definition.permissions || ["public"],
      execute: definition.execute,
    };
    this.tools.set(entry.id, entry);
    return entry;
  }

  registerDefaults() {
    TOOL_DEFINITIONS.forEach((tool) => this.register(tool));
    return this.list();
  }

  get(id) {
    return this.tools.get(id) || null;
  }

  list() {
    return [...this.tools.values()].map(({ execute, ...rest }) => ({
      ...rest,
      hasExecute: typeof execute === "function",
    }));
  }

  checkPermission(toolId, context = {}) {
    const tool = this.get(toolId);
    if (!tool) return { allowed: false, reason: "unknown_tool" };
    const perms = tool.permissions || [];
    if (perms.includes("public")) return { allowed: true };
    if (perms.includes("authenticated") && context.userId) return { allowed: true };
    return { allowed: false, reason: "permission_denied" };
  }

  async execute(toolId, input = {}, context = {}) {
    const tool = this.get(toolId);
    if (!tool) {
      throw new Error(`AIToolRegistry: unknown tool ${toolId}`);
    }
    const permission = this.checkPermission(toolId, context);
    if (!permission.allowed) {
      const error = new Error(`AIToolRegistry: ${permission.reason}`);
      error.code = permission.reason;
      error.statusCode = 403;
      throw error;
    }
    return tool.execute(input, context);
  }
}

module.exports = AIToolRegistry;
