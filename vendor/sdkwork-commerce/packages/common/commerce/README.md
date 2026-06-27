# common/commerce

Framework-independent commerce foundation packages.

## Package Layers

- `sdkwork-commerce-contracts`: canonical catalog, cart, address, checkout, order, payment, refund, fulfillment, shipment, membership, recharge, wallet, coupon, invoice, inventory, report, audit, API, table, and operationId contracts.
- `sdkwork-commerce-rpc-contracts`: canonical gRPC/protobuf contracts for commerce app and backend service surfaces.
- `sdkwork-commerce-sdk-ports`: generated app SDK client shape without importing app-specific SDK packages.
- `sdkwork-commerce-service`: business service over injected generated app SDK clients.
- `sdkwork-commerce-runtime`: deployment mode, environment, feature flags, and service composition.

Dependency direction is one-way:

```text
runtime -> service -> sdk-ports -> contracts
```

Commerce owns product catalog, stock reservations, cart, address snapshots, checkout sessions, orders, payments, refunds, fulfillments, memberships, recharges, wallet accounts, immutable ledger entries, coupons, invoices, idempotency, reconciliation, and audit semantics. IAM remains responsible for users, tenants, organizations, sessions, permissions, and token context.

No package in this domain may import React UI, Tauri host APIs, Java implementation details, Rust implementation details, or a concrete generated application SDK.
