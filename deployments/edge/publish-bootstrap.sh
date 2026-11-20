#!/usr/bin/env bash
# Refresh the IAM-signed credential-entry bootstrap Access-Token and ensure the
# portal shells carry the trusted-host-channel script tag (release cloud mode).
#
# Runs after every edge release. Because the token is what makes the portal's
# login surface work at all, the refresh is also a deployment gate: publishing
# a stale token now fails the release instead of failing every user's login
# hours later.
set -euo pipefail

SBIN=/usr/local/sbin
ISSUER="${SBIN}/sdkwork-cloudrouter-issue-credential-entry-bootstrap.sh"
GATE="${SBIN}/sdkwork-cloudrouter-verify-credential-entry-bootstrap.sh"

if [[ -x ${ISSUER} ]]; then
  systemctl start sdkwork-cloudrouter-bootstrap-token.service
  echo "credential-entry bootstrap Access-Token refreshed"
else
  echo "warning: bootstrap token issuer is not installed" >&2
fi

python3 "${SBIN}/cloudrouter-inject-bootstrap-tag.py"

if [[ -x ${GATE} ]]; then
  # Fails the release when the served token is not fresh, which is exactly the
  # symptom of a stale `cloudrouterctl` that cannot resolve the current IAM
  # installation table.
  "${GATE}" gate
else
  echo "warning: bootstrap token gate is not installed; freshness unverified" >&2
fi
