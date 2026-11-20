#!/usr/bin/env bash
# Install the Cloud Router edge credential-entry bootstrap channel.
#
# Idempotent. Installs the trusted-host-channel scripts, the systemd units that
# rotate and verify the bootstrap token, and the nginx snippet that serves it.
# The last step is the deploy gate: installing this on a host whose
# `cloudrouterctl` cannot resolve the current IAM schema fails immediately
# instead of degrading into a silent login outage.
#
# Run as root on the edge host that serves the portal
# (platform.birdcoder.com / platform.sdkwork.com).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SBIN=/usr/local/sbin
UNIT_DIR=/etc/systemd/system
SNIPPET=/etc/nginx/snippets/sdkwork-cloudrouter/credential-entry-bootstrap.conf
TOKEN_DIR=/etc/sdkwork/cloudrouter/credential-entry-bootstrap
STATE_DIR=/var/lib/sdkwork/cloudrouter

[[ ${EUID} -eq 0 ]] || { echo 'install.sh must run as root' >&2; exit 1; }

install -d -m 0755 "${STATE_DIR}" "${TOKEN_DIR}" "$(dirname "${SNIPPET}")"

install -m 0755 "${HERE}/issue-credential-entry-bootstrap.sh" \
  "${SBIN}/sdkwork-cloudrouter-issue-credential-entry-bootstrap.sh"
install -m 0755 "${HERE}/verify-credential-entry-bootstrap.sh" \
  "${SBIN}/sdkwork-cloudrouter-verify-credential-entry-bootstrap.sh"
install -m 0755 "${HERE}/publish-bootstrap.sh" \
  "${SBIN}/cloudrouter-publish-bootstrap.sh"
install -m 0755 "${HERE}/inject-bootstrap-tag.py" \
  "${SBIN}/cloudrouter-inject-bootstrap-tag.py"

install -m 0644 "${HERE}/credential-entry-bootstrap.conf" "${SNIPPET}"

install -m 0644 "${HERE}/systemd/sdkwork-cloudrouter-bootstrap-token.service" "${UNIT_DIR}/"
install -m 0644 "${HERE}/systemd/sdkwork-cloudrouter-bootstrap-token.timer" "${UNIT_DIR}/"
install -m 0644 "${HERE}/systemd/sdkwork-cloudrouter-bootstrap-token-health.service" "${UNIT_DIR}/"
install -m 0644 "${HERE}/systemd/sdkwork-cloudrouter-bootstrap-token-health.timer" "${UNIT_DIR}/"
install -m 0644 "${HERE}/systemd/sdkwork-cloudrouter-edge-alert@.service" "${UNIT_DIR}/"

systemctl daemon-reload

if ! grep -rqs 'credential-entry-bootstrap.conf' /etc/nginx/sites-enabled/; then
  echo "WARNING: no enabled nginx server block includes ${SNIPPET}" >&2
fi
nginx -t
systemctl reload nginx

systemctl enable --now sdkwork-cloudrouter-bootstrap-token.timer
systemctl enable --now sdkwork-cloudrouter-bootstrap-token-health.timer

# Deploy gate: issue a token and refuse to report success unless the token the
# edge now serves carries a healthy remaining lifetime.
"${SBIN}/sdkwork-cloudrouter-verify-credential-entry-bootstrap.sh" gate

echo
echo 'installed:'
echo "  issuer timer     systemctl list-timers | grep bootstrap-token"
echo "  health timer     systemctl list-timers | grep bootstrap-token-health"
echo "  token state      ${STATE_DIR}/credential-entry-bootstrap-health.txt"
echo "  alert channel    /etc/sdkwork/alerting.env (see alerting.env.example)"
