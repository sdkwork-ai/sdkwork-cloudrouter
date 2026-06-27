from __future__ import annotations

import pathlib
import re
import sys

TOOLS_DIR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))
from capability_repository_paths import repository_src

SQLITE_PATH = repository_src("promotion", "sqlite_promotion.rs")
POSTGRES = repository_src("promotion", "postgres_promotion.rs")
SQLITE = SQLITE_PATH.read_text(encoding="utf-8")
postgres = POSTGRES.read_text(encoding="utf-8")

start = SQLITE.index("async fn load_claim_idempotency_row")
end = SQLITE.index("fn coupon_credit_points")
helpers = SQLITE[start:end]
helpers = helpers.replace("Transaction<'_, Sqlite>", "Transaction<'_, Postgres>")
helpers = helpers.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")

def sql_replacer(match: re.Match[str]) -> str:
    sql = match.group(1)
    counter = 0

    def qrepl(_: re.Match[str]) -> str:
        nonlocal counter
        counter += 1
        return f"${counter}"

    return 'r#"\n' + re.sub(r"\?", qrepl, sql) + '\n"#'


helpers = re.sub(r'r#"(.*?)"#', sql_replacer, helpers, flags=re.S)

if "async fn load_claim_idempotency_row" in postgres:
    print("claim helpers already present")
else:
    postgres = postgres.replace(
        "fn coupon_credit_points(discount_value: &str)",
        helpers + "fn coupon_credit_points(discount_value: &str)",
    )

if "struct ClaimPromotion" not in postgres:
    postgres = postgres.replace(
        "struct RedeemPromotion {",
        "struct ClaimPromotion {\n    stock_id: String,\n    offer_id: String,\n    offer_version_id: String,\n    stock_type: String,\n    discount_value: String,\n    total_quantity: Option<i64>,\n    available_quantity: i64,\n    stock_claimed_quantity: i64,\n    expires_at: Option<String>,\n}\n\n#[derive(Debug, Clone)]\nstruct RedeemPromotion {",
    )

if "PROMOTION_USER_COUPON_CLAIM_SCOPE" not in postgres:
    postgres = postgres.replace(
        "const PROMOTION_CODE_REDEMPTION_SCOPE",
        'const PROMOTION_USER_COUPON_CLAIM_SCOPE: &str = "promotions.userCoupons.claims.create";\nconst PROMOTION_CODE_REDEMPTION_SCOPE',
    )

POSTGRES.write_text(postgres, encoding="utf-8")
print("inserted claim helpers into postgres_promotion.rs")
