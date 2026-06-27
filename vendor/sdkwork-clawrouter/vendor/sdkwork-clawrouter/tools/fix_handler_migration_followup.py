#!/usr/bin/env python3
"""Post-fix product API handler migration."""

from __future__ import annotations

import re
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"


def fix_file(text: str) -> str:
    text = re.sub(
        r"subject: Option<TrustedRequestSubject>,\n    headers: HeaderMap,\n    subject: TrustedRequestSubject,\n",
        "subject: Option<TrustedRequestSubject>,\n    headers: HeaderMap,\n",
        text,
    )
    text = re.sub(
        r"subject: match resolve_subject\(&headers\) \{\n"
        r"            Ok\(subject\) => subject,\n"
        r"            Err\(response\) => return response,\n"
        r"        \},",
        "subject: map_subject(subject),",
        text,
    )
    text = text.replace("resolve_subject(&headers)?", "map_subject(subject)")
    text = text.replace("resolve_subject(headers)?", "map_subject(subject)")
    text = text.replace("subject: resolve_subject(headers)?,", "subject: map_subject(subject),")

    for match in list(re.finditer(r"fn (\w+)\(\s*headers: &HeaderMap,", text)):
        fn_name = match.group(1)
        fn_start = match.start()
        brace_start = text.find("{", match.end())
        brace_end = text.find("\nfn ", brace_start)
        if brace_end == -1:
            brace_end = len(text)
        body = text[brace_start:brace_end]
        if "resolve_subject(headers)" not in body:
            continue
        text = text[: match.start()] + text[match.start() : match.end()].replace(
            "headers: &HeaderMap,", "subject: TrustedRequestSubject,", 1
        ) + text[match.end() :]
        text = text.replace(f"{fn_name}(&headers,", f"{fn_name}(subject,")
        text = text.replace(f"{fn_name}(headers,", f"{fn_name}(subject,")

    text = re.sub(
        r"(async fn \w+\([^)]*)\n    headers: HeaderMap,\n    subject: TrustedRequestSubject,\n([^)]*\) -> Response \{\n(?:    [^\n]+\n)*?    let \w+ = match \w+\(subject,)",
        lambda m: m.group(1) + "\n    subject: TrustedRequestSubject,\n" + m.group(2),
        text,
        flags=re.DOTALL,
    )

    # Drop headers param when no longer referenced in handler bodies.
    def drop_unused_headers_in_async(match: re.Match[str]) -> str:
        block = match.group(0)
        if re.search(r"\bheaders\b", block.split("{", 1)[1]):
            return block
        return block.replace("    headers: HeaderMap,\n", "")

    text = re.sub(r"async fn \w+\([\s\S]*?\) -> Response \{[\s\S]*?\n\}", drop_unused_headers_in_async, text)

    return text


def main() -> int:
    for path in sorted(API_DIR.glob("*.rs")):
        original = path.read_text(encoding="utf-8")
        updated = fix_file(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="\n")
            print(f"fixed {path.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
