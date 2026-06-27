#!/usr/bin/env python3
"""Second pass: wire Extensions extractors and TrustedRequestSubject extractors after phase-1 migration."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
SKIP = {"app_auth.rs", "subject.rs"}


def ensure_extensions_import(text: str) -> str:
    if "Extensions" in text:
        return text
    if "use axum::http::{HeaderMap" in text:
        return text.replace("use axum::http::{HeaderMap", "use axum::http::{Extensions, HeaderMap}", 1)
    if "use axum::http::HeaderMap;" in text:
        return text.replace("use axum::http::HeaderMap;", "use axum::http::{Extensions, HeaderMap};", 1)
    return text


def convert_resolve_subject_helpers(text: str) -> str:
    pattern = re.compile(
        r"fn resolve_subject\(headers: &HeaderMap, extensions: &Extensions\) -> Result<(\w+), Response> \{\s*"
        r"crate::api::subject::resolve_required_compatible\(headers, extensions\)\s*"
        r"\.map\(\|subject\| (\w+) \{\s*"
        r"tenant_id: subject\.tenant_id,\s*"
        r"organization_id: subject\.organization_id,\s*"
        r"operator_id: subject\.operator_id,\s*"
        r"operator_type: subject\.operator_type,\s*"
        r"\}\)\s*"
        r"\.map_err\(\|error\| \{\s*"
        r"\(\s*StatusCode::UNAUTHORIZED,\s*"
        r"Json\(PlusApiResult::error\(\"4010\", error\.to_string\(\)\)\),\s*"
        r"\)\s*\.into_response\(\)\s*"
        r"\}\)\s*"
        r"\}",
        re.DOTALL,
    )

    def repl(match: re.Match[str]) -> str:
        target = match.group(1)
        struct_name = match.group(2)
        return (
            f"fn map_subject(subject: TrustedRequestSubject) -> {target} {{\n"
            f"    {struct_name} {{\n"
            f"        tenant_id: subject.tenant_id,\n"
            f"        organization_id: subject.organization_id,\n"
            f"        operator_id: subject.operator_id,\n"
            f"        operator_type: subject.operator_type,\n"
            f"    }}\n"
            f"}}"
        )

    return pattern.sub(repl, text)


def convert_dashboard_query_helper(text: str) -> str:
    pattern = re.compile(
        r"fn (\w+_from_headers)\(headers: &HeaderMap, extensions: &Extensions\) -> Result<(\w+), Response> \{\s*"
        r"crate::api::subject::resolve_required_compatible\(headers, extensions\)\s*"
        r"\.map\(\|subject\| (\w+) \{\s*"
        r"subject: (\w+) \{\s*"
        r"tenant_id: subject\.tenant_id,\s*"
        r"organization_id: subject\.organization_id,\s*"
        r"operator_id: subject\.operator_id,\s*"
        r"operator_type: subject\.operator_type,\s*"
        r"\},\s*"
        r"\}\)\s*"
        r"\.map_err\(\|error\| \{\s*"
        r"\(\s*StatusCode::UNAUTHORIZED,\s*"
        r"Json\(PlusApiResult::error\(\"4010\", error\.to_string\(\)\)\),\s*"
        r"\)\s*\.into_response\(\)\s*"
        r"\}\)\s*"
        r"\}",
        re.DOTALL,
    )

    def repl(match: re.Match[str]) -> str:
        fn_name = match.group(1).replace("_from_headers", "_from_subject")
        query_type = match.group(2)
        struct_wrapper = match.group(3)
        subject_type = match.group(4)
        return (
            f"fn {fn_name}(subject: TrustedRequestSubject) -> {query_type} {{\n"
            f"    {struct_wrapper} {{\n"
            f"        subject: {subject_type} {{\n"
            f"            tenant_id: subject.tenant_id,\n"
            f"            organization_id: subject.organization_id,\n"
            f"            operator_id: subject.operator_id,\n"
            f"            operator_type: subject.operator_type,\n"
            f"        }},\n"
            f"    }}\n"
            f"}}"
        )

    return pattern.sub(repl, text)


def convert_require_admin_subject(text: str) -> str:
    return text.replace(
        "fn require_admin_subject(headers: &HeaderMap, extensions: &Extensions) -> Result<TrustedRequestSubject, Response> {\n"
        "    crate::api::subject::resolve_required_compatible(headers, extensions).map_err(|error| {\n"
        "        (\n"
        "            StatusCode::UNAUTHORIZED,\n"
        "            Json(PlusApiResult::error(\"4010\", error.to_string())),\n"
        "        )\n"
        "            .into_response()\n"
        "    })\n"
        "}",
        "",
    )


def patch_handlers(text: str) -> str:
    text = text.replace(
        "let subject = match resolve_subject(&headers, &extensions) {\n"
        "        Ok(subject) => subject,\n"
        "        Err(response) => return response,\n"
        "    };",
        "let subject = map_subject(subject);",
    )
    text = text.replace(
        "let query = match dashboard_query_from_headers(&headers, &extensions) {",
        "let query = dashboard_query_from_subject(subject);",
    )
    text = re.sub(
        r"let subject = match require_admin_subject\(&headers, &extensions\) \{\s*"
        r"Ok\(subject\) => subject,\s*"
        r"Err\(response\) => return response,\s*"
        r"\};",
        "",
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r"let subject = match crate::api::subject::resolve_required_compatible\(&headers, &extensions\) \{\s*"
        r"Ok\(subject\) => subject,\s*"
        r"Err\(error\) => return unauthorized\(error\.to_string\(\)\),\s*"
        r"\};\n",
        "",
        text,
        flags=re.DOTALL,
    )

    def add_subject_extractor(match: re.Match[str]) -> str:
        block = match.group(0)
        if "subject: TrustedRequestSubject" in block:
            return block
        if "resolve_subject(&headers" in block or "map_subject(subject)" in block:
            return block.replace(
                "State(state): State",
                "subject: TrustedRequestSubject,\n    State(state): State",
                1,
            )
        if "dashboard_query_from_subject(subject)" in block:
            return block.replace(
                "headers: HeaderMap,\n",
                "subject: TrustedRequestSubject,\n    ",
                1,
            )
        if "resolve_required_compatible(&headers, &extensions)" in block:
            return block.replace(
                "headers: HeaderMap,\n",
                "subject: TrustedRequestSubject,\n    headers: HeaderMap,\n",
                1,
            )
        if "&extensions)" in block and "extensions: Extensions" not in block:
            return block.replace(
                "headers: HeaderMap,\n",
                "extensions: Extensions,\n    headers: HeaderMap,\n",
                1,
            )
        return block

    return re.sub(r"async fn \w+\([\s\S]*?\) -> Response \{", add_subject_extractor, text)


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    text = convert_resolve_subject_helpers(text)
    text = convert_dashboard_query_helper(text)
    text = convert_require_admin_subject(text)
    text = patch_handlers(text)
    text = text.replace("require_admin_subject(&headers, &extensions)", "subject")
    text = text.replace("require_admin_subject(headers, extensions)", "subject")
    text = ensure_extensions_import(text)
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
    print(f"phase2 updated {len(changed)} files")
    for name in changed:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
