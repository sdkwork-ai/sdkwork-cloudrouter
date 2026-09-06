# Runbook — sdkwork-cloudrouter backup & restore (EN)

## 1. Capture

```bash
bin/backup.sh create --environment production            # config + database + volumes, sha256 checksummed
bin/backup.sh list   --environment production
bin/backup.sh verify --environment production            # verify the latest set
```

Sets live on the target under `/opt/deploy/sdkwork-cloudrouter/backups/`.
RPO: production daily + pre-upgrade; RTO: production restore within 4 h.

## 2. Restore (destructive, --yes required)

```bash
bin/backup.sh restore --environment production --set <set-name> --yes
bin/docker-deploy.sh install --environment production     # bring the stack back up
```

## 3. Drill

Once per quarter, perform a real restore into a scratch environment (verify
alone is not a drill).
