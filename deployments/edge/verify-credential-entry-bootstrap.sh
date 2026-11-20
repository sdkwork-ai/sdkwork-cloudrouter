#!/usr/bin/env bash
# Credential-entry bootstrap Access-Token verification (health probe + deploy gate).
#
# The production portal receives a short-lived IAM-signed bootstrap JWT through
# the trusted host channel `/__sdkwork/credential-entry-bootstrap.js`. Every
# pre-session operation (`POST /app/v3/api/auth/sessions`, registration, password
# reset) carries that token as `Access-Token` and the gateway rejects the request
# with `40103 invalid-credentials` before it ever validates the user's password.
# A stale token therefore takes the whole login surface down while every other
# health signal (nginx, gateway container, database) stays green.
#
# Modes
#   probe   (default)  fail when the token served to the portal is within
#                      SDKWORK_BOOTSTRAP_MIN_REMAINING_SECONDS of expiry
#                      (default 2400s = two missed 20-minute rotations).
#   gate               issue a fresh token, then require >= 3000s of remaining
#                      lifetime. Wired into publish-bootstrap.sh so an edge
#                      release cannot finish with a dead credential channel.
#   notify <unit>      OnFailure= target: record a failed edge unit on the alert
#                      channel.
#
# Authority: IAM_CREDENTIAL_ENTRY_SPEC.md §4/§5 (short-lived bootstrap token,
# trusted-host channel), OPERATIONS_SPEC.md (edge health checks).
set -euo pipefail

BASE_DIR=/etc/sdkwork/cloudrouter/credential-entry-bootstrap
TOKEN_JS="${BASE_DIR}/credential-entry-bootstrap.js"
STATE_DIR=/var/lib/sdkwork/cloudrouter
STATE_FILE="${STATE_DIR}/credential-entry-bootstrap-health.txt"
ALERT_ENV=/etc/sdkwork/alerting.env
ISSUER_ENV="${BASE_DIR}/issuer.env"
ISSUER_UNIT=sdkwork-cloudrouter-bootstrap-token.service
MODE=${1:-probe}

# The deploy application anchor this edge was registered as. A token whose
# app_id/aud is anything else names the wrong application, which is exactly the
# retired "IAM runtime app id as audience" shape: the check refuses it instead of
# letting a technically-valid credential carry the wrong identity.
configured_anchor() {
  [[ -f ${ISSUER_ENV} ]] || { printf ''; return 0; }
  sed -n 's/^SDKWORK_DEPLOY_APPLICATION_ID=//p' "${ISSUER_ENV}" | tail -n 1 \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
          -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# Deliver one critical message. Journald is always written; a webhook is posted
# only when SDKWORK_ALERT_WEBHOOK_URL is configured in the alert env file.
alert() {
  local title="$1" detail="$2" payload
  printf '[CRITICAL] %s: %s\n' "${title}" "${detail}" >&2
  logger -p daemon.crit -t sdkwork-cloudrouter-bootstrap "${title}: ${detail}" || true
  if [[ -f ${ALERT_ENV} ]]; then
    set -a
    # shellcheck disable=SC1090
    . "${ALERT_ENV}"
    set +a
  fi
  if [[ -n ${SDKWORK_ALERT_WEBHOOK_URL:-} ]]; then
    payload=$(printf '{"service":"sdkwork-cloudrouter","level":"critical","title":"%s","detail":"%s"}' \
      "${title}" "${detail}")
    curl -fsS -m 5 -X POST -H 'Content-Type: application/json' \
      --data "${payload}" "${SDKWORK_ALERT_WEBHOOK_URL}" \
      || printf '[CRITICAL] alert webhook delivery failed\n' >&2
  fi
}

# Print `remaining=<s> exp=<iso> ...` for the published token, or exit non-zero
# with the reason on stderr when the token is missing, malformed, expired, or
# closer than the requested threshold.
inspect_token() {
  local min_remaining="$1" expected_anchor="$2" output
  if ! output=$(python3 - "${TOKEN_JS}" "${min_remaining}" "${expected_anchor}" <<'PY'
import base64
import datetime
import json
import sys
import time

path, min_remaining = sys.argv[1], int(sys.argv[2])
expected_anchor = sys.argv[3].strip()
marker = 'globalThis.__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__'

try:
    body = open(path, encoding='utf-8').read()
except OSError as exc:
    sys.exit('token delivery script unreadable: %s' % exc)

if marker not in body:
    sys.exit('token delivery script does not publish %s' % marker)

token = body.split('=', 1)[1].strip().rstrip(';').strip().strip('"')
parts = token.split('.')
if len(parts) != 3:
    sys.exit('published value is not a compact JWT')

payload = parts[1] + '=' * (-len(parts[1]) % 4)
try:
    claims = json.loads(base64.urlsafe_b64decode(payload))
except Exception as exc:  # noqa: BLE001 - any decode defect means "invalid"
    sys.exit('JWT payload is not decodable: %s' % exc)

exp = claims.get('exp')
if not isinstance(exp, int):
    sys.exit('JWT carries no integer exp claim')

if not expected_anchor:
    sys.exit(
        'issuer.env does not set SDKWORK_DEPLOY_APPLICATION_ID; '
        'the credential identity cannot be verified'
    )
if claims.get('app_id') != expected_anchor or claims.get('aud') != expected_anchor:
    sys.exit(
        'token names app_id=%r aud=%r but the deploy application anchor is %r'
        % (claims.get('app_id'), claims.get('aud'), expected_anchor)
    )

now = int(time.time())
remaining = exp - now
exp_iso = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).isoformat()
iat = claims.get('iat')
iat_iso = (
    datetime.datetime.fromtimestamp(iat, datetime.timezone.utc).isoformat()
    if isinstance(iat, int)
    else 'n/a'
)
print(
    'remaining=%d exp=%s iat=%s app=%s aud=%s tenant=%s'
    % (remaining, exp_iso, iat_iso,
       claims.get('app_id'), claims.get('aud'), claims.get('tenant_id'))
)
if remaining < min_remaining:
    sys.exit('token expires in %ds, below the required %ds' % (remaining, min_remaining))
PY
  ); then
    return 1
  fi
  printf '%s\n' "${output}"
}

record_state() {
  local status="$1" info="$2"
  mkdir -p "${STATE_DIR}"
  {
    printf 'status=%s\n' "${status}"
    printf 'checked_at=%s\n' "$(date -u +%FT%TZ)"
    [[ -n ${info} ]] && printf '%s\n' "${info}"
  } > "${STATE_FILE}"
}

case "${MODE}" in
  probe)
    threshold="${SDKWORK_BOOTSTRAP_MIN_REMAINING_SECONDS:-2400}"
    if info=$(inspect_token "${threshold}" "$(configured_anchor)"); then
      record_state ok "${info}"
      printf 'PASS  credential-entry bootstrap token fresh: %s\n' "${info}"
    else
      record_state failed ""
      alert 'credential-entry bootstrap token is stale' \
        "portal login is broken: the served Access-Token is expired or within ${threshold}s of expiry (issuer unit: ${ISSUER_UNIT})"
      exit 1
    fi
    ;;
  gate)
    printf 'gate  issuing a fresh bootstrap token via %s\n' "${ISSUER_UNIT}"
    if ! systemctl start "${ISSUER_UNIT}"; then
      alert 'credential-entry bootstrap issuance failed' \
        "${ISSUER_UNIT} failed; the portal cannot log anyone in until it succeeds"
      exit 1
    fi
    threshold="${SDKWORK_BOOTSTRAP_GATE_MIN_REMAINING_SECONDS:-3000}"
    if info=$(inspect_token "${threshold}" "$(configured_anchor)"); then
      record_state ok "${info}"
      printf 'PASS  credential-entry bootstrap gate satisfied: %s\n' "${info}"
    else
      record_state failed ""
      alert 'credential-entry bootstrap gate failed' \
        "issuance reported success but the served token is not fresh (>= ${threshold}s required)"
      exit 1
    fi
    ;;
  notify)
    unit="${2:-${ISSUER_UNIT}}"
    alert 'edge unit failed' \
      "${unit} exited non-zero; portal credential entry may be down (journalctl -u ${unit})"
    ;;
  *)
    printf 'usage: %s [probe|gate|notify <unit>]\n' "$0" >&2
    exit 64
    ;;
esac
