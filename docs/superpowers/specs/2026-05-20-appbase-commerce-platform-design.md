# Archived

Superseded for **Cloud Router** implementation. Cloud Router no longer integrates via legacy commerce service facades or deleted monolithic commerce SDK families.

**Live Cloud Router authority:**

- Backend: `getCloudRouterBackendSdkClient().<domain>.*` via `@sdkwork/cloudroutes-pc-commons/sdk-clients`
- Console T1: `@sdkwork/account-*`, `@sdkwork/membership-*`, `@sdkwork/promotion-*`, `@sdkwork/payment-*`, `@sdkwork/order-*` via `domain-service-providers.ts`
- Governance: `node scripts/check-commerce-debt.mjs`

Historical appbase commerce design (other repositories): see archived copy under `docs/architecture/tech/TECH-2026-05-20-appbase-commerce-platform-design.md` header only.
