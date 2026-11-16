# Admin Domain Center

Status: active · Owner: cloudrouter-platform · Surface: `/admin/domains`

## 1. Purpose

The Domain Center is the Cloud Router admin surface for the names this
deployment serves and the TLS certificates that cover them. It gives operators
one place to answer five questions:

1. Which root domains (zones) does this deployment manage, and who proves their
   ownership?
2. Which hostnames exist under each root domain, and are they verified?
3. What does the DNS provider actually hold for those names right now?
4. Which certificates cover them, when do they expire, and is renewal healthy?
5. Which DNS credentials is the platform allowed to publish with?

## 2. Alignment with `sdkwork-deployments`

The Domain Center **does not own a domain control plane**. It renders and
commands the authoritative aggregate owned by `sdkwork-deployments` through the
generated `@sdkwork/deployments-app-sdk` client. This is deliberate: a second
domain store would drift from the deployment engine exactly where drift is most
expensive (ownership proofs, DNS-01 challenges, certificate orders).

| Domain Center concept | Deployment contract | App API operations |
| --- | --- | --- |
| Root domain | `deploy_dns_zone` (apex, provider, pinned account, scope, status) | `domainZones.list/create/retrieve/update/delete` |
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
| Root domains | `/admin/domains/zones` | What are my zones and who proves them? |
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

## 6. Failure and edge behaviour

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

## 7. Security

- The browser never sees a DNS secret or a private key. Account creation sends
  the secret once; the response exposes only `credentialConfigured`.
- No raw HTTP, manual `Authorization` header, or local SDK fork is used: the
  shared admin runtime injects the deployments app client.
- Deleting a zone is refused by the backend while certificates or bindings still
  reference its hostnames; the UI explains the ordering instead of hiding the
  error.
- Verification files are public by design (platform ownership files) and are
  validated as a single `.txt`/`.html`/`.xml` name, never a path.

## 8. Deliberate non-capabilities (and why)

| Not in the Domain Center | Reason | Extension path |
| --- | --- | --- |
| Domain registration / WHOIS / transfer | The platform is not a registrar; the contract starts at a registered zone. | Integrate a registrar provider into deployments first, then add a section. |
| DNSSEC key management | No contract operation exists; a UI toggle would lie. | `deploy_dns_zone` DS/key API in deployments, then a section. |
| Custom certificate import UI | The app API only creates managed ACME certificates; imported certificates are written by the deployment/secret-manager path. | Add a `CUSTOM` create operation, then an import drawer. |
| Record batch import | Not in the contract; a client-side loop would lose atomicity and idempotency boundaries. | Bulk operation in deployments (`API_SPEC` §15.4 bulk). |
| Traffic/analytics per hostname | Usage attribution lives in the gateway/billing contract, not the domain contract. | Cross-link from the hostname row to the usage surface. |

## 9. Verification

```sh
pnpm --filter @sdkwork/cloudrouter-pc-admin-domain test
pnpm --filter sdkwork-cloudrouter-pc typecheck
node --import tsx --import ./scripts/css-stub-loader.mjs --test domain-center-runtime.test.ts
```

The package suite covers apex/relative-name/record/certificate/account
validation, certificate expiry and attention ordering, overview aggregation, and
section normalization. The app-level runtime test locks the admin menu, module
catalog, permission hints, host routes, and en/zh catalog parity.
