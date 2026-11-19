# App Factory Commercial Blockers

This file records the work that cannot be completed inside the Deploy module
alone, the contract each item needs, and the verification that will close it.
It is the hand-off surface for the remaining commercial gaps; the readiness
matrix is [TECH-app-factory-readiness.md](./TECH-app-factory-readiness.md).

## 1. Paid template installation (entitlement projection)

**State.** Free templates install end to end (Git remix or archive artifact
clone). A paid order is recorded by the order center and the order
fulfillment updates both template counters, but Deploy refuses to create the
app because it cannot verify that the caller owns a paid order.

**Why it is not in Deploy.** The order/payment domain owns the entitlement
(`commerce_order` paid + fulfilled). Deploy must not infer it from a
client-supplied `orderId`, and it has no order API client or service
credential today.

**Required contract (one of):**

1. **Entitlement projection** — a Deploy-owned table
   `deploy_app_template_entitlement` (`tenant_id`, `user_id`,
   `template_uuid`, `order_id`, `status=GRANTED|CONSUMED`, `app_uuid`),
   written by the order fulfillment in the same transaction that settles the
   order, consumed by `apps.marketplaceTemplates.install` for `PAID` listings.
   This needs a PostgreSQL migration and a database-contract review.
2. **Signed service call** — order fulfillment calls a Deploy service
   endpoint after settlement with a service credential and
   `{orderId, tenantId, buyerUserId, templateUuid}`; Deploy verifies the
   signature and installs. Needs service-auth contract and network policy.

Either path must make paid install idempotent (same order/application) and
must not double-count the purchase already counted by fulfillment.

**Verification to close:** a PostgreSQL test that pays an order, installs,
replays the install, and asserts one app, one consumed entitlement, and one
install count.

## 2. Version-pinned Git template source

**State.** Version creation now captures the source app's Git declaration
(provider, url, effective ref, sub path, clone mode, credential reference) into
the version's `metadata.git`; install prefers that snapshot and falls back to
the current source for versions created before the capture.

**Remaining contract.** Backfill `metadata.git` for versions created before
the capture if any of them must be reproducible.

**Verification:** publish a template, change the source app's Git ref, install
the published version, and assert the installed app uses the published ref.

## 3. IAM runtime consumption of Deploy resource links

**State.** IAM owns login/cashier OAuth integrations; Deploy now exposes
application resource links, but IAM does not consume them at runtime.

**Required contract.** The IAM login/cashier integration resolver must read the
Deploy resource link for the installation anchor (`deploy_app.id` decimal) and
prefer it over the IAM-owned integration, with a documented fallback. This is
cross-repository (`sdkwork-iam` ↔ `sdkwork-deployments`).

**Verification:** WeChat H5 login and cashier on an app whose resource link is
Deploy-owned; assert the correct AppID/secret and openid binding are used.

## 4. Real end-to-end publish/deploy

**State.** Unit/contract suites are green, but no target environment has run
create → source → release → deployment for H5, Flutter and Android end to end.

**Required input.** A reachable target environment (or an isolated compose
stack) with Drive, build runner, artifact storage and a DNS/TLS target.

**Verification:** create an app per kind, publish, deploy, probe the health
endpoint, and record the image/release ids.

## 5. Legacy dual-anchor cleanup

**State.** The installer resolves the decimal anchor first and relinks a legacy
uuid only when it is the single installation. Databases that already contain
both a decimal and a uuid installation for the same app are not cleaned.

**Read-only audit available.** `cloudrouterctl audit-identities` prints
`legacyLinks` (uuid anchor, no decimal duplicate yet), `duplicateLinks` (both
anchors exist) and `orphanLinks` (anchor resolves to no deploy app). It never
writes. Operators collect that report first; the cleanup itself still needs a
reviewed maintenance action.

**Required contract.** An operator-run audit that enumerates the duplicate
pairs and a reviewed cleanup (disable/remove the uuid orphan) with an audit
trail. This needs a database review and a maintenance window policy.

## 6. Multi-language build runners, mobile signing and store delivery

**State.** The app model supports every kind/OS/language, but real builds for
Flutter/iOS/Android/HarmonyOS and store delivery need runner images,
signing identities and store credentials.

**Required input.** CI runner images per toolchain, signing key custody, and
store credentials. Those are deployment secrets, not source code.

## Human-review gate

Items 1 and 5 change database schema or delete identity rows; repository
policy requires human review before those migrations/deletions. Items 3 and 6
cross repository and deployment-security boundaries. Until reviewed, the
code deliberately refuses the affected paths instead of guessing.
