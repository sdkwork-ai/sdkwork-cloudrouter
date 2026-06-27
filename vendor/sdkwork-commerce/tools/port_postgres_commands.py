from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]


def sqlite_to_postgres_sql(block: str) -> str:
    counter = 0

    def repl(_: re.Match[str]) -> str:
        nonlocal counter
        counter += 1
        return f"${counter}"

    return re.sub(r"\?", repl, block)


def port_method(sqlite_path: pathlib.Path, postgres_path: pathlib.Path, method: str) -> None:
    sqlite = sqlite_path.read_text(encoding="utf-8")
    postgres = postgres_path.read_text(encoding="utf-8")
    if f"pub async fn {method}" in postgres:
        print(f"skip {postgres_path.name}:{method}")
        return

    match = re.search(
        rf"\n    pub async fn {method}\(.*?\n    \}}\n",
        sqlite,
        re.S,
    )
    if not match:
        raise SystemExit(f"missing sqlite method {method} in {sqlite_path}")

    block = match.group(0)
    block = block.replace("Transaction<'_, Sqlite>", "Transaction<'_, Postgres>")
    block = block.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")
    block = sqlite_to_postgres_sql(block)

    anchor = "\n    pub async fn cancel_owner_order"
    if method == "claim_promotion_user_coupon":
        anchor = "\n}\n\nasync fn load_redeem_idempotency_row"
        if "pub async fn redeem_promotion_code" in postgres:
            anchor = "\n}\n\nasync fn load_redeem_idempotency_row"
            postgres = postgres.replace(
                "        Ok(outcome)\n    }\n}\n\nasync fn load_redeem_idempotency_row",
                "        Ok(outcome)\n    }" + block + "\n}\n\nasync fn load_redeem_idempotency_row",
            )
            postgres_path.write_text(postgres, encoding="utf-8")
            print(f"ported {postgres_path.name}:{method}")
            return
    elif method == "create_owner_order":
        anchor = "\n    pub async fn cancel_owner_order"

    if anchor not in postgres:
        raise SystemExit(f"anchor not found in {postgres_path}")

    postgres = postgres.replace(anchor, block + anchor, 1)

    if method == "create_owner_order":
        imports = postgres
        if "CreateOwnerOrderCommand" not in imports:
            postgres = postgres.replace(
                "use sdkwork_commerce_order_service::{\n    CancelOwnerOrderCommand, OrderOwnerDetail, OrderOwnerDetailQuery, OrderOwnerItem,\n    OrderOwnerListQuery, OrderOwnerStatistics, OrderOwnerSummary, PayOwnerOrderCommand,\n    PayOwnerOrderOutcome,\n};",
                "use sdkwork_commerce_order_service::{\n    CancelOwnerOrderCommand, CreateOwnerOrderCommand, CreateOwnerOrderOutcome,\n    OrderOwnerDetail, OrderOwnerDetailQuery, OrderOwnerItem, OrderOwnerListQuery,\n    OrderOwnerStatistics, OrderOwnerSummary, PayOwnerOrderCommand, PayOwnerOrderOutcome,\n};",
            )
        helper_anchor = "fn order_status_is_payable"
        if helper_anchor not in postgres:
            helper_match = re.search(
                r"async fn load_checkout_session_for_order.*?fn order_status_is_payable",
                sqlite,
                re.S,
            )
            if helper_match:
                helpers = helper_match.group(0).replace(
                    "fn order_status_is_payable", ""
                )
                helpers = helpers.replace("Transaction<'_, Sqlite>", "Transaction<'_, Postgres>")
                helpers = helpers.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")
                helpers = sqlite_to_postgres_sql(helpers)
                postgres = postgres.replace(
                    "fn order_status_is_payable",
                    helpers + "fn order_status_is_payable",
                )

    if method == "claim_promotion_user_coupon":
        if "ClaimPromotionUserCouponCommand" not in postgres:
            postgres = postgres.replace(
                "use sdkwork_commerce_promotion_service::{\n    PointsBalance, PointsBalanceQuery, PointsHistoryItem, PointsHistoryQuery,\n    PromotionCodeRedemptionCommand, PromotionCodeRedemptionOutcome, PromotionUserCouponItem,\n    PromotionUserCouponListQuery,\n};",
                "use sdkwork_commerce_promotion_service::{\n    ClaimPromotionUserCouponCommand, PointsBalance, PointsBalanceQuery, PointsHistoryItem,\n    PointsHistoryQuery, PromotionCodeRedemptionCommand, PromotionCodeRedemptionOutcome,\n    PromotionUserCouponItem, PromotionUserCouponListQuery,\n};",
            )
        if "PROMOTION_USER_COUPON_CLAIM_SCOPE" not in postgres:
            postgres = postgres.replace(
                "const PROMOTION_CODE_REDEMPTION_SCOPE",
                "const PROMOTION_USER_COUPON_CLAIM_SCOPE: &str = \"promotions.userCoupons.claims.create\";\nconst PROMOTION_CODE_REDEMPTION_SCOPE",
            )
        if "struct ClaimPromotion" not in postgres:
            postgres = postgres.replace(
                "struct RedeemPromotion {",
                "struct ClaimPromotion {\n    stock_id: String,\n    offer_id: String,\n    offer_version_id: String,\n    stock_type: String,\n    discount_value: String,\n    total_quantity: Option<i64>,\n    available_quantity: i64,\n    stock_claimed_quantity: i64,\n    expires_at: Option<String>,\n}\n\n#[derive(Debug, Clone)]\nstruct RedeemPromotion {",
            )
        claim_helpers = re.search(
            r"async fn load_claim_idempotency_row.*?fn issued_claim_coupon_code",
            sqlite,
            re.S,
        )
        if claim_helpers and "async fn load_claim_idempotency_row" not in postgres:
            helpers = claim_helpers.group(0) + "(command: &ClaimPromotionUserCouponCommand) -> String {\n    stable_storage_id(&[\"CL\", &command.request_no])\n}\n\nfn coupon_credit_points"
            helpers = helpers.replace("fn coupon_credit_points", "")
            helpers = helpers.replace("Transaction<'_, Sqlite>", "Transaction<'_, Postgres>")
            helpers = helpers.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")
            helpers = sqlite_to_postgres_sql(helpers)
            postgres = postgres.replace(
                "fn coupon_credit_points",
                helpers + "fn coupon_credit_points",
            )

    postgres_path.write_text(postgres, encoding="utf-8")
    print(f"ported {postgres_path.name}:{method}")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    tools_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(tools_dir))
    from capability_repository_paths import repository_src

    order_src = repository_src("order", "sqlite_order.rs").parent
    promotion_src = repository_src("promotion", "sqlite_promotion.rs").parent
    port_method(order_src / "sqlite_order.rs", order_src / "postgres_order.rs", "create_owner_order")
    port_method(
        promotion_src / "sqlite_promotion.rs",
        promotion_src / "postgres_promotion.rs",
        "claim_promotion_user_coupon",
    )
