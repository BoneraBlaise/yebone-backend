# Delivery Configuration (Phase 8.3)

**Tag:** `delivery-configuration-v1`  
**Status:** Delivery MVP complete — frozen

Phase 8.3 centralizes all delivery feature toggles under Super Admin control. Configuration is persisted outside `.env`, survives restarts and deployments, and applies immediately without code changes or application restarts.

## Module location

```
marketplace/delivery/configuration/
  DeliveryConfigurationPlatform.js
  DeliveryConfigStore.js
  FeatureFlagService.js
  DeliveryOperationGuard.js
  DeliveryConfigValidation.js
  DeliveryConfigAnalytics.js
  DeliveryAdminAccess.js
  DeliverySettingsDefaults.js
  index.js
model/deliveryConfiguration.js
data/delivery-configuration/   # file fallback (settings.json, audit.json)
```

## Persistence

| Layer | Purpose |
|-------|---------|
| MongoDB `DeliveryConfiguration` | Primary store (singleton document) |
| File fallback | `data/delivery-configuration/` when Mongo unavailable |
| Memory | Tests via `useMemoryOnly: true` |

Latest configuration loads at startup (`initializeSync` + Mongo reload on connect).

## API

Base: `/api/v2/marketplace/delivery`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/configuration` | Super Admin | Current settings |
| PUT | `/configuration` | Super Admin | Update settings + audit |
| GET | `/configuration/audit` | Super Admin | Audit history |
| GET | `/configuration/metrics` | Super Admin | Observability counters |
| GET | `/features` | Public | Feature flag snapshot |
| GET | `/checkout-options` | Public | Checkout delivery options |

### Default settings

| Setting | Default |
|---------|---------|
| Vendor Delivery | Enabled |
| Customer Pickup | Enabled |
| Yebone Delivery | **Disabled** |
| Live Tracking | Disabled |
| ETA | Disabled |
| Manual Assignment | Enabled |
| Auto Assignment | Disabled |
| Courier/Customer Phone Visibility | Disabled |
| Delivery Ratings | Disabled |

## FeatureFlagService

Reusable service — never hardcode flags in platform modules:

- `isVendorDeliveryEnabled()`
- `isCustomerPickupEnabled()`
- `isYeboneDeliveryEnabled()`
- `isLiveTrackingEnabled()`
- `isETAEnabled()`
- `isManualAssignmentEnabled()`
- `isAutoAssignmentEnabled()`
- `isDeliveryRatingsEnabled()`

## Route guards (frozen platform integration)

Guards live at the **route layer** only — `DeliveryPlatform.js` and `CourierPlatform.js` are not modified.

When **Yebone Delivery** is disabled:

- `POST /delivery/` → `403 FEATURE_DISABLED`
- Courier/delivery assignment routes → `403 FEATURE_DISABLED`

When **Manual Assignment** is disabled:

- Assignment routes → `403 FEATURE_DISABLED`

## Super Admin UI

Frontend: `AdminDeliverySettings` at `#admin-delivery` in the existing Super Admin dashboard.

Checkout: `CheckoutDeliveryMethods` reads `/checkout-options` and shows **Yebone Delivery (COMING SOON)** while disabled.

## Audit log

Each change records: setting, old value, new value, admin, timestamp, optional reason.

## Observability

`DeliveryConfigAnalytics` tracks configuration changes, feature usage, disabled feature attempts, rejected courier assignments, and rejected delivery requests.

## Tests

```bash
npm run test:delivery-configuration
npm run verify:delivery-configuration
```

## Enabling Yebone Delivery

1. Super Admin opens **Delivery Settings** in the dashboard
2. Toggle **Yebone Delivery** on and save
3. Checkout immediately shows Yebone Delivery as selectable
4. Delivery and courier assignment APIs accept requests

No deployment, code change, or restart required.

## Frozen modules

Do not modify business logic inside delivery foundation (8.0), tracking (8.1), or courier platform (8.2) cores. Integration is via configuration routes, guards, and public APIs only.

## Delivery MVP

Phases 8.0–8.3 complete the Delivery MVP. Do not begin Pricing Engine, GPS, Affiliate, or Driver App until the next approved roadmap phase.
