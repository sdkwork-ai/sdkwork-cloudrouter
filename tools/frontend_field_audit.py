from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.frontend_contract_loader import default_frontend_contract_path, load_frontend_field_contract
from tools.relay_retired_admin_surfaces import (
    is_relay_retired_admin_source,
    is_route_manifest_bootstrap_source,
)

FIELD_AUDIT_EXEMPT_SOURCE_SEGMENTS: tuple[str, ...] = (
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/",
)


def _is_field_audit_exempt_source(source: str) -> bool:
    normalized = source.replace("\\", "/")
    return any(segment in normalized for segment in FIELD_AUDIT_EXEMPT_SOURCE_SEGMENTS)

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class FrontendFieldAuditResult:
    ok: bool
    messages: list[str]


class FrontendFieldAudit:
    """Audit portal service/data TypeScript view models against schema field contracts."""

    SOURCE_EXCLUDED_DIRECTORIES = frozenset(
        {
            ".git",
            ".turbo",
            ".vite",
            "coverage",
            "dist",
            "node_modules",
        }
    )
    EXPORTED_INTERFACE_PATTERN = re.compile(r"export\s+interface\s+(\w+)(?:\s+extends\s+[^{]+)?\s*\{")
    EXPORTED_TYPE_PATTERN = re.compile(r"export\s+type\s+(\w+)\s*=\s*\{")
    EXPORTED_IMPORTED_TYPE_ALIAS_PATTERN = re.compile(
        r"export\s+type\s+(\w+)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*;"
    )
    LOCAL_INTERFACE_PATTERN = re.compile(r"(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+[^{]+)?\s*\{")
    LOCAL_TYPE_PATTERN = re.compile(r"(?:export\s+)?type\s+(\w+)\s*=\s*\{")
    TYPE_IMPORT_PATTERN = re.compile(
        r"import\s+type\s*\{(?P<body>[\s\S]*?)\}\s*from\s*['\"](?P<module>[^'\"]+)['\"]\s*;"
    )
    FIELD_PATTERN = re.compile(r"^(?:([A-Za-z_][A-Za-z0-9_]*)\??|'([^']+)'|\"([^\"]+)\")\s*:")
    DIRECT_TYPE_REFERENCE_PATTERN = re.compile(r"^\s*(?:readonly\s+)?([A-Z][A-Za-z0-9_]*)\s*(?:\[\])?\s*[;,]?$")
    ARRAY_TYPE_REFERENCE_PATTERN = re.compile(r"^\s*(?:ReadonlyArray|Array)<\s*([A-Z][A-Za-z0-9_]*)\s*>\s*[;,]?$")
    CONTRACT_TYPE_ALIAS_MODULES = frozenset({
        "@sdkwork/commerce-service",
        "@sdkwork/commerce-pc-billing",
        "@sdkwork/commerce-pc-wallet",
        "@sdkwork/commerce-pc-membership",
        "@sdkwork/commerce-pc-payment",
        "@sdkwork/clawrouter-app-sdk",
        "@sdkwork/clawrouter-backend-sdk",
        "@sdkwork/clawrouter-open-sdk",
        "@sdkwork/models-backend-sdk",
        "@sdkwork/generation-pc-react/react",
        "@sdkwork/generations-pc-workspace/generation-history",
    })

    def __init__(
        self,
        root: Path,
        contract_path: Path | None = None,
        output_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.contract_path = (
            Path(contract_path).resolve()
            if contract_path is not None
            else default_frontend_contract_path(self.root)
        )
        self.output_path = (
            Path(output_path).resolve()
            if output_path is not None
            else self.root / "generated" / "schema" / "frontend" / "frontend-field-audit.json"
        )

    def generate(self) -> dict[str, Any]:
        interfaces: list[dict[str, Any]] = []
        contract_index = self._frontend_model_contract_index()
        source_files = self._source_files()
        for source in source_files:
            source_contract_fields = self._contract_fields_by_interface_for_source(
                self._display_path(source),
                contract_index,
            )
            extracted = self._extract_interfaces(source, expand_references=True)
            extracted.update(
                self._extract_contract_imported_type_aliases(source, source_contract_fields, existing=extracted)
            )
            for name, fields in sorted(extracted.items()):
                key = f"{self._display_path(source)}#{name}"
                contract = contract_index.get(key, {})
                interfaces.append(self._audit_entry(source, name, fields, contract))

        scanned_sources = {self._display_path(source) for source in source_files}
        for source_path, declared_interfaces in self._contract_declared_interfaces_by_source().items():
            if source_path in scanned_sources:
                continue
            resolved_source = self.root / source_path
            if not resolved_source.exists():
                continue
            source_contract_fields = self._contract_fields_by_interface_for_source(
                source_path,
                contract_index,
            )
            extracted = self._extract_interfaces(resolved_source, expand_references=True)
            extracted.update(
                self._extract_contract_imported_type_aliases(resolved_source, source_contract_fields, existing=extracted)
            )
            for name in sorted(declared_interfaces):
                if name not in extracted:
                    continue
                key = f"{source_path}#{name}"
                interfaces.append(
                    self._audit_entry(
                        resolved_source,
                        name,
                        extracted[name],
                        contract_index.get(key, {}),
                    )
                )

        interfaces.sort(key=lambda item: (item["source"], item["interface"]))
        return {
            "summary": {
                "source_file_count": len({item["source"] for item in interfaces}),
                "interface_count": len(interfaces),
            },
            "interfaces": interfaces,
        }

    def _audit_entry(
        self,
        source: Path,
        name: str,
        fields: list[str],
        contract: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "source": self._display_path(source),
            "interface": name,
            "route": contract.get("route"),
            "data_sources": contract.get("data_sources", []),
            "file_targets": contract.get("file_targets", []),
            "fields": fields,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        target = Path(output_path) if output_path is not None else self.output_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8")
        return target

    def check(self, output_path: Path | None = None) -> FrontendFieldAuditResult:
        validation = self.validate()
        if not validation.ok:
            return validation

        target = Path(output_path) if output_path is not None else self.output_path
        expected = self.render_json()
        if not target.exists():
            return FrontendFieldAuditResult(ok=False, messages=[f"frontend field audit is missing: {target}"])
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return FrontendFieldAuditResult(ok=False, messages=[f"frontend field audit is stale: {target}"])
        return FrontendFieldAuditResult(ok=True, messages=[])

    def validate(self) -> FrontendFieldAuditResult:
        audit = self.generate()
        actual = {
            f"{item['source']}#{item['interface']}": item["fields"]
            for item in audit["interfaces"]
            if isinstance(item.get("source"), str) and isinstance(item.get("interface"), str)
        }
        contract = self._load_contract()
        entries = contract.get("frontend_models", [])
        if not isinstance(entries, list):
            return FrontendFieldAuditResult(ok=False, messages=["frontend_models must be a list"])

        routes = contract.get("routes", [])
        route_tables: dict[str, set[str]] = {}
        route_dependency_owned: dict[str, bool] = {}
        if isinstance(routes, list):
            for route_entry in routes:
                if not isinstance(route_entry, dict):
                    continue
                route = route_entry.get("route")
                required_tables = route_entry.get("required_tables", [])
                if isinstance(route, str) and isinstance(required_tables, list):
                    route_tables[route] = {
                        table for table in required_tables if isinstance(table, str)
                    }
                    route_dependency_owned[route] = (
                        route_entry.get("dependency_owned") is True
                        and isinstance(route_entry.get("dependency_sdk_family"), str)
                    )

        expected: dict[str, list[str]] = {}
        messages: list[str] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            interface = entry.get("interface")
            route = entry.get("route")
            fields = entry.get("fields")
            derived_fields = entry.get("derived_fields", [])
            if not isinstance(source, str) or not isinstance(interface, str):
                messages.append("frontend_models entries must include source and interface")
                continue
            key = f"{source}#{interface}"
            if not isinstance(route, str):
                messages.append(f"frontend model {key} must declare route")
            elif route not in route_tables:
                messages.append(f"frontend model {key} references route without route contract: {route}")
            if not isinstance(fields, list) or not all(isinstance(field, str) for field in fields):
                messages.append(f"frontend model {key} fields must be a string list")
                continue
            if not isinstance(derived_fields, list) or not all(isinstance(field, str) for field in derived_fields):
                messages.append(f"frontend model {key} derived_fields must be a string list")
                continue
            raw_data_sources = entry.get("data_sources")
            raw_file_targets = entry.get("file_targets")
            data_sources = raw_data_sources if raw_data_sources is not None else []
            file_targets = raw_file_targets if raw_file_targets is not None else []
            valid_data_sources = isinstance(data_sources, list) and all(isinstance(source, str) for source in data_sources)
            valid_file_targets = isinstance(file_targets, list) and all(isinstance(target, str) for target in file_targets)
            if not valid_data_sources:
                messages.append(f"frontend model {key} must declare data_sources as a string list")
            if not valid_file_targets:
                messages.append(f"frontend model {key} must declare file_targets as a string list")
            if valid_data_sources and valid_file_targets and not data_sources and not file_targets:
                if raw_data_sources is None and raw_file_targets is None:
                    messages.append(f"frontend model {key} must declare non-empty data_sources")
                else:
                    messages.append(f"frontend model {key} must declare non-empty data_sources or file_targets")
            elif valid_data_sources and data_sources and isinstance(route, str) and route in route_tables:
                if not route_dependency_owned.get(route):
                    for data_source in data_sources:
                        if data_source not in route_tables[route]:
                            messages.append(
                                f"frontend model {key} data_source {data_source} is not declared in route {route} required_tables"
                            )
            expected[key] = [*fields, *derived_fields]

        for key in sorted(actual):
            source = key.split("#", 1)[0]
            if is_relay_retired_admin_source(source) or _is_field_audit_exempt_source(source):
                continue
            if key not in expected:
                messages.append(f"frontend model interface missing from contract: {key}")
                continue
            actual_fields = actual[key]
            expected_fields = expected[key]
            missing = [field for field in actual_fields if field not in expected_fields]
            extra = [field for field in expected_fields if field not in actual_fields]
            if missing:
                messages.append(f"frontend model fields mismatch for {key}: missing fields [{', '.join(missing)}]")
            if extra:
                messages.append(f"frontend model fields mismatch for {key}: stale fields [{', '.join(extra)}]")

        for key in sorted(expected):
            source = key.split("#", 1)[0]
            if is_relay_retired_admin_source(source):
                continue
            if key not in actual:
                messages.append(f"frontend model contract references missing interface: {key}")

        return FrontendFieldAuditResult(ok=not messages, messages=messages)

    def _source_files(self) -> list[Path]:
        portal = self.root / "apps" / "sdkwork-clawrouter-pc" / "packages"
        if not portal.exists():
            return []

        files: list[Path] = []
        for path in self._walk_source_tree(portal):
            if path.suffix not in {".ts", ".tsx"}:
                continue
            name = path.name
            parts = path.parts
            if (
                name.endswith("Service.ts")
                or name.endswith("Service.tsx")
                or name.endswith("ModelCatalog.ts")
                or name in {"data.ts", "types.ts"}
                or ("data" in parts and path.suffix == ".ts")
            ):
                files.append(path)
        return sorted(files)

    def _walk_source_tree(self, root: Path) -> list[Path]:
        files: list[Path] = []

        def ignore_scan_error(_error: OSError) -> None:
            return None

        for directory, names, filenames in os.walk(root, onerror=ignore_scan_error):
            names[:] = sorted(
                name for name in names if name not in self.SOURCE_EXCLUDED_DIRECTORIES
            )
            base = Path(directory)
            for filename in sorted(filenames):
                files.append(base / filename)
        return files

    def _extract_interfaces(self, source: Path, expand_references: bool = False) -> dict[str, list[str]]:
        text = source.read_text(encoding="utf-8", errors="ignore")
        bodies: dict[str, str] = {}
        exported_names: set[str] = set()
        for pattern in [self.EXPORTED_INTERFACE_PATTERN, self.EXPORTED_TYPE_PATTERN]:
            for match in pattern.finditer(text):
                exported_names.add(match.group(1))

        for pattern in [self.LOCAL_INTERFACE_PATTERN, self.LOCAL_TYPE_PATTERN]:
            for match in pattern.finditer(text):
                name = match.group(1)
                start = text.find("{", match.end() - 1)
                if start == -1:
                    continue
                body, _ = self._balanced_block(text, start)
                bodies[name] = body

        parsed: dict[str, list[str]] = {}
        visiting: set[str] = set()

        def parse_type(name: str) -> list[str]:
            if name in parsed:
                return parsed[name]
            if name in visiting or name not in bodies:
                return []
            visiting.add(name)
            fields = self._parse_fields(
                bodies[name],
                parse_type if expand_references else None,
            )
            visiting.remove(name)
            parsed[name] = fields
            return fields

        return {name: parse_type(name) for name in bodies if name in exported_names}

    def _extract_contract_imported_type_aliases(
        self,
        source: Path,
        contract_fields: dict[str, list[str]],
        existing: dict[str, list[str]],
    ) -> dict[str, list[str]]:
        if not contract_fields:
            return {}

        text = source.read_text(encoding="utf-8", errors="ignore")
        imported_types = self._contract_imported_type_names(text)
        aliases: dict[str, list[str]] = {}
        for match in self.EXPORTED_IMPORTED_TYPE_ALIAS_PATTERN.finditer(text):
            alias_name = match.group(1)
            imported_name = match.group(2)
            if alias_name in existing or alias_name not in contract_fields:
                continue
            if imported_name not in imported_types:
                continue
            aliases[alias_name] = contract_fields[alias_name]
        return aliases

    def _contract_imported_type_names(self, text: str) -> set[str]:
        names: set[str] = set()
        for match in self.TYPE_IMPORT_PATTERN.finditer(text):
            module = match.group("module")
            if module not in self.CONTRACT_TYPE_ALIAS_MODULES:
                continue
            for raw_name in match.group("body").split(","):
                name = raw_name.strip()
                if not name:
                    continue
                name = re.sub(r"//.*$", "", name).strip()
                if not name:
                    continue
                alias_parts = re.split(r"\s+as\s+", name)
                imported_name = alias_parts[-1].strip()
                if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", imported_name):
                    names.add(imported_name)
        return names

    def _balanced_block(self, text: str, start: int) -> tuple[str, int]:
        depth = 0
        for index in range(start, len(text)):
            char = text[index]
            if char == "{":
                depth += 1
                if depth == 1:
                    body_start = index + 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return text[body_start:index], index + 1
        return "", start

    def _parse_fields(
        self,
        body: str,
        referenced_type_fields: Any | None = None,
    ) -> list[str]:
        fields: list[str] = []
        stack: list[tuple[str, int]] = []
        pending_object_field: str | None = None
        depth = 0

        for raw_line in body.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("//"):
                continue

            while stack and depth < stack[-1][1]:
                stack.pop()

            field_match = self.FIELD_PATTERN.match(line)
            if field_match is not None:
                field = field_match.group(1) or field_match.group(2) or field_match.group(3)
                prefix = stack[-1][0] if stack else ""
                full_field = f"{prefix}.{field}" if prefix else field
                fields.append(full_field)
                if "{" in line:
                    pending_object_field = full_field
                else:
                    referenced_type = self._referenced_type_name(line)
                    if referenced_type is not None and referenced_type_fields is not None:
                        for nested_field in referenced_type_fields(referenced_type):
                            fields.append(f"{full_field}.{nested_field}")

            open_count = line.count("{")
            close_count = line.count("}")
            if open_count and pending_object_field is not None:
                stack.append((pending_object_field, depth + open_count))
                pending_object_field = None
            depth += open_count
            depth -= close_count
            while stack and depth < stack[-1][1]:
                stack.pop()

        return fields

    def _referenced_type_name(self, line: str) -> str | None:
        _, _, expression = line.partition(":")
        expression = expression.split("//", 1)[0].strip()
        if expression.endswith(";") or expression.endswith(","):
            expression = expression[:-1].strip()
        direct_match = self.DIRECT_TYPE_REFERENCE_PATTERN.match(expression)
        if direct_match is not None:
            return direct_match.group(1)
        array_match = self.ARRAY_TYPE_REFERENCE_PATTERN.match(expression)
        if array_match is not None:
            return array_match.group(1)
        return None

    def _load_contract(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend field contracts") from _YAML_IMPORT_ERROR
        contract = load_frontend_field_contract(self.root, self.contract_path)
        if not isinstance(contract, dict):
            raise ValueError("frontend field contract root must be a mapping")
        return contract

    def _frontend_model_contract_index(self) -> dict[str, dict[str, Any]]:
        contract = self._load_contract()
        entries = contract.get("frontend_models", [])
        if not isinstance(entries, list):
            return {}

        indexed: dict[str, dict[str, Any]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            interface = entry.get("interface")
            if not isinstance(source, str) or not isinstance(interface, str):
                continue
            indexed[f"{source}#{interface}"] = entry
        return indexed

    def _contract_fields_by_interface_for_source(
        self,
        source_path: str,
        contract_index: dict[str, dict[str, Any]],
    ) -> dict[str, list[str]]:
        fields_by_interface: dict[str, list[str]] = {}
        prefix = f"{source_path}#"
        for key, entry in contract_index.items():
            if not key.startswith(prefix):
                continue
            interface = key.removeprefix(prefix)
            fields = entry.get("fields", [])
            derived_fields = entry.get("derived_fields", [])
            if not isinstance(fields, list) or not all(isinstance(field, str) for field in fields):
                continue
            if not isinstance(derived_fields, list) or not all(isinstance(field, str) for field in derived_fields):
                continue
            fields_by_interface[interface] = [*fields, *derived_fields]
        return fields_by_interface

    def _contract_declared_interfaces_by_source(self) -> dict[str, set[str]]:
        contract = self._load_contract()
        entries = contract.get("frontend_models", [])
        if not isinstance(entries, list):
            return {}

        declared: dict[str, set[str]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            interface = entry.get("interface")
            if not isinstance(source, str) or not isinstance(interface, str):
                continue
            declared.setdefault(source, set()).add(interface)
        return declared

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit portal TypeScript service/data view model fields.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--contract", type=Path, default=None, help="frontend field contract YAML path")
    parser.add_argument("--output", type=Path, default=None, help="output audit JSON path")
    parser.add_argument("--check", action="store_true", help="validate generated audit and frontend model contracts")
    args = parser.parse_args()

    auditor = FrontendFieldAudit(root=args.root, contract_path=args.contract, output_path=args.output)
    if args.check:
        result = auditor.check(args.output)
        if result.ok:
            print("Frontend field audit is current")
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
    print(f"Wrote frontend field audit to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
