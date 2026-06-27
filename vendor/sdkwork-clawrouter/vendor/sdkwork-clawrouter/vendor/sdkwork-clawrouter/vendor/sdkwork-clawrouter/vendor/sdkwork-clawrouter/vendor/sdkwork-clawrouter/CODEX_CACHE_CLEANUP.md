# Codex Cache Cleanup Report

Date: 2026-05-03 Asia/Shanghai
Workspace: `<workspace-root>\sdkwork-clawrouter`

## Scope

The user requested cleanup and optimization of Codex-owned cache and session
records.

Writable paths in this run:

- `<workspace-root>\sdkwork-clawrouter`
- `D:\tmp`
- `C:\Users\admin\.codex\memories`

The active sandbox did not permit writes to `C:\Users\admin\.codex\sessions`,
`C:\Users\admin\.codex\log`, or the root SQLite/history files under
`C:\Users\admin\.codex`.

## Measured Hotspots

Initial measurement:

- `C:\Users\admin\.codex\sessions`: 81 items, 2710.53 MB
- `C:\Users\admin\.codex\memories`: 68032 items, 1688.10 MB
- `C:\Users\admin\.codex\plugins\cache`: 101 items, 1.28 MB
- `C:\Users\admin\.codex\logs_2.sqlite`: 773251072 bytes
- `C:\Users\admin\.codex\log\codex-tui.log`: 97846513 bytes
- `C:\Users\admin\.codex\history.jsonl`: 5774981 bytes

Largest `memories` entries before cleanup:

- `sdkwork-video-cut.git`: 717.81 MB
- `sdkwork-birdcoder-gitdir`: 577.88 MB
- `sdkwork-birdcoder-git-20260425222429`: 123.36 MB
- `sdkwork-birdcoder-git-20260425223546`: 123.36 MB

## Actions Executed

Safe Git object compression:

```powershell
git -C C:\Users\admin\.codex\memories\sdkwork-birdcoder-gitdir gc
```

Result:

- `sdkwork-birdcoder-gitdir` loose objects reduced to zero.
- `sdkwork-birdcoder-gitdir` size reduced from 577.88 MB to 120.76 MB.
- Total `memories` size reduced from 1688.10 MB to 1230.98 MB.
- Approximate space reclaimed: 457.12 MB.

Attempted but stopped:

- `git gc` on `C:\Users\admin\.codex\memories\sdkwork-video-cut.git` failed
  because Git reported a corrupt loose object:
  `0aadecd786853ae5c8541d84d5047b8f95a8d404`.
- A follow-up quarantine move to `D:\tmp\codex-cache-quarantine-20260503` was
  blocked by filesystem permissions. The failed move emitted many PowerShell
  errors, and the quarantine directory was not created.
- The `sdkwork-video-cut.git` directory stayed in place. The minimal `refs`
  directory structure was restored so Git can recognize the directory again.

Current measurement:

- `C:\Users\admin\.codex\sessions`: 81 items, 2710.53 MB
- `C:\Users\admin\.codex\memories`: 63641 items, 1230.98 MB
- `C:\Users\admin\.codex\plugins\cache`: 101 items, 1.28 MB
- `C:\Users\admin\.codex\logs_2.sqlite`: 773251072 bytes
- `C:\Users\admin\.codex\log\codex-tui.log`: 97846513 bytes
- `C:\Users\admin\.codex\history.jsonl`: 5774981 bytes

## Remaining Manual Cleanup Candidates

These paths are outside the current writable sandbox. Run these only after
closing Codex, so active SQLite WAL/session writes are not interrupted.

Archive older sessions instead of deleting them:

```powershell
$cutoff = Get-Date '2026-05-01'
$archiveRoot = 'C:\Users\admin\.codex\archived_sessions\manual-20260503'
New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
Get-ChildItem -LiteralPath C:\Users\admin\.codex\sessions -Filter '*.jsonl' -Recurse |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object {
    $relative = $_.FullName.Substring('C:\Users\admin\.codex\sessions'.Length).TrimStart('\')
    $destination = Join-Path $archiveRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
    Move-Item -LiteralPath $_.FullName -Destination $destination
  }
```

Truncate Codex TUI text log:

```powershell
Clear-Content -LiteralPath C:\Users\admin\.codex\log\codex-tui.log
```

Compact Codex SQLite logs after Codex exits:

```powershell
sqlite3 C:\Users\admin\.codex\logs_2.sqlite 'PRAGMA wal_checkpoint(TRUNCATE); VACUUM;'
sqlite3 C:\Users\admin\.codex\state_5.sqlite 'PRAGMA wal_checkpoint(TRUNCATE); VACUUM;'
```

If `sqlite3` is unavailable, install/use SQLite CLI or leave these files alone.
Do not delete live SQLite database, `-wal`, or `-shm` files while Codex is
running.

Delete only known-bad memory cache after confirming it is no longer needed:

```powershell
Remove-Item -LiteralPath C:\Users\admin\.codex\memories\sdkwork-video-cut.git -Recurse -Force
```

This removes about 717.81 MB but is destructive. The directory currently
contains a corrupt Git object and cannot be safely packed by `git gc`.

## Recommendation

For routine Codex speed:

- Keep project iteration on `pnpm.cmd verify:fast`.
- Archive old session JSONL files monthly.
- Truncate `codex-tui.log` periodically.
- Compact SQLite logs only with Codex fully closed.
- Delete corrupt memory Git caches only after confirming they are not needed.
