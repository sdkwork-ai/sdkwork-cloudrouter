# App Scripts

Thin app-root command entrypoints live here when `sdkwork-commerce-pc` needs app-specific build, validation, generation, migration, or development utilities.

Reusable logic belongs in repository `tools/` or an authored package. Do not store generated SDK output, secrets, or runtime state here.

- `validate-runtime-config.mjs`: app-root preflight for browser, desktop, server, container, and Tauri config examples before staging or production builds.
