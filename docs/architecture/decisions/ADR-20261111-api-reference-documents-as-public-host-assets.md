# ADR-20261111-api-reference-documents-as-public-host-assets

Status: proposed
Requirement: REQ-2026-1111
Owner: cloudrouter-platform
Date: 2026-11-11
Specs: `API_ASSEMBLY_SPEC.md`, `API_SPEC.md` §4.5, `WEB_FRAMEWORK_SPEC.md`, `TEST_SPEC.md`

## Context

The API Reference and SDK Reference pages load their roster and documents from
`/openapi/schema-tabs.json` and the per-surface OpenAPI documents:

```
/openapi/schema-tabs.json
/payments/v3/openapi.json
/paas/v3/openapi.json
/cloud/v3/openapi.json
/app/v3/api/openapi.json
/backend/v3/api/openapi.json
```

On the deployed platform (`api.sdkwork.com`, the embedded platform API gateway
composing `sdkwork-api-cloudrouter-assembly`) the reference page reported:

- `401` on `/openapi/schema-tabs.json`, `/payments|paas|cloud/v3/openapi.json`
  with `detail: "requests on unclassified API surfaces require explicit
  public_path registration"`, and
- `404` on `/app/v3/api/openapi.json` and `/backend/v3/api/openapi.json` with
  `detail: "route is not registered in the gateway route manifest"`.

The Cloud Router HTTP crate serves every one of those documents (they are
`include_str!`-embedded authorities), and the edge server serves them for a
static portal. The cloud gateway did not serve them because the documents were
never part of the composed host:

1. A contribution route must be **authenticated and inventoried**: the Web
   Framework rejects any path missing from the route manifest, and
   `ApiAssemblyContribution::validate` requires the manifest and the served
   OpenAPI document to have identical inventories.
2. The platform gateway's `exact_registry_for_modules` additionally requires
   every contribution route to belong to a **declared dependency API surface**
   prefix. `/openapi/schema-tabs.json`, `/payments/v3/openapi.json`,
   `/paas/v3/openapi.json`, and `/cloud/v3/openapi.json` belong to no surface;
   registering them as routes fails gateway startup.
3. Registering them as routes would also be wrong: a reference document is a
   static contract asset, so listing it as an API operation pollutes the
   reference roster with `GET /openapi/schema-tabs.json`-style endpoints.

The framework already mounts the composed `/openapi.json` after the Web
Framework layer (`ComposedApiAssembly::into_hosted` → `mount_openapi_json`),
which is exactly the public, unauthenticated semantics a reference document
needs.

## Decision

`ApiAssemblyContribution` gains `public_documents: Vec<OpenApiMount>` and the
`with_public_document(path, document)` builder. `ComposedApiAssembly::into_hosted`
mounts contributed public documents next to the composed `/openapi.json`, after
the Web Framework layer.

Consequences for the contract model:

- Public documents are **not** API routes. They never enter the route manifest,
  the OpenAPI inventory, the permission catalog, or the platform gateway's
  `exact_registry_for_modules` surface check, so a document path needs no
  dependency surface declaration.
- They are served without credentials from every host that uses `into_hosted`
  (standalone gateway and the embedded platform gateway), with the same public
  semantics as `/openapi.json`.
- Contribution validation rejects `/openapi.json` (host-owned), infrastructure
  paths, non-object documents, and duplicates within one contribution;
  composition rejects the same path published by two assemblies.
- Cloud Router publishes its six reference documents from the assembly, from the
  same embedded authorities the HTTP handlers use, so a published document can
  never drift from the served response.

## Consequences

- The API Reference and SDK Reference pages render all thirteen documented
  groups on the platform origin; the six failing probes become `200`.
- A new module can publish reference documents without inventing a dependency
  surface or polluting the API roster.
- The capability is opt-in per contribution; hosts that do not call
  `into_hosted` do not gain it.

## Verification

- `cargo test -p sdkwork-web-bootstrap --lib api_assembly`
  (`hosted_profile_binds_openapi_manifest_and_infrastructure_once` asserts a
  contributed public document is reachable without credentials and absent from
  the route manifest; `duplicate_public_document_paths_fail_closed` and
  `contribution_must_not_publish_the_host_owned_openapi_document` assert the
  guard rails).
- `cargo test -p sdkwork-api-cloudrouter-assembly cloud_assembly_contribution_publishes_every_reference_document`.
- `curl -sS -o /dev/null -w '%{http_code}' https://api.sdkwork.com/openapi/schema-tabs.json`
  after the platform gateway is rebuilt from this revision.
