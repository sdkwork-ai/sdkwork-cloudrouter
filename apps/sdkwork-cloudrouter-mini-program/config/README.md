# config/

Materialized runtime configuration for the mini-program root.

- `config/mini-program/runtime-env.<profile>.<environment>.json` is produced by
  `pnpm workflow:materialize-client-env` from `etc/sdkwork.deployment.config.json`.
  Generated files are not source-controlled.
