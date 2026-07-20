# ADR-20260720-dedicated-cloud-ingress

Status: accepted
Requirement: REQ-2026-0001
Owner: claw-router-platform
Date: 2026-07-20
Specs: APP_RUNTIME_TOPOLOGY_SPEC.md, APPLICATION_GATEWAY_SPEC.md, ARCHITECTURE_DECISION_SPEC.md

## Context

Claw Router exposes OpenAI-compatible and provider-native traffic through the
application-owned `sdkwork-clawrouter-cloud-gateway`. The shared
`sdkwork-api-cloud-gateway` remains the platform dependency gateway and cannot
replace Claw Router's provider routing, streaming, billing, and settlement
pipeline.

Topology v5 requires the cloud ingress strategy and its ownership boundary to
be explicit. Cloud development must consume deployed endpoints instead of
starting local API or gateway processes.

## Decision

Use the `dedicated-application` cloud ingress strategy.

- `sdkwork-api-cloud-gateway` owns the platform gateway surface.
- `sdkwork-clawrouter-cloud-gateway` owns the Claw Router application ingress.
- Cloud development uses `https://clawrouter-test.sdkwork.com` for application,
  open, backend, and browser-facing Claw Router URLs.
- Cloud production continues to use `https://clawrouter.sdkwork.com` for the
  public and open surfaces and the separately declared admin origin for the
  backend surface.
- Standalone development continues to use the local standalone gateway.

## Alternatives

- Collapse Claw Router into the platform gateway: rejected because it would
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
platform releases to Claw Router provider behavior.

## Verification

- `node ../sdkwork-specs/tools/check-topology-deployment-profiles.mjs --workspace .. --repo sdkwork-clawrouter`
- `pnpm topology:validate`
- `pnpm gateway:validate:cloud`
- Release readiness checks must verify the application and platform gateway
  artifacts from the same candidate commit.

## Supersedes / Superseded By

None.
