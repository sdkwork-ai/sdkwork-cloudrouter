from __future__ import annotations

import argparse
import re
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
class FlywayIndex:
    table: str
    name: str
    columns: list[str]
    unique: bool
    method: str | None


@dataclass(frozen=True)
class FlywayForeignKey:
    table: str
    name: str | None
    columns: list[str]
    references_table: str
    references_columns: list[str]


@dataclass(frozen=True)
class FlywayColumn:
    name: str
    sql_type: str
    not_null: bool
    unique: bool
    references_table: str | None
    references_columns: list[str]


@dataclass(frozen=True)
class FlywayTable:
    name: str
    columns: dict[str, FlywayColumn]
    unique_constraints: list[list[str]]
    foreign_keys: list[FlywayForeignKey]


@dataclass(frozen=True)
class FlywaySchemaContractAuditResult:
    ok: bool
    messages: list[str]


class FlywaySchemaContractAudit:
    """Validate registered legacy table contracts against upstream Flyway DDL."""

    IDENTIFIER_PATTERN = r'(?:[a-zA-Z_][a-zA-Z0-9_]*|"[^"]+"|`[^`]+`|\[[^\]]+\])'
    QUALIFIED_IDENTIFIER_PATTERN = rf"{IDENTIFIER_PATTERN}(?:\s*\.\s*{IDENTIFIER_PATTERN})?"
    COMMON_NOT_NULL_COLUMNS = {
        "id",
        "uuid",
        "created_at",
        "updated_at",
        "v",
        "tenant_id",
        "organization_id",
        "data_scope",
    }
    CREATE_TABLE_PATTERN = re.compile(
        rf"""
        CREATE\s+TABLE\s+
        (?:IF\s+NOT\s+EXISTS\s+)?
        (?P<table>{QUALIFIED_IDENTIFIER_PATTERN})\s*
        \(
        """,
        flags=re.IGNORECASE | re.VERBOSE | re.DOTALL,
    )
    CREATE_INDEX_PATTERN = re.compile(
        rf"""
        CREATE\s+
        (?P<unique>UNIQUE\s+)?
        INDEX\s+
        (?:CONCURRENTLY\s+)?
        (?:IF\s+NOT\s+EXISTS\s+)?
        (?P<name>{QUALIFIED_IDENTIFIER_PATTERN})\s+
        ON\s+
        (?:ONLY\s+)?
        (?P<table>{QUALIFIED_IDENTIFIER_PATTERN})\s+
        (?:USING\s+(?P<method>[a-zA-Z0-9_]+)\s+)?
        \((?P<columns>[^;]+?)\)
        """,
        flags=re.IGNORECASE | re.VERBOSE | re.DOTALL,
    )
    FOREIGN_KEY_PATTERN = re.compile(
        rf"""
        ALTER\s+TABLE\s+
        (?:IF\s+EXISTS\s+)?
        (?:ONLY\s+)?
        (?P<table>{QUALIFIED_IDENTIFIER_PATTERN})\s+
        ADD\s+CONSTRAINT\s+
        (?P<name>{IDENTIFIER_PATTERN})\s+
        FOREIGN\s+KEY\s*
        \((?P<columns>[^)]*)\)\s+
        REFERENCES\s+
        (?P<references_table>{QUALIFIED_IDENTIFIER_PATTERN})\s*
        \((?P<references_columns>[^)]*)\)
        """,
        flags=re.IGNORECASE | re.VERBOSE | re.DOTALL,
    )

    def __init__(
        self,
        root: Path,
        registry_path: Path | None = None,
        flyway_paths: list[Path] | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )
        self._explicit_flyway_paths = flyway_paths is not None
        self.flyway_paths = (
            [Path(path).resolve() for path in flyway_paths]
            if flyway_paths is not None
            else self._default_flyway_paths()
        )

    def run(self) -> FlywaySchemaContractAuditResult:
        registry = self._load_registry()
        contracts = self._registry_table_contracts(registry)
        messages: list[str] = []
        flyway_sql = self._load_flyway_sql(messages)
        if not flyway_sql:
            return FlywaySchemaContractAuditResult(ok=not messages, messages=messages)

        registered_tables = set(contracts.keys())
        for table in self._parse_create_tables(flyway_sql):
            if table.name not in registered_tables:
                continue
            contract = contracts[table.name]
            messages.extend(self._check_create_table_not_null_columns(contract, table))
            messages.extend(self._check_create_table_unique_constraints(contract, table))
            messages.extend(self._check_create_table_foreign_keys(contract, table))
            messages.extend(self._check_create_table_column_types(contract, table))
            messages.extend(self._check_create_table_column_ownership(contract, table))

        for index in self._parse_indexes(flyway_sql):
            if index.table not in registered_tables:
                continue
            if not self._has_matching_index(contracts[index.table], index):
                messages.append(self._index_message(index))

        for foreign_key in self._parse_foreign_keys(flyway_sql):
            if foreign_key.table not in registered_tables:
                continue
            if not self._has_matching_foreign_key(contracts[foreign_key.table], foreign_key):
                messages.append(self._foreign_key_message(foreign_key))

        return FlywaySchemaContractAuditResult(ok=not messages, messages=messages)

    def _default_flyway_paths(self) -> list[Path]:
        server_resources = (
            self.root.parent.parent
            / "spring-ai-plus-server-application"
            / "src"
            / "main"
            / "resources"
            / "database"
            / "postgresql"
        )
        return [
            server_resources / "V6__vip_membership.sql",
            server_resources / "feature" / "V102__commerce_trade_payment.sql",
        ]

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _registry_table_contracts(self, registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
        tables = registry.get("tables", [])
        if not isinstance(tables, list):
            return {}

        contracts: dict[str, dict[str, Any]] = {}
        for table in tables:
            if not isinstance(table, dict) or not isinstance(table.get("table"), str):
                continue
            table_name = self._normalize_identifier(table["table"])
            contracts[table_name] = {
                "indexes": self._registry_indexes(table.get("indexes")),
                "foreign_keys": self._registry_foreign_keys(table.get("foreign_keys")),
                "not_null_columns": self._normalize_column_list(table.get("not_null_columns")),
                "unique_constraints": self._registry_unique_constraints(table.get("unique_constraints")),
                "column_types": self._registry_column_types(table.get("column_types")),
                "declared_physical_columns": self._registry_declared_physical_columns(table),
            }
        return contracts

    def _registry_indexes(self, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []

        indexes: list[dict[str, Any]] = []
        for index in value:
            if not isinstance(index, dict) or not isinstance(index.get("name"), str):
                continue
            indexes.append(
                {
                    "name": self._normalize_identifier(index["name"]),
                    "columns": self._normalize_column_list(index.get("columns")),
                    "unique": index.get("unique") is True,
                    "method": self._normalize_method(index.get("method")),
                }
            )
        return indexes

    def _registry_foreign_keys(self, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []

        foreign_keys: list[dict[str, Any]] = []
        for foreign_key in value:
            if not isinstance(foreign_key, dict) or not isinstance(foreign_key.get("name"), str):
                continue
            references_table = foreign_key.get("references_table")
            if not isinstance(references_table, str):
                continue
            foreign_keys.append(
                {
                    "name": self._normalize_identifier(foreign_key["name"]),
                    "columns": self._normalize_column_list(foreign_key.get("columns")),
                    "references_table": self._normalize_identifier(references_table),
                    "references_columns": self._normalize_column_list(foreign_key.get("references_columns")),
                }
            )
        return foreign_keys

    def _registry_unique_constraints(self, value: Any) -> list[list[str]]:
        if not isinstance(value, list):
            return []

        constraints: list[list[str]] = []
        for constraint in value:
            if not isinstance(constraint, dict):
                continue
            columns = self._normalize_column_list(constraint.get("columns"))
            if columns:
                constraints.append(columns)
        return constraints

    def _registry_column_types(self, value: Any) -> dict[str, str]:
        if not isinstance(value, dict):
            return {}

        column_types: dict[str, str] = {}
        for column, sql_type in value.items():
            if isinstance(column, str) and isinstance(sql_type, str):
                column_types[self._normalize_identifier(column)] = self._normalize_sql_type(sql_type)
        return column_types

    def _registry_declared_physical_columns(self, table: dict[str, Any]) -> set[str]:
        columns: set[str] = set(self.COMMON_NOT_NULL_COLUMNS)

        explicit_columns = table.get("columns")
        if isinstance(explicit_columns, dict):
            columns.update(self._normalize_identifier(column) for column in explicit_columns.keys() if isinstance(column, str))

        physical_columns = table.get("physical_columns")
        if isinstance(physical_columns, list):
            columns.update(self._normalize_identifier(column) for column in physical_columns if isinstance(column, str))
        elif isinstance(physical_columns, dict):
            for key in (
                "own",
                "ignored",
                "projection_only_ignored",
                "unmanaged",
                "explicitly_unmanaged",
                "common",
                "base",
            ):
                columns.update(self._normalize_column_list(physical_columns.get(key)))
            inherited = physical_columns.get("inherited")
            if isinstance(inherited, list):
                columns.update(self._normalize_column_list(inherited))

        return columns

    def _load_flyway_sql(self, messages: list[str]) -> str:
        chunks: list[str] = []
        for path in self.flyway_paths:
            if not path.exists():
                if self._explicit_flyway_paths:
                    messages.append(f"Flyway file is missing: {path}")
                continue
            chunks.append(path.read_text(encoding="utf-8"))
        return "\n".join(chunks)

    def _parse_create_tables(self, sql: str) -> list[FlywayTable]:
        content = self._strip_sql_comments(sql)
        tables: list[FlywayTable] = []
        for match in self.CREATE_TABLE_PATTERN.finditer(content):
            body_start = match.end()
            body_end = self._find_matching_paren(content, body_start - 1)
            if body_end is None:
                continue
            table_name = self._normalize_identifier(match.group("table"))
            columns: dict[str, FlywayColumn] = {}
            unique_constraints: list[list[str]] = []
            foreign_keys: list[FlywayForeignKey] = []

            for definition in self._split_top_level_commas(content[body_start:body_end]):
                parsed_column = self._parse_create_table_column(definition)
                if parsed_column is not None:
                    columns[parsed_column.name] = parsed_column
                    if parsed_column.unique:
                        unique_constraints.append([parsed_column.name])
                    if parsed_column.references_table is not None:
                        foreign_keys.append(
                            FlywayForeignKey(
                                table=table_name,
                                name=None,
                                columns=[parsed_column.name],
                                references_table=parsed_column.references_table,
                                references_columns=parsed_column.references_columns or ["id"],
                            )
                        )
                    continue

                unique_columns = self._parse_create_table_unique_constraint(definition)
                if unique_columns:
                    unique_constraints.append(unique_columns)
                    continue

                table_foreign_key = self._parse_create_table_foreign_key(table_name, definition)
                if table_foreign_key is not None:
                    foreign_keys.append(table_foreign_key)

            tables.append(
                FlywayTable(
                    name=table_name,
                    columns=columns,
                    unique_constraints=unique_constraints,
                    foreign_keys=foreign_keys,
                )
            )
        return tables

    def _parse_create_table_column(self, definition: str) -> FlywayColumn | None:
        stripped = definition.strip()
        if not stripped:
            return None
        first_token = self._first_token(stripped)
        if first_token is None:
            return None
        normalized_name = self._normalize_identifier(first_token)
        if normalized_name in {"constraint", "primary", "unique", "foreign", "check", "exclude"}:
            return None

        remainder = stripped[len(first_token) :].strip()
        sql_type = self._extract_column_type(remainder)
        if not sql_type:
            return None

        references_table: str | None = None
        references_columns: list[str] = []
        reference_match = re.search(
            rf"\bREFERENCES\s+(?P<table>{self.QUALIFIED_IDENTIFIER_PATTERN})(?:\s*\((?P<columns>[^)]*)\))?",
            stripped,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if reference_match is not None:
            references_table = self._normalize_identifier(reference_match.group("table"))
            raw_reference_columns = reference_match.group("columns")
            if raw_reference_columns is not None:
                references_columns = self._parse_sql_columns(raw_reference_columns)

        return FlywayColumn(
            name=normalized_name,
            sql_type=sql_type,
            not_null=re.search(r"\bNOT\s+NULL\b", stripped, flags=re.IGNORECASE) is not None,
            unique=re.search(r"\bUNIQUE\b", stripped, flags=re.IGNORECASE) is not None,
            references_table=references_table,
            references_columns=references_columns,
        )

    def _parse_create_table_unique_constraint(self, definition: str) -> list[str]:
        match = re.search(
            r"(?:\bCONSTRAINT\s+[a-zA-Z0-9_\"`\[\]]+\s+)?\bUNIQUE\s*\((?P<columns>[^)]*)\)",
            definition,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if match is None:
            return []
        return self._parse_sql_columns(match.group("columns"))

    def _parse_create_table_foreign_key(self, table: str, definition: str) -> FlywayForeignKey | None:
        match = re.search(
            rf"""
            (?:\bCONSTRAINT\s+(?P<name>{self.IDENTIFIER_PATTERN})\s+)?
            FOREIGN\s+KEY\s*
            \((?P<columns>[^)]*)\)\s+
            REFERENCES\s+
            (?P<references_table>{self.QUALIFIED_IDENTIFIER_PATTERN})\s*
            \((?P<references_columns>[^)]*)\)
            """,
            definition,
            flags=re.IGNORECASE | re.VERBOSE | re.DOTALL,
        )
        if match is None:
            return None
        name = match.group("name")
        return FlywayForeignKey(
            table=table,
            name=self._normalize_identifier(name) if name is not None else None,
            columns=self._parse_sql_columns(match.group("columns")),
            references_table=self._normalize_identifier(match.group("references_table")),
            references_columns=self._parse_sql_columns(match.group("references_columns")),
        )

    def _check_create_table_not_null_columns(self, contract: dict[str, Any], table: FlywayTable) -> list[str]:
        not_null_columns = contract.get("not_null_columns", [])
        if not isinstance(not_null_columns, list):
            not_null_columns = []
        messages: list[str] = []
        for column in table.columns.values():
            if (
                column.not_null
                and column.name not in self.COMMON_NOT_NULL_COLUMNS
                and column.name not in not_null_columns
            ):
                messages.append(f"{table.name} registry must mirror Flyway NOT NULL column {column.name}")
        return messages

    def _check_create_table_unique_constraints(self, contract: dict[str, Any], table: FlywayTable) -> list[str]:
        registry_constraints = contract.get("unique_constraints", [])
        if not isinstance(registry_constraints, list):
            registry_constraints = []
        messages: list[str] = []
        for columns in table.unique_constraints:
            if columns and columns not in registry_constraints:
                messages.append(f"{table.name} registry must mirror Flyway unique constraint on {', '.join(columns)}")
        return messages

    def _check_create_table_foreign_keys(self, contract: dict[str, Any], table: FlywayTable) -> list[str]:
        messages: list[str] = []
        for foreign_key in table.foreign_keys:
            if not self._has_matching_foreign_key(contract, foreign_key):
                messages.append(self._foreign_key_message(foreign_key))
        return messages

    def _check_create_table_column_types(self, contract: dict[str, Any], table: FlywayTable) -> list[str]:
        column_types = contract.get("column_types", {})
        if not isinstance(column_types, dict):
            return []

        messages: list[str] = []
        for column, expected_type in column_types.items():
            if not isinstance(column, str) or not isinstance(expected_type, str):
                continue
            flyway_column = table.columns.get(column)
            if flyway_column is not None and flyway_column.sql_type != expected_type:
                messages.append(
                    f"{table.name} registry column {column} type must mirror Flyway type {flyway_column.sql_type}"
                )
        return messages

    def _check_create_table_column_ownership(self, contract: dict[str, Any], table: FlywayTable) -> list[str]:
        declared_columns = contract.get("declared_physical_columns", set())
        if not isinstance(declared_columns, set):
            declared_columns = set()

        messages: list[str] = []
        for column in table.columns:
            if column not in declared_columns:
                messages.append(f"{table.name} registry must declare Flyway physical column {column} ownership")
        return messages

    def _parse_indexes(self, sql: str) -> list[FlywayIndex]:
        content = self._strip_sql_comments(sql)
        indexes: list[FlywayIndex] = []
        for match in self.CREATE_INDEX_PATTERN.finditer(content):
            columns = self._parse_sql_columns(match.group("columns"))
            if not columns:
                continue
            indexes.append(
                FlywayIndex(
                    table=self._normalize_identifier(match.group("table")),
                    name=self._normalize_identifier(match.group("name")),
                    columns=columns,
                    unique=match.group("unique") is not None,
                    method=self._normalize_method(match.group("method")),
                )
            )
        return indexes

    def _parse_foreign_keys(self, sql: str) -> list[FlywayForeignKey]:
        content = self._strip_sql_comments(sql)
        foreign_keys: list[FlywayForeignKey] = []
        for match in self.FOREIGN_KEY_PATTERN.finditer(content):
            columns = self._parse_sql_columns(match.group("columns"))
            references_columns = self._parse_sql_columns(match.group("references_columns"))
            if not columns or not references_columns:
                continue
            foreign_keys.append(
                FlywayForeignKey(
                    table=self._normalize_identifier(match.group("table")),
                    name=self._normalize_identifier(match.group("name")),
                    columns=columns,
                    references_table=self._normalize_identifier(match.group("references_table")),
                    references_columns=references_columns,
                )
            )
        return foreign_keys

    def _has_matching_index(self, contract: dict[str, Any], expected: FlywayIndex) -> bool:
        indexes = contract.get("indexes", [])
        if not isinstance(indexes, list):
            return False
        for index in indexes:
            if not isinstance(index, dict):
                continue
            if (
                index.get("name") == expected.name
                and index.get("columns") == expected.columns
                and index.get("unique") is expected.unique
                and self._index_method_matches(index.get("method"), expected.method)
            ):
                return True
        return False

    def _has_matching_foreign_key(self, contract: dict[str, Any], expected: FlywayForeignKey) -> bool:
        foreign_keys = contract.get("foreign_keys", [])
        if not isinstance(foreign_keys, list):
            return False
        for foreign_key in foreign_keys:
            if not isinstance(foreign_key, dict):
                continue
            name_matches = expected.name is None or foreign_key.get("name") == expected.name
            if (
                name_matches
                and foreign_key.get("columns") == expected.columns
                and foreign_key.get("references_table") == expected.references_table
                and foreign_key.get("references_columns") == expected.references_columns
            ):
                return True
        return False

    def _index_method_matches(self, actual: Any, expected: str | None) -> bool:
        actual_method = actual if isinstance(actual, str) else None
        if expected is None:
            return actual_method is None or actual_method == "btree"
        return actual_method == expected

    def _index_message(self, index: FlywayIndex) -> str:
        kind = "unique index" if index.unique else "index"
        columns = ", ".join(index.columns)
        if index.method is not None:
            return f"{index.table} registry must mirror Flyway {kind} {index.name} using {index.method} on {columns}"
        return f"{index.table} registry must mirror Flyway {kind} {index.name} on {columns}"

    def _foreign_key_message(self, foreign_key: FlywayForeignKey) -> str:
        columns = ", ".join(foreign_key.columns)
        references_columns = ", ".join(foreign_key.references_columns)
        name_text = f" {foreign_key.name}" if foreign_key.name is not None else ""
        return (
            f"{foreign_key.table} registry must mirror Flyway foreign key{name_text} "
            f"on {columns} references {foreign_key.references_table}({references_columns})"
        )

    def _parse_sql_columns(self, value: str) -> list[str]:
        return [self._normalize_identifier(column) for column in value.split(",") if column.strip()]

    def _normalize_column_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [self._normalize_identifier(item) for item in value if isinstance(item, str)]

    def _normalize_identifier(self, value: str) -> str:
        normalized = value.strip().strip(";").lower()
        parts = [part.strip() for part in re.split(r"\s*\.\s*", normalized) if part.strip()]
        if parts:
            normalized = parts[-1]
        if (
            (normalized.startswith('"') and normalized.endswith('"'))
            or (normalized.startswith("`") and normalized.endswith("`"))
            or (normalized.startswith("[") and normalized.endswith("]"))
        ):
            normalized = normalized[1:-1]
        return normalized

    def _normalize_method(self, value: Any) -> str | None:
        if not isinstance(value, str) or not value.strip():
            return None
        return value.strip().lower()

    def _normalize_sql_type(self, value: str) -> str:
        normalized = re.sub(r"\s+", " ", value.strip().lower())
        normalized = re.sub(r"\s*,\s*", ",", normalized)
        normalized = re.sub(r"\(\s*", "(", normalized)
        normalized = re.sub(r"\s*\)", ")", normalized)
        return normalized

    def _strip_sql_comments(self, sql: str) -> str:
        without_block_comments = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
        return re.sub(r"--[^\n\r]*", "", without_block_comments)

    def _find_matching_paren(self, value: str, open_paren_index: int) -> int | None:
        depth = 0
        for index in range(open_paren_index, len(value)):
            char = value[index]
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    return index
        return None

    def _split_top_level_commas(self, value: str) -> list[str]:
        definitions: list[str] = []
        start = 0
        depth = 0
        for index, char in enumerate(value):
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            elif char == "," and depth == 0:
                definition = value[start:index].strip()
                if definition:
                    definitions.append(definition)
                start = index + 1
        tail = value[start:].strip()
        if tail:
            definitions.append(tail)
        return definitions

    def _first_token(self, value: str) -> str | None:
        match = re.match(self.IDENTIFIER_PATTERN, value)
        if match is None:
            return None
        return match.group(0)

    def _extract_column_type(self, value: str) -> str:
        constraint_keywords = {
            "not",
            "null",
            "default",
            "primary",
            "unique",
            "references",
            "constraint",
            "check",
            "collate",
            "generated",
        }
        tokens = self._split_sql_whitespace_tokens(value)
        type_tokens: list[str] = []
        for token in tokens:
            if token.lower() in constraint_keywords:
                break
            type_tokens.append(token)
        return self._normalize_sql_type(" ".join(type_tokens))

    def _split_sql_whitespace_tokens(self, value: str) -> list[str]:
        tokens: list[str] = []
        current: list[str] = []
        depth = 0
        for char in value:
            if char == "(":
                depth += 1
                current.append(char)
            elif char == ")":
                depth -= 1
                current.append(char)
            elif char.isspace() and depth == 0:
                if current:
                    tokens.append("".join(current))
                    current = []
            else:
                current.append(char)
        if current:
            tokens.append("".join(current))
        return tokens


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit upstream Flyway DDL against Schema Registry contracts.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument(
        "--flyway",
        type=Path,
        action="append",
        default=None,
        help="Flyway SQL file to audit; may be provided multiple times",
    )
    args = parser.parse_args()

    result = FlywaySchemaContractAudit(
        root=args.root,
        registry_path=args.registry,
        flyway_paths=args.flyway,
    ).run()
    if result.ok:
        print("Flyway schema contract audit passed")
        return 0

    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
