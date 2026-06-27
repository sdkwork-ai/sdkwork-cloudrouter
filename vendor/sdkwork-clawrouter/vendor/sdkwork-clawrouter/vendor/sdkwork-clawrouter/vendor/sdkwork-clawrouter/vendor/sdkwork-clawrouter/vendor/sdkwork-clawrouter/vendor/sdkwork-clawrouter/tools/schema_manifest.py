from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.schema_registry_loader import load_schema_registry

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class SchemaManifestCheckResult:
    ok: bool
    messages: list[str]


class SchemaManifestGenerator:
    """Compile Schema Registry into a deterministic machine-readable manifest."""

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def generate(self) -> dict[str, Any]:
        registry = self._load_registry()
        schema = registry.get("schema_registry", {})
        if not isinstance(schema, dict):
            schema = {}

        tables = registry.get("tables", [])
        if not isinstance(tables, list):
            tables = []

        common_column_groups = schema.get("common_column_groups", {})
        if not isinstance(common_column_groups, dict):
            common_column_groups = {}

        manifest_tables = [
            self._compile_table(table, common_column_groups)
            for table in tables
            if isinstance(table, dict) and isinstance(table.get("table"), str)
        ]
        manifest_tables.sort(key=lambda item: item["table"])

        route_index = self._build_route_index(manifest_tables)
        generated_tables = [table["table"] for table in manifest_tables if table["generated_by_this_project"]]
        external_legacy_tables = [
            table["table"]
            for table in manifest_tables
            if table["domain"] == "legacy" and not table["generated_by_this_project"]
        ]

        api_surface_counts: dict[str, int] = {}
        for table in manifest_tables:
            for surface in table["api_surfaces"]:
                api_surface_counts[surface] = api_surface_counts.get(surface, 0) + 1

        return {
            "schema": {
                "name": schema.get("name"),
                "version": schema.get("version"),
                "api_prefixes": schema.get("api_prefixes", {}),
                "registry_path": self._display_path(self.registry_path),
            },
            "summary": {
                "table_count": len(manifest_tables),
                "generated_table_count": len(generated_tables),
                "legacy_table_count": len([table for table in manifest_tables if table["domain"] == "legacy"]),
                "external_legacy_table_count": len(external_legacy_tables),
                "frontend_route_count": len(route_index),
                "api_surface_counts": dict(sorted(api_surface_counts.items())),
            },
            "generated_tables": generated_tables,
            "external_legacy_tables": external_legacy_tables,
            "routes": route_index,
            "tables": manifest_tables,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def render_effective_registry(self, output_path: Path | None = None) -> str:
        registry = self._load_registry()
        self._rewrite_effective_registry_spec_paths(registry, self._effective_registry_path(output_path))
        if yaml is None:
            raise RuntimeError('PyYAML is required to render schema registry YAML') from _YAML_IMPORT_ERROR
        return yaml.safe_dump(registry, allow_unicode=True, sort_keys=False)

    def write(self, output_path: Path | None = None) -> Path:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "manifest" / "schema-manifest.json"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8")
        self.write_effective_registry()
        return target

    def write_effective_registry(self, output_path: Path | None = None) -> Path:
        target = self._effective_registry_path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_effective_registry(output_path), encoding="utf-8")
        return target

    def check(self, output_path: Path | None = None) -> SchemaManifestCheckResult:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "manifest" / "schema-manifest.json"
        )
        messages: list[str] = []
        expected = self.render_json()
        if not target.exists():
            messages.append(f"schema manifest is missing: {target}")
        else:
            actual = target.read_text(encoding="utf-8")
            if actual != expected:
                messages.append(f"schema manifest is stale: {target}")

        effective_registry = self._effective_registry_path()
        expected_effective_registry = self.render_effective_registry()
        if not effective_registry.exists():
            messages.append(f"effective schema registry is missing: {effective_registry}")
        else:
            actual_effective_registry = effective_registry.read_text(encoding="utf-8")
            if actual_effective_registry != expected_effective_registry:
                messages.append(f"effective schema registry is stale: {effective_registry}")

        return SchemaManifestCheckResult(ok=not messages, messages=messages)

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _rewrite_effective_registry_spec_paths(self, registry: dict[str, Any], target: Path) -> None:
        schema = registry.get('schema_registry')
        if not isinstance(schema, dict):
            return

        for key in ('standard', 'api_standard'):
            relative_value = schema.get(key)
            if not isinstance(relative_value, str):
                continue
            resolved = (self.registry_path.parent / relative_value).resolve()
            if not resolved.exists():
                continue
            schema[key] = Path(os.path.relpath(resolved, target.parent)).as_posix()

    def _compile_table(self, table: dict[str, Any], common_column_groups: dict[str, Any]) -> dict[str, Any]:
        table_name = table["table"]
        common_columns = self._resolve_common_columns(table, common_column_groups)
        explicit_columns = self._explicit_columns(table)
        indexes = self._indexes(table)
        unique_constraints = self._unique_constraints(table)
        not_null_columns = self._string_list(table.get("not_null_columns"))
        column_types = self._column_types(table.get("column_types"))
        foreign_keys = self._foreign_keys(table)
        frontend_routes = self._string_list(table.get("frontend_routes"))
        api_surfaces = self._string_list(table.get("api_surfaces"))

        compiled_table = {
            "table": table_name,
            "domain": table.get("domain"),
            "profile": table.get("profile"),
            "compliance_level": table.get("compliance_level"),
            "write_owner": table.get("write_owner"),
            "generated_by_this_project": table.get("generated_by_this_project") is not False,
            "system_of_record": table.get("system_of_record"),
            "common_columns": common_columns,
            "columns": common_columns + explicit_columns,
            "physical_columns": table.get("physical_columns"),
            "source_tables": self._string_list(table.get("source_tables")),
            "source_refs": self._string_list(table.get("source_refs")),
            "projection_policy": table.get("projection_policy"),
            "indexes": indexes,
            "unique_constraints": unique_constraints,
            "not_null_columns": not_null_columns,
            "column_types": column_types,
            "foreign_keys": foreign_keys,
            "frontend_routes": frontend_routes,
            "api_surfaces": api_surfaces,
            "security": table.get("security"),
            "lifecycle": table.get("lifecycle"),
        }
        semantic_contracts = self._semantic_contracts(table.get("semantic_contracts"))
        if semantic_contracts:
            compiled_table["semantic_contracts"] = semantic_contracts
        return compiled_table

    def _resolve_common_columns(self, table: dict[str, Any], common_column_groups: dict[str, Any]) -> list[dict[str, str]]:
        group_name = table.get("common_columns")
        if not isinstance(group_name, str):
            return []
        raw_columns = common_column_groups.get(group_name, [])
        if not isinstance(raw_columns, list):
            return []
        return [
            {
                "name": column,
                "type": "common",
                "source": "common",
                "group": group_name,
            }
            for column in raw_columns
            if isinstance(column, str)
        ]

    def _explicit_columns(self, table: dict[str, Any]) -> list[dict[str, str]]:
        columns = table.get("columns", {})
        if not isinstance(columns, dict):
            return []
        compiled: list[dict[str, str]] = []
        for name, registry_type in columns.items():
            if not isinstance(name, str):
                continue
            if isinstance(registry_type, str):
                type_name = registry_type
            elif isinstance(registry_type, dict) and isinstance(registry_type.get("type"), str):
                type_name = registry_type["type"]
            else:
                continue
            compiled.append(
                {
                    "name": name,
                    "type": type_name,
                    "source": "explicit",
                }
            )
        return compiled

    def _indexes(self, table: dict[str, Any]) -> list[dict[str, Any]]:
        indexes = table.get("indexes", [])
        if not isinstance(indexes, list):
            return []
        compiled: list[dict[str, Any]] = []
        for index in indexes:
            if not isinstance(index, dict) or not isinstance(index.get("name"), str):
                continue
            compiled_index: dict[str, Any] = {
                "name": index["name"],
                "unique": index.get("unique") is True,
                "columns": self._string_list(index.get("columns")),
            }
            method = index.get("method")
            if isinstance(method, str):
                compiled_index["method"] = method.lower()
            compiled.append(compiled_index)
        return compiled

    def _unique_constraints(self, table: dict[str, Any]) -> list[dict[str, Any]]:
        constraints = table.get("unique_constraints", [])
        if not isinstance(constraints, list):
            return []

        compiled: list[dict[str, Any]] = []
        for constraint in constraints:
            if not isinstance(constraint, dict):
                continue
            columns = self._string_list(constraint.get("columns"))
            if not columns:
                continue

            compiled_constraint: dict[str, Any] = {"columns": columns}
            name = constraint.get("name")
            if isinstance(name, str):
                compiled_constraint["name"] = name
            source = constraint.get("source")
            if isinstance(source, str):
                compiled_constraint["source"] = source
            compiled.append(compiled_constraint)
        return compiled

    def _column_types(self, value: Any) -> dict[str, str]:
        if not isinstance(value, dict):
            return {}
        return {
            column: sql_type
            for column, sql_type in value.items()
            if isinstance(column, str) and isinstance(sql_type, str)
        }

    def _foreign_keys(self, table: dict[str, Any]) -> list[dict[str, Any]]:
        foreign_keys = table.get("foreign_keys", [])
        if not isinstance(foreign_keys, list):
            return []

        compiled: list[dict[str, Any]] = []
        for foreign_key in foreign_keys:
            if not isinstance(foreign_key, dict) or not isinstance(foreign_key.get("name"), str):
                continue
            references_table = foreign_key.get("references_table")
            if not isinstance(references_table, str):
                continue
            columns = self._string_list(foreign_key.get("columns"))
            references_columns = self._string_list(foreign_key.get("references_columns"))
            if not columns or not references_columns:
                continue
            compiled.append(
                {
                    "name": foreign_key["name"],
                    "columns": columns,
                    "references_table": references_table,
                    "references_columns": references_columns,
                }
            )
        return compiled

    def _semantic_contracts(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            return {}
        return self._json_safe_mapping(value)

    def _json_safe_mapping(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: self._json_safe_mapping(item)
                for key, item in value.items()
                if isinstance(key, str)
            }
        if isinstance(value, list):
            return [self._json_safe_mapping(item) for item in value]
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    def _build_route_index(self, tables: list[dict[str, Any]]) -> dict[str, dict[str, list[str]]]:
        routes: dict[str, dict[str, set[str]]] = {}
        for table in tables:
            for route in table["frontend_routes"]:
                entry = routes.setdefault(route, {"tables": set(), "api_surfaces": set()})
                entry["tables"].add(table["table"])
                for surface in table["api_surfaces"]:
                    entry["api_surfaces"].add(surface)

        return {
            route: {
                "tables": sorted(values["tables"]),
                "api_surfaces": sorted(values["api_surfaces"]),
                "route_scope": self._route_scope(route),
                "required_api_surface": self._required_api_surface(route),
            }
            for route, values in sorted(routes.items())
        }

    def _route_scope(self, route: str) -> str:
        if route.startswith("/admin"):
            return "admin"
        if route.startswith("/console"):
            return "console"
        return "public"

    def _required_api_surface(self, route: str) -> str:
        if route.startswith("/admin"):
            return "backend"
        return "app"

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()

    def _effective_registry_path(self, output_path: Path | None = None) -> Path:
        return (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "registry" / "sdkwork-clawrouter.tables.effective.yaml"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate sdkwork-clawrouter Schema Registry manifest.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="output manifest path; defaults to generated/schema/manifest/schema-manifest.json",
    )
    parser.add_argument("--check", action="store_true", help="validate that the generated manifest is current")
    args = parser.parse_args()

    generator = SchemaManifestGenerator(root=args.root, registry_path=args.registry)
    if args.check:
        result = generator.check(args.output)
        if result.ok:
            print("Schema manifest is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = generator.write(args.output)
    print(f"Wrote schema manifest to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
