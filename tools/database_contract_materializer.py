from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from tools.schema_compiler import COMMON_COLUMN_DEFINITIONS, SchemaCompiler
from tools.schema_registry_loader import load_schema_registry


COMMON_LOGICAL_TYPES = {
    "id": "int64",
    "uuid": "string(64)",
    "tenant_id": "int64",
    "organization_id": "int64",
    "user_id": "int64",
    "owner_type": "int32",
    "owner_id": "int64",
    "data_scope": "int32",
    "status": "int32",
    "created_at": "instant",
    "updated_at": "instant",
    "version": "int64",
    "deleted_at": "instant",
    "deleted_by": "int64",
    "metadata": "json",
    "idempotency_key": "string(128)",
    "request_id": "string(128)",
    "trace_id": "string(128)",
    "payload_hash": "string(128)",
    "retention_until": "instant",
    "legal_hold": "bool",
    "operator_id": "int64",
    "action": "string(128)",
    "target_type": "int32",
    "target_id": "int64",
    "source_type": "string(128)",
    "source_id": "int64",
    "source_version": "int64",
    "rebuild_version": "int64",
}

DATABASE_ROLE = "authoritative-server"
DATABASE_ENGINE = "postgres"


class IndentedSafeDumper(yaml.SafeDumper):
    def increase_indent(self, flow: bool = False, indentless: bool = False) -> None:
        return super().increase_indent(flow, False)


@dataclass(frozen=True)
class DatabaseModuleSpec:
    module_id: str
    service_code: str
    display_name: str
    owner: str
    table_prefix: str
    baseline_anchor_table: str
    baseline_file: str
    relative_root: str


ROOT_MODULE = DatabaseModuleSpec(
    module_id="clawrouter",
    service_code="CLAW_ROUTER",
    display_name="Claw Router AI Database",
    owner="claw-router-platform",
    table_prefix="ai_",
    baseline_anchor_table="ai_upstream_supplier",
    baseline_file="0001_clawrouter_baseline.sql",
    relative_root="database",
)

AUXILIARY_MODULES = (
    DatabaseModuleSpec(
        module_id="gateway-iam",
        service_code="CLAW_ROUTER_GATEWAY_IAM",
        display_name="Claw Router Gateway IAM Database",
        owner="gateway-iam-service",
        table_prefix="iam_gateway_",
        baseline_anchor_table="iam_gateway_api_key",
        baseline_file="0001_gateway_iam_baseline.sql",
        relative_root="database/modules/gateway-iam",
    ),
    DatabaseModuleSpec(
        module_id="operations",
        service_code="CLAW_ROUTER_OPERATIONS",
        display_name="Claw Router Operations Database",
        owner="claw-router-platform",
        table_prefix="ops_",
        baseline_anchor_table="ops_gateway_instance",
        baseline_file="0001_operations_baseline.sql",
        relative_root="database/modules/operations",
    ),
)


@dataclass(frozen=True)
class MaterializedDatabaseContract:
    schema_yaml: str
    table_registry_json: str
    prefix_registry_json: str
    manifest_json: str


class DatabaseContractMaterializer:
    """Materialize framework lifecycle contracts from the authored registry."""

    def __init__(
        self,
        root: Path,
        registry_path: Path | None = None,
        module_spec: DatabaseModuleSpec = ROOT_MODULE,
    ) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )
        self.module_spec = module_spec
        self.module_root = self.root / Path(module_spec.relative_root)
        self.compiler = SchemaCompiler(
            self.root,
            self.registry_path,
            table_prefixes=(module_spec.table_prefix,),
        )
        self.composite_compiler = SchemaCompiler(self.root, self.registry_path)

    def render(self) -> MaterializedDatabaseContract:
        registry = load_schema_registry(self.registry_path)
        schema_metadata = registry.get("schema_registry", {})
        if not isinstance(schema_metadata, dict):
            schema_metadata = {}
        common_groups = schema_metadata.get("common_column_groups", {})
        if not isinstance(common_groups, dict):
            common_groups = {}
        profile_policies = schema_metadata.get("table_profile_policies", {})
        if not isinstance(profile_policies, dict):
            profile_policies = {}

        tables = [
            self._table_contract(table, common_groups, profile_policies)
            for table in registry.get("tables", [])
            if isinstance(table, dict)
            and isinstance(table.get("table"), str)
            and table.get("generated_by_this_project") is not False
            and str(table["table"]).startswith(self.module_spec.table_prefix)
        ]
        tables.sort(key=lambda item: item["name"])
        table_names = [table["name"] for table in tables]
        contract_version = str(schema_metadata.get("version") or "1.0.0")

        schema_contract = {
            "schema_version": 1,
            "kind": "sdkwork.database.schema",
            "database_role": DATABASE_ROLE,
            "module_id": self.module_spec.module_id,
            "contract_version": contract_version,
            "owner_team": self.module_spec.owner,
            "compliance_level": "L2",
            "engines": [DATABASE_ENGINE],
            "table_prefix": self.module_spec.table_prefix,
            "source_registry": self._relative_path(self.registry_path),
            "tables": tables,
        }

        table_registry = {
            "schemaVersion": 1,
            "kind": "sdkwork.database.table-registry",
            "tables": [
                {
                    "table_name": table["name"],
                    "owner": table["write_owner"],
                    "compliance_level": table["compliance_level"],
                    "lifecycle_status": "active",
                    "profile": table.get("profile"),
                    "system_of_record": table.get("system_of_record"),
                }
                for table in tables
            ],
        }
        prefix_registry = {
            "schemaVersion": 1,
            "kind": "sdkwork.database.prefix-registry",
            "prefixes": [
                {
                    "prefix": prefix,
                    "owner": self.module_spec.owner,
                    "domain": self.module_spec.module_id,
                }
                for prefix in (self.module_spec.table_prefix,)
            ],
        }

        manifest_path = self.module_root / "database.manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["schemaVersion"] = 2
        manifest["databaseRole"] = DATABASE_ROLE
        manifest["moduleId"] = self.module_spec.module_id
        manifest["serviceCode"] = self.module_spec.service_code
        manifest["displayName"] = self.module_spec.display_name
        manifest["owner"] = self.module_spec.owner
        manifest["engines"] = [DATABASE_ENGINE]
        manifest["defaultEngine"] = DATABASE_ENGINE
        manifest["contractVersion"] = contract_version
        manifest["tablePrefix"] = self.module_spec.table_prefix
        manifest.pop("tablePrefixes", None)
        manifest["baselineAnchorTable"] = self.module_spec.baseline_anchor_table
        manifest["modules"] = self._available_auxiliary_module_ids()
        manifest.pop("composeDependencies", None)
        manifest["baselineStrategy"] = "baseline-plus-migrations"
        lifecycle = manifest.setdefault("lifecycle", {})
        lifecycle["autoMigrate"] = False
        manifest["materializedTableCount"] = len(table_names)
        manifest["materializedTables"] = table_names

        return MaterializedDatabaseContract(
            schema_yaml=yaml.dump(
                schema_contract,
                Dumper=IndentedSafeDumper,
                allow_unicode=True,
                sort_keys=False,
                width=120,
            ),
            table_registry_json=json.dumps(table_registry, ensure_ascii=False, indent=2) + "\n",
            prefix_registry_json=json.dumps(prefix_registry, ensure_ascii=False, indent=2) + "\n",
            manifest_json=json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        )

    def materialize(self) -> list[Path]:
        if self.module_spec == ROOT_MODULE:
            self.composite_compiler.write_dialect(DATABASE_ENGINE)
        self.compiler.write_baseline(DATABASE_ENGINE, self._baseline_path())
        rendered = self.render()
        outputs = self._outputs()
        payloads = (
            rendered.schema_yaml,
            rendered.table_registry_json,
            rendered.prefix_registry_json,
            rendered.manifest_json,
        )
        for output, payload in zip(outputs, payloads, strict=True):
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(payload, encoding="utf-8")
        materialized = list(outputs)
        if self.module_spec == ROOT_MODULE:
            for module_spec in AUXILIARY_MODULES:
                module_manifest = self.root / module_spec.relative_root / "database.manifest.json"
                if module_manifest.is_file():
                    materialized.extend(
                        DatabaseContractMaterializer(
                            self.root,
                            self.registry_path,
                            module_spec,
                        ).materialize()
                    )
        return materialized

    def check(self) -> list[str]:
        messages: list[str] = []
        if self.module_spec == ROOT_MODULE:
            messages.extend(self.composite_compiler.check_dialect(DATABASE_ENGINE).messages)
        messages.extend(
            self.compiler.check_baseline(DATABASE_ENGINE, self._baseline_path()).messages
        )
        rendered = self.render()
        payloads = (
            rendered.schema_yaml,
            rendered.table_registry_json,
            rendered.prefix_registry_json,
            rendered.manifest_json,
        )
        for output, expected in zip(self._outputs(), payloads, strict=True):
            if not output.exists():
                messages.append(f"materialized database contract is missing: {output}")
            elif output.read_text(encoding="utf-8") != expected:
                messages.append(f"materialized database contract is stale: {output}")
        if self.module_spec == ROOT_MODULE:
            for module_spec in AUXILIARY_MODULES:
                module_manifest = self.root / module_spec.relative_root / "database.manifest.json"
                if module_manifest.is_file():
                    messages.extend(
                        DatabaseContractMaterializer(
                            self.root,
                            self.registry_path,
                            module_spec,
                        ).check()
                    )
        return messages

    def _available_auxiliary_module_ids(self) -> list[str]:
        if self.module_spec != ROOT_MODULE:
            return []
        return [
            module_spec.module_id
            for module_spec in AUXILIARY_MODULES
            if (self.root / module_spec.relative_root / "database.manifest.json").is_file()
        ]

    def _baseline_path(self) -> Path:
        return (
            self.module_root
            / "ddl"
            / "baseline"
            / DATABASE_ENGINE
            / self.module_spec.baseline_file
        )

    def _table_contract(
        self,
        table: dict[str, Any],
        common_groups: dict[str, Any],
        profile_policies: dict[str, Any],
    ) -> dict[str, Any]:
        table_name = str(table["table"])
        logical_columns = self._logical_columns(table, common_groups)
        postgres_columns = self.compiler._collect_columns(table, common_groups, "postgres")
        policy = self.compiler.resolve_table_policy(table, profile_policies)
        columns: dict[str, Any] = {}
        for name, logical_type in logical_columns.items():
            postgres_column = postgres_columns[name]
            columns[name] = {
                "type": logical_type,
                "required": self._is_required(postgres_column.constraints),
                "postgres_type": postgres_column.sql_type,
                "constraints": postgres_column.constraints,
            }

        constraints = self._constraints(table, postgres_columns, policy)
        indexes = self._indexes(table, policy, set(postgres_columns))
        return {
            "name": table_name,
            "domain": table.get("domain"),
            "profile": table.get("profile"),
            "compliance_level": table.get("compliance_level", "L2"),
            "write_owner": table.get("write_owner", "claw-router-platform"),
            "system_of_record": table.get("system_of_record"),
            "tenant_scope": policy.get("tenant_scope"),
            "soft_delete_policy": policy.get("soft_delete_policy"),
            "columns": columns,
            "constraints": constraints,
            "indexes": indexes,
            "source_tables": table.get("source_tables", []),
            "source_refs": table.get("source_refs", []),
            "projection_policy": table.get("projection_policy"),
            "lifecycle": table.get("lifecycle"),
            "semantic_contracts": table.get("semantic_contracts"),
        }

    @staticmethod
    def _logical_columns(
        table: dict[str, Any],
        common_groups: dict[str, Any],
    ) -> dict[str, str]:
        columns: dict[str, str] = {}
        group_name = table.get("common_columns")
        if isinstance(group_name, str):
            for name in common_groups.get(group_name, []):
                if name not in COMMON_LOGICAL_TYPES:
                    raise ValueError(f"missing common logical type for {name}")
                columns[name] = COMMON_LOGICAL_TYPES[name]
        for name, raw in (table.get("columns") or {}).items():
            logical_type = raw.get("type") if isinstance(raw, dict) else raw
            if not isinstance(logical_type, str):
                raise ValueError(f"{table['table']}.{name} has invalid logical type")
            columns[name] = logical_type
        return columns

    @staticmethod
    def _constraints(
        table: dict[str, Any],
        columns: dict[str, Any],
        policy: dict[str, Any],
    ) -> list[dict[str, Any]]:
        table_name = str(table["table"])
        constraints: list[dict[str, Any]] = []
        primary_key = table.get("primary_key")
        if primary_key is None:
            primary_key_columns = [
                name
                for name, column in columns.items()
                if re.search(r"\bPRIMARY\s+KEY\b", column.constraints, flags=re.IGNORECASE)
            ]
        elif isinstance(primary_key, str):
            primary_key_columns = [primary_key]
        else:
            primary_key_columns = list(primary_key)
        if primary_key_columns:
            constraints.append(
                {
                    "name": f"pk_{table_name}",
                    "type": "primary_key",
                    "columns": primary_key_columns,
                }
            )
        tenant_scope = policy.get("tenant_scope")
        if "tenant_id" in columns and "organization_id" in columns and tenant_scope:
            expression = (
                "tenant_id > 0 AND organization_id >= 0"
                if tenant_scope == "tenant_required"
                else "tenant_id >= 0 AND organization_id >= 0 "
                "AND (tenant_id > 0 OR organization_id = 0)"
            )
            constraints.append(
                {
                    "name": f"ck_{table_name}_tenant_scope",
                    "type": "check",
                    "columns": ["tenant_id", "organization_id"],
                    "expression": expression,
                }
            )
        for item in table.get("unique_constraints", []) or []:
            name = item.get("name") or f"uk_{table_name}_{'_'.join(item['columns'])}"
            constraints.append(
                {
                    "name": name,
                    "type": "unique",
                    "columns": item["columns"],
                    "where": item.get("where"),
                }
            )
        for item in table.get("foreign_keys", []) or []:
            constraints.append(
                {
                    "name": item["name"],
                    "type": "foreign_key",
                    "columns": item["columns"],
                    "references_table": item["references_table"],
                    "references_columns": item["references_columns"],
                    "on_delete": item.get("on_delete", "RESTRICT"),
                }
            )
        for item in table.get("check_constraints", []) or []:
            constraints.append(
                {
                    "name": item["name"],
                    "type": "check",
                    "columns": item.get("columns", []),
                    "expression": item["expression"],
                }
            )
        return constraints

    @staticmethod
    def _indexes(
        table: dict[str, Any],
        policy: dict[str, Any],
        column_names: set[str],
    ) -> list[dict[str, Any]]:
        table_name = str(table["table"])
        indexes = [
            {
                "name": item.get("name") or f"uk_{table_name}_{'_'.join(item['columns'])}",
                "columns": item["columns"],
                "unique": True,
                "where": item.get("where")
                or (
                    "deleted_at IS NULL"
                    if policy.get("soft_delete_policy") == "active_unique"
                    and "deleted_at" in column_names
                    else None
                ),
            }
            for item in table.get("unique_constraints", []) or []
        ]
        indexes.extend(
            {
                "name": item["name"],
                "columns": item["columns"],
                "unique": item.get("unique") is True,
                "where": item.get("where"),
            }
            for item in table.get("indexes", []) or []
        )
        return indexes

    @staticmethod
    def _is_required(constraints: str) -> bool:
        return bool(
            re.search(r"\bNOT\s+NULL\b|\bPRIMARY\s+KEY\b", constraints, flags=re.IGNORECASE)
        )

    def _relative_path(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    def _outputs(self) -> tuple[Path, Path, Path, Path]:
        return (
            self.module_root / "contract" / "schema.yaml",
            self.module_root / "contract" / "table-registry.json",
            self.module_root / "contract" / "prefix-registry.json",
            self.module_root / "database.manifest.json",
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Materialize Claw Router database lifecycle assets.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--registry", type=Path, default=None)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    materializer = DatabaseContractMaterializer(args.root, args.registry)
    if args.check:
        messages = materializer.check()
        if messages:
            for message in messages:
                print(message)
            return 1
        print("Database lifecycle assets are current")
        return 0

    for output in materializer.materialize():
        print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
