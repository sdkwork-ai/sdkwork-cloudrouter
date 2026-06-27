#!/usr/bin/env python3
"""Replace raw app subject boundary .layer() calls with apply_*_if_legacy wrappers."""

from __future__ import annotations

import re
from pathlib import Path

ROUTES = Path(__file__).resolve().parents[1] / "crates/sdkwork-routes-clawrouter-app-api/src/routes.rs"

BOUNDARIES = {
    "sdkwork_claw_http::app_request_subject_boundary": (
        "sdkwork_claw_http::apply_app_subject_boundary_if_legacy"
    ),
    "sdkwork_claw_http::optional_app_request_subject_boundary": (
        "sdkwork_claw_http::apply_optional_app_subject_boundary_if_legacy"
    ),
}


def find_matching_paren(text: str, open_idx: int) -> int:
    if text[open_idx] != "(":
        raise ValueError(f"expected '(' at {open_idx}")
    depth = 0
    for idx in range(open_idx, len(text)):
        char = text[idx]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return idx
    raise ValueError("unmatched '('")


def find_next_boundary_layer(text: str, start: int) -> int:
    idx = text.find(".layer(", start)
    while idx != -1:
        inner = idx + len(".layer(")
        while inner < len(text) and text[inner] in " \t\n\r":
            inner += 1
        if text.startswith("from_fn_with_state(", inner):
            return idx
        idx = text.find(".layer(", idx + 1)
    return -1


def find_expr_start(text: str, layer_start: int) -> int:
    pos = layer_start - 1
    while pos >= 0 and text[pos] in " \t\r\n":
        pos -= 1
    if pos < 0:
        raise ValueError("could not locate expression before .layer")

    if text[pos] == ")":
        depth = 0
        while pos >= 0:
            if text[pos] == ")":
                depth += 1
            elif text[pos] == "(":
                depth -= 1
                if depth == 0:
                    name_pos = pos
                    while name_pos > 0 and (
                        text[name_pos - 1].isalnum()
                        or text[name_pos - 1] in "_:&"
                    ):
                        name_pos -= 1
                    return name_pos
            pos -= 1
        raise ValueError("unmatched ')' before .layer")

    end = pos + 1
    start = pos
    while start > 0 and (
        text[start - 1].isalnum() or text[start - 1] in "_:&"
    ):
        start -= 1
    return start


def normalize_expr(expr: str) -> str:
    expr = expr.strip()
    merge_prefix = "router.merge("
    if merge_prefix in expr:
        expr = expr[expr.rindex(merge_prefix) + len(merge_prefix) :]
    if "=>" in expr:
        raise ValueError(f"refusing to migrate match-arm prefix in expression: {expr!r}")
    return expr.strip()


def migrate(content: str) -> str:
    search_from = 0
    migrated = 0
    while True:
        layer_start = find_next_boundary_layer(content, search_from)
        if layer_start == -1:
            break

        layer_open = layer_start + len(".layer")
        layer_close = find_matching_paren(content, layer_open)
        layer_block = content[layer_open : layer_close + 1]

        apply_fn = None
        for boundary, wrapper in BOUNDARIES.items():
            if boundary in layer_block:
                apply_fn = wrapper
                break
        if apply_fn is None:
            raise ValueError(
                "unexpected .layer(from_fn_with_state(...)) block:\n"
                f"{layer_block[:200]}"
            )

        config_match = re.search(
            r"from_fn_with_state\(\s*(.+?)\s*,\s*sdkwork_claw_http::",
            layer_block,
            re.DOTALL,
        )
        if not config_match:
            raise ValueError(f"missing boundary config in:\n{layer_block}")
        config_arg = config_match.group(1).strip()

        expr_start = find_expr_start(content, layer_start)
        raw_expr = content[expr_start:layer_start].rstrip()
        expr = normalize_expr(raw_expr)

        line_end = content.find("\n", layer_start)
        line = content[layer_start : line_end if line_end != -1 else len(content)]
        indent = re.match(r"(\s*)", line).group(1)
        if not indent:
            line_start = content.rfind("\n", 0, layer_start) + 1
            indent = re.match(r"(\s*)", content[line_start:layer_start]).group(1)

        replacement = (
            f"{apply_fn}(\n"
            f"{indent}    {expr},\n"
            f"{indent}    {config_arg},\n"
            f"{indent})"
        )

        content = content[:expr_start] + replacement + content[layer_close + 1 :]
        search_from = expr_start + len(replacement)
        migrated += 1

    return content, migrated


def main() -> None:
    original = ROUTES.read_text(encoding="utf-8")
    migrated, count = migrate(original)
    if count == 0:
        print(f"no remaining boundary layers in {ROUTES}")
        return
    ROUTES.write_text(migrated, encoding="utf-8")
    print(f"migrated {count} boundary layers in {ROUTES}")


if __name__ == "__main__":
    main()
