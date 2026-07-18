const { createProductionTools } = require("./tools/registerTools");

/**
 * AI tool registry — Phase 7.2 production integrations.
 */
class AIToolRegistry {
  constructor({ metrics } = {}) {
    this.tools = new Map();
    this.metrics = metrics || null;
  }

  register(tool) {
    if (!tool?.id) {
      throw new Error("AIToolRegistry: tool id is required");
    }
    this.tools.set(tool.id, tool);
    return tool;
  }

  registerProductionTools({ marketplaceCore, platforms } = {}) {
    this.tools.clear();
    const tools = createProductionTools({ marketplaceCore, platforms });
    tools.forEach((tool) => this.register(tool));
    return this.list();
  }

  get(id) {
    return this.tools.get(id) || null;
  }

  list() {
    return [...this.tools.values()].map((tool) => ({
      ...tool.metadata(),
      hasExecute: typeof tool.execute === "function",
      healthy: tool.health().healthy,
    }));
  }

  checkPermission(toolId, context = {}) {
    const tool = this.get(toolId);
    if (!tool) return { allowed: false, reason: "unknown_tool" };
    return tool.checkAuthorization(context);
  }

  async execute(toolId, input = {}, context = {}) {
    const tool = this.get(toolId);
    if (!tool) {
      const error = new Error(`AIToolRegistry: unknown tool ${toolId}`);
      error.code = "unknown_tool";
      error.statusCode = 404;
      throw error;
    }

    const startedAt = Date.now();
    const result = await tool.run(input, context);
    const latencyMs = Date.now() - startedAt;

    if (this.metrics) {
      this.metrics.recordToolExecution({
        toolId,
        success: result.success,
        latencyMs,
        capabilities: input.capabilities || [],
        correlationId: context.correlationId || null,
      });
    }

    if (!result.success && result.error?.statusCode === 403) {
      const error = new Error(result.error.message);
      error.code = result.error.code;
      error.statusCode = 403;
      throw error;
    }

    return result;
  }

  healthCheck() {
    const results = [];
    for (const tool of this.tools.values()) {
      results.push(tool.health());
    }
    return {
      healthy: results.every((entry) => entry.healthy),
      tools: results,
    };
  }
}

module.exports = AIToolRegistry;
