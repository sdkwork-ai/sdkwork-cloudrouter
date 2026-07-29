from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyYAML is required") from exc

ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY_PATH = ROOT / "docs/schema-registry/sdkwork-clawrouter.tables.yaml"
TABLE_REGISTRY_PATH = ROOT / "database/contract/table-registry.json"
SCHEMA_CONTRACT_PATH = ROOT / "database/contract/schema.yaml"
BASELINE_PATH = ROOT / "database/ddl/baseline/postgres/0001_clawrouter_baseline.sql"

# Tables owned by sdkwork-kernel / sdkwork-agent (router must not generate DDL).
KERNEL_RUNTIME_TABLES = {
    "ai_agent",
    "ai_agent_run",
    "ai_agent_run_step",
    "ai_agent_session",
    "ai_chat_conversation",
    "ai_chat_turn",
    "ai_chat_item",
    "ai_chat_message",
    "ai_chat_message_part",
    "ai_chat_context_snapshot",
    "ai_mcp_server",
    "ai_mcp_server_revision",
    "ai_mcp_tool",
    "ai_mcp_binding",
    "ai_runtime_invocation",
    "ai_runtime_invocation_event",
    "ai_runtime_usage_link",
    "ai_runtime_artifact",
    "ai_prompt",
    "ai_prompt_version",
    "ai_prompt_binding",
}

# Notification SoR is owned by sdkwork-appbase-messaging.
MESSAGING_TABLES = {
    "ops_notification_message",
    "ops_notification_recipient",
    "ops_notification_delivery",
}

# Model catalog dictionary is owned by sdkwork-models (composed at install time).
MODELS_CATALOG_TABLES = {
    "ai_model_vendor",
    "ai_modality",
    "ai_api_endpoint",
    "ai_vendor_modality",
    "ai_vendor_api_endpoint",
    "ai_modality_api_endpoint",
    "ai_model_modality",
    "ai_model_api_endpoint",
    "ai_resource",
    "ai_resource_group",
    "ai_resource_group_item",
    "ai_model_family",
    "ai_model",
    "ai_model_capability",
    "ai_model_catalog_source",
    "ai_model_catalog_sync_run",
    "ai_billing_meter",
    "ai_model_pricing",
    "ai_model_rank_snapshot",
}

PRUNE_TABLES = KERNEL_RUNTIME_TABLES | MESSAGING_TABLES | MODELS_CATALOG_TABLES


def load_tables(path: Path) -> list[dict]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    tables = payload.get("tables") or []
    return [table for table in tables if isinstance(table, dict)]


def dump_tables(path: Path, tables: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump({"tables": tables}, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def prune_fragment(rel: str) -> tuple[int, int]:
    path = ROOT / "docs/schema-registry" / rel
    if not path.is_file():
        return 0, 0
    before = load_tables(path)
    kept = [table for table in before if table.get("table") not in PRUNE_TABLES]
    removed = len(before) - len(kept)
    if removed:
        dump_tables(path, kept)
    return removed, len(kept)


def update_assembly_guardrails(assembly: dict) -> None:
    schema = assembly.setdefault("schema_registry", {})
    guard = schema.setdefault("legacy_compatibility_guardrails", {})
    guard["rule"] = (
        "Claw-router generated ownership is limited to gateway routing, metering, pricing, "
        "upstream suppliers, accounts, account groups, commerce usage projections, gateway IAM extensions, "
        "ops telemetry, and system installation metadata. Agent/chat/MCP/runtime/prompt tables "
        "are owned by sdkwork-kernel. Model catalog dictionary tables are owned by sdkwork-models "
        "and composed at install time. Notification tables are owned by sdkwork-appbase-messaging. "
        "IAM base, verification, commerce, promotion, messaging, appstore, and drive tables are "
        "external sibling modules and must not be generated in claw-router schema.sql."
    )
    guard["allowed_projection_exception"] = (
        "Router-owned commerce_usage_* tables may only add usage settlement, statement, export, "
        "and analytics projections. c_category remains a transitional appstore-aligned classification "
        "projection until sdkwork-appstore publishes canonical DDL."
    )
    assembly["registry_dependencies"] = [
        {
            "module_id": "appbase-iam",
            "locator": "../sdkwork-appbase",
            "registry_path": "docs/schema-registry/appbase-iam.tables.yaml",
            "order": 10,
            "ownership": "read_only",
        },
        {
            "module_id": "appbase-messaging",
            "locator": "../sdkwork-appbase",
            "registry_path": "docs/schema-registry/appbase-messaging.tables.yaml",
            "order": 12,
            "ownership": "read_only",
        },
        {
            "module_id": "appstore",
            "locator": "../sdkwork-appstore",
            "registry_path": "docs/schema-registry/appstore.tables.yaml",
            "order": 30,
            "ownership": "read_only",
        },
        {
            "module_id": "sdkwork-models",
            "locator": "../sdkwork-models",
            "registry_path": "docs/schema-registry/sdkwork-models.tables.yaml",
            "order": 35,
            "ownership": "compose_at_install",
        },
    ]


def sync_contract_artifacts(table_names: list[str]) -> None:
    table_names = sorted(set(table_names))
    TABLE_REGISTRY_PATH.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "kind": "sdkwork.database.table-registry",
                "tables": [
                    {
                        "table_name": name,
                        "owner": "claw-router-platform",
                        "compliance_level": "L2",
                        "lifecycle_status": "active",
                    }
                    for name in table_names
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    SCHEMA_CONTRACT_PATH.write_text(
        yaml.safe_dump(
            {
                "schema_version": 1,
                "kind": "sdkwork.database.schema",
                "module_id": "clawrouter",
                "contract_version": "1.0.0",
                "owner_team": "claw-router-platform",
                "compliance_level": "L2",
                "engines": ["postgres"],
                "table_prefix": "ai_",
                "tables": [
                    {
                        "name": name,
                        "lifecycle_status": "active",
                        "owner": "claw-router-platform",
                    }
                    for name in table_names
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )


def copy_generated_baseline(postgres_sql: str) -> None:
    BASELINE_PATH.write_text(postgres_sql if postgres_sql.endswith("\n") else postgres_sql + "\n", encoding="utf-8")


def main() -> None:
    assembly = yaml.safe_load(ASSEMBLY_PATH.read_text(encoding="utf-8"))
    fragments = list(assembly.get("table_fragments") or [])
    removed_total = 0
    for rel in fragments:
        removed, _kept = prune_fragment(rel)
        removed_total += removed
        if removed:
            print(f"pruned {removed} tables from {rel}")

    update_assembly_guardrails(assembly)
    ASSEMBLY_PATH.write_text(
        yaml.safe_dump(assembly, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )

    import subprocess

    from tools.schema_compiler import SchemaCompiler
    from tools.schema_manifest import SchemaManifestGenerator

    compiler = SchemaCompiler(root=ROOT)
    postgres_sql = compiler.compile_postgres()
    compiler.write_postgres()
    copy_generated_baseline(postgres_sql)
    manifest = SchemaManifestGenerator(root=ROOT).generate()
    generated_tables = [
        table["table"]
        for table in manifest.get("tables", [])
        if isinstance(table, dict)
        and table.get("generated_by_this_project")
        and isinstance(table.get("table"), str)
    ]
    sync_contract_artifacts(generated_tables)

    subprocess.run(
        [sys.executable, "-B", "-m", "tools.schema_table_catalog"],
        cwd=ROOT,
        check=False,
    )

    print(f"removed from fragments: {removed_total}")
    print(f"generated claw-router tables: {len(generated_tables)}")


if __name__ == "__main__":
    main()
