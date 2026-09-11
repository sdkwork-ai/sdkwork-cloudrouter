#!/usr/bin/env bash
# ============================================================================
# deploy.sh — generic deployer for the sdkwork-cloudrouter unified install
# bundle.
#
# One image, any environment, N instances per environment
# (DEPLOYMENT_SPEC.md §6 / OPERATIONS_SPEC.md).
#
# Layout (auto-detected):
#   bundle:  ./compose/docker-compose.bundle.yml + ./env/
#   repo:    ../compose/docker-compose.bundle.yml + ../env/
#
# Usage:
#   deploy.sh --environment <development|test|staging|demo|production> [options]
#     --replicas <N>     instances to run (default 1; every env supports N)
#     --external         use external postgres/redis (default; env-file hosts)
#     --embedded         opt in to embedded postgres/redis containers instead
#     --image-tag <tag>  override SDKWORK_CLOUDROUTER_IMAGE_TAG
#     --env-file <path>  absolute path of an external env file shared by all
#                        instances; the file MUST already exist
#     --set KEY VALUE    write one required value into the env file (refuses to
#                        overwrite an already-configured value)
#     --force-set K V    like --set but replaces even a configured value
#     --down             stop instances (+ embedded deps when --embedded)
#     --purge            with --down: also delete volumes and network
#     --ps               show instance status
#     --logs [N]         instance logs, instance N (default 1; prefer --instance)
#     --instance <N>     select the instance for --logs (default 1)
#     --service <name>   compose service to read (default cloudrouter)
#     --tail <N|all>     lines from the end (default 200)
#     --since <dur|time> start point, e.g. 15m or 2026-09-05T10:00:00Z
#     --follow           keep streaming (default: bounded read)
#     --stop             stop instances (+ embedded deps when --embedded;
#                        containers kept — fast --start later)
#     --start            start a previously --stop-ed environment again
#     --restart          restart instances (+ embedded deps when --embedded;
#                        env/config changes need a full apply instead)
#     --check-config     run the env preflight checks only (including the
#                        live external PostgreSQL/Redis probes); deploy nothing
#     --dry-run          print the resolved commands only
#
# Examples:
#   deploy.sh --environment development
#   deploy.sh --environment production --replicas 3
#   deploy.sh --environment production --embedded --replicas 2
#   deploy.sh --environment test --down --purge
#
# Idempotent: re-running apply updates the existing stack in place.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_PREFIX="[sdkwork-cloudrouter-deploy]"

info() { printf '%s %s\n' "$LOG_PREFIX" "$*"; }
die()  { printf '%s ERROR: %s\n' "$LOG_PREFIX" "$*" >&2; exit 1; }
usage() { sed -n '2,/^set -euo pipefail$/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0; }

# --- layout autodetection ----------------------------------------------------
if [ -f "${SCRIPT_DIR}/compose/docker-compose.bundle.yml" ]; then
  COMPOSE_DIR="${SCRIPT_DIR}/compose"
  ENV_DIR="${SCRIPT_DIR}/env"
  BUNDLE_IMAGE_TGZ="${SCRIPT_DIR}/image.tar.gz"
  BUNDLE_IMAGE_ENV="${SCRIPT_DIR}/image.env"
else
  # Repository layout: this script is authored flat as
  # bin/docker-bundle-deploy.sh (MODULE_BIN_SPEC.md §2.2), so one level up is
  # the repository root; the bundle inputs (compose + env) stay under
  # deployments/docker/bundle/.
  SDKWORK_REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  COMPOSE_DIR="${SDKWORK_REPO_ROOT}/deployments/docker/bundle/compose"
  ENV_DIR="${SDKWORK_REPO_ROOT}/deployments/docker/bundle/env"
  BUNDLE_IMAGE_TGZ=""
  BUNDLE_IMAGE_ENV=""
fi
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.bundle.yml"

# --- defaults ------------------------------------------------------------------
ENVIRONMENT=""
REPLICAS=""
LOG_INSTANCE="1"
LOG_SERVICE="cloudrouter"
LOG_TAIL="200"
LOG_SINCE=""
LOG_FOLLOW="0"
# External host-system postgres/redis is the default dependency mode: the env
# files target the docker host's own PostgreSQL (5432) and Redis (6379) via
# host.docker.internal. Opt into embedded containers with --embedded (or
# SDKWORK_CLOUDROUTER_DEPS_MODE in the env file).
DEPS_MODE_FLAG=""
ACTION="apply"
PURGE="0"
IMAGE_TAG=""
DRY_RUN="0"
OPT_ENV_FILE=""
SET_KEY=""
SET_VALUE=""
SET_FORCE="0"

while [ $# -gt 0 ]; do
  case "$1" in
    --environment) ENVIRONMENT="$2"; shift 2 ;;
    --replicas)    REPLICAS="$2"; shift 2 ;;
    --external)    DEPS_MODE_FLAG="external"; shift ;;
    --embedded)    DEPS_MODE_FLAG="embedded"; shift ;;
    --image-tag)   IMAGE_TAG="$2"; shift 2 ;;
    --env-file)    OPT_ENV_FILE="$2"; shift 2 ;;
    --down)        ACTION="down"; shift ;;
    --purge)       PURGE="1"; shift ;;
    --ps)          ACTION="ps"; shift ;;
    --logs)        ACTION="logs"; LOG_INSTANCE="${2:-1}"; case "${2:-}" in ''|*[!0-9]*) shift ;; *) shift 2 ;; esac ;;
    --instance)    LOG_INSTANCE="$2"; shift 2 ;;
    --service)     LOG_SERVICE="$2"; shift 2 ;;
    --tail)        LOG_TAIL="$2"; shift 2 ;;
    --since)       LOG_SINCE="$2"; shift 2 ;;
    --follow)      LOG_FOLLOW="1"; shift ;;
    --stop)        ACTION="stop"; shift ;;
    --start)       ACTION="start"; shift ;;
    --restart)     ACTION="restart"; shift ;;
    --set)         [ $# -ge 3 ] || die "--set requires KEY and VALUE"; ACTION="set"; SET_KEY="$2"; SET_VALUE="$3"; shift 3 ;;
    --force-set)   [ $# -ge 3 ] || die "--force-set requires KEY and VALUE"; ACTION="set"; SET_KEY="$2"; SET_VALUE="$3"; SET_FORCE="1"; shift 3 ;;
    --check-config) ACTION="check-config"; shift ;;
    --dry-run)     DRY_RUN="1"; shift ;;
    -h|--help)     usage ;;
    *)             die "unsupported option: $1 (see --help)" ;;
  esac
done

[ -n "${ENVIRONMENT}" ] || die "--environment is required (development|test|staging|demo|production)"
case "${ENVIRONMENT}" in
  development|test|staging|demo|production) ;;
  *) die "unsupported environment: ${ENVIRONMENT} (development|test|staging|demo|production)" ;;
esac
command -v docker >/dev/null 2>&1 || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is required (docker-compose-plugin)"
[ -f "${COMPOSE_FILE}" ] || die "compose template missing: ${COMPOSE_FILE}"

# --- env file ----------------------------------------------------------------
if [ -n "${OPT_ENV_FILE}" ]; then
  [ -f "${OPT_ENV_FILE}" ] || die "--env-file: file not found: ${OPT_ENV_FILE}"
  ENV_FILE="${OPT_ENV_FILE}"
else
  ENV_FILE="${ENV_DIR}/${ENVIRONMENT}.env"
  ENV_EXAMPLE="${ENV_DIR}/${ENVIRONMENT}.env.example"
  if [ ! -f "${ENV_FILE}" ]; then
    [ -f "${ENV_EXAMPLE}" ] || die "env file missing and no example: ${ENV_EXAMPLE}"
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    info "created ${ENV_FILE} from example — fill secrets before exposing beyond localhost"
  fi
fi

env_key() {
  sed -n "s/^${1}=//p" "${ENV_FILE}" | tail -1 | tr -d '\r'
}

# --- env preflight (fail-closed, collects ALL gaps) -------------------------------
# Read-only: configured values are kept as-is; every missing required key is
# reported in ONE run with foolproof fix instructions; deploy aborts while any
# required input is unconfigured (DEPLOYMENT_SPEC.md §6 / OPERATIONS_SPEC.md §3).
is_unconfigured() {
  case "$1" in
    ""|"<CHANGE_ME>"|"<change_me>"|"CHANGE_ME"|"changeme") return 0 ;;
    *) return 1 ;;
  esac
}

# --- dependency mode resolution -------------------------------------------------
# --embedded / --external flag > SDKWORK_CLOUDROUTER_DEPS_MODE in the env file
# > external (same contract as the gateway deployer's GATEWAY_DEPS_MODE).
EXTERNAL="1"
if [ -z "${DEPS_MODE_FLAG}" ]; then
  env_mode="$(env_key SDKWORK_CLOUDROUTER_DEPS_MODE)"
  case "${env_mode}" in
    embedded) DEPS_MODE_FLAG="embedded" ;;
    external|"") ;;
    *) die "unsupported SDKWORK_CLOUDROUTER_DEPS_MODE: ${env_mode} (external|embedded)" ;;
  esac
fi
[ "${DEPS_MODE_FLAG}" = "embedded" ] && EXTERNAL="0"

set_env_key() {  # $1=key $2=value $3=force
  local key="$1" value="$2" force="${3:-0}" current secret="0"
  case "${key}" in
    ''|*[!A-Za-z0-9_]*) die "--set key must be a bare identifier (letters, digits, _): '${key}'" ;;
  esac
  current="$(env_key "${key}")"
  if ! is_unconfigured "${current}" && [ "${force}" != "1" ]; then
    info "${key} is already configured in ${ENV_FILE}; kept as-is (deploy never rewrites configured values)."
    info "to replace it deliberately, re-run with: --force-set ${key} '<new-value>'"
    return 3
  fi
  case "${key}" in
    *PASSWORD*|*SECRET*|*PEPPER*|*API_KEY*|*_KEY|*DATABASE_URL*|*_URL) secret="1" ;;
  esac
  awk -v k="${key}" -v v="${value}" '
    $0 ~ "^[[:space:]]*(export[[:space:]]+)?"k"=" { print k"="v; found=1; next }
    { print }
    END { if (!found) print k"="v }
  ' "${ENV_FILE}" > "${ENV_FILE}.tmp" && mv -f "${ENV_FILE}.tmp" "${ENV_FILE}"
  if [ "${secret}" = "1" ]; then
    info "set ${key}=<redacted> in ${ENV_FILE}"
  else
    info "set ${key}=${value} in ${ENV_FILE}"
  fi
  info "next step: re-run the deploy command, e.g. $0 --environment ${ENVIRONMENT}"
}

require_env_key() {  # $1=key $2=label $3=example value
  local key="$1" label="$2" example="$3" value
  value="$(env_key "${key}")"
  if is_unconfigured "${value}"; then
    info "MISSING: ${key} (${label}) is not configured"
    info "  fix 1 (recommended): $0 --environment ${ENVIRONMENT} --set ${key} '<value>'"
    info "  fix 2: edit ${ENV_FILE} and set: ${key}=${example}"
    PREFLIGHT_FAIL="1"
  else
    info "OK: ${key} configured (existing value kept; deploy never rewrites it)"
  fi
}

# From the deploy host, container-side endpoint names collapse to loopback.
probe_endpoint_host() {
  case "$1" in
    host.docker.internal|localhost) printf '127.0.0.1' ;;
    *) printf '%s' "$1" ;;
  esac
}

probe_external_postgres() {
  local host port user db pass ssl probe out rc=0
  host="$(env_key SDKWORK_DATABASE_HOST)"
  port="$(env_key SDKWORK_DATABASE_PORT)"; port="${port:-5432}"
  user="$(env_key SDKWORK_DATABASE_USERNAME)"
  db="$(env_key SDKWORK_DATABASE_NAME)"
  pass="$(env_key SDKWORK_DATABASE_PASSWORD)"
  ssl="$(env_key SDKWORK_DATABASE_SSL_MODE)"
  if ! command -v psql >/dev/null 2>&1; then
    info "NOTE: psql not found on this host — skipped the live PostgreSQL probe (install postgresql-client for the full preflight)"
    return 0
  fi
  probe="$(probe_endpoint_host "${host}")"
  out="$(env PGCONNECT_TIMEOUT=5 \
    ${ssl:+PGSSLMODE="${ssl}"} \
    PGPASSWORD="${pass}" \
    psql -h "${probe}" -p "${port}" -U "${user}" -d "${db}" -w -Atc 'select 1' 2>&1)" || rc=$?
  if [ "${rc}" = "0" ]; then
    info "OK: external PostgreSQL reachable and credentials accepted (${host}:${port}/${db} as ${user})"
    return 0
  fi
  case "${out}" in
    *"password authentication failed"*)
      die "external PostgreSQL rejected the configured credentials (${user}@${host}:${port}/${db}). On the database host, align the role password with the deploy env, e.g.: sudo -u postgres psql -c \"ALTER ROLE ${user} PASSWORD '<the SDKWORK_DATABASE_PASSWORD value from ${ENV_FILE}>'\" — then re-run this command." ;;
    *"does not exist"*)
      die "external PostgreSQL database not found (${db} on ${host}:${port}). Create it on the database host, e.g.: sudo -u postgres psql -c \"CREATE DATABASE ${db} OWNER ${user};\" — then re-run this command." ;;
    *"no pg_hba.conf entry"*|*"Peer authentication failed"*)
      die "external PostgreSQL pg_hba.conf rejects password auth for ${user} from this host. Add a host-based scram-sha-256 entry and reload PostgreSQL." ;;
    *)
      die "external PostgreSQL unreachable (${host}:${port}): ${out}. Check the service is up (systemctl status postgresql), the host/port values in ${ENV_FILE}, and firewall rules." ;;
  esac
}

# Run a command under a wall-clock bound. GNU `timeout` is coreutils-only and
# absent on macOS, so fall back to a background watchdog; both paths bound the
# probe identically.
run_bounded() {
  local seconds="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    local bounded_rc=0
    timeout "${seconds}" "$@" || bounded_rc=$?
    return "${bounded_rc}"
  fi
  "$@" &
  local cmd_pid=$!
  ( sleep "${seconds}"; kill -TERM "${cmd_pid}" 2>/dev/null ) >/dev/null 2>&1 &
  local watchdog_pid=$!
  local rc=0
  wait "${cmd_pid}" 2>/dev/null || rc=$?
  kill -TERM "${watchdog_pid}" 2>/dev/null || true
  return "${rc}"
}


probe_external_redis() {
  local host port pass probe out rc=0
  host="$(env_key SDKWORK_CLOUDROUTER_REDIS_HOST)"
  port="$(env_key SDKWORK_CLOUDROUTER_REDIS_PORT)"; port="${port:-6379}"
  pass="$(env_key SDKWORK_CLOUDROUTER_REDIS_PASSWORD)"
  if ! command -v redis-cli >/dev/null 2>&1; then
    info "NOTE: redis-cli not found on this host — skipped the live Redis probe (install redis-tools for the full preflight)"
    return 0
  fi
  probe="$(probe_endpoint_host "${host}")"
  if [ -n "${pass}" ]; then
    out="$(run_bounded 6 env REDISCLI_AUTH="${pass}" redis-cli -h "${probe}" -p "${port}" ping 2>&1)" || rc=$?
  else
    out="$(run_bounded 6 redis-cli -h "${probe}" -p "${port}" ping 2>&1)" || rc=$?
  fi
  if [ "${rc}" = "0" ] && [ "${out}" = "PONG" ]; then
    info "OK: external Redis reachable (${host}:${port})"
    return 0
  fi
  case "${out}" in
    *"WRONGPASS"*|*"NOAUTH"*|*"Client sent AUTH"*)
      die "external Redis rejected the configured auth (${host}:${port}). Align SDKWORK_CLOUDROUTER_REDIS_PASSWORD in ${ENV_FILE} with the Redis requirepass value (empty value = passwordless Redis), then re-run this command." ;;
    *)
      die "external Redis unreachable (${host}:${port}): ${out}. Check the service is up (systemctl status redis-server), the host/port values in ${ENV_FILE}, and firewall rules." ;;
  esac
}

PREFLIGHT_FAIL="0"

case "${ACTION}" in
  apply|check-config)
    require_env_key SDKWORK_DATABASE_HOST "external PostgreSQL host" "host.docker.internal"
    pre_db_host="$(env_key SDKWORK_DATABASE_HOST)"
    case "${pre_db_host}" in
      *example.com*|*example.org*|*your-db-host*)
        info "MISSING: SDKWORK_DATABASE_HOST is still the documentation placeholder '${pre_db_host}'"
        info "  fix: edit ${ENV_FILE} and set: SDKWORK_DATABASE_HOST=host.docker.internal"
        PREFLIGHT_FAIL="1" ;;
    esac
    require_env_key SDKWORK_DATABASE_PORT "external PostgreSQL port" "5432"
    pre_db_port="$(env_key SDKWORK_DATABASE_PORT)"
    case "${pre_db_port}" in ''|*[!0-9]*) die "env preflight: SDKWORK_DATABASE_PORT must be numeric (got '${pre_db_port}')" ;; esac
    require_env_key SDKWORK_DATABASE_NAME "external PostgreSQL database" "sdkwork_ai_<env>"
    require_env_key SDKWORK_DATABASE_USERNAME "external PostgreSQL user" "sdkwork_ai_<env>"
    pre_db_password="$(env_key SDKWORK_DATABASE_PASSWORD)"
    if is_unconfigured "${pre_db_password}"; then
      info "MISSING: SDKWORK_DATABASE_PASSWORD (database credentials) is not configured"
      info "  fix: edit ${ENV_FILE} and set: SDKWORK_DATABASE_PASSWORD=<your-db-password>"
      PREFLIGHT_FAIL="1"
    else
      info "OK: database credentials configured (existing value kept; deploy never rewrites it)"
    fi
    require_env_key SDKWORK_CLOUDROUTER_REDIS_HOST "external Redis host" "host.docker.internal"
    require_env_key SDKWORK_CLOUDROUTER_REDIS_PORT "external Redis port" "6379"
    pre_redis_port="$(env_key SDKWORK_CLOUDROUTER_REDIS_PORT)"
    case "${pre_redis_port}" in ''|*[!0-9]*) die "env preflight: SDKWORK_CLOUDROUTER_REDIS_PORT must be numeric (got '${pre_redis_port}')" ;; esac
    pre_ssl_mode="$(env_key SDKWORK_DATABASE_SSL_MODE)"
    pre_ssl_mode="${pre_ssl_mode:-disable}"
    case "${pre_ssl_mode}" in
      disable|allow|prefer|require|verify-ca|verify-full)
        info "OK: SDKWORK_DATABASE_SSL_MODE=${pre_ssl_mode}" ;;
      *)
        die "env preflight: SDKWORK_DATABASE_SSL_MODE='${pre_ssl_mode}' is invalid (disable|allow|prefer|require|verify-ca|verify-full)" ;;
    esac
    if [ "${EXTERNAL}" = "1" ] && [ "${DRY_RUN}" != "1" ] && [ "${PREFLIGHT_FAIL}" = "0" ]; then
      probe_external_postgres
      probe_external_redis
    fi
    if [ "${PREFLIGHT_FAIL}" = "1" ]; then
      info "env preflight FAILED: configure every MISSING key above, then re-run this command. Nothing was deployed."
      exit 1
    fi
    info "env preflight passed: all required inputs are configured (existing values kept; deploy never rewrites them)"
    ;;
esac

# --- image tag resolution ------------------------------------------------------
if [ -z "${IMAGE_TAG}" ]; then
  IMAGE_TAG="$(env_key SDKWORK_CLOUDROUTER_IMAGE_TAG)"
fi
if [ -z "${IMAGE_TAG}" ] && [ -n "${BUNDLE_IMAGE_ENV}" ] && [ -f "${BUNDLE_IMAGE_ENV}" ]; then
  IMAGE_TAG="$(sed -n 's/^SDKWORK_CLOUDROUTER_IMAGE_TAG=//p' "${BUNDLE_IMAGE_ENV}" | tail -1 | tr -d '\r')"
fi
IMAGE_TAG="${IMAGE_TAG:-0.4.0}"
IMAGE_REF="registry.sdkwork.com/apps/sdkwork-cloudrouter:${IMAGE_TAG}"
export SDKWORK_CLOUDROUTER_IMAGE_TAG="${IMAGE_TAG}"
# The router binary classifies runtime metrics against the canonical
# development|test|staging|production enum only; the demo ops environment maps
# to staging at runtime (its management port stays on the 3954 demo plane).
case "${ENVIRONMENT}" in
  demo) export SDKWORK_CLOUDROUTER_ENVIRONMENT="staging" ;;
  *)    export SDKWORK_CLOUDROUTER_ENVIRONMENT="${ENVIRONMENT}" ;;
esac

# --- per-environment management port base (env file wins) -----------------------
case "${ENVIRONMENT}" in
  development) PORT_BASE="$(env_key SDKWORK_CLOUDROUTER_DEV_HOST_PORT)";  PORT_BASE="${PORT_BASE:-3950}" ;;
  test)        PORT_BASE="$(env_key SDKWORK_CLOUDROUTER_TEST_HOST_PORT)"; PORT_BASE="${PORT_BASE:-3951}" ;;
  staging)     PORT_BASE="$(env_key SDKWORK_CLOUDROUTER_STAGING_HOST_PORT)"; PORT_BASE="${PORT_BASE:-3952}" ;;
  demo)        PORT_BASE="$(env_key SDKWORK_CLOUDROUTER_DEMO_HOST_PORT)"; PORT_BASE="${PORT_BASE:-3954}" ;;
  production)  PORT_BASE="$(env_key SDKWORK_CLOUDROUTER_PROD_HOST_PORT)"; PORT_BASE="${PORT_BASE:-3953}" ;;
esac

if [ -z "${REPLICAS}" ]; then
  REPLICAS="$(env_key SDKWORK_CLOUDROUTER_REPLICAS)"
fi
REPLICAS="${REPLICAS:-1}"
case "${REPLICAS}" in ''|*[!0-9]*) die "--replicas must be a positive integer" ;; esac
[ "${REPLICAS}" -ge 1 ] || die "--replicas must be a positive integer"

DEPS_PROJECT="sdkwork-cloudrouter-${ENVIRONMENT}-deps"
NETWORK="sdkwork-cloudrouter-${ENVIRONMENT}"
HEALTH_TIMEOUT="${SDKWORK_DEPLOY_HEALTH_TIMEOUT:-300}"

run() {
  info "$*"
  if [ "${DRY_RUN}" != "1" ]; then "$@"; fi
}

# --- shared resources (per environment, shared by all instances) ---------------
ensure_shared_resources() {
  run docker network create "${NETWORK}" 2>/dev/null || info "network ${NETWORK} already present"
  for suffix in secrets data postgres-data redis-data; do
    run docker volume create "sdkwork-cloudrouter-${ENVIRONMENT}-${suffix}" 2>/dev/null \
      || info "volume sdkwork-cloudrouter-${ENVIRONMENT}-${suffix} already present"
  done
}

# --- image ---------------------------------------------------------------------
ensure_image() {
  if [ "${DRY_RUN}" = "1" ]; then
    info "dry-run: would ensure image ${IMAGE_REF} (load bundle image.tar.gz when missing)"
    return 0
  fi
  if docker image inspect "${IMAGE_REF}" >/dev/null 2>&1; then
    info "image present: ${IMAGE_REF}"
    return 0
  fi
  if [ -n "${BUNDLE_IMAGE_TGZ}" ] && [ -f "${BUNDLE_IMAGE_TGZ}" ]; then
    run docker load -i "${BUNDLE_IMAGE_TGZ}"
    return 0
  fi
  die "image ${IMAGE_REF} not found and no bundle image.tar.gz beside this script; build with: pnpm build:container"
}

# --- embedded deps ---------------------------------------------------------------
ensure_deps() {
  if [ "${EXTERNAL}" = "1" ]; then
    info "external dependencies mode: using env-file SDKWORK_DATABASE_HOST / redis host"
    return 0
  fi
  # Compose interpolates the whole file (including cloudrouter.ports) even for
  # deps-only projects, so a placeholder instance env must be exported too.
  export_instance_env 1
  run docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" --profile deps up -d
  wait_container_healthy "${DEPS_PROJECT}" postgres "${HEALTH_TIMEOUT}" \
    || die "embedded postgres dependency failed readiness"
}

# --- instances -------------------------------------------------------------------
export_instance_env() {
  local index="$1"
  export SDKWORK_CLOUDROUTER_MGMT_HOST_PORT=$((PORT_BASE + index - 1))
  export SDKWORK_CLOUDROUTER_NODE_UUID="standalone-${ENVIRONMENT}-i${index}"
}

start_instance() {
  local index="$1"
  local project="sdkwork-cloudrouter-${ENVIRONMENT}-i${index}"
  export_instance_env "${index}"
  run docker compose -p "${project}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" --profile instance up -d
}

wait_container_healthy() {
  local project="$1" service="$2" timeout="$3"
  [ "${DRY_RUN}" = "1" ] && return 0
  local waited=0 cid status
  while true; do
    cid="$(docker compose -p "${project}" ps -q "${service}" 2>/dev/null || true)"
    if [ -n "${cid}" ]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${cid}" 2>/dev/null || true)"
      case "${status}" in
        healthy|running)
          info "${project}/${service} is ${status} (waited ${waited}s)"
          return 0
          ;;
      esac
    fi
    if [ "${waited}" -ge "${timeout}" ]; then
      info "ERROR: ${project}/${service} not healthy after ${timeout}s"
      return 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

apply() {
  ensure_shared_resources
  ensure_image
  ensure_deps
  local index
  for index in $(seq 1 "${REPLICAS}"); do
    start_instance "${index}"
    wait_container_healthy "sdkwork-cloudrouter-${ENVIRONMENT}-i${index}" cloudrouter "${HEALTH_TIMEOUT}" \
      || die "cloudrouter instance ${index} failed readiness"
  done
  info "environment ${ENVIRONMENT}: ${REPLICAS} instance(s) applied"
  info "instance management ports: $((PORT_BASE))..$((PORT_BASE + REPLICAS - 1)) -> 3900"
}

discover_instance_projects() {
  [ "${DRY_RUN}" = "1" ] && return 0
  docker ps -a --filter "label=com.docker.compose.project" \
    --format '{{.Label "com.docker.compose.project"}}' 2>/dev/null | sort -u \
    | grep -E "^${NETWORK}-i[0-9]+$" || true
}

down() {
  local index
  for index in $(seq 1 "${REPLICAS}"); do
    export_instance_env "${index}"
    run docker compose -p "sdkwork-cloudrouter-${ENVIRONMENT}-i${index}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance down
  done
  # Safety net: tear down instance projects beyond --replicas (e.g. left by an
  # earlier apply with a larger --replicas value).
  local extra extra_index
  for extra in $(discover_instance_projects); do
    extra_index="${extra##*-i}"
    case "${extra_index}" in
      ''|*[!0-9]*) continue ;;
    esac
    if [ "${extra_index}" -le "${REPLICAS}" ]; then continue; fi
    info "discovered extra instance project beyond replicas ${REPLICAS}: ${extra}"
    export_instance_env "${extra_index}"
    run docker compose -p "${extra}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance down
  done
  if [ "${EXTERNAL}" != "1" ]; then
    export_instance_env 1
    run docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" --profile deps down
  fi
  if [ "${PURGE}" = "1" ]; then
    info "purging per-environment network and volumes (${ENVIRONMENT})"
    for suffix in "" "-secrets" "-data" "-postgres-data" "-redis-data"; do
      if [ -z "${suffix}" ]; then
        run docker network rm "${NETWORK}" 2>/dev/null || true
      else
        run docker volume rm "sdkwork-cloudrouter-${ENVIRONMENT}${suffix}" 2>/dev/null || true
      fi
    done
  fi
  info "environment ${ENVIRONMENT} down"
}

# --- stop / start / restart ----------------------------------------------------
# `--stop` keeps the containers (fast `--start` later); `--down` removes them.
# `--restart` bounces the processes only — after env/config edits run a full
# apply so compose recreates the containers with the new values.
stop_fleet() {
  local index extra extra_index
  for index in $(seq 1 "${REPLICAS}"); do
    export_instance_env "${index}"
    run docker compose -p "${NETWORK}-i${index}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance stop
  done
  for extra in $(discover_instance_projects); do
    extra_index="${extra##*-i}"
    case "${extra_index}" in
      ''|*[!0-9]*) continue ;;
    esac
    if [ "${extra_index}" -le "${REPLICAS}" ]; then continue; fi
    info "discovered extra instance project beyond replicas ${REPLICAS}: ${extra}"
    run docker compose -p "${extra}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance stop
  done
  if [ "${EXTERNAL}" != "1" ]; then
    export_instance_env 1
    run docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile deps stop
  fi
  info "environment ${ENVIRONMENT} stopped (containers kept; start again with --start)"
}

start_fleet() {
  if [ "${EXTERNAL}" != "1" ]; then
    export_instance_env 1
    run docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile deps start
    wait_container_healthy "${DEPS_PROJECT}" postgres "${HEALTH_TIMEOUT}" \
      || die "embedded postgres dependency failed readiness"
  fi
  local index
  for index in $(seq 1 "${REPLICAS}"); do
    export_instance_env "${index}"
    run docker compose -p "${NETWORK}-i${index}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance start
    wait_container_healthy "${NETWORK}-i${index}" cloudrouter "${HEALTH_TIMEOUT}" \
      || die "cloudrouter instance ${index} failed readiness"
  done
  info "environment ${ENVIRONMENT} started"
}

restart_fleet() {
  if [ "${EXTERNAL}" != "1" ]; then
    export_instance_env 1
    run docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile deps restart
    wait_container_healthy "${DEPS_PROJECT}" postgres "${HEALTH_TIMEOUT}" \
      || die "embedded postgres dependency failed readiness"
  fi
  local index
  for index in $(seq 1 "${REPLICAS}"); do
    export_instance_env "${index}"
    run docker compose -p "${NETWORK}-i${index}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance restart cloudrouter
    wait_container_healthy "${NETWORK}-i${index}" cloudrouter "${HEALTH_TIMEOUT}" \
      || die "cloudrouter instance ${index} failed readiness"
  done
  info "environment ${ENVIRONMENT} restarted"
}

ps() {
  local index
  for index in $(seq 1 "${REPLICAS}"); do
    export_instance_env "${index}"
    info "instance ${index}:"
    docker compose -p "sdkwork-cloudrouter-${ENVIRONMENT}-i${index}" --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" --profile instance ps
  done
  if [ "${EXTERNAL}" != "1" ]; then
    export_instance_env 1
    info "deps:"
    docker compose -p "${DEPS_PROJECT}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" --profile deps ps
  fi
}

logs() {
  local index="${LOG_INSTANCE:-1}"
  case "${index}" in ''|*[!0-9]*) die "--logs/--instance expects an instance number" ;; esac
  case "${LOG_TAIL}" in all) ;; ''|*[!0-9]*) die "--tail expects a positive integer or 'all'" ;; esac
  export_instance_env "${index}"
  local args=(docker compose -p "sdkwork-cloudrouter-${ENVIRONMENT}-i${index}" --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" --profile instance logs --tail "${LOG_TAIL}")
  if [ -n "${LOG_SINCE}" ]; then args+=(--since "${LOG_SINCE}"); fi
  if [ "${LOG_FOLLOW}" = "1" ]; then args+=(--follow); fi
  if [ -n "${LOG_SERVICE}" ]; then args+=("${LOG_SERVICE}"); fi
  "${args[@]}"
}

case "${ACTION}" in
  apply) apply ;;
  down)  down ;;
  ps)    ps ;;
  logs)  logs ;;
  stop)    stop_fleet ;;
  start)   start_fleet ;;
  restart) restart_fleet ;;
  check-config) info "configuration check only: nothing was deployed" ;;
  set)
    [ -n "${SET_KEY}" ] || die "--set requires KEY and VALUE"
    set_status="0"
    set_env_key "${SET_KEY}" "${SET_VALUE}" "${SET_FORCE}" || set_status=$?
    exit "${set_status}"
    ;;
  *) die "unsupported action: ${ACTION}" ;;
esac
