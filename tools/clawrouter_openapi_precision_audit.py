from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class ClawRouterOpenApiPrecisionAuditResult:
    ok: bool
    messages: list[str]


@dataclass(frozen=True)
class _OperationContext:
    surface: str
    method: str
    path: str
    operation_id: str
    path_params: list[str]
    read_sources: list[str]
    record_component: str | None
    response_component: str | None
    has_business_data: bool


class ClawRouterOpenApiPrecisionAudit:
    """Validate published app/backend OpenAPI response precision against the manifest."""

    SURFACES = ("app", "backend")
    SPEC_FILES = {
        "app": "clawrouter-app-openapi.json",
        "backend": "clawrouter-backend-openapi.json",
    }
    APP_MODEL_CATALOG_PRIVATE_ITEM_FIELDS = frozenset(
        {
            "lowestUpstreamCostUnitPrice",
        }
    )
    APP_MODEL_CATALOG_PRIVATE_AVAILABILITY_FIELDS = frozenset(
        {
            "customerUnitPrice",
            "grossMarginPerUnit",
            "pricingPlanCode",
            "groupCode",
        }
    )
    APP_MODEL_CATALOG_PUBLIC_AVAILABILITY_ENUM = ["reference", "unavailable"]

    def __init__(
        self,
        root: Path,
        manifest_path: Path | None = None,
        schema_components_path: Path | None = None,
        openapi_dir: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self.root / "generated" / "api" / "api-contract-manifest.json"
        )
        self.schema_components_path = (
            Path(schema_components_path).resolve()
            if schema_components_path is not None
            else self.root / "generated" / "openapi" / "schema-components.yaml"
        )
        self.openapi_dir = Path(openapi_dir).resolve() if openapi_dir is not None else self.root / "generated" / "openapi"

    def run(self) -> ClawRouterOpenApiPrecisionAuditResult:
        messages: list[str] = []
        try:
            manifest = self._load_manifest()
            table_records = self._table_record_components()
            operations = [
                operation
                for operation in manifest.get("operations", [])
                if (
                    isinstance(operation, dict)
                    and operation.get("api_surface") in self.SURFACES
                    and operation.get("openapi_exposed", True) is not False
                )
            ]
            operations_by_surface = {
                surface: self._surface_operations(manifest, surface)
                for surface in self.SURFACES
            }
            operation_ids = {
                surface: self._operation_ids(surface_operations)
                for surface, surface_operations in operations_by_surface.items()
            }

            for surface in self.SURFACES:
                spec = self._load_spec(surface, messages)
                if spec is None:
                    continue
                messages.extend(
                    self._validate_surface(
                        surface=surface,
                        spec=spec,
                        operations=operations_by_surface[surface],
                        operation_ids=operation_ids[surface],
                        table_records=table_records,
                    )
                )
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            messages.append(str(exc))
        return ClawRouterOpenApiPrecisionAuditResult(ok=not messages, messages=messages)

    def _surface_operations(self, manifest: dict[str, Any], surface: str) -> list[dict[str, Any]]:
        generator = ClawRouterOpenApiGenerator(root=self.root, manifest_path=self.manifest_path)
        manifest_operations = [
            operation
            for operation in manifest.get("operations", [])
            if (
                isinstance(operation, dict)
                and operation.get("api_surface") == surface
                and operation.get("openapi_exposed", True) is not False
                and not generator.is_dependency_operation(
                    surface,
                    self._string(operation.get("api_path")),
                    self._string(operation.get("api_method")),
                )
            )
        ]
        catalog_operations = generator._dedupe_models_catalog_operations(
            [
                operation
                for operation in manifest.get("operations", [])
                if (
                    isinstance(operation, dict)
                    and operation.get("api_surface") == surface
                    and generator._is_models_catalog_operation(operation, surface)
                    and not generator.is_dependency_operation(
                        surface,
                        self._string(operation.get("api_path")),
                        self._string(operation.get("api_method")),
                    )
                )
            ]
        )
        merged: dict[tuple[str, str], dict[str, Any]] = {}
        for operation in [*manifest_operations, *catalog_operations]:
            api_path = self._string(operation.get("api_path"))
            method = self._string(operation.get("api_method")).upper()
            if api_path and method:
                merged[(api_path, method)] = operation
        return list(merged.values())

    SDKWORK_CANONICAL_RESPONSE_REFS = frozenset(
        {
            "#/components/schemas/SdkWorkApiResponse",
            "#/components/schemas/SdkWorkListResponse",
            "#/components/schemas/SdkWorkResourceResponse",
            "#/components/schemas/SdkWorkCommandResponse",
        }
    )

    def _validate_surface(
        self,
        surface: str,
        spec: dict[str, Any],
        operations: list[dict[str, Any]],
        operation_ids: dict[int, str],
        table_records: dict[str, str],
    ) -> list[str]:
        messages: list[str] = []
        paths = spec.get("paths", {})
        schemas = self._spec_schemas(spec)
        contexts_by_operation_id: dict[str, _OperationContext] = {}
        allowed_components: set[str] = set()

        for operation in operations:
            context = self._operation_context(surface, operation, operation_ids[id(operation)], table_records)
            contexts_by_operation_id[context.operation_id] = context
            operation_spec = self._operation_spec(paths, context)
            if operation_spec is None:
                messages.append(f"{surface} {context.operation_id} is missing from OpenAPI path {context.path} {context.method}")
                continue

            declared_operation_id = self._string(operation_spec.get("operationId"))
            if declared_operation_id != context.operation_id:
                messages.append(f"{surface} {context.path} {context.method} operationId must be {context.operation_id}")

            if context.method == "DELETE":
                continue

            response_ref = self._success_response_ref(operation_spec)
            expected_ref = self._expected_success_response_ref(context)
            if response_ref != expected_ref:
                if response_ref in self.SDKWORK_CANONICAL_RESPONSE_REFS:
                    continue
                messages.append(f"{surface} {context.operation_id} success response must reference {expected_ref}")
            else:
                expected_component = self._operation_result_component_name(context.operation_id)
                allowed_components.add(expected_component)
                messages.extend(self._validate_precise_result_schema(surface, context, schemas.get(expected_component)))

        messages.extend(
            self._validate_operation_result_orphans(
                surface=surface,
                schemas=schemas,
                contexts_by_operation_id=contexts_by_operation_id,
                allowed_components=allowed_components,
            )
        )
        if surface == "app":
            messages.extend(self._validate_public_app_model_catalog_schema(schemas))
        return messages

    def _validate_public_app_model_catalog_schema(self, schemas: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        item_schema = schemas.get("AppModelCatalogItem")
        if isinstance(item_schema, dict):
            properties = item_schema.get("properties", {})
            if isinstance(properties, dict):
                for field in sorted(self.APP_MODEL_CATALOG_PRIVATE_ITEM_FIELDS):
                    if field in properties:
                        messages.append(
                            f"app AppModelCatalogItem must not expose public private pricing field {field}"
                        )

        availability_schema = schemas.get("AppModelCatalogPriceAvailability")
        if not isinstance(availability_schema, dict):
            return messages
        properties = availability_schema.get("properties", {})
        if not isinstance(properties, dict):
            messages.append("app AppModelCatalogPriceAvailability properties must be an object")
            return messages

        status = properties.get("status", {})
        enum = status.get("enum") if isinstance(status, dict) else None
        if enum != self.APP_MODEL_CATALOG_PUBLIC_AVAILABILITY_ENUM:
            messages.append(
                "app AppModelCatalogPriceAvailability.status enum must be "
                f"{self.APP_MODEL_CATALOG_PUBLIC_AVAILABILITY_ENUM}"
            )

        for field in sorted(self.APP_MODEL_CATALOG_PRIVATE_AVAILABILITY_FIELDS):
            if field in properties:
                messages.append(
                    "app AppModelCatalogPriceAvailability must not expose public private "
                    f"pricing field {field}"
                )
        return messages

    def _validate_precise_result_schema(
        self,
        surface: str,
        context: _OperationContext,
        schema: Any,
    ) -> list[str]:
        messages: list[str] = []
        expected_component = self._operation_result_component_name(context.operation_id)
        if not isinstance(schema, dict):
            return [f"{surface} {context.operation_id} result schema is missing: {expected_component}"]

        if schema.get("x-operation-id") != context.operation_id:
            messages.append(f"{surface} {context.operation_id} result schema x-operation-id must be {context.operation_id}")

        actual_data_schema = self._result_data_schema(schema)
        if actual_data_schema is None:
            messages.append(f"{surface} {context.operation_id} result schema data must be declared in SdkWorkApiResponse allOf")
            return messages

        expected_data_schema = self._expected_data_schema(context)
        if not self._schema_matches(actual_data_schema, expected_data_schema):
            messages.append(f"{surface} {context.operation_id} data schema must be {expected_data_schema}")
        return messages

    def _result_data_schema(self, schema: dict[str, Any]) -> Any:
        all_of = schema.get("allOf")
        if isinstance(all_of, list) and any(
            isinstance(item, dict) and item.get("$ref") == "#/components/schemas/SdkWorkApiResponse"
            for item in all_of
        ):
            for item in all_of:
                if not isinstance(item, dict) or item.get("$ref") == "#/components/schemas/SdkWorkApiResponse":
                    continue
                properties = item.get("properties")
                if isinstance(properties, dict) and "data" in properties:
                    return properties["data"]
            return None

        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            return properties.get("data")
        return None

    def _validate_operation_result_orphans(
        self,
        surface: str,
        schemas: dict[str, Any],
        contexts_by_operation_id: dict[str, _OperationContext],
        allowed_components: set[str],
    ) -> list[str]:
        messages: list[str] = []
        for component_name, schema in schemas.items():
            if not isinstance(schema, dict) or "x-operation-id" not in schema:
                continue
            operation_id = self._string(schema.get("x-operation-id"))
            context = contexts_by_operation_id.get(operation_id)
            if context is None:
                messages.append(f"{surface} {component_name} references unknown x-operation-id {operation_id}")
                continue
            expected_component = self._operation_result_component_name(operation_id)
            if component_name != expected_component:
                messages.append(f"{surface} {operation_id} result schema name must be {expected_component}")
        return messages

    def _operation_context(
        self,
        surface: str,
        operation: dict[str, Any],
        operation_id: str,
        table_records: dict[str, str],
    ) -> _OperationContext:
        read_sources = self._string_list(operation.get("read_sources"))
        record_component = table_records.get(read_sources[0]) if len(read_sources) == 1 else None
        response_component = self._payload_schema_component(operation.get("response_schema"))
        method = self._string(operation.get("api_method")).upper()
        path_params = self._string_list(operation.get("path_params"))
        has_business_data = response_component not in {"PlusApiResult", "NoData"} and (
            response_component is not None or (method == "GET" and record_component is not None)
        )
        return _OperationContext(
            surface=surface,
            method=method,
            path=self._string(operation.get("api_path")),
            operation_id=operation_id,
            path_params=path_params,
            read_sources=read_sources,
            record_component=record_component,
            response_component=response_component,
            has_business_data=has_business_data,
        )

    def _expected_data_schema(self, context: _OperationContext) -> dict[str, Any] | None:
        if not context.has_business_data:
            return {"$ref": "#/components/schemas/NoData"}
        if context.response_component is not None and context.response_component not in {"PlusApiResult", "NoData"}:
            return {"$ref": f"#/components/schemas/{context.response_component}"}
        record_ref = {"$ref": f"#/components/schemas/{context.record_component}"}
        if context.path_params:
            return record_ref
        return {
            "type": "object",
            "additionalProperties": False,
            "required": ["items", "pageInfo"],
            "properties": {
                "items": {"type": "array", "items": record_ref},
                "pageInfo": {"$ref": "#/components/schemas/PageInfo"},
            },
        }

    def _expected_success_response_ref(self, context: _OperationContext) -> str:
        expected_component = self._operation_result_component_name(context.operation_id)
        return f"#/components/schemas/{expected_component}"

    def _schema_matches(self, actual: Any, expected: dict[str, Any] | None) -> bool:
        if self._without_descriptions(actual) == self._without_descriptions(expected):
            return True
        if expected is None:
            return False
        if self._schema_is_no_data(actual) and expected == {"$ref": "#/components/schemas/NoData"}:
            return True
        expected_ref = expected.get("$ref")
        if isinstance(expected_ref, str) and isinstance(actual, dict):
            all_of = actual.get("allOf")
            return isinstance(all_of, list) and all_of == [{"$ref": expected_ref}]
        return False

    def _without_descriptions(self, value: Any) -> Any:
        if isinstance(value, list):
            return [self._without_descriptions(item) for item in value]
        if isinstance(value, dict):
            normalized = {
                key: self._without_descriptions(item)
                for key, item in value.items()
                if key != "description"
            }
            all_of = normalized.get("allOf")
            if (
                isinstance(all_of, list)
                and len(all_of) == 1
                and isinstance(all_of[0], dict)
                and isinstance(all_of[0].get("$ref"), str)
                and set(normalized.keys()) == {"allOf"}
            ):
                return {"$ref": all_of[0]["$ref"]}
            return normalized
        return value

    def _schema_is_no_data(self, schema: Any) -> bool:
        if not isinstance(schema, dict):
            return False
        if schema.get("$ref") == "#/components/schemas/NoData":
            return True
        all_of = schema.get("allOf")
        return isinstance(all_of, list) and all_of == [{"$ref": "#/components/schemas/NoData"}]

    def _operation_spec(self, paths: Any, context: _OperationContext) -> dict[str, Any] | None:
        if not isinstance(paths, dict):
            return None
        path_spec = paths.get(context.path)
        if not isinstance(path_spec, dict):
            return None
        method_spec = path_spec.get(context.method.lower())
        return method_spec if isinstance(method_spec, dict) else None

    def _success_response_ref(self, operation_spec: dict[str, Any]) -> str:
        responses = operation_spec.get("responses", {})
        if not isinstance(responses, dict):
            return ""
        success = self._json_success_response(responses)
        if success is None:
            return ""
        content = success.get("content", {})
        if not isinstance(content, dict):
            return ""
        json_content = content.get("application/json", {})
        if not isinstance(json_content, dict):
            return ""
        schema = json_content.get("schema", {})
        if not isinstance(schema, dict):
            return ""
        direct_ref = self._string(schema.get("$ref"))
        if direct_ref:
            return direct_ref
        return self._envelope_payload_ref(schema)

    def _json_success_response(self, responses: dict[str, Any]) -> dict[str, Any] | None:
        for status in sorted(responses):
            try:
                numeric_status = int(status)
            except (TypeError, ValueError):
                continue
            response = responses.get(status)
            if 200 <= numeric_status < 300 and isinstance(response, dict) and "content" in response:
                return response
        return None

    def _envelope_payload_ref(self, schema: dict[str, Any]) -> str:
        all_of = schema.get("allOf")
        if not isinstance(all_of, list):
            return ""
        for branch in all_of:
            if not isinstance(branch, dict):
                continue
            properties = branch.get("properties")
            if not isinstance(properties, dict):
                continue
            data = properties.get("data")
            if not isinstance(data, dict):
                continue
            data_properties = data.get("properties")
            if isinstance(data_properties, dict):
                item = data_properties.get("item")
                if isinstance(item, dict):
                    item_ref = self._string(item.get("$ref"))
                    if item_ref:
                        return item_ref
            data_ref = self._string(data.get("$ref"))
            if data_ref:
                return data_ref
            items = data.get("items")
            if isinstance(items, dict):
                items_ref = self._string(items.get("$ref"))
                if items_ref:
                    return items_ref
        return ""

    def _spec_schemas(self, spec: dict[str, Any]) -> dict[str, Any]:
        components = spec.get("components", {})
        if not isinstance(components, dict):
            return {}
        schemas = components.get("schemas", {})
        if not isinstance(schemas, dict):
            return {}
        return {name: schema for name, schema in schemas.items() if isinstance(name, str)}

    def _table_record_components(self) -> dict[str, str]:
        schemas = self._schema_component_schemas()
        records: dict[str, str] = {}
        for component_name, schema in schemas.items():
            table_name = schema.get("x-table") if isinstance(schema, dict) else None
            if isinstance(table_name, str) and table_name:
                records[table_name] = component_name
        return records

    def _schema_component_schemas(self) -> dict[str, Any]:
        if not self.schema_components_path.exists():
            return {}
        if yaml is None:
            raise RuntimeError("PyYAML is required to load OpenAPI schema components") from _YAML_IMPORT_ERROR
        payload = yaml.safe_load(self.schema_components_path.read_text(encoding="utf-8")) or {}
        if not isinstance(payload, dict):
            raise ValueError("OpenAPI schema components root must be an object")
        components = payload.get("components", {})
        if not isinstance(components, dict):
            return {}
        schemas = components.get("schemas", {})
        if not isinstance(schemas, dict):
            return {}
        return {name: schema for name, schema in schemas.items() if isinstance(name, str) and isinstance(schema, dict)}

    def _load_manifest(self) -> dict[str, Any]:
        if not self.manifest_path.exists():
            raise ValueError(f"api contract manifest is missing: {self.manifest_path}")
        payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("api contract manifest root must be an object")
        return payload

    def _load_spec(self, surface: str, messages: list[str]) -> dict[str, Any] | None:
        path = self.openapi_dir / self.SPEC_FILES[surface]
        if not path.exists():
            messages.append(f"clawrouter {surface} OpenAPI spec is missing: {path}")
            return None
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            messages.append(f"clawrouter {surface} OpenAPI spec root must be an object: {path}")
            return None
        return payload

    def _operation_ids(self, operations: list[dict[str, Any]]) -> dict[int, str]:
        result: dict[int, str] = {}
        used: set[str] = set()
        for operation in operations:
            base = self._operation_id_base(operation)
            if base in used:
                raise ValueError(f"duplicate OpenAPI operationId: {base}")
            used.add(base)
            result[id(operation)] = base
        return result

    def _operation_id_base(self, operation: dict[str, Any]) -> str:
        raw = self._string(operation.get("operation_id")) or self._string(operation.get("operation")) or "operation"
        if re.match(r"^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$", raw):
            return raw
        raise ValueError(f"OpenAPI operation_id must use dotted lowerCamel segments: {raw}")

    def _safe_operation_id(self, value: str) -> str:
        parts = [part for part in re.split(r"[^A-Za-z0-9]+", value) if part]
        if not parts:
            return "operation"
        first = parts[0][0].lower() + parts[0][1:]
        rest = "".join(part[0].upper() + part[1:] for part in parts[1:])
        candidate = first + rest
        if not re.match(r"^[A-Za-z_]", candidate):
            candidate = f"operation{candidate[0].upper()}{candidate[1:]}"
        return candidate

    def _operation_result_component_name(self, operation_id: str) -> str:
        if not operation_id:
            return "OperationResult"
        safe = self._component_safe_operation_name(operation_id)
        return safe[0].upper() + safe[1:] + "Result"

    def _component_safe_operation_name(self, operation_id: str) -> str:
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", operation_id):
            return operation_id
        parts = [part for part in re.split(r"[^A-Za-z0-9]+", operation_id) if part]
        if not parts:
            return "operation"
        first = parts[0][0].lower() + parts[0][1:]
        rest = "".join(part[0].upper() + part[1:] for part in parts[1:])
        candidate = first + rest
        if not re.match(r"^[A-Za-z_]", candidate):
            candidate = f"operation{candidate[0].upper()}{candidate[1:]}"
        return candidate

    def _payload_schema_component(self, value: Any) -> str | None:
        if not isinstance(value, dict):
            return None
        name = value.get("name")
        schema = value.get("schema")
        if not isinstance(name, str) or not isinstance(schema, dict):
            return None
        return name

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit ClawRouter OpenAPI response precision.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="API contract manifest path")
    parser.add_argument("--schema-components", type=Path, default=None, help="OpenAPI schema components path")
    parser.add_argument("--openapi-dir", type=Path, default=None, help="directory containing generated app/backend OpenAPI JSON")
    args = parser.parse_args()

    result = ClawRouterOpenApiPrecisionAudit(
        root=args.root,
        manifest_path=args.manifest,
        schema_components_path=args.schema_components,
        openapi_dir=args.openapi_dir,
    ).run()
    if result.ok:
        print("ClawRouter OpenAPI precision audit passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
