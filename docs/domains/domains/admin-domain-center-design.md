# Admin Domain Center

Status: active · Owner: cloudrouter-platform · Surface: `/admin/domains`

签发能力封装、验证方式选择与云盘归档的后续设计见
[certificate-issuance-drive-archive-design.md](certificate-issuance-drive-archive-design.md)。

## 1. Purpose

The Domain Center is the Cloud Router admin surface for the names this
deployment serves and the TLS certificates that cover them. It gives operators
one place to answer six questions:

1. Which root domains (zones) does this deployment manage, and who proves their
   ownership?
2. Which hostnames exist under each root domain, and are they verified?
3. What does the DNS provider actually hold for those names right now?
4. Which certificates cover them, when do they expire, and is renewal healthy?
5. Which DNS credentials is the platform allowed to publish with?
6. Which ICP and public security filing information is recorded for each root domain?

## 2. Alignment with `sdkwork-deployments`

The Domain Center **does not own a domain control plane**. It renders and
commands the authoritative aggregate owned by `sdkwork-deployments` through the
generated `@sdkwork/deployments-app-sdk` client. This is deliberate: a second
domain store would drift from the deployment engine exactly where drift is most
expensive (ownership proofs, DNS-01 challenges, certificate orders).

| Domain Center concept | Deployment contract | App API operations |
| --- | --- | --- |
| Root domain | `deploy_dns_zone` (apex, provider, pinned account, scope, status, optional ICP and public security filings) | `domainZones.list/create/retrieve/update/delete` |
| Hostname | `deploy_domain` (exact/wildcard, verification state, status) | `domainZones.hostnames.*`, `hostname_claims` |
| Ownership proof | `deploy_domain_verification` + the `_sdkwork-verification.<hostname>` TXT ledger | `hostnames.verify` |
| Resolution record | `deploy_domain_dns_record` (provider-side snapshot) | `domainZones.dnsRecords.list/create/sync/update/delete/status` |
| Certificate | `deploy_certificate` + identifiers/versions/orders/renewals | `certificates.list/create/retrieve/renew/delete/renewals` |
| DNS credential | Platform account center projection | `domain.cloudAccounts.list/create` |
| Platform verification file | `deploy_dns_zone_verification_file` | `domainZones.verificationFiles.*` |

Behavioural rules carried over from the deployments design:

- **Apex ownership is hostname ownership.** A zone's verification state is its
  apex `deploy_domain` row, so the UI never invents a second "zone verified"
  flag.
- **Platform vs operator zones.** `DomainZoneResponse.scope` distinguishes a
  `PLATFORM` zone (the tenant-level `app.<suffix>` publishing zone, visible to
  everyone) from a `USER` root domain. The zone table defaults to operator
  domains and labels platform zones explicitly, matching the contract note that
  a "my root domains" list must not present a `PLATFORM` zone as one.
- **DNS automation falls through**: certificate pin → zone pin → account center
  choice for the declared provider → deployment credential. The account
  selector and the "Resolved per issuance" label surface that fallthrough
  instead of forcing every zone to be pinned.
- **Filing belongs to the root domain.** The optional `filing` and
  `policeFiling` objects are stored independently on `deploy_dns_zone`; neither
  is inherited by child hostnames nor copied from or written to the site-wide
  footer settings.
- **Records are a snapshot, not the source of truth.** The DNS table is what the
  provider returned at `syncedAt`; "Sync from provider" is the only way the
  inventory changes without a write.
- **Proofs are shown once.** `DomainVerifyResponse` / `DomainHostnameClaimResponse`
  return the TXT value only on the call that created the attempt, so the verify
  dialog presents the record once and never pretends to re-derive it.

## 3. Industry-standard rules encoded in the surface

| Rule | Where it is enforced |
| --- | --- |
| RFC 1035 labels: 1–63 octets, no leading/trailing hyphen, ≤253 total | `isValidApexHostname`, `isValidRelativeName`, `isValidDnsHostLabel` |
| RFC 2181 TTL bounds (60–86400 s here; provider defaults when omitted) | `parseTtlSeconds` |
| RFC 8659 CAA syntax `<flags> <tag> "<value>"` | `validateDnsRecordForm` for `CAA` |
| MX carries priority; other types must not | `validateDnsRecordForm` |
| Wildcards validate only through DNS-01; HTTP-01 is refused | `validateCertificateForm` |
| A wildcard SAN does not cover its own apex | Issue dialog explains that `WILDCARD` also plans the apex, matching the contract |
| Renewal starts before expiry and never before one third of the lifetime | Certificate column shows `renewBeforeDays` and the server-derived `renewalDueAt`/days left |
| ACME proof digests are `base64url(sha256(...))` (RFC 8555 §8.4) | Verify dialog copies the value verbatim; no local transformation |
| Least-privilege DNS credentials | Account dialog requires an explicit attestation and recommends zone-scoped credentials |
| Secrets are write-only | Account page reports only `credentialConfigured`; the secret is never rendered |

## 4. Information architecture

| Section | Route | Question answered |
| --- | --- | --- |
| Overview | `/admin/domains` | Is anything unhealthy right now? |
| Root domains | `/admin/domains/zones` | What are my zones, who proves them, and what filing information is recorded? |
| Hostnames | `/admin/domains/hostnames` | Which names are verified and usable? |
| DNS resolution | `/admin/domains/dns` | What does the provider hold, and can I change it? |
| Certificates | `/admin/domains/certificates` | What is covered, until when, and is renewal healthy? |
| DNS accounts | `/admin/domains/accounts` | What may the platform publish with? |

The chain is intentional and mirrors how operators reason: **root domain →
hostname → resolution → TLS**, with credentials as the enabling plane. The
selected zone travels in the `zone` query parameter so
`/admin/domains/dns?zone=<id>` is shareable and refresh-safe.

## 5. Invariants

1. **One contract, no duplication.** No domain, record, or certificate is
   persisted by this repository; the deployments API is the only writer.
2. **No fabricated state.** Loading and error states are explicit; a failed read
   never renders an empty list as if the deployment had no domains.
3. **int64 stays a string on the wire.** Counters are formatted for display with
   `formatDomainCount` and never converted for comparison or submission.
4. **Idempotency on every command.** Create/update/delete/verify/sync/renew calls
   send a client operation token (`createIdempotencyParams`), so a double submit
   or a retried request cannot create a second zone, record, or order.
5. **Destructive actions are confirmed and named.** Zone/hostname/record/
   certificate deletion uses `ConfirmDialog` with the exact subject and the
   consequences (bindings, listeners, stored versions).
6. **Writes follow the contract's own shapes.** Record values, relative names,
   CA profiles, and validation methods come from the shared enums; the surface
   never invents a vendor dialect.
7. **Each filing has explicit three-state update semantics.** Omitting `filing`
   or `policeFiling` leaves that filing unchanged, sending an object replaces the
   whole filing, and sending `null` clears it. The two objects are independent,
   and the UI never derives a partial PATCH from stale form state.

## 6. Root-domain filing information

Each root domain has zero or one optional ICP filing and zero or one optional
public security filing. The deployments App API is the only authority; Cloud
Router consumes the generated `@sdkwork/deployments-app-sdk` `DomainZoneFiling`
and `DomainZonePoliceFiling` types through the existing `domainZones.update`
operation. No Cloud Router table or local SDK is introduced.

### ICP filing

| Field | Wire type | Rules |
| --- | --- | --- |
| ICP record number | `recordNumber?: string` | Trimmed; at most 64 characters |
| Filing entity | `entityName?: string` | Trimmed; at most 200 characters |
| Website name | `websiteName?: string` | Trimmed; at most 200 characters |
| Review date | `reviewDate?: string` | Real calendar date in `YYYY-MM-DD`; cannot be in the future |

All four fields are optional so an operator can record a partial filing. Blank
strings normalize to absent fields; an empty object therefore clears the stored
values. PostgreSQL stores the date as `DATE`, while the API exposes the ISO date
string without a timezone conversion. The additive migration leaves existing
zones without a filing.

### Public security filing

The existing site-wide standard uses a **public security filing number** and
**public security filing URL**. The root-domain contract aligns with that pair
rather than inventing authority or review-date fields.

| Field | Wire type | Rules |
| --- | --- | --- |
| Public security filing number | `recordNumber?: string` | Trimmed; at most 64 characters |
| Public security filing URL | `recordUrl?: string` | Trimmed; at most 2048 characters; absolute `http` or `https` URL |

Both fields are optional. The URL is stored as text, not fetched by Cloud Router,
so recording a filing never creates a server-side request to an operator-supplied
host. Empty normalization and three-state updates match ICP filing exactly.

### Presentation and interaction

The root-domain table summarizes both filing numbers (plus ICP entity/website
name and public security URL when present), or shows “Not filed” when neither
exists. The **Filing information** action opens one dialog with separate ICP and
public security sections. Each section has its own validation, save, clear, and
confirmation; saving or clearing one sends only its own property and leaves the
other unchanged. Server validation remains authoritative even though the dialog
performs the same bounded-length, date, and URL checks before submitting.

Filing is metadata only: this feature does not publish a public footer, perform
a regulatory lookup, verify a record with the authority, or alter site-wide
settings. Root-domain values are never silently copied into site-wide defaults,
and incomplete records never synthesize a filing identifier. Platform-provisioned
zones use the same zone-scoped contract; their separate pause/delete restrictions
are unchanged.

## 7. Failure and edge behaviour

- A zone with a paused status, an unverified apex, or pending hostnames appears
  in the attention queue with the section that fixes it.
- A certificate that is past `notAfter`, whose renewal failed, or that sits
  inside the 30-day reminder window is surfaced before any healthy row.
- A Cloudflare account hides the key-id field; Aliyun/DNSPod require it. The
  same form validates both without a vendor-specific page.
- Reusing an equivalent DNS account reports "reused" and leaves the existing
  credential untouched rather than silently rotating a secret another module
  may be using.
- A zone without a pinned account still works: ownership and DNS-01 resolve an
  account per issuance, and the table says so.
- Filing save/clear failures keep the dialog open, preserve the operator's
  input, and display the API problem detail. A successful command patches the
  returned zone into the current page without a loading flash.
- An invalid or future review date, or a malformed/non-HTTP public security
  filing URL, is rejected before submission; stale or hand-crafted requests are
  rejected again by the deployments service.

## 8. Security

- The browser never sees a DNS secret or a private key. Account creation sends
  the secret once; the response exposes only `credentialConfigured`.
- No raw HTTP, manual `Authorization` header, or local SDK fork is used: the
  shared admin runtime injects the deployments app client.
- Deleting a zone is refused by the backend while certificates or bindings still
  reference its hostnames; the UI explains the ordering instead of hiding the
  error.
- Verification files are public by design (platform ownership files) and are
  validated as a single `.txt`/`.html`/`.xml` name, never a path.
- Filing data can contain a legal entity or an individual's name. It is read
  and written only through the authenticated, tenant-scoped deployments API;
  the browser sends no identity projection headers, and filing payloads are
  not copied into URLs, analytics, or application logs.

## 9. Deliberate non-capabilities (and why)

| Not in the Domain Center | Reason | Extension path |
| --- | --- | --- |
| Domain registration / WHOIS / transfer | The platform is not a registrar; the contract starts at a registered zone. | Integrate a registrar provider into deployments first, then add a section. |
| Public filing footer / regulatory verification | Filing is root-domain metadata, not proof of regulatory approval or a site-wide display setting. | Add an explicit publication/verification contract if product scope expands. |
| DNSSEC key management | No contract operation exists; a UI toggle would lie. | `deploy_dns_zone` DS/key API in deployments, then a section. |
| Custom certificate import UI | The app API only creates managed ACME certificates; imported certificates are written by the deployment/secret-manager path. | Add a `CUSTOM` create operation, then an import drawer. |
| Record batch import | Not in the contract; a client-side loop would lose atomicity and idempotency boundaries. | Bulk operation in deployments (`API_SPEC` §15.4 bulk). |
| Traffic/analytics per hostname | Usage attribution lives in the gateway/billing contract, not the domain contract. | Cross-link from the hostname row to the usage surface. |

## 10. Verification

```sh
pnpm --filter @sdkwork/cloudrouter-pc-admin-domain test
pnpm --filter sdkwork-cloudrouter-pc typecheck
node --import tsx --import ./scripts/css-stub-loader.mjs --test domain-center-runtime.test.ts
```

The package suite covers apex/relative-name/record/certificate/account/filing
validation, certificate expiry and attention ordering, overview aggregation, and
section normalization. The app-level runtime test locks the admin menu, module
catalog, permission hints, host routes, filing update/clear SDK wiring, and en/zh
catalog parity.
