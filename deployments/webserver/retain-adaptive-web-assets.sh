#!/usr/bin/env bash
# Retain content-hashed Adaptive Web chunks from recent Cloud Router releases.
#
# Every Cloud Router release swaps /usr/share/sdkwork/router/web/{pc,h5}
# wholesale and moves the outgoing build under
# /opt/deploy/sdkwork-cloudrouter/rollback/. A browser that still holds the
# previous SPA document (open tab, bfcache) then asks for chunk names that no
# longer exist in the live root. Serving those requests through the SPA
# fallback returned index.html with HTTP 200 and the strict module MIME check
# aborted the page ("Expected a JavaScript-or-Wasm module script").
#
# This mirror keeps recent hashed chunks resolvable for nginx. Files are
# hard-linked, so the disk blocks are shared with the rollback release that
# already holds them, and pruning is by the build mtime carried by the link.
#
# Installed on the production edge as
#   /usr/local/sbin/sdkwork-cloudrouter-retain-web-assets
# driven by deployments/systemd/sdkwork-cloudrouter-retain-web-assets.{path,timer}.
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/usr/share/sdkwork/router/web}"
ROLLBACK_ROOT="${ROLLBACK_ROOT:-/opt/deploy/sdkwork-cloudrouter/rollback}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

umask 022

sync_surface() {
  local surface="$1"
  local legacy_root="${WEB_ROOT}/${surface}.legacy"
  local legacy_assets="${legacy_root}/assets"
  local source_assets

  install -d -m 0755 "${legacy_root}" "${legacy_assets}"

  shopt -s nullglob
  for source_assets in "${ROLLBACK_ROOT}"/prev-*/"${surface}"/assets \
                       "${ROLLBACK_ROOT}"/web-pre-*/"${surface}"/assets; do
    [ -d "${source_assets}" ] || continue
    find "${source_assets}" -maxdepth 1 -type f -mtime -"${RETAIN_DAYS}" \
      -exec cp -al -t "${legacy_assets}" {} + 2>/dev/null || true
  done
  shopt -u nullglob

  find "${legacy_assets}" -maxdepth 1 -type f -mtime +"${RETAIN_DAYS}" -delete
}

sync_surface pc
sync_surface h5
