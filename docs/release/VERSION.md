# Current Version

- Current Version: `0.4.12`
- Release Date: 2026-10-18
- Status: `In release — tag v0.4.12`
- Previous Version: `0.4.11`
- Previous Status: `Superseded by 0.4.12 (see CHANGELOG.md)`
- Release Asset Prefix: `cloudrouter-*`

`0.4.12` restores a green `Verify Application` on `main`. Every push since
`v0.4.11` failed that job, so nothing could be released from it. Three
independent defects were the cause: the security scan invoked `cargo audit`
without `--file`, so the repository's own advisory allowlist in
`.cargo/audit.toml` was never read and all seven documented advisories failed
the run; a struct literal left behind by commit `38e990d7` stopped the
router-service test target from compiling, which is what surfaced the clippy
backlog behind it; and the clippy gate itself reported 78 errors across five
crates, now cleared. A stale pool-default assertion in `database_config`
additionally failed 11 tests from a single poisoned lock.

The four `container` targets still build their install package and stop at
image publication: pushing to `registry.sdkwork.com` requires the
`SDKWORK_CONTAINER_REGISTRY_USERNAME` and `SDKWORK_CONTAINER_REGISTRY_PASSWORD`
repository secrets, which are not configured. See CHANGELOG.md,
"Known Issues".

## Versioning Rules

- `patch`: bounded fix, release documentation update, or governance hardening.
- `minor`: one capability slice closed end to end.
- `major`: a commercial delivery milestone or a broader release wave.
