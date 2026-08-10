# ADR-20260720-dedicated-cloud-ingress

Status: accepted
Requirement: REQ-2026-0001
Owner: cloud-router-platform
Date: 2026-07-20
Specs: APP_RUNTIME_TOPOLOGY_SPEC.md, APPLICATION_GATEWAY_SPEC.md, ARCHITECTURE_DECISION_SPEC.md

## Context

Cloud Router exposes OpenAI-compatible and provider-native traffic through the
application-owned `sdkwork-cloudrouter-edge-runtime`. The shared
`sdkwork-api-cloud-gateway` remains the platform dependency gateway and cannot
replace Cloud Router's provider routing, streaming, billing, and settlement
pipeline.

Topology v5 requires the cloud ingress strategy and its ownership boundary to
be explicit. Cloud development must consume deployed endpoints instead of
starting local API or gateway processes.

## Decision

Use the `dedicated-application` cloud ingress strategy.

- `sdkwork-api-cloud-gateway` owns the platform gateway surface.
- `sdkwork-cloudrouter-edge-runtime` owns the Cloud Router application ingress.
- Cloud development uses `https://cloudrouter-test.sdkwork.com` for application,
  open, backend, and browser-facing Cloud Router URLs.
- Cloud production continues to use `https://cloudrouter.sdkwork.com` for the
  public and open surfaces and the separately declared admin origin for the
  backend surface.
- Standalone development continues to use the local standalone gateway.

## Alternatives

- Collapse Cloud Router into the platform gateway: rejected because it would
  move provider routing and settlement ownership into a shared dependency.
- Start both cloud gateways locally during cloud development: rejected because
  cloud development is remote-only under `APP_RUNTIME_TOPOLOGY_SPEC.md`.
- Route cloud development to production: rejected because the existing test
  origin provides the required environment boundary.

## Consequences

The application and platform gateway boundaries remain independently
deployable and observable. Cloud profiles require two explicit remote origins,
and releases must preserve the application gateway artifact and routing
contract. This adds a dedicated deployment surface but avoids coupling shared
platform releases to Cloud Router provider behavior.

## Verification

- `node ../sdkwork-specs/tools/check-topology-deployment-profiles.mjs --workspace .. --repo sdkwork-cloudrouter`
- `pnpm topology:validate`
- `pnpm gateway:validate:cloud`
- Release readiness checks must verify the application and platform gateway
  artifacts from the same candidate commit.

## Supersedes / Superseded By

Host selection is updated by
`ADR-20260810-multi-base-domain-production-binding.md` (multi-base-domain
`router.*` hosts); this ADR's ingress ownership boundary remains in effect.
