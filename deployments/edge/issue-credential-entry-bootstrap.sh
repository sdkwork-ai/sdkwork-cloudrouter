#!/usr/bin/env bash
# Issue the IAM-signed credential-entry bootstrap Access-Token for the deployed
# Cloud Router cloud release and publish it to the portal trusted-host channel.
# Authority: IAM_CREDENTIAL_ENTRY_SPEC.md (credential-entry bootstrap),
# sdkwork-webserver test-package provisioning pattern
# (`gateway issue-credential-entry-bootstrap-token` -> 0600 secret -> edge
# injection), ENVIRONMENT_SPEC.md §6.1.
#
# The issuer binary is /opt/deploy/sdkwork-cloudrouter/bin/cloudrouterctl. It
# embeds the IAM web adapter, so it must be rebuilt whenever the IAM schema
# migrations land: a binary that still queries a renamed table fails here and
# leaves the portal serving an expired token.
set -euo pipefail
D=/etc/sdkwork/cloudrouter/credential-entry-bootstrap
BIN=/opt/deploy/sdkwork-cloudrouter/bin/cloudrouterctl
TENANT_ID="${SDKWORK_WEB_FRAMEWORK_JWT_BOOTSTRAP_TENANT_ID:-100001}"
TTL="${SDKWORK_CLOUDROUTER_CREDENTIAL_ENTRY_BOOTSTRAP_TTL_SECONDS:-3600}"
set -a
# shellcheck disable=SC1091
. "$D/issuer.env"
set +a

# The credential's identity is the installation's deploy application anchor
# (migration 0040: IAM resolves iam_application_installation.deploy_application_id
# and signs that value into the token's app_id/aud). The IAM runtime app id is
# deliberately NOT accepted here: it is the retired "app_id as audience" shape
# and it makes the token name an application the deployment was never registered
# as.
ANCHOR="${SDKWORK_DEPLOY_APPLICATION_ID:-}"
if [[ -z "${ANCHOR}" ]]; then
  echo "issuer.env must set SDKWORK_DEPLOY_APPLICATION_ID to the deploy application anchor" >&2
  exit 78
fi

umask 077
out="$(mktemp /tmp/cloudrouter-bootstrap-token.XXXXXX)"
trap 'rm -f "$out"' EXIT
"$BIN" issue-bootstrap-token --tenant-id "$TENANT_ID" --app-id "$ANCHOR" --ttl-seconds "$TTL" > "$out"
python3 - "$out" "$ANCHOR" <<'PY'
import base64, json, os, sys
record = json.load(open(sys.argv[1], encoding='utf-8'))
anchor = sys.argv[2]
token = record.get('accessToken') or record.get('access_token')
if not isinstance(token, str) or token.count('.') != 2:
    raise SystemExit('issuer did not return a JWT access token')
payload = token.split('.')[1]
payload += '=' * (-len(payload) % 4)
claims = json.loads(base64.urlsafe_b64decode(payload))
if claims.get('app_id') != anchor or claims.get('aud') != anchor:
    raise SystemExit(
        'issuer signed app_id=%r aud=%r but the deploy application anchor is %r'
        % (claims.get('app_id'), claims.get('aud'), anchor)
    )
base = '/etc/sdkwork/cloudrouter/credential-entry-bootstrap'
# 0600 audit copy of the issued credential (never served).
with open(os.path.join(base, 'token'), 'w', encoding='utf-8') as handle:
    handle.write(token + '\n')
os.chmod(os.path.join(base, 'token'), 0o600)
# Trusted-host-channel script served to the portal before app modules execute.
script = 'globalThis.__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__ = ' + json.dumps(token) + ';\n'
target = os.path.join(base, 'credential-entry-bootstrap.js')
tmp = target + '.tmp'
with open(tmp, 'w', encoding='utf-8') as handle:
    handle.write(script)
os.replace(tmp, target)
os.chmod(target, 0o644)
print('issued bootstrap token expiresAt=%s sessionId=%s' % (record.get('expiresAt'), record.get('sessionId')))
PY
