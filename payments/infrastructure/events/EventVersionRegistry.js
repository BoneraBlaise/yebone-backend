const EventValidationError = require("./errors/EventValidationError");

/**
 * Event payload version registry — schema evolution metadata only.
 * No runtime migrations; compatibility checks for future subscribers.
 */
class EventVersionRegistry {
  constructor() {
    this.versions = new Map();
  }

  registerVersion(eventType, version, metadata = {}) {
    const type = this._normalizeType(eventType);
    const normalizedVersion = this._normalizeVersion(version);
    const entry = Object.freeze({
      eventType: type,
      version: normalizedVersion,
      description: metadata.description || null,
      compatibleWith: (metadata.compatibleWith || []).map((v) => this._normalizeVersion(v)),
      deprecated: metadata.deprecated === true,
      registeredAt: new Date().toISOString(),
    });

    const list = this.versions.get(type) || [];
    if (list.some((item) => item.version === normalizedVersion)) {
      throw new EventValidationError(`Version already registered: ${type}@${normalizedVersion}`);
    }

    list.push(entry);
    list.sort((a, b) => this._compareVersions(a.version, b.version));
    this.versions.set(type, list);
    return entry;
  }

  resolveVersion(eventType, version) {
    const type = this._normalizeType(eventType);
    const normalizedVersion = this._normalizeVersion(version);
    const entry = (this.versions.get(type) || []).find((item) => item.version === normalizedVersion);
    if (!entry) {
      throw new EventValidationError(`Unknown event version: ${type}@${normalizedVersion}`);
    }
    return entry;
  }

  latestVersion(eventType) {
    const type = this._normalizeType(eventType);
    const list = this.versions.get(type) || [];
    if (list.length === 0) {
      return null;
    }
    return list[list.length - 1].version;
  }

  compatibility(eventType, consumerVersion, envelopeVersion) {
    const type = this._normalizeType(eventType);
    const consumer = this._normalizeVersion(consumerVersion);
    const envelope = this._normalizeVersion(envelopeVersion);

    if (consumer === envelope) {
      return true;
    }

    const envelopeEntry = this.resolveVersion(type, envelope);
    if (envelopeEntry.compatibleWith.includes(consumer)) {
      return true;
    }

    const consumerEntry = this.resolveVersion(type, consumer);
    return consumerEntry.compatibleWith.includes(envelope);
  }

  list(eventType) {
    if (!eventType) {
      return [...this.versions.entries()].flatMap(([type, entries]) =>
        entries.map((entry) => ({ ...entry, eventType: type }))
      );
    }
    return [...(this.versions.get(this._normalizeType(eventType)) || [])];
  }

  registerDefaults() {
    const defaults = [
      ["PAYMENT_CREATED", "1.0", { description: "Initial payment created payload" }],
      ["PAYMENT_CAPTURED", "1.0", { description: "Initial capture payload" }],
      ["TRANSACTION_CREATED", "1.0", { description: "Initial transaction payload" }],
      [
        "PAYMENT_CAPTURED",
        "2.0",
        {
          description: "Capture payload with provider metadata",
          compatibleWith: ["1.0"],
        },
      ],
    ];

    for (const [eventType, version, metadata] of defaults) {
      if (!this.latestVersion(eventType)) {
        this.registerVersion(eventType, version, metadata);
      } else if (!this.list(eventType).some((entry) => entry.version === version)) {
        this.registerVersion(eventType, version, metadata);
      }
    }

    return this.list();
  }

  _normalizeType(eventType) {
    return String(eventType || "").trim().toUpperCase();
  }

  _normalizeVersion(version) {
    return String(version || "").trim();
  }

  _compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }
}

module.exports = EventVersionRegistry;
