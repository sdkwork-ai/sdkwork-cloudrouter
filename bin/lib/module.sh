#!/usr/bin/env bash
# module.sh — sdkwork-cloudrouter bin/ wiring (MODULE_BIN_SPEC.md §3).
# Only module identity, constants, and repo-command delegation live here.
# Every shared primitive (remote execution, packaging, checksums) comes from
# sdkwork-specs/bin/lib/sdkwork-common.sh.

SDKWORK_MODULE_ID="sdkwork-cloudrouter"
SDKWORK_IMAGE_NAME="sdkwork-cloudrouter"
SDKWORK_APP_TYPES="server,pc,h5"

# Operations wiring (OPERATIONS_SPEC.md): the compose service carrying the
# health probe, the probe path (the router publishes /healthz and /readyz on
# container port 3900), and the per-environment host management port.
SDKWORK_PRIMARY_SERVICE="cloudrouter"
SDKWORK_HEALTH_PATH="/healthz"
SDKWORK_CONFIG_ENV_SUBDIR="env"

# Install/upgrade resolve the newest packaged install bundle via the shared
# default (newest under dist/docker-install) — this hook is OPTIONAL
# (MODULE_BIN_SPEC.md §3) and the default is already correct, so there is no
# override. There is deliberately no source-tree bundle: the executors are
# authored flat under bin/ (docker-bundle-deploy.sh / -release.sh) and the
# compose/env inputs live in deployments/docker/bundle/, so an un-packaged
# install fails fast with packaging guidance instead of pushing a directory that
# cannot run on the target.

# Source-tree env dir; used for --dry-run rendering and by config.sh.
sdkwork_module_local_env_dir() {
  printf '%s/deployments/docker/env' "${SDKWORK_MODULE_ROOT}"
}

# Host management port publishing the router container port 3900 per
# environment (router plane 395x series, gateway uses 391x, webserver owns
# 80/443 and 138xx/18xxx).
sdkwork_module_health_port() {
  case "${1:-}" in
    development) printf '3950' ;;
    test)        printf '3951' ;;
    staging)     printf '3952' ;;
    demo)        printf '3954' ;;
    production)  printf '3953' ;;
    *)           printf '' ;;
  esac
}

# Delegates to a lightweight required-keys validation of the env file
# (cloudrouter keeps its canonical config in config.toml inside the image;
# the env file carries the deployment inputs).
sdkwork_module_config_validate() {
  local env_file="$1" key rc=0
  [[ -f "${env_file}" ]] || { sdkwork_die "${SDKWORK_BIN_E_STATE}" "env file missing: ${env_file}"; return 1; }
  # Placeholder/empty mandatory keys are blocking for every environment.
  while IFS= read -r key; do
    [[ -n "${key}" ]] || continue
    local value
    value="$(sed -n "s/^${key}=//p" "${env_file}" | tail -1 | tr -d '\r')"
    if [[ -z "${value}" || "${value}" == "<CHANGE_ME>" ]]; then
      sdkwork_log "FAIL  config  mandatory key '${key}' is empty or a placeholder in $(basename "${env_file}")"
      rc=1
    fi
  done <<EOF
SDKWORK_DATABASE_HOST
SDKWORK_DATABASE_PORT
SDKWORK_DATABASE_NAME
SDKWORK_DATABASE_USERNAME
SDKWORK_DATABASE_PASSWORD
EOF
  if (( rc == 0 )); then
    sdkwork_log "PASS  config  mandatory deployment keys present in $(basename "${env_file}")"
  fi
  return "${rc}"
}

# ----------------------------------------------------------------------------
# Container image (docker-image.sh build)
# ----------------------------------------------------------------------------
sdkwork_image_build() {
  local ref="$1" tag="$2"
  # The cloudrouter container build takes the FULL image reference as --tag
  # (its own default 'cloudrouter:local' carries no registry); it stages the
  # install package, unpacks it, docker-builds, and records the digest in
  # dist/container-image.json (RELEASE_SPEC.md §4.1 evidence).
  sdkwork_local_run pnpm build:container --tag "${ref}"
}

# ----------------------------------------------------------------------------
# Application build (apps-build.sh)
# ----------------------------------------------------------------------------
sdkwork_build_app() {
  local app_type="$1" environment="$2" profile="$3"
  local alias
  alias="$(sdkwork_environment_alias "${environment}")"
  case "${app_type}" in
    pc|h5)
      # Canonical Adaptive Web build runner (PNPM_SCRIPT_SPEC.md §4.2);
      # dist lands at apps/sdkwork-cloudrouter-${app_type}/dist/<profile>/<alias>.
      # The pc portal dist (dist/standalone/prod) is the container image's
      # web-root prerequisite (build-cloud-router-container.mjs).
      local args=(node "${SDKWORK_SPECS_ROOT}/tools/build-browser-client.mjs"
                  --root "${SDKWORK_MODULE_ROOT}"
                  --architecture "${app_type}"
                  --environment "${alias}")
      if [[ "${profile}" == "cloud" ]]; then args+=(--deployment-profile cloud); fi
      # Opt-out escape hatch for pre-existing cross-repo type debt; default
      # stays strict (typecheck runs).
      if [[ "${SDKWORK_BROWSER_SKIP_TYPECHECK:-0}" == "1" ]]; then args+=(--skip-typecheck); fi
      sdkwork_local_run "${args[@]}" ;;
    server)
      sdkwork_local_run cargo build --release ;;
    *)
      sdkwork_die "${SDKWORK_BIN_E_ENV}" "unsupported app type '${app_type}' (declared: ${SDKWORK_APP_TYPES})" ;;
  esac
}

# ----------------------------------------------------------------------------
# Application packaging (apps-package.sh)
# ----------------------------------------------------------------------------
sdkwork_package_app() {
  local app_type="$1" environment="$2" profile="$3" out="$4"
  local alias
  alias="$(sdkwork_environment_alias "${environment}")"
  case "${app_type}" in
    pc|h5)
      local src="${SDKWORK_MODULE_ROOT}/apps/sdkwork-cloudrouter-${app_type}/dist/${profile}/${alias}"
      sdkwork_require_dir "${src}" "run: bin/apps-build.sh ${app_type} ${environment}:${profile}"
      sdkwork_tar_artifact "${src}" \
        "${out}/sdkwork-cloudrouter-${app_type}-${profile}-${alias}.tar.gz" ;;
    server)
      # Install-package builder produces dist/install-packages/* (container
      # install packages + manifest); collect the archives into --out.
      sdkwork_local_run node scripts/build-cloud-router-install-package.mjs
      sdkwork_collect_artifact "${SDKWORK_MODULE_ROOT}/dist/install-packages" "${out}" '*.tar.gz' ;;
    *)
      sdkwork_die "${SDKWORK_BIN_E_ENV}" "unsupported app type '${app_type}'" ;;
  esac
}

# ----------------------------------------------------------------------------
# Application deployment (apps-deploy.sh)
# ----------------------------------------------------------------------------
sdkwork_deploy_app() {
  local app_type="$1" action="$2" environment="$3" profile="$4" host="$5"
  case "${app_type}" in
    pc)
      sdkwork_warn "'pc' delivery is image-owned: the container build consumes apps/sdkwork-cloudrouter-pc/dist as the portal web root."
      sdkwork_log "next: bin/docker-image.sh build --image-tag <version> && bin/docker-deploy.sh install --environment ${environment}" ;;
    h5)
      sdkwork_warn "'h5' delivery is channel-owned: the router image does not carry the h5 bundle."
      sdkwork_log "next: bin/apps-package.sh h5 ${environment}:${profile}, then publish the artifact into the serving static root of the target environment." ;;
    server)
      sdkwork_die "${SDKWORK_BIN_E_STATE}" \
        "sdkwork-cloudrouter is container-only: use the bundle path (bin/docker-image.sh build && bin/docker-deploy.sh install --environment ${environment}); the host-native channel is not defined for this module" ;;
    *)
      sdkwork_die "${SDKWORK_BIN_E_ENV}" "unsupported app type '${app_type}'" ;;
  esac
}

# ----------------------------------------------------------------------------
# Native installer packaging (apps-pkg-installer.sh, MODULE_BIN_SPEC.md §4.9)
# ----------------------------------------------------------------------------
sdkwork_installer_app() {
  local app_type="$1" platform="$2" environment="$3" profile="$4" out="$5" arch="$6" format="$7"
  case "${app_type}:${platform}" in
    server:linux)
      # The router ships the self-contained install package (container install
      # package + manifest); deb/rpm builders are not defined, so other
      # formats fall back to the container channel guidance.
      case "${format}" in
        ""|tar|tar.gz)
          sdkwork_local_run node scripts/build-cloud-router-install-package.mjs
          sdkwork_collect_artifact "${SDKWORK_MODULE_ROOT}/dist/install-packages" "${out}" '*.tar.gz' ;;
        *)
          sdkwork_die "${SDKWORK_BIN_E_ENV}" \
            "format '${format}' is not defined for sdkwork-cloudrouter; use tar.gz or the container channel (bin/docker-image.sh save)" ;;
      esac ;;
    pc|h5)
      sdkwork_die "${SDKWORK_BIN_E_ENV}" \
        "app type '${app_type}' has no native installer channel (pc/h5 are static web bundles: bin/apps-package.sh ${app_type})" ;;
    *)
      sdkwork_die "${SDKWORK_BIN_E_ENV}" \
        "platform '${platform}' is not defined for sdkwork-cloudrouter; use the container channel (bin/docker-image.sh save)" ;;
  esac
}
