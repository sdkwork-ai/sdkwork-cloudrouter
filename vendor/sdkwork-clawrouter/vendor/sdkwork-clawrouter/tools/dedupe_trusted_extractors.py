#!/usr/bin/env python3
"""Deduplicate trusted extractor params and fix resolve_subject remnants."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")


def dedupe_trusted(text: str) -> str:
    updated = re.sub(
        r"(trusted: TrustedRequestSubject,\s*){2,}",
        "trusted: TrustedRequestSubject,\n    ",
        text,
    )
    while True:
        next_text = re.sub(
            r"trusted: TrustedRequestSubject,\n(\s*)trusted: TrustedRequestSubject,",
            "trusted: TrustedRequestSubject,",
            updated,
        )
        if next_text == updated:
            break
        updated = next_text
    return updated


def fix_resolve_subject_calls(text: str) -> str:
    return re.sub(
        r"subject: match resolve_subject\(&headers\) \{\s*"
        r"Ok\(subject\) => subject,\s*"
        r"Err\(response\) => return response,\s*\}",
        "subject: map_subject(trusted)",
        text,
    )


def main() -> None:
    for path in sorted(API_DIR.glob("*.rs")):
        if "fn map_subject" not in path.read_text(encoding="utf-8"):
            continue
        text = path.read_text(encoding="utf-8")
        updated = fix_resolve_subject_calls(dedupe_trusted(text))
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print(path.name)


if __name__ == "__main__":
    main()
