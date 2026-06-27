# Release Records

This directory stores the formal release record for `sdkwork-clawrouter`.

## File Layout

- `VERSION.md`
  - The current released version and its status.
- `CHANGELOG.md`
  - The cumulative release history for the product.
- `YYYY-MM-DD-vX.Y.Z.md`
  - The dated release note for a specific release.

## Rules

- Only update these files after the corresponding code baseline has been validated.
- If a release attempt fails, roll its change notes into the next successful release record.
- Summaries should cover what changed, what capability it unlocks, how it was verified, and any remaining risk.
- Keep versioning semantic:
  - `patch` for bounded fixes and documentation hardening.
  - `minor` for a closed capability slice.
  - `major` for a major commercial milestone.
