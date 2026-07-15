# REQ-2026-0001 Commercial Production Readiness

id: REQ-2026-0001
title: Close commercial AI relay production-readiness gaps
owner: sdkwork-platform
status: in-progress
source: security, reliability, governance
priority: critical
application: sdkwork-clawrouter
approval: Pre-launch direct cleanup authorized by the repository owner on 2026-07-10

## Problem

Claw Router has a substantial provider-routing and SDK foundation, but the current
worktree does not yet enforce the security, financial, streaming, routing, release,
and operational invariants required for a commercial AI API relay. Several current
behaviors can expose internal networks, expose upstream administrative operations,
lose usage revenue, delay streaming responses, duplicate upstream spend, or publish
artifacts without trustworthy evidence.

## Goals

- Make every configurable upstream fail closed against SSRF and unsafe transport.
- Limit public vendor-compatible APIs to inference and media operations.
- Make runtime route registration, route manifests, OpenAPI authorities, and SDKs exact.
- Reserve funds before irreversible provider work and settle usage atomically.
- Forward streaming bodies incrementally with bounded lifecycle and reliable metering.
- Make API keys and provider credentials write-only, separated, and rotatable.
- Make retry, failover, circuit breaking, and adaptive routing cost-aware and safe.
- Make merge and release gates reproduce the deployable artifact and fail closed.
- Keep PRD, architecture, runbooks, audits, and generated facts aligned with reality.
- Reach a clean, warning-free, fully verified production candidate without debt waivers.

## Non-Goals

- Preserve pre-launch shadow routes, legacy API shapes, or insecure compatibility aliases.
- Hand-edit generated SDK transport output.
- Claim production readiness from documents, generated facts, or partial checks alone.
- Add provider breadth before financial, security, and reliability invariants are closed.

## Acceptance Criteria

1. Private, loopback, link-local, multicast, unspecified, and cloud metadata destinations
   are rejected at configuration time and connection time, including DNS rebinding cases.
2. App users cannot create or mutate provider channels; runtime routes exactly match the
   app-api authority, route manifest, permissions, and generated app SDK.
3. Public OpenAI-compatible routing exposes inference/media operations only. Organization,
   project, credential, user, certificate, billing, and upstream administration operations
   are absent from public contracts, runtime routing, resource groups, and generated SDKs.
4. Every billable invocation reserves a bounded maximum amount before dispatch. Final
   settlement, release, adjustment, idempotency, and reconciliation are transactionally safe.
5. A successful stream cannot finalize with missing or zero usage unless a model contract
   explicitly proves the operation is free. Missing usage enters reconciliation and alerts.
6. Streaming forwards chunks without full-body buffering, propagates cancellation and
   backpressure, and enforces connect, header, first-token, idle, and total deadlines.
7. Generative POST requests are not replayed unless the provider contract and stable
   provider-side idempotency key prove retry safety. Every attempt updates breaker state.
8. Customer API key plaintext is shown once. Stored customer keys are non-recoverable;
   provider credentials use independent KMS/envelope-encryption domains with key IDs.
9. Routing can constrain providers by tenant policy, capability, price, region, and data
   policy, and can rank eligible routes by distributed health, latency, error, and cost data.
10. A release cannot publish or deploy without same-commit tests, non-empty checksums,
    verified signatures, SBOM, provenance, immutable OCI digests, and rollback evidence.
11. PostgreSQL restore, secret recovery, rollout, rollback, and egress controls are executed
    in an isolated production-like environment and produce retained evidence.
12. All required SDKWork validators, Rust checks/tests, frontend typecheck/tests, PostgreSQL
    integration tests, security negative tests, and documentation checks pass from a clean clone.
13. Production logs, traces, metrics, health/readiness, dashboards, and alerts cover every security,
    provider-attempt, streaming, financial, reconciliation, outbox, and breaker lifecycle with
    bounded labels, secret/PII redaction, tested alert fire/resolve behavior, and runbook links.

## Non-Functional Requirements

- Security: Follow `SECURITY_SPEC.md`, least privilege, fail-closed egress, and write-only secrets.
- Privacy: Provider routing must enforce declared data region and retention constraints.
- Performance: Gateway p95 overhead below 50 ms; incremental SSE without a fixed body-size cap.
- Reliability: No unbounded stream lifetime, duplicate provider spend, partial settlement, or
  silent usage loss; every irreversible boundary has idempotency and recovery evidence.
- Architecture: Preserve route/service/repository/adapter/runtime ownership and use focused ports.
- Operations: Production artifacts and deployments are immutable, observable, and reversible.

## Affected Surfaces

- open-api
- app-api
- backend-api
- generated SDK workspaces
- Rust router service and cloud/standalone gateway
- SQL settlement and wallet integration
- `sdkwork-account` Token Bank hold/partial-settlement prerequisite and immutable handoff
- `sdkwork-models` API-key domain secret-removal prerequisite and immutable handoff
- PC application composition
- Kubernetes, release workflows, supply-chain evidence, and runbooks
- PRD, technical architecture, ADRs, audits, and operator documentation

## Trace

### Specs

- `REQUIREMENTS_SPEC.md`
- `ARCHITECTURE_DECISION_SPEC.md`
- `API_SPEC.md`
- `RUST_CODE_SPEC.md`
- `SECURITY_SPEC.md`
- `PRIVACY_SPEC.md`
- `PERFORMANCE_SPEC.md`
- `OBSERVABILITY_SPEC.md`
- `TEST_SPEC.md`
- `QUALITY_GATE_SPEC.md`
- `RELEASE_SPEC.md`
- `SUPPLY_CHAIN_SECURITY_SPEC.md`

### Components

- `services/sdkwork-clawrouter-router-service`
- `crates/sdkwork-clawrouter-cloud-gateway`
- `crates/sdkwork-routes-clawrouter-app-api`
- `crates/sdkwork-routes-clawrouter-backend-api`
- `apis/open-api/clawrouter`
- `apis/app-api/clawrouter`
- `sdks/clawrouter-app-sdk`
- `sdks/clawrouter-backend-sdk`
- `sdks/clawrouter-open-sdk`
- `apps/sdkwork-clawrouter-pc`
- `deployments`
- `../sdkwork-account` through
  `docs/engineering/prerequisites/PREREQ-2026-0001-sdkwork-account-ai-hold-settlement.md`
- `../sdkwork-models` through
  `docs/engineering/prerequisites/PREREQ-2026-0002-sdkwork-models-api-key-secret-removal.md`

## Verification

The executable command matrix and evidence checkpoints are maintained in
`docs/engineering/plans/PLAN-2026-0001-commercial-production-readiness.md`.

The current factual gate state is recorded in
[REVIEW-20260714 Production Readiness Revalidation](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md).
That review records open blockers only; it does not close an acceptance
criterion or authorize a production, high-availability, or commercial claim.
