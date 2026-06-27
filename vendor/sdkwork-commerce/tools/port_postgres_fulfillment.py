#!/usr/bin/env python3
"""Port fulfillment helpers from sqlite_fulfillment.rs to postgres_fulfillment.rs."""

from __future__ import annotations

import re
import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))
from capability_repository_paths import sqlite_postgres_pair

SQLITE, POSTGRES = sqlite_postgres_pair("order", "fulfillment")


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


def port_text(text: str) -> str:
    text = text.replace(
        "use crate::sqlite_order::SqliteCommerceOrderStore;",
        "use crate::postgres_order::PostgresCommerceOrderStore;",
    )
    text = text.replace("impl SqliteCommerceOrderStore", "impl PostgresCommerceOrderStore")
    text = text.replace("sqlx::sqlite::SqliteRow", "sqlx::postgres::PgRow")
    return renumber_sql_placeholders(text)


def main() -> None:
    sqlite = SQLITE.read_text(encoding="utf-8")
    postgres = port_text(sqlite)
    POSTGRES.write_text(postgres, encoding="utf-8")
    print(f"wrote {POSTGRES}")


if __name__ == "__main__":
    main()
