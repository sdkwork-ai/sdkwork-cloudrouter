# sdkwork-models Install Flow

## Purpose

ClawRouter no longer owns public model facts, billing meters, official prices,
or default ranking rows inside Rust installer seed arrays. Those facts live in
the standalone `data/sdkwork-models` catalog and are imported during install or
catalog refresh.

This keeps model data independently versioned, reviewable, releasable, and
updatable without changing ClawRouter application code.

## Catalog Source Resolution

The installer resolves the catalog in this order:

1. `SDKWORK_MODELS_CATALOG_ROOT` when set.
2. Bundled catalog root from the local `sdkwork-models` Rust package path.

`SDKWORK_MODELS_CATALOG_ROOT` must point at the catalog project root, not the
`models/` directory:

```powershell
$env:SDKWORK_MODELS_CATALOG_ROOT = Join-Path (Get-Location) "data/sdkwork-models"
```

The target directory must contain:

```text
sdkwork-models.json
schemas/index.schema.json
schemas/official-model-snapshot.schema.json
schemas/official-verification-policy.schema.json
schemas/vendor-sources.schema.json
models/meters.json
models/index.json
sources/vendor-sources.json
sources/official-model-snapshots.json
sources/official-verification-policy.json
models/<vendorCode>/<regionCode>/models/*.json
models/<vendorCode>/<regionCode>/vendor.json
models/<vendorCode>/<regionCode>/families.json
models/<vendorCode>/<regionCode>/pricing/*.json
models/<vendorCode>/<regionCode>/rankings.json
```

`models/index.json` is the authoritative file manifest. Installers and SDKs
must import only vendor-region files listed by `modelFiles` and `pricingFiles`
in that index; extra directories are ignored until the index is regenerated.
The index itself must satisfy `schemas/index.schema.json`, and the validator
must reject stale or manually edited index files with explicit mismatch codes
before any installer imports catalog rows.

For official data quality, refresh pipelines must also run
`tools/catalog-audit.mjs` before importing. The audit treats
`sources/vendor-sources.json`, `sources/official-model-snapshots.json`, and
`sources/official-verification-policy.json` as the update evidence contract.
Official snapshots must match the current catalog version, each vendor source
declaration must be unique per `vendorCode/regionCode`, official snapshot URLs
must stay inside declared official source boundaries, and snapshot model IDs
must be unique and present in the matching `vendorCode/regionCode` catalog
directory. Each snapshot must carry a canonical `sourceSnapshotHash`, and
release metadata must copy those hashes under
`sourceEvidenceSha256.officialSnapshotHashes` by `vendorCode/regionCode`.
Vendor-regions marked `official_verified` cannot be imported as a clean
release if their independent official snapshot is missing required, enabled,
or family-default models, or if the recorded snapshot hash no longer matches
the snapshot body.

`sources/official-verification-policy.json` is the release gate for vendor
regions that must remain officially verified. It must satisfy
`schemas/official-verification-policy.schema.json` and declare
`requiredVerifiedVendorRegions`. Every listed `vendorCode/regionCode` must have
a matching catalog directory, source declaration, `official_verified` status,
and independent official snapshot. The relationship is bidirectional: every
source declaration marked `official_verified` must also be listed in
`requiredVerifiedVendorRegions`. Missing, malformed, duplicated, or unenforced
release gate entries must fail before installer import.

## Install Behavior

`DatabaseInstaller::ensure_installed()` creates the ClawRouter schema, loads
the selected `sdkwork-models` catalog, and imports it into these canonical
tables:

```text
ai_billing_meter
ai_model_vendor
ai_model_family
ai_model
ai_model_capability
ai_model_pricing
ai_model_rank_snapshot
```

The installer records `system_installation_state.catalog_version` from
`sdkwork-models.json.catalogVersion`. It also records a `catalog:<version>`
row in `system_schema_migration` using a deterministic payload checksum with
catalog version, schema version, generated time, vendor count, model count, and
meter count.

The admin status API returns the same selected catalog information:

```json
{
  "status": "installed",
  "schemaVersion": "2026.05.07.3",
  "catalogVersion": "2026.05.08.1",
  "catalogSource": "bundled",
  "externalCatalog": false,
  "lastCatalogRefreshStatus": "not_run"
}
```

`lastCatalogRefreshStatus` is the public refresh observability contract:

```text
not_run   no ai_model_catalog_sync_run record exists yet
success   latest refresh run completed and mutated catalog tables
dry_run   latest refresh run completed as a preview without catalog mutation
failed    latest refresh run did not complete successfully
```

If the stored catalog version differs from the selected catalog root, startup
status becomes `UpgradeRequired` and the next `ensure_installed()` refreshes
the catalog rows.

For local development, `pnpm dev` and `pnpm dev:server` must not stop at
`ensure_installed()`. The workspace launcher sets `SDKWORK_MODELS_CATALOG_ROOT`
to the checkout-local `data/sdkwork-models` directory when the variable is not
already set, then runs a blocking `sdkwork-claw-installer refresh-catalog
--catalog-root <workspace>/data/sdkwork-models --force` before starting the
Rust services. This guarantees model JSON and pricing changes are imported into
the SQLite dev database on every server-mode startup.

## Refresh Behavior

The admin model sync path and installer CLI use the same Rust importer as
installation. This is the standard refresh path for ongoing model data
iteration:

1. Update `data/sdkwork-models` to a newer submodule commit or set
   `SDKWORK_MODELS_CATALOG_ROOT` to a newer catalog artifact.
2. Run catalog validation and freshness checks.
3. Trigger admin model catalog sync.
4. Verify `ai_model_catalog_sync_run` and `ai_pricing_import_snapshot` records.

Supported refresh modes are:

```text
official_refresh          import the selected catalog scope
vendor_refresh            import only the requested vendor directories
catalog_version_refresh   import only when the loaded catalogVersion matches the requested pin
dry_run                   preview the selected vendor/model scope without mutating catalog tables
```

CLI examples:

```powershell
sdkwork-claw-installer refresh-catalog
sdkwork-claw-installer refresh-catalog --vendor openai
sdkwork-claw-installer refresh-catalog --catalog-root "$env:SDKWORK_MODELS_CATALOG_ROOT" --catalog-version 2026.05.08.1
sdkwork-claw-installer refresh-catalog --vendor alibaba --dry-run
```

All installer commands emit exactly one JSON object to stdout. `status`,
`install`, `upgrade`, and `ensure` use the admin installation status field
contract. `refresh-catalog` emits this machine-readable contract:

```json
{
  "status": "refreshed_catalog",
  "synced": true,
  "source": "sdkwork_models",
  "mode": "vendor_refresh",
  "catalogVersion": "2026.05.08.1",
  "vendorCodes": ["openai"],
  "meterCount": 20,
  "vendorCount": 1,
  "familyCount": 6,
  "modelCount": 8,
  "capabilityCount": 9,
  "priceCount": 18,
  "rankingCount": 8,
  "acceptedCount": 70,
  "snapshotId": "pricing-import-...",
  "syncRunId": "catalog-sync-...",
  "lastCatalogRefreshStatus": "success"
}
```

Installer failures emit exactly one JSON object to stderr and exit non-zero:

```json
{
  "status": "error",
  "errorCode": "invalid_argument",
  "message": "mode must be official_refresh, vendor_refresh, catalog_version_refresh, or dry_run"
}
```

Stable `errorCode` values are part of the installer contract:
`missing_database_url`, `invalid_argument`, `invalid_state`,
`database_error`, `catalog_error`, `commerce_error`, and `installer_error`. Command-line parsing
errors use `invalid_argument`; catalog/schema/runtime state problems use
`invalid_state`. The CLI parses and validates command syntax before loading
database configuration, so unsupported commands, missing option values, and
unsupported refresh options must return `invalid_argument` even when
`SDKWORK_CLAW_DATABASE_URL` is not set. Non-refresh commands (`status`,
`install`, `upgrade`, and `ensure`) must reject extra arguments instead of
silently ignoring them.

Admin API example:

```json
{
  "source": "sdkwork_models",
  "mode": "vendor_refresh",
  "vendorCodes": ["openai"],
  "force": true,
  "catalogRoot": "./data/sdkwork-models",
  "catalogVersion": "2026.05.08.1"
}
```

The refresh is idempotent for official system rows. It upserts catalog-owned
vendors, families, models, capabilities, prices, meters, and ranking snapshots.
When `vendorCodes` is set, only those vendor directories are imported; meters
remain global because they are shared catalog standards. `dry_run` returns the
selected vendor/model scope and records a dry-run sync record, but it does not
repair or mutate catalog tables.

Non-dry-run refreshes are atomic at the application data boundary. Catalog
table upserts, the pricing import snapshot, the sync-run row, and the audit log
are committed as one transaction. If any step fails, the catalog tables remain
at their previous values and the installer records a separate failed sync-run
row when possible.

Refresh output and `ai_model_catalog_sync_run.change_summary.counts` use the
same fact-count contract:

```text
meterCount       shared global billing meters loaded with the catalog scope
vendorCount      selected vendor directories
familyCount      selected vendor families
modelCount       selected model definitions
capabilityCount  generated model capability rows
priceCount       selected pricing rows after price-item expansion
rankingCount     selected ranking snapshot items that reference selected models
acceptedCount    sum of all imported standard fact rows above
```

The same count contract is exposed through the backend admin API and generated
`@sdkwork/clawrouter-backend-sdk` response type
`AdminModelCatalogSyncResponse`. Application integration boundaries must keep
these fields intact when wrapping `syncVendorsAndModels`; returning only
`vendors` and `models` loses the installer audit signal that deployment jobs,
admin consoles, and update monitors need for drift detection.

Failed refresh attempts are first-class audit events. The installer writes an
`ai_model_catalog_sync_run` row with `run_status != 1`, a masked error message,
the requested vendor scope, and the resolved catalog version whenever the
catalog could be loaded. This includes vendor selection failures and execution
failures while applying or recording the sync. Each refresh run id includes
time and process-local sequence entropy so repeated scripted retries remain
individually traceable. Failed-refresh audit persistence is best-effort: it
must not mask the original refresh failure when the audit row cannot be written.
Tenant-owned custom rows, provider secrets, channel health, and private pricing
policies remain outside the portable model facts and must not be overwritten by
catalog data.

## Independent Repository and Submodule

`data/sdkwork-models` is the ClawRouter mount point for the independent catalog
repository:

```powershell
git submodule add https://github.com/Sdkwork-Cloud/sdkwork-models.git data/sdkwork-models
git submodule update --init --recursive
```

For a fresh standalone repository:

```powershell
cd data/sdkwork-models
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Sdkwork-Cloud/sdkwork-models.git
git push -u origin main
```

Do not push from restricted local automation. Release hosts or maintainers
should run network operations after local validation passes.

## Update Gate

Every catalog update must run:

```powershell
pnpm models:check
node data/sdkwork-models/tools/build-index.mjs --check
node data/sdkwork-models/tools/validate-catalog.mjs
node data/sdkwork-models/tools/freshness-report.mjs --max-age-policy catalog-freshness-policy.json --as-of 2026-05-08
node data/sdkwork-models/tools/catalog-audit.mjs --as-of 2026-05-08
node data/sdkwork-models/tools/release-catalog.mjs --check --as-of 2026-05-08
cargo test -p sdkwork-models --offline
cargo test -p sdkwork-clawrouter-router-service --test database_installer --offline
cargo test -p sdkwork-clawrouter-router-service --test admin_model_store --offline
cargo test -p sdkwork-claw-installer --test installer_cli --offline
```

Production deployments should pin a catalog version or submodule commit.
Floating branch heads are not a release standard because they make installs
non-reproducible.

## Failure Modes

- Missing catalog root: installer returns a catalog load error and does not mark
  the database as installed.
- Invalid JSON: installer returns the exact JSON path and parser error through
  `DatabaseInstallError::Catalog`.
- Version mismatch: status reports `UpgradeRequired`; `ensure_installed()`
  reimports the selected catalog.
- Missing required rows: status reports `UpgradeRequired`; `ensure_installed()`
  repairs catalog-owned rows.
- Stale or unverified data: release tooling must fail before the catalog is
  used as a production artifact.

## Boundary

Portable catalog data includes public model facts, official/reference prices,
meters, source evidence, and optional ranking snapshots.

ClawRouter-local data includes providers, provider accounts, channels, route
rules, channel groups, tenant plans, private discounts, secrets, health state,
quota policies, and audit/runtime records.
