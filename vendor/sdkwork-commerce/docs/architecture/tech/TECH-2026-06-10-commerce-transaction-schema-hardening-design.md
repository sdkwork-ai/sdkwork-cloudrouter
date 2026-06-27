> Migrated from `docs/superpowers/specs/2026-06-10-commerce-transaction-schema-hardening-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Commerce Transaction Schema Hardening Design

## Objective

Audit and harden the SDKWork Commerce transaction spine so order, payment,
cart, checkout, inventory reservation, fulfillment, shipment, delivery, and
refund storage can be judged against industry-aligned table design capability.

The first iteration creates a durable audit and quality-gate foundation. It
does not redesign every commerce table, does not rename existing tables, and
does not hand-edit generated SDK output. It identifies the current coverage,
codifies P0/P1 invariants, and then uses focused follow-up iterations to close
the highest-risk schema and implementation gaps.

## Standards

This design follows:

- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/DATABASE_SPEC.md`
- `../sdkwork-specs/DOMAIN_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../sdkwork-specs/RUST_CODE_SPEC.md`
- `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`
- `../sdkwork-specs/DOCUMENTATION_SPEC.md`

## Current Evidence

The current workspace already owns the commerce transaction domain in
`sdkwork-commerce`:

- Root README declares commerce ownership for product catalog, inventory, cart,
  checkout, order, payment, refund, fulfillment, wallet, billing, invoice,
  promotion, coupon, membership, entitlement, reporting, Rust storage, HTTP
  contracts, RPC contracts, PC React packages, and SDK generation inputs.
- `crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql`
  contains transaction-spine tables for inventory, cart, checkout, order,
  fulfillment, shipment, digital delivery, payment, refund, and related
  operational tables.
- `tools/commerce_schema_quality_gate.mjs` already validates OpenAPI ownership,
  required operation ids, problem-detail schemas, dual-token security, selected
  shop schemas, and selected database markers.
- `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`
  already asserts many storage markers, indexes, repository mappings, and
  payment naming rules.
- Existing generated SDK and OpenAPI outputs are present under `generated/` and
  `sdks/`; they remain generated artifacts and are not edited by hand.

## Scope

First-iteration scope:

- Audit and gate table-design capability for:
  - `commerce_cart`
  - `commerce_cart_item`
  - `commerce_checkout_session`
  - `commerce_checkout_line`
  - `commerce_checkout_quote`
  - `commerce_inventory_stock`
  - `commerce_inventory_reservation`
  - `commerce_inventory_movement`
  - `commerce_order`
  - `commerce_order_item`
  - `commerce_order_amount_breakdown`
  - `commerce_order_address_snapshot`
  - `commerce_order_event`
  - `commerce_order_cancellation`
  - `commerce_fulfillment_order`
  - `commerce_fulfillment_item`
  - `commerce_shipment`
  - `commerce_shipment_package`
  - `commerce_shipment_tracking_event`
  - `commerce_digital_delivery`
  - `commerce_payment_intent`
  - `commerce_payment_attempt`
  - `commerce_payment_capture`
  - `commerce_payment_webhook_event`
  - `commerce_payment_webhook_delivery`
  - `commerce_payment_statement`
  - `commerce_payment_statement_item`
  - `commerce_payment_reconciliation_run`
  - `commerce_payment_reconciliation_item`
  - `commerce_payment_fee`
  - `commerce_payment_dispute`
  - `commerce_payment_dispute_event`
  - `commerce_refund`
  - `commerce_refund_item`
  - `commerce_refund_attempt`
  - `commerce_refund_event`
- Extend quality gates and storage tests so the repository can keep checking
  these tables as the schema evolves.
- Close only P0/P1 gaps discovered by those checks, with minimal migration and
  Rust storage changes.

Out of scope for the first iteration:

- UI changes.
- Product catalog redesign.
- IAM/appbase route ownership.
- Broad generated SDK edits.
- Physical table renames.
- Full WMS, cross-border customs, tax engine, warehouse wave picking, or
  carrier billing systems unless current commerce tables already expose the
  capability boundary.

## Capability Matrix

### Cart And Checkout

Industry-aligned capability requires:

- Tenant and organization ownership on every cart and checkout fact table.
- Stable owner identity for user, anonymous, organization, or account carts.
- Cart line uniqueness by cart, SKU, and selected option/configuration.
- Product, SKU, price, seller/shop, and promotion snapshots at checkout time.
- Checkout session expiration and quote expiration.
- Idempotent checkout submission.
- Inventory reservation linkage before order confirmation when stock is
  constrained.
- Currency-safe string decimal representation in APIs and storage.

The first iteration should verify that cart and checkout tables have the
required ownership columns, status columns, snapshot JSON fields where facts
depend on mutable product data, expiration fields for sessions/quotes, and
indexes for tenant-owner-status and session-line lookup.

### Inventory Reservation

Industry-aligned capability requires:

- Stock by tenant, SKU, warehouse, and optionally shop or fulfillment node.
- Available, locked, reserved, and sold quantities expressed as integer or
  decimal-safe quantities, never floating point.
- Versioned stock updates for concurrent reservation and release.
- Reservation rows tied to order or checkout source and expiration.
- Movement ledger rows for every durable stock change.
- Source type/source id for order, refund, manual adjustment, reconciliation,
  import, or system release.

The first iteration should verify that stock, reservation, and movement tables
have tenant scope, SKU/warehouse lookup, status, expiration, source linkage, and
movement indexes.

### Order

Industry-aligned capability requires:

- One immutable business order number per tenant.
- Buyer, tenant, organization, shop, and channel context.
- Order status and payment/fulfillment/refund state separated enough to avoid a
  single overloaded status field.
- Amount breakdown rows for item subtotal, discount, shipping fee, tax,
  payable, paid, refunded, and currency.
- Item rows with SKU/product/shop snapshots, quantity, unit price, discount,
  tax, and fulfillment/refund status.
- Address snapshots that do not depend on mutable user address records.
- Order event rows for state changes, actor, reason, request identity, and
  idempotency.
- Cancellation rows for reason, initiator, refund policy, and state.
- Query indexes for buyer order list, order number lookup, order events, and
  cancellation lookup.

The first iteration should verify these invariants and identify whether missing
state dimensions are schema gaps or implementation-only gaps.

### Payment And Refund

Industry-aligned capability requires:

- Payment intent as the SDKWork payment aggregate for an order or business
  source.
- Payment attempts for provider-level requests and retries.
- Provider account/channel/routing tables to avoid hard-coding provider logic.
- External native trade ids and SDKWork out trade ids with unique indexes.
- Idempotent operation attempt records for provider commands.
- Capture records for delayed capture providers.
- Webhook event and webhook delivery rows with event id, nonce, status,
  processed time, payload hash or raw payload policy, and replay support.
- Statements, statement items, reconciliation runs, and reconciliation items.
- Fee rows for payment and refund fees.
- Dispute and dispute event rows.
- Refund, refund item, refund attempt, and refund event rows.
- All amounts stored as string decimals or database decimal equivalents and
  serialized as strings in APIs.

The first iteration should prioritize payment and refund because these tables
are L3-risk: funds, external provider callbacks, idempotency, reconciliation,
and auditability must be checked before claiming industry alignment.

### Fulfillment, Shipment, And Delivery

Industry-aligned capability requires:

- Fulfillment order rows that allow order-level and item-level fulfillment
  decomposition.
- Fulfillment item rows for partial shipment, split shipment, backorder, or
  digital delivery.
- Shipment rows with carrier code, tracking number, status, shipping method,
  service level, ship-from/ship-to snapshots, and timestamps.
- Shipment package rows with package number, weight, dimensions, item mapping,
  and label metadata where supported.
- Tracking event rows with event time, event type, event status, location, raw
  provider payload, and ingestion metadata.
- Digital delivery rows for entitlement, download, activation, license, or
  virtual goods fulfillment.
- Indexes for fulfillment status, shipment tracking number, package lookup, and
  tracking event time.

The first iteration should harden the existing logistics persistence added by
recent work and gate shipment/fulfillment facts before expanding advanced WMS
features.

## Priority Model

P0 issues block completion claims:

- Money values stored or exposed as floating point.
- Payment webhook events without provider-scoped unique event or nonce
  constraints.
- Payment/refund/provider operations without idempotency.
- Order or payment tables missing tenant isolation.
- Order numbers or provider trade identifiers without tenant-scoped unique
  constraints.
- Generated SDK output edited by hand instead of regenerating from source
  contracts.

P1 issues must be planned in the current hardening iteration:

- Missing order amount breakdown facts.
- Missing order address snapshots.
- Missing order event or cancellation facts.
- Missing inventory reservation expiration and release tracking.
- Missing fulfillment item and shipment package facts.
- Missing tracking event time index.
- Missing payment reconciliation, fee, capture, dispute, or refund event facts.
- Missing query indexes for the standard app/backend workflows.

P2 issues may be scheduled after the first hardening iteration:

- Warehouse wave picking.
- Carrier billing.
- Cross-border customs.
- Advanced tax jurisdiction engine.
- Multi-leg shipments.
- Return merchandise authorization beyond refund facts.
- Dedicated reporting projections where source-of-record facts already exist.

## Implementation Approach

The implementation should proceed test-first after this design is approved and
an implementation plan exists:

1. Extend table inventory tests in
   `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`
   so every transaction-spine table is categorized by capability and risk.
2. Extend `tools/commerce_schema_quality_gate.mjs` with full required database
   markers for cart, checkout, inventory, order, fulfillment, shipment,
   payment, and refund.
3. Add structural assertions for P0/P1 invariants: tenant scope, business unique
   keys, idempotency columns, external provider unique indexes, event tables,
   amount string columns, status indexes, and expiration indexes.
4. Run the focused tests and inspect failures.
5. Patch only the source migration and authored Rust storage/repository code
   needed to satisfy the highest-risk missing invariants.
6. If OpenAPI or SDK method changes are required, update source contract/tooling
   and regenerate through repository scripts. Do not edit generated SDK output by
   hand.
7. Re-run focused verification before broader verification.

## Data Evolution

The first iteration treats existing `commerce_*` table names as canonical for
this repository. It does not rename physical tables. Any schema additions must
follow expand-first evolution:

- Add nullable or defaulted columns first.
- Add indexes without changing existing semantics.
- Add tests proving both old and new code paths can read current rows where
  relevant.
- Avoid destructive column deletion.
- Record any later breaking migration separately with rollback and backfill
  instructions.

If a table is already sufficient but the gate does not prove it, the fix is a
test or quality-gate improvement, not a schema change.

## Error Handling And Operational Semantics

Payment, order, refund, inventory, and shipment commands must be retriable
without duplicating business effects. Table design must support:

- idempotency keys scoped by tenant and command/source;
- event rows for state transitions;
- provider callback deduplication;
- optimistic concurrency or version columns where mutable aggregates are
  updated under concurrent access;
- replayable webhook or tracking ingestion;
- reconciliation rows for external payment truth;
- audit-safe payload storage with sensitive fields hashed, masked, or moved to
  approved secure storage where needed.

## Testing And Verification

Focused verification for implementation:

- `pnpm test:node`
- `cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml`

Broader verification when source contracts, generated SDK inputs, or cross-crate
interfaces change:

- `pnpm sdk:check`
- `pnpm test:vitest`
- `cargo test --workspace`
- `pnpm verify`

Completion evidence must include the exact commands run and the important
outputs. A passing quality gate is required before claiming that the schema
capability is industry-aligned for the audited slice.

## Acceptance Criteria

- The transaction-spine table inventory is explicit and covered by tests.
- P0 payment, refund, order, inventory, cart, checkout, fulfillment, shipment,
  and delivery invariants are encoded in tests or quality gates.
- Existing schema facts are not over-claimed; unsupported industry capabilities
  are marked as P2 or out of scope.
- Any P0/P1 schema gaps found by the new tests are fixed in source migrations or
  authored storage code, not generated artifacts.
- Generated SDK outputs remain untouched unless regenerated through approved
  repository scripts.
- Verification output is captured before completion is reported.

## Review Note

The superpowers brainstorming workflow recommends dispatching a
spec-document-reviewer subagent after writing this document. If the current tool
environment exposes an approved subagent tool, this design should be reviewed
there with the repository evidence above. If no such tool is available, the
design should proceed with inline review and user approval before invoking the
implementation planning workflow.

