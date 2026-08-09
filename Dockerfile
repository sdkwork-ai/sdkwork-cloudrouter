# syntax=docker/dockerfile:1
# sdkwork-cloudrouter standalone container image.
# runtimeTarget = "container", deploymentProfile = "standalone".
# Build context: an unpacked install-package container directory containing
# bin/, portal/, config/, container/ (entrypoint + metadata.json),
# INSTALL.md and install-manifest.json.
#
# This file is equivalent to the container/Containerfile generated inside the
# install package by scripts/build-cloud-router-install-package.mjs. The
# committed copy is the input for `pnpm build:container`; regenerate the
# package whenever this file changes.

FROM debian:bookworm-slim

ARG GATEWAY_BINARY=cloudrouter
ARG INSTALLER_BINARY=cloudrouterctl
ARG INSTALL_ROOT=/opt/sdkwork/router
ARG CONFIG_FILE=/etc/sdkwork/router/cloudrouter.toml
ARG VERSION=0.0.0

# Runtime directory layout (RUNTIME_DIRECTORY_SPEC §4.5 Container Scope):
# config mounts at /etc/sdkwork/router, secrets at /run/secrets/sdkwork/router,
# durable data at /var/lib/sdkwork/router, cache at /var/cache/sdkwork/router.
# libssl3/ca-certificates are runtime dependencies of the gateway binary
# (PostgreSQL TLS and outbound HTTPS); the slim base image does not carry them.
# curl is used by the container healthcheck and operational diagnostics.
# postgresql-client-16 (PGDG) powers `cloudrouterctl backup/restore` and psql
# troubleshooting on commercial deployments; the Debian stock client (15)
# cannot dump a PostgreSQL 16 server.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl3 ca-certificates curl gnupg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system sdkwork \
  && useradd --system --gid sdkwork --home-dir ${INSTALL_ROOT} sdkwork \
  && mkdir -p ${INSTALL_ROOT} /etc/sdkwork/router /run/sdkwork/router \
    /var/lib/sdkwork/router /var/cache/sdkwork/router /var/log/sdkwork/router \
  && chown -R sdkwork:sdkwork /etc/sdkwork/router /run/sdkwork/router \
    /var/lib/sdkwork/router /var/cache/sdkwork/router /var/log/sdkwork/router

WORKDIR ${INSTALL_ROOT}
COPY . ${INSTALL_ROOT}
RUN chmod 0755 ${INSTALL_ROOT}/bin/${GATEWAY_BINARY} \
    ${INSTALL_ROOT}/bin/${INSTALLER_BINARY} \
    ${INSTALL_ROOT}/container/entrypoint

ENV SDKWORK_CLOUDROUTER_CONFIG_FILE=${CONFIG_FILE}
ENV SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE=server
ENV SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE=standalone
ENV SDKWORK_CLOUDROUTER_RUNTIME_TARGET=container
# Operator binaries (cloudrouterctl backup/restore/ensure) must be on PATH so
# the documented `docker compose exec cloudrouter cloudrouterctl ...` commands
# work without absolute paths.
ENV PATH=/opt/sdkwork/router/bin:${PATH}
# Models database module root: compile-time app roots do not exist inside the
# image, so each database host resolves its packaged module under
# <install root>/database-modules/<workspace>/database instead. These defaults
# can be overridden with mounted module trees or module roots.
ENV SDKWORK_MODELS_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-models \
    SDKWORK_CLOUDROUTER_ROUTER_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-cloudrouter \
    SDKWORK_PAYMENT_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-payment \
    SDKWORK_ACCOUNT_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-account \
    SDKWORK_AGENTS_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-agents \
    SDKWORK_BASE_DATA_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-appbase \
    SDKWORK_EDU_DATA_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-appbase \
    SDKWORK_MED_DATA_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-appbase \
    SDKWORK_COMMUNITY_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-community \
    SDKWORK_DRIVE_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-drive \
    SDKWORK_IAM_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-iam \
    SDKWORK_INVENTORY_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-inventory \
    SDKWORK_INVOICE_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-invoice \
    SDKWORK_LOG_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-log \
    SDKWORK_MEMBERSHIP_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-membership \
    SDKWORK_ORDER_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-order \
    SDKWORK_PARTNER_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-partner \
    SDKWORK_PROMOTION_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-promotion \
    SDKWORK_MERCHANDISE_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-merchandise \
    SDKWORK_CATALOG_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-catalog \
    SDKWORK_SHOP_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-shop \
    SDKWORK_INVENTORY_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-inventory \
    SDKWORK_AIOT_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-aiot \
    SDKWORK_IMAGE_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-image \
    SDKWORK_WEB_STORE_APP_ROOT=${INSTALL_ROOT}/database-modules/sdkwork-web-framework
# Application identity root: sdkwork.app.config.json is installed at the
# install root; IAM tenant provisioning resolves it via SDKWORK_APP_ROOT.
ENV SDKWORK_APP_ROOT=${INSTALL_ROOT}
# Portal SPA static delivery (gateway-static: / mount + /index.html fallback).
ENV SDKWORK_CLOUDROUTER_ROUTER_PORTAL_STATIC_DIST=${INSTALL_ROOT}/portal/dist
# Models catalog (sdkwork-models.json + models/ + overlays/) installed under
# <install root>/data/sdkwork-models; overridable with a mounted catalog.
ENV SDKWORK_MODELS_CATALOG_ROOT=${INSTALL_ROOT}/data/sdkwork-models

LABEL org.opencontainers.image.title="sdkwork-cloudrouter (standalone container)"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.vendor="sdkwork"

USER sdkwork
EXPOSE 3900
ENTRYPOINT ["/opt/sdkwork/router/container/entrypoint"]
