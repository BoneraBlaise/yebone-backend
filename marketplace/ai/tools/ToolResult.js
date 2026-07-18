/**
 * Unified AI tool result contract — Phase 7.2.
 */
function normalizeError(error) {
  if (!error) return null;
  if (typeof error === "string") {
    return { code: "TOOL_ERROR", message: error };
  }
  return {
    code: error.code || "TOOL_ERROR",
    message: error.message || "Tool execution failed",
    statusCode: error.statusCode || 500,
  };
}

function createToolResult({
  success,
  tool,
  version,
  latency = 0,
  data = null,
  metadata = {},
  error = null,
} = {}) {
  return Object.freeze({
    success: Boolean(success),
    tool: tool || "unknown",
    version: version || "7.2.0",
    latency: Math.max(0, Number(latency) || 0),
    data,
    metadata: Object.freeze({ ...metadata }),
    error: error ? Object.freeze(normalizeError(error)) : null,
  });
}

function success({ tool, version, latency, data, metadata } = {}) {
  return createToolResult({
    success: true,
    tool,
    version,
    latency,
    data,
    metadata,
    error: null,
  });
}

function failure({ tool, version, latency, error, metadata, data = null } = {}) {
  return createToolResult({
    success: false,
    tool,
    version,
    latency,
    data,
    metadata,
    error,
  });
}

module.exports = {
  createToolResult,
  success,
  failure,
  normalizeError,
};
