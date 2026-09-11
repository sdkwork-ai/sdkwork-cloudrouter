# Runbook — sdkwork-cloudrouter deploy / upgrade / rollback (EN)

Prereqs: Docker + compose plugin on the target; an image built via
`bin/docker-image.sh build` (or imported offline with save/load).

## 1. Install (first time)

```bash
bin/docker-deploy.sh install --environment <development|test|staging|demo|production>
bin/docker-deploy.sh install --environment production --yes   # --yes is mandatory in production
```

## 2. Upgrade

staging/demo/production capture a pre-change backup automatically (skip with
`--skip-backup`; the skip is recorded as evidence):

```bash
bin/docker-image.sh build
bin/docker-deploy.sh upgrade --environment staging --image-tag <new-version>
```

## 3. Verify (release gate)

```bash
bin/docker-deploy.sh status --environment staging
```

## 4. Rollback

```bash
bin/docker-deploy.sh rollback --environment staging                  # previous ledger version
bin/docker-deploy.sh rollback --environment staging --to 0.4.0       # explicit version
```

Rollback is gated by `/healthz` on the management ports; a failed gate
auto-reverts and appends to `release-state/<env>/ledger.jsonl`.

## 5. Retire

```bash
bin/docker-deploy.sh down --environment staging
bin/docker-deploy.sh stop    --environment staging               # stop (keeps containers and volumes; no repackage)
bin/docker-deploy.sh start   --environment staging               # start a stopped stack (embedded deps first)
bin/docker-deploy.sh restart --environment staging               # restart app instances only (deps and gateway stay up)
bin/docker-deploy.sh down --environment staging --purge --yes
```
