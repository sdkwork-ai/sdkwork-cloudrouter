from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ClawRouterPayloadSdkAuditResult:
    ok: bool
    messages: list[str]


class ClawRouterPayloadSdkAudit:
    """Audit explicit operation payload schemas across manifest, OpenAPI, and generated SDKs."""

    SURFACES = ("app", "backend")
    SPEC_FILES = {
        "app": "clawrouter-app-openapi.json",
        "backend": "clawrouter-backend-openapi.json",
    }
    SDK_DIRECTORIES = {
        "app": "clawrouter-app-sdk/clawrouter-app-sdk-typescript",
        "backend": "clawrouter-backend-sdk/clawrouter-backend-sdk-typescript",
    }
    SDK_FAMILIES = {
        "app": "clawrouter-app-sdk",
        "backend": "clawrouter-backend-sdk",
    }
    METHODS_WITH_JSON_BODY = {"POST", "PUT", "PATCH"}
    METHOD_VERB_PARTS = {"get", "fetch", "list", "create", "update", "patch", "delete", "enable", "disable", "publish", "offline", "head", "options", "trace"}
    REMOVABLE_TAG_SUFFIXES = {"management", "controller", "module", "service", "api"}
    RESERVED_GROUP_SEGMENTS_AFTER_PREFIX = {"management", "manage", "admin", "internal"}
    ENTITY_RESPONSE_PROPERTIES = frozenset({"item", "key", "codes", "vendors", "models"})
    STABLE_ID_FIELDS = ("id", "vendorId")
    SEARCH_TEXT_ALIASES = frozenset({"keyword", "search", "search_query", "searchQuery"})
    SDKWORK_API_RESPONSE_REF = "#/components/schemas/SdkWorkApiResponse"
    SDKWORK_SUCCESS_RESPONSE_REFS = {
        "#/components/schemas/SdkWorkApiResponse",
        "#/components/schemas/SdkWorkListResponse",
        "#/components/schemas/SdkWorkResourceResponse",
        "#/components/schemas/SdkWorkCommandResponse",
    }

    def __init__(
        self,
        root: Path,
        manifest_path: Path | None = None,
        openapi_dir: Path | None = None,
        sdk_root: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self.root / "generated" / "api" / "api-contract-manifest.json"
        )
        self.openapi_dir = Path(openapi_dir).resolve() if openapi_dir is not None else self.root / "generated" / "openapi"
        self.sdk_root = Path(sdk_root).resolve() if sdk_root is not None else self.root / "sdks"
        self._dependency_exclusion_cache: dict[str, set[str]] = {}

    def run(self) -> ClawRouterPayloadSdkAuditResult:
        messages: list[str] = []
        try:
            manifest = self._load_json(self.manifest_path)
            operations = [
                operation
                for operation in manifest.get("operations", [])
                if isinstance(operation, dict)
                and operation.get("api_surface") in self.SURFACES
                and operation.get("openapi_exposed", True) is not False
                and (self._payload_schema_name(operation.get("request_schema")) or self._payload_schema_name(operation.get("response_schema")))
            ]
            operations_by_surface = {
                surface: [
                    operation
                    for operation in manifest.get("operations", [])
                    if (
                        isinstance(operation, dict)
                        and operation.get("api_surface") == surface
                        and operation.get("openapi_exposed", True) is not False
                    )
                ]
                for surface in self.SURFACES
            }
            operation_ids = {
                surface: self._operation_ids(surface_operations)
                for surface, surface_operations in operations_by_surface.items()
            }
            specs = {surface: self._load_spec(surface, messages) for surface in self.SURFACES}

            for operation in operations:
                surface = self._string(operation.get("api_surface"))
                operation_id = operation_ids[surface][id(operation)]
                spec = specs.get(surface)
                if spec is None:
                    continue
                messages.extend(self._check_operation(surface, operation, operation_id, spec))
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            messages.append(str(exc))
        return ClawRouterPayloadSdkAuditResult(ok=not messages, messages=messages)

    def _check_operation(
        self,
        surface: str,
        operation: dict[str, Any],
        operation_id: str,
        spec: dict[str, Any],
    ) -> list[str]:
        messages: list[str] = []
        method = self._string(operation.get("api_method")).upper()
        sdk_method_names = self._sdk_method_names(operation_id, operation)
        operation_spec = self._operation_spec(spec, operation)
        schemas = self._spec_schemas(spec)
        owner_sdk_operation = not self._is_dependency_owned_operation(surface, operation)
        sdk_method_records = self._sdk_method_records(surface, sdk_method_names, operation) if owner_sdk_operation else []
        sdk_types_dir = self._sdk_source_root(surface) / "types"
        sdk_type_index = self._safe_read_text(sdk_types_dir / "index.ts")

        if owner_sdk_operation and operation_spec is not None and sdk_method_records:
            messages.extend(
                self._check_sdk_query_serialization(surface, operation_id, operation_spec, sdk_method_records)
            )

        request_schema = self._payload_schema_name(operation.get("request_schema"))
        explicit_no_body = self._explicit_no_body_operation(operation, method)
        if explicit_no_body:
            if operation_spec is not None and "requestBody" in operation_spec:
                messages.append(f"{surface} {operation_id} OpenAPI operation must not declare requestBody for explicit no-body operation")
            if owner_sdk_operation and sdk_method_records:
                if any(self._signature_has_body_parameter(signature) for signature, _ in sdk_method_records):
                    messages.append(f"{surface} {operation_id} SDK method must not accept body parameter for explicit no-body operation")
                if any(self._method_passes_body_argument(body) for _, body in sdk_method_records):
                    messages.append(f"{surface} {operation_id} SDK client call must not send body for explicit no-body operation")
        elif request_schema is not None:
            expected_ref = f"#/components/schemas/{request_schema}"
            if request_schema not in schemas:
                messages.append(f"{surface} {operation_id} request schema component is missing: {request_schema}")
            if operation_spec is None:
                messages.append(f"{surface} {operation_id} is missing from OpenAPI path {self._string(operation.get('api_path'))} {method}")
            elif method in self.METHODS_WITH_JSON_BODY:
                request_ref = self._request_body_schema_ref(
                    operation_spec,
                    self._request_content_type(operation),
                )
                if request_ref != expected_ref:
                    messages.append(f"{surface} {operation_id} requestBody must reference {expected_ref}")
                expected_required = self._expected_request_body_required(operation)
                if self._request_body_required(operation_spec) is not expected_required:
                    messages.append(
                        f"{surface} {operation_id} requestBody.required must be {str(expected_required).lower()} for explicit request schema"
                    )
            if owner_sdk_operation:
                messages.extend(
                    self._check_sdk_type(
                        surface,
                        operation_id,
                        request_schema,
                        sdk_types_dir,
                        sdk_type_index,
                        schemas.get(request_schema),
                    )
                )
            messages.extend(
                self._check_request_schema_search_text_names(
                    surface,
                    operation_id,
                    request_schema,
                    schemas.get(request_schema),
                )
            )
            if owner_sdk_operation:
                messages.extend(
                    self._check_sdk_request_type_search_text_names(
                        surface,
                        operation_id,
                        request_schema,
                        sdk_types_dir,
                    )
                )
                if not sdk_method_records:
                    messages.append(f"{surface} {operation_id} SDK method is missing")
                else:
                    expected_body = (
                        f"body: {request_schema}"
                        if self._expected_request_body_required(operation)
                        else f"body?: {request_schema}"
                    )
                    if not any(expected_body in signature for signature, _ in sdk_method_records):
                        messages.append(f"{surface} {operation_id} SDK method must accept {expected_body}")

        response_schema = self._payload_schema_name(operation.get("response_schema"))
        if response_schema is not None:
            result_schema = self._operation_result_component_name(operation_id)
            result_ref = f"#/components/schemas/{result_schema}"
            response_component = schemas.get(response_schema)
            if response_schema not in schemas:
                messages.append(f"{surface} {operation_id} response schema component is missing: {response_schema}")
            else:
                messages.extend(
                    self._check_response_entity_payload_schema(
                        surface,
                        operation_id,
                        response_schema,
                        response_component,
                        schemas,
                    )
                )
            result_component = schemas.get(result_schema)
            operation_success_schema = self._json_success_schema(operation_spec) if operation_spec is not None else None
            uses_sdkwork_envelope = self._uses_sdkwork_success_envelope(operation_success_schema or {})
            uses_generic_envelope = self._uses_sdkwork_generic_success_envelope(operation_success_schema or {})
            if not isinstance(result_component, dict):
                if not uses_generic_envelope and not uses_sdkwork_envelope:
                    messages.append(f"{surface} {operation_id} result schema component is missing: {result_schema}")
            elif operation_spec is not None and not uses_sdkwork_envelope:
                data_schema = self._result_data_schema(result_component)
                expected_data_schema = self._expected_response_data_schema(
                    operation=operation,
                    response_schema=response_schema,
                    response_component=response_component,
                )
                if not self._schema_matches(data_schema, expected_data_schema):
                    messages.append(f"{surface} {operation_id} result data schema must be {expected_data_schema}")
            if operation_spec is None:
                messages.append(f"{surface} {operation_id} is missing from OpenAPI path {self._string(operation.get('api_path'))} {method}")
            elif not self._success_response_uses_expected_envelope(operation_spec, result_ref):
                messages.append(f"{surface} {operation_id} 200 response must reference {result_ref}")
            if owner_sdk_operation and response_schema != "NoData" and not uses_generic_envelope:
                messages.extend(
                    self._check_sdk_type(
                        surface,
                        operation_id,
                        response_schema,
                        sdk_types_dir,
                        sdk_type_index,
                        response_component,
                    )
                )
            if owner_sdk_operation and not uses_generic_envelope and not uses_sdkwork_envelope:
                messages.extend(
                    self._check_sdk_type(
                        surface,
                        operation_id,
                        result_schema,
                        sdk_types_dir,
                        sdk_type_index,
                        result_component,
                    )
                )
                messages.extend(
                    self._check_sdk_response_entity_types(
                        surface,
                        operation_id,
                        response_schema,
                        response_component,
                        schemas,
                        sdk_types_dir,
                    )
                )
                if not sdk_method_records:
                    messages.append(f"{surface} {operation_id} SDK method is missing")
                else:
                    if not any(f"Promise<{result_schema}>" in signature for signature, _ in sdk_method_records):
                        messages.append(f"{surface} {operation_id} SDK method must return Promise<{result_schema}>")
                    if not any(f"<{result_schema}>" in body for _, body in sdk_method_records):
                        messages.append(f"{surface} {operation_id} SDK client call must use {result_schema}")
            elif owner_sdk_operation and not sdk_method_records:
                messages.append(f"{surface} {operation_id} SDK method is missing")

        return messages

    def _check_request_schema_search_text_names(
        self,
        surface: str,
        operation_id: str,
        request_schema_name: str,
        request_schema: Any,
    ) -> list[str]:
        if not isinstance(request_schema, dict):
            return []
        properties = request_schema.get("properties")
        if not isinstance(properties, dict):
            return []
        messages: list[str] = []
        for property_name, property_schema in properties.items():
            if self._is_search_text_property_alias(property_name, property_schema):
                messages.append(
                    f"{surface} {operation_id} request schema {request_schema_name}.{property_name} must use q for search text"
                )
        return messages

    def _check_sdk_request_type_search_text_names(
        self,
        surface: str,
        operation_id: str,
        request_schema_name: str,
        sdk_types_dir: Path,
    ) -> list[str]:
        type_file = sdk_types_dir / self._type_file_name(request_schema_name)
        source = self._safe_read_text(type_file)
        if source is None:
            return []
        messages: list[str] = []
        for property_name in sorted(self.SEARCH_TEXT_ALIASES):
            if re.search(rf"^\s*{re.escape(property_name)}\??\s*:", source, flags=re.MULTILINE):
                messages.append(
                    f"{surface} {operation_id} SDK request type {request_schema_name}.{property_name} must use q for search text"
                )
        return messages

    def _is_search_text_property_alias(self, property_name: Any, property_schema: Any) -> bool:
        if property_name not in self.SEARCH_TEXT_ALIASES:
            return False
        if not isinstance(property_schema, dict):
            return False
        schema_type = property_schema.get("type")
        if isinstance(schema_type, list):
            return "string" in schema_type
        return schema_type in {None, "string"}

    def _check_sdk_response_entity_types(
        self,
        surface: str,
        operation_id: str,
        response_schema_name: str,
        response_schema: Any,
        schemas: dict[str, Any],
        sdk_types_dir: Path,
    ) -> list[str]:
        if not isinstance(response_schema, dict):
            return []
        properties = response_schema.get("properties", {})
        if not isinstance(properties, dict):
            return []

        type_file = sdk_types_dir / self._type_file_name(response_schema_name)
        source = self._safe_read_text(type_file)
        if source is None:
            return []

        messages: list[str] = []
        for property_name, property_schema in properties.items():
            if property_name not in self.ENTITY_RESPONSE_PROPERTIES:
                continue
            expected_type = self._sdk_entity_type_name(property_schema, schemas)
            if expected_type is None:
                continue
            expected_suffix = "[]" if isinstance(property_schema, dict) and property_schema.get("type") == "array" else ""
            pattern = re.compile(
                rf"\b{re.escape(property_name)}\??:\s*{re.escape(expected_type)}{re.escape(expected_suffix)}(?=\s*(?:;|,|\n|$))"
            )
            if not pattern.search(source):
                messages.append(
                    f"{surface} {operation_id} SDK response type {response_schema_name}.{property_name} must use {expected_type}{expected_suffix}"
                )
        return messages

    def _sdk_entity_type_name(self, schema: Any, schemas: dict[str, Any]) -> str | None:
        entity_schema = self._entity_payload_schema(schema)
        if entity_schema is None:
            return None
        ref = self._schema_ref(entity_schema)
        if ref.startswith("#/components/schemas/"):
            return ref.rsplit("/", 1)[-1]
        for name, candidate in schemas.items():
            if candidate is entity_schema:
                return name
        nested_name = entity_schema.get("name")
        return nested_name if isinstance(nested_name, str) and nested_name else None

    def _check_response_entity_payload_schema(
        self,
        surface: str,
        operation_id: str,
        response_schema_name: str,
        response_schema: Any,
        schemas: dict[str, Any],
    ) -> list[str]:
        if not isinstance(response_schema, dict):
            return []
        properties = response_schema.get("properties", {})
        if not isinstance(properties, dict):
            return []

        messages: list[str] = []
        for property_name, property_schema in properties.items():
            if property_name not in self.ENTITY_RESPONSE_PROPERTIES:
                continue
            entity_schema = self._entity_payload_schema(property_schema)
            if entity_schema is None:
                continue
            schema_path = f"{response_schema_name}.{property_name}"
            resolved = self._resolve_schema(entity_schema, schemas)
            if not self._is_closed_object_schema(resolved):
                messages.append(
                    f"{surface} {operation_id} response schema {schema_path} must declare a closed object schema"
                )
            if self._missing_stable_id_fields(resolved):
                messages.append(
                    f"{surface} {operation_id} response schema {schema_path} must require stable id"
                )
        return messages

    def _entity_payload_schema(self, schema: Any) -> dict[str, Any] | None:
        if not isinstance(schema, dict):
            return None
        if schema.get("type") == "array":
            items = schema.get("items")
            return items if isinstance(items, dict) else None
        return schema

    def _resolve_schema(self, schema: dict[str, Any], schemas: dict[str, Any]) -> dict[str, Any]:
        ref = self._schema_ref(schema)
        if ref.startswith("#/components/schemas/"):
            name = ref.rsplit("/", 1)[-1]
            resolved = schemas.get(name)
            if isinstance(resolved, dict):
                return resolved
        all_of = schema.get("allOf")
        if isinstance(all_of, list) and len(all_of) == 1 and isinstance(all_of[0], dict):
            return self._resolve_schema(all_of[0], schemas)
        return schema

    def _is_closed_object_schema(self, schema: Any) -> bool:
        if not isinstance(schema, dict):
            return False
        return (
            schema.get("type") == "object"
            and schema.get("additionalProperties") is False
            and isinstance(schema.get("properties"), dict)
        )

    def _missing_stable_id_fields(self, schema: Any) -> list[str]:
        if not isinstance(schema, dict):
            return ["id"]
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        property_names = set(properties) if isinstance(properties, dict) else set()
        required_names = set(required) if isinstance(required, list) else set()
        expected = ["id"]
        expected.extend(field for field in self.STABLE_ID_FIELDS[1:] if field in property_names)
        return [field for field in expected if field not in required_names]

    def _load_spec(self, surface: str, messages: list[str]) -> dict[str, Any] | None:
        path = self.openapi_dir / self.SPEC_FILES[surface]
        if not path.exists():
            messages.append(f"clawrouter {surface} OpenAPI spec is missing: {path}")
            return None
        payload = self._load_json(path)
        if not isinstance(payload, dict):
            messages.append(f"clawrouter {surface} OpenAPI spec root must be an object: {path}")
            return None
        return payload

    def _load_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise ValueError(f"required JSON file is missing: {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"required JSON file must contain an object: {path}")
        return payload

    def _load_json_if_exists(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        try:
            return self._load_json(path)
        except (OSError, ValueError, json.JSONDecodeError):
            return {}

    def _operation_spec(self, spec: dict[str, Any], operation: dict[str, Any]) -> dict[str, Any] | None:
        paths = spec.get("paths", {})
        if not isinstance(paths, dict):
            return None
        path_spec = paths.get(self._string(operation.get("api_path")))
        if not isinstance(path_spec, dict):
            return None
        method_spec = path_spec.get(self._string(operation.get("api_method")).lower())
        return method_spec if isinstance(method_spec, dict) else None

    def _spec_schemas(self, spec: dict[str, Any]) -> dict[str, Any]:
        components = spec.get("components", {})
        if not isinstance(components, dict):
            return {}
        schemas = components.get("schemas", {})
        if not isinstance(schemas, dict):
            return {}
        return {name: schema for name, schema in schemas.items() if isinstance(name, str)}

    def _request_body_schema_ref(self, operation_spec: dict[str, Any], content_type: str = "application/json") -> str:
        request_body = operation_spec.get("requestBody", {})
        if not isinstance(request_body, dict):
            return ""
        content = request_body.get("content", {})
        if not isinstance(content, dict):
            return ""
        media_content = content.get(content_type or "application/json")
        if not isinstance(media_content, dict):
            return ""
        schema = media_content.get("schema", {})
        return self._string(schema.get("$ref")) if isinstance(schema, dict) else ""

    def _request_content_type(self, operation: dict[str, Any]) -> str:
        return self._string(operation.get("request_content_type")) or "application/json"

    def _request_body_required(self, operation_spec: dict[str, Any]) -> bool | None:
        request_body = operation_spec.get("requestBody", {})
        if not isinstance(request_body, dict):
            return None
        required = request_body.get("required")
        return required if isinstance(required, bool) else None

    def _expected_request_body_required(self, operation: dict[str, Any]) -> bool:
        value = operation.get("request_body_required")
        if isinstance(value, bool):
            return value
        return True

    def _json_success_schema(self, operation_spec: dict[str, Any]) -> dict[str, Any] | None:
        responses = operation_spec.get("responses", {})
        if not isinstance(responses, dict):
            return None
        success = responses.get("200", {})
        if not isinstance(success, dict):
            return None
        content = success.get("content", {})
        if not isinstance(content, dict):
            return None
        json_content = content.get("application/json", {})
        if not isinstance(json_content, dict):
            return None
        schema = json_content.get("schema", {})
        return schema if isinstance(schema, dict) else None

    def _success_response_schema_ref(self, operation_spec: dict[str, Any]) -> str:
        responses = operation_spec.get("responses", {})
        if not isinstance(responses, dict):
            return ""
        success = responses.get("200", {})
        if not isinstance(success, dict):
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
        ref = self._string(schema.get("$ref"))
        if ref:
            return ref
        if self._uses_sdkwork_success_envelope(schema):
            return self.SDKWORK_API_RESPONSE_REF
        return ""

    def _uses_sdkwork_success_envelope(self, schema: dict[str, Any]) -> bool:
        ref = self._string(schema.get("$ref"))
        if ref in self.SDKWORK_SUCCESS_RESPONSE_REFS:
            return True
        all_of = schema.get("allOf")
        if not isinstance(all_of, list):
            return False
        return any(
            isinstance(item, dict) and item.get("$ref") == self.SDKWORK_API_RESPONSE_REF
            for item in all_of
        )

    def _result_data_schema(self, schema: dict[str, Any]) -> Any:
        all_of = schema.get("allOf")
        if isinstance(all_of, list) and any(
            isinstance(item, dict) and item.get("$ref") == self.SDKWORK_API_RESPONSE_REF
            for item in all_of
        ):
            for item in all_of:
                if not isinstance(item, dict) or item.get("$ref") == self.SDKWORK_API_RESPONSE_REF:
                    continue
                properties = item.get("properties")
                if isinstance(properties, dict) and "data" in properties:
                    return properties["data"]
            return None

        properties = schema.get("properties")
        if isinstance(properties, dict):
            return properties.get("data")
        return None

    def _expected_response_data_schema(
        self,
        *,
        operation: dict[str, Any],
        response_schema: str,
        response_component: Any,
    ) -> dict[str, Any]:
        if self._operation_is_list(operation) and isinstance(response_component, dict):
            if self._schema_is_page_payload(response_component):
                return {"$ref": f"#/components/schemas/{response_schema}"}
            return self._page_data_schema(
                self._list_item_schema(
                    response_schema=response_schema,
                    response_component=response_component,
                )
            )
        return {"$ref": f"#/components/schemas/{response_schema}"}

    def _operation_is_list(self, operation: dict[str, Any]) -> bool:
        operation_id = self._string(operation.get("operation_id")) or self._string(operation.get("operation"))
        if operation_id.endswith(".list") or operation_id.endswith(".search"):
            return True
        return self._string(operation.get("operation")).lower() in {"list", "search"}

    def _schema_is_page_payload(self, schema: dict[str, Any]) -> bool:
        properties = schema.get("properties")
        return (
            isinstance(properties, dict)
            and isinstance(properties.get("items"), dict)
            and isinstance(properties.get("pageInfo"), dict)
        )

    def _list_item_schema(self, *, response_schema: str, response_component: dict[str, Any]) -> dict[str, Any]:
        items = response_component.get("items")
        if response_component.get("type") == "array" and isinstance(items, dict):
            item_ref = self._schema_ref(items)
            if item_ref:
                return {"$ref": item_ref}
            item_name = items.get("name")
            if isinstance(item_name, str) and re.match(r"^[A-Z][A-Za-z0-9]*$", item_name):
                return {"$ref": f"#/components/schemas/{item_name}"}
            return items
        return {"$ref": f"#/components/schemas/{response_schema}"}

    def _page_data_schema(self, item_schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "object",
            "additionalProperties": False,
            "required": ["items", "pageInfo"],
            "properties": {
                "items": {"type": "array", "items": item_schema},
                "pageInfo": {"$ref": "#/components/schemas/PageInfo"},
            },
        }

    def _uses_sdkwork_generic_success_envelope(self, schema: dict[str, Any]) -> bool:
        ref = self._string(schema.get("$ref"))
        return ref in {
            "#/components/schemas/SdkWorkListResponse",
            "#/components/schemas/SdkWorkResourceResponse",
            "#/components/schemas/SdkWorkCommandResponse",
        }

    def _success_response_uses_expected_envelope(self, operation_spec: dict[str, Any], result_ref: str) -> bool:
        actual_ref = self._success_response_schema_ref(operation_spec)
        if actual_ref == result_ref:
            return True
        if actual_ref == self.SDKWORK_API_RESPONSE_REF:
            return True
        return actual_ref in self.SDKWORK_SUCCESS_RESPONSE_REFS

    def _check_sdk_type(
        self,
        surface: str,
        operation_id: str,
        type_name: str,
        sdk_types_dir: Path,
        sdk_type_index: str | None,
        schema: Any | None = None,
    ) -> list[str]:
        messages: list[str] = []
        type_file_name = self._type_file_name(type_name)
        type_file = sdk_types_dir / type_file_name
        source = self._safe_read_text(type_file, "")
        if not type_file.exists() or not type_file.is_file():
            messages.append(f"{surface} {operation_id} SDK type file is missing: {type_file_name}")
        elif not self._sdk_type_file_declares_type(type_name, source, schema):
            declaration = "type alias" if self._schema_uses_type_alias(schema) else "interface"
            messages.append(f"{surface} {operation_id} SDK type file must declare {declaration} {type_name}: {type_file_name}")
        if sdk_type_index is None:
            messages.append(f"{surface} {operation_id} SDK types index is missing")
        elif f"{{ {type_name} }}" not in sdk_type_index or f"'./{type_file_name.removesuffix('.ts')}'" not in sdk_type_index:
            messages.append(f"{surface} {operation_id} SDK types index must export {type_name}")
        return messages

    def _check_sdk_query_serialization(
        self,
        surface: str,
        operation_id: str,
        operation_spec: dict[str, Any],
        sdk_method_records: list[tuple[str, str]],
    ) -> list[str]:
        expected_names = self._operation_query_parameter_names(operation_spec)
        if not expected_names:
            return []

        serialized_names: set[str] = set()
        for _, body in sdk_method_records:
            serialized_names.update(self._sdk_serialized_query_parameter_names(body))

        messages: list[str] = []
        for name in expected_names:
            if name not in serialized_names:
                messages.append(
                    f"{surface} {operation_id} SDK query serialization must include OpenAPI query parameter {name}"
                )
        return messages

    def _operation_query_parameter_names(self, operation_spec: dict[str, Any]) -> list[str]:
        parameters = operation_spec.get("parameters")
        if not isinstance(parameters, list):
            return []
        names: list[str] = []
        seen: set[str] = set()
        for parameter in parameters:
            if not isinstance(parameter, dict) or parameter.get("in") != "query":
                continue
            name = parameter.get("name")
            if isinstance(name, str) and name and name not in seen:
                names.append(name)
                seen.add(name)
        return names

    def _sdk_serialized_query_parameter_names(self, body: str) -> set[str]:
        return {
            match.group(1)
            for match in re.finditer(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", body)
        }

    def _sdk_type_file_declares_type(self, type_name: str, source: str | None, schema: Any | None) -> bool:
        if source is None:
            return False
        if self._schema_uses_type_alias(schema):
            return re.search(rf"\bexport\s+type\s+{re.escape(type_name)}\s*=", source) is not None
        return f"interface {type_name}" in source

    def _schema_uses_type_alias(self, schema: Any | None) -> bool:
        if not isinstance(schema, dict):
            return False
        if self._is_closed_empty_object_schema(schema):
            return True
        return schema.get("type") in {"array", "boolean", "integer", "number", "string"}

    def _is_closed_empty_object_schema(self, schema: dict[str, Any]) -> bool:
        properties = schema.get("properties")
        return (
            schema.get("type") == "object"
            and schema.get("additionalProperties") is False
            and isinstance(properties, dict)
            and not properties
        )

    def _explicit_no_body_operation(self, operation: dict[str, Any], method: str) -> bool:
        return (
            method in self.METHODS_WITH_JSON_BODY
            and operation.get("request_body_required") is False
            and self._payload_schema_name(operation.get("request_schema")) is None
        )

    def _signature_has_body_parameter(self, signature: str) -> bool:
        return re.search(r"[\(,]\s*body\??\s*:", signature) is not None

    def _method_passes_body_argument(self, body: str) -> bool:
        return re.search(r"\bthis\.client\.(?:post|put|patch)\s*<[^>]+>\s*\([^,\n]+,\s*body\b", body) is not None

    def _sdk_method_records(
        self,
        surface: str,
        method_names: list[str],
        operation: dict[str, Any],
    ) -> list[tuple[str, str]]:
        api_dir = self._sdk_source_root(surface) / "api"
        if not api_dir.is_dir():
            return []
        records: list[tuple[str, str]] = []
        path_records: list[tuple[str, str]] = []
        for path in sorted(api_dir.glob("*.ts")):
            source = self._safe_read_text(path)
            if not source:
                continue
            for method_name in method_names:
                for signature, body in self._method_records(source, method_name):
                    records.append((signature, body))
                    if self._method_body_matches_path(body, operation):
                        path_records.append((signature, body))
            if not path_records:
                for signature, body in self._all_method_records(source):
                    if self._method_body_matches_path(body, operation):
                        path_records.append((signature, body))
        return path_records or records

    def _sdk_source_root(self, surface: str) -> Path:
        family_root = self.sdk_root / self.SDK_DIRECTORIES[surface]
        generated_root = family_root / "generated" / "server-openapi" / "src"
        if generated_root.is_dir():
            return generated_root
        return family_root / "src"

    def _is_dependency_owned_operation(self, surface: str, operation: dict[str, Any]) -> bool:
        return self._dependency_operation_key(operation) in self._dependency_exclusion_keys(surface)

    def _dependency_exclusion_keys(self, surface: str) -> set[str]:
        cached = self._dependency_exclusion_cache.get(surface)
        if cached is not None:
            return cached

        sdk_family = self.SDK_FAMILIES[surface]
        path = self.sdk_root / sdk_family / "openapi" / f"{sdk_family}.openapi.json"
        payload = self._load_json_if_exists(path)
        keys: set[str] = set()
        marker = payload.get("x-sdkwork-dependency-exclusions") if isinstance(payload, dict) else None
        dependencies = marker.get("dependencies") if isinstance(marker, dict) else None
        if isinstance(dependencies, dict):
            for values in dependencies.values():
                if not isinstance(values, list):
                    continue
                keys.update(value for value in values if isinstance(value, str) and value)
        self._dependency_exclusion_cache[surface] = keys
        return keys

    def _dependency_operation_key(self, operation: dict[str, Any]) -> str:
        method = self._string(operation.get("api_method")).upper()
        surface = self._string(operation.get("api_surface"))
        prefix = "/app/v3/api" if surface == "app" else "/backend/v3/api"
        route = self._string(operation.get("api_path"))
        if route.startswith(prefix):
            route = route[len(prefix) :]
        route = re.sub(r"\{[^}]+\}", "{}", route).strip("/")
        return f"{method} {route}"

    def _method_records(self, source: str, method_name: str) -> list[tuple[str, str]]:
        pattern = re.compile(
            rf"async\s+{re.escape(method_name)}\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*\{{",
            re.S,
        )
        records: list[tuple[str, str]] = []
        for match in pattern.finditer(source):
            body_start = match.end()
            body_end = self._matching_brace_index(source, match.end() - 1)
            if body_end is None:
                continue
            records.append((match.group(0).split("{", 1)[0].strip(), source[body_start:body_end]))
        return records

    def _all_method_records(self, source: str) -> list[tuple[str, str]]:
        pattern = re.compile(r"async\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*\{", re.S)
        records: list[tuple[str, str]] = []
        for match in pattern.finditer(source):
            body_start = match.end()
            body_end = self._matching_brace_index(source, match.end() - 1)
            if body_end is None:
                continue
            records.append((match.group(0).split("{", 1)[0].strip(), source[body_start:body_end]))
        return records

    def _matching_brace_index(self, source: str, open_brace_index: int) -> int | None:
        depth = 0
        quote: str | None = None
        escaped = False
        line_comment = False
        block_comment = False
        for index in range(open_brace_index, len(source)):
            char = source[index]
            next_char = source[index + 1] if index + 1 < len(source) else ""

            if line_comment:
                if char in "\r\n":
                    line_comment = False
                continue
            if block_comment:
                if char == "*" and next_char == "/":
                    block_comment = False
                continue
            if quote is not None:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue

            if char == "/" and next_char == "/":
                line_comment = True
                continue
            if char == "/" and next_char == "*":
                block_comment = True
                continue
            if char in ("'", '"', "`"):
                quote = char
                continue
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return index
        return None

    def _method_body_matches_path(self, body: str, operation: dict[str, Any]) -> bool:
        api_path = self._string(operation.get("api_path"))
        prefix = "/app/v3/api" if operation.get("api_surface") == "app" else "/backend/v3/api"
        relative_path = api_path[len(prefix) :] if api_path.startswith(prefix) else api_path
        if not relative_path:
            return False
        if "{" in relative_path:
            static_parts = [part for part in re.split(r"\{[^}]+\}", relative_path) if part]
            if not static_parts:
                return False
            return re.search(".*?".join(re.escape(part) for part in static_parts), body, re.S) is not None
        return f"`{relative_path}`" in body or f"'{relative_path}'" in body or f'"{relative_path}"' in body

    def _sdk_method_name(self, operation_id: str, tag: str) -> str:
        operation_parts = self._identifier_parts(operation_id)
        tag_parts = self._simplified_tag_parts(tag)
        if not operation_parts or not tag_parts or len(operation_parts) <= len(tag_parts):
            return operation_id

        if operation_parts[: len(tag_parts)] == tag_parts:
            stripped = self._lower_camel(operation_parts[len(tag_parts) :])
            return stripped or operation_id

        suffix_start = len(operation_parts) - len(tag_parts)
        if operation_parts[suffix_start:] != tag_parts:
            return operation_id

        stripped_parts = operation_parts[:suffix_start]
        first_part = stripped_parts[0] if stripped_parts else ""
        if len(stripped_parts) == 1 and first_part in self.METHOD_VERB_PARTS:
            return operation_id
        stripped = self._lower_camel(stripped_parts)
        return stripped or operation_id

    def _sdk_method_names(self, operation_id: str, operation: dict[str, Any]) -> list[str]:
        candidates = [
            operation_id,
            self._sdk_method_name(operation_id, self._sdk_group_tag(operation)),
        ]
        operation_parts = self._identifier_parts(operation_id)
        if operation_parts:
            candidates.append(operation_parts[-1])
        path_method = self._sdk_path_resource_method_name(operation_id, operation)
        if path_method:
            candidates.append(path_method)
        return list(dict.fromkeys(candidate for candidate in candidates if candidate))

    def _sdk_path_resource_method_name(self, operation_id: str, operation: dict[str, Any]) -> str:
        operation_parts = self._identifier_parts(operation_id)
        if len(operation_parts) < 2:
            return ""

        path_segments = self._normalized_path_segments(self._string(operation.get("api_path")))
        prefix = "/app/v3/api" if operation.get("api_surface") == "app" else "/backend/v3/api"
        prefix_segments = self._normalized_path_segments(prefix)
        if len(path_segments) <= len(prefix_segments) or path_segments[: len(prefix_segments)] != prefix_segments:
            return ""

        resource_segments = [
            segment
            for segment in path_segments[len(prefix_segments) :]
            if segment not in self.RESERVED_GROUP_SEGMENTS_AFTER_PREFIX
        ]
        if not resource_segments:
            return ""

        for resource_segment in reversed(resource_segments):
            resource_parts = self._identifier_parts(resource_segment)
            if not resource_parts:
                continue
            if operation_parts[-len(resource_parts) :] != resource_parts:
                continue
            stripped_parts = operation_parts[: -len(resource_parts)]
            first_part = stripped_parts[0] if stripped_parts else ""
            if len(stripped_parts) == 1 and first_part in self.METHOD_VERB_PARTS:
                continue
            return self._lower_camel(stripped_parts)
        return ""

    def _sdk_group_tag(self, operation: dict[str, Any]) -> str:
        declared_tag = self._string(operation.get("tag"))
        if declared_tag:
            return declared_tag

        api_path = self._string(operation.get("api_path"))
        surface = self._string(operation.get("api_surface"))
        prefix = "/app/v3/api" if surface == "app" else "/backend/v3/api"
        path_segments = self._normalized_path_segments(api_path)
        prefix_segments = self._normalized_path_segments(prefix)
        if len(path_segments) <= len(prefix_segments) or path_segments[: len(prefix_segments)] != prefix_segments:
            return declared_tag

        domain_candidates = path_segments[len(prefix_segments) :]
        domain = next(
            (segment for segment in domain_candidates if segment not in self.RESERVED_GROUP_SEGMENTS_AFTER_PREFIX),
            domain_candidates[0] if domain_candidates else "",
        )
        return domain or declared_tag

    def _normalized_path_segments(self, path: str) -> list[str]:
        segments: list[str] = []
        for segment in str(path or "").split("/"):
            segment = segment.strip()
            if not segment or (segment.startswith("{") and segment.endswith("}")):
                continue
            parts = self._identifier_parts(segment)
            if parts:
                segments.append(self._singularize("_".join(parts)))
        return segments

    def _singularize(self, value: str) -> str:
        value = (value or "").strip().lower()
        if not value:
            return ""
        if value == "news" or value.endswith("news") or value.endswith("us") or value.endswith("is"):
            return value
        if value.endswith("ies") and len(value) > 3:
            return f"{value[:-3]}y"
        if len(value) > 4 and value.endswith(("sses", "ches", "shes", "xes", "zes")):
            return value[:-2]
        if len(value) > 3 and value.endswith("s") and not value.endswith("ss"):
            return value[:-1]
        return value

    def _simplified_tag_parts(self, tag: str) -> list[str]:
        parts = self._identifier_parts(tag)
        while len(parts) > 1 and parts[-1] in self.REMOVABLE_TAG_SUFFIXES:
            parts.pop()
        return parts

    def _identifier_parts(self, value: str) -> list[str]:
        value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value or "")
        value = re.sub(r"[^a-zA-Z0-9]+", "_", value)
        value = re.sub(r"_+", "_", value).strip("_").lower()
        return [part for part in value.split("_") if part]

    def _lower_camel(self, parts: list[str]) -> str:
        if not parts:
            return ""
        return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])

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

    def _payload_schema_name(self, value: Any) -> str | None:
        if not isinstance(value, dict):
            return None
        name = value.get("name")
        schema = value.get("schema")
        if not isinstance(name, str) or not isinstance(schema, dict):
            return None
        return name

    def _schema_matches_ref(self, schema: Any, expected_ref: str) -> bool:
        if not isinstance(schema, dict):
            return False
        if schema.get("$ref") == expected_ref:
            return True
        all_of = schema.get("allOf")
        return isinstance(all_of, list) and all_of == [{"$ref": expected_ref}]

    def _schema_matches(self, actual: Any, expected: Any) -> bool:
        return self._canonical_schema(actual) == self._canonical_schema(expected)

    def _canonical_schema(self, value: Any) -> Any:
        if isinstance(value, list):
            return [self._canonical_schema(item) for item in value]
        if isinstance(value, dict):
            normalized = {
                key: self._canonical_schema(item)
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

    def _schema_ref(self, schema: Any) -> str:
        if not isinstance(schema, dict):
            return ""
        ref = self._string(schema.get("$ref"))
        if ref:
            return ref
        all_of = schema.get("allOf")
        if (
            isinstance(all_of, list)
            and len(all_of) == 1
            and isinstance(all_of[0], dict)
        ):
            return self._string(all_of[0].get("$ref"))
        return ""

    def _type_file_name(self, type_name: str) -> str:
        parts = re.findall(r"[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+", type_name)
        return "-".join(part.lower() for part in parts) + ".ts"

    def _safe_read_text(self, path: Path, default: str | None = None) -> str | None:
        try:
            return path.read_text(encoding="utf-8")
        except OSError:
            return default

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit explicit ClawRouter payload schemas in OpenAPI and generated SDKs.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="API contract manifest path")
    parser.add_argument("--openapi-dir", type=Path, default=None, help="directory containing generated app/backend OpenAPI JSON")
    parser.add_argument("--sdk-root", type=Path, default=None, help="directory containing generated SDK packages")
    args = parser.parse_args()

    result = ClawRouterPayloadSdkAudit(
        root=args.root,
        manifest_path=args.manifest,
        openapi_dir=args.openapi_dir,
        sdk_root=args.sdk_root,
    ).run()
    if result.ok:
        print("ClawRouter payload SDK audit passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
