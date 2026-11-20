# Store Publishing Configuration

Each JSON document in this directory is the **single source of truth for one
app market**. The market's identity, listing copy, release track, rollout
countries, credential references, artifact mapping, and media selection live
here — never in the manifest or in a shared script.

| Document | Market | Platforms | China | United States |
| --- | --- | --- | --- | --- |
| `apple-app-store.json` | `APPLE_APP_STORE` | iOS | yes | yes |
| `google-play.json` | `GOOGLE_PLAY` | Android | no (Play does not distribute there) | yes |
| `huawei-appgallery.json` | `HUAWEI_APPGALLERY` | Android + HarmonyOS | yes | yes |
| `capture.json` | — | — | — | — |

`capture.json` records how the store screenshots were captured (tool, time,
screens); it is not a store lane.

## Rules

- **No secrets.** Credentials are references only: `env:NAME` or `secret:NAME`.
  The validator rejects a literal key, token, or private key.
- **Independence.** A market document cannot read another market's identity,
  countries, media, or credentials. Submission targets are independent too:
  AppGallery declares Android and HarmonyOS targets separately, so a missing HAP
  never blocks the Android submission (and vice versa). Adding a market means
  adding one document and one entry in `MARKET_RULES`
  (`scripts/store-publishing-lib.mjs`).
- **Countries are product facts, not marketing.** Apple/Huawei must include
  `CN`; Google Play must not; every lane must include `US`. The union must cover
  iOS, Android, HarmonyOS, mainland China, and the United States.
- **Media is real.** Store icons and screenshots come from
  `assets/media/store/` and must satisfy the profile in
  `../sdkwork-specs/schemas/sdkwork.app-assets.profiles.v1.json`.

## Workflow

```sh
# 1. Validate the lanes and their media
node scripts/check-store-publishing.mjs

# 2. Verify the three device hosts agree with the manifest
node scripts/check-platform-host.mjs

# 3. Regenerate the manifest projection when a document changes
node scripts/sync-store-publishing.mjs --check     # diff detection
node scripts/sync-store-publishing.mjs --write     # reviewed write

# 4. Rebuild screenshots (after a UI change)
node scripts/capture-store-media.mjs               # raw + report
node scripts/promote-store-media.mjs               # reviewed promotion
python scripts/generate-store-images.py            # icons/cover/banner + flatten

# 5. Produce the per-market submission plan
node scripts/plan-store-submission.mjs --artifacts <built-artifacts-dir>
node scripts/plan-store-submission.mjs --check --artifacts <dir>

# 6. One release preflight (host + lanes + submission plan)
node scripts/release-preflight.mjs --artifacts <built-artifacts-dir>

# 7. Shared orchestrator: build platforms and emit the same plans
node ../../../sdkwork-specs/tools/publish-app.mjs \
  --workspace ../../.. --repo sdkwork-cloudrouter --app cloudrouter-flutter-mobile \
  --allow-pre-release --stores
```

## Authority

- `../sdkwork-specs/APP_MANIFEST_SPEC.md` sections 8 and 13
- `../sdkwork-specs/APP_ASSETS_SPEC.md` section 8
- `../sdkwork-specs/schemas/sdkwork.app-assets.profiles.v1.json`
