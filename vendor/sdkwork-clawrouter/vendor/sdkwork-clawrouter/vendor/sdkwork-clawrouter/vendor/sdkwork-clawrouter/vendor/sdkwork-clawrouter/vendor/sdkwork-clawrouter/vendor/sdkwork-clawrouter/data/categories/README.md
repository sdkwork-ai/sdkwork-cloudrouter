# Category Seed Data

This directory is the canonical data source for admin-triggered category initialization. Each taxonomy owns one directory with a `categories.json` manifest so new category datasets can be added without changing install scripts.

## Manifest Standard

- `schemaVersion`: manifest version. Current value is `1`.
- `kind`: must be `sdkwork.category_seed`.
- `dataset`: stable ASCII dataset key, such as `product`, `agents`, `agent-skills`, `mcp`, or `apps`.
- `target`: target table. Product taxonomy uses `commerce_product_category`; reusable platform taxonomies use `c_category`.
- `installPolicy.defaultEnabled`: must remain `false` unless install-time seeding is intentionally enabled by configuration.
- `installPolicy.configKey`: global opt-in switch, currently `SDKWORK_CLAW_INSTALL_CATEGORY_SEEDS`.
- `installPolicy.selectableDatasetsKey`: optional comma-separated dataset selection, currently `SDKWORK_CLAW_INSTALL_CATEGORY_SEED_DATASETS`.

## Product Category Rules

Product category display names may be Unicode. `categoryNo` and `parentCategoryNo` must remain stable ASCII identifiers. The product dataset follows common WeChat-store retail industries and supports multi-level directories through `parentCategoryNo`. See `product/README.md` for the product root list, current depth/count targets, and maintenance rules.

## c_category Rules

Reusable datasets must define legacy `categoryType` (mapped to string `category_type` on import), optional `groupName` (import hint only), stable numeric `id`, stable `uuid`, ASCII `code`, optional `parentCode`, display `name`, `sortWeight`, `visible`, and numeric `status`. Admin initialization imports these records idempotently into `c_category.category_type` scopes such as `app_store`, `skill_market`, `agent`, and `mcp`.
