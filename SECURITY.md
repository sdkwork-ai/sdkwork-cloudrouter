# Security Policy

Status: active
Owner: SDKWork Claw Router security maintainers
Application: sdkwork-clawrouter
Updated: 2026-06-27
Specs: SECURITY_SPEC.md, SUPPLY_CHAIN_SECURITY_SPEC.md, PRIVACY_SPEC.md, IAM_SPEC.md

## Supported Versions

| Version | Supported | Notes |
| --- | --- | --- |
| 0.3.x | yes | Current commercial release line |
| < 0.3.0 | no | End-of-life; upgrade required before production deployment |

## Reporting a Vulnerability

SDKWork treats security vulnerabilities with priority P0. Do **not** open public
GitHub issues for suspected vulnerabilities.

### Private Disclosure Channels

1. **Preferred — GitHub Private Vulnerability Reporting**
   Navigate to the repository's *Security* tab → *Report a vulnerability*.
   This creates a private advisory visible only to repository maintainers.
2. **Email — security@sdkwork.com**
   Encrypt sensitive payloads with the SDKWork security GPG key
   (`0xCLAWROUTERSEC`, published at `https://sdkwork.com/.well-known/security.asc`).
3. **Internal SDKWork channel** (employees only): `#clawrouter-security` on the
   internal Slack workspace.

### Required Information

- Affected version (exact `clawrouter --version` output or git ref)
- Affected component (`gateway`, `admin-api`, `app-api`, `edge`, `installer`,
  `portal`, `sdk`, `database-migration`, `k8s-manifest`)
- Reproduction steps, minimal proof-of-concept, or stack trace
- Observed impact (data leakage, privilege escalation, denial of service, etc.)
- Suggested remediation if available

### Response SLA

| Stage | Target |
| --- | --- |
| Acknowledgement | 24 hours from report |
| Triage + severity rating | 72 hours from report |
| Mitigation advisory (CVE / advisory draft) | 7 calendar days for Critical/High |
| Patch release | 14 calendar days for Critical; 30 days for High |
| Public disclosure | 30 calendar days after patch release, or per reporter agreement |

Reporters receive credit in the advisory unless they request anonymity.

## Scope

### In Scope

- Authentication bypass, privilege escalation, tenant isolation failure
- SQL injection, SSRF, path traversal, XSS, CSRF
- Secrets leakage in logs, error responses, or generated artifacts
- Supply chain attacks (compromised dependency, unsigned artifact, SBOM gap)
- Denial of service (resource exhaustion via crafted request)
- Cryptographic weaknesses (weak signing key, nonce reuse, insecure RNG)
- Kubernetes manifest misconfiguration leading to privilege escalation
- Installer / packaging vulnerabilities (unsigned code execution, unsafe path)

### Out of Scope

- Self-hosted deployments exposing unauthenticated ports directly to the
  internet against documented deployment guidance
- Issues requiring root/admin access to the host already granted to the attacker
- Rate-limit bypass on public demo endpoints without production data exposure
- Theoretical timing attacks without demonstrated exploit

## Hardening Defaults

Production deployments MUST keep the following defaults enabled:

| Control | Default | Override path |
| --- | --- | --- |
| HSTS | enabled in production profile | `[portal.security].hsts_enabled` |
| `X-Forwarded-*` trust | disabled | `SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS` |
| Local tool API | disabled | `PORTAL_PUBLIC_TOOL_API_ENABLED` |
| Portal tool API rate limit | 120 req / 60 s per IP | `SDKWORK_CLAW_TOOL_API_RATE_LIMIT_*` |
| Artifact signature | required | `sdkwork.app.config.json` `security.signatureRequired` |
| SBOM | required | `sdkwork.app.config.json` `security.sbomRequired` |
| Forwarded header trust | off | `[server].trust_forwarded_headers` |
| Provider relay HTTPS | enforced in production | `[provider_relay.openai].base_url` must be HTTPS; `hyper_rustls::HttpsConnectorBuilder::https_only()` rejects plaintext HTTP upstreams (H-1) |
| Provider relay SSRF protection | on | `UpstreamProviderEndpoint::new` resolves upstream host IPs and blocks loopback/private/link-local/unspecified/CGN `100.64.0.0/10`/IPv6 ULA `fc00::/7` ranges (C-1) |
| Circuit breaker fail-closed | `fail_open = false` | `CircuitBreakerConfig::fail_open` defaults to `false`; Redis degradation emits `circuit_breaker_redis_degraded=1` warning (C-4) |
| Provider response body limit | 64 MiB | `[provider_relay.runtime].provider_response_max_bytes`; `http_body_util::Limited` aborts oversized responses (H-3) |
| Provider response timeout | 60 s non-streaming / 120 s streaming | `[provider_relay.runtime].response_timeout_millis` and `stream_response_timeout_millis` (H-4) |
| Streaming retry disabled | `max_attempts = 1` for SSE | `DispatchExecutor::max_attempts` returns 1 when `InvocationShape::SseStream`/`ByteStream`; non-streaming defaults to 2 (H-5) |
| Redis degraded alerting | Prometheus `redis_degraded=1` | `GatewayInvocationRateLimiter` emits gauge on Redis failure; local fallback tightens quota by `estimated_instance_count` (H-8) |
| Tenant in-flight concurrency | 100 per tenant | `[provider_relay.rate_limit].tenant_max_inflight_requests`; `TenantInflightInterceptor` returns HTTP 429 via `InvocationErrorKind::RateLimit` (H-9) |
| Provider HTTP connection pool | tuned defaults | `[provider_relay.http_pool]` configures `pool_idle_timeout`/`pool_max_idle_per_host`/`http2_keep_alive`/`connect_timeout` (C-5) |
| Database password placeholder rejection | on | `validate_for_runtime_profile_at` |

## Tenant Isolation Boundary

Claw Router is multi-tenant. Any issue that allows one tenant to read or modify
another tenant's data, API keys, usage records, billing ledgers, or routing
configurations is treated as Critical regardless of exploit complexity.

The trust boundary is enforced by:

- IAM-issued `WebRequestPrincipal` (no client-side tenant headers trusted)
- App session tokens signed with a single shared HMAC secret configured via
  `SDKWORK_CLAW_APP_SESSION_SECRET` (`sdkwork-claw-config::AppSessionConfig`).
  The shared HMAC secret is the current 0.3.x baseline; per-tenant asymmetric
  signing (RS256/ES256) is tracked as a P0 GA prerequisite in
  `docs/standard-alignment-audit.md`.
- SQL scoped subjects (`SqlScopedSubject`, `SqlScopedAdminSubject`) at the
  repository boundary
- Schema registry owned-table prefixes per capability

## Cryptographic Material

- App session token signing keys MUST rotate every 90 days
- Provider relay bearer tokens MUST be stored via `password_file` references, not
  inline strings
- Redis MUST run with `requirepass` + TLS in production
- Database connection MUST use `sslmode=require` with certificate validation

## Supply Chain

### SBOM Generation (SPDX 2.3)

The release SBOM is generated by `scripts/generate-release-sbom.mjs` (v2.0.0)
and covers both Rust and npm dependency trees:

- **Rust dependencies**: parsed from `Cargo.lock` (all `[[package]]` entries),
  with license fields enriched via `cargo metadata --format-version=1`. Covers
  workspace members and transitive crates.
- **npm dependencies**: parsed from `pnpm-lock.yaml` `packages:` sections in both
  the root workspace and `apps/sdkwork-clawrouter-pc`. License resolved from
  each installed package's `package.json` via Node module resolution, with a
  `node_modules/.pnpm` virtual-store fallback for transitive deps.
- **Vulnerability scans**: `cargo audit` and `pnpm audit` results embedded in
  the SBOM `vulnerabilities` field when scanners are available.
- **Optional syft augmentation**: `--use-syft` merges additional packages from
  `syft dir:. -o spdx-json` when the `syft` binary is available.
- Output: `deployments/artifacts/sbom.spdx.json` (SPDX 2.3, UTF-8, trailing newline).

### Artifact Provenance (SLSA L3)

`deployments/artifacts/checksums.json` contains SLSA L3 provenance for every
built release artifact:

- Each artifact record includes `name`, `path`, `size`, `sha256`, `sha512`,
  `algorithm` (SHA-256), `generatedAt`, and `generator`.
- The `provenance` field follows the in-toto Statement v0.1 format with SLSA
  provenance v0.2 predicate, including `subject` (artifact digests), `builder`,
  `buildType`, `invocation` (config source + parameters), `metadata`
  (completeness flags), and `materials` (Cargo.lock + pnpm-lock hashes).
- Supports `--verify` mode to recompute and compare artifact hashes against
  stored checksums.
- Supports `--artifacts-root DIR` to include additional artifact scan directories.

### Artifact Signing

- All release artifacts MUST be signed (cosign for OCI/generic blobs, signtool
  for MSI, codesign+notarytool for macOS pkg)
- cosign `sign-blob` is applied to `sbom.spdx.json` and `checksums.json` during
  the `lifecycle.sign` step when `COSIGN_PRIVATE_KEY` and
  `SDKWORK_SIGNING_ENABLED=true` are set
- GitHub OIDC token (`id-token: write`) and `attestations: write` permissions
  are declared in `.github/workflows/package.yml` for keyless signing
- The SBOM is attached to container images via `cosign attach sbom`

### CI Vulnerability Scanning

All vulnerability scanners run in `.github/workflows/verify.yml`:

- `cargo audit --deny warnings` — Rust advisory database
- `cargo deny check advisories bans licenses sources` — license/ban/advisory gates
- `pnpm audit --audit-level=high` — npm advisory database
- `gitleaks` — secrets detection in git history
- `Trivy` filesystem scan — HIGH/CRITICAL severity gate

### Offline Mode

The SBOM generator degrades gracefully when tools are unavailable:
- `cargo` absent → Rust license enrichment skipped (license = UNKNOWN)
- `cargo-audit` / `pnpm` absent → vulnerability scan section omitted
- `cosign` absent → artifact signatures set to null (unsigned)
- `syft` absent → built-in Cargo.lock/pnpm-lock parsing used exclusively

## Contact

- Security email: security@sdkwork.com
- Security advisories: `https://sdkwork.com/security/advisories`
- PGP key fingerprint: published at `https://sdkwork.com/.well-known/security.asc`
