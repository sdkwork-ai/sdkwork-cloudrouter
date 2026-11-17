# @sdkwork/cloudrouter-pc-admin-domain

Domain Center for the Cloud Router admin surface: root domains, hostname
ownership, DNS resolution records, TLS certificates, and the DNS automation
accounts that publish them.

## Ownership

This package owns **presentation, navigation, validation, and copy**. It does
not own a domain control plane. Every read and command goes through the
generated `@sdkwork/deployments-app-sdk` client the admin runtime already
injects, so the management surface and the deployment engine read one contract
(`deploy_dns_zone`, `deploy_domain`, `deploy_domain_dns_record`,
`deploy_certificate` and their verification/order child tables).

## Surface

| Section | Route | What the operator does |
| --- | --- | --- |
| Overview | `/admin/domains` | Health of zones, hostnames, TLS coverage, and DNS accounts; the attention queue. |
| Root domains | `/admin/domains/zones` | Register/rename metadata, pin the DNS account, pause/resume, delete, and manage platform verification files. |
| Hostnames | `/admin/domains/hostnames` | Add exact/wildcard names, prove ownership with the TXT record, rename, delete. |
| DNS resolution | `/admin/domains/dns` | Sync the provider snapshot; create, edit, pause, and delete records through the zone's account. |
| Certificates | `/admin/domains/certificates` | Issue managed ACME certificates, renew, inspect validity/renewal state and renewal history. |
| DNS accounts | `/admin/domains/accounts` | Register Aliyun DNS / DNSPod / Cloudflare accounts usable for DNS-01 and record sync. |

`/admin/domains/hostnames?zone=<zoneId>` and `/admin/domains/dns?zone=<zoneId>`
are deep links; the selected zone travels in the query string so refresh and the
browser back button behave.

## Standards alignment

- API envelope, error shape, and pagination are owned by the deployments
  `app-api` contract (SDKWork v3); this surface never re-implements a wire
  protocol.
- Certificate issuance follows ACME: HTTP-01 for single-domain scopes, DNS-01
  for wildcard scopes (enforced in `domainValidation.ts`).
- DNS record validation follows RFC 1035 labels, RFC 2181 TTL bounds, RFC 8659
  CAA syntax, and RFC 8555 §8.4 proof digests.
- Hostname ownership uses a `_sdkwork-verification.<hostname>` TXT record and
  never trusts a caller-asserted success.

## Public API

- `src/index.tsx` — `DomainCenterAdmin`, `normalizeDomainCenterSection`,
  `domainCenterSectionPath`, `domainCenterService`, and section/view types.

## Configuration

The deployments app client base URL is resolved by the shared admin runtime
(`@sdkwork/cloudroutes-pc-commons/runtime`; `VITE_SDKWORK_DEPLOYMENTS_APP_API_BASE_URL`,
falling back to the same-origin `/app/v3/api` surface). This package reads no
environment variable directly.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-admin-domain test`
- `pnpm --filter sdkwork-cloudrouter-pc typecheck`
- `node --import tsx --import ./scripts/css-stub-loader.mjs --test domain-center-runtime.test.ts` (from `apps/sdkwork-cloudrouter-pc`)

## Extension points

Limited to the public exports and the host route contribution. Add a section by
extending `DOMAIN_CENTER_SECTIONS`, `DomainCenterSectionId`, the host route list,
the admin menu, and the i18n bundle together.
