#!/usr/bin/env python3
"""Migrate product API handlers from TrustedRequestSubject::from_headers to extractors."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
SKIP = {"app_auth.rs", "subject.rs"}

ADMIN_RESOLVE = re.compile(
    r"fn resolve_subject\(headers: &HeaderMap\) -> Result<(\w+), Response> \{\s*"
    r"TrustedRequestSubject::from_headers\(headers\)\s*"
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

ADMIN_DASHBOARD = re.compile(
    r"fn dashboard_query_from_headers\(headers: &HeaderMap\) -> Result<(\w+), Response> \{\s*"
    r"TrustedRequestSubject::from_headers\(headers\)\s*"
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

REQUIRE_ADMIN = re.compile(
    r"fn require_admin_subject\(headers: &HeaderMap\) -> Result<TrustedRequestSubject, Response> \{\s*"
    r"TrustedRequestSubject::from_headers\(headers\)\.map_err\(\|error\| \{\s*"
    r"\(\s*StatusCode::UNAUTHORIZED,\s*"
    r"Json\(PlusApiResult::error\(\"4010\", error\.to_string\(\)\)\),\s*"
    r"\)\s*\.into_response\(\)\s*"
    r"\}\)\s*"
    r"\}\n",
    re.DOTALL,
)

APP_OPTIONAL = re.compile(
    r"fn (\w+)\(\s*headers: &HeaderMap,\s*require_subject: bool,\s*\) -> Result<Option<(\w+)>, Response> \{\s*"
    r"match TrustedRequestSubject::from_headers\(headers\) \{\s*"
    r"Ok\(subject\) => Ok\(Some\(\2 \{\s*"
    r"tenant_id: subject\.tenant_id,\s*"
    r"organization_id: subject\.organization_id,\s*"
    r"user_id: subject\.user_id,\s*"
    r"\}\)\),\s*"
    r"Err\(error\) if require_subject => Err\(\(\s*"
    r"StatusCode::UNAUTHORIZED,\s*"
    r"Json\(PlusApiResult(?:::[^)]*)?::error\(\"4010\", error\.to_string\(\)\)\),\s*"
    r"\)\s*\.into_response\(\)\),\s*"
    r"Err\(_\) => Ok\(None\),\s*"
    r"\}\s*"
    r"\}",
    re.DOTALL,
)

APP_RUNTIME_REQUIRED = re.compile(
    r"fn required_subject\(\s*state: &AppRuntimeState,\s*headers: &HeaderMap,\s*\) -> Result<AppRuntimeSubject, Response> \{\s*"
    r"match TrustedRequestSubject::from_headers\(headers\) \{\s*"
    r"Ok\(subject\) => Ok\(AppRuntimeSubject \{\s*"
    r"tenant_id: subject\.tenant_id,\s*"
    r"organization_id: subject\.organization_id,\s*"
    r"user_id: subject\.user_id,\s*"
    r"\}\),\s*"
    r"Err\(error\) if state\.require_subject => Err\(\(\s*"
    r"StatusCode::UNAUTHORIZED,\s*"
    r"Json\(PlusApiResult::error\(\"4010\", error\.to_string\(\)\)\),\s*"
    r"\)\s*\.into_response\(\)\),\s*"
    r"Err\(_\) => Err\(\(\s*"
    r"StatusCode::UNAUTHORIZED,\s*"
    r"Json\(PlusApiResult::error\(\s*"
    r"\"4010\",\s*"
    r"\"trusted request subject is required for app runtime\",\s*"
    r"\)\),\s*"
    r"\)\s*\.into_response\(\)\),\s*"
    r"\}\s*"
    r"\}",
    re.DOTALL,
)

PAYMENT_MATCH = re.compile(
    r"let subject = match TrustedRequestSubject::from_headers\(&headers\) \{\s*"
    r"Ok\(subject\) => subject,\s*"
    r"Err\(error\) => return unauthorized\(error\.to_string\(\)\),\s*"
    r"\};\n",
    re.DOTALL,
)


def fix_imports(text: str) -> str:
    text = re.sub(
        r"\{Extensions, HeaderMap\}, ([^}]+)\}",
        r"{Extensions, HeaderMap, \1}",
        text,
    )
    return text


def migrate_admin_resolve(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        target, struct_name = m.group(1), m.group(2)
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

    text = ADMIN_RESOLVE.sub(repl, text)
    text = text.replace(
        "let subject = match resolve_subject(&headers) {\n"
        "        Ok(subject) => subject,\n"
        "        Err(response) => return response,\n"
        "    };",
        "let subject = map_subject(subject);",
    )
    text = re.sub(
        r"(async fn \w+\(\n\s*State\([^\n]+\n)\s*headers: HeaderMap,",
        r"\1    subject: TrustedRequestSubject,",
        text,
    )
    return text


def migrate_admin_dashboard(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        query_type, wrapper, subject_type = m.group(1), m.group(2), m.group(3)
        return (
            f"fn dashboard_query_from_subject(subject: TrustedRequestSubject) -> {query_type} {{\n"
            f"    {wrapper} {{\n"
            f"        subject: {subject_type} {{\n"
            f"            tenant_id: subject.tenant_id,\n"
            f"            organization_id: subject.organization_id,\n"
            f"            operator_id: subject.operator_id,\n"
            f"            operator_type: subject.operator_type,\n"
            f"        }},\n"
            f"    }}\n"
            f"}}"
        )

    text = ADMIN_DASHBOARD.sub(repl, text)
    text = text.replace(
        "let query = match dashboard_query_from_headers(&headers) {\n"
        "        Ok(query) => query,\n"
        "        Err(response) => return response,\n"
        "    };",
        "let query = dashboard_query_from_subject(subject);",
    )
    text = re.sub(
        r"(async fn fetch_admin_dashboard_overview\(\n\s*State\([^\n]+\n)\s*headers: HeaderMap,",
        r"\1    subject: TrustedRequestSubject,",
        text,
    )
    return text


def migrate_require_admin(text: str) -> str:
    text = REQUIRE_ADMIN.sub("", text)
    text = re.sub(
        r"let subject = match require_admin_subject\(&headers\) \{\s*"
        r"Ok\(subject\) => subject,\s*"
        r"Err\(response\) => return response,\s*"
        r"\};\n",
        "",
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r"(async fn \w+\(\n\s*State\([^\n]+\n)\s*headers: HeaderMap,",
        r"\1    subject: TrustedRequestSubject,",
        text,
    )
    return text


def migrate_app_optional(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        fn, typ = m.group(1), m.group(2)
        return (
            f"fn {fn}(\n"
            f"    subject: Option<TrustedRequestSubject>,\n"
            f"    require_subject: bool,\n"
            f") -> Result<Option<{typ}>, Response> {{\n"
            f"    crate::api::subject::map_optional_subject(subject, require_subject, |subject| {typ} {{\n"
            f"        tenant_id: subject.tenant_id,\n"
            f"        organization_id: subject.organization_id,\n"
            f"        user_id: subject.user_id,\n"
            f"    }})\n"
            f"}}"
        )

    text = APP_OPTIONAL.sub(repl, text)
    text = re.sub(
        r"let subject = match (\w+)\(&headers, ([^)]+)\) \{",
        r"let subject = match \1(subject, \2) {",
        text,
    )
    text = re.sub(
        r"(async fn \w+\(\n\s*State\(state\): State<[^>]+>,\n)\s*headers: HeaderMap,",
        r"\1    subject: Option<TrustedRequestSubject>,\n",
        text,
    )
    return text


def migrate_app_runtime(text: str) -> str:
    text = APP_RUNTIME_REQUIRED.sub(
        "fn map_runtime_subject(subject: TrustedRequestSubject) -> AppRuntimeSubject {\n"
        "    AppRuntimeSubject {\n"
        "        tenant_id: subject.tenant_id,\n"
        "        organization_id: subject.organization_id,\n"
        "        user_id: subject.user_id,\n"
        "    }\n"
        "}",
        text,
    )
    text = text.replace(
        "required_subject(&state, &headers)",
        "map_runtime_subject(subject)",
    )
    text = re.sub(
        r"let subject = match map_runtime_subject\(subject\) \{",
        "let subject = map_runtime_subject(subject);\n    let query = match",
        text,
    )
    # handlers that called required_subject - need subject extractor
    text = re.sub(
        r"let subject = match required_subject\(&state, &headers\) \{",
        "let subject = map_runtime_subject(subject);\n    let _legacy = match",
        text,
    )
    return text


def migrate_payment(text: str) -> str:
    text = PAYMENT_MATCH.sub("", text)
    text = re.sub(
        r"(async fn \w+\(\n\s*State\([^\n]+\n)\s*headers: HeaderMap,",
        r"\1    subject: TrustedRequestSubject,\n\1    headers: HeaderMap,",
        text,
    )
    return text


def migrate_remaining_from_headers(text: str) -> str:
    if "TrustedRequestSubject::from_headers" not in text:
        return text
    if "use axum::http::{Extensions, HeaderMap" not in text and "Extensions" not in text:
        text = text.replace(
            "use axum::http::HeaderMap",
            "use axum::http::{Extensions, HeaderMap}",
            1,
        )
        text = text.replace(
            "use axum::http::{HeaderMap",
            "use axum::http::{Extensions, HeaderMap",
            1,
        )
    text = text.replace(
        "TrustedRequestSubject::from_headers(headers)",
        "crate::api::subject::resolve_required_compatible(headers, extensions)?",
    )
    text = text.replace(
        "TrustedRequestSubject::from_headers(&headers)",
        "crate::api::subject::resolve_required_compatible(&headers, &extensions)?",
    )
    text = re.sub(
        r"(async fn \w+\([\s\S]*?)(\n\s*headers: HeaderMap,)",
        r"\1\n    extensions: Extensions,\2",
        text,
        count=1,
    )
    return text


def migrate_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "TrustedRequestSubject::from_headers" not in text:
        return False
    original = text
    text = migrate_admin_resolve(text)
    text = migrate_admin_dashboard(text)
    text = migrate_require_admin(text)
    text = migrate_app_optional(text)
    if path.name == "app_runtime.rs":
        text = migrate_app_runtime(text)
    if path.name == "payment_aggregate.rs":
        text = migrate_payment(text)
    text = migrate_remaining_from_headers(text)
    text = fix_imports(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    changed = [p.name for p in sorted(API_DIR.glob("*.rs")) if p.name not in SKIP and migrate_file(p)]
    print(f"migrated {len(changed)} files")
    for name in changed:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
