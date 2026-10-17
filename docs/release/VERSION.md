# Current Version

- Current Version: `0.4.11`
- Release Date: 2026-10-17
- Status: `Published — GitHub release `v0.4.11``
- Released Version: `0.4.11` (2026-10-17)
- Released GitHub Release: `https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/tag/v0.4.11`
- Released Workflow: `https://github.com/sdkwork-ai/sdkwork-cloudrouter/actions/runs/39040567817`
- Release Asset Prefix: `cloudrouter-*`
- Previous Version: `0.4.10`
- Previous Status: `Superseded by 0.4.11 (see CHANGELOG.md)`

`0.4.11` is the first version of the `0.4.x` line whose packaging workflow ran
its full matrix: eighteen of the twenty-two targets produced signed, attested
art, and the release carries them. It closes the two CI defects that made the
previous three attempts produce nothing at all — the `Verify Application` jobs
never materialized the federated dependency set their Cargo and pnpm workspaces
address by relative path, and the packaging plan treated every release-triggered
run as a deployment request it could not satisfy, which skipped the package
matrix before a single job started. It also carries the WiX `Directory`
identifier derivation fix that `0.4.9` left incomplete.

The four `container` targets build their install package but stop at image
publication: pushing to `registry.sdkwork.com` requires the
`SDKWORK_CONTAINER_REGISTRY_USERNAME` and
`SDKWORK_CONTAINER_REGISTRY_PASSWORD` repository secrets, which are not
configured. See CHANGELOG.md, "Risks / Remaining Work".

## Versioning Rules

- `patch`: bounded fix, release documentation update, or governance hardening.
- `minor`: one capability slice closed end to end.
- `major`: a commercial delivery milestone or a broader release wave.
