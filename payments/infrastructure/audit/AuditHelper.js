const crypto = require("crypto");
const AuditConfig = require("./AuditConfig");
const { isKnownActorType, isKnownResourceType, isValidAction } = require("./AuditEvent");

class AuditHelper {
  static generateAuditId() {
    return `${AuditConfig.auditIdPrefix}_${crypto.randomUUID()}`;
  }

  static normalizeId(value, fieldName) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new Error(`${fieldName} is required`);
    }
    return normalized;
  }

  static normalizeOptional(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return String(value).trim();
  }

  static validateActorType(actorType) {
    const value = String(actorType || AuditConfig.defaultActorType).trim().toUpperCase();
    if (!isKnownActorType(value)) {
      throw new Error(`Invalid actorType: ${actorType}`);
    }
    return value;
  }

  static validateResourceType(resourceType) {
    const value = String(resourceType).trim().toUpperCase();
    if (!isKnownResourceType(value)) {
      throw new Error(`Invalid resourceType: ${resourceType}`);
    }
    return value;
  }

  static validateAction(action) {
    const value = String(action).trim().toUpperCase();
    if (!isValidAction(value)) {
      throw new Error(`Invalid action: ${action}`);
    }
    return value;
  }

  static estimatePayloadSize(payload) {
    try {
      return Buffer.byteLength(JSON.stringify(payload ?? {}), "utf8");
    } catch {
      return AuditConfig.maxPayloadBytes + 1;
    }
  }
}

module.exports = AuditHelper;
