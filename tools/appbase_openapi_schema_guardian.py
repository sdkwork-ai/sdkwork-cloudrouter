from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Commerce sibling workspace integration is optional; stubs keep the guardian import-safe.
CANONICAL_COMMERCE_API_OPERATIONS = ()
COMMERCE_APP_OPENAPI_PATH = Path()
COMMERCE_BACKEND_OPENAPI_PATH = Path()

def commerce_sibling_workspace_available() -> bool:
    return False

def load_commerce_canonical_api_operations() -> None:
    return None


@dataclass(frozen=True)
class AppbaseOpenApiSchemaGuardianResult:
    ok: bool
    messages: list[str]


class AppbaseOpenApiSchemaGuardian:
    """Validate appbase commerce operations across manifest, OpenAPI, and generated SDKs."""

    SPEC_FILES = {
        "app": "clawrouter-app-openapi.json",
        "backend": "clawrouter-backend-openapi.json",
    }
    SDK_DIRECTORIES = {
        "app": Path("sdks") / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript",
        "backend": Path("sdks") / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript",
    }
    DEPENDENCY_SDK_DIRECTORIES = {
        "app": (
        ),
        "backend": (
        ),
    }
    BODY_METHODS = {"POST", "PUT", "PATCH"}
    JSON_EXTENSION_COMPONENTS = {"JsonNull", "JsonObject", "JsonValue"}
    COMMERCE_OPENAPI_PATHS = {
        "app": COMMERCE_APP_OPENAPI_PATH,
        "backend": COMMERCE_BACKEND_OPENAPI_PATH,
    }
    BODY_METHODS = {"POST", "PUT", "PATCH"}
    JSON_EXTENSION_COMPONENTS = {"JsonNull", "JsonObject", "JsonValue"}

    def __init__(
        self,
        root: Path,
        canonical_operations: tuple[tuple[str, str, str, str], ...] = (),
        manifest_path: Path | None = None,
        openapi_dir: Path | None = None,
        sdk_root: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.canonical_operations = canonical_operations
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self.root / "generated" / "api" / "api-contract-manifest.json"
        )
        self.openapi_dir = Path(openapi_dir).resolve() if openapi_dir is not None else self.root / "generated" / "openapi"
        self.sdk_root = Path(sdk_root).resolve() if sdk_root is not None else self.root

    def run(self) -> AppbaseOpenApiSchemaGuardianResult:
        messages: list[str] = []
        try:
            manifest = self._load_json(self.manifest_path)
            manifest_operations = self._manifest_operations(manifest)
            specs = {
                surface: self._load_json(self.openapi_dir / filename)
                for surface, filename in self.SPEC_FILES.items()
            }
            commerce_specs = self._load_commerce_dependency_specs()
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            return AppbaseOpenApiSchemaGuardianResult(ok=False, messages=[str(exc)])

        for surface, method, path, operation_id in self._effective_canonical_operations():
            label = f"appbase commerce {surface} {operation_id}"
            operation_key = (surface, method, path, operation_id)
            manifest_operation = manifest_operations.get(operation_key)
            commerce_spec = commerce_specs.get(surface, {})
            commerce_operation = self._operation_spec(commerce_spec, method, path)
            commerce_operation_id = (
                self._string(commerce_operation.get("operationId"))
                if isinstance(commerce_operation, dict)
                else ""
            )

            if manifest_operation is not None:
                messages.extend(
                    self._validate_manifest_operation(label, manifest_operation, method, path, operation_id)
                )
                spec = specs.get(surface, {})
                operation = self._operation_spec(spec, method, path)
                messages.extend(self._validate_openapi_operation(label, spec, method, path, operation_id, operation))
                if isinstance(operation, dict):
                    messages.extend(
                        self._validate_manifest_openapi_schema_mapping(
                            label,
                            manifest_operation,
                            operation,
                            method,
                            self._schemas(spec),
                        )
                    )
                messages.extend(self._validate_sdk_method(label, surface, operation_id))
                if isinstance(operation, dict):
                    messages.extend(self._validate_sdk_types(label, surface, spec, operation))
                continue

            if commerce_operation_id == operation_id and isinstance(commerce_operation, dict):
                messages.extend(
                    self._validate_dependency_commerce_operation(
                        label,
                        surface,
                        method,
                        path,
                        operation_id,
                        commerce_operation,
                    )
                )
                continue

            if commerce_sibling_workspace_available() and commerce_operation_id and commerce_operation_id != operation_id:
                messages.append(
                    f"{label} dependency OpenAPI operationId mismatch at {method} {path}: "
                    f"expected {operation_id}, found {commerce_operation_id}"
                )
                continue

            messages.append(f"{label} is missing from API contract manifest: {method} {path}")

        return AppbaseOpenApiSchemaGuardianResult(ok=not messages, messages=messages)

    def _effective_canonical_operations(self) -> tuple[tuple[str, str, str, str], ...]:
        derived = load_commerce_canonical_api_operations()
        if commerce_sibling_workspace_available() and derived:
            return derived
        return self.canonical_operations

    def _validate_dependency_commerce_operation(
        self,
        label: str,
        surface: str,
        method: str,
        path: str,
        operation_id: str,
        operation: dict[str, Any],
    ) -> list[str]:
        messages: list[str] = []
        if self._string(operation.get("operationId")) != operation_id:
            messages.append(f"{label} dependency OpenAPI operationId must be {operation_id}")
        if not isinstance(operation.get("tags"), list) or not operation.get("tags"):
            messages.append(f"{label} dependency OpenAPI tags must be non-empty")
        messages.extend(self._validate_sdk_method(label, surface, operation_id))
        return messages

    def _load_commerce_dependency_specs(self) -> dict[str, dict[str, Any]]:
        if not commerce_sibling_workspace_available():
            return {}
        specs: dict[str, dict[str, Any]] = {}
        for surface, path in self.COMMERCE_OPENAPI_PATHS.items():
            if path.is_file():
                specs[surface] = self._load_json(path)
        return specs

    def _validate_manifest_operation(
        self,
        label: str,
        operation: dict[str, Any],
        method: str,
        path: str,
        operation_id: str,
    ) -> list[str]:
        messages: list[str] = []
        if operation.get("openapi_exposed", True) is False:
            messages.append(f"{label} must be openapi_exposed")
        expected_domain = self._expected_sdk_domain(operation_id)
        if self._string(operation.get("sdk_domain")) != expected_domain:
            messages.append(f"{label} manifest sdk_domain must be {expected_domain}")
        if method == "GET" and not isinstance(operation.get("query_parameters"), list):
            messages.append(f"{label} GET manifest must explicitly declare query_parameters")
        if method in self.BODY_METHODS:
            has_request_schema = isinstance(operation.get("request_schema"), dict)
            explicit_no_body = operation.get("request_body_required") is False
            if not has_request_schema and not explicit_no_body:
                messages.append(f"{label} {method} manifest must declare request_schema or request_body_required: false")
        for path_param in self._path_params(path):
            if path_param not in self._string_list(operation.get("path_params")):
                messages.append(f"{label} manifest path_params must declare {path_param}")
        return messages

    def _validate_openapi_operation(
        self,
        label: str,
        spec: dict[str, Any],
        method: str,
        path: str,
        operation_id: str,
        operation: dict[str, Any] | None = None,
    ) -> list[str]:
        operation = operation if operation is not None else self._operation_spec(spec, method, path)
        if operation is None:
            return [f"{label} is missing from OpenAPI: {method} {path}"]

        messages: list[str] = []
        schemas = self._schemas(spec)
        if operation.get("operationId") != operation_id:
            messages.append(f"{label} OpenAPI operationId must be {operation_id}")
        for field in ("tags", "summary", "description"):
            value = operation.get(field)
            if field == "tags":
                if not isinstance(value, list) or not value:
                    messages.append(f"{label} OpenAPI tags must be non-empty")
            elif not isinstance(value, str) or not value.strip():
                messages.append(f"{label} OpenAPI {field} must be non-empty")
        expected_domain = self._expected_sdk_domain(operation_id)
        if self._string(operation.get("x-sdkwork-domain")) != expected_domain:
            messages.append(f"{label} OpenAPI x-sdkwork-domain must be {expected_domain}")
        if not self._string(operation.get("x-sdkwork-resource")):
            messages.append(f"{label} OpenAPI x-sdkwork-resource must be non-empty")

        messages.extend(self._validate_path_parameters(label, operation, path))
        messages.extend(self._validate_query_parameters(label, operation))
        messages.extend(self._validate_default_error_response(label, operation))
        messages.extend(self._validate_success_response(label, operation, schemas))
        if method in self.BODY_METHODS:
            messages.extend(self._validate_request_body(label, operation, schemas))
        return messages

    def _validate_path_parameters(self, label: str, operation: dict[str, Any], path: str) -> list[str]:
        messages: list[str] = []
        parameters = operation.get("parameters")
        declared = parameters if isinstance(parameters, list) else []
        for path_param in self._path_params(path):
            parameter = next(
                (
                    candidate
                    for candidate in declared
                    if isinstance(candidate, dict)
                    and candidate.get("name") == path_param
                    and candidate.get("in") == "path"
                ),
                None,
            )
            if not isinstance(parameter, dict):
                messages.append(f"{label} OpenAPI path parameter is missing: {path_param}")
                continue
            if parameter.get("required") is not True:
                messages.append(f"{label} OpenAPI path parameter {path_param} must be required")
            if not self._typed_schema(parameter.get("schema")):
                messages.append(f"{label} OpenAPI path parameter {path_param} must declare a typed schema")
        return messages

    def _validate_query_parameters(self, label: str, operation: dict[str, Any]) -> list[str]:
        parameters = operation.get("parameters")
        if not isinstance(parameters, list):
            return []
        messages: list[str] = []
        for parameter in parameters:
            if not isinstance(parameter, dict) or parameter.get("in") != "query":
                continue
            name = parameter.get("name")
            if not isinstance(name, str) or not re.match(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$", name):
                messages.append(f"{label} OpenAPI query parameter {name} must be lower_snake_case")
            if not self._typed_schema(parameter.get("schema")):
                messages.append(f"{label} OpenAPI query parameter {name} must declare a typed schema")
        return messages

    def _validate_default_error_response(self, label: str, operation: dict[str, Any]) -> list[str]:
        default_response = operation.get("responses", {}).get("default") if isinstance(operation.get("responses"), dict) else None
        if self._problem_detail_response(default_response):
            return []
        return [f"{label} must declare default application/problem+json ProblemDetail response"]

    def _validate_success_response(
        self,
        label: str,
        operation: dict[str, Any],
        schemas: dict[str, Any],
    ) -> list[str]:
        messages: list[str] = []
        response_ref = self._success_response_ref(operation)
        if not response_ref.endswith("Result") or not response_ref.startswith("#/components/schemas/"):
            return [f"{label} 200 response must reference an operation-specific *Result schema"]
        component_name = response_ref.rsplit("/", 1)[-1]
        schema = schemas.get(component_name)
        if not isinstance(schema, dict):
            return [f"{label} result schema is missing: {component_name}"]
        if schema.get("type") != "object":
            messages.append(f"{label} result schema {component_name} must be object")
        if schema.get("additionalProperties") is not False:
            messages.append(f"{label} result schema {component_name} must set additionalProperties false")
        if schema.get("x-operation-id") and schema.get("x-operation-id") != operation.get("operationId"):
            messages.append(f"{label} result schema {component_name} x-operation-id must match operationId")
        properties = schema.get("properties")
        if not isinstance(properties, dict):
            messages.append(f"{label} result schema {component_name} must declare properties")
        elif "data" not in properties:
            messages.append(f"{label} result schema {component_name}.data must be explicitly declared")
        else:
            messages.extend(
                self._validate_component_schema(
                    label=label,
                    component_name=component_name,
                    schema=schema,
                    schemas=schemas,
                    context=f"result schema {component_name}",
                    allow_empty_closed_object=False,
                    visited={component_name},
                )
            )
        return messages

    def _validate_request_body(
        self,
        label: str,
        operation: dict[str, Any],
        schemas: dict[str, Any],
    ) -> list[str]:
        request_body = operation.get("requestBody")
        if not isinstance(request_body, dict):
            return [f"{label} OpenAPI requestBody is missing for body-bearing method"]
        content = request_body.get("content")
        if not isinstance(content, dict):
            return [f"{label} OpenAPI requestBody.content must be declared"]
        media = content.get("application/json") or next(
            (value for value in content.values() if isinstance(value, dict)),
            None,
        )
        schema = media.get("schema") if isinstance(media, dict) else None
        request_ref = self._schema_ref(schema)
        if not request_ref.startswith("#/components/schemas/"):
            return [f"{label} OpenAPI requestBody must reference a component request schema"]
        component_name = request_ref.rsplit("/", 1)[-1]
        request_schema = schemas.get(component_name)
        if not isinstance(request_schema, dict):
            return [f"{label} request schema is missing: {component_name}"]
        if request_schema.get("type") != "object":
            return [f"{label} request schema {component_name} must be object"]
        if request_schema.get("additionalProperties") is not False:
            return [f"{label} request schema {component_name} must be closed with additionalProperties false"]
        properties = request_schema.get("properties")
        if not isinstance(properties, dict):
            return [f"{label} request schema {component_name}.properties must be declared"]
        messages: list[str] = []
        if not properties and request_body.get("required") is not False:
            messages.append(f"{label} request schema {component_name} must not be empty for a required body")
        messages.extend(
            self._validate_component_schema(
                label=label,
                component_name=component_name,
                schema=request_schema,
                schemas=schemas,
                context=f"request schema {component_name}",
                allow_empty_closed_object=request_body.get("required") is False,
                visited={component_name},
            )
        )
        return messages

    def _validate_manifest_openapi_schema_mapping(
        self,
        label: str,
        manifest_operation: dict[str, Any],
        operation: dict[str, Any],
        method: str,
        schemas: dict[str, Any],
    ) -> list[str]:
        messages: list[str] = []
        if method in self.BODY_METHODS:
            expected_request_schema = self._payload_schema_name(manifest_operation.get("request_schema"))
            if expected_request_schema:
                actual_request_schema = self._request_body_schema_name(operation)
                if actual_request_schema != expected_request_schema:
                    messages.append(
                        f"{label} OpenAPI requestBody schema must match manifest request_schema {expected_request_schema}"
                    )
        expected_response_schema = self._payload_schema_name(manifest_operation.get("response_schema"))
        if expected_response_schema and expected_response_schema not in {"NoData", "PlusApiResult"}:
            actual_response_schema = self._result_data_schema_name(operation, schemas)
            if actual_response_schema != expected_response_schema:
                messages.append(
                    f"{label} OpenAPI result data schema must match manifest response_schema {expected_response_schema}"
                )
        return messages

    def _validate_component_schema(
        self,
        *,
        label: str,
        component_name: str,
        schema: Any,
        schemas: dict[str, Any],
        context: str,
        allow_empty_closed_object: bool,
        visited: set[str],
    ) -> list[str]:
        messages: list[str] = []
        if not isinstance(schema, dict):
            return [f"{label} {context} must use a typed schema or component reference"]

        schema_ref = self._schema_ref(schema)
        if schema_ref:
            referenced_name = schema_ref.rsplit("/", 1)[-1] if schema_ref.startswith("#/components/schemas/") else ""
            if not referenced_name:
                return [f"{label} {context} must use a local component schema reference"]
            referenced_schema = schemas.get(referenced_name)
            if not isinstance(referenced_schema, dict):
                return [f"{label} {context} references missing schema {referenced_name}"]
            if referenced_name in visited:
                return []
            return self._validate_component_schema(
                label=label,
                component_name=referenced_name,
                schema=referenced_schema,
                schemas=schemas,
                context=f"component {referenced_name}",
                allow_empty_closed_object=False,
                visited={*visited, referenced_name},
            )

        if schema.get("nullable") is True and not self._schema_has_base_type_or_ref(schema):
            return [f"{label} {context} nullable schema must also declare a base type or reference"]

        schema_type = schema.get("type")
        if schema_type == "array":
            items = schema.get("items")
            if not self._meaningfully_typed_schema(items, allow_empty_closed_object=False):
                return [f"{label} {context} array schema must declare typed items"]
            messages.extend(
                self._validate_component_schema(
                    label=label,
                    component_name=component_name,
                    schema=items,
                    schemas=schemas,
                    context=f"{context}.items",
                    allow_empty_closed_object=False,
                    visited=visited,
                )
            )
            return messages

        for union_key in ("allOf", "anyOf", "oneOf"):
            variants = schema.get(union_key)
            if variants is None:
                continue
            if not isinstance(variants, list) or not variants:
                messages.append(f"{label} {context}.{union_key} must contain typed schema variants")
                continue
            for index, variant in enumerate(variants):
                if not self._meaningfully_typed_schema(variant, allow_empty_closed_object=False):
                    messages.append(f"{label} {context}.{union_key}[{index}] must use a typed schema or component reference")
                    continue
                messages.extend(
                    self._validate_component_schema(
                        label=label,
                        component_name=component_name,
                        schema=variant,
                        schemas=schemas,
                        context=f"{context}.{union_key}[{index}]",
                        allow_empty_closed_object=False,
                        visited=visited,
                    )
                )
            return messages

        if not self._meaningfully_typed_schema(schema, allow_empty_closed_object=allow_empty_closed_object):
            return [f"{label} {context} must use a typed schema or component reference"]

        if schema_type == "object":
            properties = schema.get("properties")
            additional_properties = schema.get("additionalProperties")
            is_json_extension = component_name in self.JSON_EXTENSION_COMPONENTS
            if additional_properties is True:
                messages.append(f"{label} {context} object schema must not use unbounded additionalProperties true")
            elif isinstance(additional_properties, dict):
                if not self._meaningfully_typed_schema(additional_properties, allow_empty_closed_object=False):
                    messages.append(f"{label} {context}.additionalProperties must use a typed schema or component reference")
                else:
                    messages.extend(
                        self._validate_component_schema(
                            label=label,
                            component_name=component_name,
                            schema=additional_properties,
                            schemas=schemas,
                            context=f"{context}.additionalProperties",
                            allow_empty_closed_object=False,
                            visited=visited,
                        )
                    )
            elif additional_properties is not False and not is_json_extension:
                messages.append(f"{label} {context} object schema must explicitly close additionalProperties or declare a typed map value schema")

            if isinstance(properties, dict):
                if not properties and additional_properties is False and not allow_empty_closed_object and not is_json_extension:
                    messages.append(f"{label} {context} object schema must declare typed properties or typed additionalProperties")
                for property_name, property_schema in properties.items():
                    messages.extend(
                        self._validate_component_schema(
                            label=label,
                            component_name=component_name,
                            schema=property_schema,
                            schemas=schemas,
                            context=f"{context}.{property_name}",
                            allow_empty_closed_object=False,
                            visited=visited,
                        )
                    )
                required = schema.get("required")
                if isinstance(required, list):
                    for required_property in required:
                        if isinstance(required_property, str) and required_property not in properties:
                            messages.append(f"{label} {context}.required declares unknown property {required_property}")
            elif additional_properties is False and not allow_empty_closed_object and not is_json_extension:
                messages.append(f"{label} {context} object schema must declare properties")

        return messages

    def _validate_sdk_method(self, label: str, surface: str, operation_id: str) -> list[str]:
        method_name = operation_id.rsplit(".", 1)[-1]
        package_dir = self._sdk_package_dir(surface)
        api_dir = package_dir / "src" / "api"
        if not api_dir.is_dir():
            return [f"{label} generated SDK api directory is missing: {self._display_path(api_dir)}"]
        for source_path in sorted(api_dir.glob("*.ts")):
            source = source_path.read_text(encoding="utf-8", errors="ignore")
            if self._source_declares_method(source, method_name):
                return []
        return [f"{label} generated SDK method is missing: {method_name}"]

    def _expected_sdk_domain(self, operation_id: str) -> str:
        if operation_id.startswith("promotions."):
            return "promotion"
        return "commerce"

    def _validate_sdk_types(
        self,
        label: str,
        surface: str,
        spec: dict[str, Any],
        operation: dict[str, Any],
    ) -> list[str]:
        schemas = self._schemas(spec)
        component_names = self._operation_component_names(operation, schemas)
        if not component_names:
            return []
        package_dir = self._sdk_package_dir(surface)
        types_dir = package_dir / "src" / "types"
        if not types_dir.is_dir():
            return [f"{label} generated SDK types directory is missing: {self._display_path(types_dir)}"]
        index_path = types_dir / "index.ts"
        index_source = index_path.read_text(encoding="utf-8", errors="ignore") if index_path.is_file() else ""
        generic_type_messages = self._validate_generic_commerce_sdk_types(
            package_dir=package_dir,
            operation=operation,
            index_source=index_source,
        )
        if generic_type_messages is not None:
            return generic_type_messages
        messages: list[str] = []
        for component_name in sorted(component_names):
            module_name = self._typescript_module_name(component_name)
            type_path = types_dir / f"{module_name}.ts"
            if not type_path.is_file():
                messages.append(
                    f"{label} generated SDK type file is missing for component {component_name}: "
                    f"src/types/{module_name}.ts"
                )
                continue
            if not self._source_exports_type(index_source, component_name, module_name):
                messages.append(
                    f"{label} generated SDK type export is missing for component {component_name} in src/types/index.ts"
                )
        return messages

    def _validate_generic_commerce_sdk_types(
        self,
        *,
        package_dir: Path,
        operation: dict[str, Any],
        index_source: str,
    ) -> list[str] | None:
        operation_id = self._string(operation.get("operationId"))
        method_name = operation_id.rsplit(".", 1)[-1]
        api_dir = package_dir / "src" / "api"
        if not method_name or not api_dir.is_dir():
            return None
        generic_method_declared = False
        for source_path in sorted(api_dir.glob("*.ts")):
            source = source_path.read_text(encoding="utf-8", errors="ignore")
            if re.search(
                rf"\basync\s+{re.escape(method_name)}\s*\([^)]*\)\s*:\s*Promise\s*<\s*CommerceApiResult\s*>",
                source,
                flags=re.DOTALL,
            ):
                generic_method_declared = True
                break
        if not generic_method_declared:
            return None

        required_types = ["CommerceApiResult"]
        if isinstance(operation.get("requestBody"), dict):
            required_types.append("CommerceOperationCommand")
        messages = []
        for required_type in required_types:
            module_name = self._typescript_module_name(required_type)
            if not self._source_exports_type(index_source, required_type, module_name):
                messages.append(f"generated SDK generic type export is missing for {required_type}")
        return messages

    def _sdk_package_dir(self, surface: str) -> Path:
        candidates = self._sdk_package_dir_candidates(surface)
        for candidate in candidates:
            if (candidate / "src" / "api").is_dir() or (candidate / "src" / "types").is_dir():
                return candidate
        return candidates[0]

    def _sdk_package_dir_candidates(self, surface: str) -> list[Path]:
        dependency = self.DEPENDENCY_SDK_DIRECTORIES[surface]
        return [
            self.sdk_root / dependency,
            self.sdk_root.parent / dependency,
            self.sdk_root / self.SDK_DIRECTORIES[surface],
        ]

    def _operation_component_names(self, operation: dict[str, Any], schemas: dict[str, Any]) -> set[str]:
        component_names: set[str] = set()
        roots: list[Any] = []
        success_ref = self._success_response_ref(operation)
        if success_ref:
            roots.append({"$ref": success_ref})
        request_body = operation.get("requestBody")
        if isinstance(request_body, dict):
            content = request_body.get("content")
            if isinstance(content, dict):
                media = content.get("application/json") or next(
                    (value for value in content.values() if isinstance(value, dict)),
                    None,
                )
                schema = media.get("schema") if isinstance(media, dict) else None
                if isinstance(schema, dict):
                    roots.append(schema)
        for root_schema in roots:
            self._collect_component_names(root_schema, schemas, component_names, visited=set())
        return component_names

    def _collect_component_names(
        self,
        schema: Any,
        schemas: dict[str, Any],
        component_names: set[str],
        visited: set[str],
    ) -> None:
        if not isinstance(schema, dict):
            return
        ref = self._schema_ref(schema)
        if ref.startswith("#/components/schemas/"):
            component_name = ref.rsplit("/", 1)[-1]
            component_names.add(component_name)
            if component_name in visited:
                return
            component_schema = schemas.get(component_name)
            if isinstance(component_schema, dict):
                self._collect_component_names(component_schema, schemas, component_names, {*visited, component_name})
            return
        for key in ("items", "additionalProperties"):
            nested = schema.get(key)
            if isinstance(nested, dict):
                self._collect_component_names(nested, schemas, component_names, visited)
        properties = schema.get("properties")
        if isinstance(properties, dict):
            for property_schema in properties.values():
                self._collect_component_names(property_schema, schemas, component_names, visited)
        for union_key in ("allOf", "anyOf", "oneOf"):
            variants = schema.get(union_key)
            if isinstance(variants, list):
                for variant in variants:
                    self._collect_component_names(variant, schemas, component_names, visited)

    def _operation_spec(self, spec: dict[str, Any], method: str, path: str) -> dict[str, Any] | None:
        paths = spec.get("paths")
        if not isinstance(paths, dict):
            return None
        path_item = paths.get(path)
        if not isinstance(path_item, dict):
            return None
        operation = path_item.get(method.lower())
        return operation if isinstance(operation, dict) else None

    def _schemas(self, spec: dict[str, Any]) -> dict[str, Any]:
        components = spec.get("components")
        schemas = components.get("schemas") if isinstance(components, dict) else None
        return schemas if isinstance(schemas, dict) else {}

    def _manifest_operations(self, manifest: dict[str, Any]) -> dict[tuple[str, str, str, str], dict[str, Any]]:
        result: dict[tuple[str, str, str, str], dict[str, Any]] = {}
        operations = manifest.get("operations")
        if not isinstance(operations, list):
            return result
        for operation in operations:
            if not isinstance(operation, dict):
                continue
            surface = self._string(operation.get("api_surface"))
            method = self._string(operation.get("api_method")).upper()
            path = self._string(operation.get("api_path"))
            operation_id = self._string(operation.get("operation_id")) or self._string(operation.get("operation"))
            result[(surface, method, path, operation_id)] = operation
        return result

    def _problem_detail_response(self, response: Any) -> bool:
        if not isinstance(response, dict):
            return False
        content = response.get("content")
        if not isinstance(content, dict):
            return False
        media = content.get("application/problem+json")
        if not isinstance(media, dict):
            return False
        return self._schema_ref(media.get("schema")) == "#/components/schemas/ProblemDetail"

    def _success_response_ref(self, operation: dict[str, Any]) -> str:
        responses = operation.get("responses")
        success = responses.get("200") if isinstance(responses, dict) else None
        content = success.get("content") if isinstance(success, dict) else None
        media = content.get("application/json") if isinstance(content, dict) else None
        schema = media.get("schema") if isinstance(media, dict) else None
        return self._schema_ref(schema)

    def _request_body_schema_name(self, operation: dict[str, Any]) -> str:
        request_body = operation.get("requestBody")
        content = request_body.get("content") if isinstance(request_body, dict) else None
        media = content.get("application/json") if isinstance(content, dict) else None
        schema = media.get("schema") if isinstance(media, dict) else None
        schema_ref = self._schema_ref(schema)
        return schema_ref.rsplit("/", 1)[-1] if schema_ref.startswith("#/components/schemas/") else ""

    def _result_data_schema_name(self, operation: dict[str, Any], schemas: dict[str, Any]) -> str:
        result_ref = self._success_response_ref(operation)
        if not result_ref.startswith("#/components/schemas/"):
            return ""
        component_name = result_ref.rsplit("/", 1)[-1]
        result_schema = schemas.get(component_name)
        properties = result_schema.get("properties") if isinstance(result_schema, dict) else None
        data_schema = properties.get("data") if isinstance(properties, dict) else None
        data_ref = self._schema_ref(data_schema)
        return data_ref.rsplit("/", 1)[-1] if data_ref.startswith("#/components/schemas/") else ""

    def _payload_schema_name(self, value: Any) -> str:
        if not isinstance(value, dict):
            return ""
        name = value.get("name")
        return name if isinstance(name, str) else ""

    def _typed_schema(self, schema: Any) -> bool:
        if not isinstance(schema, dict):
            return False
        if self._schema_ref(schema):
            return True
        if isinstance(schema.get("type"), str):
            return True
        if isinstance(schema.get("oneOf"), list) or isinstance(schema.get("anyOf"), list):
            return True
        return False

    def _meaningfully_typed_schema(self, schema: Any, *, allow_empty_closed_object: bool) -> bool:
        if not isinstance(schema, dict):
            return False
        if self._schema_ref(schema):
            return True
        if isinstance(schema.get("oneOf"), list) or isinstance(schema.get("anyOf"), list) or isinstance(schema.get("allOf"), list):
            return True
        schema_type = schema.get("type")
        if isinstance(schema_type, list):
            return bool(schema_type) and all(isinstance(item, str) for item in schema_type)
        if schema_type == "array":
            return self._meaningfully_typed_schema(schema.get("items"), allow_empty_closed_object=False)
        if schema_type == "object":
            properties = schema.get("properties")
            additional_properties = schema.get("additionalProperties")
            if isinstance(properties, dict) and properties:
                return True
            if allow_empty_closed_object and properties == {} and additional_properties is False:
                return True
            if isinstance(additional_properties, dict):
                return self._meaningfully_typed_schema(additional_properties, allow_empty_closed_object=False)
            return False
        return isinstance(schema_type, str)

    def _schema_has_base_type_or_ref(self, schema: dict[str, Any]) -> bool:
        if self._schema_ref(schema):
            return True
        if isinstance(schema.get("type"), str) or isinstance(schema.get("type"), list):
            return True
        if isinstance(schema.get("oneOf"), list) or isinstance(schema.get("anyOf"), list) or isinstance(schema.get("allOf"), list):
            return True
        return False

    def _schema_ref(self, schema: Any) -> str:
        if not isinstance(schema, dict):
            return ""
        ref = schema.get("$ref")
        if isinstance(ref, str):
            return ref
        all_of = schema.get("allOf")
        if isinstance(all_of, list) and len(all_of) == 1 and isinstance(all_of[0], dict):
            nested_ref = all_of[0].get("$ref")
            return nested_ref if isinstance(nested_ref, str) else ""
        return ""

    def _source_declares_method(self, source: str, method_name: str) -> bool:
        return re.search(rf"\basync\s+{re.escape(method_name)}\s*\(", source) is not None

    def _source_exports_type(self, source: str, component_name: str, module_name: str) -> bool:
        return (
            re.search(
                rf"export\s+type\s+\{{[^}}]*\b{re.escape(component_name)}\b[^}}]*\}}\s+from\s+['\"]\./{re.escape(module_name)}['\"]",
                source,
            )
            is not None
            or re.search(
                rf"export\s+\{{[^}}]*\b{re.escape(component_name)}\b[^}}]*\}}\s+from\s+['\"]\./{re.escape(module_name)}['\"]",
                source,
            )
            is not None
            or re.search(rf"export\s+\*\s+from\s+['\"]\./{re.escape(module_name)}['\"]", source) is not None
        )

    def _typescript_module_name(self, component_name: str) -> str:
        result: list[str] = []
        previous = ""
        for index, char in enumerate(component_name):
            next_char = component_name[index + 1] if index + 1 < len(component_name) else ""
            if (
                char.isupper()
                and index > 0
                and (previous.islower() or previous.isdigit() or next_char.islower())
            ):
                result.append("-")
            result.append(char.lower())
            previous = char
        return "".join(result)

    def _path_params(self, path: str) -> list[str]:
        return re.findall(r"\{([^}]+)\}", path)

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()

    def _load_json(self, path: Path) -> dict[str, Any]:
        if not path.is_file():
            raise ValueError(f"missing JSON document: {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"JSON document root must be an object: {path}")
        return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate appbase commerce OpenAPI and generated SDK schema coverage.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="API contract manifest path")
    parser.add_argument("--openapi-dir", type=Path, default=None, help="directory containing generated app/backend OpenAPI JSON")
    parser.add_argument("--sdk-root", type=Path, default=None, help="directory containing generated SDK packages")
    args = parser.parse_args()

    result = AppbaseOpenApiSchemaGuardian(
        root=args.root,
        manifest_path=args.manifest,
        openapi_dir=args.openapi_dir,
        sdk_root=args.sdk_root,
    ).run()
    if result.ok:
        print("Appbase OpenAPI schema guardian passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
