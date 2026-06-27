#!/usr/bin/env python3
"""Generate admin-analytics repository-sqlx modules from legacy router-service store sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
CRATE = ROOT / "crates" / "sdkwork-clawrouter-admin-analytics-repository-sqlx" / "src"

POSTGRES_HEADER = """use sqlx::{PgPool, Row};

use crate::error::{RepositoryError, RepositoryResult, store_error};
use crate::modality;
use crate::snapshot::{
    build_snapshot, vendor_from_catalog_key, AnalyticsModelRankRow, AnalyticsPieRow,
    AnalyticsSummaryRow, AnalyticsTrendRow, AnalyticsUserRankRow,
};
use crate::types::{
    AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore,
    AdminAnalyticsSnapshot, AdminAnalyticsTimeRange,
};"""

SQLITE_HEADER = """use std::collections::HashMap;

use sqlx::{Row, SqlitePool};

use crate::error::{RepositoryError, RepositoryResult, store_error};
use crate::snapshot::{
    color_for_index, concentration_severity, format_percent, modality_label, safe_percent,
    safe_ratio, scope_filter, vendor_from_catalog_key,
};
use crate::types::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankItem, AdminAnalyticsModelRankings,
    AdminAnalyticsPieItem, AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore,
    AdminAnalyticsSnapshot, AdminAnalyticsSubject, AdminAnalyticsSummary, AdminAnalyticsTimeRange,
    AdminAnalyticsTrendPoint, AdminAnalyticsUserRankItem, AdminAnalyticsUserRankings,
};"""


def strip_leading_import_block(text: str) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("const ") or stripped.startswith("#[derive") or stripped.startswith("pub struct"):
            return "\n".join(lines[index:])
    return text


def apply_common_replacements(text: str) -> str:
    text = text.replace("DomainResult", "RepositoryResult")
    text = text.replace("DomainError::new", "RepositoryError::new")
    text = text.replace("DomainError", "RepositoryError")
    text = text.replace("model_modality::label", "modality::label")
    text = text.replace("crate::ports::AdminAnalyticsTimeRange", "AdminAnalyticsTimeRange")
    text = re.sub(
        r"\.map_err\(sql_error\)(\?)??",
        lambda match: f".map_err(|error| store_error(\"admin analytics query\", error)){match.group(1) or ''}",
        text,
    )
    text = re.sub(
        r"\nfn sql_error\(error: sqlx::Error\) -> RepositoryError \{[^}]+\}\n",
        "\n",
        text,
        count=1,
    )
    return text


def write_snapshot() -> None:
    source = PRODUCT / "sql_admin_analytics.rs"
    text = source.read_text(encoding="utf-8")
    text = text.replace(
        "use crate::domain::parse_model_catalog_identity;",
        "use sdkwork_models_catalog_service::domain::parse_model_catalog_identity;",
    )
    text = text.replace(
        "use crate::infrastructure::sql::model_modality;",
        "use crate::modality;",
    )
    text = text.replace(
        "use crate::ports::{",
        "use crate::types::{",
    )
    text = text.replace("model_modality::label", "modality::label")
    text = text.replace(
        "if row.name.trim().is_empty() {",
        "if sdkwork_utils_rust::is_blank(Some(row.name.as_str())) {",
    )
    (CRATE / "snapshot.rs").write_text(text, encoding="utf-8")


def write_postgres() -> None:
    source = PRODUCT / "postgres" / "admin_analytics_read_store.rs"
    body = strip_leading_import_block(source.read_text(encoding="utf-8"))
    body = apply_common_replacements(body)
    (CRATE / "postgres.rs").write_text(POSTGRES_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def write_sqlite() -> None:
    source = PRODUCT / "sqlite" / "admin_analytics_read_store.rs"
    body = strip_leading_import_block(source.read_text(encoding="utf-8"))
    body = apply_common_replacements(body)
    (CRATE / "sqlite.rs").write_text(SQLITE_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def main() -> None:
    CRATE.mkdir(parents=True, exist_ok=True)
    write_snapshot()
    write_postgres()
    write_sqlite()


if __name__ == "__main__":
    main()
