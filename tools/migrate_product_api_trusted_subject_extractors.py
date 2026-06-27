#!/usr/bin/env python3
"""Conservative migration: TrustedRequestSubject extractors in product API handlers."""

from __future__ import annotations

import re
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
SKIP = {"app_auth.rs", "subject.rs", "mod.rs"}


def find_matching_brace(text: str, open_index: int) -> int:
    depth = 0
    for index in range(open_index, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return index
    return len(text) - 1


def find_matching_paren(text: str, open_index: int) -> int:
    depth = 0
    for index in range(open_index, len(text)):
        if text[index] == "(":
            depth += 1
        elif text[index] == ")":
            depth -= 1
            if depth == 0:
                return index
    return len(text) - 1


def headers_used_for_non_subject(body: str) -> bool:
    scrubbed = re.sub(r"resolve_subject\s*\(\s*&?headers\s*\)", "", body)
    scrubbed = re.sub(r"TrustedRequestSubject::from_headers\s*\(\s*&?headers\s*\)", "", scrubbed)
    return bool(re.search(r"\bheaders\b", scrubbed))


def migrate_resolve_subject_fn(text: str) -> str:
    return re.sub(
        r"fn resolve_subject\(headers: &HeaderMap\) -> Result<(\w+), Response> \{[\s\S]*?\n\}\n",
        "fn resolve_subject(subject: TrustedRequestSubject) -> \\1 {\n    map_subject(subject)\n}\n\n",
        text,
    )


def migrate_from_headers_optional(text: str) -> str:
    pattern = re.compile(
        r"async fn (?P<name>\w+)\(\s*"
        r"State\(state\): State<(?P<state>\w+)>,\s*"
        r"headers: HeaderMap,\s*"
        r"(?P<rest>[\s\S]*?)"
        r"\) -> Response \{\s*"
        r"let subject = match TrustedRequestSubject::from_headers\(&headers\) \{[\s\S]*?\};\s*",
        re.MULTILINE,
    )

    def repl(match: re.Match[str]) -> str:
        rest = match.group("rest")
        block = match.group(0)
        struct_match = re.search(r"Some\((\w+) \{([^}]+)\}\)", block)
        if not struct_match:
            return block
        struct_name = struct_match.group(1)
        fields = []
        for part in struct_match.group(2).split(","):
            part = part.strip()
            if not part:
                continue
            key = part.split(":")[0].strip()
            fields.append(f"{key}: subject.{key}")
        body_start = block.index("{", block.index(") -> Response"))
        old_body = block[body_start + 1 :]
        new_intro = (
            f"async fn {match.group('name')}(\n"
            f"    State(state): State<{match.group('state')}>,\n"
            f"    subject: Option<TrustedRequestSubject>,\n"
            f"    {rest}) -> Response {{\n"
            f"    let subject = match subject {{\n"
            f"        Some(subject) => Some({struct_name} {{ {', '.join(fields)} }}),\n"
            f"        None if state.require_subject => return crate::api::subject::unauthorized_subject_response(),\n"
            f"        None => None,\n"
            f"    }};\n"
        )
        remainder = re.sub(
            r"let subject = match TrustedRequestSubject::from_headers\(&headers\) \{[\s\S]*?\};\s*",
            "",
            old_body,
            count=1,
        )
        return new_intro + remainder

    return pattern.sub(repl, text)


def migrate_async_handlers(text: str) -> str:
    result = []
    last = 0
    for match in re.finditer(r"async fn \w+\(", text):
        fn_start = match.start()
        paren_start = text.find("(", fn_start)
        paren_end = find_matching_paren(text, paren_start)
        brace_start = text.find("{", paren_end)
        brace_end = find_matching_brace(text, brace_start)
        params = text[paren_start + 1 : paren_end]
        body = text[brace_start + 1 : brace_end]
        if "headers: HeaderMap" not in params:
            continue
        new_params = params
        if "subject: TrustedRequestSubject" not in params and "subject: Option<TrustedRequestSubject>" not in params:
            new_params = new_params.replace(
                "headers: HeaderMap,\n",
                "headers: HeaderMap,\n    subject: TrustedRequestSubject,\n",
                1,
            )
        new_body = body
        new_body = new_body.replace(
            "let subject = match resolve_subject(&headers) {\n        Ok(subject) => subject,\n        Err(response) => return response,\n    };",
            "let subject = resolve_subject(subject);",
        )
        new_body = new_body.replace("resolve_subject(&headers)?", "resolve_subject(subject)")
        new_body = new_body.replace("resolve_subject(headers)?", "resolve_subject(subject)")
        if not headers_used_for_non_subject(new_body):
            new_params = new_params.replace("headers: HeaderMap,\n", "")
            new_params = new_params.replace("headers: HeaderMap", "")
        if new_params == params and new_body == body:
            continue
        result.append((fn_start, brace_end + 1, new_params, new_body, paren_start, paren_end, brace_start))
    if not result:
        return text
    out = []
    pos = 0
    for fn_start, end, new_params, new_body, paren_start, paren_end, brace_start in result:
        out.append(text[pos:fn_start])
        out.append(text[fn_start : paren_start + 1])
        out.append(new_params)
        out.append(text[paren_end : brace_start + 1])
        out.append(new_body)
        out.append("}")
        pos = end
    out.append(text[pos:])
    return "".join(out)


def migrate_helper_headers_params(text: str) -> str:
    for _ in range(20):
        changed = False
        for match in re.finditer(r"fn (\w+)\(([^)]*headers: &HeaderMap[^)]*)\)", text):
            fn_name = match.group(1)
            params = match.group(2)
            if "resolve_subject(headers)" not in text[match.end() : match.end() + 800]:
                continue
            new_params = params.replace("headers: &HeaderMap,", "subject: TrustedRequestSubject,", 1)
            if new_params == params:
                continue
            text = text[: match.start(2)] + new_params + text[match.end(2) :]
            text = text.replace(f"{fn_name}(&headers,", f"{fn_name}(subject,")
            changed = True
            break
        if not changed:
            break
    return text


def enhance_subject_rs() -> None:
    path = API_DIR / "subject.rs"
    text = path.read_text(encoding="utf-8")
    if "unauthorized_subject_response" in text:
        return
    path.write_text(
        """use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_http::{TrustedRequestSubject, TrustedRequestSubjectError};

use crate::api::response::PlusApiResult;

pub fn unauthorized_subject_response() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(PlusApiResult::<()>::error(
            "4010",
            TrustedRequestSubjectError::MissingExtension.to_string(),
        )),
    )
        .into_response()
}

pub fn required_subject(
    subject: Option<TrustedRequestSubject>,
) -> Result<TrustedRequestSubject, Response> {
    subject.ok_or_else(unauthorized_subject_response)
}
""",
        encoding="utf-8",
        newline="\n",
    )


def migrate_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    if "TrustedRequestSubject::from_headers" not in original and "resolve_subject(&headers)" not in original:
        return False
    text = original
    text = migrate_resolve_subject_fn(text)
    text = migrate_from_headers_optional(text)
    text = migrate_async_handlers(text)
    text = migrate_helper_headers_params(text)
    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    enhance_subject_rs()
    changed = [path.name for path in sorted(API_DIR.glob("*.rs")) if path.name not in SKIP and migrate_file(path)]
    print(f"migrated {len(changed)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
