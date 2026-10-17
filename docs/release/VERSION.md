# Current Version

- Current Version: `0.4.11`
- Release Date: unreleased (pre-launch; `sdkwork.app.config.json` declares
  `preLaunch: true`)
- Status: `In development — no GitHub release published for the 0.4.x line yet`
- Released Version: `0.3.0` (2026-05-17)
- Released GitHub Release: `https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/tag/v0.3.0`
- Released Workflow: `https://github.com/sdkwork-ai/sdkwork-cloudrouter/actions/runs/25969690825`
- Release Asset Prefix: `cloudrouter-*`
- Previous Version: `0.4.10`
- Previous Status: `Superseded by 0.4.11 (see CHANGELOG.md)`

The `0.4.x` line (console memory embedding, agents console surface, pricing
and billing convergence, hardened egress boundaries) has not produced a
published release record yet; this entry tracks the working version declared
by `sdkwork.app.config.json` and the workspace manifests so release
documentation does not lag the code.

`0.4.11` carries the packaging defect fix that `0.4.9` left incomplete — the
WiX `Directory` identifier derivation — plus the CI repair that keeps the
Verify Application run honest: the `anchore/syft-action` repository was renamed
upstream, and `cargo audit` had stopped being a real gate.

## Versioning Rules

- `patch`: bounded fix, release documentation update, or governance hardening.
- `minor`: one capability slice closed end to end.
- `major`: a commercial delivery milestone or a broader release wave.
