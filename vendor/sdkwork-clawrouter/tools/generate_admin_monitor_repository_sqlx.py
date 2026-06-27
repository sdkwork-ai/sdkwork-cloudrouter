#!/usr/bin/env python3
"""Generate repository-sqlx store modules from legacy product store sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
CRATE = ROOT / "crates" / "sdkwork-clawrouter-admin-monitor-repository-sqlx" / "src"

REPLACEMENTS = [
    (r"use crate::domain::\{DomainError, DomainResult\};", ""),
    (
        r"use crate::ports::\{[^}]+\};",
        "use crate::error::{RepositoryError, RepositoryResult, row_error, store_error};\n"
        "use crate::types::{\n"
        "    AdminMonitorAlert, AdminMonitorNode, AdminMonitorPerformanceDatum, AdminMonitorQuery,\n"
        "    AdminMonitorReadFuture, AdminMonitorReadStore,\n"
        "};",
    ),
    ("DomainResult", "RepositoryResult"),
    ("DomainError::new", "RepositoryError::new"),
    ("DomainError", "RepositoryError"),
]


def transform(source: Path, target: Path, pool_type: str, pool_import: str) -> None:
    text = source.read_text(encoding="utf-8")
    for pattern, replacement in REPLACEMENTS:
        text = re.sub(pattern, replacement, text)
    text = text.replace("use sqlx::{PgPool, Row};", pool_import)
    text = text.replace("use sqlx::{Row, SqlitePool};", pool_import)
    text = text.replace(f"{pool_type}Pool", f"{pool_type}Pool")
    if "RepositoryError" not in text.split("fn row_error")[0]:
        pass
    target.write_text(text, encoding="utf-8")


def main() -> None:
    transform(
        PRODUCT / "postgres" / "admin_monitor_read_store.rs",
        CRATE / "postgres.rs",
        "Pg",
        "use sqlx::{PgPool, Row};\n",
    )
    transform(
        PRODUCT / "sqlite" / "admin_monitor_read_store.rs",
        CRATE / "sqlite.rs",
        "Sqlite",
        "use sqlx::{Row, SqlitePool};\n",
    )


if __name__ == "__main__":
    main()
