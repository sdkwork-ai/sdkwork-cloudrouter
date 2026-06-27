#!/usr/bin/env python3
"""Remove duplicated handler signatures from broken migration passes."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")

DUPLICATE_BLOCK = re.compile(
    r",\s*\n\): State<[^>]+>,\n(?:    .+\n)*?\) ->",
    re.MULTILINE,
)

SINGLE_LINE = re.compile(
    r"headers: HeaderMap\): State<[^>]+>,\s*"
    r"(?:trusted: TrustedRequestSubject,\s*)?"
    r"headers: HeaderMap,\s*(\) ->)",
)


def repair_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    updated = DUPLICATE_BLOCK.sub("\n) ->", text)
    updated = SINGLE_LINE.sub(r"headers: HeaderMap) \1", updated)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed = [path.name for path in sorted(API_DIR.glob("*.rs")) if repair_file(path)]
    print(f"repaired {len(changed)} files")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
