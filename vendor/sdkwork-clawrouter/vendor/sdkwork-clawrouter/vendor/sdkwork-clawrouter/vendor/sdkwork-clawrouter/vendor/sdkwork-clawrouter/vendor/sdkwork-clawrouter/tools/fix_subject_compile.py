#!/usr/bin/env python3
"""Repair TrustedRequestSubject migration compile errors in map_subject API files."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")
EXTRACTOR = "trusted: TrustedRequestSubject"
TRUSTED_MARKER = "TrustedRequestSubject"


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
    updated = re.sub(
        r"trusted: TrustedRequestSubject,\s*headers: HeaderMap",
        "trusted: TrustedRequestSubject,\n    headers: HeaderMap",
        updated,
    )
    return updated


def inject_trusted_param(params: str) -> str:
    if TRUSTED_MARKER in params:
        return params
    if "headers: HeaderMap" in params:
        return params.replace(
            "headers: HeaderMap,",
            f"{EXTRACTOR},\n    headers: HeaderMap,",
            1,
        ).replace(
            "headers: HeaderMap",
            f"{EXTRACTOR},\n    headers: HeaderMap",
            1,
        )
    if "State(" in params:
        return re.sub(
            r"(State\([^\)]+\),)\s*",
            rf"\1\n    {EXTRACTOR},\n    ",
            params,
            count=1,
        )
    return f"{EXTRACTOR},\n    {params}"


def fix_resolve_subject_calls(text: str) -> str:
    return re.sub(
        r"subject: match resolve_subject\(&headers\) \{\s*"
        r"Ok\(subject\) => subject,\s*"
        r"Err\(response\) => return response,\s*\}",
        "subject: map_subject(trusted)",
        text,
    )


def find_function_spans(text: str) -> list[tuple[int, int, str, str]]:
    pattern = re.compile(r"(?:^|\n)(async fn|fn) (\w+)")
    spans: list[tuple[int, int, str, str]] = []
    for match in pattern.finditer(text):
        header_start = match.start(1)
        name = match.group(2)
        paren_start = text.find("(", match.end())
        if paren_start == -1:
            continue
        depth = 0
        paren_end = -1
        for idx in range(paren_start, len(text)):
            char = text[idx]
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    paren_end = idx
                    break
        if paren_end == -1:
            continue
        params = text[paren_start + 1 : paren_end]
        body_start = text.find("{", paren_end)
        if body_start == -1:
            continue
        depth = 0
        body_end = -1
        for idx in range(body_start, len(text)):
            char = text[idx]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    body_end = idx + 1
                    break
        if body_end == -1:
            continue
        spans.append((header_start, body_end, params, text[body_start:body_end]))
    return spans


def body_uses_trusted(body: str) -> bool:
    return bool(re.search(r"\btrusted\b", body))


def fix_function_signatures(text: str) -> str:
    """Disabled: nested `State(...)` parens break naive signature parsing."""
    return text


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "fn map_subject" not in text:
        return False
    updated = dedupe_trusted(text)
    updated = fix_resolve_subject_calls(updated)
    updated = fix_function_signatures(updated)
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
