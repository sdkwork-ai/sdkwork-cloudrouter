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


CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
JAVA_ENUM_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")
RUST_VARIANT_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9]*$")
TS_TYPE_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9]*$")
JAVA_FQCN_PATTERN = re.compile(r"^([a-z][a-z0-9_]*\.)+[A-Z][A-Za-z0-9]*$")


class DomainTypeGenerationError(ValueError):
    """Raised when domain type metadata cannot be generated safely."""


@dataclass(frozen=True)
class DomainValue:
    code: str
    java: str
    rust: str
    label: str
    int_code: int | None = None


@dataclass(frozen=True)
class DomainTypeDefinition:
    key: str
    canonical_name: str
    type_bindings: dict[str, str]
    values: list[DomainValue]
    store_as: str | None = None


@dataclass(frozen=True)
class DomainTypeCheckResult:
    ok: bool
    messages: list[str]


class DomainTypeGenerator:
    """Generate cross-language stable-code domain enum definitions."""

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def generate(self) -> dict[Path, str]:
        definitions = self._load_definitions()
        files: dict[Path, str] = {}

        java_files = self._generate_java(definitions)
        files.update(java_files)

        rust_source = self._generate_rust(definitions)
        if rust_source:
            files[self.root / "generated" / "types" / "rust" / "domain.rs"] = rust_source

        ts_source = self._generate_typescript(definitions)
        if ts_source:
            files[self.root / "generated" / "types" / "typescript" / "domain-types.ts"] = ts_source

        openapi_source = self._generate_openapi(definitions)
        if openapi_source:
            files[self.root / "generated" / "types" / "openapi" / "domain-types.yaml"] = openapi_source

        return files

    def write(self) -> list[Path]:
        files = self.generate()
        written: list[Path] = []
        for path, content in files.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            written.append(path)
        return written

    def check(self) -> DomainTypeCheckResult:
        files = self.generate()
        messages: list[str] = []
        for path, expected in files.items():
            if not path.exists():
                messages.append(f"generated domain type is missing: {path}")
                continue
            actual = path.read_text(encoding="utf-8")
            if actual != expected:
                messages.append(f"generated domain type is stale: {path}")
        return DomainTypeCheckResult(ok=not messages, messages=messages)

    def _load_definitions(self) -> list[DomainTypeDefinition]:
        registry = load_schema_registry(self.registry_path)

        domain_names = registry.get("domain_names", {})
        if not isinstance(domain_names, dict):
            return []

        definitions: list[DomainTypeDefinition] = []
        for key, raw_definition in domain_names.items():
            if not isinstance(key, str) or not isinstance(raw_definition, dict):
                continue
            canonical_name = raw_definition.get("canonical_name")
            if not isinstance(canonical_name, str) or not TS_TYPE_PATTERN.match(canonical_name):
                raise DomainTypeGenerationError(f"{key}.canonical_name must be PascalCase")

            type_bindings = raw_definition.get("type_bindings", {})
            if not isinstance(type_bindings, dict):
                type_bindings = {}

            values = self._load_values(key, raw_definition)
            if not values:
                continue
            if type_bindings and not any(value.code == "unknown" for value in values):
                raise DomainTypeGenerationError(f"{key} generated domain types must include unknown")

            definitions.append(
                DomainTypeDefinition(
                    key=key,
                    canonical_name=canonical_name,
                    type_bindings={k: v for k, v in type_bindings.items() if isinstance(k, str) and isinstance(v, str)},
                    values=values,
                    store_as=self._store_as(raw_definition),
                )
            )

        return definitions

    def _store_as(self, raw_definition: dict[str, Any]) -> str | None:
        persistence = raw_definition.get("persistence", {})
        if not isinstance(persistence, dict):
            return None
        store_as = persistence.get("store_as")
        return store_as if isinstance(store_as, str) else None

    def _load_values(self, key: str, raw_definition: dict[str, Any]) -> list[DomainValue]:
        raw_values = raw_definition.get("builtin_values", [])
        if not isinstance(raw_values, list):
            raise DomainTypeGenerationError(f"{key}.builtin_values must be a list")

        requires_int_code = self._store_as(raw_definition) == "stable_int_code"
        used_int_codes: set[int] = set()
        values: list[DomainValue] = []
        for item in raw_values:
            if not isinstance(item, dict):
                raise DomainTypeGenerationError(f"{key}.builtin_values must contain mappings")
            code = item.get("code")
            if not isinstance(code, str) or not CODE_PATTERN.match(code):
                raise DomainTypeGenerationError(f"{key} has invalid code: {code}")

            java = item.get("java") if isinstance(item.get("java"), str) else self._to_java_enum(code)
            if not JAVA_ENUM_PATTERN.match(java):
                raise DomainTypeGenerationError(f"{key}.{code} has invalid Java enum name: {java}")

            rust = item.get("rust") if isinstance(item.get("rust"), str) else self._to_rust_variant(code)
            if not RUST_VARIANT_PATTERN.match(rust):
                raise DomainTypeGenerationError(f"{key}.{code} has invalid Rust variant name: {rust}")

            label = item.get("label") if isinstance(item.get("label"), str) else code
            int_code = item.get("int_code")
            if requires_int_code:
                if not isinstance(int_code, int) or isinstance(int_code, bool) or int_code < 0:
                    raise DomainTypeGenerationError(f"{key}.{code} must declare non-negative int_code")
                if int_code in used_int_codes:
                    raise DomainTypeGenerationError(f"{key}.{code} duplicates int_code {int_code}")
                used_int_codes.add(int_code)
            elif not isinstance(int_code, int) or isinstance(int_code, bool):
                int_code = None
            values.append(DomainValue(code=code, java=java, rust=rust, label=label, int_code=int_code))

        return values

    def _generate_java(self, definitions: list[DomainTypeDefinition]) -> dict[Path, str]:
        files: dict[Path, str] = {}
        for definition in definitions:
            binding = definition.type_bindings.get("java")
            if not binding:
                continue
            if not JAVA_FQCN_PATTERN.match(binding):
                raise DomainTypeGenerationError(f"{definition.key}.type_bindings.java is invalid: {binding}")

            package_name, class_name = binding.rsplit(".", 1)
            package_path = Path(*package_name.split("."))
            output = self.root / "generated" / "types" / "java" / package_path / f"{class_name}.java"
            files[output] = self._render_java_enum(package_name, class_name, definition)
        return files

    def _render_java_enum(self, package_name: str, class_name: str, definition: DomainTypeDefinition) -> str:
        values = definition.values
        has_int_codes = self._has_int_codes(definition)
        constants = ",\n".join(
            f"    {value.java}(\"{value.code}\", {value.int_code})"
            if has_int_codes
            else f"    {value.java}(\"{value.code}\")"
            for value in values
        )
        int_field = "    private final int intCode;\n" if has_int_codes else ""
        constructor_args = "String code, int intCode" if has_int_codes else "String code"
        constructor_body = (
            "        this.code = code;\n"
            "        this.intCode = intCode;\n"
            if has_int_codes
            else "        this.code = code;\n"
        )
        int_methods = (
            "\n"
            "    public int getIntCode() {\n"
            "        return intCode;\n"
            "    }\n\n"
            f"    public static {class_name} fromIntCode(int intCode) {{\n"
            f"        for ({class_name} value : values()) {{\n"
            "            if (value.intCode == intCode) {\n"
            "                return value;\n"
            "            }\n"
            "        }\n"
            f"        return {self._java_unknown_or_first(values)};\n"
            "    }\n"
            if has_int_codes
            else ""
        )
        return (
            f"package {package_name};\n\n"
            f"public enum {class_name} {{\n"
            f"{constants};\n\n"
            "    private final String code;\n\n"
            f"{int_field}"
            f"    {class_name}({constructor_args}) {{\n"
            f"{constructor_body}"
            "    }\n\n"
            "    public String getCode() {\n"
            "        return code;\n"
            "    }\n\n"
            f"{int_methods}"
            f"    public static {class_name} fromCode(String code) {{\n"
            f"        for ({class_name} value : values()) {{\n"
            "            if (value.code.equals(code)) {\n"
            "                return value;\n"
            "            }\n"
            "        }\n"
            f"        return {self._java_unknown_or_first(values)};\n"
            "    }\n"
            "}\n"
        )

    def _generate_rust(self, definitions: list[DomainTypeDefinition]) -> str:
        rendered: list[str] = [
            "// Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.\n"
            "// Do not edit by hand; update Schema Registry and regenerate."
        ]
        matched = False
        for definition in definitions:
            if "rust" not in definition.type_bindings:
                continue
            matched = True
            rendered.append(self._render_rust_enum(definition))
        return "\n\n".join(rendered).rstrip() + "\n" if matched else ""

    def _render_rust_enum(self, definition: DomainTypeDefinition) -> str:
        variant_lines = "\n".join(f"    {value.rust}," for value in definition.values)
        code_match_arms = "\n".join(f'            Self::{value.rust} => "{value.code}",' for value in definition.values)
        from_code_arms = "\n".join(f'            "{value.code}" => Self::{value.rust},' for value in definition.values)
        fallback = self._rust_unknown_or_first(definition.values)
        int_methods = ""
        if self._has_int_codes(definition):
            int_code_match_arms = "\n".join(
                f"            Self::{value.rust} => {value.int_code},"
                for value in definition.values
            )
            from_int_code_arms = "\n".join(
                f"            {value.int_code} => Some(Self::{value.rust}),"
                for value in definition.values
            )
            int_methods = (
                "\n\n"
                "    pub fn int_code(&self) -> i32 {\n"
                "        match self {\n"
                f"{int_code_match_arms}\n"
                "        }\n"
                "    }\n\n"
                "    pub fn try_from_int_code(code: i32) -> Option<Self> {\n"
                "        match code {\n"
                f"{from_int_code_arms}\n"
                "            _ => None,\n"
                "        }\n"
                "    }\n\n"
                "    pub fn from_int_code(code: i32) -> Self {\n"
                "        Self::try_from_int_code(code).unwrap_or(Self::Unknown)\n"
                "    }"
            )
        return (
            "#[derive(Debug, Clone, PartialEq, Eq, Hash)]\n"
            f"pub enum {definition.canonical_name} {{\n"
            f"{variant_lines}\n"
            "}\n\n"
            f"impl {definition.canonical_name} {{\n"
            "    pub fn code(&self) -> &'static str {\n"
            "        match self {\n"
            f"{code_match_arms}\n"
            "        }\n"
            "    }\n\n"
            "    pub fn from_code(code: &str) -> Self {\n"
            "        match code {\n"
            f"{from_code_arms}\n"
            f"            _ => {fallback},\n"
            "        }\n"
            "    }\n"
            f"{int_methods}\n"
            "}"
        )

    def _has_int_codes(self, definition: DomainTypeDefinition) -> bool:
        return definition.store_as == "stable_int_code"

    def _generate_typescript(self, definitions: list[DomainTypeDefinition]) -> str:
        rendered: list[str] = [
            "// Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.\n"
            "// Do not edit by hand; update Schema Registry and regenerate."
        ]
        matched = False
        for definition in definitions:
            if "typescript" not in definition.type_bindings:
                continue
            matched = True
            const_name = self._to_upper_snake(definition.canonical_name) + "_VALUES"
            values = ", ".join(f'"{value.code}"' for value in definition.values)
            rendered.append(
                f"export const {const_name} = [{values}] as const;\n"
                f"export type {definition.canonical_name} = typeof {const_name}[number];"
            )
        return "\n\n".join(rendered).rstrip() + "\n" if matched else ""

    def _generate_openapi(self, definitions: list[DomainTypeDefinition]) -> str:
        rendered: list[str] = ["components:", "  schemas:"]
        matched = False
        for definition in definitions:
            if "openapi" not in definition.type_bindings:
                continue
            matched = True
            rendered.extend(
                [
                    f"    {definition.canonical_name}:",
                    "      type: string",
                    "      enum:",
                ]
            )
            for value in definition.values:
                rendered.append(f"        - {value.code}")
        return "\n".join(rendered).rstrip() + "\n" if matched else ""

    def _java_unknown_or_first(self, values: list[DomainValue]) -> str:
        for value in values:
            if value.java == "UNKNOWN":
                return "UNKNOWN"
        return values[0].java

    def _rust_unknown_or_first(self, values: list[DomainValue]) -> str:
        for value in values:
            if value.rust == "Unknown":
                return "Self::Unknown"
        return f"Self::{values[0].rust}"

    def _to_java_enum(self, code: str) -> str:
        return code.upper()

    def _to_rust_variant(self, code: str) -> str:
        return "".join(part.capitalize() for part in code.split("_"))

    def _to_upper_snake(self, value: str) -> str:
        return re.sub(r"(?<!^)(?=[A-Z])", "_", value).upper()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate cross-language domain enum types from Schema Registry.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument("--check", action="store_true", help="validate that generated domain type files are current")
    args = parser.parse_args()

    generator = DomainTypeGenerator(root=args.root, registry_path=args.registry)
    if args.check:
        result = generator.check()
        if result.ok:
            print("Generated domain types are current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    written = generator.write()
    for path in written:
        print(f"Wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
