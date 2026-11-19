# App Factory Commercial Blockers

This file records the work that cannot be completed inside the Deploy module
alone, the contract each item needs, and the verification that will close it.
It is the hand-off surface for the remaining commercial gaps; the readiness
matrix is [TECH-app-factory-readiness.md](./TECH-app-factory-readiness.md).

## 1. Paid template installation (read-only order verification)

**Implemented.** `apps.marketplaceTemplates.install` requires the settled
`orderId` for a `PAID` listing and verifies it read-only against
`commerce_order` / `commerce_order_item`:

- same tenant and buyer (`owner_user_id`);
- `payment_status` paid/success/succeeded;
- `subject = app_template`;
- order item's template UUID equals the listing.

The order id is also the app-create idempotency key, so one purchase creates one
application. The order fulfillment remains the only writer of the paid install
count.

**Remaining:** a refund/chargeback stops **app-token issuance** (`PgDeployApplicationLookup`
checks the recorded order and returns no application when payment is
refunded/reversed). `cloudrouterctl revoke-refunded-apps` archives manually, and
`sdkwork-deploy-refund-revocation-worker` performs the same sweep on an
interval. The worker is wired into the compose stack and the Kubernetes
manifest; only a real deployment execution remains unverified.

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
anchors exist) and `orphanLinks` (uuid **or** decimal anchor resolves to no
deploy app).

**Safe reconciliation available.** `cloudrouterctl reconcile-identities`
defaults to a dry-run of the unambiguous `legacyLinks`; `--apply` calls the
same guarded IAM relink as `ensure_iam_installation`.

**Duplicate cleanup available.** `cloudrouterctl cleanup-identity-duplicates`
defaults to a dry-run of `duplicateLinks`; `--apply` sets the **legacy uuid
installation** to `status = 'disabled'` and leaves the canonical decimal
installation enabled. It never deletes a row, so the OAuth client and audit
history remain available for review.

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
