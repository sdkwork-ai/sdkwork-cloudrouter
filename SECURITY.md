# Security Policy

Status: active
Owner: SDKWork Claw Router security maintainers
Application: sdkwork-clawrouter
Updated: 2026-06-26
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
| Provider relay HTTPS | enforced in production | `[provider_relay.openai].base_url` must be HTTPS |
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

- All release artifacts MUST be signed (cosign for OCI, signtool for MSI,
  codesign+notarytool for macOS pkg)
- All releases MUST publish a CycloneDX or SPDX SBOM covering both Rust and npm
  dependency trees
- All third-party dependencies MUST pass `cargo deny check advisories` and
  `pnpm audit --audit-level=high` before release
- All container images MUST be scanned by Trivy before publishing

## Contact

- Security email: security@sdkwork.com
- Security advisories: `https://sdkwork.com/security/advisories`
- PGP key fingerprint: published at `https://sdkwork.com/.well-known/security.asc`
