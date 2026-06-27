# Product Category Seed

`categories.json` is the canonical product category seed consumed by the admin category initializer. The file is generated from `taxonomy-source.json` because the backend importer writes a flat `commerce_product_category` row list from `categoryNo` and `parentCategoryNo`.

## Alignment

The first-level roots follow the public WeChat Shop / video-commerce retail category shape, including:

- 宠物生活、厨具、家用电器、手机通讯、数码、电脑&办公
- 服饰内衣、鞋靴、个人护理、母婴、美妆护肤、家纺
- 家居日用、家具、家庭清洁&纸品、家装建材、工业品、汽车用品
- 玩具乐器、运动户外、箱包皮具、酒类、食品饮料、钟表
- 农资园艺、生鲜、二手、生活服务、图书、艺术品、教育培训
- 珠宝首饰、保健膳食、医疗健康、虚拟商品

Lower levels are SDKWork-managed operational directories derived from common store management needs. They are not copied verbatim from a private WeChat category export; keep them stable and practical for merchant operations.

## Current Shape

- First-level roots: `35`
- Total nodes: `3710`
- Maximum depth: `4`
- Fourth-level leaf nodes: `2800`
- Generic template leaf suffixes: `0`
- Install policy: opt-in only through `SDKWORK_CLAW_INSTALL_CATEGORY_SEEDS`; admin button remains the default initialization path.

## Maintenance Rules

- Keep `categoryNo` stable after release. Rename `name` when display copy changes; do not rename the code unless the category is intentionally replaced.
- Keep `categoryNo` ASCII-only and path-like by level: `WX-ROOT-SS-TT-DD`.
- Every non-root node must reference an existing `parentCategoryNo`.
- Product roots should stay aligned with WeChat Shop-style first-level retail categories.
- Preserve at least one complete four-level path under every major business domain.
- Do not put install-time behavior in this data file. Use `installPolicy` only to declare the opt-in configuration standard.
- Edit `taxonomy-source.json` first, then run `python data/categories/product/generate_categories.py` to refresh `categories.json`.

## Verification

Run the focused route test after changes:

```powershell
$env:CARGO_TARGET_DIR = Join-Path $PWD 'target/product-category-seed'
cargo test -p sdkwork-clawrouter-admin-gateway --test product_center_routes -- product_center_category_seed_initializer_imports_data_directories_idempotently
```

The test asserts total product seed size, first-level root coverage, fourth-level leaf coverage, Unicode names, and idempotent re-import.

Check the generated flat file is current:

```powershell
python data/categories/product/generate_categories.py --check
```
