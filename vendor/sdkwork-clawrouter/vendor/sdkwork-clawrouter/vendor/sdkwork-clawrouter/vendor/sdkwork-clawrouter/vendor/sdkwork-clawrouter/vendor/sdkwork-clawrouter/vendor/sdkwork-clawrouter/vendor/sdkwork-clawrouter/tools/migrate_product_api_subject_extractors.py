#!/usr/bin/env python3
"""Migrate resolve_subject() helpers to framework-aware TrustedRequestSubject extractors."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")
SKIP = {"app_auth.rs", "subject.rs"}
EXTRACTOR = "trusted: TrustedRequestSubject"

RESOLVE_FN = re.compile(
    r"fn resolve_subject\(headers: &HeaderMap\) -> Result<(?P<type>[^,]+), Response> \{\s*"
    r"TrustedRequestSubject::from_headers\(headers\)\s*"
    r"\.map\(\|subject\| (?P<body>[\s\S]*?)\)\s*"
    r"\.map_err\(\|error\| \{[\s\S]*?\}\)\s*"
    r"\}",
    re.MULTILINE,
)

MATCH_BLOCK = re.compile(
    r"    let subject = match resolve_subject\(&headers\) \{\s*"
    r"Ok\(subject\) => subject,\s*"
    r"Err\(response\) => return response,\s*"
    r"\};\n",
    re.MULTILINE,
)


def migrate_resolve_helpers(text: str) -> tuple[str, bool]:
    match = RESOLVE_FN.search(text)
    if not match:
        return text, False
    body = match.group("body")
    body = re.sub(r"\bsubject\.", "trusted.", body)
    replacement = (
        f"fn map_subject({EXTRACTOR}) -> {match.group('type')} {{\n"
        f"    {body.strip()}\n"
        f"}}"
    )
    updated = text[: match.start()] + replacement + text[match.end() :]
    updated = MATCH_BLOCK.sub("    let subject = map_subject(trusted);\n", updated)
    updated = updated.replace("resolve_subject(headers)?", "map_subject(trusted)")
    updated = updated.replace("resolve_subject(&headers)?", "map_subject(trusted)")
    updated = updated.replace("subject: resolve_subject(headers)?", "subject: map_subject(trusted)")
    updated = updated.replace("subject: resolve_subject(&headers)?", "subject: map_subject(trusted)")
    return updated, True


def add_extractor(text: str) -> str:
    if "map_subject(trusted)" not in text:
        return text

    def repl(match: re.Match[str]) -> str:
        params = match.group("params")
        if EXTRACTOR in params:
            return match.group(0)
        if "headers: HeaderMap" in params:
            params = params.replace(
                "headers: HeaderMap,",
                f"{EXTRACTOR},\n    headers: HeaderMap,",
                1,
            )
            params = params.replace(
                "headers: HeaderMap\n",
                f"{EXTRACTOR},\n    headers: HeaderMap\n",
                1,
            )
        else:
            params = re.sub(
                r"(State\([^\)]+\),)\s*",
                rf"\1\n    {EXTRACTOR},\n    ",
                params,
                count=1,
            )
        return f"{match.group(1)}{params}{match.group(3)}"

    handler_re = re.compile(
        r"(async fn \w+\(\s*)(?P<params>[\s\S]*?)(\) -> Response \{\n[\s\S]*?map_subject\(trusted\))",
        re.MULTILINE,
    )
    return handler_re.sub(repl, text)


def migrate_file(path: Path, apply: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    updated, changed = migrate_resolve_helpers(original)
    if not changed:
        return False
    updated = add_extractor(updated)
    if apply:
        path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    changed: list[str] = []
    for path in sorted(API_DIR.glob("*.rs")):
        if path.name in SKIP:
            continue
        if migrate_file(path, apply=args.apply):
            changed.append(path.name)
    print(f"{'applied' if args.apply else 'planned'} {len(changed)} resolve_subject files")
    for name in changed:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
