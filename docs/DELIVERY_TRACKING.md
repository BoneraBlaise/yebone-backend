# Yebone Delivery Tracking

**Phase:** 8.1 — Delivery Tracking  
**Tag:** `delivery-tracking-v1`  
**Baseline:** `delivery-foundation-v1`  
**Branch:** `feature/delivery-tracking`

Related: [DELIVERY_MODULE.md](./DELIVERY_MODULE.md) · [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## Overview

Phase 8.1 adds delivery visibility through an append-only tracking timeline. Customers and vendors can see where a delivery is within its lifecycle without live GPS, maps, or notifications.

The tracking layer extends `DeliveryPlatform` without changing foundation APIs or business rules.

---

## Components

| Component | Path | Responsibility |
|-----------|------|------------------|
| `DeliveryTrackingTimeline` | `marketplace/delivery/tracking/` | Append-only event store |
| `TrackingService` | `marketplace/delivery/tracking/` | Record and retrieve timeline events |
| `DeliveryTrackingAnalytics` | `marketplace/delivery/tracking/` | Tracking observability metrics |

---

## Timeline Event

Each event contains:

| Field | Description |
|-------|-------------|
| `eventId` | Unique event identifier |
| `deliveryId` | Associated delivery |
| `status` | Lifecycle status at event time |
| `timestamp` | ISO-8601 event time |
| `actor` | User or system actor |
| `note` | Human-readable description (optional) |

Example progression:

1. Delivery Created (`PENDING`)
2. Confirmed (`CONFIRMED`)
3. Courier Assigned (`ASSIGNED`)
4. Package Picked Up (`PICKED_UP`)
5. In Transit (`IN_TRANSIT`)
6. Delivered (`DELIVERED`)

---

## Timeline Rules

- **Append-only** — events are never edited or deleted
- **Latest status** — derived from the newest timeline event
- **Automatic recording** — every valid status transition generates a timeline event
- **Manual events** — `recordTrackingEvent()` for operational notes

---

## Platform Methods

```javascript
platform.getTrackingTimeline(deliveryId)
platform.getTrackingTimelineByTrackingNumber(trackingNumber)
platform.getLatestTracking(deliveryId)
platform.getCurrentTrackingStatus(deliveryId)
platform.getTrackingHistory(deliveryId)
platform.recordTrackingEvent(deliveryId, { status, actor, note })
```

---

## API Endpoints (New)

Base path: `/api/v2/marketplace/delivery`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tracking/:trackingNumber/timeline` | Public | Full timeline by tracking number |
| GET | `/:deliveryId/tracking` | Public | Timeline by delivery id |
| GET | `/:deliveryId/status` | Public | Latest tracking status |

Existing foundation endpoints remain unchanged.

---

## Observability

`DeliveryTrackingAnalytics` tracks:

- Tracking lookups
- Timeline events recorded
- Average status history length
- Average delivery progression duration
- Timeline retrieval latency

Exposed via `platform.getMetrics().tracking`.

---

## Out of Scope

- Live GPS / Google Maps
- Route optimization / ETA
- Push notifications / SMS / email
- Driver mobile app
- Fleet management
- External courier integrations

---

## Verification

```bash
npm run test:delivery-tracking
npm run verify:delivery-tracking
```

---

## Integration Notes

Frozen modules (`orders/`, `payments/`, `search/`, `catalog/`, `vendor/`, `marketplace/core/`, `marketplace/ai/`) are untouched. Delivery foundation behavior and APIs remain compatible.

Do not begin Courier Management until explicitly scheduled.
