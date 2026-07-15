# SDKWork Claw Router PRD

Status: active
Owner: SDKWork maintainers
Application: sdkwork-clawrouter
Updated: 2026-07-14
Specs: REQUIREMENTS_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

This file is the PRD index. Detailed requirements live in the linked shards:

- [PRD-00-design.md](PRD-00-design.md) — design rationale and capability surface
- [PRD-01-prd-sdkwork-clawrouter.md](PRD-01-prd-sdkwork-clawrouter.md) — detailed product requirements

- [REQ-2026-0001 Commercial Production Readiness](../requirements/REQ-2026-0001-commercial-production-readiness.md) - active critical readiness requirement

## Current Production-Readiness State

Status: pre-launch. This PRD describes the intended product scope; it is not a
release approval or evidence that a commercial production service is ready.

The active engineering iteration is limited to relay and relay control-plane
correctness. Chat product persistence, UI, and chat-specific contract semantics
are not being changed in this iteration; their open gates remain part of the
whole-product release decision.

The current release gate is
[REQ-2026-0001 Commercial Production Readiness](../requirements/REQ-2026-0001-commercial-production-readiness.md).
Its acceptance criteria require verified security, streaming, financial,
contract, PostgreSQL/SQLite, operational, and supply-chain evidence from a
clean candidate commit before any production or commercial claim is made.

Until that requirement is closed, product capabilities, high-availability
topology, SLO targets, pricing, and service terms described elsewhere are
planning inputs rather than proof of an active managed-service commitment.
The historical [standard alignment audit](../standard-alignment-audit.md) is
not current readiness evidence.

The current factual revalidation is
[REVIEW-20260714 Production Readiness Revalidation](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md).
It records open release blockers and must be read with the active requirement;
neither document grants a production, high-availability, or commercial launch
approval.

## 1. Background And Problem

Developers and enterprises integrating AI capabilities today face fragmented
provider APIs (OpenAI, Anthropic, Google, Alibaba, Tencent, ByteDance, ...),
inconsistent authentication, uneven rate limits, opaque billing, and no unified
observability across vendors. Existing gateways either lock customers into a
single cloud (AWS Bedrock, Azure OpenAI) or lack commercial-grade tenant
isolation, billing, and SLA controls (self-hosted LiteLLM).

SDKWork Claw Router is intended to become an enterprise-grade, multi-tenant AI
API aggregation gateway with an OpenAI-compatible `/v1` surface plus admin and
app surfaces. Circuit breaking, idempotency, tenant-scoped billing, and
production-grade observability remain release requirements whose current
implementation and evidence are governed by REQ-2026-0001.

## 2. Target Users

| Persona | Description | Primary Need |
| --- | --- | --- |
| Application developer | Integrates `/v1` chat / embeddings / generations | One API key, OpenAI-compatible, failover across providers |
| Platform operator | Runs Claw Router for an internal team | Tenant isolation, audit, quota, rate limit, observability |
| Finance / procurement | Owns AI spend | Per-tenant billing, usage settlement, cost allocation |
| Security engineer | Owns compliance | Per-tenant signing keys, supply chain integrity, SBOM, audit log |

## 3. Success Metrics

| Metric | Target |
| --- | --- |
| `/v1/chat/completions` p95 latency overhead vs direct provider | < 50 ms |
| Provider outage failover time (circuit breaker open → next candidate) | < 1 s |
| Idempotency cache hit ratio for retried requests | > 99% |
| Tenant isolation test coverage | 100% of cross-tenant paths |
| Release artifact signature coverage | 100% of 24-package matrix |
| SBOM completeness (Rust + npm trees) | 100% |
| Portal i18n locale coverage | 7 locales (en-US, zh-CN, de-DE, fr-FR, ja-JP, ko-KR, ru-RU) |

## 4. Capability Surface

- OpenAI-compatible gateway: `/v1/chat/completions`, `/v1/embeddings`,
  `/v1/images/generations`, `/v1/audio/*`, `/v1/generations`, `/v1/models`
- Admin API (`/backend/v3/api`): tenant, user, channel, provider secret,
  rate limit, firewall, finance, inventory, messaging, runtime region
- App API (`/app/v3/api`): dashboard, usage, gateway, generations,
  settlements, notifications, settings, providers, routing, chat, runtime,
  payment, API keys
- Open API (`/open/v1`): public developer SDK surface
- Portal (`/console`, `/admin`, `/auth`, `/playground`, `/public`)

## 5. Non-Functional Requirements

The following are release requirements, not claims about the current deployed
or commercially supported implementation. Their current evidence state is
tracked by REQ-2026-0001 and REVIEW-20260714.

- **HA**: circuit breaker + idempotency + graceful drain + Redis failover +
  PostgreSQL streaming replication
- **Security**: per-tenant signing keys, IAM-issued principal, SQL scoped
  subjects, HSTS default on, CSP strict, artifact signature required
- **Observability**: Prometheus RED/USE metrics with route/method/status/
  operation_id labels, OpenTelemetry tracing, structured JSON logs, SLO/SLI
  dashboard
- **Performance**: the unified invocation path forwards supported streams
  incrementally without full-body buffering; direct Adapter streaming is not a
  completed commercial capability until it has terminal metering, cancellation,
  idempotency, and bounded-concurrency evidence. The p95 TTFT target remains
  unproven until it is measured in a production-like benchmark.
- **Multi-tenancy**: tenant isolation enforced at IAM, SQL, and schema layers

## 6. Release Milestones

| Milestone | Target | Status |
| --- | --- | --- |
| 0.3.x commercial beta | Private beta with circuit breaker + idempotency + signing + observability | In progress |
| 0.4.x public preview | Public SaaS preview with 7-locale i18n + complete K8s HA | Planned |
| 0.5.x GA | Commercial GA with SLA, SBOM, signed artifacts, SOC2 prep | Planned |

No milestone may be promoted to public preview or GA until REQ-2026-0001 is
accepted with the complete production evidence bundle. Current implementation
claims in detailed shards are targets unless backed by the verification matrix.

## 7. Target Risk Controls

The controls below are desired safeguards. They are not verified mitigations
until the active readiness gate records corresponding passing evidence.

- Provider upstream instability → mitigated by circuit breaker + failover
- Tenant signing key compromise → mitigated by 90-day rotation + key ID
- Schema drift between baseline and migrations → mitigated by migration chain
  + drift policy + CI gate
- Supply chain attack → mitigated by signed artifacts + SBOM + cargo-deny +
  pnpm audit + Trivy

## 8. Current Release Blockers

The current factual state is maintained in
[REVIEW-20260714](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md).
The following categories are release blockers as of the review date:

| Category | Current state | Required before a release claim |
| --- | --- | --- |
| Tenant signing | In-memory immediate rotation is repaired, but durable IAM storage, cross-replica coordination, persisted grace/revocation, and recovery evidence are absent. | Security/IAM-approved durable rotation, key recovery, revocation/grace behavior, and passing multi-replica tests. |
| Provider egress | Production transport is HTTPS-only and validates targets before credentials are forwarded, but resolver pinning, host allowlists, DNS-rebinding defenses, redirect policy, and cluster egress enforcement are absent. | Approved egress policy and negative SSRF/DNS-rebinding evidence. |
| Streaming | The unified invocation route streams incrementally with a bounded terminal lifecycle. Direct authenticated Adapter streams still bypass the formal Adapter contract and terminal financial accounting. | Approved Adapter stream contract or a reviewed fail-closed gate, followed by incremental terminal accounting and measured backpressure/RSS evidence. |
| Public relay boundary | Broad `/v1`, provider-native, and wildcard fallback routes can exceed the intended inference/media-only relay surface. | Human-approved exact method/path/provider allowlist, synchronized contracts/classifiers/SDKs, and negative route evidence. |
| Financial ingestion | The shared command rejects DDL-width trace/usage text and overlong decimal input before either engine writes it, and snapshot validation avoids a second JSON DOM allocation. Retry claim batches are capped and stale lease mutations now report an unknown terminal state rather than false success, but snapshots, usage-line collections, retry envelopes, queues, and DLQs still have no approved byte/shape/count/retention budget; Adapter multi-line records are not atomic. | Reviewed finance/privacy contract, paired migration, bounded projections, atomic outbox/recorder, queue backpressure/retention policy, and two-engine recovery evidence. |
| API contracts | The SDKWork operation-pattern check and route-collision check fail. The stale `routeExplain.create` SDK projection, a non-mounted recharge cancellation path, and diagnostic/create semantic mismatch must be corrected at the authored contract source. | Reviewed source-contract ownership and semantics, generated-artifact regeneration, and passing validation. |
| Tenant authorization | `route_explain` currently looks up requested API keys and channel groups globally instead of enforcing the calling admin's tenant/organization scope. | Human-reviewed scope enforcement, cross-tenant negative tests, and redaction verification. |
| App chat API | The narrow `app_chat_api` suite now passes `9/9` after stale status/subject assertions were aligned to existing behavior/OpenAPI. The added safe-input coverage rejects canonical alias/duplicate input and redacts unavailable-store `503` responses. It does not prove installed schema, API field-contract/SDK parity, server pagination, concurrency, or production behavior. | Close the owned persistence, API/SDK, pagination, and concurrency gates with complete evidence. |
| Persistence | Authored PostgreSQL/SQLite schema inputs do not declare the runtime `ai_chat_*` tables; no current PostgreSQL integration URL is configured. | Paired database ownership/migrations plus clean-install, upgrade, restore, and transaction evidence. |
| Readiness | `/readyz` verifies configured dependency checks, not generic migration/drift or all enabled feature tables. | Reviewed readiness semantics and route/schema admission evidence. |
| Concurrency | Chat sequence values use `COUNT(*) + 1` in both stores. | Atomic allocation and PostgreSQL/SQLite contention evidence. |
| Settlement capacity | Worker batch count is constrained to `1..=200`, but per-row payload, retry queue, DLQ retention, backlog policy, and capacity evidence are unbounded or absent. | Finance/SRE-approved byte/count bounds, observability, overload policy, and two-engine load/recovery tests. |
| Runtime identity | Cloud Gateway, app-api, and backend-api now validate an explicit Snowflake node ID before database bootstrap in server/container mode. Current two-replica Kubernetes Deployments still do not provide unique allocated IDs, and the upstream Snowflake clock-backward path can repeat IDs. | Reviewed allocator/fencing, logical-clock repair, duplicate-node/rollback/sequence-exhaustion tests, and multi-replica failure evidence. |

## 9. Open Questions

### Resolved

- ~~What is the pricing model for commercial license tiers (per-seat,
  per-token, flat)?~~ **Resolved (2026-06-27):** Claw Router uses a hybrid
  model of recurring subscription base fee plus metered per-token usage.
  Four tiers are defined: Community (AGPL, free), Pro (subscription + token),
  Enterprise (subscription + token, higher SLA), and OEM (one-time + royalty).
  See [docs/commercial/PRICING.md](../../commercial/PRICING.md) and the
  edition tier matrix at [docs/legal/TIER_MATRIX.md](../../legal/TIER_MATRIX.md).
- ~~Should Claw Router offer a managed cloud offering, or remain self-hosted +
  licensed?~~ **Resolved (2026-06-27):** The product direction supports both
  deployment models after the production-readiness gate closes. The primary
  commercial model is self-hosted + licensed. A SDKWork-managed SaaS offering
  remains a planned add-on for Pro and Enterprise editions; this does not
  represent a currently available managed service. See
  the "Deployment And Customization" section of
  [docs/legal/TIER_MATRIX.md](../../legal/TIER_MATRIX.md).

### Open

- Should the OpenAI-compatible surface support streaming for all generation
  types, or only chat completions?

## 10. References

- [PRD-00-design.md](PRD-00-design.md)
- [PRD-01-prd-sdkwork-clawrouter.md](PRD-01-prd-sdkwork-clawrouter.md)
- [Technical architecture](../architecture/tech/TECH_ARCHITECTURE.md)
- [Production-readiness revalidation](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md)
- [Historical standard alignment audit](../standard-alignment-audit.md)
- [Security policy](../../SECURITY.md)
