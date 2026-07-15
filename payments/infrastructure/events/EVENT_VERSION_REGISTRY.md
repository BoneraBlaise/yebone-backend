# Event Version Registry — Module 5 Closure

**Branch:** `feature/payment-foundation`  
**Status:** Architecture only — no runtime migrations

---

## Purpose

Track payload schema versions per event type so subscribers can evolve safely.

---

## API

| Method | Description |
|--------|-------------|
| `registerVersion(eventType, version, metadata)` | Register schema version |
| `resolveVersion(eventType, version)` | Lookup version metadata |
| `latestVersion(eventType)` | Highest registered semver |
| `compatibility(eventType, consumerVersion, envelopeVersion)` | Can consumer read envelope? |
| `list(eventType?)` | List registered versions |

---

## Version Entry

```javascript
{
  eventType: "PAYMENT_CAPTURED",
  version: "2.0",
  description: "Capture payload with provider metadata",
  compatibleWith: ["1.0"],
  deprecated: false,
  registeredAt: "2026-..."
}
```

---

## Compatibility Rules

1. Same version → compatible
2. Envelope version lists consumer in `compatibleWith` → compatible
3. Consumer version lists envelope in `compatibleWith` → compatible
4. Otherwise → incompatible (subscriber should reject or use adapter)

**No automatic payload migration** — adapters live in future modules.

---

## Default Registrations

| Event | Versions |
|-------|----------|
| `PAYMENT_CREATED` | 1.0 |
| `PAYMENT_CAPTURED` | 1.0, 2.0 (2.0 compatible with 1.0) |
| `TRANSACTION_CREATED` | 1.0 |

---

## Future Usage

```javascript
const registry = new EventVersionRegistry();
registry.registerDefaults();

if (!registry.compatibility(envelope.eventType, subscriberVersion, envelope.version)) {
  // skip or route to version adapter
}
```

Envelope `version` field (from `EventBusConfig.envelopeVersion`) remains the transport schema version; event payload versions are registered separately per `eventType`.

---

## File

`EventVersionRegistry.js`
