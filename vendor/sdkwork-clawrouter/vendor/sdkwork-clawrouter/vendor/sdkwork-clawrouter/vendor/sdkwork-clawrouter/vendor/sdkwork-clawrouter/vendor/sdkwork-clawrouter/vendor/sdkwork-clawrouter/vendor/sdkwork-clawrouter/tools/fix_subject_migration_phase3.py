#!/usr/bin/env python3
"""Third pass: add TrustedRequestSubject extractor to handlers and remove orphan match arms."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
SKIP = {"app_auth.rs", "subject.rs"}


def remove_orphan_match_arms(text: str) -> str:
    return re.sub(
        r"(?P<prefix>let \w+ = [^;]+;)\s*"
        r"Ok\(query\) => query,\s*"
        r"Err\(response\) => return response,\s*"
        r"\};",
        r"\g<prefix>",
        text,
        flags=re.MULTILINE,
    )


def add_subject_extractor_to_handlers(text: str) -> str:
    if "map_subject(subject)" not in text and "dashboard_query_from_subject(subject)" not in text:
        return text

    def patch_handler(match: re.Match[str]) -> str:
        block = match.group(0)
        if "subject: TrustedRequestSubject" in block:
            return block
        if "map_subject(subject)" not in block and "dashboard_query_from_subject(subject)" not in block:
            return block

        updated = re.sub(
            r"(\n\s*)headers: HeaderMap,",
            r"\1subject: TrustedRequestSubject,\n\1headers: HeaderMap,",
            block,
            count=1,
        )
        if "subject: TrustedRequestSubject" not in updated:
            updated = re.sub(
                r"async fn \w+\(\n(\s*)State\(",
                r"async fn handler_placeholder(\n\1subject: TrustedRequestSubject,\n\1State(",
                block,
                count=1,
            )
            updated = updated.replace("async fn handler_placeholder(", f"async fn {match.group(1) if match.lastindex else 'handler'}(")
            # fallback: insert before State
            updated = re.sub(
                r"(async fn \w+\(\n\s*)State\(",
                r"\1subject: TrustedRequestSubject,\n\1State(",
                block,
                count=1,
            )
        return updated

    text = re.sub(
        r"async fn \w+\([\s\S]*?\) -> Response \{[\s\S]*?\n\}",
        patch_handler,
        text,
    )
    return text


def strip_unused_headers_param(text: str) -> str:
    """Remove headers: HeaderMap when the handler body no longer references headers."""

    def strip_in_handler(match: re.Match[str]) -> str:
        block = match.group(0)
        if "headers" not in block.replace("headers: HeaderMap,", ""):
            block = re.sub(r"\n\s*headers: HeaderMap,\n", "\n", block, count=1)
        return block

    return re.sub(
        r"async fn \w+\([\s\S]*?\) -> Response \{[\s\S]*?\n\}",
        strip_in_handler,
        text,
    )


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    text = remove_orphan_match_arms(text)
    text = add_subject_extractor_to_handlers(text)
    text = strip_unused_headers_param(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    changed = []
    for path in sorted(API_DIR.glob("*.rs")):
        if path.name in SKIP:
            continue
        if fix_file(path):
            changed.append(path.name)
    print(f"phase3 updated {len(changed)} files")
    for name in changed:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
