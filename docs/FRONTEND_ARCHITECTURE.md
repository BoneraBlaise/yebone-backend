# Yebone — Frontend Architecture

**Status:** Permanent UI architecture standard for all Yebone development  
**Checkpoint baseline:** `development-checkpoint-phase4`  
**Production UI:** `src/App.js` (legacy shell — single source of truth)

---

## Core Philosophy

### Implement Once

Every page, flow, and feature is built **one time** in **one codebase**.

- No separate desktop web project
- No separate mobile web project
- No parallel customer, vendor, or admin UI stacks in production
- No duplicate components for the same purpose

If a page exists in `App.js`, it is the canonical page. Do not rebuild it elsewhere.

### Responsive by Default

Every new or upgraded page must work on:

| Device class | Breakpoint token | Min width |
|--------------|------------------|-----------|
| Mobile | `mobile` | &lt; 640px |
| Tablet | `tablet` | 768px |
| Laptop | `laptop` | 1024px |
| Desktop | `desktop` | 1280px |
| Wide | `wide` | 1536px |

Use `src/design-system/responsive/useBreakpoint.js` and `ResponsiveEngine.js` — not ad-hoc pixel checks scattered across pages.

Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) aligned with design tokens in `src/design-system/tokens/index.js`.

---

## Production Baseline

### What is live

| Layer | Path | Role |
|-------|------|------|
| App shell | `src/App.js` | Route registration, bootstrapping, layout wrapper |
| Routes | `src/routes/`, `src/routes/ShopRoutes`, `src/routes/AdminRoutes` | Page entry points |
| Pages | `src/pages/` | Route-mounted page components |
| Features | `src/components/` | Domain UI (Shop, Products, Payment, Admin, etc.) |
| State | `src/redux/` | Global Redux store |
| Design system | `src/design-system/` | Tokens, layouts, components, theme |
| Layout | `src/components/Layout/AppLayout.jsx` | Customer-facing shell |
| Dashboard | `src/components/Dashboard/DashboardLayout.jsx` | Shared admin/vendor dashboard shell |

### What is archived (do not wire)

Documented in `src/archive/ARCHIVE_MANIFEST.md`:

- `src/customer-ui/` — unwired mock/alternate customer stack
- `src/vendor-ui/` — unwired alternate vendor portal
- `src/admin-ui/` — unwired alternate admin portal
- `src/ai-experience-ui/` — unwired AI experience shell

These directories must **not** be mounted in `App.js` until explicitly promoted through Inspect → Reuse → Upgrade → Consolidate → Freeze.

---

## Layout System

Use reusable layouts — never rebuild chrome per page.

| Layout | Use for |
|--------|---------|
| `AppLayout` | Customer marketplace pages (home, products, checkout, profile) |
| `DashboardLayout` | Seller and admin dashboards (`mode="vendor"` or admin variant) |
| `VendorDashboardLayout` | Seller dashboard wrapper |
| `Container` / `SectionTitle` (`src/components/ui/`) | Page sections and content width |

### Rules

- One header/footer strategy per audience (customer vs seller vs admin)
- Sidebar navigation collapses on tablet/mobile — never hide critical nav without a mobile menu
- Dashboard pages share the same responsive sidebar pattern (`VendorSidebar`, admin sidebar)
- Checkout, profile, settings, and auth pages use the same spacing and container tokens

---

## Design System

All UI must consume the Yebone design system:

| Resource | Path |
|----------|------|
| Tokens | `src/design-system/tokens/index.js` |
| Colors | `src/design-system/colors.js`, Tailwind `yebone-*` |
| Typography | `src/design-system/typography.js` |
| Components | `src/design-system/components/`, `src/components/ui/` |
| Theme | `src/design-system/theme/ThemeProvider.jsx` |
| Global styles | `src/design-system/global.css`, `src/App.css` |

Do not introduce one-off color hex values when a token exists.

---

## Responsive Navigation

| Context | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Customer | Full navbar + categories | Condensed nav + drawers | Hamburger menu, bottom-friendly tap targets |
| Seller dashboard | Persistent sidebar | Collapsible sidebar | Drawer / overlay sidebar |
| Admin dashboard | Persistent sidebar | Collapsible sidebar | Drawer / overlay sidebar |

Navigation config lives in existing components — do not create a third routing scheme (`application/routeConfig.js` is planned shell only, not production).

---

## Domain Coverage (single implementation each)

Future phases must upgrade these existing surfaces — not duplicate them:

| Domain | Production pages / components |
|--------|------------------------------|
| **Authentication** | `LoginPage`, `SignupPage`, `ShopLoginPage`, `ShopCreate`, activation pages |
| **Marketplace** | `HomePage`, `ProductsPage`, `ProductDetailsPage`, category/product cards |
| **Checkout** | `CheckoutPage`, `PaymentPage`, `OrderSuccessPage` |
| **Profile** | `ProfilePage`, `UserInbox`, order tracking pages |
| **Vendor / Seller** | `ShopDashboardPage`, product/order/settings/withdraw pages under `src/pages/Shop/` |
| **Admin** | `AdminDashboard*` pages and `src/components/Admin/` |
| **Settings** | `ShopSettingsPage`, profile settings in customer profile |

---

## Component Reuse Rules

1. **Extend** existing components before creating new ones
2. **Shell components** (`ProductCardShell`, `Container`, `Badge`) wrap domain content
3. **No MobileProductCard + ProductCard parallel** unless one wraps the other responsively — prefer one card with breakpoint variants
4. **Redux actions** remain the API integration layer — avoid inline axios in new pages (legacy inline calls may be consolidated over time)
5. **AI UI** (`src/components/ai/`) supplements pages — does not replace core page implementations

---

## Responsive Implementation Checklist

Before merging any UI change:

- [ ] Renders correctly at 375px (mobile)
- [ ] Renders correctly at 768px (tablet)
- [ ] Renders correctly at 1280px (desktop)
- [ ] Touch targets ≥ 44px on mobile interactive elements
- [ ] No horizontal scroll on mobile except intentional carousels
- [ ] Images use responsive sizing (`object-cover`, max-width 100%)
- [ ] Forms usable on mobile (single column, readable labels)
- [ ] Dashboard tables scroll or stack on small screens
- [ ] Uses design tokens — not hardcoded layout magic numbers

---

## Backend Integration

| Config | Path |
|--------|------|
| API base | `src/config/serverConfig.js` |
| Auth tokens | `src/config/authStorage.js`, `src/config/setupApiClient.js` |
| Seller routes | Bearer `seller_token` on `/shop/` URLs |
| Customer routes | Bearer `token` cookie |

Frontend architecture does not duplicate backend modules. UI calls existing v2 APIs until a phase explicitly upgrades integration.

---

## Phase Integration Rules

| Phase | Frontend rule |
|-------|---------------|
| Orders (5) | Upgrade checkout, order details, seller order pages — one responsive implementation each |
| Search (6) | Extend `ProductsPage` and search UI — no new parallel discovery stack |
| Notifications (7) | Extend existing header/panel patterns — no second notification system |
| All phases | Follow Inspect → Reuse → Upgrade → Consolidate → Freeze |

---

## Anti-Patterns (Forbidden)

- Mounting `customer-ui/`, `vendor-ui/`, or `admin-ui/` routes alongside `App.js`
- Building `DesktopCheckout.jsx` and `MobileCheckout.jsx` as separate pages
- Creating a new Redux store or parallel routing root
- Copy-pasting page layouts instead of using `AppLayout` / `DashboardLayout`
- Shipping non-responsive pages with a plan to "fix mobile later"
- Introducing React Native or separate mobile web repo for the same feature

---

## Summary

**One app. One route tree. One design system. Every screen size.**

All future Yebone frontend work must comply with this document. Non-compliant UI must be consolidated before a phase is frozen.
