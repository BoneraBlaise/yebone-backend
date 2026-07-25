# Control Centers — Configuration Flow (Backend)

See also: `docs/PRE_PHASE15_CONTROL_CENTERS_ARCHITECTURE.md`

## Dynamic Reads

All admin and public consumers should read configuration via API:

- Aggregated: `GET /api/v2/marketplace/integration/platform-configuration`
- Public AI products: `GET /api/v2/marketplace/integration/platform-configuration/public/ai-products`
- Public banners: `GET /api/v2/marketplace/integration/platform-configuration/public/banners`

## Delivery Pricing Extension

`DeliverySettingsDefaults` now includes `pricing`, `zones`, and `partners`. Validation allows object patches for these keys without breaking feature-flag toggles.

## Audit Trail

Configuration changes record to:

1. `PlatformConfiguration.auditLog` (MongoDB)
2. `PlatformAuditAdapter` (integration audit service)

## Freeze Tag

After verification and commits: `pre-phase15-control-centers-v1`
