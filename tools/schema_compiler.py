from __future__ import annotations

import argparse
import hashlib
import json
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

SQLITE_SCALAR_TYPE_MAP = {
    "text": "TEXT",
    "json": "TEXT",
    "bool": "INTEGER",
    "int32": "INTEGER",
    "enum_int32": "INTEGER",
    "int64": "INTEGER",
    # NUMERIC affinity coerces decimal strings to INTEGER/REAL and silently
    # loses precision. SQLite therefore stores the canonical decimal wire
    # representation as exact text; arithmetic stays behind DecimalValue.
    "decimal": "TEXT",
    "instant": "TEXT",
    "date": "TEXT",
}


class SchemaCompiler:
    """Compile the effective registry into deterministic engine-specific DDL.

    The registry is the authored semantic contract.  PostgreSQL and SQLite are
    rendered independently so one engine's type syntax can never leak into the
    other engine's baseline.
    """

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def compile_postgres(self) -> str:
        return self._compile("postgres")

    def compile_sqlite(self) -> str:
        return self._compile("sqlite")

    def _compile(self, dialect: str) -> str:
        if dialect not in {"postgres", "sqlite"}:
            raise SchemaCompileError(f"unsupported SQL dialect: {dialect}")
        registry = self._load_registry()
        tables = registry.get("tables", [])
        if not isinstance(tables, list):
            raise SchemaCompileError("tables must be a list")

        schema_registry = registry.get("schema_registry", {})
        if not isinstance(schema_registry, dict):
            schema_registry = {}
        common_column_groups = schema_registry.get("common_column_groups", {})
        if not isinstance(common_column_groups, dict):
            common_column_groups = {}
        profile_policies = schema_registry.get("table_profile_policies", {})
        if not isinstance(profile_policies, dict):
            profile_policies = {}

        registry_version = schema_registry.get("version", "unknown")
        registry_payload = json.dumps(registry, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        registry_hash = hashlib.sha256(registry_payload.encode("utf-8")).hexdigest()
        statements: list[str] = [
            "-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.\n"
            f"-- Registry version: {registry_version}.\n"
            f"-- Registry SHA-256: {registry_hash}.\n"
            f"-- Dialect: {dialect}.\n"
            "-- Materialize: python -B -m tools.schema_compiler --dialect all --materialize.\n"
            "-- Do not edit by hand; update Schema Registry and regenerate."
        ]

        generated_tables = self._generated_tables_in_dependency_order(tables)
        for table in generated_tables:
            policy = self.resolve_table_policy(table, profile_policies)
            columns = self._collect_columns(table, common_column_groups, dialect)
            self._validate_lifecycle_contract(table, set(columns))
            statements.append(self._compile_table(table, dialect, policy, columns))
            index_sql = self._compile_indexes(table, dialect, policy, set(columns))
            if index_sql:
                statements.append(index_sql)

        if not generated_tables:
            raise SchemaCompileError(
                "schema registry does not contain any project-generated tables; "
                "check table_fragments and generated_by_this_project flags"
            )

        return "\n\n".join(statement for statement in statements if statement).rstrip() + "\n"

    def write_postgres(self, output_path: Path | None = None) -> Path:
        return self.write_dialect("postgres", output_path)

    def write_sqlite(self, output_path: Path | None = None) -> Path:
        return self.write_dialect("sqlite", output_path)

    def write_dialect(self, dialect: str, output_path: Path | None = None) -> Path:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / dialect / "schema.sql"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self._compile(dialect), encoding="utf-8")
        return target

    def write_baseline(self, dialect: str) -> Path:
        target = (
            self.root
            / "database"
            / "ddl"
            / "baseline"
            / dialect
            / "0001_clawrouter_baseline.sql"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self._compile(dialect), encoding="utf-8")
        return target

    def materialize(self, dialect: str) -> tuple[Path, Path]:
        return self.write_dialect(dialect), self.write_baseline(dialect)

    def check_postgres(self, output_path: Path | None = None) -> SchemaCompileCheckResult:
        return self.check_dialect("postgres", output_path)

    def check_sqlite(self, output_path: Path | None = None) -> SchemaCompileCheckResult:
        return self.check_dialect("sqlite", output_path)

    def check_dialect(self, dialect: str, output_path: Path | None = None) -> SchemaCompileCheckResult:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / dialect / "schema.sql"
        )
        expected = self._compile(dialect)
        if not target.exists():
            return SchemaCompileCheckResult(ok=False, messages=[f"{dialect} schema is missing: {target}"])

        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return SchemaCompileCheckResult(ok=False, messages=[f"{dialect} schema is stale: {target}"])

        return SchemaCompileCheckResult(ok=True, messages=[])

    def check_baseline(self, dialect: str) -> SchemaCompileCheckResult:
        target = (
            self.root
            / "database"
            / "ddl"
            / "baseline"
            / dialect
            / "0001_clawrouter_baseline.sql"
        )
        expected = self._compile(dialect)
        if not target.exists():
            return SchemaCompileCheckResult(
                ok=False,
                messages=[f"{dialect} baseline is missing: {target}"],
            )
        if target.read_text(encoding="utf-8") != expected:
            return SchemaCompileCheckResult(
                ok=False,
                messages=[f"{dialect} baseline is stale: {target}"],
            )
        return SchemaCompileCheckResult(ok=True, messages=[])

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _generated_tables_in_dependency_order(
        self,
        tables: list[Any],
    ) -> list[dict[str, Any]]:
        generated_tables: OrderedDict[str, dict[str, Any]] = OrderedDict()
        for table in tables:
            if not isinstance(table, dict) or table.get("generated_by_this_project") is False:
                continue
            table_name = self._require_identifier(table.get("table"), "table")
            if table_name in generated_tables:
                raise SchemaCompileError(f"duplicate generated table: {table_name}")
            generated_tables[table_name] = table

        dependencies: dict[str, list[str]] = {}
        for table_name, table in generated_tables.items():
            table_dependencies: list[str] = []
            foreign_keys = table.get("foreign_keys", []) or []
            if not isinstance(foreign_keys, list):
                raise SchemaCompileError(f"{table_name}.foreign_keys must be a list")
            for foreign_key in foreign_keys:
                if not isinstance(foreign_key, dict):
                    continue
                reference_table = foreign_key.get("references_table")
                if (
                    isinstance(reference_table, str)
                    and reference_table != table_name
                    and reference_table in generated_tables
                    and reference_table not in table_dependencies
                ):
                    table_dependencies.append(reference_table)
            dependencies[table_name] = table_dependencies

        ordered: list[dict[str, Any]] = []
        states: dict[str, int] = {}
        stack: list[str] = []

        def visit(table_name: str) -> None:
            state = states.get(table_name, 0)
            if state == 2:
                return
            if state == 1:
                cycle_start = stack.index(table_name)
                cycle = [*stack[cycle_start:], table_name]
                raise SchemaCompileError(
                    f"generated table foreign key dependency cycle: {' -> '.join(cycle)}"
                )

            states[table_name] = 1
            stack.append(table_name)
            for dependency in dependencies[table_name]:
                visit(dependency)
            stack.pop()
            states[table_name] = 2
            ordered.append(generated_tables[table_name])

        for table_name in generated_tables:
            visit(table_name)
        return ordered

    def _compile_table(
        self,
        table: dict[str, Any],
        dialect: str,
        policy: dict[str, Any],
        columns: OrderedDict[str, ColumnDefinition],
    ) -> str:
        table_name = self._require_identifier(table.get("table"), "table")
        lifecycle = table.get("lifecycle")
        lifecycle_partition = lifecycle.get("partition_by") if isinstance(lifecycle, dict) else None
        if table.get("partition_by") or lifecycle_partition:
            raise SchemaCompileError(
                f"{table_name}.partition_by is not supported in the portable baseline; "
                "model partitioning in a reviewed engine-specific migration"
            )
        if not columns:
            raise SchemaCompileError(f"{table_name} must define at least one column")

        rendered_entries = [column.render() for column in columns.values()]
        rendered_entries.extend(self._compile_table_constraints(table, dialect, policy, set(columns)))
        lines = [f"CREATE TABLE IF NOT EXISTS {table_name} ("]
        for index, entry_sql in enumerate(rendered_entries):
            suffix = "," if index < len(rendered_entries) - 1 else ""
            lines.append(f"    {entry_sql}{suffix}")
        lines.append(");")
        return "\n".join(lines)

    def _collect_columns(
        self,
        table: dict[str, Any],
        common_column_groups: dict[str, Any],
        dialect: str,
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
                definition = self._common_column_definition(column_name, dialect)
                if definition is None:
                    raise SchemaCompileError(f"unsupported common column for {table_name}: {column_name}")
                collected[column_name] = definition

        explicit_columns = table.get("columns", {})
        if explicit_columns is None:
            explicit_columns = {}
        if not isinstance(explicit_columns, dict):
            raise SchemaCompileError(f"{table_name}.columns must be a mapping")

        for column_name, registry_type in explicit_columns.items():
            column = self._compile_column(table_name, column_name, registry_type, dialect)
            if column.name in collected:
                raise SchemaCompileError(
                    f"{table_name}.{column.name} duplicates common column from {group_name}; "
                    "remove it from explicit columns"
                )
            collected[column.name] = column

        for column_name in self._required_columns(table_name, table):
            column = collected.get(column_name)
            if column is None:
                raise SchemaCompileError(f"{table_name}.required_columns references unknown column: {column_name}")
            collected[column_name] = self._with_not_null(column)

        sqlite_id = collected.get("id")
        if (
            dialect == "sqlite"
            and sqlite_id is not None
            and sqlite_id.sql_type == "INTEGER"
            and "PRIMARY KEY" in sqlite_id.constraints.upper()
        ):
            collected["id"] = ColumnDefinition(
                sqlite_id.name,
                "BIGINT",
                sqlite_id.constraints,
            )

        primary_key = self._primary_key(table_name, table)
        if primary_key:
            column = collected.get(primary_key)
            if column is None:
                raise SchemaCompileError(f"{table_name}.primary_key references unknown column: {primary_key}")
            collected[primary_key] = self._with_primary_key(column)

        return collected

    def _compile_column(
        self,
        table_name: str,
        column_name: Any,
        registry_type: Any,
        dialect: str,
    ) -> ColumnDefinition:
        name = self._require_identifier(column_name, f"{table_name}.column")
        constraints = ""
        if isinstance(registry_type, dict):
            constraints = self._compile_column_constraints(table_name, name, registry_type, dialect)
            registry_type = registry_type.get("type")
        if not isinstance(registry_type, str):
            raise SchemaCompileError(f"{table_name}.{name} type must be a string")

        sql_type = self._map_type(table_name, name, registry_type, dialect)
        return ColumnDefinition(name=name, sql_type=sql_type, constraints=constraints)

    def _compile_column_constraints(
        self,
        table_name: str,
        column_name: str,
        column: dict[str, Any],
        dialect: str,
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
        if dialect == "sqlite":
            constraints = re.sub(r"::jsonb\b", "", constraints, flags=re.IGNORECASE)
            constraints = re.sub(r"::json\b", "", constraints, flags=re.IGNORECASE)
        return constraints.strip()

    def _map_type(self, table_name: str, column_name: str, registry_type: str, dialect: str) -> str:
        string_match = STRING_TYPE_PATTERN.match(registry_type)
        if string_match:
            length = int(string_match.group(1))
            if length <= 0:
                raise SchemaCompileError(f"invalid string length for {table_name}.{column_name}: {registry_type}")
            return f"VARCHAR({length})"

        scalar_map = SCALAR_TYPE_MAP if dialect == "postgres" else SQLITE_SCALAR_TYPE_MAP
        mapped = scalar_map.get(registry_type)
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
        if isinstance(raw_primary_key, list):
            return None
        if not isinstance(raw_primary_key, str):
            raise SchemaCompileError(f"{table_name}.primary_key must be a string or list")
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

    def _compile_indexes(
        self,
        table: dict[str, Any],
        dialect: str,
        policy: dict[str, Any],
        column_names: set[str],
    ) -> str:
        table_name = self._require_identifier(table.get("table"), "table")
        soft_delete_policy = policy.get("soft_delete_policy")
        if soft_delete_policy not in {None, "active_unique", "full_lifecycle_unique"}:
            raise SchemaCompileError(
                f"{table_name}.soft_delete_policy must be active_unique or "
                "full_lifecycle_unique"
            )
        indexes = table.get("indexes", [])
        if indexes is None:
            return ""
        if not isinstance(indexes, list):
            raise SchemaCompileError(f"{table_name}.indexes must be a list")

        statements: list[str] = []
        for constraint in self._unique_constraints(table_name, table):
            index_name = constraint["name"]
            rendered_columns = constraint["columns"]
            if constraint.get("where") is None and soft_delete_policy == "active_unique":
                if "deleted_at" not in column_names:
                    raise SchemaCompileError(
                        f"{table_name} uses active_unique but does not define deleted_at"
                    )
                constraint["where"] = "deleted_at IS NULL"
            where = self._index_where(constraint, table_name, index_name)
            statements.append(
                f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} ON {table_name} "
                f"({', '.join(rendered_columns)}){where};"
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
            where = self._index_where(item, table_name, index_name)
            statements.append(
                f"CREATE {unique}INDEX IF NOT EXISTS {index_name} ON {table_name} "
                f"({', '.join(rendered_columns)}){where};"
            )
        return "\n".join(statements)

    def _compile_table_constraints(
        self,
        table: dict[str, Any],
        dialect: str,
        policy: dict[str, Any],
        column_names: set[str],
    ) -> list[str]:
        table_name = self._require_identifier(table.get("table"), "table")
        constraints: list[str] = []
        primary_key = table.get("primary_key")
        if isinstance(primary_key, list):
            columns = [self._require_identifier(column, f"{table_name}.primary_key.column") for column in primary_key]
            if not columns:
                raise SchemaCompileError(f"{table_name}.primary_key must include columns")
            constraints.append(f"PRIMARY KEY ({', '.join(columns)})")
        elif primary_key is not None and not isinstance(primary_key, str):
            raise SchemaCompileError(f"{table_name}.primary_key must be a string or list")

        tenant_scope = policy.get("tenant_scope")
        if "tenant_id" in column_names and "organization_id" in column_names:
            if tenant_scope == "tenant_required":
                constraints.append(
                    f"CONSTRAINT ck_{table_name}_tenant_scope "
                    "CHECK (tenant_id > 0 AND organization_id >= 0)"
                )
            elif tenant_scope in {"tenant_with_global_fallback", "tenant_optional"}:
                constraints.append(
                    f"CONSTRAINT ck_{table_name}_tenant_scope "
                    "CHECK (tenant_id >= 0 AND organization_id >= 0 "
                    "AND (tenant_id > 0 OR organization_id = 0))"
                )
            elif tenant_scope is not None:
                raise SchemaCompileError(f"unsupported tenant_scope for {table_name}: {tenant_scope}")

        if dialect == "sqlite":
            for column_name in self._decimal_columns(table_name, table):
                if column_name not in column_names:
                    raise SchemaCompileError(
                        f"{table_name} decimal contract references unknown column: {column_name}"
                    )
                unsigned_value = f"ltrim({column_name}, '-')"
                digit_count = f"length(replace(replace({column_name}, '-', ''), '.', ''))"
                decimal_point_count = (
                    f"length({column_name}) - length(replace({column_name}, '.', ''))"
                )
                fractional_digits = (
                    f"CASE WHEN instr({column_name}, '.') = 0 THEN 0 "
                    f"ELSE length({column_name}) - instr({column_name}, '.') END"
                )
                constraints.append(
                    f"CONSTRAINT ck_{table_name}_{column_name}_decimal CHECK ("
                    f"{column_name} IS NULL OR ("
                    f"typeof({column_name}) = 'text' "
                    f"AND length({column_name}) BETWEEN 1 AND 40 "
                    f"AND {column_name} NOT GLOB '*[^0-9.-]*' "
                    f"AND {column_name} GLOB '*[0-9]*' "
                    f"AND (instr({column_name}, '-') = 0 OR "
                    f"(substr({column_name}, 1, 1) = '-' "
                    f"AND instr(substr({column_name}, 2), '-') = 0)) "
                    f"AND {decimal_point_count} <= 1 "
                    f"AND substr({unsigned_value}, 1, 1) <> '.' "
                    f"AND substr({column_name}, -1, 1) <> '.' "
                    f"AND {digit_count} <= 38 "
                    f"AND {fractional_digits} <= 12 "
                    f"AND (length({unsigned_value}) = 1 "
                    f"OR substr({unsigned_value}, 1, 1) <> '0' "
                    f"OR substr({unsigned_value}, 2, 1) = '.')"
                    f"))"
                )

        for item in table.get("foreign_keys", []) or []:
            if not isinstance(item, dict):
                raise SchemaCompileError(f"{table_name}.foreign_keys must contain mappings")
            name = self._require_identifier(item.get("name"), f"{table_name}.foreign_key.name")
            columns = item.get("columns")
            references_columns = item.get("references_columns")
            if not isinstance(columns, list) or not columns:
                raise SchemaCompileError(f"{table_name}.{name} must include columns")
            if not isinstance(references_columns, list) or len(references_columns) != len(columns):
                raise SchemaCompileError(f"{table_name}.{name} references_columns must match columns")
            reference_table = self._require_identifier(item.get("references_table"), f"{table_name}.{name}.references_table")
            rendered_columns = [self._require_identifier(column, f"{table_name}.{name}.column") for column in columns]
            rendered_references = [self._require_identifier(column, f"{table_name}.{name}.references_column") for column in references_columns]
            on_delete = self._foreign_key_action(item.get("on_delete"), f"{table_name}.{name}.on_delete")
            on_update = self._foreign_key_action(item.get("on_update"), f"{table_name}.{name}.on_update")
            statement = (
                f"CONSTRAINT {name} FOREIGN KEY ({', '.join(rendered_columns)}) "
                f"REFERENCES {reference_table} ({', '.join(rendered_references)})"
            )
            if on_delete:
                statement += f" ON DELETE {on_delete}"
            if on_update:
                statement += f" ON UPDATE {on_update}"
            constraints.append(statement)

        for item in table.get("check_constraints", []) or []:
            if not isinstance(item, dict):
                raise SchemaCompileError(f"{table_name}.check_constraints must contain mappings")
            name = self._require_identifier(item.get("name"), f"{table_name}.check.name")
            expression = item.get("expression")
            if not isinstance(expression, str) or not expression.strip():
                raise SchemaCompileError(f"{table_name}.{name}.expression must be a non-empty string")
            expression = expression.strip()
            if ";" in expression or "--" in expression or "/*" in expression or "*/" in expression:
                raise SchemaCompileError(f"{table_name}.{name}.expression contains unsafe SQL")
            constraints.append(f"CONSTRAINT {name} CHECK ({expression})")
        return constraints

    def _decimal_columns(self, table_name: str, table: dict[str, Any]) -> list[str]:
        columns = table.get("columns", {}) or {}
        if not isinstance(columns, dict):
            raise SchemaCompileError(f"{table_name}.columns must be a mapping")
        decimal_columns: list[str] = []
        for column_name, registry_type in columns.items():
            if isinstance(registry_type, dict):
                registry_type = registry_type.get("type")
            if registry_type == "decimal":
                decimal_columns.append(
                    self._require_identifier(column_name, f"{table_name}.decimal_column")
                )
        return decimal_columns

    @staticmethod
    def resolve_table_policy(
        table: dict[str, Any],
        profile_policies: dict[str, Any],
    ) -> dict[str, Any]:
        policy: dict[str, Any] = {}
        profile = table.get("profile")
        if isinstance(profile, str):
            profile_policy = profile_policies.get(profile)
            if isinstance(profile_policy, dict):
                policy.update(profile_policy)
        for key in ("tenant_scope", "soft_delete_policy"):
            if key in table:
                policy[key] = table[key]
        return policy

    def _validate_lifecycle_contract(self, table: dict[str, Any], column_names: set[str]) -> None:
        """Require a bounded, auditable cleanup contract for retention-bearing tables."""
        if "retention_until" not in column_names:
            return

        table_name = self._require_identifier(table.get("table"), "table")
        if "legal_hold" not in column_names:
            raise SchemaCompileError(
                f"{table_name} has retention_until but no legal_hold column"
            )

        lifecycle = table.get("lifecycle")
        if not isinstance(lifecycle, dict):
            raise SchemaCompileError(
                f"{table_name} has retention_until but no lifecycle contract"
            )
        if (
            not isinstance(lifecycle.get("storage_strategy"), str)
            or not lifecycle["storage_strategy"].strip()
        ):
            raise SchemaCompileError(f"{table_name}.lifecycle.storage_strategy is required")

        retention = lifecycle.get("retention")
        if not isinstance(retention, dict):
            raise SchemaCompileError(f"{table_name}.lifecycle.retention is required")
        for key in ("online_retention", "archive_retention", "grace_period"):
            value = retention.get(key)
            if not isinstance(value, str) or not value.strip():
                raise SchemaCompileError(
                    f"{table_name}.lifecycle.retention.{key} is required"
                )

        cleanup = lifecycle.get("cleanup")
        if not isinstance(cleanup, dict):
            raise SchemaCompileError(f"{table_name}.lifecycle.cleanup is required")
        owner = cleanup.get("owner")
        if not isinstance(owner, str) or not owner.strip():
            raise SchemaCompileError(f"{table_name}.lifecycle.cleanup.owner is required")
        if cleanup.get("scope") != "platform_cross_tenant":
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.scope must be platform_cross_tenant"
            )
        authorization = cleanup.get("authorization")
        if not isinstance(authorization, dict):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.authorization is required"
            )
        if authorization.get("mode") != "service_identity":
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.authorization.mode must be service_identity"
            )
        if authorization.get("service") != owner:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.authorization.service must match cleanup owner"
            )
        if authorization.get("audit_required") is not True:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.authorization.audit_required must be true"
            )

        candidate_recheck = cleanup.get("candidate_recheck")
        if not isinstance(candidate_recheck, dict):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.candidate_recheck is required"
            )
        if candidate_recheck.get("required") is not True:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.candidate_recheck.required must be true"
            )
        operations = candidate_recheck.get("operations")
        if (
            not isinstance(operations, list)
            or not all(isinstance(operation, str) for operation in operations)
            or set(operations) != {"archive", "delete"}
        ):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.candidate_recheck.operations must contain archive and delete"
            )
        recheck_columns = ["tenant_id", "organization_id", "id"]
        if not set(recheck_columns).issubset(column_names):
            raise SchemaCompileError(
                f"{table_name} must define tenant_id, organization_id, and id for lifecycle recheck"
            )
        if candidate_recheck.get("key_columns") != [
            "tenant_id",
            "organization_id",
            "id",
        ]:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.candidate_recheck.key_columns must be "
                "tenant_id, organization_id, id"
            )
        batch_size = cleanup.get("batch_size")
        if isinstance(batch_size, bool) or not isinstance(batch_size, int) or batch_size <= 0:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.batch_size must be a positive integer"
            )
        predicate = cleanup.get("predicate")
        if (
            not isinstance(predicate, str)
            or not re.search(
                r"\bretention_until\s*<=\s*:now\b",
                predicate,
                flags=re.IGNORECASE,
            )
            or not re.search(r"\blegal_hold\s*=\s*false\b", predicate, flags=re.IGNORECASE)
        ):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.predicate must enforce legal_hold = false"
            )
        if cleanup.get("archive_before_delete") is not True:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.archive_before_delete must be true"
            )

        retry = cleanup.get("retry")
        if not isinstance(retry, dict):
            raise SchemaCompileError(f"{table_name}.lifecycle.cleanup.retry is required")
        max_attempts = retry.get("max_attempts")
        if isinstance(max_attempts, bool) or not isinstance(max_attempts, int) or max_attempts <= 0:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.retry.max_attempts must be a positive integer"
            )
        backoff = retry.get("backoff")
        if not isinstance(backoff, dict):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.retry.backoff is required"
            )
        for key in ("strategy", "initial", "maximum"):
            value = backoff.get(key)
            if not isinstance(value, str) or not value.strip():
                raise SchemaCompileError(
                    f"{table_name}.lifecycle.cleanup.retry.backoff.{key} is required"
                )

        monitoring = cleanup.get("monitoring")
        if not isinstance(monitoring, dict):
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.monitoring is required"
            )
        for key in ("metrics", "alerts"):
            values = monitoring.get(key)
            if not isinstance(values, list) or not values or not all(
                isinstance(value, str) and value.strip() for value in values
            ):
                raise SchemaCompileError(
                    f"{table_name}.lifecycle.cleanup.monitoring.{key} must be a non-empty string list"
                )

        dry_run = cleanup.get("dry_run")
        if not isinstance(dry_run, dict) or dry_run.get("supported") is not True:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.dry_run.supported must be true"
            )
        if dry_run.get("default") is not True:
            raise SchemaCompileError(
                f"{table_name}.lifecycle.cleanup.dry_run.default must be true"
            )

        indexes = table.get("indexes") or []
        has_retention_index = any(
            isinstance(index, dict)
            and index.get("columns") == ["retention_until", "id"]
            for index in indexes
        )
        if not has_retention_index:
            raise SchemaCompileError(
                f"{table_name} must define an index on (retention_until, id)"
            )

    @staticmethod
    def _foreign_key_action(value: Any, context: str) -> str:
        if value is None:
            return ""
        if not isinstance(value, str) or value.upper() not in {"RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT", "NO ACTION"}:
            raise SchemaCompileError(f"invalid foreign key action for {context}: {value}")
        return value.upper()

    @staticmethod
    def _index_where(item: dict[str, Any], table_name: str, index_name: str) -> str:
        value = item.get("where")
        if value is None:
            return ""
        if not isinstance(value, str) or not value.strip():
            raise SchemaCompileError(f"{table_name}.{index_name}.where must be a non-empty string")
        value = value.strip()
        if ";" in value or "--" in value or "/*" in value or "*/" in value:
            raise SchemaCompileError(f"{table_name}.{index_name}.where contains unsafe SQL")
        return f" WHERE {value}"

    @staticmethod
    def _common_column_definition(column_name: str, dialect: str) -> ColumnDefinition | None:
        definition = COMMON_COLUMN_DEFINITIONS.get(column_name)
        if definition is None:
            return None
        if dialect == "postgres":
            return definition
        if definition.name == "id":
            return ColumnDefinition(definition.name, "BIGINT", definition.constraints)
        sqlite_types = {
            "BIGINT": "INTEGER",
            "INTEGER": "INTEGER",
            "VARCHAR(64)": "TEXT",
            "VARCHAR(128)": "TEXT",
            "TIMESTAMPTZ": "TEXT",
            "JSONB": "TEXT",
            "BOOLEAN": "INTEGER",
        }
        sql_type = sqlite_types.get(definition.sql_type, definition.sql_type)
        constraints = definition.constraints
        constraints = re.sub(r"::jsonb\b", "", constraints, flags=re.IGNORECASE)
        constraints = re.sub(r"::json\b", "", constraints, flags=re.IGNORECASE)
        return ColumnDefinition(definition.name, sql_type, constraints.strip())

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
            compiled.append(
                {
                    "name": index_name,
                    "columns": rendered_columns,
                    "where": item.get("where"),
                }
            )
        return compiled

    def _generated_unique_constraint_name(self, table_name: str, columns: list[str]) -> str:
        return f"uk_{table_name}_{'_'.join(columns)}"

    def _require_identifier(self, value: Any, context: str) -> str:
        if not isinstance(value, str) or not IDENTIFIER_PATTERN.match(value):
            raise SchemaCompileError(f"invalid identifier for {context}: {value}")
        return value


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compile sdkwork-clawrouter Schema Registry to engine-specific DDL."
    )
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="output SQL path; valid only for one dialect",
    )
    parser.add_argument(
        "--dialect",
        choices=("postgres", "sqlite", "all"),
        default="postgres",
        help="SQL dialect to render; default is postgres",
    )
    parser.add_argument(
        "--materialize",
        action="store_true",
        help="write or check both generated schema and canonical baseline",
    )
    parser.add_argument("--check", action="store_true", help="validate that generated SQL files are current")
    args = parser.parse_args()

    compiler = SchemaCompiler(root=args.root, registry_path=args.registry)
    if args.output is not None and (args.dialect == "all" or args.materialize):
        parser.error("--output cannot be combined with --dialect all or --materialize")

    dialects = ("postgres", "sqlite") if args.dialect == "all" else (args.dialect,)
    if args.check:
        messages: list[str] = []
        for dialect in dialects:
            result = compiler.check_dialect(dialect, args.output)
            messages.extend(result.messages)
            if args.materialize:
                messages.extend(compiler.check_baseline(dialect).messages)
        if messages:
            for message in messages:
                print(message)
            return 1
        print(f"{', '.join(dialects)} schema is current")
        return 0

    for dialect in dialects:
        if args.materialize:
            generated, baseline = compiler.materialize(dialect)
            print(f"Wrote {dialect} schema to {generated}")
            print(f"Wrote {dialect} baseline to {baseline}")
        else:
            output = compiler.write_dialect(dialect, args.output)
            print(f"Wrote {dialect} schema to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
