# ADR-20260710 Commercial Gateway Safety Boundaries

Status: accepted
Requirement: REQ-2026-0001
Owner: sdkwork-platform
Date: 2026-07-10
Specs: API_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, RUST_CODE_SPEC.md,
QUALITY_GATE_SPEC.md, MIGRATION_SPEC.md

## Context

Claw Router is a pre-launch commercial AI relay. Its current generic provider
dispatch path accepts unsafe upstream destinations, its public OpenAI-compatible
surface includes upstream organization administration, its app runtime registers
channel mutations outside the app-api authority, and its metering lifecycle is
tied to a response interceptor that buffers streaming bodies.

Because the application has not launched, preserving these behaviors as compatibility
debt would add risk without protecting real consumers. The repository owner requested
direct standards alignment with no legacy debt.

## Decision

1. The public compatibility plane is inference/media only. Upstream provider
   organization, project, credential, user, certificate, billing, and administrative
   APIs are not public relay capabilities.
2. Provider and channel governance is a `backend-admin` responsibility. App-api may
   read the effective routing projection but may not mutate provider channels.
3. Every upstream destination is governed by one reusable fail-closed egress policy.
   Validation runs before persistence and again against resolved connection targets.
   Production defaults to HTTPS and explicit provider host policy.
4. Streaming response transport and settlement completion are separate lifecycle
   responsibilities. A streaming body wrapper forwards frames immediately and emits
   a terminal metering event at EOF, cancellation, timeout, or error.
5. Financial authorization happens before provider dispatch. Settlement is an
   idempotent ledger transition, not best-effort telemetry.
6. Customer API key verification and recoverable provider-secret encryption use
   separate cryptographic domains. Customer API key plaintext is not retained.
7. Runtime route inventory, route manifests, OpenAPI authorities, generated SDKs,
   permissions, and documentation are treated as one parity-checked contract.
8. Release and deployment evidence is fail-closed and tied to the same source commit
   and immutable artifact digest.

## Alternatives

- Preserve App channel mutations as an undocumented compatibility surface: rejected
  because there are no production consumers and it widens a critical SSRF boundary.
- Permit arbitrary HTTP upstreams with documentation warnings: rejected because
  application validation cannot compensate for unrestricted production egress.
- Buffer streams to simplify usage parsing: rejected because it violates the product
  latency contract and creates size and resource-exhaustion failure modes.
- Settle only after provider completion without reservation: rejected because it
  permits unbounded commercial exposure under concurrency and delayed workers.
- Keep encrypted customer API key plaintext for convenience: rejected because rotation
  is the correct recovery workflow and plaintext recovery increases breach impact.

## Consequences

- Pre-launch public and app SDK surfaces may shrink. They will be regenerated from the
  corrected authorities with no compatibility aliases.
- Operators must explicitly configure allowed provider hosts or approved provider
  patterns in production.
- Streaming settlement becomes asynchronous relative to response headers but durable
  at the terminal body event.
- Wallet/ledger availability becomes a dispatch precondition for billable operations.
- Release workflows become stricter and may initially fail until real signing,
  artifact, environment, and disaster-recovery evidence is configured.

## Verification

- Negative SSRF and DNS rebinding tests at configuration and dispatch boundaries.
- Exact runtime route inventory against route manifests and OpenAPI authorities.
- Public operation allowlist tests and generated SDK absence tests.
- Streaming first-frame, backpressure, cancellation, timeout, and usage reconciliation tests.
- Concurrent reservation/settlement, failure injection, idempotency, and reconciliation tests.
- Cryptographic key-domain, key-ID rotation, and write-only API response tests.
- Same-commit release gate, checksum, signature, SBOM, provenance, OCI digest, and DR tests.
- The command matrix in `PLAN-2026-0001-commercial-production-readiness.md`.

## Supersedes / Superseded By

This decision supersedes any local document that describes arbitrary upstream URLs,
public upstream administration APIs, recoverable customer API keys, buffered SSE, or
best-effort post-dispatch settlement as production-ready behavior.
