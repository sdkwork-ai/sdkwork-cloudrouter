# SDKWork Claw Router PRD

Status: active
Owner: SDKWork maintainers
Application: sdkwork-clawrouter
Updated: 2026-07-10
Specs: REQUIREMENTS_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

This file is the PRD index. Detailed requirements live in the linked shards:

- [PRD-00-design.md](PRD-00-design.md) — design rationale and capability surface
- [PRD-01-prd-sdkwork-clawrouter.md](PRD-01-prd-sdkwork-clawrouter.md) — detailed product requirements

- [REQ-2026-0001 Commercial Production Readiness](../requirements/REQ-2026-0001-commercial-production-readiness.md) - active critical readiness requirement

## 1. Background And Problem

Developers and enterprises integrating AI capabilities today face fragmented
provider APIs (OpenAI, Anthropic, Google, Alibaba, Tencent, ByteDance, ...),
inconsistent authentication, uneven rate limits, opaque billing, and no unified
observability across vendors. Existing gateways either lock customers into a
single cloud (AWS Bedrock, Azure OpenAI) or lack commercial-grade tenant
isolation, billing, and SLA controls (self-hosted LiteLLM).

SDKWork Claw Router is an enterprise-grade, multi-tenant AI API aggregation
gateway that exposes an OpenAI-compatible `/v1` surface plus admin and app
surfaces, with circuit breaker, idempotency, tenant-scoped billing, and
production-grade observability built in.

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

- **HA**: circuit breaker + idempotency + graceful drain + Redis failover +
  PostgreSQL streaming replication
- **Security**: per-tenant signing keys, IAM-issued principal, SQL scoped
  subjects, HSTS default on, CSP strict, artifact signature required
- **Observability**: Prometheus RED/USE metrics with route/method/status/
  operation_id labels, OpenTelemetry tracing, structured JSON logs, SLO/SLI
  dashboard
- **Performance**: streaming SSE passthrough (no full buffering on adapter
  path), p95 TTFT < 500 ms for first chunk
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

## 7. Risks

- Provider upstream instability → mitigated by circuit breaker + failover
- Tenant signing key compromise → mitigated by 90-day rotation + key ID
- Schema drift between baseline and migrations → mitigated by migration chain
  + drift policy + CI gate
- Supply chain attack → mitigated by signed artifacts + SBOM + cargo-deny +
  pnpm audit + Trivy

## 8. Open Questions

### Resolved

- ~~What is the pricing model for commercial license tiers (per-seat,
  per-token, flat)?~~ **Resolved (2026-06-27):** Claw Router uses a hybrid
  model of recurring subscription base fee plus metered per-token usage.
  Four tiers are defined: Community (AGPL, free), Pro (subscription + token),
  Enterprise (subscription + token, higher SLA), and OEM (one-time + royalty).
  See [docs/commercial/PRICING.md](../../commercial/PRICING.md) and the
  edition tier matrix at [docs/legal/TIER_MATRIX.md](../../legal/TIER_MATRIX.md).
- ~~Should Claw Router offer a managed cloud offering, or remain self-hosted +
  licensed?~~ **Resolved (2026-06-27):** Claw Router supports both. The
  primary commercial model is self-hosted + licensed. A SDKWork-managed SaaS
  deployment is available as an add-on for Pro and Enterprise editions. See
  the "Deployment And Customization" section of
  [docs/legal/TIER_MATRIX.md](../../legal/TIER_MATRIX.md).

### Open

- Should the OpenAI-compatible surface support streaming for all generation
  types, or only chat completions?

## 9. References

- [PRD-00-design.md](PRD-00-design.md)
- [PRD-01-prd-sdkwork-clawrouter.md](PRD-01-prd-sdkwork-clawrouter.md)
- [Technical architecture](../architecture/tech/TECH_ARCHITECTURE.md)
- [Standard alignment audit](../standard-alignment-audit.md)
- [Security policy](../../SECURITY.md)
