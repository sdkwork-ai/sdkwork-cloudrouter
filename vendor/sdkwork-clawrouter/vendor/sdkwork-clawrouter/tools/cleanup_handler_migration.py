#!/usr/bin/env python3
"""Cleanup leftover header-based subject parsing after extractor migration."""

from __future__ import annotations

import re
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"


def cleanup(text: str) -> str:
    text = re.sub(
        r"    headers: HeaderMap,\n    subject: TrustedRequestSubject,\n",
        "    subject: TrustedRequestSubject,\n",
        text,
    )
    text = re.sub(
        r"if let Err\(response\) = require_admin_subject\(&headers\) \{\n        return response;\n    \}\n",
        "",
        text,
    )
    text = re.sub(
        r"let subject = match required_subject\(&state, &headers\) \{\n        Ok\(subject\) => subject,\n        Err\(response\) => return response,\n    \};",
        "let subject = required_subject(&state, Some(subject))?;",
        text,
    )
    text = text.replace(
        "fn required_subject(\n    state: &AppAgentRegistryState,\n    headers: &HeaderMap,\n)",
        "fn required_subject(\n    state: &AppAgentRegistryState,\n    subject: Option<TrustedRequestSubject>,\n)",
    )
    text = re.sub(
        r"match TrustedRequestSubject::from_headers\(headers\) \{",
        "match subject {",
        text,
    )
    text = re.sub(
        r"Ok\(subject\) => Ok\(AppAgentRegistrySubject \{",
        "Some(subject) => Ok(AppAgentRegistrySubject {",
        text,
    )
    text = re.sub(
        r"Err\(error\) if state\.require_subject =>",
        "None if state.require_subject =>",
        text,
    )
    text = re.sub(
        r"Err\(_\) => Err\(",
        "None => Err(",
        text,
        count=1,
    )
    text = text.replace(
        "async fn list_agents(\n    State(state): State<AppAgentRegistryState>,\n    subject: TrustedRequestSubject,",
        "async fn list_agents(\n    State(state): State<AppAgentRegistryState>,\n    subject: Option<TrustedRequestSubject>,",
    )
    text = text.replace(
        "async fn get_agent(\n    State(state): State<AppAgentRegistryState>,\n    subject: TrustedRequestSubject,",
        "async fn get_agent(\n    State(state): State<AppAgentRegistryState>,\n    subject: Option<TrustedRequestSubject>,",
    )
    text = text.replace(
        "async fn create_agent(\n    State(state): State<AppAgentRegistryState>,\n    subject: TrustedRequestSubject,",
        "async fn create_agent(\n    State(state): State<AppAgentRegistryState>,\n    subject: Option<TrustedRequestSubject>,",
    )
    text = re.sub(
        r"fn require_admin_subject\(headers: &HeaderMap\) -> Result<TrustedRequestSubject, Response> \{[\s\S]*?\n\}\n",
        "",
        text,
    )
    for path_name in (
        "fetch_overview",
        "refresh_all",
        "refresh_instance",
        "delete_instance",
        "delete_namespace",
        "refresh_namespace",
        "list_namespace_keys",
        "delete_key",
    ):
        text = text.replace(
            f"async fn {path_name}(State(state): State<AdminCacheState>, headers: HeaderMap)",
            f"async fn {path_name}(State(state): State<AdminCacheState>, _subject: TrustedRequestSubject)",
        )
        text = text.replace(
            f"async fn {path_name}(\n    State(state): State<AdminCacheState>,\n    headers: HeaderMap,\n    subject: TrustedRequestSubject,",
            f"async fn {path_name}(\n    State(state): State<AdminCacheState>,\n    _subject: TrustedRequestSubject,",
        )
    text = text.replace("resolve_subject(headers)?", "resolve_subject(subject)")
    text = text.replace("resolve_subject(&headers)?", "resolve_subject(subject)")
    text = text.replace("subject: resolve_subject(headers)?,", "subject: resolve_subject(subject),")
    return text


def main() -> int:
    for path in sorted(API_DIR.glob("*.rs")):
        original = path.read_text(encoding="utf-8")
        updated = cleanup(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="\n")
            print(path.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
