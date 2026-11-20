# Cloud Router edge — credential-entry bootstrap channel

The production portal (`platform.birdcoder.com`, `platform.sdkwork.com`) is a
static Adaptive Web bundle served by nginx. Signing in has no user session yet,
so every pre-session operation (`POST /app/v3/api/auth/sessions`, registration,
password reset, QR login) must carry an **IAM-signed bootstrap `Access-Token`**.
Nothing in the bundle can mint it: the serving edge injects a short-lived token
through the trusted host channel `/__sdkwork/credential-entry-bootstrap.js`, and
the gateway validates it at `request-context-resolution` before it looks at the
user's password.

## Why this directory exists

When token rotation breaks, the portal keeps serving whatever token was written
last. Every other signal stays green — nginx serves, the gateway container is
healthy, the database answers — and every login returns `40103
invalid-credentials` regardless of the password. The failure is indistinguishable
from "wrong password" to a user and from "gateway is fine" to an operator.

That is exactly what happened in production on 2026-11-18: IAM renamed
`iam_tenant_application` to `iam_application_installation`, the edge's
`cloudrouterctl` was two weeks older than the rename, and the 20-minute issuer
timer failed 174 times over 58 hours without a single alert. The portal could not
log anyone in during that window.

So this directory owns three things:

| Concern | Piece |
| --- | --- |
| Publish the token | `issue-credential-entry-bootstrap.sh`, `credential-entry-bootstrap.conf` |
| Prove it is fresh | `verify-credential-entry-bootstrap.sh` (`probe` / `gate`), `publish-bootstrap.sh` |
| Fail loudly | `systemd/*`, `alerting.env.example` |

## Components

| File | Installed as | Role |
| --- | --- | --- |
| `issue-credential-entry-bootstrap.sh` | `/usr/local/sbin/sdkwork-cloudrouter-issue-credential-entry-bootstrap.sh` | Signs a bootstrap token via `cloudrouterctl issue-bootstrap-token`, publishes the `0600` audit copy and the `0644` served script |
| `verify-credential-entry-bootstrap.sh` | `/usr/local/sbin/sdkwork-cloudrouter-verify-credential-entry-bootstrap.sh` | `probe` (health), `gate` (deploy), `notify` (alert) |
| `publish-bootstrap.sh` | `/usr/local/sbin/cloudrouter-publish-bootstrap.sh` | Post-release entry: refresh token, inject the shell tag, run the gate |
| `inject-bootstrap-tag.py` | `/usr/local/sbin/cloudrouter-inject-bootstrap-tag.py` | Idempotently adds the script tag to both portal shells |
| `credential-entry-bootstrap.conf` | `/etc/nginx/snippets/sdkwork-cloudrouter/credential-entry-bootstrap.conf` | `no-store` location that serves the token script |
| `systemd/sdkwork-cloudrouter-bootstrap-token.{service,timer}` | `/etc/systemd/system/` | Rotate every 20 minutes; `OnFailure=` escalates one failed rotation |
| `systemd/sdkwork-cloudrouter-bootstrap-token-health.{service,timer}` | `/etc/systemd/system/` | Check the *served* token every 5 minutes; fails when it is within 2400 s of expiry |
| `systemd/sdkwork-cloudrouter-edge-alert@.service` | `/etc/systemd/system/` | `OnFailure=` target that writes the alert |
| `alerting.env.example` | `/etc/sdkwork/alerting.env` | Optional webhook channel |

## Install

```bash
sudo ./install.sh
```

It installs the files, reloads systemd and nginx, enables both timers, and then
runs the deploy gate. The gate issues a token and requires **≥ 3000 s** of
remaining lifetime, so a stale `cloudrouterctl` fails the install instead of
silently poisoning the portal.

## Verify

```bash
# rotation history and next run
systemctl list-timers 'sdkwork-cloudrouter-bootstrap-token*'
journalctl -u sdkwork-cloudrouter-bootstrap-token.service -n 20 --no-pager

# the token the portal actually receives, with its remaining lifetime
sudo /usr/local/sbin/sdkwork-cloudrouter-verify-credential-entry-bootstrap.sh probe
cat /var/lib/sdkwork/cloudrouter/credential-entry-bootstrap-health.txt

# end-to-end: an invalid password must now reach credential verification instead
# of failing on the bootstrap token (40103 before, anything else after)
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST https://api.sdkwork.com/app/v3/api/auth/sessions \
  -H 'Content-Type: application/json' \
  --data '{"email":"probe@example.com","password":"x"}'
```

## Alert channel

Every alert is written to journald as priority `crit` (tag
`sdkwork-cloudrouter-bootstrap`) and additionally POSTed when
`SDKWORK_ALERT_WEBHOOK_URL` is set in `/etc/sdkwork/alerting.env` (mode `0600`).
Without a webhook, detection still surfaces through `systemctl --failed` and
`journalctl -p crit`, but no one is paged — configure the webhook with whatever
the on-call rotation already watches.

## Rotation contract

- Token TTL defaults to 3600 s (`SDKWORK_CLOUDROUTER_CREDENTIAL_ENTRY_BOOTSTRAP_TTL_SECONDS`); rotation every 20 minutes.
- The gateway's `SDKWORK_API_CLOUD_GATEWAY_IAM_ALLOWED_AUDIENCES` must contain `sdkwork-cloudrouter` (it does) and the issuer secret `issuer.env` must equal the gateway's mounted `iam-signing-master.key`.
- `cloudrouterctl` embeds the IAM web adapter: **any IAM schema migration that touches the installation table requires redeploying this binary in the same release as the web bundle.** The gate exists because that coupling was not enforced before.
