# YEBO AI — Commerce Agent (Phase 13)

**Tag:** `yebo-ai-commerce-agent-v1`  
**Baseline:** `yebo-ai-memory-v1` + `property-mobility-v1`  
**Status:** Implemented, tested, verified, frozen

Related: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [AI_SECURITY.md](./AI_SECURITY.md) · [AI_TOOL_CONTRACTS.md](./AI_TOOL_CONTRACTS.md)

---

## Overview

Phase 13 evolves YEBO AI from a read-only assistant into a **secure Commerce Agent**. Read tools execute immediately. Write tools require explicit user confirmation through a server-issued pending action protocol.

Architecture remains:

```
Gateway → Planner → Capability Registry → Tool Registry → Platform APIs
```

No direct MongoDB access. No duplicated business logic.

---

## Tier A — Read Tools (immediate execution)

| Tool ID | Intent | Permission | Platform API |
|---------|--------|------------|--------------|
| `property.search` | `property_search` | public | `PropertyMobilitySearchBridge.searchListings()` |
| `property.listing.get` | `property_listing_details` | public | `ListingService.getPublicListing()` |
| `growth.recommend` | `growth_recommend` | public | `GrowthCommerceAIService.recommend()` |
| `seller.inventory.read` | `seller_inventory` | vendor | `InventoryService.listInventory()` |

---

## Tier B — Write Tools (confirmation required)

| Tool ID | Actions | Permission |
|---------|---------|------------|
| `property.listing.manage` | `create_draft`, `publish` | vendor |

Writes **never** execute on the first planner turn. Direct tool mutation throws `MUTATION_REQUIRES_CONFIRMATION` unless `context.allowMutation === true` (set only by `ConfirmationHandler` after all validation gates pass).

---

## Tier C — Infrastructure

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AIAuthContext` | `marketplace/ai/auth/AIAuthContext.js` | Resolve `userId`, `vendorId`, `role` from existing auth middleware |
| Permission matrix v2 | `BaseTool.checkAuthorization()` | `public`, `authenticated`, `vendor` |
| `AIPendingActionService` | `marketplace/ai/confirmation/` | In-memory pending actions, HMAC checksum, 15 min TTL |
| `ConfirmationHandler` | `marketplace/ai/confirmation/` | 10-step validation gate before write execution |
| `AIActionAudit` | `marketplace/ai/audit/` | Emits lifecycle events via `PlatformAuditAdapter` |

---

## Permission Model

| Scope | Requirement |
|-------|-------------|
| `public` | No auth |
| `authenticated` | `context.userId` |
| `vendor` | `context.vendorId` |

Backward compatible with Phase 7.2 tools.

---

## Pending Action Lifecycle

1. **REQUESTED** — Planner detects write intent → `AIPendingActionService.create()` → returns `confirmation_required`
2. **CONFIRMED** — User submits confirm triplet → `ConfirmationHandler.validateAndExecute()`
3. **EXECUTED** / **FAILED** — Tool runs through Platform API after consume
4. **CANCELLED** — User submits `cancelActionId`
5. **EXPIRED** — TTL elapsed (default 15 minutes)

Pending actions are **in-memory only** (no database). Conversation-aware via `sessionId` binding.

### Pending action fields

- `pendingActionId` (UUID)
- `sessionId`
- `actionChecksum` (HMAC SHA256)
- `createdAt`, `expiresAt`
- `requestedBy`, `vendorId`
- `toolId`, `action`, `summary`

---

## Confirmation Protocol

### First turn (write intent)

```json
{
  "type": "confirmation_required",
  "message": "Please confirm: Create draft property listing: ...",
  "pendingAction": {
    "pendingActionId": "...",
    "sessionId": "...",
    "actionChecksum": "...",
    "expiresAt": "...",
    "summary": "...",
    "toolId": "property.listing.manage",
    "action": "create_draft"
  }
}
```

### Confirm turn

`POST /api/v2/ai/chat`

```json
{
  "message": "confirm",
  "sessionId": "...",
  "confirmActionId": "...",
  "actionChecksum": "..."
}
```

The client **must not** generate `actionChecksum` — it is server-issued only.

### Cancel turn

```json
{
  "message": "cancel",
  "sessionId": "...",
  "cancelActionId": "..."
}
```

---

## ConfirmationHandler Validation Order

1. Pending exists
2. Status is `pending`
3. TTL valid
4. Session match
5. User/vendor match
6. Vendor match (when bound)
7. Checksum match (HMAC SHA256)
8. Permission matrix
9. Feature flag
10. Ownership (publish)

Only after **all** checks: atomic consume → execute tool.

---

## Security

| Control | Implementation |
|---------|----------------|
| HMAC checksum | `AI_CONFIRMATION_SECRET` + canonical payload hash |
| Replay protection | Atomic consume; status `consumed` rejects reuse |
| TTL | `AI_PENDING_ACTION_TTL_MS` (default 900000 ms) |
| Session binding | `sessionId` must match |
| Vendor binding | `vendorId` on vendor-scoped actions |
| Ownership | Listing owner check on publish |

### Structured error codes

`PENDING_ACTION_EXPIRED`, `PENDING_ACTION_NOT_FOUND`, `REPLAY_DETECTED`, `CHECKSUM_MISMATCH`, `SESSION_MISMATCH`, `USER_MISMATCH`, `VENDOR_MISMATCH`, `FEATURE_DISABLED`, `OWNERSHIP_FAILED`, `PERMISSION_DENIED`, `PENDING_ACTION_CANCELLED`, `MUTATION_REQUIRES_CONFIRMATION`

Expired message: **"This action has expired. Please request it again."**

---

## Audit Lifecycle

Via `PlatformAuditAdapter` (no second audit framework):

| Event | When |
|-------|------|
| `AI_ACTION_REQUESTED` | Pending action created |
| `AI_ACTION_CONFIRMED` | Confirm triplet validated |
| `AI_ACTION_CANCELLED` | User cancelled |
| `AI_ACTION_EXPIRED` | TTL elapsed |
| `AI_ACTION_EXECUTED` | Tool succeeded |
| `AI_ACTION_FAILED` | Tool or validation failed |

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `AI_PENDING_ACTION_TTL_MS` | `900000` | Pending action TTL |
| `AI_CONFIRMATION_SECRET` | dev fallback | HMAC secret |

---

## Verify

```bash
npm run verify:yebo-ai-commerce-agent
```

Runs `test:commerce-agent` + full `verify:yebo-ai-memory` chain. Exit code 0 required.

---

## Frontend (minimal)

- `YIPGatewayClient.confirmAction()` / `cancelAction()` — submit server-issued values only
- `AIPanel` — Confirm/Cancel banner when `pendingAction` is set
- `GatewayAssistantAdapter` — maps `confirmation_required` response type
