#!/usr/bin/env python3
"""Generate app-providers repository-sqlx store modules from legacy router-service sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
CRATE = ROOT / "crates" / "sdkwork-clawrouter-app-providers-repository-sqlx" / "src"

POSTGRES_HEADER = """use sqlx::{PgPool, Row};

use crate::error::{RepositoryResult, store_error};
use crate::mapping::{require_subject, row_to_provider};
use crate::types::{
    AppProviderItem, AppProvidersReadFuture, AppProvidersReadStore, AppProvidersSubject,
};"""

SQLITE_HEADER = """use sqlx::{Row, SqlitePool};

use crate::error::{RepositoryResult, store_error};
use crate::mapping::{require_subject, row_to_provider};
use crate::types::{
    AppProviderItem, AppProvidersReadFuture, AppProvidersReadStore, AppProvidersSubject,
};"""


def strip_store_body(text: str) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.startswith("const LOAD_PROVIDERS"):
            return "\n".join(lines[index:])
    return text


def trim_after_store_impl(text: str) -> str:
    marker = "fn row_to_provider"
    if marker in text:
        return text.split(marker, 1)[0].rstrip() + "\n"
    return text


def apply_replacements(text: str) -> str:
    text = text.replace("DomainResult", "RepositoryResult")
    text = re.sub(
        r"\.map_err\(sql_error\)(\?)??",
        lambda match: f".map_err(|error| store_error(\"app providers query\", error)){match.group(1) or ''}",
        text,
    )
    return trim_after_store_impl(text)


def write_postgres() -> None:
    source = PRODUCT / "postgres" / "app_providers_read_store.rs"
    body = apply_replacements(strip_store_body(source.read_text(encoding="utf-8")))
    (CRATE / "postgres.rs").write_text(POSTGRES_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def write_sqlite() -> None:
    source = PRODUCT / "sqlite" / "app_providers_read_store.rs"
    body = apply_replacements(strip_store_body(source.read_text(encoding="utf-8")))
    (CRATE / "sqlite.rs").write_text(SQLITE_HEADER + "\n\n" + body + "\n", encoding="utf-8")


def main() -> None:
    CRATE.mkdir(parents=True, exist_ok=True)
    write_postgres()
    write_sqlite()


if __name__ == "__main__":
    main()
