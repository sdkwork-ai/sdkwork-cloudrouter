#!/usr/bin/env python3
"""Port discount application helpers from sqlite_promotion.rs to postgres_promotion.rs."""

from __future__ import annotations

import re
import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))
from capability_repository_paths import sqlite_postgres_pair

SQLITE, POSTGRES = sqlite_postgres_pair("promotion", "promotion")


def renumber_sql_placeholders(text: str) -> str:
    queries = re.split(r'(r#"(?:[^"]|"[^#])*"#)', text)
    out: list[str] = []
    for chunk in queries:
        if chunk.startswith('r#"'):
            sql = chunk[3:-3]
            index = 0

            def repl(_: re.Match[str]) -> str:
                nonlocal index
                index += 1
                return f"${index}"

            sql = re.sub(r"\?", repl, sql)
            out.append(f'r#"{sql}"#')
        else:
            out.append(chunk)
    return "".join(out)


def port_block(text: str) -> str:
    text = text.replace("Transaction<'_, Sqlite>", "Transaction<'_, Postgres>")
    text = text.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")
    return renumber_sql_placeholders(text)


def extract_between(source: str, start: str, end: str) -> str:
    start_idx = source.index(start)
    end_idx = source.index(end, start_idx)
    return source[start_idx:end_idx]


def main() -> None:
    sqlite = SQLITE.read_text(encoding="utf-8")
    postgres = POSTGRES.read_text(encoding="utf-8")

    impl_methods = extract_between(
        sqlite,
        "    pub async fn apply_promotion_discount(",
        "async fn load_redeem_idempotency_row",
    ).rstrip()
    impl_methods = impl_methods[: impl_methods.rindex("}") + 1]

    helpers = extract_between(
        sqlite,
        "#[derive(Debug, Clone)]\nstruct DiscountApplyCoupon",
        "async fn load_redeem_idempotency_row",
    ).rstrip()

    ported_impl = port_block(impl_methods)
    ported_helpers = port_block(helpers)

    if "pub async fn apply_promotion_discount" in postgres:
        print("postgres discount methods already present; skipping")
        return

    postgres = postgres.replace(
        "const PROMOTION_USER_COUPON_CLAIM_SCOPE: &str = \"promotions.userCoupons.claims.create\";\n",
        "const PROMOTION_USER_COUPON_CLAIM_SCOPE: &str = \"promotions.userCoupons.claims.create\";\n"
        "const PROMOTION_DISCOUNT_APPLICATION_CREATE_SCOPE: &str = \"promotions.discountApplications.create\";\n"
        "const PROMOTION_DISCOUNT_APPLICATION_REVERSAL_SCOPE: &str =\n"
        "    \"promotions.discountApplications.reversals.create\";\n",
    )
    postgres = postgres.replace(
        "    ClaimPromotionUserCouponCommand, PointsBalance, PointsBalanceQuery, PointsHistoryItem,\n"
        "    PointsHistoryQuery, PromotionCodeRedemptionCommand, PromotionCodeRedemptionOutcome,\n"
        "    PromotionUserCouponItem, PromotionUserCouponListQuery,\n",
        "    ApplyPromotionDiscountCommand, ClaimPromotionUserCouponCommand, PointsBalance,\n"
        "    PointsBalanceQuery, PointsHistoryItem, PointsHistoryQuery,\n"
        "    PromotionCodeRedemptionCommand, PromotionCodeRedemptionOutcome,\n"
        "    PromotionUserCouponItem, PromotionUserCouponListQuery, ReversePromotionDiscountCommand,\n",
    )

    postgres = postgres.replace(
        "        Ok(coupon)\n    }\n}\n\nasync fn load_redeem_idempotency_row(",
        f"        Ok(coupon)\n    }}\n\n{ported_impl}\n}}\n\n{ported_helpers}\n\nasync fn load_redeem_idempotency_row(",
    )

    POSTGRES.write_text(postgres, encoding="utf-8")
    print("ported discount application commands to postgres_promotion.rs")


if __name__ == "__main__":
    main()
