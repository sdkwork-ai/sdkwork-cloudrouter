# Runbook — sdkwork-cloudrouter troubleshooting (EN)

Symptom → `bin/doctor.sh --environment <env>` check → action.

## 1. Instance unhealthy

```bash
bin/doctor.sh --environment staging          # health / compose checks
bin/docker-deploy.sh status --environment staging
```

- `health FAIL`: reproduce with `curl -fsS http://127.0.0.1:<mgmt-port>/healthz`; read the logs check for recent errors.

## 2. Port not bound

```bash
bin/doctor.sh --environment staging          # the ports check prints the expected port
```

- Management port matrix: dev 3950 / test 3951 / staging 3952 / demo 3954 / prod 3953.
- Occupied: change `SDKWORK_CLOUDROUTER_*_HOST_PORT` in the env file and re-run `bin/docker-deploy.sh install`.

## 3. Config drift / placeholder secrets

```bash
bin/config.sh diff --environment staging
bin/config.sh validate --environment staging
bin/config.sh set --environment staging --key SDKWORK_DATABASE_PASSWORD --value '<real-value>'
```

## 4. Image drift (running image differs from the ledger)

```bash
bash /opt/deploy/sdkwork-cloudrouter/bundle/release.sh status --environment staging
```

- On drift warnings: `bin/docker-deploy.sh rollback --environment staging --to <ledger-version>`.
