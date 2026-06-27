#!/usr/bin/env python3
"""Fix helper signatures and call sites broken by subject migration."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")

HEADER_HELPER = re.compile(
    r"fn (required_header|optional_header)\(\s*"
    r"trusted: TrustedRequestSubject,\s*"
    r"(headers: &HeaderMap, name: &str)",
    re.MULTILINE,
)


def fix_header_helpers(text: str) -> str:
    return HEADER_HELPER.sub(r"fn \1(\2", text)


def fix_list_response_calls(text: str) -> str:
    return re.sub(
        r"list_response\(\s*headers,",
        "list_response(trusted,",
        text,
    )


def fix_child_list_response_calls(text: str) -> str:
    return re.sub(
        r"child_list_response\(trusted, ([^,]+), (\"[^\"]+\"), query,",
        r"child_list_response(trusted, headers, \1, \2, query,",
        text,
    )


def fix_file(path: Path) -> bool:
    if "fn map_subject" not in path.read_text(encoding="utf-8"):
        return False
    text = path.read_text(encoding="utf-8")
    updated = fix_child_list_response_calls(
        fix_list_response_calls(fix_header_helpers(text))
    )
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed = [path.name for path in sorted(API_DIR.glob("*.rs")) if fix_file(path)]
    print(f"fixed {len(changed)} files")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
