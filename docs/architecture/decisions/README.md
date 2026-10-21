# Architecture Decision Records

New ADRs use `ADR-YYYYMMDD-<short-title>.md` in this directory.

Retired layout: `docs/adr/` must not be used for new ADRs.

See `ARCHITECTURE_DECISION_SPEC.md`.

## Active Decisions

- [ADR-20261021-remove-orphaned-chat-http-surface.md](ADR-20261021-remove-orphaned-chat-http-surface.md) - removes the uncontracted `/app/v3/api/chat/*` projection; Chat persistence tables remain the PostgreSQL authority.
- [ADR-20260920-route-surface-single-registry-authority.md](ADR-20260920-route-surface-single-registry-authority.md) - one authority for route-surface membership; the manifest is computed from the merge declaration, not hand-listed.
- [ADR-20260815-composable-pricing-and-billing.md](ADR-20260815-composable-pricing-and-billing.md) - reusable pricing authority, Cloud Router rating/charging ownership, and billability boundary.
- [ADR-20260728-standardize-upstream-supplier-routing.md](ADR-20260728-standardize-upstream-supplier-routing.md) - canonical upstream supplier, account, account-group, credential, routing, and migration model.

Superseded: [ADR-20260730-own-chat-runtime-postgres-authority.md](ADR-20260730-own-chat-runtime-postgres-authority.md) — persistence decision retained, HTTP projection superseded.
