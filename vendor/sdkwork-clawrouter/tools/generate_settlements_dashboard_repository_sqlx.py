#!/usr/bin/env python3
"""Generate settlements-dashboard repository-sqlx store modules from legacy router-service sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
CRATE = ROOT / "crates" / "sdkwork-clawrouter-settlements-dashboard-repository-sqlx" / "src"

POSTGRES_HEADER = """use std::collections::HashMap;

use sqlx::{PgPool, Row};

use crate::error::{RepositoryResult, store_error};
use crate::mapping::{
    chart_point_from_row, merge_item_into_breakdown, require_subject, row_to_bill, year_filter,
    RowMapping,
};
use crate::types::{
    SettlementBill, SettlementChartPoint, SettlementsDashboardQuery, SettlementsDashboardReadFuture,
    SettlementsDashboardReadStore, SettlementsDashboardSnapshot, SettlementsDashboardSubject,
};"""

SQLITE_HEADER = """use std::collections::HashMap;

use sqlx::{Row, SqlitePool};

use crate::error::{RepositoryResult, store_error};
use crate::mapping::{
    chart_point_from_row, merge_item_into_breakdown, require_subject, row_to_bill, year_filter,
    RowMapping,
};
use crate::types::{
    SettlementBill, SettlementChartPoint, SettlementsDashboardQuery, SettlementsDashboardReadFuture,
    SettlementsDashboardReadStore, SettlementsDashboardSnapshot, SettlementsDashboardSubject,
};"""


def strip_store_body(text: str) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.startswith("const LOAD_SETTLEMENT_BILLS"):
            return "\n".join(lines[index:])
    return text


def trim_after_load_functions(text: str) -> str:
    marker = "fn row_to_bill"
    if marker in text:
        return text.split(marker, 1)[0].rstrip() + "\n"
    return text


def apply_replacements(text: str) -> str:
    text = text.replace("DomainResult", "RepositoryResult")
    text = text.replace("DomainError", "RepositoryError")
    text = re.sub(
        r"\.map_err\(sql_error\)(\?)??",
        lambda match: f".map_err(|error| store_error(\"settlements dashboard query\", error)){match.group(1) or ''}",
        text,
    )
    text = text.replace("integer_cell(&row,", "row.integer_cell(")
    text = text.replace('integer_cell(&row, "statement_id")', 'row.integer_cell("statement_id")')
    text = text.replace("bills.push(row_to_bill(row)?)", "bills.push(row_to_bill(&row)?)")
    text = text.replace(
        "merge_item_into_breakdown(&mut bills[index].breakdown, row)?",
        "merge_item_into_breakdown(&mut bills[index].breakdown, &row)?",
    )
    text = re.sub(
        r"rows\.into_iter\(\)\s*\.map\(\|row\| \{\s*Ok\(SettlementChartPoint \{[^}]+\}\)\s*\}\)\s*\.collect\(\)",
        "rows.into_iter().map(|row| chart_point_from_row(&row)).collect()",
        text,
        flags=re.DOTALL,
    )
    return trim_after_load_functions(text)


def write_postgres() -> None:
    source = PRODUCT / "postgres" / "settlements_dashboard_read_store.rs"
    body = apply_replacements(strip_store_body(source.read_text(encoding="utf-8")))
    (CRATE / "postgres.rs").write_text(POSTGRES_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def write_sqlite() -> None:
    source = PRODUCT / "sqlite" / "settlements_dashboard_read_store.rs"
    body = apply_replacements(strip_store_body(source.read_text(encoding="utf-8")))
    (CRATE / "sqlite.rs").write_text(SQLITE_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def main() -> None:
    CRATE.mkdir(parents=True, exist_ok=True)
    write_postgres()
    write_sqlite()


if __name__ == "__main__":
    main()
