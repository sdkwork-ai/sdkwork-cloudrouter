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


STRING_TYPE_PATTERN = re.compile(r"^string\((\d+)\)$")

MEDIA_RESOURCE_SUFFIX = "_resource_snapshot"
MEDIA_STORAGE_SUFFIXES = (
    "_media_resource_id",
    "_object_blob_id",
    MEDIA_RESOURCE_SUFFIX,
)

COMMON_COLUMN_TYPES = {
    "id": "int64",
    "uuid": "string(64)",
    "tenant_id": "int64",
    "organization_id": "int64",
    "user_id": "int64",
    "owner_type": "enum_int32",
    "owner_id": "int64",
    "data_scope": "enum_int32",
    "status": "enum_int32",
    "created_at": "instant",
    "updated_at": "instant",
    "version": "int64",
    "deleted_at": "instant",
    "deleted_by": "int64",
    "metadata": "json",
    "request_id": "string(128)",
    "trace_id": "string(128)",
    "payload_hash": "string(128)",
    "retention_until": "instant",
    "legal_hold": "bool",
    "operator_id": "int64",
    "action": "string(128)",
    "target_type": "enum_int32",
    "target_id": "int64",
    "source_type": "string(128)",
    "source_id": "int64",
    "source_version": "int64",
    "rebuild_version": "int64",
}


def int64_string_schema() -> dict[str, Any]:
    return {
        "type": "string",
        "format": "int64",
        "pattern": "^-?[0-9]+$",
        "x-sdkwork-int64-string": True,
        "x-sdkwork-rust-type": "i64",
    }


MEDIA_RESOURCE_COMPONENTS: dict[str, Any] = {
    "MediaKind": {
        "type": "string",
        "enum": ["image", "video", "audio", "voice", "document", "archive", "model", "other"],
    },
    "MediaSource": {
        "type": "string",
        "enum": ["drive", "object_storage", "external_url", "data_url", "provider_asset", "generated"],
    },
    "MediaChecksum": {
        "type": "object",
        "additionalProperties": False,
        "required": ["algorithm", "value"],
        "properties": {
            "algorithm": {
                "type": "string",
                "enum": ["sha256", "md5", "etag"],
            },
            "value": {"type": "string", "minLength": 1, "maxLength": 256},
        },
    },
    "MediaAccess": {
        "type": "object",
        "additionalProperties": False,
        "required": ["visibility"],
        "properties": {
            "visibility": {
                "type": "string",
                "enum": ["private", "tenant", "organization", "public", "signed"],
            },
            "expiresAt": {"type": "string", "format": "date-time"},
        },
    },
    "MediaAiProvenance": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "provenance": {
                "type": "string",
                "enum": ["uploaded", "generated", "edited", "imported"],
            },
            "provider": {"type": "string", "maxLength": 128},
            "model": {"type": "string", "maxLength": 128},
            "promptId": {"type": "string", "maxLength": 128},
            "generationTaskId": {"type": "string", "maxLength": 128},
            "sourceMediaIds": {
                "type": "array",
                "items": {"type": "string", "maxLength": 128},
                "maxItems": 64,
            },
            "seed": {"type": "string", "maxLength": 128},
            "moderationStatus": {
                "type": "string",
                "enum": ["unknown", "pending", "approved", "rejected", "blocked"],
            },
            "safetyLabels": {
                "type": "array",
                "items": {"type": "string", "maxLength": 128},
                "maxItems": 64,
            },
        },
    },
    "MediaResource": {
        "type": "object",
        "additionalProperties": False,
        "required": ["kind", "source"],
        "properties": {
            "id": {"type": "string", "maxLength": 128},
            "kind": {"$ref": "#/components/schemas/MediaKind"},
            "source": {"$ref": "#/components/schemas/MediaSource"},
            "url": {"type": "string", "format": "uri", "maxLength": 4096},
            "publicUrl": {"type": "string", "format": "uri", "maxLength": 4096},
            "uri": {"type": "string", "maxLength": 4096},
            "objectBlobId": int64_string_schema(),
            "bucketId": int64_string_schema(),
            "objectKey": {"type": "string", "maxLength": 1024},
            "objectVersion": {"type": "string", "maxLength": 256},
            "fileName": {"type": "string", "maxLength": 512},
            "mimeType": {"type": "string", "maxLength": 256},
            "sizeBytes": {"type": "string", "pattern": "^[0-9]+$"},
            "checksum": {"$ref": "#/components/schemas/MediaChecksum"},
            "width": {"type": "integer", "format": "int32", "minimum": 0},
            "height": {"type": "integer", "format": "int32", "minimum": 0},
            "durationSeconds": {"type": "number", "minimum": 0},
            "altText": {"type": "string", "maxLength": 512},
            "title": {"type": "string", "maxLength": 255},
            "poster": {"$ref": "#/components/schemas/MediaResource"},
            "thumbnails": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/MediaResource"},
            },
            "variants": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/MediaResource"},
            },
            "access": {"$ref": "#/components/schemas/MediaAccess"},
            "ai": {"$ref": "#/components/schemas/MediaAiProvenance"},
            "metadata": {"type": "object", "additionalProperties": True},
        },
    },
}


@dataclass(frozen=True)
class OpenApiComponentCheckResult:
    ok: bool
    messages: list[str]


class OpenApiComponentGenerator:
    """Generate OpenAPI component schemas from Schema Registry table contracts."""

    def __init__(self, root: Path, registry_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )

    def render_yaml(self) -> str:
        registry = self._load_registry()
        components = self._components(registry)
        return self._dump_yaml({"components": {"schemas": components}})

    def write(self, output_path: Path | None = None) -> Path:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "openapi" / "schema-components.yaml"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_yaml(), encoding="utf-8")
        return target

    def check(self, output_path: Path | None = None) -> OpenApiComponentCheckResult:
        target = (
            Path(output_path)
            if output_path is not None
            else self.root / "generated" / "openapi" / "schema-components.yaml"
        )
        expected = self.render_yaml()
        if not target.exists():
            return OpenApiComponentCheckResult(ok=False, messages=[f"openapi schema components are missing: {target}"])
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return OpenApiComponentCheckResult(ok=False, messages=[f"openapi schema components are stale: {target}"])
        return OpenApiComponentCheckResult(ok=True, messages=[])

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _components(self, registry: dict[str, Any]) -> dict[str, Any]:
        tables = registry.get("tables", [])
        if not isinstance(tables, list):
            tables = []
        schema = registry.get("schema_registry", {})
        common_column_groups = schema.get("common_column_groups", {}) if isinstance(schema, dict) else {}
        if not isinstance(common_column_groups, dict):
            common_column_groups = {}

        components: dict[str, Any] = dict(MEDIA_RESOURCE_COMPONENTS)
        for table in tables:
            if not isinstance(table, dict) or not isinstance(table.get("table"), str):
                continue
            component_name = self._component_name(table["table"])
            components[component_name] = self._component_schema(table, common_column_groups)
        return dict(sorted(components.items()))

    def _component_schema(self, table: dict[str, Any], common_column_groups: dict[str, Any]) -> dict[str, Any]:
        properties: dict[str, Any] = {}
        media_fields = self._media_resource_fields(table)
        for name, registry_type in self._columns(table, common_column_groups):
            if self._is_media_storage_column(name, media_fields):
                continue
            properties[name] = self._property_schema(registry_type)
        for name in media_fields:
            properties[name] = {"$ref": "#/components/schemas/MediaResource"}

        schema = {
            "type": "object",
            "x-table": table["table"],
            "x-domain": table.get("domain"),
            "x-generated-by-this-project": table.get("generated_by_this_project") is not False,
            "properties": properties,
        }
        required = self._required_columns(table, properties)
        if required:
            schema["required"] = required
        return schema

    def _required_columns(self, table: dict[str, Any], properties: dict[str, Any]) -> list[str]:
        not_null_columns = table.get("not_null_columns", [])
        if not isinstance(not_null_columns, list):
            return []
        return [
            column
            for column in not_null_columns
            if isinstance(column, str) and column in properties
        ]

    def _columns(self, table: dict[str, Any], common_column_groups: dict[str, Any]) -> list[tuple[str, str]]:
        columns: list[tuple[str, str]] = []
        group_name = table.get("common_columns")
        if isinstance(group_name, str):
            group_columns = common_column_groups.get(group_name, [])
            if isinstance(group_columns, list):
                for name in group_columns:
                    if isinstance(name, str):
                        columns.append((name, COMMON_COLUMN_TYPES.get(name, "string(128)")))

        explicit = table.get("columns", {})
        if isinstance(explicit, dict):
            for name, registry_entry in explicit.items():
                if not isinstance(name, str):
                    continue
                registry_type = self._registry_column_type(registry_entry)
                if registry_type:
                    columns.append((name, registry_type))
        return columns

    def _registry_column_type(self, registry_entry: Any) -> str:
        if isinstance(registry_entry, str):
            return registry_entry
        if isinstance(registry_entry, dict):
            value = registry_entry.get("type")
            if isinstance(value, str):
                return value
        return ""

    def _media_resource_fields(self, table: dict[str, Any]) -> list[str]:
        fields: list[str] = []

        frontend_contract = table.get("frontend_contract")
        field_mapping = frontend_contract.get("field_mapping") if isinstance(frontend_contract, dict) else None
        if isinstance(field_mapping, dict):
            for field_name, mapping in field_mapping.items():
                if not isinstance(field_name, str) or not isinstance(mapping, str):
                    continue
                expected_snapshot = f"{field_name}{MEDIA_RESOURCE_SUFFIX}"
                mapping_tokens = mapping.split()
                if (
                    len(mapping_tokens) == 2
                    and mapping_tokens[0] == expected_snapshot
                    and mapping_tokens[1] == "MediaResource"
                    and self._is_valid_media_field_name(field_name)
                ):
                    fields.append(field_name)

        explicit = table.get("columns", {})
        if isinstance(explicit, dict):
            for column_name in explicit:
                if not isinstance(column_name, str) or not column_name.endswith(MEDIA_RESOURCE_SUFFIX):
                    continue
                field_name = column_name[: -len(MEDIA_RESOURCE_SUFFIX)]
                if self._is_valid_media_field_name(field_name):
                    fields.append(field_name)

        return sorted(dict.fromkeys(fields))

    def _is_media_storage_column(self, column_name: str, media_fields: list[str]) -> bool:
        return any(
            column_name == f"{field_name}{suffix}"
            for field_name in media_fields
            for suffix in MEDIA_STORAGE_SUFFIXES
        )

    def _is_valid_media_field_name(self, value: str) -> bool:
        return bool(re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", value))

    def _property_schema(self, registry_type: str) -> dict[str, Any]:
        string_match = STRING_TYPE_PATTERN.match(registry_type)
        if string_match:
            return {"type": "string", "maxLength": int(string_match.group(1))}
        if registry_type == "text":
            return {"type": "string"}
        if registry_type == "json":
            return {"type": "object", "additionalProperties": True}
        if registry_type == "bool":
            return {"type": "boolean"}
        if registry_type == "int32":
            return {"type": "integer", "format": "int32"}
        if registry_type == "enum_int32":
            return {"type": "string", "x-db-type": "enum_int32"}
        if registry_type == "int64":
            return self._int64_string_schema()
        if registry_type == "decimal":
            return {"type": "string", "format": "decimal"}
        if registry_type == "instant":
            return {"type": "string", "format": "date-time"}
        if registry_type == "date":
            return {"type": "string", "format": "date"}
        return {"type": "string", "x-db-type": registry_type}

    def _int64_string_schema(self) -> dict[str, Any]:
        return int64_string_schema()

    def _component_name(self, table_name: str) -> str:
        return "".join(part.capitalize() for part in table_name.split("_")) + "Record"

    def _dump_yaml(self, data: dict[str, Any]) -> str:
        return yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate OpenAPI component schemas from Schema Registry.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="output OpenAPI components path; defaults to generated/openapi/schema-components.yaml",
    )
    parser.add_argument("--check", action="store_true", help="validate that the generated OpenAPI components are current")
    args = parser.parse_args()

    generator = OpenApiComponentGenerator(root=args.root, registry_path=args.registry)
    if args.check:
        result = generator.check(args.output)
        if result.ok:
            print("OpenAPI schema components are current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = generator.write(args.output)
    print(f"Wrote OpenAPI schema components to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
