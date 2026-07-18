const ToolResult = require("./ToolResult");

/**
 * Base AI tool — implements the Phase 7.2 tool contract.
 */
class BaseTool {
  constructor({
    id,
    name,
    version = "7.2.0",
    capabilities = [],
    permissions = ["public"],
    timeoutMs = 30000,
    platform = null,
  } = {}) {
    if (!id) {
      throw new Error("BaseTool: id is required");
    }
    this.id = id;
    this.name = name || id;
    this.version = version;
    this._capabilities = [...capabilities];
    this.permissions = [...permissions];
    this.timeoutMs = timeoutMs;
    this.platform = platform;
    this._initialized = false;
  }

  initialize() {
    this._initialized = true;
    return this;
  }

  health() {
    return Object.freeze({
      healthy: this._initialized,
      tool: this.id,
      version: this.version,
      platform: this.platform,
      checkedAt: new Date().toISOString(),
    });
  }

  capabilities() {
    return [...this._capabilities];
  }

  metadata() {
    return Object.freeze({
      id: this.id,
      name: this.name,
      version: this.version,
      capabilities: this.capabilities(),
      permissions: [...this.permissions],
      platform: this.platform,
      timeoutMs: this.timeoutMs,
    });
  }

  assertInitialized() {
    if (!this._initialized) {
      throw new Error(`${this.id}: tool not initialized`);
    }
  }

  checkAuthorization(context = {}) {
    if (this.permissions.includes("public")) {
      return { allowed: true };
    }
    if (this.permissions.includes("authenticated") && context.userId) {
      return { allowed: true };
    }
    return { allowed: false, reason: "permission_denied" };
  }

  async execute(_input = {}, _context = {}) {
    throw new Error(`${this.id}: execute() must be implemented`);
  }

  async run(input = {}, context = {}) {
    this.assertInitialized();
    const startedAt = Date.now();
    const auth = this.checkAuthorization(context);
    if (!auth.allowed) {
      const error = new Error(`AIToolRegistry: ${auth.reason}`);
      error.code = auth.reason;
      error.statusCode = 403;
      return ToolResult.failure({
        tool: this.id,
        version: this.version,
        latency: Date.now() - startedAt,
        error,
        metadata: { correlationId: context.correlationId || null },
      });
    }

    try {
      const data = await this.execute(input, context);
      return ToolResult.success({
        tool: this.id,
        version: this.version,
        latency: Date.now() - startedAt,
        data,
        metadata: {
          correlationId: context.correlationId || null,
          platform: this.platform,
        },
      });
    } catch (error) {
      return ToolResult.failure({
        tool: this.id,
        version: this.version,
        latency: Date.now() - startedAt,
        error,
        metadata: {
          correlationId: context.correlationId || null,
          platform: this.platform,
        },
      });
    }
  }
}

module.exports = BaseTool;
