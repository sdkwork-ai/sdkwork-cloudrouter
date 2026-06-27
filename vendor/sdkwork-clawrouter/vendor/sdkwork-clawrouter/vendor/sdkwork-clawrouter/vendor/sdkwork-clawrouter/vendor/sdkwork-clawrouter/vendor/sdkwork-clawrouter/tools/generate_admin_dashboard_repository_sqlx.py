#!/usr/bin/env python3
"""Generate admin-dashboard repository-sqlx store modules from legacy product store sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
CRATE = ROOT / "crates" / "sdkwork-clawrouter-admin-dashboard-repository-sqlx" / "src"

TYPES_IMPORT = """use crate::error::{RepositoryError, RepositoryResult};
use crate::types::{
    AdminDashboardQuery, AdminDashboardReadFuture, AdminDashboardReadStore,
    AdminDashboardRecentUsageItem, AdminDashboardSnapshot, AdminDashboardTrafficItem,
    AdminPieChartItem,
};"""

REPLACEMENTS = [
    (r"use crate::domain::\{DecimalValue, DomainError\};", ""),
    (r"use crate::infrastructure::sql::model_modality;", "use crate::modality;"),
    (
        r"use crate::ports::\{[^}]+\};",
        TYPES_IMPORT,
    ),
    ("DomainResult", "RepositoryResult"),
    ("DomainError::new", "RepositoryError::new"),
    ("DomainError", "RepositoryError"),
    ("model_modality::label", "modality::label"),
    (
        r"DecimalValue::parse\(&value\)\s*\n\s*\.map\(\|amount\| amount\.to_fixed_string\(digits\)\)",
        "format_decimal_fixed(&value, digits)",
    ),
    ("fn sql_error(error: sqlx::Error) -> RepositoryError {", "fn sql_error(error: sqlx::Error) -> RepositoryError {\n    store_error(\"admin dashboard query\", error)\n}\n\nfn _legacy_sql_error(error: sqlx::Error) -> RepositoryError {"),
]


def transform(source: Path, target: Path, pool_import: str, row_type: str) -> None:
    text = source.read_text(encoding="utf-8")
    for pattern, replacement in REPLACEMENTS:
        text = re.sub(pattern, replacement, text)
    if "store_error" not in text:
        text = text.replace(
            "use crate::error::{RepositoryError, RepositoryResult};",
            "use crate::error::{RepositoryError, RepositoryResult, store_error};",
            1,
        )
    if "format_decimal_fixed" in text and "fn format_decimal_fixed" not in text:
        text += """

fn format_decimal_fixed(value: &str, digits: u32) -> RepositoryResult<String> {
    let trimmed = value.trim();
    let parsed: f64 = trimmed
        .parse()
        .map_err(|_| RepositoryError::new(format!("invalid decimal: {value}")))?;
    if !parsed.is_finite() {
        return Err(RepositoryError::new(format!("invalid decimal: {value}")));
    }
    Ok(format!("{parsed:.prec$}", prec = digits as usize))
}
"""
    text = re.sub(
        r"fn _legacy_sql_error\(error: sqlx::Error\) -> RepositoryError \{[^}]+\}\n",
        "",
        text,
        count=1,
    )
    if not text.strip().startswith("use "):
        pass
    lines = text.splitlines()
    if lines and lines[0].startswith("use sqlx::"):
        lines[0] = pool_import
    text = "\n".join(lines) + "\n"
    text = text.replace(f"sqlx::postgres::{row_type}", f"sqlx::{row_type.lower()}")
    text = text.replace(f"sqlx::sqlite::{row_type}", f"sqlx::{row_type.lower()}")
    target.write_text(text, encoding="utf-8")


def main() -> None:
    transform(
        PRODUCT / "postgres" / "admin_dashboard_read_store.rs",
        CRATE / "postgres.rs",
        "use sqlx::{PgPool, Row};",
        "PgRow",
    )
    transform(
        PRODUCT / "sqlite" / "admin_dashboard_read_store.rs",
        CRATE / "sqlite.rs",
        "use sqlx::{Row, SqlitePool};",
        "SqliteRow",
    )


if __name__ == "__main__":
    main()
