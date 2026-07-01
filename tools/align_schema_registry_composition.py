from __future__ import annotations

import copy
import json
import re
from pathlib import Path

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyYAML is required") from exc

ROOT = Path(__file__).resolve().parents[1]
MODELS_ROOT = ROOT.parent / "sdkwork-models"
APPBASE_ROOT = ROOT.parent / "sdkwork-appbase"
APPSTORE_ROOT = ROOT.parent / "sdkwork-appstore"

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
APPBASE_IAM_TABLES = {
    "iam_verification_scene_policy",
    "iam_verification_challenge",
    "iam_verification_attempt",
}


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


def infer_commerce_domain(table_name: str) -> str:
    prefix = table_name.split("_", 1)[0]
    return COMMERCE_DOMAIN_PREFIXES.get(prefix, "commerce")


def minimal_owner_table(
    *,
    table_name: str,
    domain: str,
    write_owner: str,
    profile: str,
    compliance_level: str = "L2",
    api_surfaces: list[str] | None = None,
) -> dict:
    return {
        "table": table_name,
        "domain": domain,
        "profile": profile,
        "compliance_level": compliance_level,
        "system_of_record": True,
        "generated_by_this_project": True,
        "write_owner": write_owner,
        "common_columns": "tenant_entity",
        "api_surfaces": api_surfaces or ["app", "backend", "worker"],
        "columns": {"id": "int64"},
    }


def write_owner_registry(
    *,
    root: Path,
    registry_name: str,
    domain_key: str,
    owner: str,
    bounded_context: str,
    fragment_rel: str,
    tables: list[dict],
) -> None:
    registry_dir = root / "docs/schema-registry"
    registry_dir.mkdir(parents=True, exist_ok=True)
    dump_tables(registry_dir / fragment_rel, tables)
    (registry_dir / f"{registry_name}.tables.yaml").write_text(
        f"""schema_registry:
  name: {registry_name}
  version: 0.1.0
  standard: ../../../sdkwork-specs/DATABASE_SPEC.md
  source_docs:
  - ../database/README.md
domains:
  {domain_key}:
    owner: {owner}
    bounded_context: {bounded_context}
table_fragments:
- {fragment_rel}
""",
        encoding="utf-8",
    )


def generate_commerce_registry() -> int:
    registry_path = COMMERCE_ROOT / "database/contract/table-registry.json"
    payload = json.loads(registry_path.read_text(encoding="utf-8"))
    tables_payload = payload.get("tables") or []
    tables = [
        minimal_owner_table(
            table_name=item["table_name"],
            domain=infer_commerce_domain(item["table_name"]),
            write_owner=item.get("owner") or "commerce-platform",
            profile="commerce_entity",
            compliance_level=item.get("compliance_level") or "L2",
        )
        for item in tables_payload
        if isinstance(item, dict) and isinstance(item.get("table_name"), str)
    ]
    write_owner_registry(
        root=COMMERCE_ROOT,
        registry_name="commerce-core",
        domain_key="commerce",
        owner="commerce-platform",
        bounded_context="commerce-core",
        fragment_rel="tables/001-commerce.yaml",
        tables=tables,
    )
    return len(tables)


def generate_appstore_registry() -> int:
    baseline_path = APPSTORE_ROOT / "database/ddl/baseline/postgres/0001_appstore_baseline.sql"
    baseline = baseline_path.read_text(encoding="utf-8")
    table_names = sorted(set(re.findall(r"CREATE TABLE IF NOT EXISTS (\w+)", baseline)))
    tables = [
        minimal_owner_table(
            table_name=table_name,
            domain="appstore",
            write_owner="appstore-platform",
            profile="appstore_entity",
        )
        for table_name in table_names
    ]
    write_owner_registry(
        root=APPSTORE_ROOT,
        registry_name="appstore",
        domain_key="appstore",
        owner="appstore-platform",
        bounded_context="application-distribution",
        fragment_rel="tables/001-appstore.yaml",
        tables=tables,
    )
    return len(tables)


def restore_catalog_tables_from_git() -> list[dict]:
    extracted: list[dict] = []
    for rel in ("docs/schema-registry/tables/016-ai.yaml", "docs/schema-registry/tables/018-ai.yaml"):
        fragment_path = ROOT / rel
        if fragment_path.is_file():
            extracted.extend(
                table
                for table in load_tables(fragment_path)
                if table.get("table") in MODELS_CATALOG_TABLES
            )
        if len(extracted) >= len(MODELS_CATALOG_TABLES):
            break
    if len(extracted) < len(MODELS_CATALOG_TABLES):
        import subprocess

        for rel in ("docs/schema-registry/tables/016-ai.yaml", "docs/schema-registry/tables/018-ai.yaml"):
            try:
                text = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT).decode("utf-8")
            except subprocess.CalledProcessError:
                continue
            payload = yaml.safe_load(text) or {}
            extracted.extend(
                copy.deepcopy(table)
                for table in payload.get("tables") or []
                if isinstance(table, dict) and table.get("table") in MODELS_CATALOG_TABLES
            )
    deduped: dict[str, dict] = {}
    for table in extracted:
        name = table.get("table")
        if isinstance(name, str):
            deduped[name] = table
    return [deduped[name] for name in sorted(deduped) if name in MODELS_CATALOG_TABLES]


def restore_iam_verification_tables_from_git() -> list[dict]:
    fragment_path = ROOT / "docs/schema-registry/tables/012-iam.yaml"
    extracted = [
        table
        for table in load_tables(fragment_path)
        if table.get("table") in APPBASE_IAM_TABLES
    ]
    if extracted:
        return extracted
    import subprocess

    try:
        text = subprocess.check_output(
            ["git", "show", "HEAD:docs/schema-registry/tables/012-iam.yaml"],
            cwd=ROOT,
        ).decode("utf-8")
    except subprocess.CalledProcessError:
        return []
    payload = yaml.safe_load(text) or {}
    return [
        copy.deepcopy(table)
        for table in payload.get("tables") or []
        if isinstance(table, dict) and table.get("table") in APPBASE_IAM_TABLES
    ]


def split_fragment(rel: str, extract_names: set[str]) -> tuple[list[dict], list[dict]]:
    path = ROOT / "docs/schema-registry" / rel
    extracted: list[dict] = []
    kept: list[dict] = []
    for table in load_tables(path):
        name = table.get("table")
        if name in extract_names:
            extracted.append(copy.deepcopy(table))
        else:
            kept.append(table)
    return extracted, kept


def main() -> None:
    assembly_path = ROOT / "docs/schema-registry/sdkwork-clawrouter.tables.yaml"
    assembly = yaml.safe_load(assembly_path.read_text(encoding="utf-8"))
    fragments = list(assembly.get("table_fragments") or [])

    catalog_extracted: list[dict] = []
    catalog_remaining: dict[str, list[dict]] = {}
    for rel in fragments:
        extracted, kept = split_fragment(rel, MODELS_CATALOG_TABLES)
        catalog_extracted.extend(extracted)
        catalog_remaining[rel] = kept

    iam_extracted, iam_kept = split_fragment("tables/012-iam.yaml", APPBASE_IAM_TABLES)
    catalog_remaining["tables/012-iam.yaml"] = iam_kept

    if not catalog_extracted:
        catalog_extracted = restore_catalog_tables_from_git()
    if not iam_extracted:
        iam_extracted = restore_iam_verification_tables_from_git()

    for rel, tables in catalog_remaining.items():
        dump_tables(ROOT / "docs/schema-registry" / rel, tables)

    models_dir = MODELS_ROOT / "docs/schema-registry"
    models_dir.mkdir(parents=True, exist_ok=True)
    for table in catalog_extracted:
        table["generated_by_this_project"] = True
        table["write_owner"] = "sdkwork-models-platform"
    dump_tables(models_dir / "tables/001-catalog.yaml", catalog_extracted)
    (models_dir / "sdkwork-models.tables.yaml").write_text(
        """schema_registry:
  name: sdkwork-models
  version: 0.1.0
  standard: ../../../sdkwork-specs/DATABASE_SPEC.md
  source_docs:
  - ../database/README.md
domains:
  ai:
    owner: sdkwork-models-platform
    bounded_context: model-catalog-dictionary
table_fragments:
- tables/001-catalog.yaml
""",
        encoding="utf-8",
    )

    appbase_dir = APPBASE_ROOT / "docs/schema-registry"
    appbase_dir.mkdir(parents=True, exist_ok=True)
    for table in iam_extracted:
        table["generated_by_this_project"] = True
        table["write_owner"] = "sdkwork-iam"
        source_tables = table.get("source_tables")
        if isinstance(source_tables, list):
            table["source_tables"] = [
                source for source in source_tables if not str(source).startswith("messaging_")
            ]
    dump_tables(appbase_dir / "tables/001-verification.yaml", iam_extracted)
    (appbase_dir / "appbase-iam.tables.yaml").write_text(
        """schema_registry:
  name: appbase-iam
  version: 0.1.0
  standard: ../../../sdkwork-specs/DATABASE_SPEC.md
  source_docs:
  - ../database/README.md
domains:
  iam:
    owner: sdkwork-iam
    bounded_context: identity-access
table_fragments:
- tables/001-verification.yaml
""",
        encoding="utf-8",
    )

    forum_tables = [
        {
            "table": "content_reaction",
            "domain": "content",
            "profile": "forum_runtime_projection",
            "compliance_level": "L2",
            "system_of_record": True,
            "generated_by_this_project": True,
            "write_owner": "forum-runtime-projection",
            "common_columns": "event_log",
            "frontend_routes": ["/forum", "/forum/:id"],
            "api_surfaces": ["app"],
            "columns": {
                "target_type": "int32",
                "target_id": "int64",
                "reaction_type": "int32",
                "reaction_value": "string(64)",
                "client_ip_hash": "string(128)",
                "user_agent_hash": "string(128)",
                "cancelled_at": "instant",
            },
            "indexes": [
                {
                    "name": "uk_content_reaction_user_target_type",
                    "unique": True,
                    "columns": [
                        "tenant_id",
                        "organization_id",
                        "user_id",
                        "target_type",
                        "target_id",
                        "reaction_type",
                    ],
                },
                {
                    "name": "idx_content_reaction_target_type",
                    "columns": ["target_type", "target_id", "reaction_type", "created_at", "id"],
                },
            ],
        },
        {
            "table": "content_forum_post",
            "domain": "content",
            "profile": "forum_runtime_projection",
            "compliance_level": "L2",
            "system_of_record": True,
            "generated_by_this_project": True,
            "write_owner": "forum-runtime-projection",
            "common_columns": "tenant_entity",
            "frontend_routes": ["/forum", "/forum/:id"],
            "api_surfaces": ["app"],
            "columns": {
                "uuid": {"type": "string(255)", "constraints": "NOT NULL UNIQUE"},
                "v": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "user_id": "int64",
                "title": "string(255)",
                "summary": "text",
                "category_id": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "content_type": "int32",
                "content_id": "int64",
                "cover_resources": "json",
                "resource_list": "json",
                "author": "json",
                "source": "string(100)",
                "source_url": "string(500)",
                "publish_time": "instant",
                "tags": "json",
                "status": {"type": "int32", "constraints": "NOT NULL DEFAULT 2"},
                "view_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "like_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "comment_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "share_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "favorite_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "is_top": {"type": "bool", "constraints": "NOT NULL DEFAULT FALSE"},
                "is_hot": {"type": "bool", "constraints": "NOT NULL DEFAULT FALSE"},
                "is_recommended": {"type": "bool", "constraints": "NOT NULL DEFAULT FALSE"},
                "sort_order": {"type": "int32", "constraints": "NOT NULL DEFAULT 0"},
            },
            "indexes": [
                {"name": "idx_content_forum_post_status", "columns": ["status"]},
                {"name": "idx_content_forum_post_user_id", "columns": ["user_id"]},
                {"name": "idx_content_forum_post_category_id", "columns": ["category_id"]},
                {"name": "idx_content_forum_post_content_type", "columns": ["content_type"]},
                {"name": "idx_content_forum_post_publish_time", "columns": ["publish_time"]},
                {
                    "name": "idx_content_forum_post_status_publish_time",
                    "columns": ["status", "publish_time"],
                },
            ],
        },
        {
            "table": "content_comment",
            "domain": "content",
            "profile": "forum_runtime_projection",
            "compliance_level": "L2",
            "system_of_record": True,
            "generated_by_this_project": True,
            "write_owner": "forum-runtime-projection",
            "common_columns": "tenant_entity",
            "frontend_routes": ["/forum", "/forum/:id"],
            "api_surfaces": ["app"],
            "columns": {
                "uuid": {"type": "string(255)", "constraints": "NOT NULL UNIQUE"},
                "v": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "user_id": "int64",
                "content_type": "int32",
                "content_id": "int64",
                "parent_id": "int64",
                "root_id": "int64",
                "path": "string(512)",
                "sort_weight": {"type": "int32", "constraints": "NOT NULL DEFAULT 0"},
                "body": "text",
                "author": "json",
                "likes": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "reply_count": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "is_top": {"type": "bool", "constraints": "NOT NULL DEFAULT FALSE"},
                "status": {"type": "int32", "constraints": "NOT NULL DEFAULT 1"},
                "ip_address": "string(50)",
                "client_ip": "string(50)",
                "device_info": "string(255)",
            },
            "indexes": [
                {
                    "name": "idx_content_comment_content",
                    "columns": ["content_type", "content_id", "parent_id", "created_at", "id"],
                },
                {"name": "idx_content_comment_user", "columns": ["user_id", "created_at", "id"]},
            ],
        },
        {
            "table": "content_favorite",
            "domain": "content",
            "profile": "forum_runtime_projection",
            "compliance_level": "L2",
            "system_of_record": True,
            "generated_by_this_project": True,
            "write_owner": "forum-runtime-projection",
            "common_columns": "tenant_entity",
            "frontend_routes": ["/forum", "/forum/:id"],
            "api_surfaces": ["app"],
            "columns": {
                "uuid": {"type": "string(255)", "constraints": "NOT NULL UNIQUE"},
                "v": {"type": "int64", "constraints": "NOT NULL DEFAULT 0"},
                "user_id": "int64",
                "content_type": "int32",
                "content_id": "int64",
                "status": {"type": "int32", "constraints": "NOT NULL DEFAULT 1"},
                "metadata": {"type": "json", "constraints": "NOT NULL DEFAULT '{}'::jsonb"},
                "source": "string(50)",
                "client_ip": "string(50)",
                "device_info": "string(255)",
            },
            "indexes": [
                {
                    "name": "uk_content_favorite_user_content",
                    "unique": True,
                    "columns": ["user_id", "content_type", "content_id"],
                },
                {"name": "idx_content_favorite_content", "columns": ["content_type", "content_id"]},
            ],
        },
    ]
    dump_tables(ROOT / "docs/schema-registry/tables/031-content-forum.yaml", forum_tables)
    if "tables/031-content-forum.yaml" not in fragments:
        fragments.append("tables/031-content-forum.yaml")

    assembly["table_fragments"] = fragments
    commerce_count = generate_commerce_registry()
    appstore_count = generate_appstore_registry()

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
            "ownership": "read_only",
        },
    ]
    guard = assembly.setdefault("schema_registry", {}).setdefault("legacy_compatibility_guardrails", {})
    guard["rule"] = (
        "Greenfield composition model uses ai_* runtime, ops_*, integration_*, storage_, object_, upload_, media_, c_, "
        "and content_forum projection tables as claw-router generated ownership. Model catalog dictionary tables are "
        "owned by sdkwork-models. IAM verification tables are owned by appbase-iam. Commerce, promotion, messaging, "
        "and IAM base tables are owned by sibling modules and must not be generated in claw-router schema.sql."
    )
    assembly_path.write_text(
        yaml.safe_dump(assembly, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    print(f"catalog tables moved: {len(catalog_extracted)}")
    print(f"iam verification moved: {len(iam_extracted)}")
    print(f"016-ai remaining: {len(catalog_remaining.get('tables/016-ai.yaml', []))}")
    print(f"commerce owner registry tables: {commerce_count}")
    print(f"appstore owner registry tables: {appstore_count}")


if __name__ == "__main__":
    main()
