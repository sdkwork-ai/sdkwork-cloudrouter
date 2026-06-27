# SDKWork App Seed

`sdkwork-apps.json` is the install-time PlusApp seed bundle for SDKWork Claw Router.
`sdkwork-app-categories.json` is the matching install-time `PlusCategory` seed manifest for the
App Center categories derived from `plusApp.config.portal.category`.
 
Generate this file from the app standard exporter instead of editing individual app projections by
hand:

```powershell
pnpm app-store:seed:update
pnpm app-store:seed:check
```
 
missing `sdkwork.app.config.json` manifests, exports `sdkwork-apps.json`, and regenerates the
matching category manifest with `python -B -m tools.app_seed_category_manifest`. Use
`pnpm app-store:seed:update -- --sync-db` only when the refreshed seed should be imported into the
database referenced by `SDKWORK_CLAW_DATABASE_URL`; the script delegates database writes to
`sdkwork-claw-installer ensure` so the Rust installer remains the only database seed writer.

The installer imports the app bundle into the Java-compatible `plus_app` table, imports the category
manifest into `plus_category`, and writes the app catalog projection tables during first install.
`plusApp.config.standard.appKey` is the stable app identity used by AppCenter routes, while the
physical table shape stays aligned with Java `PlusApp`.

The category manifest is not a separate source of truth. It must stay generated from
`sdkwork-apps.json`; the Rust installer validates that every category row matches the app bundle
before any seed data is imported. Regenerate both files together when app manifests are added,
removed, or reclassified.
