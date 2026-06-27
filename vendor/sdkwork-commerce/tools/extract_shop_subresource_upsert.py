#!/usr/bin/env python3
from pathlib import Path

src = Path("crates/sdkwork-commerce-api-server/src/backend_shop_admin_router.rs")
lines = src.read_text(encoding="utf-8").splitlines()
chunks = [
    (1009, 1238),
    (1239, 2704),
    (2747, 2796),
    (2842, 2878),
]
body: list[str] = []
for start, end in chunks:
    body.extend(lines[start:end])
text = "\n".join(body)
text = text.replace("BackendShopDb", "ShopWriteDb")
text = text.replace(
    "async fn upsert_shop_table_row_db", "pub async fn upsert_shop_table_row"
)
text = text.replace(
    "async fn retrieve_table_row_by_id", "pub async fn retrieve_shop_table_row_by_id"
)
header = """use sdkwork_commerce_contract_service::CommerceServiceError;
use sqlx::{postgres::PgRow, sqlite::SqliteRow, Column, PgPool, Row, SqlitePool};

#[derive(Clone)]
pub enum ShopWriteDb {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl ShopWriteDb {
    pub fn sqlite(pool: SqlitePool) -> Self {
        Self::Sqlite(pool)
    }

    pub fn postgres(pool: PgPool) -> Self {
        Self::Postgres(pool)
    }
}

"""
out = Path("crates/sdkwork-commerce-storage-repository-sqlx/src/shop_subresource_upsert.rs")
out.write_text(header + text + "\n", encoding="utf-8")
print(f"Wrote {out} ({len((header + text).splitlines())} lines)")
