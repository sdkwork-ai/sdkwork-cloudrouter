#!/usr/bin/env python3
"""Fix optional subject helpers after from_headers migration."""

from __future__ import annotations

import re
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"

OPTIONAL_MATCH = re.compile(
    r"match crate::api::subject::optional_trusted_subject\(([^)]+)\) \{\s*"
    r"Ok\(subject\) => Ok\(Some\(([^)]+)\) \{\s*"
    r"([\s\S]*?)"
    r"\}\)\),\s*"
    r"Err\(error\) if require_subject => Err\(\(\s*"
    r"StatusCode::UNAUTHORIZED,\s*"
    r"Json\(PlusApiResult(?:::[^)]*)?::error\(\"4010\", error\.to_string\(\)\)\),\s*"
    r"\)\s*\.into_response\(\)\),\s*"
    r"Err\(_\) => Ok\(None\),\s*"
    r"\}",
    re.MULTILINE,
)


def fix_optional_match(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        args = match.group(1)
        struct_name = match.group(2)
        fields = match.group(3)
        return (
            "match crate::api::subject::optional_trusted_subject("
            f"{args}) {{\n"
            f"        Some(subject) => Ok(Some({struct_name} {{\n"
            f"{fields}"
            f"        }})),\n"
            "        None if require_subject => Err(crate::api::subject::unauthorized_subject_response()),\n"
            "        None => Ok(None),\n"
            "    }"
        )

    return OPTIONAL_MATCH.sub(repl, text)


def fix_app_handlers_with_optional_state(text: str) -> str:
    if "require_subject: bool" not in text:
        return text
    # handlers wrongly given required subject extractor while using header helpers
    text = re.sub(
        r"(async fn \w+\(\n\s*State\(state\): State<[^>]+>,\n)\s*subject: TrustedRequestSubject,\n",
        r"\1    subject: Option<TrustedRequestSubject>,\n",
        text,
    )
    text = re.sub(
        r"gateway_traces_subject\(&headers, state\.require_subject\)",
        r"gateway_traces_subject(subject, state.require_subject)",
        text,
    )
    text = re.sub(
        r"require_subject\(&headers,([^)]+)\)",
        r"require_subject(subject\1)",
        text,
    )
    text = re.sub(
        r"fn gateway_traces_subject\(\s*headers: &HeaderMap,\s*require_subject: bool,",
        r"fn gateway_traces_subject(\n    subject: Option<TrustedRequestSubject>,\n    require_subject: bool,",
        text,
    )
    text = re.sub(
        r"fn require_subject\(\s*headers: &HeaderMap,\s*require_subject: bool,",
        r"fn require_subject(\n    subject: Option<TrustedRequestSubject>,\n    require_subject: bool,",
        text,
    )
    # generic optional helper still using headers/extensions
    text = re.sub(
        r"match crate::api::subject::optional_trusted_subject\(headers, extensions\) \{",
        r"match subject {",
        text,
    )
    text = re.sub(
        r"match crate::api::subject::optional_trusted_subject\(&headers, &extensions\) \{",
        r"match subject {",
        text,
    )
    text = re.sub(
        r"Some\(subject\) => Ok\(Some\((\w+) \{",
        r"Some(trusted) => Ok(Some(\1 {\n            tenant_id: trusted.tenant_id,\n            organization_id: trusted.organization_id,\n            user_id: trusted.user_id,\n        })),\n        None if require_subject => Err(crate::api::subject::unauthorized_subject_response()),\n        None => Ok(None),\n    }\n}\n\nfn __removed_duplicate__(\n    subject: Option<TrustedRequestSubject>,\n) -> Option<\1> {\n    subject.map(|trusted| \1 {",
        text,
        count=1,
    )
    return text


def simplify_optional_helpers(text: str) -> str:
    pattern = re.compile(
        r"fn (\w+)\(\s*headers: &HeaderMap, extensions: &Extensions, require_subject: bool,\s*\)"
        r" -> Result<Option<(\w+)>, Response> \{\s*"
        r"match crate::api::subject::optional_trusted_subject\(headers, extensions\) \{\s*"
        r"Some\(subject\) => Ok\(Some\(\2 \{([\s\S]*?)\}\)\),\s*"
        r"None if require_subject => Err\(crate::api::subject::unauthorized_subject_response\(\)\),\s*"
        r"None => Ok\(None\),\s*"
        r"\}\s*"
        r"\}",
        re.MULTILINE,
    )

    def repl(match: re.Match[str]) -> str:
        fn = match.group(1)
        typ = match.group(2)
        fields = match.group(3)
        return (
            f"fn {fn}(\n"
            f"    subject: Option<TrustedRequestSubject>,\n"
            f"    require_subject: bool,\n"
            f") -> Result<Option<{typ}>, Response> {{\n"
            f"    match subject {{\n"
            f"        Some(subject) => Ok(Some({typ} {{{fields}}})),\n"
            f"        None if require_subject => Err(crate::api::subject::unauthorized_subject_response()),\n"
            f"        None => Ok(None),\n"
            f"    }}\n"
            f"}}"
        )

    text = pattern.sub(repl, text)

    pattern2 = re.compile(
        r"fn (\w+)\(\s*subject: Option<TrustedRequestSubject>,\s*headers: &HeaderMap, extensions: &Extensions, require_subject: bool,\s*\)"
        r" -> Result<Option<(\w+)>, Response> \{\s*"
        r"match subject \{\s*"
        r"Some\(subject\) => Ok\(Some\(\2 \{([\s\S]*?)\}\)\),\s*"
        r"None => match crate::api::subject::optional_trusted_subject\(headers, extensions\) \{([\s\S]*?)\n    \}\s*"
        r"\}\s*"
        r"\}",
        re.MULTILINE,
    )

    def repl2(match: re.Match[str]) -> str:
        fn = match.group(1)
        typ = match.group(2)
        fields = match.group(3)
        return (
            f"fn {fn}(\n"
            f"    subject: Option<TrustedRequestSubject>,\n"
            f"    require_subject: bool,\n"
            f") -> Result<Option<{typ}>, Response> {{\n"
            f"    match subject {{\n"
            f"        Some(subject) => Ok(Some({typ} {{{fields}}})),\n"
            f"        None if require_subject => Err(crate::api::subject::unauthorized_subject_response()),\n"
            f"        None => Ok(None),\n"
            f"    }}\n"
            f"}}"
        )

    return pattern2.sub(repl2, text)


def fix_handler_calls(text: str) -> str:
    text = re.sub(
        r"(\w+_subject|require_subject)\(&headers, &extensions, ([^)]+)\)",
        r"\1(subject, \2)",
        text,
    )
    text = re.sub(
        r"(\w+_subject|require_subject)\(&headers, ([^)]+)\)",
        r"\1(subject, \2)",
        text,
    )
    text = re.sub(
        r"required_subject\(&state, &headers, &extensions\)",
        r"required_subject(&state, subject)",
        text,
    )
    text = re.sub(
        r"required_subject\(&state, &headers\)",
        r"required_subject(&state, subject)",
        text,
    )
    text = re.sub(
        r"notification_subject\(subject, &headers, &extensions,",
        r"notification_subject(subject,",
        text,
    )
    return text


def fix_app_runtime_required_subject(text: str) -> str:
    text = re.sub(
        r"fn required_subject\(\s*state: &AppRuntimeState,\s*headers: &HeaderMap, extensions: &Extensions,\s*\)"
        r" -> Result<AppRuntimeSubject, Response> \{\s*"
        r"match crate::api::subject::optional_trusted_subject\(headers, extensions\) \{([\s\S]*?)\n\}",
        r"fn required_subject(\n    state: &AppRuntimeState,\n    subject: Option<TrustedRequestSubject>,\n) -> Result<AppRuntimeSubject, Response> {\n    match subject {\1\n    }",
        text,
        count=1,
    )
    return text


def main() -> int:
    for path in sorted(API_DIR.glob("*.rs")):
        text = path.read_text(encoding="utf-8")
        original = text
        text = fix_optional_match(text)
        text = simplify_optional_helpers(text)
        text = fix_handler_calls(text)
        text = fix_app_runtime_required_subject(text)
        if text != original:
            path.write_text(text, encoding="utf-8")
            print(path.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
