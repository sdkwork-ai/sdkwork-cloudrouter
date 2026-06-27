from __future__ import annotations

import argparse
import json
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
class JavaLegacyContractAuditResult:
    ok: bool
    messages: list[str]


class JavaLegacyContractAudit:
    """Extract Java-owned plus_* table contracts into a deterministic audit artifact."""

    TABLE_PATTERN = re.compile(r"@Table\s*\((?P<body>[\s\S]*?)\)\s*(?:\n|public|@)")
    NAME_PATTERN = re.compile(r'\bname\s*=\s*"([^"]+)"')
    FIELD_PATTERN = re.compile(r"private\s+[\w<>, ?.\[\]]+\s+(\w+)\s*(?:=|;)")
    COLUMN_ANNOTATION_PATTERN = re.compile(r"@(Column|JoinColumn)\b(?:\((?P<body>[\s\S]*?)\))?")

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def generate(self) -> dict[str, Any]:
        registry = self._load_registry()
        entity_map = self._legacy_entity_map(registry)
        tables: list[dict[str, Any]] = []
        messages: list[str] = []

        for table, entity in sorted(entity_map.items()):
            source = self._resolve_java_file(entity)
            if source is None:
                messages.append(f"missing Java entity for {table}: {Path(*entity.split('.')).with_suffix('.java').as_posix()}")
                continue

            parsed = self._parse_java_entity(source)
            java_table_name = parsed["java_table_name"]
            if java_table_name and java_table_name != table:
                messages.append(f"{table} Java @Table name mismatch: expected {table}, found {java_table_name}")

            tables.append(
                {
                    "table": table,
                    "entity": entity,
                    "java_file": self._display_path(source),
                    "java_table_name": java_table_name,
                    "declared_columns": parsed["declared_columns"],
                }
            )

        return {
            "summary": {
                "audited_table_count": len(tables),
                "message_count": len(messages),
            },
            "messages": messages,
            "tables": tables,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "legacy" / "java-legacy-contract-audit.json"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8")
        return target

    def validate(self) -> JavaLegacyContractAuditResult:
        audit = self.generate()
        messages = audit.get("messages", [])
        if not isinstance(messages, list):
            messages = []
        return JavaLegacyContractAuditResult(ok=not messages, messages=[m for m in messages if isinstance(m, str)])

    def check(self, output_path: Path | None = None) -> JavaLegacyContractAuditResult:
        validation = self.validate()
        if not validation.ok:
            return validation

        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "schema" / "legacy" / "java-legacy-contract-audit.json"
        )
        expected = self.render_json()
        if not target.exists():
            return JavaLegacyContractAuditResult(ok=False, messages=[f"java legacy contract audit is missing: {target}"])

        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return JavaLegacyContractAuditResult(ok=False, messages=[f"java legacy contract audit is stale: {target}"])

        return JavaLegacyContractAuditResult(ok=True, messages=[])

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _legacy_entity_map(self, registry: dict[str, Any]) -> dict[str, str]:
        entity_map: dict[str, str] = {}

        contracts = registry.get("legacy_java_contracts", {})
        if isinstance(contracts, dict):
            self._collect_contract_entities(contracts, entity_map)

        tables = registry.get("tables", [])
        if isinstance(tables, list):
            for table in tables:
                if not isinstance(table, dict):
                    continue
                table_name = table.get("table")
                java_contract = table.get("java_contract", {})
                if (
                    isinstance(table_name, str)
                    and table.get("domain") == "legacy"
                    and isinstance(java_contract, dict)
                    and isinstance(java_contract.get("entity"), str)
                ):
                    entity_map[table_name] = java_contract["entity"]

        return entity_map

    def _collect_contract_entities(self, value: Any, entity_map: dict[str, str]) -> None:
        if isinstance(value, dict):
            entities = value.get("entities")
            if isinstance(entities, dict):
                for table, entity in entities.items():
                    if isinstance(table, str) and isinstance(entity, str):
                        entity_map[table] = entity
            for nested in value.values():
                self._collect_contract_entities(nested, entity_map)
        elif isinstance(value, list):
            for item in value:
                self._collect_contract_entities(item, entity_map)

    def _resolve_java_file(self, entity: str) -> Path | None:
        relative_path = Path(*entity.split(".")).with_suffix(".java")
        for source_root in self._java_source_roots():
            candidate = source_root / relative_path
            if candidate.exists():
                return candidate.resolve()
        return None

    def _java_source_roots(self) -> list[Path]:
        module_source = Path("legacy-java-plus-entity") / "src" / "main" / "java"
        candidates = [
            self.root / module_source,
            self.root.parent / module_source,
            self.root.parent.parent / module_source,
        ]
        unique: list[Path] = []
        seen: set[Path] = set()
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved not in seen:
                unique.append(resolved)
                seen.add(resolved)
        return unique

    def _parse_java_entity(self, source: Path) -> dict[str, Any]:
        text = source.read_text(encoding="utf-8")
        java_table_name = self._parse_table_name(text)
        declared_columns = self._parse_declared_columns(text)
        return {
            "java_table_name": java_table_name,
            "declared_columns": declared_columns,
        }

    def _parse_table_name(self, text: str) -> str | None:
        match = self.TABLE_PATTERN.search(text)
        if match is None:
            return None
        name_match = self.NAME_PATTERN.search(match.group("body"))
        if name_match is None:
            return None
        return name_match.group(1)

    def _parse_declared_columns(self, text: str) -> list[str]:
        columns: list[str] = []
        seen: set[str] = set()
        for match in self.COLUMN_ANNOTATION_PATTERN.finditer(text):
            body = match.group("body") or ""
            after = text[match.end() : match.end() + 500]
            field_match = self.FIELD_PATTERN.search(after)
            explicit_name = self.NAME_PATTERN.search(body)
            if explicit_name is not None:
                column_name = explicit_name.group(1)
            elif field_match is not None:
                column_name = self._camel_to_snake(field_match.group(1))
            else:
                continue

            if column_name not in seen:
                columns.append(column_name)
                seen.add(column_name)
        return columns

    def _camel_to_snake(self, value: str) -> str:
        return re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit Java-owned legacy table contracts.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument("--output", type=Path, default=None, help="output audit JSON path")
    parser.add_argument("--check", action="store_true", help="validate that the generated audit artifact is current")
    args = parser.parse_args()

    auditor = JavaLegacyContractAudit(root=args.root, registry_path=args.registry)
    if args.check:
        result = auditor.check(args.output)
        if result.ok:
            print("Java legacy contract audit is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    validation = auditor.validate()
    if not validation.ok:
        for message in validation.messages:
            print(message)
        return 1

    output = auditor.write(args.output)
    print(f"Wrote Java legacy contract audit to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
