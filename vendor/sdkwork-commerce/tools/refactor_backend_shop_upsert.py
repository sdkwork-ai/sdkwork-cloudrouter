#!/usr/bin/env python3
from pathlib import Path

path = Path("crates/sdkwork-commerce-api-server/src/backend_shop_admin_router.rs")
lines = path.read_text(encoding="utf-8").splitlines()

remove_ranges = [(1009, 2704), (2747, 2792), (2842, 2882)]
for start, end in sorted(remove_ranges, reverse=True):
    del lines[start:end]

text = "\n".join(lines) + "\n"
text = text.replace(
    "resolve_risk_signal_db(&state.db,",
    "shop_subresource_upsert::resolve_shop_risk_signal_db(&as_shop_write_db(&state.db),",
)
text = text.replace(
    "upsert_shop_table_row_db(\n        &state.db,",
    "shop_subresource_upsert::upsert_shop_table_row(\n        &as_shop_write_db(&state.db),",
)

import_block = """use sdkwork_commerce_storage_repository_sqlx::shop_subresource_upsert::{
    self, current_timestamp_string, resolve_row_id, stable_storage_id, ShopWriteDb,
};

fn as_shop_write_db(db: &BackendShopDb) -> ShopWriteDb {
    match db {
        BackendShopDb::Sqlite(pool) => ShopWriteDb::Sqlite(pool.clone()),
        BackendShopDb::Postgres(pool) => ShopWriteDb::Postgres(pool.clone()),
    }
}

"""
needle = "use crate::with_request_identity;\n"
if needle not in text:
    raise SystemExit("import anchor not found")
text = text.replace(needle, needle + "\n" + import_block, 1)

path.write_text(text, encoding="utf-8")
print(f"Updated {path} ({len(text.splitlines())} lines)")
