# bin/ — standardized entrypoints (`sdkwork-specs/MODULE_BIN_SPEC.md`)

`sdkwork-cloudrouter` is the router-plane service of the SDKWork workspace.
Shared behavior lives in `sdkwork-specs/bin/lib/sdkwork-common.sh`; this
directory only carries identity and delegation.

| Script | Purpose |
| --- | --- |
| `docker-image.sh` | build / push / save / load / update / inspect `registry.sdkwork.com/apps/sdkwork-cloudrouter:<version>` |
| `docker-deploy.sh` | install / upgrade / rollback / status / logs / down / start / stop / restart the Docker bundle on `wsl` or `ssh://[user@]host` |
| `apps-build.sh` | build `server` (cargo release) |
| `apps-package.sh` | package the install bundle into `target/bin-packages/` (+ sidecar `.sha256`) |
| `apps-deploy.sh` | container-only: points operators at the bundle path |

Declared app types: `server`. Default image tag comes from
`sdkwork.app.config.json` → `release.currentVersion` (0.4.0).

## Container path (every environment)

```sh
bin/docker-image.sh build                                  # → pnpm build:container --tag <ref>
bin/docker-image.sh save -o dist/sdkwork-cloudrouter.tar.gz  # air-gapped bundle
bin/docker-deploy.sh install --environment development
bin/docker-deploy.sh status  --environment demo
bin/docker-deploy.sh logs    --environment demo
bin/docker-deploy.sh rollback --environment demo           # ledger-based (release.sh)
bin/docker-deploy.sh down    --environment demo --purge --yes
```

### Five environments — copy-paste ready

| Environment | Management port | Database |
| --- | --- | --- |
| `development` | `3950` | `sdkwork_ai_dev` |
| `test` | `3951` | `sdkwork_ai_test` |
| `staging` | `3952` | `sdkwork_ai_staging` |
| `demo` | `3954` | `sdkwork_ai_demo` |
| `production` | `3953` | `sdkwork_ai_prod` |

```sh
bin/docker-deploy.sh install --environment development            # 3950
bin/docker-deploy.sh install --environment test                   # 3951
bin/docker-deploy.sh install --environment staging                # 3952
bin/docker-deploy.sh install --environment demo                   # 3954
bin/docker-deploy.sh install --environment production --yes       # 3953 (--yes required)
```

> **Rollback**: the bundle ships `release.sh` (OPERATIONS_SPEC.md §1.2) —
> versioned deploy/rollback gated by `/healthz` probes on the management
> ports, with an append-only release ledger and a per-environment lock.
> `bin/docker-deploy.sh rollback` goes back to the previous successful
> ledger version; pin an explicit one with `--to <old-version>`.
> History: `bash release.sh history --environment <env>` on the target bundle.

The bundle is synced to `/opt/deploy/sdkwork-cloudrouter/bundle` on the target
and `deploy.sh` is executed with that directory as the working directory.
`--image-tag`, `--replicas`, `--deps external|embedded` and `--purge` are
forwarded to the bundle entrypoint.

## Operations lifecycle

```bash
bin/config.sh  <list|show|get|set|diff|validate|edit> --environment <env> [--key K] [--value V] [--reveal]
bin/doctor.sh  --environment <env> [--instance N] [--json] [--export <dir>]
bin/backup.sh  <create|list|verify|restore> --environment <env> [--set <name>] [--component all|config|database|volumes]
bin/docker-deploy.sh logs --environment <env> [--instance N] [--service <s>] [--tail N|all] [--since <d>] [--follow] [--export <dir>]
```

`config.sh` reads the live bundle configuration on the target, redacts secrets,
and backs up before mutating. `doctor.sh` is read-only and exits 70 when a
check fails. `backup.sh` writes checksummed sets to
`/opt/deploy/<module>/backups/` on the target. Runbooks: `docs/runbooks/`.

## Shared flags

`--environment development|test|staging|demo|production` ·
`--host wsl|ssh://[user@]host[:port]` · `--image-tag <v>` ·
`--deps external|embedded` · `--to <version>` · `--purge` · `--yes` ·
`--dry-run` · `-h|--help`

`--dry-run` prints the plan and executes nothing. Production mutations require
`--yes`; `--purge` requires `--yes` in every environment. `upgrade` on
`staging`/`demo`/`production` captures a pre-change backup unless
`--skip-backup` is explicit (evidence is recorded either way). Each run
appends a line with its exit status to `target/bin-evidence/evidence.log`.

Run `bin/<script>.sh doctor` for the environment self-check. Automated
conformance audit:
`node ../sdkwork-specs/tools/check-operations-conformance.mjs --root .`
