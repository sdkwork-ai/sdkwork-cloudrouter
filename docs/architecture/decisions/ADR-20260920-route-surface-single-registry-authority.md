# ADR-20260920-route-surface-single-registry-authority

Status: proposed
Requirement: REQ-2026-0920
Owner: cloudrouter-platform
Date: 2026-09-20
Specs: `API_ASSEMBLY_SPEC.md`, `COMPONENT_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `TEST_SPEC.md`

## Context

Cloud Router answered `404 route-not-in-manifest` for an entire declared surface
(`/backend/v3/api/ai/*`) while the handler existed, the axum router was merged,
and the dependency was declared. One capability (`sdkwork-models-catalog`) was
absent from a hand-written array. This ADR is about the defect *class*, not that
one row.

### How the surface is assembled today

Four independent lists must agree for one dependency path to be served:

| # | List | Location | Owner |
|---|---|---|---|
| 1 | `ApiModuleRegistry` (1 module: the whole assembly) | `standalone-gateway/src/main.rs` | spec §4.1.1 |
| 2 | `MOUNTED_APP_CAPABILITIES` (16 rows, hand-written) | `routes-cloudrouter-app-api/src/manifest_composition.rs` | repo-local |
| 3 | `MOUNTED_BACKEND_CAPABILITIES` (16 rows, hand-written) | `routes-cloudrouter-backend-api/src/manifest_composition.rs` | repo-local |
| 4 | Router merge call sites (8 app / 10 backend) | `.../{app,backend}-api/src/routes.rs` | repo-local |

Lists 2 and 3 produce the **route manifest**, which is the Web Framework's
auth/serving authority (`sdkwork-web-core/src/interceptors.rs`: an unmatched
path with a bound manifest returns `not_found` with `reason=route-not-in-manifest`
*before* any handler runs). Lists 4 produce the **axum router**. Nothing
mechanically links 2/3 to 4.

### Three structural defects, evidenced

**D1 — The registry is an unspecified, repo-local mechanism.**

`MOUNTED_APP_CAPABILITIES` / `MOUNTED_BACKEND_CAPABILITIES` appear in **no**
`sdkwork-specs` document. The only record of the invariant is a source comment
(`//! Keep this list aligned with ... in routes.rs`). A convention enforced by a
comment is not a contract.

**D2 — The enforcement test is an allowlist that cannot detect the failure.**

Both "alignment" tests iterate a **hardcoded list of 6-9 names** and assert each
is present in the registry:

```rust
for required in ["sdkwork-iam", "sdkwork-membership", /* … */] {
    assert!(workspaces.contains(&required), "registry must include {required}");
}
```

Direction is one-way. It proves "the names I typed are in the array"; it can
never prove "every merged router is in the array". Adding a dependency requires
editing three places (registry, merge site, this test) with no gate noticing a
missed edit. This is precisely how `sdkwork-models-catalog` was omitted since
inception (`git log -S` returns empty — never present, not a regression).

**D3 — The profile-mounting decision is encoded as two ambiguous booleans.**

Each app-api row carries two independently-chosen booleans. Observed
distribution across 15 rows:

| `platform_gateway_mounts_separately` | `included_in_cloud_assembly_manifest` | rows |
|---|---|---|
| `true` | `false` | 6 |
| `false` | `true` | **1** (`sdkwork-partner`) |
| `false` | `false` | 7 |
| `true` | `true` | **0** |

Neither field is defined in any spec. `sdkwork-models` still carries a literal
`bool` placeholder. A contributor adding a dependency must infer two correct
values from neighbouring rows, because the rule is stated nowhere.

### Why every existing gate stayed green

| Gate | Why it cannot see this |
|---|---|
| `api:chain-reachability:check` | Walks the **data/business** chain (`api_code → taxonomy → resource → account route → price book`) from `data/ai-routing/install-manifest.json`. Never reads the HTTP route manifest. Reported `passed (100/100 reachable)` while the endpoint 404'd. |
| `api:ai-routing-consistency:check` | Static consistency among declarations; same data plane. |
| `api:model-route-reachability` | Model→vendor binding only; not the HTTP surface. |
| `validate-api-assembly.mjs` | Verified 13 route crates discovered; not per-capability manifest coverage. **Passed.** |
| `check-route-path-collisions.mjs` | Collision freedom; a *missing* route is not a collision. **Passed.** |
| `check-api-runtime-parity.mjs` | Compares served-vs-authority for the surfaces it is told about; **passed** the `/ai/*` gap. |
| Served `/openapi.json` | Built by `augment_openapi_with_missing_routes(&mut doc, manifest.routes())`. The manifest is the input, so a route missing from the manifest is also missing from the document. It cannot detect its own omission. |

Root observation: **"the declarations agree with each other" and "the HTTP
surface can actually route this path" are orthogonal.** Every gate in the
workspace tests the former.

### Spec position

`API_ASSEMBLY_SPEC.md` §4.1.1 and §4.2 already mandate the correct shape:

- "Standalone gateways and the platform cloud gateway `MUST` assemble served
  routes through **one** `ApiModuleRegistry`: `add_module` … for every selected
  module, then `try_compose(title)` to validate and bind."
- §4.2: "every normalized `(surface, method, path)` identity is mounted exactly
  once", with `try_compose` **failing closed** on collisions.
- §4.1: "An assembly contribution is an indivisible runtime contract. A consumer
  `MUST NOT` project only its `router` field."

Cloud Router satisfies §4.1.1 only at whole-assembly granularity (one module),
then re-implements a **second, weaker registry** for dependency surfaces —
duplicating a mechanism the framework already provides, without its validation
or its fail-closed collision guarantee.

## Decision

**Route-surface membership derives from one authority; the manifest is computed,
not hand-listed.**

1. **Delete lists 2 and 3 as hand-written authorities.** A capability's surface
   membership is declared **once**, at the point where its router is merged.
   The manifest is produced by folding that declaration, so "merged but not in
   manifest" and "in manifest but not merged" become unrepresentable.

2. **Replace the two booleans with one enumerated mount profile** per row —
   e.g. `MountProfile::{StandaloneOnly, CloudGatewayOnly, Both}`. The four
   combinations collapse to the values actually meaningful, the unused
   combination disappears, and the placeholder `bool` must be resolved.

3. **Cloud Router's dependency surfaces are registered through the spec's
   `ApiModuleRegistry`** so dependency surfaces use the framework's existing
   validation path instead of a repo-local parallel one. Where that is not
   reachable in one step, the interim shape `MUST` still derive the manifest and
   the router from one declaration.

4. **Add a completeness gate that compares the two sets directly** — the merged
   router set and the composed manifest set — and fails on any difference in
   either direction. This replaces the one-way allowlist.

5. **The invariant is written down in `API_ASSEMBLY_SPEC.md`** (a normative
   section on capability-registry derivation), so the requirement lives in the
   standard rather than in a source comment.

Until (1)-(4) land, an omitted row `MUST` be caught by the per-surface
regression test introduced with this ADR
(`composed_manifest_includes_models_catalog_backend_routes`), which is
ablation-verified: removing the registry row makes it fail.

## Alternatives

- **Keep the hand-written registry, widen the allowlist test.** Rejected: the
  test still enumerates names by hand, so the next added dependency is missed
  identically. It relocates the defect rather than removing it.
- **Add a lint that greps `routes.rs` merge markers against the registry.**
  Partially effective, but text matching over source is exactly the fragility
  documented in `CODE_STYLE_SPEC`-adjacent gates (a `#[cfg(test)]` assertion
  string satisfies such a check; see the recorded "陷阱 2" in the workspace
  skill). Acceptable only as an interim while (1) lands.
- **Do nothing beyond the one-row fix.** Rejected: the same omission class is
  reachable for every future dependency on both surfaces. Three of the six
  workspace repos carrying this pattern have no completeness test at all.

## Consequences

- Adding a dependency becomes one edit at the merge point instead of three
  coordinated edits across two files.
- `404 route-not-in-manifest` for a declared-and-merged path becomes
  structurally impossible rather than conventionally avoided.
- Migration touches both registries, both route crates' tests, and the cloud
  assembly dispatcher manifest — a bounded, mechanical change.
- The one unused boolean combination (`true/true`) is removed, closing the
  "which value goes here?" ambiguity that produced the placeholder `bool`.
- Requires an `API_ASSEMBLY_SPEC.md` amendment; Cloud Router is the first
  adopter, so the spec change `MUST` land before or with the implementation to
  avoid codifying a repo-local rule as a standard.

## Verification

1. **Completeness gate** (new): assert set-equal between merged routers and
   composed manifest for each of app-api, backend-api, open-api. Must be
   ablation-verified red when a row is removed and green when restored.
2. **Per-surface regression** (landed with this ADR):
   `cargo test -p sdkwork-routes-cloudrouter-backend-api --lib
   composed_manifest_includes_models_catalog_backend_routes`.
   Ablation confirmed: RED without the registry row, GREEN with it.
3. **Live HTTP proof, not static proof**: after rebuilding and restarting the
   gateway, `GET /backend/v3/api/ai/model_vendors` `MUST` no longer answer
   `404` with `reason=route-not-in-manifest`. A `401` (reaching the auth layer)
   is the pass signal. Static and data-plane gates `MUST NOT` be cited as
   evidence for HTTP reachability — that substitution is what let this defect
   survive repeated fix attempts.
4. **Workspace sweep**: a workspace scan for `MOUNTED_*_CAPABILITIES` /
   `_CAPABILITIES: &[` returns six repositories, but Cloud Router is the only one
   whose match is a **route-surface registry** (the other five are SPI/trait
   capability arrays — a different construct). Set-equality completeness gates
   across those repositories: **zero**. The finding is therefore Cloud
   Router-local in the strict sense, but the *pattern* — a hand-written array
   standing in for a derivable set — is workspace-wide and `SHOULD` be audited
   wherever a list must mirror a merged set.

## Supersedes / Superseded By

None. Supersedes the undocumented convention recorded only in
`manifest_composition.rs` header comments.
