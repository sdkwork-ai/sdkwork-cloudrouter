#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GUARDS_APP = '''
fn is_skills_dependency_contract_path(path: &str) -> bool {
    const SKILLS_APP_PREFIXES: &[&str] = &[
        "/app/v3/api/ecosystem/skills/",
        "/app/v3/api/ecosystem/skills",
    ];
    SKILLS_APP_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}

fn is_agent_dependency_contract_path(path: &str) -> bool {
    const AGENT_APP_PREFIXES: &[&str] = &[
        "/app/v3/api/agents/",
        "/app/v3/api/agents",
    ];
    AGENT_APP_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}

fn is_appstore_dependency_contract_path(path: &str) -> bool {
    const APPSTORE_APP_PREFIXES: &[&str] = &[
        "/app/v3/api/platform/apps/",
        "/app/v3/api/platform/apps",
    ];
    APPSTORE_APP_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}
'''

GUARDS_BACKEND = '''
fn is_skills_dependency_contract_path(path: &str) -> bool {
    const SKILLS_BACKEND_PREFIXES: &[&str] = &[
        "/backend/v3/api/ecosystem/skills/",
        "/backend/v3/api/ecosystem/skills",
    ];
    SKILLS_BACKEND_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}

fn is_agent_dependency_contract_path(path: &str) -> bool {
    const AGENT_BACKEND_PREFIXES: &[&str] = &[
        "/backend/v3/api/agents/",
        "/backend/v3/api/agents",
    ];
    AGENT_BACKEND_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}
'''

DROP_LINE_RE = re.compile(
    r"(app_agent_|app_skills_|agent_store|skill_store|admin_agent_router|admin_skill_router|"
    r"app_agent_registry_router|app_agent_session_router|app_agent_run_router|app_skills_router|"
    r"app_store_read_store|app_store_router|course_application_command_store|"
    r"app_course_application_router|AppStoreRuntimeStore|CourseApplicationCommandRuntimeStore|"
    r"AppStoreReadStore|AdminAppRuntimeStore|AdminAppStore|PostgresAdminAppStore|SqliteAdminAppStore|"
    r"SqliteAppAgent|PostgresAppAgent|SqliteAppSkills|PostgresAppSkills|"
    r"PostgresAppStoreReadStore|SqliteAppStoreReadStore|"
    r"PostgresCourseApplicationCommandStore|SqliteCourseApplicationCommandStore|"
    r"AppAgentRegistryRuntimeStore|AppAgentSessionRuntimeStore|AppAgentRunRuntimeStore|"
    r"AppSkillsRuntimeStore|AppSkillsCommandRuntimeStore|"
    r"AppAgentRegistryStore|AppAgentSessionStore|AppAgentRunStore|AppSkillsCommandStore|AppSkillsReadStore|"
    r"AdminAgentRuntimeStore|AdminSkillRuntimeStore|AdminAgentStore|AdminSkillStore|"
    r"PostgresAdminAgentStore|SqliteAdminAgentStore|PostgresAdminSkillStore|SqliteAdminSkillStore)"
)

BLOCK_OPENERS = (
    "router = match app_agent_registry_store",
    "router = match app_agent_session_store",
    "router = match app_agent_run_store",
    "router = match app_store_read_store",
    "router = match app_skills_read_store",
    "if let Some(command_store) = course_application_command_store",
    "if let Some(store) = agent_store",
    "if let Some(store) = skill_store",
    "if let Some(store) = app_store",
)


def remove_block_from(text: str, opener: str) -> str:
    while True:
        idx = text.find(opener)
        if idx == -1:
            return text
        start = idx
        brace = text.find("{", idx)
        if brace == -1:
            return text[:start] + text[idx + len(opener) :]
        depth = 0
        i = brace
        while i < len(text):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                i += 1
                if depth == 0:
                    while i < len(text) and text[i] in "\r\n":
                        i += 1
                    text = text[:start] + text[i:]
                    break
            else:
                i += 1
        else:
            return text


def drop_lines(text: str) -> str:
    kept: list[str] = []
    for line in text.splitlines(keepends=True):
        if DROP_LINE_RE.search(line):
            continue
        kept.append(line)
    return "".join(kept)


def remove_fn(text: str, name: str) -> str:
    pattern = rf"\nfn {re.escape(name)}\b"
    match = re.search(pattern, text)
    if not match:
        return text
    start = match.start() + 1
    brace = text.find("{", match.end())
    depth = 0
    i = brace
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            i += 1
            if depth == 0:
                while i < len(text) and text[i] in "\r\n":
                    i += 1
                return text[:start] + text[i:]
        else:
            i += 1
    return text


def patch_contract_filters(text: str, surface: str) -> str:
    guards = GUARDS_APP if surface == "app" else GUARDS_BACKEND
    if "is_skills_dependency_contract_path" not in text:
        text = text.replace("fn is_appbase_dependency_contract_path", guards + "fn is_appbase_dependency_contract_path")
    extra = (
        "        && !is_skills_dependency_contract_path(&operation.path)\n"
        "        && !is_agent_dependency_contract_path(&operation.path)\n"
    )
    if surface == "app":
        extra += "        && !is_appstore_dependency_contract_path(&operation.path)\n"
    for anchor in (
        "        && !is_course_dependency_contract_path(&operation.path)\n}",
        "        && !is_messaging_dependency_contract_path(&operation.path)\n}",
    ):
        if anchor in text:
            return text.replace(anchor, anchor[:-2] + extra + "}")
    return text


def patch_app(text: str) -> str:
    text = re.sub(
        r"merge_app_sdk_reference_router\(\s*(router_with_database_status\([^\)]*\))\s*,\s*RequestLimitsConfig::default\(\)\s*\)",
        r"\1",
        text,
    )
    text = remove_fn(text, "merge_app_sdk_reference_router")
    for opener in BLOCK_OPENERS:
        text = remove_block_from(text, opener)
    text = drop_lines(text)
    return patch_contract_filters(text, "app")


def patch_backend(text: str) -> str:
    for opener in BLOCK_OPENERS[4:]:
        text = remove_block_from(text, opener)
    text = drop_lines(text)
    return patch_contract_filters(text, "backend")


def main() -> None:
    app_path = ROOT / "crates/sdkwork-routes-clawrouter-app-api/src/routes.rs"
    backend_path = ROOT / "crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs"
    app_path.write_text(patch_app(app_path.read_text(encoding="utf-8")), encoding="utf-8")
    backend_path.write_text(patch_backend(backend_path.read_text(encoding="utf-8")), encoding="utf-8")
    print("patched routes")


if __name__ == "__main__":
    main()
