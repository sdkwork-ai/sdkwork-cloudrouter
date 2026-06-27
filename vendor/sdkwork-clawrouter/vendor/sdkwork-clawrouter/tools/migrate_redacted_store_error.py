#!/usr/bin/env python3
"""Migrate simple store_error helpers to redacted_store_error in SQL stores."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL_ROOT = ROOT / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql"

IMPORT_LINE = "use crate::infrastructure::sql::store_error::redacted_store_error;\n"

SIMPLE_STORE_ERROR = re.compile(
    r"fn store_error\(context: &str, error: sqlx::Error\) -> DomainError \{\n"
    r"    DomainError::new\(format!\(\"{context}: \{error\}\"\)\)\n"
    r"\}",
    re.MULTILINE,
)

REPLACEMENT = (
    "fn store_error(context: &str, error: sqlx::Error) -> DomainError {\n"
    "    redacted_store_error(context, error)\n"
    "}"
)


def ensure_import(content: str) -> str:
    if "use crate::infrastructure::sql::store_error::redacted_store_error" in content:
        return content
    markers = (
        "use crate::domain::{",
        "use crate::domain::DomainError",
    )
    for marker in markers:
        if marker in content:
            return content.replace(marker, IMPORT_LINE + marker, 1)
    raise ValueError("could not find domain import anchor")


def apply_simple_store_error_migration(content: str) -> str:
    if not SIMPLE_STORE_ERROR.search(content):
        return content
    content = SIMPLE_STORE_ERROR.sub(REPLACEMENT, content)
    return ensure_import(content)


def main() -> None:
    updated: list[str] = []
    skipped: list[str] = []
    for path in sorted(SQL_ROOT.rglob("*.rs")):
        if path.name == "store_error.rs":
            continue
        text = path.read_text(encoding="utf-8")
        if "redacted_store_error(context, error)" not in text:
            if "fn store_error" not in text:
                continue
            if not SIMPLE_STORE_ERROR.search(text):
                skipped.append(str(path.relative_to(ROOT)))
                continue
            try:
                new_text = apply_simple_store_error_migration(text)
            except ValueError as error:
                skipped.append(f"{path.relative_to(ROOT)} ({error})")
                continue
        elif "use crate::infrastructure::sql::store_error::redacted_store_error" not in text:
            try:
                new_text = ensure_import(text)
            except ValueError as error:
                skipped.append(f"{path.relative_to(ROOT)} ({error})")
                continue
        else:
            continue
        if new_text != text:
            path.write_text(new_text, encoding="utf-8", newline="\n")
            updated.append(str(path.relative_to(ROOT)))
    print(f"updated {len(updated)} files")
    for item in updated:
        print(f"  {item}")
    if skipped:
        print(f"skipped {len(skipped)} files with custom store_error")
        for item in skipped[:10]:
            print(f"  {item}")
        if len(skipped) > 10:
            print(f"  ... and {len(skipped) - 10} more")


if __name__ == "__main__":
    main()
