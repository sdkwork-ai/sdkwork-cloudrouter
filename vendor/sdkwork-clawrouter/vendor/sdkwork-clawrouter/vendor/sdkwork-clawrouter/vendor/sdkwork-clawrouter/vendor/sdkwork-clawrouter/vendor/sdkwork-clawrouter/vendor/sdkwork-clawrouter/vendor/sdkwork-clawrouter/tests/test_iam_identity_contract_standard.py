from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]
BUSINESS_ROOT = ROOT.parent.parent
APPBASE_ROOT = ROOT / ".sdkwork" / "dependencies" / "sdkwork-appbase"
SCHEMA_REGISTRY = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
FRONTEND_FIELD_CONTRACTS = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"

FORBIDDEN_LEGACY_IDENTITY_TABLES = {
    "plus_user",
    "plus_oauth_account",
    "plus_role",
    "plus_user_role",
    "plus_tenant",
    "plus_organization",
    "plus_organization_member",
    "plus_permission",
    "plus_role_permission",
    "plus_api_key",
}

FORBIDDEN_LEGACY_IDENTITY_COMPONENT_TYPES = {
    "PlusApiKeyRecord",
    "PlusOauthAccountRecord",
    "PlusOrganizationMemberRecord",
    "PlusOrganizationRecord",
    "PlusPermissionRecord",
    "PlusRolePermissionRecord",
    "PlusRoleRecord",
    "PlusTenantRecord",
    "PlusUserRecord",
    "PlusUserRoleRecord",
}

SOURCE_LIST_KEYS = {
    "data_sources",
    "read_sources",
    "write_tables",
    "required_tables",
    "source_tables",
    "does_not_replace",
}

JAVA_CANONICAL_SOURCE_ROOTS = [
    BUSINESS_ROOT / "legacy-java-plus-entity" / "src" / "main" / "java",
    BUSINESS_ROOT / "legacy-java-plus-backend-api" / "src" / "main" / "java",
    BUSINESS_ROOT / "legacy-java-plus-app-api" / "src" / "main" / "java",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "src" / "main" / "java",
]
JAVA_BOOTSTRAP_CONTRACT_ROOTS = [
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "BOOTSTRAP_DATABASE_AUDIT.md",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "BOOTSTRAP_DATA_ARCHITECTURE.md",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "BOOTSTRAP_COMMERCIAL_INSTALL_RUNBOOK.md",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "BOOTSTRAP_FIRST_INSTALL_ENABLEMENT.md",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "BOOTSTRAP_SCHEMA_MIGRATION_INVENTORY.md",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "bin" / "spring-ai-plus-runtime-common.sh",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "src" / "main" / "resources" / "data" / "bootstrap",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "src" / "main" / "resources" / "database",
]

CLAW_APP_API_DATABASE_FIXTURE = ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "database_config_router.rs"
APPBASE_TAURI_AUTHORITY = (
    APPBASE_ROOT
    / "packages"
    / "pc-react"
    / "iam"
    / "sdkwork-user-center-core-pc-react"
    / "native"
    / "tauri-rust"
    / "src"
    / "user_center_authority.rs"
)
GENERATED_CONTRACT_ARTIFACTS = [
    ROOT / "generated" / "openapi" / "schema-components.yaml",
    ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json",
    ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json",
    ROOT / "generated" / "api" / "api-contract-manifest.json",
    ROOT / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.openapi.json",
    ROOT / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.sdkgen.json",
    ROOT / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.openapi.json",
    ROOT / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.sdkgen.json",
]
GENERATED_SDK_ARTIFACT_ROOTS = [
    ROOT / "sdks" / "clawrouter-app-sdk",
    ROOT / "sdks" / "clawrouter-backend-sdk",
]

FORBIDDEN_LEGACY_IDENTITY_JAVA_TYPE_PATTERN = re.compile(
    r"\b(?:class|interface|record|enum)\s+("
    r"PlusUser(?:OAuthAccount|Profile)?(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO)?"
    r"|PlusTenant(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO|Manager|ManagerImpl|DataInitializer|AuditLogItem|QueryListForm)?"
    r"|PlusOrganization(?:Member)?(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO|Manager|ManagerImpl|DataInitializer|TopologyDataInitializer)?"
    r"|PlusRole(?:Permission)?(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO)?"
    r"|PlusUserRole(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO)?"
    r"|PlusPermission(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO)?"
    r"|PlusApiKey(?:Repository|Service|ServiceImpl|Controller|Form|DTO|VO|Manager|ManagerImpl|SelfCreateForm|SelfUpdateForm)?"
    r"|PlusRBACDataInitializer"
    r"|PlusUserOAuthAccountTokenRefreshTask"
    r")\b"
)

JAVA_IDENTITY_TYPE_SOURCE_ROOTS = [
    BUSINESS_ROOT / "legacy-java-plus-entity" / "src" / "main" / "java",
    BUSINESS_ROOT / "legacy-java-plus-repository" / "src" / "main" / "java",
    BUSINESS_ROOT / "legacy-java-plus-service" / "src" / "main" / "java",
    BUSINESS_ROOT / "legacy-java-plus-backend-api" / "src" / "main" / "java",
    BUSINESS_ROOT / "spring-ai-plus-server-application" / "src" / "main" / "java",
]


def load_yaml(path: Path) -> dict[str, Any]:
    if path == SCHEMA_REGISTRY:
        return load_schema_registry(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def walk_values(value: Any) -> list[Any]:
    values = [value]
    if isinstance(value, dict):
        for child in value.values():
            values.extend(walk_values(child))
    elif isinstance(value, list):
        for child in value:
            values.extend(walk_values(child))
    return values


def collect_source_list_violations(value: Any, path: str = "$") -> list[str]:
    violations: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in SOURCE_LIST_KEYS and isinstance(child, list):
                forbidden = sorted(
                    item for item in child if isinstance(item, str) and item in FORBIDDEN_LEGACY_IDENTITY_TABLES
                )
                if forbidden:
                    violations.append(f"{child_path}: {', '.join(forbidden)}")
            violations.extend(collect_source_list_violations(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            violations.extend(collect_source_list_violations(child, f"{path}[{index}]"))
    return violations


def collect_legacy_identity_text_violations(
    paths: list[Path],
    suffixes: set[str] | None = None,
) -> list[str]:
    violations: list[str] = []
    allowed_suffixes = suffixes or {".java", ".rs", ".sql", ".xml"}
    table_pattern = re.compile(
        r"(?<![A-Za-z0-9_])("
        + "|".join(re.escape(table_name) for table_name in sorted(FORBIDDEN_LEGACY_IDENTITY_TABLES))
        + r")(?![A-Za-z0-9_])"
    )
    for root in paths:
        if not root.exists():
            continue
        candidates = [root] if root.is_file() else sorted(root.rglob("*"))
        for path in candidates:
            if path.suffix not in allowed_suffixes:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                text = path.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(text.splitlines(), start=1):
                for match in table_pattern.finditer(line):
                    violations.append(f"{path.relative_to(BUSINESS_ROOT)}:{line_number}: {match.group(1)}")
    return violations


def collect_legacy_identity_java_type_violations(paths: list[Path]) -> list[str]:
    violations: list[str] = []
    for root in paths:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.java")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(text.splitlines(), start=1):
                match = FORBIDDEN_LEGACY_IDENTITY_JAVA_TYPE_PATTERN.search(line)
                if match:
                    violations.append(f"{path.relative_to(BUSINESS_ROOT)}:{line_number}: {match.group(1)}")
    return violations


def collect_legacy_identity_component_type_violations(
    paths: list[Path],
    forbidden_type_names: set[str],
    suffixes: set[str] | None = None,
) -> list[str]:
    violations: list[str] = []
    allowed_suffixes = suffixes or {
        ".cs",
        ".dart",
        ".go",
        ".java",
        ".json",
        ".kt",
        ".md",
        ".py",
        ".rs",
        ".swift",
        ".ts",
        ".yaml",
        ".yml",
    }
    type_pattern = re.compile(
        r"(?<![A-Za-z0-9_])("
        + "|".join(re.escape(type_name) for type_name in sorted(forbidden_type_names))
        + r")(?![A-Za-z0-9_])"
    )
    for root in paths:
        if not root.exists():
            continue
        candidates = [root] if root.is_file() else sorted(root.rglob("*"))
        for path in candidates:
            if path.suffix not in allowed_suffixes:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                text = path.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(text.splitlines(), start=1):
                for match in type_pattern.finditer(line):
                    violations.append(f"{path.relative_to(ROOT)}:{line_number}: {match.group(1)}")
    return violations


def test_schema_registry_does_not_define_legacy_identity_tables() -> None:
    registry = load_yaml(SCHEMA_REGISTRY)
    table_names = {
        table["table"]
        for table in registry.get("tables", [])
        if isinstance(table, dict) and isinstance(table.get("table"), str)
    }

    forbidden = sorted(table_names & FORBIDDEN_LEGACY_IDENTITY_TABLES)

    assert not forbidden, "legacy identity tables must be removed from registry: " + ", ".join(forbidden)


def test_schema_registry_business_user_tables_reference_iam_user() -> None:
    registry = load_yaml(SCHEMA_REGISTRY)
    violations: list[str] = []
    for table in registry.get("tables", []):
        if not isinstance(table, dict) or not isinstance(table.get("table"), str):
            continue
        for foreign_key in table.get("foreign_keys", []) or []:
            if not isinstance(foreign_key, dict):
                continue
            references_table = foreign_key.get("references_table")
            if references_table in FORBIDDEN_LEGACY_IDENTITY_TABLES:
                violations.append(f"{table['table']}.{foreign_key.get('name')} references {references_table}")

    assert not violations, "foreign keys must target canonical iam_* identity tables: " + "; ".join(violations)


def test_schema_registry_projection_sources_use_canonical_identity_tables() -> None:
    registry = load_yaml(SCHEMA_REGISTRY)
    violations = collect_source_list_violations(registry)

    assert not violations, "registry source lists must not use legacy identity tables: " + "; ".join(violations)


def test_frontend_field_contracts_use_canonical_identity_sources() -> None:
    contracts = load_yaml(FRONTEND_FIELD_CONTRACTS)
    violations = collect_source_list_violations(contracts)

    assert not violations, "frontend field contracts must not use legacy identity tables: " + "; ".join(violations)


def test_java_api_entity_sources_do_not_describe_legacy_identity_tables() -> None:
    violations = collect_legacy_identity_text_violations(JAVA_CANONICAL_SOURCE_ROOTS)

    assert not violations, "Java API/entity source must describe canonical iam_* identity tables: " + "; ".join(violations)


def test_java_bootstrap_contracts_do_not_describe_legacy_identity_tables() -> None:
    violations = collect_legacy_identity_text_violations(
        JAVA_BOOTSTRAP_CONTRACT_ROOTS,
        {".java", ".json", ".md", ".sh", ".sql", ".xml"},
    )

    assert not violations, "Java bootstrap contracts must describe canonical iam_* identity tables: " + "; ".join(violations)


def test_java_identity_domain_declares_canonical_iam_types() -> None:
    violations = collect_legacy_identity_java_type_violations(JAVA_IDENTITY_TYPE_SOURCE_ROOTS)

    assert not violations, "Java identity domain must declare canonical Iam* types: " + "; ".join(violations)


def test_claw_app_api_database_fixture_uses_canonical_identity_tables() -> None:
    text = CLAW_APP_API_DATABASE_FIXTURE.read_text(encoding="utf-8")
    forbidden = sorted(
        table_name
        for table_name in FORBIDDEN_LEGACY_IDENTITY_TABLES
        if re.search(rf"(?<![A-Za-z0-9_]){re.escape(table_name)}(?![A-Za-z0-9_])", text)
    )

    assert not forbidden, "claw app-api database fixture must not create or seed legacy identity tables: " + ", ".join(forbidden)


def test_appbase_tauri_user_center_schema_uses_canonical_api_key_table() -> None:
    text = APPBASE_TAURI_AUTHORITY.read_text(encoding="utf-8")

    assert "plus_api_key" not in text, "appbase Tauri user center authority must not create legacy plus_api_key"
    assert "CREATE TABLE IF NOT EXISTS iam_api_key" in text
    assert "idx_iam_api_key_tenant_user_status" in text


def test_generated_api_contract_artifacts_do_not_publish_legacy_identity_tables() -> None:
    table_pattern = re.compile(
        r"(?<![A-Za-z0-9_])("
        + "|".join(re.escape(table_name) for table_name in sorted(FORBIDDEN_LEGACY_IDENTITY_TABLES))
        + r")(?![A-Za-z0-9_])"
    )
    violations: list[str] = []
    for path in GENERATED_CONTRACT_ARTIFACTS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for match in table_pattern.finditer(line):
                violations.append(f"{path.relative_to(ROOT)}:{line_number}: {match.group(1)}")

    assert not violations, "generated OpenAPI/SDK contracts must not publish legacy identity tables: " + "; ".join(violations)


def test_generated_sdk_artifacts_do_not_publish_legacy_identity_type_names() -> None:
    violations = collect_legacy_identity_component_type_violations(
        GENERATED_SDK_ARTIFACT_ROOTS,
        FORBIDDEN_LEGACY_IDENTITY_COMPONENT_TYPES,
    )

    assert not violations, (
        "generated SDK artifacts must publish canonical Iam* names for core identity models: " + "; ".join(violations)
    )
