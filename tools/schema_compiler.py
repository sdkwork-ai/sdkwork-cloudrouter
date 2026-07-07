from __future__ import annotations

import argparse
import re
from collections import OrderedDict
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


IDENTIFIER_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
STRING_TYPE_PATTERN = re.compile(r"^string\((\d+)\)$")


class SchemaCompileError(ValueError):
    """Raised when the schema registry cannot be compiled into SQL safely."""


@dataclass(frozen=True)
class ColumnDefinition:
    name: str
    sql_type: str
    constraints: str = ""

    def render(self) -> str:
        suffix = f" {self.constraints}" if self.constraints else ""
        return f"{self.name} {self.sql_type}{suffix}"


@dataclass(frozen=True)
class SchemaCompileCheckResult:
    ok: bool
    messages: list[str]


COMMON_COLUMN_DEFINITIONS: dict[str, ColumnDefinition] = {
    "id": ColumnDefinition("id", "BIGINT", "NOT NULL PRIMARY KEY"),
    "uuid": ColumnDefinition("uuid", "VARCHAR(64)", "NOT NULL"),
    "tenant_id": ColumnDefinition("tenant_id", "BIGINT", "NOT NULL DEFAULT 0"),
    "organization_id": ColumnDefinition("organization_id", "BIGINT", "NOT NULL DEFAULT 0"),
    "user_id": ColumnDefinition("user_id", "BIGINT"),
    "owner_type": ColumnDefinition("owner_type", "INTEGER"),
    "owner_id": ColumnDefinition("owner_id", "BIGINT"),
    "data_scope": ColumnDefinition("data_scope", "INTEGER", "NOT NULL DEFAULT 0"),
    "status": ColumnDefinition("status", "INTEGER", "NOT NULL DEFAULT 1"),
    "created_at": ColumnDefinition("created_at", "TIMESTAMPTZ", "NOT NULL DEFAULT CURRENT_TIMESTAMP"),
    "updated_at": ColumnDefinition("updated_at", "TIMESTAMPTZ", "NOT NULL DEFAULT CURRENT_TIMESTAMP"),
    "version": ColumnDefinition("version", "BIGINT", "NOT NULL DEFAULT 0"),
    "deleted_at": ColumnDefinition("deleted_at", "TIMESTAMPTZ"),
    "deleted_by": ColumnDefinition("deleted_by", "BIGINT"),
    "metadata": ColumnDefinition("metadata", "JSONB", "NOT NULL DEFAULT '{}'::jsonb"),
    "idempotency_key": ColumnDefinition("idempotency_key", "VARCHAR(128)"),
    "request_id": ColumnDefinition("request_id", "VARCHAR(128)"),
    "trace_id": ColumnDefinition("trace_id", "VARCHAR(128)"),
    "payload_hash": ColumnDefinition("payload_hash", "VARCHAR(128)"),
    "retention_until": ColumnDefinition("retention_until", "TIMESTAMPTZ"),
    "legal_hold": ColumnDefinition("legal_hold", "BOOLEAN", "NOT NULL DEFAULT FALSE"),
    "operator_id": ColumnDefinition("operator_id", "BIGINT"),
    "action": ColumnDefinition("action", "VARCHAR(128)"),
    "target_type": ColumnDefinition("target_type", "INTEGER"),
    "target_id": ColumnDefinition("target_id", "BIGINT"),
    "source_type": ColumnDefinition("source_type", "VARCHAR(128)"),
    "source_id": ColumnDefinition("source_id", "BIGINT"),
    "source_version": ColumnDefinition("source_version", "BIGINT"),
    "rebuild_version": ColumnDefinition("rebuild_version", "BIGINT", "NOT NULL DEFAULT 0"),
}

SCALAR_TYPE_MAP = {
    "text": "TEXT",
    "json": "JSONB",
    "bool": "BOOLEAN",
    "int32": "INTEGER",
    "enum_int32": "INTEGER",
    "int64": "BIGINT",
    "decimal": "NUMERIC(38, 12)",
    "instant": "TIMESTAMPTZ",
    "date": "DATE",
}


class SchemaCompiler:
    """Compile Schema Registry table contracts into deterministic PostgreSQL DDL."""

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def compile_postgres(self) -> str:
        registry = self._load_registry()
        tables = registry.get("tables", [])
        if not isinstance(tables, list):
            raise SchemaCompileError("tables must be a list")

        common_column_groups = registry.get("schema_registry", {}).get("common_column_groups", {})
        if not isinstance(common_column_groups, dict):
            common_column_groups = {}

        statements: list[str] = [
            "-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.\n"
            "-- Do not edit by hand; update Schema Registry and regenerate."
        ]

        generated_table_count = 0
        for table in tables:
            if not isinstance(table, dict):
                continue
            if table.get("generated_by_this_project") is False:
                continue

            statements.append(self._compile_table(table, common_column_groups))
            generated_table_count += 1
            index_sql = self._compile_indexes(table)
            if index_sql:
                statements.append(index_sql)

        if generated_table_count == 0:
            raise SchemaCompileError(
                "schema registry does not contain any project-generated tables; "
                "check table_fragments and generated_by_this_project flags"
            )

        return "\n\n".join(statement for statement in statements if statement).rstrip() + "\n"

    def write_postgres(self, output_path: Path | None = None) -> Path:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "postgres" / "schema.sql"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.compile_postgres(), encoding="utf-8")
        return target

    def check_postgres(self, output_path: Path | None = None) -> SchemaCompileCheckResult:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "postgres" / "schema.sql"
        )
        expected = self.compile_postgres()
        if not target.exists():
            return SchemaCompileCheckResult(ok=False, messages=[f"postgres schema is missing: {target}"])

        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return SchemaCompileCheckResult(ok=False, messages=[f"postgres schema is stale: {target}"])

        return SchemaCompileCheckResult(ok=True, messages=[])

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _compile_table(self, table: dict[str, Any], common_column_groups: dict[str, Any]) -> str:
        table_name = self._require_identifier(table.get("table"), "table")
        columns = self._collect_columns(table, common_column_groups)
        if not columns:
            raise SchemaCompileError(f"{table_name} must define at least one column")

        rendered_columns = [column.render() for column in columns.values()]
        lines = [f"CREATE TABLE IF NOT EXISTS {table_name} ("]
        for index, column_sql in enumerate(rendered_columns):
            suffix = "," if index < len(rendered_columns) - 1 else ""
            lines.append(f"    {column_sql}{suffix}")
        lines.append(");")
        return "\n".join(lines)

    def _collect_columns(
        self,
        table: dict[str, Any],
        common_column_groups: dict[str, Any],
    ) -> OrderedDict[str, ColumnDefinition]:
        table_name = self._require_identifier(table.get("table"), "table")
        collected: OrderedDict[str, ColumnDefinition] = OrderedDict()

        group_name = table.get("common_columns")
        if group_name:
            if not isinstance(group_name, str):
                raise SchemaCompileError(f"{table_name}.common_columns must be a string")
            group_columns = common_column_groups.get(group_name)
            if not isinstance(group_columns, list):
                raise SchemaCompileError(f"unknown common column group for {table_name}: {group_name}")
            for column_name in group_columns:
                if not isinstance(column_name, str):
                    raise SchemaCompileError(f"{table_name}.{group_name} contains a non-string common column")
                definition = COMMON_COLUMN_DEFINITIONS.get(column_name)
                if definition is None:
                    raise SchemaCompileError(f"unsupported common column for {table_name}: {column_name}")
                collected[column_name] = definition

        explicit_columns = table.get("columns", {})
        if explicit_columns is None:
            explicit_columns = {}
        if not isinstance(explicit_columns, dict):
            raise SchemaCompileError(f"{table_name}.columns must be a mapping")

        for column_name, registry_type in explicit_columns.items():
            column = self._compile_column(table_name, column_name, registry_type)
            collected[column.name] = column

        for column_name in self._required_columns(table_name, table):
            column = collected.get(column_name)
            if column is None:
                raise SchemaCompileError(f"{table_name}.required_columns references unknown column: {column_name}")
            collected[column_name] = self._with_not_null(column)

        primary_key = self._primary_key(table_name, table)
        if primary_key:
            column = collected.get(primary_key)
            if column is None:
                raise SchemaCompileError(f"{table_name}.primary_key references unknown column: {primary_key}")
            collected[primary_key] = self._with_primary_key(column)

        return collected

    def _compile_column(self, table_name: str, column_name: Any, registry_type: Any) -> ColumnDefinition:
        name = self._require_identifier(column_name, f"{table_name}.column")
        constraints = ""
        if isinstance(registry_type, dict):
            constraints = self._compile_column_constraints(table_name, name, registry_type)
            registry_type = registry_type.get("type")
        if not isinstance(registry_type, str):
            raise SchemaCompileError(f"{table_name}.{name} type must be a string")

        sql_type = self._map_type(table_name, name, registry_type)
        return ColumnDefinition(name=name, sql_type=sql_type, constraints=constraints)

    def _compile_column_constraints(
        self,
        table_name: str,
        column_name: str,
        column: dict[str, Any],
    ) -> str:
        allowed_keys = {"type", "constraints"}
        unknown_keys = sorted(set(column.keys()) - allowed_keys)
        if unknown_keys:
            joined = ", ".join(unknown_keys)
            raise SchemaCompileError(f"unsupported column metadata for {table_name}.{column_name}: {joined}")
        constraints = column.get("constraints", "")
        if constraints is None:
            return ""
        if not isinstance(constraints, str):
            raise SchemaCompileError(f"{table_name}.{column_name}.constraints must be a string")
        constraints = constraints.strip()
        if ";" in constraints or "--" in constraints or "/*" in constraints or "*/" in constraints:
            raise SchemaCompileError(f"{table_name}.{column_name}.constraints contains unsafe SQL")
        if re.search(r"\bPRIMARY\s+KEY\b", constraints, flags=re.IGNORECASE) and not re.search(
            r"\bNOT\s+NULL\b",
            constraints,
            flags=re.IGNORECASE,
        ):
            constraints = f"NOT NULL {constraints}"
        return constraints

    def _map_type(self, table_name: str, column_name: str, registry_type: str) -> str:
        string_match = STRING_TYPE_PATTERN.match(registry_type)
        if string_match:
            length = int(string_match.group(1))
            if length <= 0:
                raise SchemaCompileError(f"invalid string length for {table_name}.{column_name}: {registry_type}")
            return f"VARCHAR({length})"

        mapped = SCALAR_TYPE_MAP.get(registry_type)
        if mapped is None:
            raise SchemaCompileError(f"unsupported column type for {table_name}.{column_name}: {registry_type}")
        return mapped

    def _required_columns(self, table_name: str, table: dict[str, Any]) -> list[str]:
        required_columns = table.get("required_columns")
        if required_columns is None:
            required_columns = table.get("not_null_columns", [])
        if required_columns is None:
            return []
        if not isinstance(required_columns, list):
            raise SchemaCompileError(f"{table_name}.required_columns must be a list")
        return [
            self._require_identifier(column_name, f"{table_name}.required_columns")
            for column_name in required_columns
        ]

    def _primary_key(self, table_name: str, table: dict[str, Any]) -> str | None:
        raw_primary_key = table.get("primary_key")
        if raw_primary_key is None:
            return None
        if not isinstance(raw_primary_key, str):
            raise SchemaCompileError(f"{table_name}.primary_key must be a string")
        return self._require_identifier(raw_primary_key, f"{table_name}.primary_key")

    def _with_not_null(self, column: ColumnDefinition) -> ColumnDefinition:
        constraints = column.constraints
        constraints_upper = constraints.upper()
        if "NOT NULL" in constraints_upper or "PRIMARY KEY" in constraints_upper:
            return column
        if not constraints:
            return ColumnDefinition(column.name, column.sql_type, "NOT NULL")
        default_index = constraints_upper.find("DEFAULT")
        if default_index >= 0:
            updated_constraints = (
                f"{constraints[:default_index].rstrip()} NOT NULL {constraints[default_index:].lstrip()}"
            )
        else:
            updated_constraints = f"{constraints} NOT NULL"
        return ColumnDefinition(column.name, column.sql_type, updated_constraints)

    def _with_primary_key(self, column: ColumnDefinition) -> ColumnDefinition:
        constraints_upper = column.constraints.upper()
        if "PRIMARY KEY" in constraints_upper:
            return self._with_not_null(column)
        constraints = self._with_not_null(column).constraints
        updated_constraints = f"{constraints} PRIMARY KEY".strip()
        updated_constraints = re.sub(r"\s+", " ", updated_constraints)
        return ColumnDefinition(column.name, column.sql_type, updated_constraints)

    def _compile_indexes(self, table: dict[str, Any]) -> str:
        table_name = self._require_identifier(table.get("table"), "table")
        indexes = table.get("indexes", [])
        if indexes is None:
            return ""
        if not isinstance(indexes, list):
            raise SchemaCompileError(f"{table_name}.indexes must be a list")

        statements: list[str] = []
        for constraint in self._unique_constraints(table_name, table):
            index_name = constraint["name"]
            rendered_columns = constraint["columns"]
            statements.append(
                f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} ON {table_name} ({', '.join(rendered_columns)});"
            )

        for item in indexes:
            if not isinstance(item, dict):
                raise SchemaCompileError(f"{table_name}.indexes must contain mappings")
            index_name = self._require_identifier(item.get("name"), f"{table_name}.index.name")
            columns = item.get("columns")
            if not isinstance(columns, list) or not columns:
                raise SchemaCompileError(f"{table_name}.{index_name} must include columns")
            rendered_columns = [self._require_identifier(column, f"{table_name}.{index_name}.column") for column in columns]
            unique = "UNIQUE " if item.get("unique") is True else ""
            statements.append(
                f"CREATE {unique}INDEX IF NOT EXISTS {index_name} ON {table_name} ({', '.join(rendered_columns)});"
            )
        return "\n".join(statements)

    def _unique_constraints(self, table_name: str, table: dict[str, Any]) -> list[dict[str, Any]]:
        constraints = table.get("unique_constraints", [])
        if constraints is None:
            return []
        if not isinstance(constraints, list):
            raise SchemaCompileError(f"{table_name}.unique_constraints must be a list")

        compiled: list[dict[str, Any]] = []
        for item in constraints:
            if not isinstance(item, dict):
                raise SchemaCompileError(f"{table_name}.unique_constraints must contain mappings")
            columns = item.get("columns")
            if not isinstance(columns, list) or not columns:
                raise SchemaCompileError(f"{table_name}.unique_constraints must include columns")
            rendered_columns = [
                self._require_identifier(column, f"{table_name}.unique_constraints.column")
                for column in columns
            ]
            raw_name = item.get("name")
            index_name = (
                self._require_identifier(raw_name, f"{table_name}.unique_constraints.name")
                if raw_name is not None
                else self._generated_unique_constraint_name(table_name, rendered_columns)
            )
            compiled.append({"name": index_name, "columns": rendered_columns})
        return compiled

    def _generated_unique_constraint_name(self, table_name: str, columns: list[str]) -> str:
        return f"uk_{table_name}_{'_'.join(columns)}"

    def _require_identifier(self, value: Any, context: str) -> str:
        if not isinstance(value, str) or not IDENTIFIER_PATTERN.match(value):
            raise SchemaCompileError(f"invalid identifier for {context}: {value}")
        return value


def main() -> int:
    parser = argparse.ArgumentParser(description="Compile sdkwork-clawrouter Schema Registry to PostgreSQL DDL.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="output SQL path; defaults to generated/schema/postgres/schema.sql",
    )
    parser.add_argument("--check", action="store_true", help="validate that the generated SQL file is current")
    args = parser.parse_args()

    compiler = SchemaCompiler(root=args.root, registry_path=args.registry)
    if args.check:
        result = compiler.check_postgres(args.output)
        if result.ok:
            print("PostgreSQL schema is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = compiler.write_postgres(args.output)
    print(f"Wrote PostgreSQL schema to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
