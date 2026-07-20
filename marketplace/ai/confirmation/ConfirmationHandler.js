const { isPlatformFeatureEnabled } = require("../../integration/features/PlatformFeatureFlagResolver");

class ConfirmationHandler {
  constructor({ pendingActionService, toolRegistry, audit, config } = {}) {
    this.pendingActionService = pendingActionService;
    this.toolRegistry = toolRegistry;
    this.audit = audit;
    this.config = config;
  }

  _fail(reason, message, statusCode = 403) {
    const error = new Error(message || reason);
    error.reason = reason;
    error.statusCode = statusCode;
    return error;
  }

  _featureEnabledForTool(toolId) {
    if (toolId.startsWith("property.")) {
      return isPlatformFeatureEnabled("propertyMobility", "listings.enabled");
    }
    if (toolId === "growth.recommend") {
      return isPlatformFeatureEnabled("growthCommerce", "aiIntegration.enabled");
    }
    if (toolId === "seller.inventory.read") {
      return isPlatformFeatureEnabled("sellerOperations", "inventory.enabled");
    }
    return isPlatformFeatureEnabled("ai");
  }

  async validateAndExecute({
    confirmActionId,
    sessionId,
    actionChecksum,
    authContext = {},
    correlationId = null,
  } = {}) {
    const record = this.pendingActionService.get(confirmActionId);
    if (!record) {
      throw this._fail("PENDING_ACTION_NOT_FOUND", "Pending action not found", 404);
    }

    if (record.status === "consumed") {
      throw this._fail("REPLAY_DETECTED", "This action was already executed", 409);
    }
    if (record.status === "cancelled") {
      throw this._fail("PENDING_ACTION_CANCELLED", "This action was cancelled", 409);
    }
    if (record.status === "expired" || new Date(record.expiresAt).getTime() <= Date.now()) {
      throw this._fail(
        "PENDING_ACTION_EXPIRED",
        "This action has expired. Please request it again.",
        410
      );
    }
    if (record.status !== "pending") {
      throw this._fail("PENDING_ACTION_INVALID_STATE", "Pending action is not valid", 409);
    }
    if (record.sessionId !== sessionId) {
      throw this._fail("SESSION_MISMATCH", "Session mismatch", 403);
    }
    const actorIds = [authContext.userId, authContext.vendorId].filter(Boolean);
    if (actorIds.length === 0 || !actorIds.includes(record.requestedBy)) {
      throw this._fail("USER_MISMATCH", "User mismatch", 403);
    }
    if (record.vendorId && authContext.vendorId && record.vendorId !== authContext.vendorId) {
      throw this._fail("VENDOR_MISMATCH", "Vendor mismatch", 403);
    }
    if (record.actionChecksum !== actionChecksum) {
      throw this._fail("CHECKSUM_MISMATCH", "Confirmation checksum mismatch", 403);
    }

    const permission = this.toolRegistry.checkPermission(record.toolId, authContext);
    if (!permission.allowed) {
      throw this._fail("PERMISSION_DENIED", permission.reason || "Permission denied", 403);
    }

    if (!this._featureEnabledForTool(record.toolId)) {
      throw this._fail("FEATURE_DISABLED", "Feature is disabled", 403);
    }

    const consumed = this.pendingActionService.consume(confirmActionId);
    if (!consumed) {
      throw this._fail("REPLAY_DETECTED", "Replay detected", 409);
    }

    this.audit?.confirmed({
      pendingActionId: record.pendingActionId,
      sessionId: record.sessionId,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
      toolId: record.toolId,
      intent: record.intent,
      action: record.action,
      correlationId: correlationId || record.correlationId,
    });

    try {
      const toolResult = await this.toolRegistry.execute(
        record.toolId,
        { ...record.payload, action: record.action },
        {
          ...authContext,
          correlationId: correlationId || record.correlationId,
          allowMutation: true,
          pendingActionId: record.pendingActionId,
        }
      );

      if (record.action === "publish" && record.payload?.listingId) {
        const listing = toolResult?.data?.listing;
        if (listing && String(listing.ownerId) !== String(authContext.vendorId || authContext.userId)) {
          throw this._fail("OWNERSHIP_FAILED", "Listing ownership validation failed", 403);
        }
      }

      this.audit?.executed({
        pendingActionId: record.pendingActionId,
        sessionId: record.sessionId,
        userId: authContext.userId,
        vendorId: authContext.vendorId,
        toolId: record.toolId,
        intent: record.intent,
        action: record.action,
        correlationId: correlationId || record.correlationId,
      });

      return { record, toolResult };
    } catch (error) {
      this.audit?.failed({
        pendingActionId: record.pendingActionId,
        sessionId: record.sessionId,
        userId: authContext.userId,
        vendorId: authContext.vendorId,
        toolId: record.toolId,
        intent: record.intent,
        action: record.action,
        correlationId: correlationId || record.correlationId,
        outcome: error.reason || error.message,
      });
      throw error;
    }
  }

  cancel({ cancelActionId, sessionId, authContext = {} } = {}) {
    const result = this.pendingActionService.cancel(cancelActionId, {
      sessionId,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
    });
    if (!result.ok) {
      throw this._fail(result.reason, result.reason, result.reason === "PENDING_ACTION_NOT_FOUND" ? 404 : 403);
    }
    return result.record;
  }
}

module.exports = ConfirmationHandler;
