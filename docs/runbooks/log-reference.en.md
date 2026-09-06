# Runbook — sdkwork-cloudrouter log reference (EN)

Healthy startup signature (RUST_LOG=info):

```
[sdkwork-cloudrouter] ... listening on 0.0.0.0:3900
```

## Reading

```bash
bin/docker-deploy.sh logs --environment production --tail 200          # bounded read (default)
bin/docker-deploy.sh logs --environment production --follow            # explicit follow
bin/docker-deploy.sh logs --environment production --export ./out      # redacted ticket attachment
```

## Known failure signatures

| Signature | Meaning | Action |
| --- | --- | --- |
| `connection refused ... 5432` | database unreachable | run `bin/doctor.sh --environment <env>`, check ports/config |
| `password authentication failed` | env secret drift | fix via `bin/config.sh diff --environment <env>` |
| repeated `panic` + container restarts | crash loop | check restart count via `bin/doctor.sh`; roll the version back |
