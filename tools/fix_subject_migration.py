#!/usr/bin/env python3
"""Post-fix map_subject migrations in resolve_subject-only files."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path("services/sdkwork-clawrouter-router-service/src/api")
EXTRACTOR = "trusted: TrustedRequestSubject"


def inject_trusted_param(params: str) -> str:
    if EXTRACTOR in params:
        return params
    if "headers: HeaderMap" in params:
        return params.replace(
            "headers: HeaderMap,",
            f"{EXTRACTOR},\n    headers: HeaderMap,",
            1,
        ).replace(
            "headers: HeaderMap",
            f"{EXTRACTOR}, headers: HeaderMap",
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


def fix_internal_helpers(text: str) -> str:
    updated = re.sub(
        r"fn validated_list_query\(\s*headers: &HeaderMap,",
        f"fn validated_list_query(\n    {EXTRACTOR},",
        text,
    )
    updated = re.sub(
        r"async fn list_response<'a, F>\(\s*headers: HeaderMap,",
        f"async fn list_response<'a, F>(\n    {EXTRACTOR},",
        updated,
    )
    for helper in (
        "category_command",
        "product_command",
        "sku_command",
        "attribute_command",
        "category_attribute_command",
        "price_list_command",
    ):
        updated = re.sub(
            rf"fn {helper}\(\s*headers: &HeaderMap,",
            f"fn {helper}(\n    {EXTRACTOR},\n    headers: &HeaderMap,",
            updated,
        )
        updated = updated.replace(f"{helper}(&headers,", f"{helper}(trusted, &headers,")
    updated = updated.replace("validated_list_query(&headers,", "validated_list_query(trusted,")
    updated = updated.replace("validated_list_query(headers,", "validated_list_query(trusted,")
    updated = updated.replace("list_response(headers,", "list_response(trusted,")
    updated = re.sub(
        r"(resource_response|child_list_response)\(headers,",
        r"\1(trusted, headers,",
        updated,
    )
    return updated


TRUSTED_USAGE_MARKERS = (
    "map_subject(trusted)",
    "list_response(trusted",
    "resource_response(trusted",
    "child_list_response(trusted",
    "validated_list_query(trusted",
)


def handler_uses_trusted(body: str) -> bool:
    return any(marker in body for marker in TRUSTED_USAGE_MARKERS)


def fix_async_handlers(text: str) -> str:
    pattern = re.compile(
        r"async fn \w+(?:<[^>]+>)?\((?P<params>.*?)\) -> Response(?:\s*\nwhere[\s\S]*?)? \{",
        re.DOTALL,
    )
    out: list[str] = []
    cursor = 0
    for match in pattern.finditer(text):
        fn_start = match.start()
        header_end = match.end()
        next_fn = text.find("\nasync fn ", header_end)
        fn_end = next_fn if next_fn != -1 else len(text)
        out.append(text[cursor:fn_start])
        params = match.group("params")
        body = text[header_end:fn_end]
        if handler_uses_trusted(body) and EXTRACTOR not in params:
            params = inject_trusted_param(params)
            out.append(text[fn_start : match.start("params")])
            out.append(params)
            out.append(text[match.end("params") : fn_end])
        else:
            out.append(text[fn_start:fn_end])
        cursor = fn_end
    out.append(text[cursor:])
    return "".join(out)


def fix_sync_helpers(text: str) -> str:
    updated = re.sub(
        r"fn (\w+)\(\s*headers: &HeaderMap,",
        rf"fn \1(\n    {EXTRACTOR},\n    headers: &HeaderMap,",
        text,
    )
    updated = re.sub(
        r"fn (\w+)\(\s*state: ([^,]+),\s*headers: &HeaderMap,",
        rf"fn \1(\n    state: \2,\n    {EXTRACTOR},\n    headers: &HeaderMap,",
        updated,
    )
    updated = re.sub(
        r"(\b(?:build|validated|parse|normalize|create|delete|update)[_\w]*)\(&headers,",
        r"\1(trusted, &headers,",
        updated,
    )
    updated = re.sub(
        r"(\b(?:build|validated|parse|normalize|create|delete|update)[_\w]*)\(headers,",
        r"\1(trusted, headers,",
        updated,
    )
    updated = re.sub(
        r"(\b(?:build|validated|parse|normalize|create|delete|update)[_\w]*)\(state, &headers,",
        r"\1(state, trusted, &headers,",
        updated,
    )
    return updated


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "fn map_subject" not in text:
        return False
    updated = fix_internal_helpers(text)
    updated = fix_sync_helpers(updated)
    updated = fix_async_handlers(updated)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed = [path.name for path in sorted(API_DIR.glob("*.rs")) if fix_file(path)]
    print(f"fixed {len(changed)} map_subject files")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
