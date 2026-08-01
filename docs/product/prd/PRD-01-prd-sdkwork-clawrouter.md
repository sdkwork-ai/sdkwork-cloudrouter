# Superseded Claw Router Detailed PRD

Status: superseded
Owner: SDKWork maintainers
Updated: 2026-07-31

This stable path is retained for existing links. Its migrated route, module,
database, and product statements are no longer authoritative.

Use the active [Claw Router PRD](PRD.md) for product scope and
[technical architecture](../../architecture/tech/TECH_ARCHITECTURE.md) for API,
SDK, persistence, Payment ownership, security, and deployment boundaries.

In particular, `/admin/channel` is retired. Current AI supplier administration
is under `/admin/upstream/**`; Payment channel administration is under
`/admin/payments/channels` and is composed from the Payment-owned SDK and UI
packages.
