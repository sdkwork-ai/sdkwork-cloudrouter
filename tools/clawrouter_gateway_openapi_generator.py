from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ClawRouterGatewayOpenApiCheckResult:
    ok: bool
    messages: list[str]


@dataclass(frozen=True)
class VendorSchemaQualityAudit:
    unregistered_vendor_paths: list[str]
    root_schema_names: set[str]
    reachable_schema_names: set[str]
    unresolved_refs: list[str]
    non_component_payload_schemas: list[str]
    optional_request_bodies: list[str]
    path_parameter_mismatches: list[str]
    query_parameter_mismatches: list[str]
    open_object_components: list[str]
    unregistered_operation_tags: list[str]
    generic_payload_refs: list[str]
    missing_component_descriptions: list[str]
    inline_free_form_objects: list[str]
    anonymous_object_union_branches: list[str]


@dataclass(frozen=True)
class PublicPayloadSchemaQualityAudit:
    generic_payload_refs: list[str]
    unresolved_refs: list[str]
    ref_siblings: list[str]
    empty_schema_shapes: list[str]
    untyped_component_properties: list[str]
    open_object_components: list[str]


@dataclass(frozen=True)
class OpenApiReferenceStandardAudit:
    missing_request_body_descriptions: list[str]
    missing_schema_descriptions: list[str]
    missing_union_branch_descriptions: list[str]
    missing_additional_properties_descriptions: list[str]
    null_type_schemas: list[str]
    nullable_schemas_without_type: list[str]
    invalid_array_schemas: list[str]
    misplaced_object_keywords: list[str]
    missing_required_properties: list[str]


GENERIC_VENDOR_SCHEMA_REFS = {
    "#/components/schemas/JsonObject",
    "#/components/schemas/ProviderMultipartRequest",
}

VENDOR_PROVIDER_PREFIXES = {
    "google",
    "anthropic",
    "volcengine",
    "suno",
    "midjourney",
    "kling",
    "vidu",
    "nano-banana",
}


def audit_vendor_schema_quality(
    spec: dict[str, Any],
    *,
    provider_prefixes: set[str] | None = None,
) -> VendorSchemaQualityAudit:
    provider_prefixes = provider_prefixes or VENDOR_PROVIDER_PREFIXES
    schemas = spec.get("components", {}).get("schemas", {})
    if not isinstance(schemas, dict):
        schemas = {}

    root_schema_names: set[str] = set()
    reachable_schema_names: set[str] = set()
    unresolved_refs: list[str] = []
    non_component_payload_schemas: list[str] = []
    optional_request_bodies: list[str] = []
    path_parameter_mismatches: list[str] = []
    query_parameter_mismatches: list[str] = []
    open_object_components: list[str] = []
    unregistered_operation_tags: list[str] = []
    generic_payload_refs: list[str] = []
    missing_component_descriptions: list[str] = []
    inline_free_form_objects: list[str] = []
    anonymous_object_union_branches: list[str] = []
    unregistered_vendor_paths: list[str] = []
    visited_schema_names: set[str] = set()
    declared_tags = {
        tag["name"]
        for tag in spec.get("tags", [])
        if isinstance(tag, dict) and isinstance(tag.get("name"), str)
    }

    for path, path_item in spec.get("paths", {}).items():
        if not isinstance(path, str) or not isinstance(path_item, dict):
            continue
        if path.startswith("/v1/") or path == "/v1":
            continue
        path_segments = path.split("/")
        provider_prefix = path_segments[1] if len(path_segments) > 1 else ""
        if provider_prefix not in provider_prefixes:
            unregistered_vendor_paths.append(path)
            continue

        expected_path_parameters = {parameter.lstrip("*") for parameter in re.findall(r"\{([^}]+)\}", path)}
        for method, operation in path_item.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue

            operation_tags = operation.get("tags")
            if not isinstance(operation_tags, list) or not operation_tags:
                unregistered_operation_tags.append(f"{method.upper()} {path} must declare at least one tag")
            else:
                for tag in operation_tags:
                    if not isinstance(tag, str) or tag not in declared_tags:
                        unregistered_operation_tags.append(
                            f"{method.upper()} {path} uses undeclared tag {tag}"
                        )

            _audit_path_parameters(
                expected_path_parameters=expected_path_parameters,
                operation=operation,
                location=f"{method.upper()} {path}",
                path_parameter_mismatches=path_parameter_mismatches,
            )
            _audit_query_parameters(
                operation=operation,
                location=f"{method.upper()} {path}",
                query_parameter_mismatches=query_parameter_mismatches,
            )

            request_body = operation.get("requestBody", {})
            if isinstance(request_body, dict) and request_body.get("content"):
                if request_body.get("required") is not True:
                    optional_request_bodies.append(f"{method.upper()} {path} requestBody must be required")

            for content_type, media_type in request_body.get("content", {}).items():
                if not isinstance(media_type, dict):
                    continue
                _audit_payload_schema(
                    schema=media_type.get("schema"),
                    location=f"{method.upper()} {path} {content_type} request",
                    root_schema_names=root_schema_names,
                    non_component_payload_schemas=non_component_payload_schemas,
                    generic_payload_refs=generic_payload_refs,
                )

            for status, response in operation.get("responses", {}).items():
                if not isinstance(response, dict):
                    continue
                for content_type, media_type in response.get("content", {}).items():
                    if not isinstance(media_type, dict):
                        continue
                    _audit_payload_schema(
                        schema=media_type.get("schema"),
                        location=f"{method.upper()} {path} {status} {content_type} response",
                        root_schema_names=root_schema_names,
                        non_component_payload_schemas=non_component_payload_schemas,
                        generic_payload_refs=generic_payload_refs,
                    )

    def visit(schema: Any, location: str) -> None:
        if not isinstance(schema, dict):
            return

        schema_ref = _component_schema_ref(schema)
        if schema_ref is not None:
            if schema_ref not in schemas:
                unresolved_refs.append(f"{location} -> #/components/schemas/{schema_ref}")
                return
            if schema_ref in visited_schema_names:
                return
            visited_schema_names.add(schema_ref)
            reachable_schema_names.add(schema_ref)
            visit(schemas[schema_ref], f"#/components/schemas/{schema_ref}")
            return

        properties = schema.get("properties")
        additional_properties = schema.get("additionalProperties")
        if location.startswith("#/components/schemas/") and "." not in location:
            description = schema.get("description")
            if not isinstance(description, str) or not description.strip():
                missing_component_descriptions.append(location)
            if schema.get("type") == "object":
                additional_properties = schema.get("additionalProperties")
                if additional_properties is True or additional_properties is None:
                    open_object_components.append(
                        f"{location} must set additionalProperties to false or a typed schema"
                    )

        if (
            (".properties." in location or ".items" in location)
            and schema.get("type") == "object"
            and not isinstance(properties, dict)
            and additional_properties is True
        ):
            inline_free_form_objects.append(location)

        if isinstance(properties, dict):
            for property_name, property_schema in properties.items():
                visit(property_schema, f"{location}.properties.{property_name}")

        items = schema.get("items")
        if isinstance(items, dict):
            visit(items, f"{location}.items")

        if isinstance(additional_properties, dict):
            visit(additional_properties, f"{location}.additionalProperties")

        for union_key in ["oneOf", "anyOf", "allOf"]:
            union_schemas = schema.get(union_key)
            if not isinstance(union_schemas, list):
                continue
            for index, union_schema in enumerate(union_schemas):
                if not isinstance(union_schema, dict):
                    continue
                if union_schema.get("type") == "object" and "$ref" not in union_schema:
                    anonymous_object_union_branches.append(f"{location}.{union_key}[{index}]")
                visit(union_schema, f"{location}.{union_key}[{index}]")

    for root_schema_name in sorted(root_schema_names):
        visit({"$ref": f"#/components/schemas/{root_schema_name}"}, f"#/vendor-roots/{root_schema_name}")

    return VendorSchemaQualityAudit(
        unregistered_vendor_paths=sorted(set(unregistered_vendor_paths)),
        root_schema_names=root_schema_names,
        reachable_schema_names=reachable_schema_names,
        unresolved_refs=sorted(set(unresolved_refs)),
        non_component_payload_schemas=sorted(set(non_component_payload_schemas)),
        optional_request_bodies=sorted(set(optional_request_bodies)),
        path_parameter_mismatches=sorted(set(path_parameter_mismatches)),
        query_parameter_mismatches=sorted(set(query_parameter_mismatches)),
        open_object_components=sorted(set(open_object_components)),
        unregistered_operation_tags=sorted(set(unregistered_operation_tags)),
        generic_payload_refs=sorted(set(generic_payload_refs)),
        missing_component_descriptions=sorted(set(missing_component_descriptions)),
        inline_free_form_objects=sorted(set(inline_free_form_objects)),
        anonymous_object_union_branches=sorted(set(anonymous_object_union_branches)),
    )


def audit_public_payload_schema_quality(spec: dict[str, Any]) -> PublicPayloadSchemaQualityAudit:
    schemas = spec.get("components", {}).get("schemas", {})
    if not isinstance(schemas, dict):
        schemas = {}

    generic_payload_refs: list[str] = []
    unresolved_refs: list[str] = []
    ref_siblings: list[str] = []
    empty_schema_shapes: list[str] = []
    untyped_component_properties: list[str] = []
    open_object_components: list[str] = []

    for path, path_item in spec.get("paths", {}).items():
        if not isinstance(path, str) or not isinstance(path_item, dict):
            continue
        if path != "/v1" and not path.startswith("/v1/"):
            continue
        for method, operation in path_item.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue

            request_body = operation.get("requestBody", {})
            if isinstance(request_body, dict):
                for content_type, media_type in request_body.get("content", {}).items():
                    if not isinstance(media_type, dict):
                        continue
                    schema_ref = _raw_schema_ref(media_type.get("schema"))
                    if schema_ref in GENERIC_VENDOR_SCHEMA_REFS:
                        generic_payload_refs.append(
                            f"{method.upper()} {path} {content_type} request uses {schema_ref}"
                        )

            for status, response in operation.get("responses", {}).items():
                if not isinstance(response, dict):
                    continue
                for content_type, media_type in response.get("content", {}).items():
                    if not isinstance(media_type, dict):
                        continue
                    schema_ref = _raw_schema_ref(media_type.get("schema"))
                    if schema_ref in GENERIC_VENDOR_SCHEMA_REFS:
                        generic_payload_refs.append(
                            f"{method.upper()} {path} {status} {content_type} response uses {schema_ref}"
                        )

    def visit_schema(node: Any, location: str) -> None:
        if isinstance(node, dict):
            if not node:
                empty_schema_shapes.append(location)
                return
            raw_ref = _raw_schema_ref(node)
            if raw_ref is not None:
                if len(node) > 1:
                    ref_siblings.append(f"{location} uses $ref with sibling keys {sorted(node)}")
                if raw_ref.startswith("#/components/schemas/"):
                    schema_name = raw_ref.rsplit("/", 1)[-1]
                    if schema_name not in schemas:
                        unresolved_refs.append(f"{location} -> {raw_ref}")
            if node.get("type") == "object" and node.get("additionalProperties") is True:
                open_object_components.append(
                    f"{location} must set additionalProperties to false or a typed schema"
                )
            if location.startswith("#/components/schemas") and node.get("type") == "object":
                properties = node.get("properties")
                if isinstance(properties, dict):
                    for property_name, property_schema in properties.items():
                        if not isinstance(property_schema, dict):
                            continue
                        has_schema_shape = any(
                            key in property_schema
                            for key in (
                                "$ref",
                                "type",
                                "oneOf",
                                "anyOf",
                                "allOf",
                                "enum",
                                "const",
                                "items",
                                "properties",
                                "additionalProperties",
                            )
                        )
                        if not has_schema_shape:
                            untyped_component_properties.append(
                                f"{location}.properties.{property_name} must declare a type, ref, union, or structured schema shape"
                            )
            for key, value in node.items():
                visit_schema(value, f"{location}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                visit_schema(value, f"{location}[{index}]")

    visit_schema(schemas, "#/components/schemas")

    return PublicPayloadSchemaQualityAudit(
        generic_payload_refs=sorted(set(generic_payload_refs)),
        unresolved_refs=sorted(set(unresolved_refs)),
        ref_siblings=sorted(set(ref_siblings)),
        empty_schema_shapes=sorted(set(empty_schema_shapes)),
        untyped_component_properties=sorted(set(untyped_component_properties)),
        open_object_components=sorted(set(open_object_components)),
    )


def audit_openapi_reference_standards(spec: dict[str, Any]) -> OpenApiReferenceStandardAudit:
    missing_request_body_descriptions: list[str] = []
    missing_schema_descriptions: list[str] = []
    missing_union_branch_descriptions: list[str] = []
    missing_additional_properties_descriptions: list[str] = []
    null_type_schemas: list[str] = []
    nullable_schemas_without_type: list[str] = []
    invalid_array_schemas: list[str] = []
    misplaced_object_keywords: list[str] = []
    missing_required_properties: list[str] = []

    for path, path_item in spec.get("paths", {}).items():
        if not isinstance(path, str) or not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue
            request_body = operation.get("requestBody")
            if not isinstance(request_body, dict) or not request_body.get("content"):
                continue
            description = request_body.get("description")
            if not isinstance(description, str) or not description.strip():
                missing_request_body_descriptions.append(
                    f"{method.upper()} {path} requestBody must declare a description"
                )

    def visit_schema(node: Any, location: str) -> None:
        if isinstance(node, dict):
            if _raw_schema_ref(node) is None:
                description = node.get("description")
                if not isinstance(description, str) or not description.strip():
                    missing_schema_descriptions.append(f"{location} must declare a description")
            if node.get("type") == "null":
                null_type_schemas.append(f"{location} must use OpenAPI 3.0 nullable instead of type null")
            if node.get("nullable") is True and "type" not in node:
                nullable_schemas_without_type.append(
                    f"{location} must declare a sibling type when using OpenAPI 3.0 nullable"
                )
            schema_type = node.get("type")
            if schema_type == "array" and not isinstance(node.get("items"), dict):
                invalid_array_schemas.append(f"{location} array schema must declare items")
            if "items" in node and schema_type != "array":
                misplaced_object_keywords.append(f"{location} must not declare items unless type is array")
            if "properties" in node and schema_type not in (None, "object"):
                misplaced_object_keywords.append(
                    f"{location} must not declare properties unless type is object"
                )
            if "additionalProperties" in node and schema_type not in (None, "object"):
                misplaced_object_keywords.append(
                    f"{location} must not declare additionalProperties unless type is object"
                )
            required = node.get("required")
            properties = node.get("properties")
            if required is not None:
                if not isinstance(required, list) or any(not isinstance(item, str) for item in required):
                    missing_required_properties.append(f"{location} required must be an array of property names")
                elif isinstance(properties, dict):
                    missing = [item for item in required if item not in properties]
                    if missing:
                        missing_required_properties.append(
                            f"{location} required properties are not defined: {', '.join(sorted(missing))}"
                        )
            additional_properties = node.get("additionalProperties")
            if isinstance(additional_properties, dict):
                description = additional_properties.get("description")
                if not isinstance(description, str) or not description.strip():
                    missing_additional_properties_descriptions.append(
                        f"{location}.additionalProperties must declare a description"
                    )
            for union_key in ["oneOf", "anyOf"]:
                branches = node.get(union_key)
                if not isinstance(branches, list):
                    continue
                for index, branch in enumerate(branches):
                    if not isinstance(branch, dict):
                        continue
                    description = branch.get("description")
                    if not isinstance(description, str) or not description.strip():
                        missing_union_branch_descriptions.append(
                            f"{location}.{union_key}[{index}] must declare a description"
                        )
            properties = node.get("properties")
            if isinstance(properties, dict):
                for property_name, property_schema in properties.items():
                    visit_schema(property_schema, f"{location}.properties.{property_name}")
            items = node.get("items")
            if isinstance(items, dict):
                visit_schema(items, f"{location}.items")
            if isinstance(additional_properties, dict):
                visit_schema(additional_properties, f"{location}.additionalProperties")
            for union_key in ["oneOf", "anyOf", "allOf"]:
                branches = node.get(union_key)
                if not isinstance(branches, list):
                    continue
                for index, branch in enumerate(branches):
                    visit_schema(branch, f"{location}.{union_key}[{index}]")
            not_schema = node.get("not")
            if isinstance(not_schema, dict):
                visit_schema(not_schema, f"{location}.not")

    schemas = spec.get("components", {}).get("schemas", {})
    if isinstance(schemas, dict):
        for schema_name, schema in schemas.items():
            visit_schema(schema, f"#/components/schemas/{schema_name}")

    return OpenApiReferenceStandardAudit(
        missing_request_body_descriptions=sorted(set(missing_request_body_descriptions)),
        missing_schema_descriptions=sorted(set(missing_schema_descriptions)),
        missing_union_branch_descriptions=sorted(set(missing_union_branch_descriptions)),
        missing_additional_properties_descriptions=sorted(set(missing_additional_properties_descriptions)),
        null_type_schemas=sorted(set(null_type_schemas)),
        nullable_schemas_without_type=sorted(set(nullable_schemas_without_type)),
        invalid_array_schemas=sorted(set(invalid_array_schemas)),
        misplaced_object_keywords=sorted(set(misplaced_object_keywords)),
        missing_required_properties=sorted(set(missing_required_properties)),
    )



def _audit_path_parameters(
    *,
    expected_path_parameters: set[str],
    operation: dict[str, Any],
    location: str,
    path_parameter_mismatches: list[str],
) -> None:
    declared_parameters = [
        parameter
        for parameter in operation.get("parameters", [])
        if isinstance(parameter, dict) and parameter.get("in") == "path"
    ]
    declared_names = {parameter.get("name") for parameter in declared_parameters if isinstance(parameter.get("name"), str)}
    if declared_names != expected_path_parameters:
        path_parameter_mismatches.append(
            f"{location} path parameters mismatch: declared {sorted(declared_names)} "
            f"expected {sorted(expected_path_parameters)}"
        )

    for parameter in declared_parameters:
        parameter_name = parameter.get("name")
        if not isinstance(parameter_name, str):
            continue
        if parameter.get("required") is not True:
            path_parameter_mismatches.append(f"{location} path parameter {parameter_name} must be required")
        if not isinstance(parameter.get("schema"), dict):
            path_parameter_mismatches.append(f"{location} path parameter {parameter_name} must declare a schema")


def _audit_query_parameters(
    *,
    operation: dict[str, Any],
    location: str,
    query_parameter_mismatches: list[str],
) -> None:
    for parameter in operation.get("parameters", []):
        if not isinstance(parameter, dict) or parameter.get("in") != "query":
            continue
        parameter_name = parameter.get("name")
        if not isinstance(parameter_name, str) or not parameter_name:
            query_parameter_mismatches.append(f"{location} query parameter must declare a name")
            continue
        description = parameter.get("description")
        if not isinstance(description, str) or not description.strip():
            query_parameter_mismatches.append(f"{location} query parameter {parameter_name} must declare a description")
        if not isinstance(parameter.get("schema"), dict):
            query_parameter_mismatches.append(f"{location} query parameter {parameter_name} must declare a schema")


def _audit_payload_schema(
    *,
    schema: Any,
    location: str,
    root_schema_names: set[str],
    non_component_payload_schemas: list[str],
    generic_payload_refs: list[str],
) -> None:
    if schema is None:
        non_component_payload_schemas.append(f"{location} is missing a schema")
        return

    raw_ref = _raw_schema_ref(schema)
    if raw_ref is not None and _component_schema_ref(schema) is None:
        non_component_payload_schemas.append(f"{location} uses non-component schema ref {raw_ref}")
        return

    schema_ref = _component_schema_ref(schema)
    if schema_ref is None:
        if _requires_component_payload_schema(schema):
            non_component_payload_schemas.append(f"{location} is missing a component schema ref")
        return

    root_schema_names.add(schema_ref)
    full_ref = _raw_schema_ref(schema)
    if full_ref in GENERIC_VENDOR_SCHEMA_REFS:
        generic_payload_refs.append(f"{location} uses {full_ref}")


def _requires_component_payload_schema(schema: Any) -> bool:
    if not isinstance(schema, dict):
        return False
    schema_type = schema.get("type")
    return schema_type in {"object", "array"} or any(key in schema for key in ["oneOf", "anyOf", "allOf"])


def _component_schema_ref(schema: Any) -> str | None:
    raw_ref = _raw_schema_ref(schema)
    if raw_ref is None or not raw_ref.startswith("#/components/schemas/"):
        return None
    return raw_ref.rsplit("/", 1)[-1]


def _raw_schema_ref(schema: Any) -> str | None:
    if not isinstance(schema, dict):
        return None
    schema_ref = schema.get("$ref")
    return schema_ref if isinstance(schema_ref, str) else None


class ClawRouterGatewayOpenApiGenerator:
    """Generate the Claw Router gateway OpenAPI document for /v1 and vendor APIs."""

    OUTPUT = Path("apps") / "sdkwork-clawrouter-pc" / "public" / "openapi.json"

    def __init__(self, root: Path, output_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.output_path = (
            Path(output_path).resolve()
            if output_path is not None
            else self.root / self.OUTPUT
        )

    def generate(self) -> dict[str, Any]:
        components = self._components()
        self._normalize_component_schema_descriptions(components)
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Claw Router Open API",
                "version": "1.0.0",
                "description": (
                    "Claw Router Open API exposes OpenAI-compatible /v1 APIs and "
                    "provider-specific APIs for OpenAI, Google Gemini, "
                    "Anthropic Claude, Volcengine Ark, Suno, Midjourney, Kling, "
                    "Vidu, and Nano Banana compatible media providers."
                ),
            },
            "servers": [
                {"url": "https://api.sdkwork.com", "description": "Production edge gateway"},
                {"url": "http://127.0.0.1:3900", "description": "Local unified edge gateway"},
            ],
            "security": [{"bearerAuth": []}],
            "tags": self._tags(),
            "paths": self._paths(),
            "components": components,
            "x-api-prefix": "/v1",
            "x-router-product": "sdkwork-clawrouter",
        }
        self._materialize_public_generic_payload_schemas(spec)
        self._normalize_open_object_extension_maps(components)
        self._normalize_empty_schema_shapes(components)
        self._normalize_openapi_30_nullable_unions(components)
        self._normalize_openapi_30_nullable_types(components)
        self._normalize_component_property_ref_descriptions(components)
        self._normalize_component_schema_descriptions(components)
        self._normalize_component_nested_schema_descriptions(components)
        self._normalize_request_body_descriptions(spec)
        self._normalize_vendor_object_component_closure(spec)
        self._prune_unreachable_schemas(spec)
        return spec

    @staticmethod
    def _prune_unreachable_schemas(spec: dict[str, Any]) -> None:
        components = spec.get("components")
        if not isinstance(components, dict):
            return
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        reachable: set[str] = set()
        pending: list[str] = []

        def collect_refs(node: Any) -> None:
            if isinstance(node, dict):
                raw_ref = node.get("$ref")
                if isinstance(raw_ref, str) and raw_ref.startswith("#/components/schemas/"):
                    schema_name = raw_ref.rsplit("/", 1)[-1]
                    if schema_name not in reachable:
                        reachable.add(schema_name)
                        pending.append(schema_name)
                for value in node.values():
                    collect_refs(value)
            elif isinstance(node, list):
                for value in node:
                    collect_refs(value)

        collect_refs(spec.get("paths", {}))
        while pending:
            schema_name = pending.pop()
            schema = schemas.get(schema_name)
            if schema is not None:
                collect_refs(schema)

        components["schemas"] = {
            schema_name: schema
            for schema_name, schema in schemas.items()
            if schema_name in reachable
        }

    def _normalize_component_schema_descriptions(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        for schema_name, schema in schemas.items():
            if not isinstance(schema, dict):
                continue
            description = schema.get("description")
            if isinstance(description, str) and description.strip():
                continue
            schema["description"] = self._default_schema_description(schema_name)

    def _normalize_component_nested_schema_descriptions(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        for schema_name, schema in schemas.items():
            self._normalize_nested_schema_description(
                schema,
                location=f"#/components/schemas/{schema_name}",
                owner_schema_name=schema_name,
                is_schema_node=True,
            )

    def _normalize_nested_schema_description(
        self,
        node: Any,
        *,
        location: str,
        owner_schema_name: str,
        is_schema_node: bool,
    ) -> None:
        if isinstance(node, dict):
            if is_schema_node and _raw_schema_ref(node) is None and not self._has_description(node):
                node["description"] = self._default_nested_schema_description(
                    location=location,
                    owner_schema_name=owner_schema_name,
                    schema=node,
                )
            for key, value in node.items():
                child_is_schema_node = (
                    (key in {"items", "additionalProperties", "not"} and isinstance(value, dict))
                    or (key in {"oneOf", "anyOf", "allOf"} and isinstance(value, list))
                    or (location.endswith(".properties") and isinstance(value, dict))
                )
                self._normalize_nested_schema_description(
                    value,
                    location=f"{location}.{key}",
                    owner_schema_name=owner_schema_name,
                    is_schema_node=child_is_schema_node,
                )
        elif isinstance(node, list):
            for index, value in enumerate(node):
                self._normalize_nested_schema_description(
                    value,
                    location=f"{location}[{index}]",
                    owner_schema_name=owner_schema_name,
                    is_schema_node=is_schema_node,
                )

    def _normalize_component_property_ref_descriptions(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        for schema_name, schema in schemas.items():
            if not isinstance(schema, dict):
                continue
            self._normalize_union_ref_branch_descriptions(schema, f"#/components/schemas/{schema_name}")
            self._normalize_additional_properties_ref_descriptions(schema, f"#/components/schemas/{schema_name}")
            properties = schema.get("properties")
            if not isinstance(properties, dict):
                continue
            for property_name, property_schema in list(properties.items()):
                if not isinstance(property_schema, dict):
                    continue
                schema_ref = _raw_schema_ref(property_schema)
                if schema_ref is None:
                    continue
                properties[property_name] = {
                    "allOf": [{"$ref": schema_ref}],
                    "description": self._default_property_ref_description(
                        owner_schema_name=schema_name,
                        property_name=property_name,
                        schema_ref=schema_ref,
                    ),
                }

    def _normalize_additional_properties_ref_descriptions(self, node: Any, location: str) -> None:
        if isinstance(node, dict):
            additional_properties = node.get("additionalProperties")
            if isinstance(additional_properties, dict):
                schema_ref = _raw_schema_ref(additional_properties)
                if schema_ref is not None:
                    description = additional_properties.get("description")
                    if not isinstance(description, str) or not description.strip():
                        description = self._default_additional_properties_ref_description(
                            location=location,
                            schema_ref=schema_ref,
                        )
                    node["additionalProperties"] = {
                        "allOf": [{"$ref": schema_ref}],
                        "description": description,
                    }
                elif not self._has_description(additional_properties):
                    additional_properties["description"] = self._default_additional_properties_schema_description(
                        location=location,
                        schema=additional_properties,
                    )
            for key, value in node.items():
                self._normalize_additional_properties_ref_descriptions(value, f"{location}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                self._normalize_additional_properties_ref_descriptions(value, f"{location}[{index}]")

    def _normalize_union_ref_branch_descriptions(self, node: Any, location: str) -> None:
        if isinstance(node, dict):
            for union_key in ["oneOf", "anyOf"]:
                branches = node.get(union_key)
                if not isinstance(branches, list):
                    continue
                for index, branch in enumerate(branches):
                    if not isinstance(branch, dict):
                        continue
                    schema_ref = _raw_schema_ref(branch)
                    if schema_ref is None:
                        if not self._has_description(branch):
                            branch["description"] = self._default_union_schema_branch_description(
                                location=f"{location}.{union_key}[{index}]",
                                schema=branch,
                            )
                        continue
                    description = branch.get("description")
                    if not isinstance(description, str) or not description.strip():
                        description = self._default_union_ref_branch_description(
                            location=f"{location}.{union_key}[{index}]",
                            schema_ref=schema_ref,
                        )
                    branches[index] = {
                        "allOf": [{"$ref": schema_ref}],
                        "description": description,
                    }
            for key, value in node.items():
                self._normalize_union_ref_branch_descriptions(value, f"{location}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                self._normalize_union_ref_branch_descriptions(value, f"{location}[{index}]")

    def _normalize_openapi_30_nullable_unions(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        schemas.setdefault(
            "ProviderJsonNull",
            {
                "type": "string",
                "nullable": True,
                "enum": [None],
                "description": "Reusable OpenAPI 3.0 nullable JSON null value module.",
            },
        )
        for schema in schemas.values():
            self._replace_null_union_branches(schema)

    def _replace_null_union_branches(self, node: Any) -> None:
        if isinstance(node, dict):
            for union_key in ["oneOf", "anyOf"]:
                branches = node.get(union_key)
                if not isinstance(branches, list):
                    continue
                for index, branch in enumerate(branches):
                    if isinstance(branch, dict) and branch.get("type") == "null":
                        branches[index] = {
                            "$ref": "#/components/schemas/ProviderJsonNull",
                        }

            for value in node.values():
                self._replace_null_union_branches(value)
        elif isinstance(node, list):
            for value in node:
                self._replace_null_union_branches(value)

    def _normalize_openapi_30_nullable_types(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return
        for schema in schemas.values():
            self._ensure_nullable_schema_type(schema)

    def _ensure_nullable_schema_type(self, node: Any) -> None:
        if isinstance(node, dict):
            if node.get("nullable") is True and "type" not in node:
                node["type"] = "object"
            for value in node.values():
                self._ensure_nullable_schema_type(value)
        elif isinstance(node, list):
            for value in node:
                self._ensure_nullable_schema_type(value)

    def _normalize_request_body_descriptions(self, spec: dict[str, Any]) -> None:
        paths = spec.get("paths")
        if not isinstance(paths, dict):
            return

        for path_item in paths.values():
            if not isinstance(path_item, dict):
                continue
            for method, operation in path_item.items():
                if method.startswith("x-") or not isinstance(operation, dict):
                    continue
                request_body = operation.get("requestBody")
                if not isinstance(request_body, dict) or not request_body.get("content"):
                    continue
                if self._has_description(request_body):
                    continue
                request_body["description"] = self._default_request_body_description(operation)

    def _has_description(self, node: dict[str, Any]) -> bool:
        description = node.get("description")
        return isinstance(description, str) and bool(description.strip())

    def _default_property_ref_description(
        self,
        *,
        owner_schema_name: str,
        property_name: str,
        schema_ref: str,
    ) -> str:
        target_schema_name = schema_ref.rsplit("/", 1)[-1]
        owner_label = self._schema_label(owner_schema_name)
        target_label = self._schema_label(target_schema_name)
        property_label = self._field_label(property_name)
        return f"{property_label.capitalize()} field on the {owner_label}, using the {target_label} module."

    def _default_union_ref_branch_description(self, *, location: str, schema_ref: str) -> str:
        target_schema_name = schema_ref.rsplit("/", 1)[-1]
        target_label = self._schema_label(target_schema_name)
        field_label = self._union_field_label(location)
        return f"{field_label.capitalize()} variant using the {target_label} module."

    def _default_union_schema_branch_description(self, *, location: str, schema: dict[str, Any]) -> str:
        field_label = self._union_field_label(location)
        variant_label = self._schema_variant_label(schema)
        return f"{variant_label.capitalize()} accepted by the {field_label} field."

    def _default_request_body_description(self, operation: dict[str, Any]) -> str:
        operation_id = operation.get("operationId")
        if isinstance(operation_id, str) and operation_id.strip():
            operation_label = " ".join(self._identifier_words(operation_id)).lower()
            return f"Typed request payload for the {operation_label} operation."
        summary = operation.get("summary")
        if isinstance(summary, str) and summary.strip():
            return f"Typed request payload for {summary.strip()}."
        return "Typed request payload for this API operation."

    def _default_nested_schema_description(
        self,
        *,
        location: str,
        owner_schema_name: str,
        schema: dict[str, Any],
    ) -> str:
        if location == f"#/components/schemas/{owner_schema_name}":
            return self._default_schema_description(owner_schema_name)
        property_match = re.search(r"\.properties\.([^.[]+)$", location)
        if property_match:
            property_label = self._field_label(property_match.group(1))
            owner_label = self._schema_label(owner_schema_name)
            return f"{property_label.capitalize()} field on the {owner_label} schema."
        if location.endswith(".items"):
            array_label = self._array_item_context_label(location)
            variant_label = self._schema_variant_label(schema)
            return f"{variant_label.capitalize()} used as {array_label} items."
        if ".oneOf[" in location or ".anyOf[" in location or ".allOf[" in location:
            variant_label = self._schema_variant_label(schema)
            return f"{variant_label.capitalize()} used by the {self._union_field_label(location)} field."
        if location.endswith(".additionalProperties"):
            return self._default_additional_properties_schema_description(location=location, schema=schema)
        variant_label = self._schema_variant_label(schema)
        owner_label = self._schema_label(owner_schema_name)
        return f"{variant_label.capitalize()} used by the {owner_label} schema."

    def _array_item_context_label(self, location: str) -> str:
        property_match = re.search(r"\.properties\.([^.[]+)\.items$", location)
        if property_match:
            return self._field_label(property_match.group(1)).lower()
        return "array"

    def _default_additional_properties_ref_description(self, *, location: str, schema_ref: str) -> str:
        target_schema_name = schema_ref.rsplit("/", 1)[-1]
        target_label = self._schema_label(target_schema_name)
        map_label = self._additional_properties_map_label(location)
        return f"Additional {map_label} values using the {target_label} module."

    def _default_additional_properties_schema_description(self, *, location: str, schema: dict[str, Any]) -> str:
        map_label = self._additional_properties_map_label(location)
        variant_label = self._schema_variant_label(schema)
        return f"Additional {map_label} values as a {variant_label}."

    def _additional_properties_map_label(self, location: str) -> str:
        property_match = re.search(r"\.properties\.([^.[]+)$", location)
        if property_match:
            return self._field_label(property_match.group(1)).lower()
        schema_match = re.match(r"#/components/schemas/([^.[]+)$", location)
        if schema_match:
            return self._schema_label(schema_match.group(1))
        return "map"

    def _union_field_label(self, location: str) -> str:
        match = re.search(r"\.properties\.([^.[]+)\.(?:oneOf|anyOf)\[\d+\]$", location)
        if match:
            return self._field_label(match.group(1))
        return "union"

    def _schema_variant_label(self, schema: dict[str, Any]) -> str:
        schema_ref = _raw_schema_ref(schema)
        if schema_ref is not None:
            target_schema_name = schema_ref.rsplit("/", 1)[-1]
            return f"{self._schema_label(target_schema_name)} module variant"

        schema_type = schema.get("type")
        if isinstance(schema_type, str):
            if schema_type == "array":
                return self._array_variant_label(schema)
            return f"{schema_type} variant"
        if "enum" in schema:
            return "enumerated value variant"
        if "properties" in schema or "additionalProperties" in schema:
            return "object variant"
        if "allOf" in schema:
            return "composed schema variant"
        return "schema variant"

    def _array_variant_label(self, schema: dict[str, Any]) -> str:
        items = schema.get("items")
        if isinstance(items, dict):
            item_ref = _raw_schema_ref(items)
            if item_ref is not None:
                item_schema_name = item_ref.rsplit("/", 1)[-1]
                return f"array variant containing {self._schema_label(item_schema_name)} module items"
            item_type = items.get("type")
            if isinstance(item_type, str):
                return f"array variant containing {item_type} items"
            if isinstance(items.get("items"), dict):
                return "array variant containing nested array items"
        return "array variant"

    def _default_schema_description(self, schema_name: str) -> str:
        label = self._schema_label(schema_name)
        if schema_name.startswith("OpenAi"):
            return f"OpenAI-compatible {label} schema exposed by Claw Router."
        if schema_name.startswith("Google"):
            return f"Google Gemini {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Anthropic"):
            return f"Anthropic Claude {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Volcengine"):
            return f"Volcengine Ark {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Suno"):
            return f"Suno-compatible {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Midjourney"):
            return f"Midjourney-compatible {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Kling"):
            return f"Kling-compatible {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("NanoBanana"):
            return f"Nano Banana compatible {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Vidu"):
            return f"Vidu {label} schema exposed by Claw Router vendor routing."
        if schema_name.startswith("Provider"):
            return f"Reusable provider {label} schema shared by Claw Router vendor modules."
        return f"{label.capitalize()} schema exposed by Claw Router."

    def _schema_label(self, schema_name: str) -> str:
        words = self._identifier_words(schema_name)
        replacements = {
            "Ai": "AI",
            "Api": "API",
            "Id": "ID",
            "Json": "JSON",
            "Url": "URL",
            "Uri": "URI",
            "Sdp": "SDP",
        }
        normalized = [replacements.get(word, word) for word in words]
        return " ".join(normalized).lower()

    def _field_label(self, field_name: str) -> str:
        words = self._identifier_words(field_name)
        replacements = {
            "api": "API",
            "id": "ID",
            "json": "JSON",
            "url": "URL",
            "uri": "URI",
            "sdp": "SDP",
        }
        normalized = [replacements.get(word.lower(), word) for word in words]
        return " ".join(normalized)

    def _identifier_words(self, identifier: str) -> list[str]:
        return re.findall(r"[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+", identifier.replace("_", " "))

    def _normalize_vendor_object_component_closure(self, spec: dict[str, Any]) -> None:
        audit = audit_vendor_schema_quality(spec)
        schemas = spec.get("components", {}).get("schemas", {})
        if not isinstance(schemas, dict):
            return
        for schema_name in sorted(audit.reachable_schema_names):
            schema = schemas.get(schema_name)
            if not isinstance(schema, dict) or schema.get("type") != "object":
                continue
            if schema.get("additionalProperties") is True or "additionalProperties" not in schema:
                schema["additionalProperties"] = False

    def _normalize_open_object_extension_maps(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        for schema in schemas.values():
            self._replace_open_object_extension_maps(schema)

    def _replace_open_object_extension_maps(self, node: Any) -> None:
        if isinstance(node, dict):
            if node.get("type") == "object" and node.get("additionalProperties") is True:
                node["additionalProperties"] = {"$ref": "#/components/schemas/ProviderJsonValue"}
            for value in node.values():
                self._replace_open_object_extension_maps(value)
        elif isinstance(node, list):
            for item in node:
                self._replace_open_object_extension_maps(item)

    def _normalize_empty_schema_shapes(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        openai_json_schema = schemas.get("OpenAiJsonSchema")
        if isinstance(openai_json_schema, dict):
            properties = openai_json_schema.get("properties")
            if isinstance(properties, dict):
                enum_schema = properties.get("enum")
                if isinstance(enum_schema, dict) and enum_schema.get("items") == {}:
                    enum_schema["items"] = {"$ref": "#/components/schemas/ProviderJsonValue"}

        google_empty_response = schemas.get("GoogleEmptyResponse")
        if isinstance(google_empty_response, dict) and google_empty_response.get("properties") == {}:
            google_empty_response["properties"] = {
                "object": {
                    "type": "string",
                    "enum": ["empty"],
                    "description": "Object marker for an empty successful Google response.",
                }
            }
            google_empty_response["required"] = ["object"]

    def _materialize_public_generic_payload_schemas(self, spec: dict[str, Any]) -> None:
        schemas = spec.get("components", {}).get("schemas", {})
        paths = spec.get("paths", {})
        if not isinstance(schemas, dict) or not isinstance(paths, dict):
            return
        schemas.update(self._public_payload_support_schemas())

        for path, path_item in paths.items():
            if not isinstance(path, str) or not isinstance(path_item, dict) or not self._is_public_v1_path(path):
                continue
            for method, operation in path_item.items():
                if method.startswith("x-") or not isinstance(operation, dict):
                    continue
                operation_id = operation.get("operationId")
                if not isinstance(operation_id, str) or not operation_id:
                    continue

                request_body = operation.get("requestBody")
                if isinstance(request_body, dict):
                    for content_type, media_type in request_body.get("content", {}).items():
                        if not isinstance(media_type, dict):
                            continue
                        schema = media_type.get("schema")
                        schema_ref = _raw_schema_ref(schema)
                        if schema_ref == "#/components/schemas/JsonObject":
                            schema_name = self._public_request_schema_override(operation_id) or self._operation_schema_name(operation_id, "Request")
                            schemas.setdefault(
                                schema_name,
                                self._public_json_request_schema(
                                    operation_id=operation_id,
                                    path=path,
                                    method=method,
                                    operation=operation,
                                ),
                            )
                            media_type["schema"] = {"$ref": f"#/components/schemas/{schema_name}"}
                        elif schema_ref == "#/components/schemas/ProviderMultipartRequest":
                            schema_name = self._public_multipart_request_schema_override(operation_id) or self._operation_schema_name(operation_id, "MultipartRequest")
                            schemas.setdefault(
                                schema_name,
                                self._public_multipart_request_schema(
                                    operation_id=operation_id,
                                    path=path,
                                    operation=operation,
                                ),
                            )
                            media_type["schema"] = {"$ref": f"#/components/schemas/{schema_name}"}

                for status, response in operation.get("responses", {}).items():
                    if not isinstance(response, dict):
                        continue
                    for content_type, media_type in response.get("content", {}).items():
                        if not isinstance(media_type, dict):
                            continue
                        schema_ref = _raw_schema_ref(media_type.get("schema"))
                        if schema_ref != "#/components/schemas/JsonObject":
                            continue
                        schema_name = self._public_response_schema_override(operation_id) or self._operation_schema_name(operation_id, "Response")
                        schemas.setdefault(
                            schema_name,
                            self._public_json_response_schema(
                                operation_id=operation_id,
                                path=path,
                                method=method,
                                status=status,
                                operation=operation,
                                schemas=schemas,
                            ),
                        )
                        media_type["schema"] = {"$ref": f"#/components/schemas/{schema_name}"}

    def _public_request_schema_override(self, operation_id: str) -> str | None:
        return {
            "createCompletion": "OpenAiCompletionCreateRequest",
            "createModeration": "OpenAiModerationCreateRequest",
            "countResponseInputTokens": "OpenAiResponseInputTokenCountRequest",
            "compactResponse": "OpenAiResponseCompactRequest",
            "modifyChatCompletion": "OpenAiChatCompletionUpdateRequest",
            "createVideo": "OpenAiVideoCreateRequest",
            "createVideoCharacter": "OpenAiVideoCharacterCreateRequest",
            "editVideo": "OpenAiVideoEditRequest",
            "extendVideo": "OpenAiVideoExtendRequest",
            "remixVideo": "OpenAiVideoRemixRequest",
            "createSpeech": "OpenAiSpeechCreateRequest",
            "createVoice": "OpenAiVoiceCreateRequest",
            "createVoiceConsent": "OpenAiVoiceConsentCreateRequest",
            "updateVoiceConsent": "OpenAiVoiceConsentUpdateRequest",
            "createContainer": "OpenAiContainerCreateRequest",
            "createVectorStore": "OpenAiVectorStoreCreateRequest",
            "modifyVectorStore": "OpenAiVectorStoreUpdateRequest",
            "searchVectorStore": "OpenAiVectorStoreSearchRequest",
            "modifyVectorStoreFile": "OpenAiVectorStoreFileUpdateRequest",
            "createThread": "OpenAiThreadCreateRequest",
            "createThreadAndRun": "OpenAiThreadAndRunCreateRequest",
            "modifyThread": "OpenAiThreadUpdateRequest",
            "modifyMessage": "OpenAiThreadMessageUpdateRequest",
            "modifyRun": "OpenAiRunUpdateRequest",
            "submitRunToolOutputs": "OpenAiRunSubmitToolOutputsRequest",
            "createBatch": "OpenAiBatchCreateRequest",
            "createVectorStoreFile": "OpenAiVectorStoreFileCreateRequest",
            "createVectorStoreFileBatch": "OpenAiVectorStoreFileBatchCreateRequest",
            "createAssistant": "OpenAiAssistantCreateRequest",
            "modifyAssistant": "OpenAiAssistantUpdateRequest",
            "createMessage": "OpenAiThreadMessageCreateRequest",
            "createRun": "OpenAiRunCreateRequest",
            "createUpload": "OpenAiUploadCreateRequest",
            "completeUpload": "OpenAiUploadCompleteRequest",
            "createRealtimeClientSecret": "OpenAiRealtimeClientSecretCreateRequest",
            "createRealtimeCall": "OpenAiRealtimeCallCreateRequest",
            "acceptRealtimeCall": "OpenAiRealtimeCallActionRequest",
            "hangupRealtimeCall": "OpenAiRealtimeCallActionRequest",
            "referRealtimeCall": "OpenAiRealtimeCallReferRequest",
            "rejectRealtimeCall": "OpenAiRealtimeCallActionRequest",
            "createRealtimeSession": "OpenAiRealtimeSessionCreateRequest",
            "createRealtimeTranscriptionSession": "OpenAiRealtimeTranscriptionSessionCreateRequest",
            "createRealtimeTranslationSession": "OpenAiRealtimeTranslationSessionCreateRequest",
        }.get(operation_id)

    def _public_multipart_request_schema_override(self, operation_id: str) -> str | None:
        return {
            "createVideoCharacter": "OpenAiVideoCharacterMultipartRequest",
            "createVoice": "OpenAiVoiceCreateMultipartRequest",
            "createContainerFile": "OpenAiContainerFileCreateMultipartRequest",
        }.get(operation_id)

    def _public_response_schema_override(self, operation_id: str) -> str | None:
        return {
            "createCompletion": "OpenAiCompletion",
            "createModeration": "OpenAiModeration",
            "countResponseInputTokens": "OpenAiResponseInputTokenCount",
            "compactResponse": "OpenAiResponse",
            "retrieveResponse": "OpenAiResponse",
            "cancelResponse": "OpenAiResponse",
            "listResponseInputItems": "OpenAiResponseInputItemList",
            "listChatCompletions": "OpenAiChatCompletionList",
            "retrieveChatCompletion": "OpenAiChatCompletion",
            "modifyChatCompletion": "OpenAiChatCompletion",
            "listChatCompletionMessages": "OpenAiChatCompletionMessageList",
            "createImage": "OpenAiImageList",
            "createImageEdit": "OpenAiImageList",
            "createImageVariation": "OpenAiImageList",
            "listVideos": "OpenAiVideoList",
            "createVideo": "OpenAiVideo",
            "createVideoCharacter": "OpenAiVideoCharacter",
            "retrieveVideoCharacter": "OpenAiVideoCharacter",
            "editVideo": "OpenAiVideo",
            "extendVideo": "OpenAiVideo",
            "retrieveVideo": "OpenAiVideo",
            "remixVideo": "OpenAiVideo",
            "listVoices": "OpenAiVoiceList",
            "createVoice": "OpenAiVoice",
            "retrieveVoice": "OpenAiVoice",
            "listVoiceConsents": "OpenAiVoiceConsentList",
            "createVoiceConsent": "OpenAiVoiceConsent",
            "retrieveVoiceConsent": "OpenAiVoiceConsent",
            "updateVoiceConsent": "OpenAiVoiceConsent",
            "createTranscription": "OpenAiAudioTranscription",
            "createTranslation": "OpenAiAudioTranslation",
            "listFiles": "OpenAiFileList",
            "uploadFile": "OpenAiFile",
            "retrieveFile": "OpenAiFile",
            "listContainers": "OpenAiContainerList",
            "createContainer": "OpenAiContainer",
            "retrieveContainer": "OpenAiContainer",
            "listContainerFiles": "OpenAiContainerFileList",
            "createContainerFile": "OpenAiContainerFile",
            "retrieveContainerFile": "OpenAiContainerFile",
            "listVectorStores": "OpenAiVectorStoreList",
            "createVectorStore": "OpenAiVectorStore",
            "retrieveVectorStore": "OpenAiVectorStore",
            "modifyVectorStore": "OpenAiVectorStore",
            "searchVectorStore": "OpenAiVectorStoreSearchResponse",
            "listVectorStoreFiles": "OpenAiVectorStoreFileList",
            "createVectorStoreFile": "OpenAiVectorStoreFile",
            "retrieveVectorStoreFile": "OpenAiVectorStoreFile",
            "modifyVectorStoreFile": "OpenAiVectorStoreFile",
            "createVectorStoreFileBatch": "OpenAiVectorStoreFileBatch",
            "retrieveVectorStoreFileBatch": "OpenAiVectorStoreFileBatch",
            "cancelVectorStoreFileBatch": "OpenAiVectorStoreFileBatch",
            "listVectorStoreFileBatchFiles": "OpenAiVectorStoreFileList",
            "listBatches": "OpenAiBatchList",
            "createBatch": "OpenAiBatch",
            "retrieveBatch": "OpenAiBatch",
            "cancelBatch": "OpenAiBatch",
            "listAssistants": "OpenAiAssistantList",
            "createAssistant": "OpenAiAssistant",
            "retrieveAssistant": "OpenAiAssistant",
            "modifyAssistant": "OpenAiAssistant",
            "createThread": "OpenAiThread",
            "createThreadAndRun": "OpenAiRun",
            "retrieveThread": "OpenAiThread",
            "modifyThread": "OpenAiThread",
            "listMessages": "OpenAiThreadMessageList",
            "createMessage": "OpenAiThreadMessage",
            "retrieveMessage": "OpenAiThreadMessage",
            "modifyMessage": "OpenAiThreadMessage",
            "listRuns": "OpenAiRunList",
            "createRun": "OpenAiRun",
            "retrieveRun": "OpenAiRun",
            "modifyRun": "OpenAiRun",
            "cancelRun": "OpenAiRun",
            "submitRunToolOutputs": "OpenAiRun",
            "listRunSteps": "OpenAiRunStepList",
            "retrieveRunStep": "OpenAiRunStep",
            "createUpload": "OpenAiUpload",
            "completeUpload": "OpenAiUpload",
            "cancelUpload": "OpenAiUpload",
            "addUploadPartExplicit": "OpenAiUploadPart",
            "createRealtimeClientSecret": "OpenAiRealtimeClientSecret",
            "acceptRealtimeCall": "OpenAiRealtimeCall",
            "hangupRealtimeCall": "OpenAiRealtimeCall",
            "referRealtimeCall": "OpenAiRealtimeCall",
            "rejectRealtimeCall": "OpenAiRealtimeCall",
            "createRealtimeSession": "OpenAiRealtimeSession",
            "createRealtimeTranscriptionSession": "OpenAiRealtimeTranscriptionSession",
            "createRealtimeTranslationSession": "OpenAiRealtimeTranslationSession",
        }.get(operation_id)

    def _is_public_v1_path(self, path: str) -> bool:
        return path == "/v1" or path.startswith("/v1/")

    def _operation_schema_name(self, operation_id: str, suffix: str) -> str:
        words = re.findall(r"[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+", operation_id)
        return "".join(word[:1].upper() + word[1:] for word in words) + suffix

    def _public_json_request_schema(
        self,
        *,
        operation_id: str,
        path: str,
        method: str,
        operation: dict[str, Any],
    ) -> dict[str, Any]:
        properties = self._public_request_properties(operation_id=operation_id, path=path, operation=operation)
        schema: dict[str, Any] = {
            "type": "object",
            "description": (
                f"Named OpenAI-compatible JSON request payload for the {operation_id} operation."
            ),
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "properties": properties,
        }
        required = self._public_request_required(operation_id=operation_id, properties=properties)
        if required:
            schema["required"] = required
        return schema

    def _public_multipart_request_schema(
        self,
        *,
        operation_id: str,
        path: str,
        operation: dict[str, Any],
    ) -> dict[str, Any]:
        properties = self._public_multipart_request_properties(operation_id=operation_id, path=path)
        schema: dict[str, Any] = {
            "type": "object",
            "description": (
                f"Named OpenAI-compatible multipart form-data request payload for the {operation_id} operation."
            ),
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "properties": properties,
        }
        required = self._public_multipart_request_required(operation_id=operation_id, properties=properties)
        if required:
            schema["required"] = required
        return schema

    def _public_json_response_schema(
        self,
        *,
        operation_id: str,
        path: str,
        method: str,
        status: str,
        operation: dict[str, Any],
        schemas: dict[str, Any],
    ) -> dict[str, Any]:
        if self._is_public_list_response(operation_id=operation_id, path=path):
            item_schema_name = self._operation_schema_name(operation_id, "Item")
            schemas.setdefault(
                item_schema_name,
                self._public_response_item_schema(operation_id=operation_id, path=path, operation=operation),
            )
            return {
                "type": "object",
                "description": (
                    f"Named OpenAI-compatible list response payload for the {operation_id} operation."
                ),
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["object", "data"],
                "properties": {
                    "object": {"type": "string", "enum": ["list"], "description": "Object type, normally list."},
                    "data": {
                        "type": "array",
                        "items": {"$ref": f"#/components/schemas/{item_schema_name}"},
                        "description": "Objects in the returned page.",
                    },
                    "first_id": {"type": "string", "nullable": True, "description": "Identifier of the first object in this page when provided."},
                    "last_id": {"type": "string", "nullable": True, "description": "Identifier of the last object in this page when provided."},
                    "has_more": {"type": "boolean", "description": "Whether additional pages are available."},
                    "next_page": {"type": "string", "nullable": True, "description": "Provider pagination cursor for the next page when provided."},
                },
            }

        return {
            "type": "object",
            "description": (
                f"Named OpenAI-compatible JSON response payload for the {operation_id} operation."
            ),
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "properties": self._public_response_properties(operation_id=operation_id, path=path, operation=operation),
        }

    def _public_response_item_schema(
        self,
        *,
        operation_id: str,
        path: str,
        operation: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "type": "object",
            "description": f"Item module returned inside the {operation_id} list response.",
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "properties": self._public_response_properties(operation_id=operation_id, path=path, operation=operation),
        }

    def _is_public_list_response(self, *, operation_id: str, path: str) -> bool:
        return operation_id.startswith("list") or operation_id.endswith("Usage")

    def _public_request_properties(
        self,
        *,
        operation_id: str,
        path: str,
        operation: dict[str, Any],
    ) -> dict[str, Any]:
        properties: dict[str, Any] = {}
        lower_id = operation_id.lower()
        tag = operation.get("tags", [""])[0] if isinstance(operation.get("tags"), list) else ""

        if operation_id == "createCompletion":
            properties.update({
                "model": self._string_schema("Model id or Claw Router catalog key routed to a provider account."),
                "prompt": {
                    "oneOf": [
                        {"type": "string"},
                        {"type": "array", "items": {"type": "string"}},
                        {"type": "array", "items": {"type": "integer"}},
                        {"type": "array", "items": {"type": "array", "items": {"type": "integer"}}},
                    ],
                    "description": "Prompt text, prompt array, token array, or token-array batch to complete.",
                },
                "suffix": self._string_schema("Suffix inserted after the generated completion when supported."),
                "max_tokens": self._integer_schema("Maximum number of tokens to generate."),
                "temperature": self._number_schema("Sampling temperature between 0 and 2."),
                "top_p": self._number_schema("Nucleus sampling probability mass."),
                "n": self._integer_schema("Number of completion choices to generate."),
                "stream": self._boolean_schema("Whether to stream completion chunks."),
                "logprobs": self._integer_schema("Number of token log probabilities to return."),
                "echo": self._boolean_schema("Whether to echo the prompt in the response."),
                "stop": self._stop_schema(),
                "presence_penalty": self._number_schema("Penalty applied to tokens based on whether they appear in the prompt."),
                "frequency_penalty": self._number_schema("Penalty applied to repeated tokens."),
                "best_of": self._integer_schema("Number of server-side completions to generate before selecting the best result."),
                "logit_bias": self._number_map_schema("Token bias map keyed by token id."),
                "user": self._string_schema("End-user identifier forwarded to compatible upstreams."),
                "seed": self._integer_schema("Best-effort deterministic sampling seed.", format_="int64"),
            })
            return properties

        if operation_id == "createModeration":
            properties.update({
                "model": self._string_schema("Moderation model id or Claw Router catalog key."),
                "input": self._text_or_array_schema("Text or multimodal input to classify."),
            })
            return properties

        if "response" in lower_id:
            properties.update({
                "model": self._string_schema("Model id or Claw Router catalog key routed to a provider account."),
                "input": self._json_value_schema("Responses API input payload or conversation state."),
                "instructions": self._string_schema("System or developer instructions for the response."),
                "include": self._string_array_schema("Additional response fields to include."),
                "metadata": self._metadata_schema("Developer-defined metadata attached to the response."),
                "previous_response_id": self._string_schema("Previous response identifier for chained responses."),
                "stream": self._boolean_schema("Whether to stream response events."),
            })
            return properties

        if tag == "Videos":
            properties.update({
                "model": self._string_schema("Video model id or Claw Router catalog key."),
                "prompt": self._string_schema("Text prompt describing the requested video output."),
                "image": self._json_value_schema("Source image reference, URL, file id, or provider-specific image payload."),
                "video": self._json_value_schema("Source video reference, URL, file id, or provider-specific video payload."),
                "character": self._json_value_schema("Reusable video character reference or configuration."),
                "seconds": self._integer_schema("Requested duration in seconds."),
                "size": self._string_schema("Requested video size or resolution."),
                "metadata": self._metadata_schema("Developer-defined metadata attached to the video request."),
            })
            return properties

        if tag == "Audio":
            properties.update({
                "model": self._string_schema("Audio model id or Claw Router catalog key."),
                "input": self._text_or_array_schema("Text, audio, or provider-compatible input payload."),
                "voice": self._string_schema("Voice identifier used for speech or voice generation."),
                "name": self._string_schema("Human-readable voice or consent name."),
                "description": self._string_schema("Human-readable description for the voice resource."),
                "response_format": self._string_schema("Requested audio or transcript response format."),
                "speed": self._number_schema("Speech speed multiplier when supported."),
                "metadata": self._metadata_schema("Developer-defined metadata for the audio resource."),
            })
            return properties

        if tag == "Vector Stores":
            properties.update({
                "name": self._string_schema("Human-readable vector store name."),
                "file_id": self._string_schema("File identifier to attach to the vector store."),
                "file_ids": self._string_array_schema("File identifiers to attach to the vector store."),
                "query": self._text_or_array_schema("Search query text or structured query payload."),
                "filters": self._json_value_schema("Structured metadata filters for the vector store search."),
                "max_num_results": self._integer_schema("Maximum number of search results to return."),
                "ranking_options": self._json_value_schema("Ranking options forwarded to compatible upstreams."),
                "attributes": self._metadata_schema("File attributes used by vector store filters."),
                "metadata": self._metadata_schema("Developer-defined vector store metadata."),
            })
            return properties

        if tag == "Assistants":
            properties.update({
                "model": self._string_schema("Assistant or run model id."),
                "assistant_id": self._string_schema("Assistant identifier used by the run."),
                "thread_id": self._string_schema("Thread identifier used by the run."),
                "role": self._string_schema("Message role, such as user or assistant."),
                "content": self._json_value_schema("Message, thread, or assistant content payload."),
                "instructions": self._string_schema("Instructions applied to the assistant or run."),
                "tools": self._json_array_schema("Tool definitions available to the assistant or run."),
                "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                "tool_outputs": self._json_array_schema("Tool outputs submitted to a run."),
                "metadata": self._metadata_schema("Developer-defined metadata for the assistant resource."),
            })
            return properties

        if tag == "Batches":
            properties.update({
                "input_file_id": self._string_schema("Uploaded file identifier containing batch input requests."),
                "endpoint": self._string_schema("OpenAI-compatible endpoint that processes the batch."),
                "completion_window": self._string_schema("Time window in which the batch should be processed."),
                "metadata": self._metadata_schema("Developer-defined batch metadata."),
            })
            return properties

        if tag == "Containers":
            properties.update({
                "name": self._string_schema("Human-readable container name."),
                "file_id": self._string_schema("File identifier to attach to the container."),
                "metadata": self._metadata_schema("Developer-defined container metadata."),
            })
            return properties

        if tag == "Uploads":
            properties.update({
                "bytes": self._integer_schema("Total number of bytes in the file being uploaded.", format_="int64"),
                "filename": self._string_schema("Name of the file being uploaded."),
                "mime_type": self._string_schema("MIME type of the file being uploaded."),
                "purpose": self._string_schema("OpenAI-compatible file purpose."),
                "part_ids": self._string_array_schema("Ordered upload part identifiers used to complete the upload."),
                "md5": self._string_schema("Optional MD5 checksum for completed upload bytes."),
            })
            return properties

        if tag == "Realtime":
            properties.update({
                "model": self._string_schema("Realtime model id or Claw Router catalog key."),
                "modalities": self._string_array_schema("Realtime modalities requested by the session."),
                "instructions": self._string_schema("Realtime session instructions."),
                "voice": self._string_schema("Voice identifier for realtime audio output."),
                "sdp": self._string_schema("WebRTC SDP offer or answer payload."),
                "session": self._json_value_schema("Realtime session configuration."),
                "metadata": self._metadata_schema("Developer-defined realtime metadata."),
            })
            return properties

        properties["metadata"] = self._metadata_schema("Developer-defined metadata for the request.")
        return properties

    def _public_request_required(self, *, operation_id: str, properties: dict[str, Any]) -> list[str]:
        required_by_operation = {
            "createCompletion": ["model", "prompt"],
            "createModeration": ["model", "input"],
            "createSpeech": ["model", "input", "voice"],
            "createUpload": ["bytes", "filename", "mime_type", "purpose"],
            "completeUpload": ["part_ids"],
            "createBatch": ["input_file_id", "endpoint", "completion_window"],
        }
        return [name for name in required_by_operation.get(operation_id, []) if name in properties]

    def _public_multipart_request_properties(self, *, operation_id: str, path: str) -> dict[str, Any]:
        properties: dict[str, Any] = {
            "file": {"type": "string", "format": "binary", "description": "Binary file payload for this multipart request."},
            "metadata": self._json_string_schema("JSON-serialized metadata or provider-specific form fields."),
        }
        if "container" in path:
            properties["purpose"] = self._string_schema("Container file purpose when required by the selected upstream.")
        if "voices" in path:
            properties["name"] = self._string_schema("Human-readable voice name.")
            properties["description"] = self._string_schema("Human-readable voice description.")
        if "videos/characters" in path:
            properties["name"] = self._string_schema("Human-readable character name.")
            properties["description"] = self._string_schema("Human-readable character description.")
            properties["image"] = {"type": "string", "format": "binary", "description": "Character reference image when required by the selected upstream."}
        return properties

    def _public_multipart_request_required(self, *, operation_id: str, properties: dict[str, Any]) -> list[str]:
        if "file" in properties:
            return ["file"]
        return []

    def _public_response_properties(
        self,
        *,
        operation_id: str,
        path: str,
        operation: dict[str, Any],
    ) -> dict[str, Any]:
        tag = operation.get("tags", [""])[0] if isinstance(operation.get("tags"), list) else ""
        properties: dict[str, Any] = {
            "id": self._string_schema("Resource identifier returned by the selected upstream."),
            "object": self._string_schema("OpenAI-compatible object type."),
            "created": self._integer_schema("Unix timestamp in seconds when the object was created.", format_="int64"),
            "created_at": self._integer_schema("Unix timestamp in seconds when the object was created.", format_="int64"),
            "status": self._string_schema("Current resource status when returned by the selected upstream."),
            "metadata": self._metadata_schema("Developer-defined or provider-returned metadata."),
        }

        if operation_id == "createCompletion":
            properties.update({
                "model": self._string_schema("Model id used by the completion."),
                "choices": {
                    "type": "array",
                    "items": {"$ref": "#/components/schemas/CreateCompletionChoice"},
                    "description": "Generated completion choices.",
                },
                "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                "system_fingerprint": self._string_schema("Backend fingerprint used to debug deterministic sampling changes."),
            })
            return properties

        if operation_id == "createModeration":
            properties.update({
                "model": self._string_schema("Moderation model used by the upstream."),
                "results": self._json_array_schema("Moderation classification results."),
            })
            return properties

        if tag in {"Responses", "Chat", "Assistants"}:
            properties.update({
                "model": self._string_schema("Model id used by the response."),
                "output": self._json_array_schema("Output items returned by the model."),
                "content": self._json_value_schema("Message or item content returned by the upstream."),
                "role": self._string_schema("Message role when the object represents a message."),
                "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
            })
        elif tag == "Images":
            properties.update({
                "data": self._json_array_schema("Generated or edited image records."),
                "created": self._integer_schema("Unix timestamp in seconds when images were created.", format_="int64"),
            })
        elif tag == "Videos":
            properties.update({
                "model": self._string_schema("Video model used by the upstream."),
                "video": self._json_value_schema("Generated video payload or provider-specific video record."),
                "url": self._string_schema("Generated video URL when returned by the upstream.", format_="uri"),
            })
        elif tag == "Audio":
            properties.update({
                "text": self._string_schema("Transcript or translated text when returned by the upstream."),
                "url": self._string_schema("Audio URL when returned by the upstream.", format_="uri"),
                "voice": self._string_schema("Voice identifier used by the upstream."),
            })
        elif tag == "Files":
            properties.update({
                "filename": self._string_schema("Uploaded or returned file name."),
                "purpose": self._string_schema("OpenAI-compatible file purpose."),
                "bytes": self._integer_schema("File size in bytes.", format_="int64"),
            })
        elif tag == "Vector Stores":
            properties.update({
                "name": self._string_schema("Human-readable vector store name."),
                "file_id": self._string_schema("Vector store file identifier."),
                "file_ids": self._string_array_schema("File identifiers attached to the vector store or batch."),
                "usage_bytes": self._integer_schema("Vector store storage usage in bytes.", format_="int64"),
            })
        elif tag == "Batches":
            properties.update({
                "endpoint": self._string_schema("Endpoint processed by the batch."),
                "input_file_id": self._string_schema("Input file identifier processed by the batch."),
                "output_file_id": self._string_schema("Output file identifier produced by the batch."),
                "error_file_id": self._string_schema("Error file identifier produced by the batch."),
            })
        elif tag == "Containers":
            properties.update({
                "name": self._string_schema("Human-readable container name."),
                "filename": self._string_schema("Container file name."),
                "bytes": self._integer_schema("Container file size in bytes.", format_="int64"),
            })
        elif tag == "Uploads":
            properties.update({
                "bytes": self._integer_schema("Intended upload byte count.", format_="int64"),
                "filename": self._string_schema("Upload filename."),
                "purpose": self._string_schema("OpenAI-compatible upload purpose."),
                "expires_at": self._integer_schema("Unix timestamp in seconds when the upload expires.", format_="int64"),
                "file": self._json_value_schema("Created file object returned after upload completion."),
                "upload_id": self._string_schema("Upload identifier associated with an upload part."),
            })
        elif tag == "Realtime":
            properties.update({
                "client_secret": self._json_value_schema("Ephemeral client secret returned for browser or realtime clients."),
                "session": self._json_value_schema("Realtime session object returned by the upstream."),
                "call_id": self._string_schema("Realtime call identifier."),
                "sdp": self._string_schema("WebRTC SDP payload when returned as JSON."),
            })
        return properties

    def _public_payload_support_schemas(self) -> dict[str, Any]:
        schemas = {
            "CreateCompletionChoice": {
                "type": "object",
                "description": "Single choice returned by the legacy OpenAI-compatible completions API.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "text": self._string_schema("Generated completion text."),
                    "index": self._integer_schema("Choice index in the returned choices array."),
                    "logprobs": {"$ref": "#/components/schemas/CreateCompletionLogprobs"},
                    "finish_reason": self._string_schema("Reason generation finished, such as stop, length, or content_filter."),
                },
            },
            "CreateCompletionLogprobs": {
                "type": "object",
                "description": "Token log probability details returned for a completion choice.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "text_offset": {"type": "array", "items": {"type": "integer"}, "description": "Character offsets for returned tokens."},
                    "token_logprobs": {"type": "array", "items": {"type": "number"}, "description": "Log probabilities for returned tokens."},
                    "tokens": {"type": "array", "items": {"type": "string"}, "description": "Generated or echoed token strings."},
                    "top_logprobs": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderJsonObject"}, "description": "Most likely token candidates and their log probabilities."},
                },
            },
            "OpenAiFileReferenceInput": {
                "oneOf": [
                    {"type": "string"},
                    {"$ref": "#/components/schemas/OpenAiFileReferenceObject"},
                    {"$ref": "#/components/schemas/ProviderJsonValue"},
                ],
                "description": "Reusable OpenAI-compatible file input reference accepted by JSON request bodies.",
            },
            "OpenAiFileReferenceObject": {
                "type": "object",
                "description": "Structured file reference used when a JSON endpoint accepts uploaded, hosted, or inline file input.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "file_id": self._string_schema("Uploaded file identifier."),
                    "url": self._string_schema("Hosted file URL or data URL."),
                    "filename": self._string_schema("Input filename when sending inline file data."),
                    "file_data": self._string_schema("Inline base64 or provider-compatible file data."),
                    "mime_type": self._string_schema("MIME type of the referenced file."),
                },
            },
            "OpenAiImageReferenceInput": {
                "oneOf": [
                    {"type": "string"},
                    {"$ref": "#/components/schemas/OpenAiImageReferenceObject"},
                    {"$ref": "#/components/schemas/OpenAiFileReferenceInput"},
                ],
                "description": "Reusable OpenAI-compatible image input reference accepted by JSON request bodies.",
            },
            "OpenAiImageReferenceObject": {
                "type": "object",
                "description": "Structured image reference used when JSON image APIs accept URL, file id, inline, or provider-specific image input.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "file_id": self._string_schema("Uploaded file identifier for the source image."),
                    "url": self._string_schema("Hosted image URL or data URL."),
                    "b64_json": self._string_schema("Base64-encoded image bytes."),
                    "mime_type": self._string_schema("Image MIME type."),
                    "detail": self._string_schema("Image detail preference when supported."),
                },
            },
            "OpenAiImageReferenceInputList": {
                "oneOf": [
                    {"$ref": "#/components/schemas/OpenAiImageReferenceInput"},
                    {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/OpenAiImageReferenceInput"},
                    },
                ],
                "description": "Single image input reference or ordered list of image input references.",
            },
            "OpenAiBinaryFilePart": {
                "type": "string",
                "format": "binary",
                "description": "Binary file part in a multipart/form-data request.",
            },
        }
        schemas.update(self._openai_completion_resource_schemas())
        schemas.update(self._openai_moderation_resource_schemas())
        schemas.update(self._openai_response_resource_schemas())
        schemas.update(self._openai_chat_resource_schemas())
        schemas.update(self._openai_image_resource_schemas())
        schemas.update(self._openai_video_resource_schemas())
        schemas.update(self._openai_audio_resource_schemas())
        schemas.update(self._openai_file_resource_schemas())
        schemas.update(self._openai_container_resource_schemas())
        schemas.update(self._openai_vector_store_resource_schemas())
        schemas.update(self._openai_batch_resource_schemas())
        schemas.update(self._openai_assistant_resource_schemas())
        schemas.update(self._openai_upload_resource_schemas())
        schemas.update(self._openai_realtime_resource_schemas())
        return schemas

    def _openai_list_schema(self, name: str, item_schema_name: str) -> dict[str, Any]:
        return {
            "type": "object",
            "description": f"OpenAI-compatible paginated list of {name}.",
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "required": ["object", "data"],
            "properties": {
                "object": {"type": "string", "enum": ["list"], "description": "Object type, normally list."},
                "data": {
                    "type": "array",
                    "items": {"$ref": f"#/components/schemas/{item_schema_name}"},
                    "description": f"{name.capitalize()} in the returned page.",
                },
                "first_id": {"type": "string", "nullable": True, "description": "Identifier of the first object in this page when provided."},
                "last_id": {"type": "string", "nullable": True, "description": "Identifier of the last object in this page when provided."},
                "has_more": {"type": "boolean", "description": "Whether additional pages are available."},
            },
        }

    def _openai_completion_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiCompletionCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a legacy text completion.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model", "prompt"],
                "properties": {
                    "model": self._string_schema("Model id or Claw Router catalog key routed to a provider account."),
                    "prompt": {
                        "oneOf": [
                            {"type": "string"},
                            {"type": "array", "items": {"type": "string"}},
                            {"type": "array", "items": {"type": "integer"}},
                            {"type": "array", "items": {"type": "array", "items": {"type": "integer"}}},
                        ],
                        "description": "Prompt text, prompt array, token array, or token-array batch to complete.",
                    },
                    "suffix": self._string_schema("Suffix inserted after the generated completion when supported."),
                    "max_tokens": self._integer_schema("Maximum number of tokens to generate."),
                    "temperature": self._number_schema("Sampling temperature between 0 and 2."),
                    "top_p": self._number_schema("Nucleus sampling probability mass."),
                    "n": self._integer_schema("Number of completion choices to generate."),
                    "stream": self._boolean_schema("Whether to stream completion chunks."),
                    "logprobs": self._integer_schema("Number of token log probabilities to return."),
                    "echo": self._boolean_schema("Whether to echo the prompt in the response."),
                    "stop": self._stop_schema(),
                    "presence_penalty": self._number_schema("Penalty applied to tokens based on whether they appear in the prompt."),
                    "frequency_penalty": self._number_schema("Penalty applied to repeated tokens."),
                    "best_of": self._integer_schema("Number of server-side completions to generate before selecting the best result."),
                    "logit_bias": self._number_map_schema("Token bias map keyed by token id."),
                    "user": self._string_schema("End-user identifier forwarded to compatible upstreams."),
                    "seed": self._integer_schema("Best-effort deterministic sampling seed.", format_="int64"),
                },
            },
            "OpenAiCompletion": {
                "type": "object",
                "description": "OpenAI-compatible legacy text completion response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created", "model", "choices"],
                "properties": {
                    "id": self._string_schema("Completion identifier."),
                    "object": self._string_schema("Object type, normally text_completion.", enum=["text_completion"]),
                    "created": self._integer_schema("Unix timestamp in seconds when the completion was created.", format_="int64"),
                    "model": self._string_schema("Model id used by the completion."),
                    "choices": {"type": "array", "items": {"$ref": "#/components/schemas/CreateCompletionChoice"}, "description": "Generated completion choices."},
                    "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                    "system_fingerprint": self._string_schema("Backend fingerprint used to debug deterministic sampling changes."),
                },
            },
        }

    def _openai_moderation_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiModerationCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to classify text or multimodal input for moderation.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model", "input"],
                "properties": {
                    "model": self._string_schema("Moderation model id or Claw Router catalog key."),
                    "input": self._text_or_array_schema("Text or multimodal input to classify."),
                },
            },
            "OpenAiModeration": {
                "type": "object",
                "description": "OpenAI-compatible moderation response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "model", "results"],
                "properties": {
                    "id": self._string_schema("Moderation response identifier."),
                    "model": self._string_schema("Moderation model used by the upstream."),
                    "results": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiModerationResult"}, "description": "Moderation classification results."},
                },
            },
            "OpenAiModerationResult": {
                "type": "object",
                "description": "Single OpenAI-compatible moderation classification result.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "flagged": self._boolean_schema("Whether the input was flagged by moderation."),
                    "categories": self._metadata_schema("Boolean category flags returned by the moderation model."),
                    "category_scores": self._number_map_schema("Moderation category scores keyed by category name."),
                },
            },
        }

    def _openai_response_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiResponseInputTokenCountRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to count tokens for a Responses API input.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model", "input"],
                "properties": {
                    "model": self._string_schema("Model id or Claw Router catalog key used for token counting."),
                    "input": {
                        "oneOf": [
                            {"type": "string"},
                            {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiResponseInputItem"}},
                        ],
                        "description": "Responses API input to count.",
                    },
                    "instructions": self._string_schema("Optional system or developer instructions included in the count."),
                    "tools": self._json_array_schema("Tools included in the count when supported."),
                },
            },
            "OpenAiResponseInputTokenCount": {
                "type": "object",
                "description": "OpenAI-compatible response input token count result.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["input_tokens"],
                "properties": {
                    "object": self._string_schema("Object type returned by the token count endpoint."),
                    "input_tokens": self._integer_schema("Number of input tokens counted."),
                    "input_tokens_details": {"$ref": "#/components/schemas/OpenAiResponseInputTokensDetails"},
                    "model": self._string_schema("Model used for token counting."),
                },
            },
            "OpenAiResponseCompactRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to compact response or conversation state.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Model id or Claw Router catalog key used for compaction."),
                    "input": self._json_value_schema("Responses API input, response state, or conversation state to compact."),
                    "previous_response_id": self._string_schema("Previous response identifier to compact from."),
                    "metadata": self._metadata_schema("Developer-defined metadata attached to the compaction request."),
                },
            },
            "OpenAiResponseInputItemList": self._openai_list_schema("response input items", "OpenAiResponseInputItem"),
        }

    def _openai_chat_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiChatCompletionList": self._openai_list_schema("chat completions", "OpenAiChatCompletion"),
            "OpenAiChatCompletionUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update stored chat completion metadata.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "metadata": self._metadata_schema("Replacement developer-defined metadata for the stored chat completion."),
                },
            },
            "OpenAiChatCompletionMessageList": self._openai_list_schema("chat completion messages", "OpenAiChatMessage"),
        }

    def _openai_image_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiImageList": {
                "type": "object",
                "description": "OpenAI-compatible image generation response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["created", "data"],
                "properties": {
                    "created": self._integer_schema("Unix timestamp in seconds when the image output was created.", format_="int64"),
                    "data": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiImage"}, "description": "Generated, edited, or varied image outputs."},
                    "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                },
            },
            "OpenAiImage": {
                "type": "object",
                "description": "OpenAI-compatible image output object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "url": self._string_schema("Image URL when the upstream returns hosted output.", format_="uri"),
                    "b64_json": self._string_schema("Base64-encoded image bytes when requested."),
                    "revised_prompt": self._string_schema("Prompt revised by the upstream image model."),
                    "mime_type": self._string_schema("Image MIME type when returned."),
                },
            },
        }

    def _openai_video_resource_schemas(self) -> dict[str, Any]:
        video_request_properties = {
            "model": self._string_schema("Video model id or Claw Router catalog key."),
            "prompt": self._string_schema("Text prompt describing the requested video output."),
            "image": self._json_value_schema("Source image reference, URL, file id, or provider-specific image payload."),
            "video": self._json_value_schema("Source video reference, URL, file id, or provider-specific video payload."),
            "seconds": self._integer_schema("Requested duration in seconds."),
            "size": self._string_schema("Requested video size or resolution."),
            "metadata": self._metadata_schema("Developer-defined metadata attached to the video request."),
        }
        return {
            "OpenAiVideoList": self._openai_list_schema("videos", "OpenAiVideo"),
            "OpenAiVideo": {
                "type": "object",
                "description": "OpenAI-compatible video object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "status"],
                "properties": {
                    "id": self._string_schema("Video identifier."),
                    "object": self._string_schema("Object type, normally video.", enum=["video"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the video was created.", format_="int64"),
                    "completed_at": self._integer_schema("Unix timestamp in seconds when the video completed.", format_="int64"),
                    "model": self._string_schema("Video model used by the upstream."),
                    "status": self._string_schema("Video lifecycle status."),
                    "prompt": self._string_schema("Prompt used for the video request."),
                    "seconds": self._integer_schema("Generated or requested duration in seconds."),
                    "size": self._string_schema("Generated or requested video size."),
                    "url": self._string_schema("Generated video URL when returned by the upstream.", format_="uri"),
                    "content_url": self._string_schema("URL for video bytes when returned separately.", format_="uri"),
                    "metadata": self._metadata_schema("Developer-defined or provider-returned video metadata."),
                },
            },
            "OpenAiVideoCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a video.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model", "prompt"],
                "properties": video_request_properties,
            },
            "OpenAiVideoEditRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to edit a video.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": video_request_properties,
            },
            "OpenAiVideoExtendRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to extend a video.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": video_request_properties,
            },
            "OpenAiVideoRemixRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to remix a video.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": video_request_properties,
            },
            "OpenAiVideoCharacter": {
                "type": "object",
                "description": "OpenAI-compatible reusable video character object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Video character identifier."),
                    "object": self._string_schema("Object type, normally video.character.", enum=["video.character"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the character was created.", format_="int64"),
                    "name": self._string_schema("Human-readable character name."),
                    "description": self._string_schema("Human-readable character description."),
                    "image_url": self._string_schema("Reference image URL when returned.", format_="uri"),
                    "metadata": self._metadata_schema("Developer-defined character metadata."),
                },
            },
            "OpenAiVideoCharacterCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a reusable video character.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable character name."),
                    "description": self._string_schema("Human-readable character description."),
                    "image": self._json_value_schema("Reference image URL, file id, or provider-specific image payload."),
                    "metadata": self._metadata_schema("Developer-defined character metadata."),
                },
            },
            "OpenAiVideoCharacterMultipartRequest": {
                "type": "object",
                "description": "OpenAI-compatible multipart request to create a reusable video character.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "file": {"type": "string", "format": "binary", "description": "Binary character reference image."},
                    "image": {"type": "string", "format": "binary", "description": "Character reference image when required by the selected upstream."},
                    "name": self._string_schema("Human-readable character name."),
                    "description": self._string_schema("Human-readable character description."),
                    "metadata": self._json_string_schema("JSON-serialized character metadata."),
                },
            },
        }

    def _openai_audio_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiSpeechCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to synthesize speech audio.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model", "input", "voice"],
                "properties": {
                    "model": self._string_schema("Audio model id or Claw Router catalog key."),
                    "input": self._text_or_array_schema("Text or provider-compatible input to synthesize."),
                    "voice": self._string_schema("Voice identifier used for speech generation."),
                    "response_format": self._string_schema("Requested audio response format."),
                    "speed": self._number_schema("Speech speed multiplier when supported."),
                    "metadata": self._metadata_schema("Developer-defined speech metadata."),
                },
            },
            "OpenAiVoiceList": self._openai_list_schema("voices", "OpenAiVoice"),
            "OpenAiVoice": {
                "type": "object",
                "description": "OpenAI-compatible voice object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Voice identifier."),
                    "object": self._string_schema("Object type, normally voice.", enum=["voice"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the voice was created.", format_="int64"),
                    "name": self._string_schema("Human-readable voice name."),
                    "description": self._string_schema("Human-readable voice description."),
                    "status": self._string_schema("Voice lifecycle status."),
                    "metadata": self._metadata_schema("Developer-defined voice metadata."),
                },
            },
            "OpenAiVoiceCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a voice.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable voice name."),
                    "description": self._string_schema("Human-readable voice description."),
                    "metadata": self._metadata_schema("Developer-defined voice metadata."),
                },
            },
            "OpenAiVoiceCreateMultipartRequest": {
                "type": "object",
                "description": "OpenAI-compatible multipart request to create a voice.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "file": {"type": "string", "format": "binary", "description": "Binary voice sample or voice package."},
                    "name": self._string_schema("Human-readable voice name."),
                    "description": self._string_schema("Human-readable voice description."),
                    "metadata": self._json_string_schema("JSON-serialized voice metadata."),
                },
            },
            "OpenAiVoiceConsentList": self._openai_list_schema("voice consents", "OpenAiVoiceConsent"),
            "OpenAiVoiceConsent": {
                "type": "object",
                "description": "OpenAI-compatible voice consent object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Voice consent identifier."),
                    "object": self._string_schema("Object type, normally voice.consent.", enum=["voice.consent"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the consent was created.", format_="int64"),
                    "name": self._string_schema("Human-readable consent name."),
                    "status": self._string_schema("Consent lifecycle status."),
                    "consent_document": self._json_value_schema("Consent document or provider-specific consent payload."),
                    "metadata": self._metadata_schema("Developer-defined consent metadata."),
                },
            },
            "OpenAiVoiceConsentUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update a voice consent.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable consent name."),
                    "metadata": self._metadata_schema("Developer-defined consent metadata."),
                },
            },
            "OpenAiVoiceConsentCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a voice consent.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable consent name."),
                    "consent_document": self._json_value_schema("Consent document or provider-specific consent payload."),
                    "metadata": self._metadata_schema("Developer-defined consent metadata."),
                },
            },
            "OpenAiAudioTranscription": {
                "type": "object",
                "description": "OpenAI-compatible audio transcription response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["text"],
                "properties": {
                    "text": self._string_schema("Transcribed text."),
                    "language": self._string_schema("Detected or requested language."),
                    "duration": self._number_schema("Audio duration in seconds when returned."),
                    "segments": self._json_array_schema("Timestamped transcription segments when returned."),
                    "words": self._json_array_schema("Timestamped word records when returned."),
                },
            },
            "OpenAiAudioTranslation": {
                "type": "object",
                "description": "OpenAI-compatible audio translation response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["text"],
                "properties": {
                    "text": self._string_schema("Translated text."),
                    "duration": self._number_schema("Audio duration in seconds when returned."),
                    "segments": self._json_array_schema("Timestamped translation segments when returned."),
                },
            },
        }

    def _openai_file_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiFileList": self._openai_list_schema("files", "OpenAiFile"),
            "OpenAiFile": {
                "type": "object",
                "description": "OpenAI-compatible file object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "bytes", "created_at", "filename", "purpose"],
                "properties": {
                    "id": self._string_schema("File identifier."),
                    "object": self._string_schema("Object type, normally file.", enum=["file"]),
                    "bytes": self._integer_schema("File size in bytes.", format_="int64"),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the file was created.", format_="int64"),
                    "filename": self._string_schema("Uploaded file name."),
                    "purpose": self._string_schema("OpenAI-compatible file purpose."),
                    "status": self._string_schema("File processing status when returned by the upstream."),
                    "status_details": self._json_value_schema("Provider status details when returned."),
                },
            },
        }

    def _openai_container_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiContainerList": self._openai_list_schema("containers", "OpenAiContainer"),
            "OpenAiContainer": {
                "type": "object",
                "description": "OpenAI-compatible container object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "status"],
                "properties": {
                    "id": self._string_schema("Container identifier."),
                    "object": self._string_schema("Object type, normally container.", enum=["container"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the container was created.", format_="int64"),
                    "name": self._string_schema("Human-readable container name."),
                    "status": self._string_schema("Container lifecycle status."),
                    "memory_limit": self._string_schema("Memory limit or container size selected for tool execution."),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the container expires.", format_="int64"),
                    "last_active_at": self._integer_schema("Unix timestamp in seconds when the container was last active.", format_="int64"),
                    "metadata": self._metadata_schema("Developer-defined container metadata."),
                },
            },
            "OpenAiContainerCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a container.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable container name."),
                    "file_ids": self._string_array_schema("File identifiers to attach to the container on creation."),
                    "memory_limit": self._string_schema("Requested memory limit or container size."),
                    "metadata": self._metadata_schema("Developer-defined container metadata."),
                },
            },
            "OpenAiContainerFileList": self._openai_list_schema("container files", "OpenAiContainerFile"),
            "OpenAiContainerFile": {
                "type": "object",
                "description": "OpenAI-compatible container file object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at"],
                "properties": {
                    "id": self._string_schema("Container file identifier."),
                    "object": self._string_schema("Object type, normally container.file.", enum=["container.file"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the file was created.", format_="int64"),
                    "container_id": self._string_schema("Container identifier that owns the file."),
                    "filename": self._string_schema("Container file name."),
                    "path": self._string_schema("Path of the file inside the container."),
                    "bytes": self._integer_schema("File size in bytes.", format_="int64"),
                    "purpose": self._string_schema("Container file purpose when returned."),
                    "metadata": self._metadata_schema("Developer-defined container file metadata."),
                },
            },
            "OpenAiContainerFileCreateMultipartRequest": {
                "type": "object",
                "description": "OpenAI-compatible multipart request to upload or create a container file.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["file"],
                "properties": {
                    "file": {"type": "string", "format": "binary", "description": "Binary file payload for the container."},
                    "purpose": self._string_schema("Container file purpose when required by the selected upstream."),
                    "metadata": self._json_string_schema("JSON-serialized container file metadata."),
                },
            },
        }



    def _openai_vector_store_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiVectorStoreList": self._openai_list_schema("vector stores", "OpenAiVectorStore"),
            "OpenAiVectorStore": {
                "type": "object",
                "description": "OpenAI-compatible vector store object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "status"],
                "properties": {
                    "id": self._string_schema("Vector store identifier."),
                    "object": self._string_schema("Object type, normally vector_store.", enum=["vector_store"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the vector store was created.", format_="int64"),
                    "name": self._string_schema("Human-readable vector store name."),
                    "bytes": self._integer_schema("Storage used by the vector store in bytes.", format_="int64"),
                    "usage_bytes": self._integer_schema("Storage used by the vector store in bytes.", format_="int64"),
                    "file_counts": {"$ref": "#/components/schemas/OpenAiVectorStoreFileCounts"},
                    "status": self._string_schema("Vector store processing status."),
                    "expires_after": self._json_value_schema("Vector store expiration policy."),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the vector store expires.", format_="int64"),
                    "last_active_at": self._integer_schema("Unix timestamp in seconds when the vector store was last active.", format_="int64"),
                    "metadata": self._metadata_schema("Developer-defined vector store metadata."),
                },
            },
            "OpenAiVectorStoreFileCounts": {
                "type": "object",
                "description": "Counts of files in each vector store processing state.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "in_progress": self._integer_schema("Number of files currently being processed."),
                    "completed": self._integer_schema("Number of processed files."),
                    "failed": self._integer_schema("Number of failed files."),
                    "cancelled": self._integer_schema("Number of cancelled files."),
                    "total": self._integer_schema("Total number of files."),
                },
            },
            "OpenAiVectorStoreFileList": self._openai_list_schema("vector store files", "OpenAiVectorStoreFile"),
            "OpenAiVectorStoreFile": {
                "type": "object",
                "description": "OpenAI-compatible vector store file object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "vector_store_id", "status"],
                "properties": {
                    "id": self._string_schema("Vector store file identifier."),
                    "object": self._string_schema("Object type, normally vector_store.file.", enum=["vector_store.file"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the vector store file was created.", format_="int64"),
                    "usage_bytes": self._integer_schema("Storage used by the vector store file in bytes.", format_="int64"),
                    "vector_store_id": self._string_schema("Vector store identifier that owns this file."),
                    "status": self._string_schema("Vector store file processing status."),
                    "last_error": self._json_value_schema("Last processing error returned by the upstream."),
                    "chunking_strategy": self._json_value_schema("Chunking strategy applied to this file."),
                    "attributes": self._metadata_schema("File attributes used for vector store filtering."),
                },
            },
            "OpenAiVectorStoreFileCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to attach a file to a vector store.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["file_id"],
                "properties": {
                    "file_id": self._string_schema("File identifier to attach to the vector store."),
                    "chunking_strategy": self._json_value_schema("Chunking strategy used to process the file."),
                    "attributes": self._metadata_schema("File attributes used for vector store filtering."),
                },
            },
            "OpenAiVectorStoreCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a vector store.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable vector store name."),
                    "file_ids": self._string_array_schema("File identifiers to attach to the vector store."),
                    "expires_after": self._json_value_schema("Vector store expiration policy."),
                    "chunking_strategy": self._json_value_schema("Chunking strategy used to process attached files."),
                    "metadata": self._metadata_schema("Developer-defined vector store metadata."),
                },
            },
            "OpenAiVectorStoreUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update a vector store.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "name": self._string_schema("Human-readable vector store name."),
                    "expires_after": self._json_value_schema("Vector store expiration policy."),
                    "metadata": self._metadata_schema("Developer-defined vector store metadata."),
                },
            },
            "OpenAiVectorStoreSearchRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to search a vector store.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["query"],
                "properties": {
                    "query": self._text_or_array_schema("Search query text or structured query payload."),
                    "filters": self._json_value_schema("Structured metadata filters for the vector store search."),
                    "max_num_results": self._integer_schema("Maximum number of search results to return."),
                    "ranking_options": self._json_value_schema("Ranking options forwarded to compatible upstreams."),
                    "rewrite_query": self._boolean_schema("Whether the upstream may rewrite the query."),
                },
            },
            "OpenAiVectorStoreFileUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update vector store file attributes.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "attributes": self._metadata_schema("File attributes used for vector store filtering."),
                },
            },
            "OpenAiVectorStoreFileBatch": {
                "type": "object",
                "description": "OpenAI-compatible vector store file batch object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "vector_store_id", "status"],
                "properties": {
                    "id": self._string_schema("Vector store file batch identifier."),
                    "object": self._string_schema("Object type, normally vector_store.file_batch.", enum=["vector_store.file_batch"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the batch was created.", format_="int64"),
                    "vector_store_id": self._string_schema("Vector store identifier that owns this batch."),
                    "status": self._string_schema("Vector store file batch processing status."),
                    "file_counts": {"$ref": "#/components/schemas/OpenAiVectorStoreFileCounts"},
                },
            },
            "OpenAiVectorStoreFileBatchCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to attach multiple files to a vector store.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["file_ids"],
                "properties": {
                    "file_ids": self._string_array_schema("File identifiers to attach to the vector store."),
                    "chunking_strategy": self._json_value_schema("Chunking strategy used to process the files."),
                    "attributes": self._metadata_schema("File attributes used for vector store filtering."),
                },
            },
            "OpenAiVectorStoreSearchResponse": {
                "type": "object",
                "description": "OpenAI-compatible vector store search response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "object": self._string_schema("Object type returned by the search endpoint."),
                    "search_query": self._string_array_schema("Queries used for the vector store search."),
                    "data": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiVectorStoreSearchResult"}, "description": "Vector store search results."},
                },
            },
            "OpenAiVectorStoreSearchResult": {
                "type": "object",
                "description": "Single vector store search result.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "file_id": self._string_schema("Matched file identifier."),
                    "filename": self._string_schema("Matched filename."),
                    "score": self._number_schema("Search relevance score."),
                    "content": self._json_array_schema("Matched text content chunks."),
                    "attributes": self._metadata_schema("File attributes returned with the result."),
                },
            },
        }

    def _openai_batch_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiBatchList": self._openai_list_schema("batches", "OpenAiBatch"),
            "OpenAiBatch": {
                "type": "object",
                "description": "OpenAI-compatible batch object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "endpoint", "input_file_id", "completion_window", "status"],
                "properties": {
                    "id": self._string_schema("Batch identifier."),
                    "object": self._string_schema("Object type, normally batch.", enum=["batch"]),
                    "endpoint": self._string_schema("Endpoint processed by the batch."),
                    "errors": self._json_value_schema("Batch error list or envelope when returned."),
                    "input_file_id": self._string_schema("Input file identifier containing batch requests."),
                    "completion_window": self._string_schema("Time window in which the batch should be processed."),
                    "status": self._string_schema("Batch processing status."),
                    "output_file_id": self._string_schema("Output file identifier produced by the batch."),
                    "error_file_id": self._string_schema("Error file identifier produced by the batch."),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the batch was created.", format_="int64"),
                    "in_progress_at": self._integer_schema("Unix timestamp in seconds when the batch started.", format_="int64"),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the batch expires.", format_="int64"),
                    "finalizing_at": self._integer_schema("Unix timestamp in seconds when the batch started finalizing.", format_="int64"),
                    "completed_at": self._integer_schema("Unix timestamp in seconds when the batch completed.", format_="int64"),
                    "failed_at": self._integer_schema("Unix timestamp in seconds when the batch failed.", format_="int64"),
                    "expired_at": self._integer_schema("Unix timestamp in seconds when the batch expired.", format_="int64"),
                    "cancelling_at": self._integer_schema("Unix timestamp in seconds when cancellation started.", format_="int64"),
                    "cancelled_at": self._integer_schema("Unix timestamp in seconds when the batch was cancelled.", format_="int64"),
                    "request_counts": {"$ref": "#/components/schemas/OpenAiBatchRequestCounts"},
                    "metadata": self._metadata_schema("Developer-defined batch metadata."),
                },
            },
            "OpenAiBatchRequestCounts": {
                "type": "object",
                "description": "Batch request processing counters.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "total": self._integer_schema("Total number of requests in the batch."),
                    "completed": self._integer_schema("Number of completed requests."),
                    "failed": self._integer_schema("Number of failed requests."),
                },
            },
            "OpenAiBatchCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a batch.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["input_file_id", "endpoint", "completion_window"],
                "properties": {
                    "input_file_id": self._string_schema("Uploaded file identifier containing batch requests."),
                    "endpoint": self._string_schema("OpenAI-compatible endpoint to process."),
                    "completion_window": self._string_schema("Time window in which the batch should be processed."),
                    "metadata": self._metadata_schema("Developer-defined batch metadata."),
                },
            },
        }

    def _openai_assistant_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiAssistantList": self._openai_list_schema("assistants", "OpenAiAssistant"),
            "OpenAiAssistant": {
                "type": "object",
                "description": "OpenAI-compatible assistant object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "model"],
                "properties": {
                    "id": self._string_schema("Assistant identifier."),
                    "object": self._string_schema("Object type, normally assistant.", enum=["assistant"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the assistant was created.", format_="int64"),
                    "name": self._string_schema("Assistant name."),
                    "description": self._string_schema("Assistant description."),
                    "model": self._string_schema("Model id used by the assistant."),
                    "instructions": self._string_schema("Instructions applied by the assistant."),
                    "tools": self._json_array_schema("Tool definitions available to the assistant."),
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined assistant metadata."),
                    "temperature": self._number_schema("Sampling temperature."),
                    "top_p": self._number_schema("Nucleus sampling probability mass."),
                    "response_format": self._json_value_schema("Assistant response format configuration."),
                },
            },
            "OpenAiAssistantCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create an assistant.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["model"],
                "properties": {
                    "model": self._string_schema("Model id used by the assistant."),
                    "name": self._string_schema("Assistant name."),
                    "description": self._string_schema("Assistant description."),
                    "instructions": self._string_schema("Instructions applied by the assistant."),
                    "tools": self._json_array_schema("Tool definitions available to the assistant."),
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined assistant metadata."),
                    "temperature": self._number_schema("Sampling temperature."),
                    "top_p": self._number_schema("Nucleus sampling probability mass."),
                    "response_format": self._json_value_schema("Assistant response format configuration."),
                },
            },
            "OpenAiAssistantUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update an assistant.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Replacement model id used by the assistant."),
                    "name": self._string_schema("Assistant name."),
                    "description": self._string_schema("Assistant description."),
                    "instructions": self._string_schema("Instructions applied by the assistant."),
                    "tools": self._json_array_schema("Tool definitions available to the assistant."),
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined assistant metadata."),
                    "temperature": self._number_schema("Sampling temperature."),
                    "top_p": self._number_schema("Nucleus sampling probability mass."),
                    "response_format": self._json_value_schema("Assistant response format configuration."),
                },
            },
            "OpenAiThread": {
                "type": "object",
                "description": "OpenAI-compatible thread object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at"],
                "properties": {
                    "id": self._string_schema("Thread identifier."),
                    "object": self._string_schema("Object type, normally thread.", enum=["thread"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the thread was created.", format_="int64"),
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined thread metadata."),
                },
            },
            "OpenAiThreadCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a thread.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "messages": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiThreadMessageCreateRequest"}, "description": "Initial messages to add to the thread."},
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined thread metadata."),
                },
            },
            "OpenAiThreadUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update a thread.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "tool_resources": self._json_value_schema("Resources available to assistant tools."),
                    "metadata": self._metadata_schema("Developer-defined thread metadata."),
                },
            },
            "OpenAiThreadMessageList": self._openai_list_schema("thread messages", "OpenAiThreadMessage"),
            "OpenAiThreadMessage": {
                "type": "object",
                "description": "OpenAI-compatible thread message object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "thread_id", "role", "content"],
                "properties": {
                    "id": self._string_schema("Message identifier."),
                    "object": self._string_schema("Object type, normally thread.message.", enum=["thread.message"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the message was created.", format_="int64"),
                    "thread_id": self._string_schema("Thread identifier that owns the message."),
                    "status": self._string_schema("Message processing status."),
                    "incomplete_details": self._json_value_schema("Details explaining why a message is incomplete."),
                    "completed_at": self._integer_schema("Unix timestamp in seconds when the message completed.", format_="int64"),
                    "incomplete_at": self._integer_schema("Unix timestamp in seconds when the message became incomplete.", format_="int64"),
                    "role": self._string_schema("Message role."),
                    "content": self._json_array_schema("Message content parts."),
                    "assistant_id": self._string_schema("Assistant identifier associated with the message."),
                    "run_id": self._string_schema("Run identifier associated with the message."),
                    "attachments": self._json_array_schema("Message file or tool attachments."),
                    "metadata": self._metadata_schema("Developer-defined message metadata."),
                },
            },
            "OpenAiThreadMessageCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a thread message.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["role", "content"],
                "properties": {
                    "role": self._string_schema("Message role."),
                    "content": self._json_value_schema("Message content as text or structured content parts."),
                    "attachments": self._json_array_schema("Message file or tool attachments."),
                    "metadata": self._metadata_schema("Developer-defined message metadata."),
                },
            },
            "OpenAiThreadMessageUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update a thread message.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "metadata": self._metadata_schema("Developer-defined message metadata."),
                },
            },
            "OpenAiRunList": self._openai_list_schema("runs", "OpenAiRun"),
            "OpenAiRun": {
                "type": "object",
                "description": "OpenAI-compatible thread run object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "assistant_id", "thread_id", "status"],
                "properties": {
                    "id": self._string_schema("Run identifier."),
                    "object": self._string_schema("Object type, normally thread.run.", enum=["thread.run"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the run was created.", format_="int64"),
                    "assistant_id": self._string_schema("Assistant identifier used by the run."),
                    "thread_id": self._string_schema("Thread identifier used by the run."),
                    "status": self._string_schema("Run status."),
                    "required_action": self._json_value_schema("Action required to continue the run."),
                    "last_error": self._json_value_schema("Last run error returned by the upstream."),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the run expires.", format_="int64"),
                    "started_at": self._integer_schema("Unix timestamp in seconds when the run started.", format_="int64"),
                    "cancelled_at": self._integer_schema("Unix timestamp in seconds when the run was cancelled.", format_="int64"),
                    "failed_at": self._integer_schema("Unix timestamp in seconds when the run failed.", format_="int64"),
                    "completed_at": self._integer_schema("Unix timestamp in seconds when the run completed.", format_="int64"),
                    "model": self._string_schema("Model id used by the run."),
                    "instructions": self._string_schema("Instructions applied to the run."),
                    "tools": self._json_array_schema("Tool definitions available to the run."),
                    "metadata": self._metadata_schema("Developer-defined run metadata."),
                    "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                },
            },
            "OpenAiRunCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a thread run.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["assistant_id"],
                "properties": {
                    "assistant_id": self._string_schema("Assistant identifier used by the run."),
                    "model": self._string_schema("Model override used by the run."),
                    "instructions": self._string_schema("Instructions applied to the run."),
                    "additional_instructions": self._string_schema("Additional instructions appended for this run."),
                    "tools": self._json_array_schema("Tool definitions available to the run."),
                    "metadata": self._metadata_schema("Developer-defined run metadata."),
                    "stream": self._boolean_schema("Whether to stream run events."),
                },
            },
            "OpenAiThreadAndRunCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a thread and start a run.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["assistant_id"],
                "properties": {
                    "assistant_id": self._string_schema("Assistant identifier used by the run."),
                    "thread": {"$ref": "#/components/schemas/OpenAiThreadCreateRequest"},
                    "model": self._string_schema("Model override used by the run."),
                    "instructions": self._string_schema("Instructions applied to the run."),
                    "tools": self._json_array_schema("Tool definitions available to the run."),
                    "metadata": self._metadata_schema("Developer-defined run metadata."),
                    "stream": self._boolean_schema("Whether to stream run events."),
                },
            },
            "OpenAiRunUpdateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to update a thread run.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "metadata": self._metadata_schema("Developer-defined run metadata."),
                },
            },
            "OpenAiRunSubmitToolOutputsRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to submit tool outputs for a run.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["tool_outputs"],
                "properties": {
                    "tool_outputs": self._json_array_schema("Tool outputs submitted to continue the run."),
                    "stream": self._boolean_schema("Whether to stream run events after submitting tool outputs."),
                },
            },
            "OpenAiRunStepList": self._openai_list_schema("run steps", "OpenAiRunStep"),
            "OpenAiRunStep": {
                "type": "object",
                "description": "OpenAI-compatible run step object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "assistant_id", "thread_id", "run_id", "type", "status"],
                "properties": {
                    "id": self._string_schema("Run step identifier."),
                    "object": self._string_schema("Object type, normally thread.run.step.", enum=["thread.run.step"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the run step was created.", format_="int64"),
                    "assistant_id": self._string_schema("Assistant identifier associated with the run step."),
                    "thread_id": self._string_schema("Thread identifier associated with the run step."),
                    "run_id": self._string_schema("Run identifier associated with the run step."),
                    "type": self._string_schema("Run step type."),
                    "status": self._string_schema("Run step status."),
                    "step_details": self._json_value_schema("Run step detail payload."),
                    "last_error": self._json_value_schema("Last run step error returned by the upstream."),
                    "expired_at": self._integer_schema("Unix timestamp in seconds when the run step expired.", format_="int64"),
                    "cancelled_at": self._integer_schema("Unix timestamp in seconds when the run step was cancelled.", format_="int64"),
                    "failed_at": self._integer_schema("Unix timestamp in seconds when the run step failed.", format_="int64"),
                    "completed_at": self._integer_schema("Unix timestamp in seconds when the run step completed.", format_="int64"),
                    "metadata": self._metadata_schema("Developer-defined run step metadata."),
                    "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                },
            },
        }


    def _openai_upload_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiUpload": {
                "type": "object",
                "description": "OpenAI-compatible upload object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "bytes", "created_at", "filename", "purpose", "status"],
                "properties": {
                    "id": self._string_schema("Upload identifier."),
                    "object": self._string_schema("Object type, normally upload.", enum=["upload"]),
                    "bytes": self._integer_schema("Total number of bytes expected in the upload.", format_="int64"),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the upload was created.", format_="int64"),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the upload expires.", format_="int64"),
                    "filename": self._string_schema("Upload filename."),
                    "purpose": self._string_schema("OpenAI-compatible upload purpose."),
                    "status": self._string_schema("Upload status."),
                    "file": {"$ref": "#/components/schemas/OpenAiFile"},
                },
            },
            "OpenAiUploadCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create an upload.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["bytes", "filename", "mime_type", "purpose"],
                "properties": {
                    "bytes": self._integer_schema("Total number of bytes in the upload.", format_="int64"),
                    "filename": self._string_schema("Upload filename."),
                    "mime_type": self._string_schema("Upload MIME type."),
                    "purpose": self._string_schema("OpenAI-compatible upload purpose."),
                },
            },
            "OpenAiUploadPart": {
                "type": "object",
                "description": "OpenAI-compatible upload part object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "created_at", "upload_id"],
                "properties": {
                    "id": self._string_schema("Upload part identifier."),
                    "object": self._string_schema("Object type, normally upload.part.", enum=["upload.part"]),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the part was uploaded.", format_="int64"),
                    "upload_id": self._string_schema("Upload identifier associated with the part."),
                },
            },
            "OpenAiUploadCompleteRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to complete an upload.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["part_ids"],
                "properties": {
                    "part_ids": self._string_array_schema("Ordered upload part identifiers used to complete the upload."),
                    "md5": self._string_schema("Optional MD5 checksum for completed upload bytes."),
                },
            },
        }


    def _openai_realtime_resource_schemas(self) -> dict[str, Any]:
        return {
            "OpenAiRealtimeClientSecret": {
                "type": "object",
                "description": "OpenAI-compatible realtime client secret bootstrap response.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["client_secret"],
                "properties": {
                    "client_secret": {"$ref": "#/components/schemas/OpenAiRealtimeClientSecretValue"},
                    "session": self._json_value_schema("Realtime session object returned by the upstream."),
                },
            },
            "OpenAiRealtimeClientSecretValue": {
                "type": "object",
                "description": "Ephemeral realtime client secret value.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["value"],
                "properties": {
                    "value": self._string_schema("Ephemeral secret value."),
                    "expires_at": self._integer_schema("Unix timestamp in seconds when the secret expires.", format_="int64"),
                },
            },
            "OpenAiRealtimeClientSecretCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a realtime client secret.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Realtime model id or Claw Router catalog key."),
                    "modalities": self._string_array_schema("Realtime modalities requested by the session."),
                    "instructions": self._string_schema("Realtime session instructions."),
                    "voice": self._string_schema("Voice identifier for realtime audio output."),
                    "metadata": self._metadata_schema("Developer-defined realtime metadata."),
                },
            },
            "OpenAiRealtimeCall": {
                "type": "object",
                "description": "OpenAI-compatible realtime call object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object", "status"],
                "properties": {
                    "id": self._string_schema("Realtime call identifier."),
                    "object": self._string_schema("Object type, normally realtime.call.", enum=["realtime.call"]),
                    "status": self._string_schema("Realtime call lifecycle status."),
                    "created_at": self._integer_schema("Unix timestamp in seconds when the call was created.", format_="int64"),
                    "sdp": self._string_schema("WebRTC SDP payload when returned as JSON."),
                    "session": self._json_value_schema("Realtime session object associated with the call."),
                    "metadata": self._metadata_schema("Developer-defined realtime call metadata."),
                },
            },
            "OpenAiRealtimeCallCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create or start a realtime call.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "sdp": self._string_schema("WebRTC SDP offer."),
                    "session": self._json_value_schema("Realtime session configuration."),
                    "metadata": self._metadata_schema("Developer-defined realtime call metadata."),
                },
            },
            "OpenAiRealtimeCallActionRequest": {
                "type": "object",
                "description": "OpenAI-compatible request for a realtime call action.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "metadata": self._metadata_schema("Developer-defined realtime call action metadata."),
                },
            },
            "OpenAiRealtimeCallReferRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to refer or transfer a realtime call.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "target": self._string_schema("Refer target, SIP URI, phone number, or provider-specific target."),
                    "metadata": self._metadata_schema("Developer-defined realtime call action metadata."),
                },
            },
            "OpenAiRealtimeSession": {
                "type": "object",
                "description": "OpenAI-compatible realtime session object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Realtime session identifier."),
                    "object": self._string_schema("Object type, normally realtime.session.", enum=["realtime.session"]),
                    "model": self._string_schema("Realtime model id used by the session."),
                    "modalities": self._string_array_schema("Realtime modalities enabled for the session."),
                    "instructions": self._string_schema("Realtime session instructions."),
                    "voice": self._string_schema("Voice identifier for realtime audio output."),
                    "client_secret": {"$ref": "#/components/schemas/OpenAiRealtimeClientSecretValue"},
                },
            },
            "OpenAiRealtimeSessionCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a realtime session.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Realtime model id or Claw Router catalog key."),
                    "modalities": self._string_array_schema("Realtime modalities requested by the session."),
                    "instructions": self._string_schema("Realtime session instructions."),
                    "voice": self._string_schema("Voice identifier for realtime audio output."),
                    "metadata": self._metadata_schema("Developer-defined realtime metadata."),
                },
            },
            "OpenAiRealtimeTranscriptionSession": {
                "type": "object",
                "description": "OpenAI-compatible realtime transcription session object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Realtime transcription session identifier."),
                    "object": self._string_schema("Object type, normally realtime.transcription_session.", enum=["realtime.transcription_session"]),
                    "input_audio_format": self._string_schema("Input audio format for transcription."),
                    "input_audio_transcription": self._json_value_schema("Realtime transcription configuration."),
                    "client_secret": {"$ref": "#/components/schemas/OpenAiRealtimeClientSecretValue"},
                },
            },
            "OpenAiRealtimeTranscriptionSessionCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a realtime transcription session.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Realtime transcription model id or Claw Router catalog key."),
                    "input_audio_format": self._string_schema("Input audio format for transcription."),
                    "input_audio_transcription": self._json_value_schema("Realtime transcription configuration."),
                    "turn_detection": self._json_value_schema("Realtime turn detection configuration."),
                    "metadata": self._metadata_schema("Developer-defined realtime metadata."),
                },
            },
            "OpenAiRealtimeTranslationSession": {
                "type": "object",
                "description": "OpenAI-compatible realtime translation session object.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "required": ["id", "object"],
                "properties": {
                    "id": self._string_schema("Realtime translation session identifier."),
                    "object": self._string_schema("Object type, normally realtime.translation_session.", enum=["realtime.translation_session"]),
                    "source_language": self._string_schema("Source language for realtime translation."),
                    "target_language": self._string_schema("Target language for realtime translation."),
                    "client_secret": {"$ref": "#/components/schemas/OpenAiRealtimeClientSecretValue"},
                },
            },
            "OpenAiRealtimeTranslationSessionCreateRequest": {
                "type": "object",
                "description": "OpenAI-compatible request to create a realtime translation session.",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "model": self._string_schema("Realtime translation model id or Claw Router catalog key."),
                    "source_language": self._string_schema("Source language for realtime translation."),
                    "target_language": self._string_schema("Target language for realtime translation."),
                    "metadata": self._metadata_schema("Developer-defined realtime metadata."),
                },
            },
        }


    def _string_schema(self, description: str, *, enum: list[str] | None = None, format_: str | None = None) -> dict[str, Any]:
        schema: dict[str, Any] = {"type": "string", "description": description}
        if enum is not None:
            schema["enum"] = enum
        if format_ is not None:
            schema["format"] = format_
        return schema

    def _integer_schema(self, description: str, *, format_: str | None = None) -> dict[str, Any]:
        schema: dict[str, Any] = {"type": "integer", "description": description}
        if format_ is not None:
            schema["format"] = format_
        return schema

    def _number_schema(self, description: str) -> dict[str, Any]:
        return {"type": "number", "description": description}

    def _boolean_schema(self, description: str) -> dict[str, Any]:
        return {"type": "boolean", "description": description}

    def _string_array_schema(self, description: str) -> dict[str, Any]:
        return {"type": "array", "items": {"type": "string"}, "description": description}

    def _json_array_schema(self, description: str) -> dict[str, Any]:
        return {
            "type": "array",
            "items": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "description": description,
        }

    def _json_value_schema(self, description: str) -> dict[str, Any]:
        return {"allOf": [{"$ref": "#/components/schemas/ProviderJsonValue"}], "description": description}

    def _json_string_schema(self, description: str) -> dict[str, Any]:
        return {"type": "string", "description": description}

    def _metadata_schema(self, description: str) -> dict[str, Any]:
        return {
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
            "description": description,
        }

    def _text_or_array_schema(self, description: str) -> dict[str, Any]:
        return {
            "oneOf": [
                {"type": "string"},
                {"type": "array", "items": {"type": "string"}},
                {"type": "array", "items": {"$ref": "#/components/schemas/ProviderJsonValue"}},
            ],
            "description": description,
        }

    def _number_map_schema(self, description: str) -> dict[str, Any]:
        return {"type": "object", "additionalProperties": {"type": "number"}, "description": description}

    def _stop_schema(self) -> dict[str, Any]:
        return {
            "oneOf": [
                {"type": "string"},
                {"type": "array", "items": {"type": "string"}},
            ],
            "description": "Stop sequence or list of stop sequences.",
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self) -> Path:
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.output_path.write_text(self.render_json(), encoding="utf-8", newline="\n")
        return self.output_path

    def check(self) -> ClawRouterGatewayOpenApiCheckResult:
        if not self.output_path.exists():
            return ClawRouterGatewayOpenApiCheckResult(
                ok=False,
                messages=[f"Claw Router gateway OpenAPI spec is missing: {self.output_path}"],
            )
        actual = self.output_path.read_text(encoding="utf-8")
        try:
            actual_spec = json.loads(actual)
        except json.JSONDecodeError as exc:
            return ClawRouterGatewayOpenApiCheckResult(
                ok=False,
                messages=[f"Claw Router gateway OpenAPI spec is invalid JSON: {exc}"],
            )
        audit_messages = self._vendor_schema_quality_messages(actual_spec)
        if audit_messages:
            return ClawRouterGatewayOpenApiCheckResult(ok=False, messages=audit_messages)
        audit_messages = self._public_payload_schema_quality_messages(actual_spec)
        if audit_messages:
            return ClawRouterGatewayOpenApiCheckResult(ok=False, messages=audit_messages)
        audit_messages = self._openapi_reference_standard_messages(actual_spec)
        if audit_messages:
            return ClawRouterGatewayOpenApiCheckResult(ok=False, messages=audit_messages)

        expected = self.render_json()
        if actual != expected:
            return ClawRouterGatewayOpenApiCheckResult(
                ok=False,
                messages=[f"Claw Router gateway OpenAPI spec is stale: {self.output_path}"],
            )
        return ClawRouterGatewayOpenApiCheckResult(ok=True, messages=[])

    def _vendor_schema_quality_messages(self, spec: dict[str, Any]) -> list[str]:
        audit = audit_vendor_schema_quality(spec)
        messages: list[str] = []
        checks = [
            ("unregistered vendor paths", audit.unregistered_vendor_paths),
            ("unresolved refs", audit.unresolved_refs),
            ("non-component payload schemas", audit.non_component_payload_schemas),
            ("optional request bodies", audit.optional_request_bodies),
            ("path parameter mismatches", audit.path_parameter_mismatches),
            ("query parameter mismatches", audit.query_parameter_mismatches),
            ("open object components", audit.open_object_components),
            ("unregistered operation tags", audit.unregistered_operation_tags),
            ("generic payload refs", audit.generic_payload_refs),
            ("missing component descriptions", audit.missing_component_descriptions),
            ("inline free-form objects", audit.inline_free_form_objects),
            ("anonymous object union branches", audit.anonymous_object_union_branches),
        ]
        for label, items in checks:
            if not items:
                continue
            preview = "; ".join(items[:10])
            suffix = f"; ... {len(items) - 10} more" if len(items) > 10 else ""
            messages.append(f"Vendor schema quality audit failed: {label}: {preview}{suffix}")
        return messages

    def _public_payload_schema_quality_messages(self, spec: dict[str, Any]) -> list[str]:
        audit = audit_public_payload_schema_quality(spec)
        messages: list[str] = []
        checks = [
            ("generic payload refs", audit.generic_payload_refs),
            ("unresolved refs", audit.unresolved_refs),
            ("$ref sibling schemas", audit.ref_siblings),
            ("empty schema shapes", audit.empty_schema_shapes),
            ("untyped component properties", audit.untyped_component_properties),
            ("open object components", audit.open_object_components),
        ]
        for label, items in checks:
            if not items:
                continue
            preview = "; ".join(items[:10])
            suffix = f"; ... {len(items) - 10} more" if len(items) > 10 else ""
            messages.append(f"Public schema quality audit failed: {label}: {preview}{suffix}")
        return messages

    def _openapi_reference_standard_messages(self, spec: dict[str, Any]) -> list[str]:
        audit = audit_openapi_reference_standards(spec)
        messages: list[str] = []
        checks = [
            ("request body descriptions", audit.missing_request_body_descriptions),
            ("schema descriptions", audit.missing_schema_descriptions),
            ("union branch descriptions", audit.missing_union_branch_descriptions),
            ("additionalProperties descriptions", audit.missing_additional_properties_descriptions),
            ("OpenAPI 3.0 null type schemas", audit.null_type_schemas),
            ("OpenAPI 3.0 nullable schemas without type", audit.nullable_schemas_without_type),
            ("array schemas", audit.invalid_array_schemas),
            ("misplaced schema keywords", audit.misplaced_object_keywords),
            ("required properties", audit.missing_required_properties),
        ]
        for label, items in checks:
            if not items:
                continue
            preview = "; ".join(items[:10])
            suffix = f"; ... {len(items) - 10} more" if len(items) > 10 else ""
            messages.append(f"OpenAPI reference standard audit failed: {label}: {preview}{suffix}")
        return messages

    def _tags(self) -> list[dict[str, str]]:
        return [
            {"name": "Responses", "description": "OpenAI-compatible stateful multimodal response API."},
            {"name": "Conversations", "description": "OpenAI-compatible conversation state and item APIs."},
            {"name": "Chat", "description": "OpenAI-compatible chat completions API."},
            {"name": "Completions", "description": "OpenAI-compatible legacy text completions API."},
            {"name": "Embeddings", "description": "OpenAI-compatible text and multimodal embedding API."},
            {"name": "Models", "description": "List and inspect Claw Router model catalog entries exposed through /v1."},
            {"name": "Images", "description": "OpenAI-compatible image generation, edit, and variation APIs."},
            {"name": "Videos", "description": "OpenAI-compatible video generation, remix, listing, and content APIs."},
            {"name": "Audio", "description": "OpenAI-compatible speech, transcription, and translation APIs."},
            {"name": "Files", "description": "OpenAI-compatible files and file content APIs."},
            {"name": "Vector Stores", "description": "OpenAI-compatible vector store and vector store file APIs."},
            {"name": "Assistants", "description": "OpenAI-compatible assistants, threads, messages, and runs APIs."},
            {"name": "Batches", "description": "OpenAI-compatible batch processing API."},
            {"name": "Containers", "description": "OpenAI-compatible container and container file APIs."},
            {"name": "Moderations", "description": "OpenAI-compatible moderation API."},
            {"name": "Uploads", "description": "OpenAI-compatible multipart upload APIs."},
            {"name": "Realtime", "description": "OpenAI-compatible realtime session bootstrap APIs."},
            {"name": "Images/vidu", "description": "Vidu image generation APIs exposed through Claw Router vendor routing."},
            {"name": "Videos/vidu", "description": "Vidu video generation APIs exposed through Claw Router vendor routing."},
            {"name": "Images/midjourney", "description": "Midjourney-compatible image APIs exposed through Claw Router vendor routing."},
            {"name": "Images/nano-banana", "description": "Nano Banana compatible image APIs exposed through Claw Router vendor routing."},
            {"name": "Videos/kling", "description": "Kling-compatible video APIs exposed through Claw Router vendor routing."},
            {"name": "Audio/suno", "description": "Suno-compatible music APIs exposed through Claw Router vendor routing."},
            {"name": "Chat/google", "description": "Google Gemini content generation APIs exposed through Claw Router vendor routing."},
            {"name": "Responses/google", "description": "Google Gemini cached content APIs exposed through Claw Router vendor routing."},
            {"name": "Embeddings/google", "description": "Google Gemini embedding APIs exposed through Claw Router vendor routing."},
            {"name": "Files/google", "description": "Google Gemini file APIs exposed through Claw Router vendor routing."},
            {"name": "Files/anthropic", "description": "Anthropic file APIs exposed through Claw Router vendor routing."},
            {"name": "Chat/anthropic", "description": "Anthropic message APIs exposed through Claw Router vendor routing."},
            {"name": "Batches/anthropic", "description": "Anthropic message batch APIs exposed through Claw Router vendor routing."},
            {"name": "Videos/volcengine", "description": "Volcengine Ark content generation APIs exposed through Claw Router vendor routing."},
        ]

    def _paths(self) -> dict[str, Any]:
        paths: dict[str, Any] = {}
        paths["/v1/models"] = {"get": self._operation("Models", "listModels", "List models", "Lists Claw Router models available to the caller.", None, "OpenAiModelList")}
        paths["/v1/models/{model}"] = {
            "get": self._operation("Models", "retrieveModel", "Retrieve model", "Retrieves one model from the Claw Router catalog.", None, "OpenAiModel", parameters=[self._path_param("model", "Model identifier or catalog key.")]),
        }
        paths["/v1/completions"] = {"post": self._operation("Completions", "createCompletion", "Create completion", "Creates a legacy text completion through an OpenAI-compatible request.", "JsonObject", "JsonObject")}
        paths["/v1/moderations"] = {"post": self._operation("Moderations", "createModeration", "Create moderation", "Classifies text or multimodal input through an OpenAI-compatible moderation request.", "JsonObject", "JsonObject")}
        paths["/v1/responses"] = {"post": self._operation("Responses", "createResponse", "Create response", "Creates a model response through an OpenAI-compatible Responses API request.", "OpenAiResponsesRequest", "OpenAiResponse")}
        paths["/v1/responses/input_tokens"] = {"post": self._operation("Responses", "countResponseInputTokens", "Count response input tokens", "Counts input tokens for a Responses API request when supported by the selected upstream.", "JsonObject", "JsonObject")}
        paths["/v1/responses/compact"] = {"post": self._operation("Responses", "compactResponse", "Compact response", "Compacts response input or conversation state when supported by the selected upstream.", "JsonObject", "JsonObject")}
        paths["/v1/responses/{response_id}"] = {
            "get": self._operation("Responses", "retrieveResponse", "Retrieve response", "Retrieves a stored response when the selected upstream supports response retrieval.", None, "JsonObject", parameters=[self._path_param("response_id", "Response identifier."), self._include_query_param()]),
            "delete": self._operation("Responses", "deleteResponse", "Delete response", "Deletes a stored response when the selected upstream supports response deletion.", None, "DeleteResult", parameters=[self._path_param("response_id", "Response identifier.")]),
        }
        paths["/v1/responses/{response_id}/cancel"] = {"post": self._operation("Responses", "cancelResponse", "Cancel response", "Cancels an in-progress response when the selected upstream supports cancellation.", None, "JsonObject", parameters=[self._path_param("response_id", "Response identifier.")])}
        paths["/v1/responses/{response_id}/input_items"] = {"get": self._operation("Responses", "listResponseInputItems", "List response input items", "Lists input items for a stored response when supported by the selected upstream.", None, "JsonObject", parameters=[self._path_param("response_id", "Response identifier."), *self._list_pagination_params(), self._include_query_param()])}
        paths["/v1/chat/completions"] = {
            "get": self._operation("Chat", "listChatCompletions", "List stored chat completions", "Lists stored chat completions when the selected upstream supports stored chat completion retrieval.", None, "JsonObject", parameters=[*self._list_pagination_params(), self._query_param("model", "Filter stored chat completions by model id."), self._query_param("metadata", "Filter stored chat completions by metadata key-value query supported by the selected upstream.")]),
            "post": self._operation("Chat", "createChatCompletion", "Create chat completion", "Creates a chat completion through an OpenAI-compatible chat request.", "OpenAiChatCompletionRequest", "OpenAiChatCompletion"),
        }
        paths["/v1/chat/completions/{completion_id}"] = {
            "get": self._operation("Chat", "retrieveChatCompletion", "Retrieve stored chat completion", "Retrieves a stored chat completion when the selected upstream supports retrieval.", None, "JsonObject", parameters=[self._path_param("completion_id", "Stored chat completion identifier.")]),
            "post": self._operation("Chat", "modifyChatCompletion", "Modify stored chat completion", "Modifies stored chat completion metadata when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("completion_id", "Stored chat completion identifier.")]),
            "delete": self._operation("Chat", "deleteChatCompletion", "Delete stored chat completion", "Deletes a stored chat completion when supported by the selected upstream.", None, "DeleteResult", parameters=[self._path_param("completion_id", "Stored chat completion identifier.")]),
        }
        paths["/v1/chat/completions/{completion_id}/messages"] = {"get": self._operation("Chat", "listChatCompletionMessages", "List stored chat completion messages", "Lists messages for a stored chat completion when supported by the selected upstream.", None, "JsonObject", parameters=[self._path_param("completion_id", "Stored chat completion identifier."), *self._list_pagination_params()])}
        paths["/v1/embeddings"] = {"post": self._operation("Embeddings", "createEmbedding", "Create embeddings", "Creates embeddings through an OpenAI-compatible embeddings request.", "OpenAiEmbeddingsRequest", "OpenAiEmbeddingList")}
        paths["/v1/images/generations"] = {"post": self._operation("Images", "createImage", "Create image", "Creates images through an OpenAI-compatible image generation request.", "OpenAiImageGenerationRequest", "JsonObject")}
        paths["/v1/images/edits"] = {"post": self._operation("Images", "createImageEdit", "Create image edit", "Edits images through an OpenAI-compatible image edit request. Multipart payloads are forwarded when provider relays are configured.", "OpenAiImageEditRequest", "JsonObject", multipart_schema="OpenAiImageEditMultipartRequest")}
        paths["/v1/images/variations"] = {"post": self._operation("Images", "createImageVariation", "Create image variation", "Creates image variations through an OpenAI-compatible image variation request.", "OpenAiImageVariationRequest", "JsonObject", multipart_schema="OpenAiImageVariationMultipartRequest")}
        paths["/v1/videos"] = {
            "get": self._operation("Videos", "listVideos", "List videos", "Lists generated videos when supported by the selected upstream.", None, "JsonObject", parameters=self._list_pagination_params()),
            "post": self._operation("Videos", "createVideo", "Create video", "Creates a video generation task through an OpenAI-compatible video request.", "JsonObject", "JsonObject"),
        }
        paths["/v1/videos/characters"] = {"post": self._operation("Videos", "createVideoCharacter", "Create video character", "Creates a reusable video character when supported by the selected upstream.", "JsonObject", "JsonObject", multipart_schema="ProviderMultipartRequest")}
        paths["/v1/videos/characters/{character_id}"] = {"get": self._operation("Videos", "retrieveVideoCharacter", "Retrieve video character", "Retrieves video character metadata.", None, "JsonObject", parameters=[self._path_param("character_id", "Video character identifier.")])}
        paths["/v1/videos/edits"] = {"post": self._operation("Videos", "editVideo", "Edit video", "Creates a video edit request when supported by the selected upstream.", "JsonObject", "JsonObject")}
        paths["/v1/videos/extensions"] = {"post": self._operation("Videos", "extendVideo", "Extend video", "Creates a video extension request when supported by the selected upstream.", "JsonObject", "JsonObject")}
        paths["/v1/videos/{video_id}"] = {
            "get": self._operation("Videos", "retrieveVideo", "Retrieve video", "Retrieves video metadata.", None, "JsonObject", parameters=[self._path_param("video_id", "Video identifier.")]),
            "delete": self._operation("Videos", "deleteVideo", "Delete video", "Deletes a video.", None, "DeleteResult", parameters=[self._path_param("video_id", "Video identifier.")]),
        }
        paths["/v1/videos/{video_id}/content"] = {"get": self._operation("Videos", "retrieveVideoContent", "Retrieve video content", "Retrieves generated video bytes.", None, "BinaryResponse", parameters=[self._path_param("video_id", "Video identifier.")])}
        paths["/v1/videos/{video_id}/remix"] = {"post": self._operation("Videos", "remixVideo", "Remix video", "Creates a video remix request when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("video_id", "Video identifier.")])}
        paths["/v1/audio/speech"] = {"post": self._operation("Audio", "createSpeech", "Create speech", "Creates speech audio through an OpenAI-compatible text-to-speech request.", "JsonObject", "BinaryResponse")}
        paths["/v1/audio/voices"] = {
            "get": self._operation("Audio", "listVoices", "List voices", "Lists available text-to-speech voices when supported by the selected upstream.", None, "JsonObject", parameters=self._list_pagination_params()),
            "post": self._operation("Audio", "createVoice", "Create voice", "Creates a voice when supported by the selected upstream.", "JsonObject", "JsonObject", multipart_schema="ProviderMultipartRequest"),
        }
        paths["/v1/audio/voices/{voice_id}"] = {"get": self._operation("Audio", "retrieveVoice", "Retrieve voice", "Retrieves voice metadata when supported by the selected upstream.", None, "JsonObject", parameters=[self._path_param("voice_id", "Voice identifier.")])}
        paths["/v1/audio/voice_consents"] = {
            "get": self._operation("Audio", "listVoiceConsents", "List voice consents", "Lists voice consent records when supported by the selected upstream.", None, "JsonObject", parameters=self._list_pagination_params()),
            "post": self._operation("Audio", "createVoiceConsent", "Create voice consent", "Creates a voice consent record when supported by the selected upstream.", "JsonObject", "JsonObject", multipart_schema="OpenAiVoiceConsentMultipartRequest"),
        }
        paths["/v1/audio/voice_consents/{consent_id}"] = {
            "get": self._operation("Audio", "retrieveVoiceConsent", "Retrieve voice consent", "Retrieves a voice consent record when supported by the selected upstream.", None, "JsonObject", parameters=[self._path_param("consent_id", "Voice consent identifier.")]),
            "post": self._operation("Audio", "updateVoiceConsent", "Update voice consent", "Updates a voice consent record when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("consent_id", "Voice consent identifier.")]),
            "delete": self._operation("Audio", "deleteVoiceConsent", "Delete voice consent", "Deletes a voice consent record when supported by the selected upstream.", None, "DeleteResult", parameters=[self._path_param("consent_id", "Voice consent identifier.")]),
        }
        paths["/v1/audio/transcriptions"] = {"post": self._operation("Audio", "createTranscription", "Create transcription", "Transcribes audio through an OpenAI-compatible transcription request.", "OpenAiAudioTranscriptionRequest", "JsonObject", multipart_schema="OpenAiAudioTranscriptionMultipartRequest")}
        paths["/v1/audio/translations"] = {"post": self._operation("Audio", "createTranslation", "Create translation", "Translates audio through an OpenAI-compatible translation request.", "OpenAiAudioTranslationRequest", "JsonObject", multipart_schema="OpenAiAudioTranslationMultipartRequest")}
        paths["/v1/files"] = {
            "get": self._operation("Files", "listFiles", "List files", "Lists files available to the caller.", None, "JsonObject", parameters=self._list_pagination_params()),
            "post": self._operation("Files", "uploadFile", "Upload file", "Uploads a file for OpenAI-compatible file-backed APIs.", None, "JsonObject", multipart_schema="OpenAiFileUploadRequest"),
        }
        paths["/v1/files/{file_id}"] = {
            "get": self._operation("Files", "retrieveFile", "Retrieve file", "Retrieves file metadata.", None, "JsonObject", parameters=[self._path_param("file_id", "File identifier.")]),
            "delete": self._operation("Files", "deleteFile", "Delete file", "Deletes a file.", None, "DeleteResult", parameters=[self._path_param("file_id", "File identifier.")]),
        }
        paths["/v1/files/{file_id}/content"] = {"get": self._operation("Files", "retrieveFileContent", "Retrieve file content", "Retrieves file bytes.", None, "BinaryResponse", parameters=[self._path_param("file_id", "File identifier.")])}
        paths["/v1/vector_stores"] = {"get": self._operation("Vector Stores", "listVectorStores", "List vector stores", "Lists vector stores.", None, "JsonObject", parameters=self._list_pagination_params()), "post": self._operation("Vector Stores", "createVectorStore", "Create vector store", "Creates a vector store.", "JsonObject", "JsonObject")}
        paths["/v1/vector_stores/{vector_store_id}"] = {"get": self._operation("Vector Stores", "retrieveVectorStore", "Retrieve vector store", "Retrieves a vector store.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier.")]), "post": self._operation("Vector Stores", "modifyVectorStore", "Modify vector store", "Modifies a vector store.", "JsonObject", "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier.")]), "delete": self._operation("Vector Stores", "deleteVectorStore", "Delete vector store", "Deletes a vector store.", None, "DeleteResult", parameters=[self._path_param("vector_store_id", "Vector store identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/search"] = {"post": self._operation("Vector Stores", "searchVectorStore", "Search vector store", "Searches a vector store through an OpenAI-compatible vector search request.", "JsonObject", "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/files"] = {"get": self._operation("Vector Stores", "listVectorStoreFiles", "List vector store files", "Lists files in a vector store.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), *self._list_pagination_params()]), "post": self._operation("Vector Stores", "createVectorStoreFile", "Create vector store file", "Adds a file to a vector store.", "JsonObject", "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/files/{file_id}"] = {"get": self._operation("Vector Stores", "retrieveVectorStoreFile", "Retrieve vector store file", "Retrieves a vector store file.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("file_id", "File identifier.")]), "post": self._operation("Vector Stores", "modifyVectorStoreFile", "Modify vector store file", "Modifies vector store file attributes when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("file_id", "File identifier.")]), "delete": self._operation("Vector Stores", "deleteVectorStoreFile", "Delete vector store file", "Deletes a vector store file.", None, "DeleteResult", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("file_id", "File identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/file_batches"] = {"post": self._operation("Vector Stores", "createVectorStoreFileBatch", "Create vector store file batch", "Creates a vector store file batch.", "JsonObject", "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}"] = {"get": self._operation("Vector Stores", "retrieveVectorStoreFileBatch", "Retrieve vector store file batch", "Retrieves a vector store file batch.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("batch_id", "Batch identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel"] = {"post": self._operation("Vector Stores", "cancelVectorStoreFileBatch", "Cancel vector store file batch", "Cancels a vector store file batch.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("batch_id", "Batch identifier.")])}
        paths["/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/files"] = {"get": self._operation("Vector Stores", "listVectorStoreFileBatchFiles", "List vector store file batch files", "Lists files in a vector store file batch.", None, "JsonObject", parameters=[self._path_param("vector_store_id", "Vector store identifier."), self._path_param("batch_id", "Batch identifier."), *self._list_pagination_params()])}
        paths["/v1/assistants"] = {"get": self._operation("Assistants", "listAssistants", "List assistants", "Lists assistants.", None, "JsonObject", parameters=self._list_pagination_params()), "post": self._operation("Assistants", "createAssistant", "Create assistant", "Creates an assistant.", "JsonObject", "JsonObject")}
        paths["/v1/assistants/{assistant_id}"] = {"get": self._operation("Assistants", "retrieveAssistant", "Retrieve assistant", "Retrieves an assistant.", None, "JsonObject", parameters=[self._path_param("assistant_id", "Assistant identifier.")]), "post": self._operation("Assistants", "modifyAssistant", "Modify assistant", "Modifies an assistant.", "JsonObject", "JsonObject", parameters=[self._path_param("assistant_id", "Assistant identifier.")]), "delete": self._operation("Assistants", "deleteAssistant", "Delete assistant", "Deletes an assistant.", None, "DeleteResult", parameters=[self._path_param("assistant_id", "Assistant identifier.")])}
        paths["/v1/threads"] = {"post": self._operation("Assistants", "createThread", "Create thread", "Creates a thread.", "JsonObject", "JsonObject")}
        paths["/v1/threads/runs"] = {"post": self._operation("Assistants", "createThreadAndRun", "Create thread and run", "Creates a thread and starts a run in one OpenAI-compatible request.", "JsonObject", "JsonObject")}
        paths["/v1/threads/{thread_id}"] = {"get": self._operation("Assistants", "retrieveThread", "Retrieve thread", "Retrieves a thread.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier.")]), "post": self._operation("Assistants", "modifyThread", "Modify thread", "Modifies a thread.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier.")]), "delete": self._operation("Assistants", "deleteThread", "Delete thread", "Deletes a thread.", None, "DeleteResult", parameters=[self._path_param("thread_id", "Thread identifier.")])}
        paths["/v1/threads/{thread_id}/messages"] = {"get": self._operation("Assistants", "listMessages", "List thread messages", "Lists messages in a thread.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), *self._list_pagination_params()]), "post": self._operation("Assistants", "createMessage", "Create thread message", "Creates a message in a thread.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier.")])}
        paths["/v1/threads/{thread_id}/messages/{message_id}"] = {"get": self._operation("Assistants", "retrieveMessage", "Retrieve thread message", "Retrieves a thread message.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("message_id", "Message identifier.")]), "post": self._operation("Assistants", "modifyMessage", "Modify thread message", "Modifies a thread message.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("message_id", "Message identifier.")]), "delete": self._operation("Assistants", "deleteMessage", "Delete thread message", "Deletes a thread message when supported by the selected upstream.", None, "DeleteResult", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("message_id", "Message identifier.")])}
        paths["/v1/threads/{thread_id}/runs"] = {"get": self._operation("Assistants", "listRuns", "List thread runs", "Lists runs in a thread.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), *self._list_pagination_params()]), "post": self._operation("Assistants", "createRun", "Create thread run", "Creates a run for a thread.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier.")])}
        paths["/v1/threads/{thread_id}/runs/{run_id}"] = {"get": self._operation("Assistants", "retrieveRun", "Retrieve thread run", "Retrieves a thread run.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier.")]), "post": self._operation("Assistants", "modifyRun", "Modify thread run", "Modifies a thread run.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier.")])}
        paths["/v1/threads/{thread_id}/runs/{run_id}/cancel"] = {"post": self._operation("Assistants", "cancelRun", "Cancel thread run", "Cancels a thread run.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier.")])}
        paths["/v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs"] = {"post": self._operation("Assistants", "submitRunToolOutputs", "Submit run tool outputs", "Submits tool outputs for a thread run.", "JsonObject", "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier.")])}
        paths["/v1/threads/{thread_id}/runs/{run_id}/steps"] = {"get": self._operation("Assistants", "listRunSteps", "List run steps", "Lists run steps.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier."), *self._list_pagination_params()])}
        paths["/v1/threads/{thread_id}/runs/{run_id}/steps/{step_id}"] = {"get": self._operation("Assistants", "retrieveRunStep", "Retrieve run step", "Retrieves a run step.", None, "JsonObject", parameters=[self._path_param("thread_id", "Thread identifier."), self._path_param("run_id", "Run identifier."), self._path_param("step_id", "Run step identifier.")])}
        paths["/v1/batches"] = {"get": self._operation("Batches", "listBatches", "List batches", "Lists batch jobs.", None, "JsonObject", parameters=self._list_pagination_params()), "post": self._operation("Batches", "createBatch", "Create batch", "Creates a batch job.", "JsonObject", "JsonObject")}
        paths["/v1/batches/{batch_id}"] = {"get": self._operation("Batches", "retrieveBatch", "Retrieve batch", "Retrieves a batch job.", None, "JsonObject", parameters=[self._path_param("batch_id", "Batch identifier.")])}
        paths["/v1/batches/{batch_id}/cancel"] = {"post": self._operation("Batches", "cancelBatch", "Cancel batch", "Cancels a batch job.", None, "JsonObject", parameters=[self._path_param("batch_id", "Batch identifier.")])}
        paths.update(self._conversation_paths())
        paths.update(self._container_paths())
        paths["/v1/uploads"] = {"post": self._operation("Uploads", "createUpload", "Create upload", "Creates an upload for multipart file transfer.", "JsonObject", "JsonObject")}
        paths["/v1/uploads/{upload_id}/parts"] = {"post": self._operation("Uploads", "addUploadPartExplicit", "Add upload part", "Adds a binary part to an upload.", None, "JsonObject", parameters=[self._path_param("upload_id", "Upload identifier.")], multipart_schema="OpenAiUploadPartMultipartRequest")}
        paths["/v1/uploads/{upload_id}/complete"] = {"post": self._operation("Uploads", "completeUpload", "Complete upload", "Completes an upload.", "JsonObject", "JsonObject", parameters=[self._path_param("upload_id", "Upload identifier.")])}
        paths["/v1/uploads/{upload_id}/cancel"] = {"post": self._operation("Uploads", "cancelUpload", "Cancel upload", "Cancels an upload.", None, "JsonObject", parameters=[self._path_param("upload_id", "Upload identifier.")])}
        paths["/v1/realtime/client_secrets"] = {"post": self._operation("Realtime", "createRealtimeClientSecret", "Create realtime client secret", "Creates an ephemeral realtime client secret.", "JsonObject", "JsonObject")}
        paths["/v1/realtime/calls"] = {"post": self._operation("Realtime", "createRealtimeCall", "Create realtime call", "Creates or starts a realtime WebRTC call using an SDP offer and returns an SDP answer when supported by the selected upstream.", "JsonObject", "SdpResponse", multipart_schema="OpenAiRealtimeCallMultipartRequest", success_status="201", success_content_type="application/sdp")}
        paths["/v1/realtime/calls/{call_id}/accept"] = {"post": self._operation("Realtime", "acceptRealtimeCall", "Accept realtime call", "Accepts an inbound realtime call when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("call_id", "Realtime call identifier.")])}
        paths["/v1/realtime/calls/{call_id}/hangup"] = {"post": self._operation("Realtime", "hangupRealtimeCall", "Hang up realtime call", "Hangs up a realtime call when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("call_id", "Realtime call identifier.")])}
        paths["/v1/realtime/calls/{call_id}/refer"] = {"post": self._operation("Realtime", "referRealtimeCall", "Refer realtime call", "Refers or transfers a realtime call when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("call_id", "Realtime call identifier.")])}
        paths["/v1/realtime/calls/{call_id}/reject"] = {"post": self._operation("Realtime", "rejectRealtimeCall", "Reject realtime call", "Rejects an inbound realtime call when supported by the selected upstream.", "JsonObject", "JsonObject", parameters=[self._path_param("call_id", "Realtime call identifier.")])}
        paths["/v1/realtime/sessions"] = {"post": self._operation("Realtime", "createRealtimeSession", "Create realtime session", "Creates an ephemeral realtime session.", "JsonObject", "JsonObject")}
        paths["/v1/realtime/transcription_sessions"] = {"post": self._operation("Realtime", "createRealtimeTranscriptionSession", "Create realtime transcription session", "Creates an ephemeral realtime transcription session.", "JsonObject", "JsonObject")}
        paths["/v1/realtime/translations"] = {"post": self._operation("Realtime", "createRealtimeTranslationSession", "Create realtime translation session", "Creates an ephemeral realtime translation session.", "JsonObject", "JsonObject")}
        paths.update(self._provider_paths())
        return paths

    def _conversation_paths(self) -> dict[str, Any]:
        return {
            "/v1/conversations": {
                "get": self._operation("Conversations", "listConversations", "List conversations", "Lists conversations when supported by the selected upstream.", None, "OpenAiConversationList", parameters=self._list_pagination_params()),
                "post": self._operation("Conversations", "createConversation", "Create conversation", "Creates a conversation.", "OpenAiConversationCreateRequest", "OpenAiConversation"),
            },
            "/v1/conversations/{conversation_id}": {
                "get": self._operation("Conversations", "retrieveConversation", "Retrieve conversation", "Retrieves a conversation.", None, "OpenAiConversation", parameters=[self._path_param("conversation_id", "Conversation identifier.")]),
                "post": self._operation("Conversations", "modifyConversation", "Modify conversation", "Modifies a conversation.", "OpenAiConversationUpdateRequest", "OpenAiConversation", parameters=[self._path_param("conversation_id", "Conversation identifier.")]),
                "delete": self._operation("Conversations", "deleteConversation", "Delete conversation", "Deletes a conversation.", None, "DeleteResult", parameters=[self._path_param("conversation_id", "Conversation identifier.")]),
            },
            "/v1/conversations/{conversation_id}/items": {
                "get": self._operation("Conversations", "listConversationItems", "List conversation items", "Lists items in a conversation.", None, "OpenAiConversationItemList", parameters=[self._path_param("conversation_id", "Conversation identifier."), *self._list_pagination_params()]),
                "post": self._operation("Conversations", "createConversationItem", "Create conversation item", "Creates an item in a conversation.", "OpenAiConversationItemCreateRequest", "OpenAiConversationItem", parameters=[self._path_param("conversation_id", "Conversation identifier.")]),
            },
            "/v1/conversations/{conversation_id}/items/{item_id}": {
                "get": self._operation("Conversations", "retrieveConversationItem", "Retrieve conversation item", "Retrieves a conversation item.", None, "OpenAiConversationItem", parameters=[self._path_param("conversation_id", "Conversation identifier."), self._path_param("item_id", "Conversation item identifier.")]),
                "delete": self._operation("Conversations", "deleteConversationItem", "Delete conversation item", "Deletes a conversation item.", None, "DeleteResult", parameters=[self._path_param("conversation_id", "Conversation identifier."), self._path_param("item_id", "Conversation item identifier.")]),
            },
        }

    def _container_paths(self) -> dict[str, Any]:
        return {
            "/v1/containers": {
                "get": self._operation("Containers", "listContainers", "List containers", "Lists containers.", None, "JsonObject", parameters=self._list_pagination_params()),
                "post": self._operation("Containers", "createContainer", "Create container", "Creates a container for tool-backed execution.", "JsonObject", "JsonObject"),
            },
            "/v1/containers/{container_id}": {
                "get": self._operation("Containers", "retrieveContainer", "Retrieve container", "Retrieves a container.", None, "JsonObject", parameters=[self._path_param("container_id", "Container identifier.")]),
                "delete": self._operation("Containers", "deleteContainer", "Delete container", "Deletes a container.", None, "DeleteResult", parameters=[self._path_param("container_id", "Container identifier.")]),
            },
            "/v1/containers/{container_id}/files": {
                "get": self._operation("Containers", "listContainerFiles", "List container files", "Lists files in a container.", None, "JsonObject", parameters=[self._path_param("container_id", "Container identifier."), *self._list_pagination_params()]),
                "post": self._operation("Containers", "createContainerFile", "Create container file", "Creates or uploads a container file.", None, "JsonObject", parameters=[self._path_param("container_id", "Container identifier.")], multipart_schema="ProviderMultipartRequest"),
            },
            "/v1/containers/{container_id}/files/{file_id}": {
                "get": self._operation("Containers", "retrieveContainerFile", "Retrieve container file", "Retrieves container file metadata.", None, "JsonObject", parameters=[self._path_param("container_id", "Container identifier."), self._path_param("file_id", "Container file identifier.")]),
                "delete": self._operation("Containers", "deleteContainerFile", "Delete container file", "Deletes a container file.", None, "DeleteResult", parameters=[self._path_param("container_id", "Container identifier."), self._path_param("file_id", "Container file identifier.")]),
            },
            "/v1/containers/{container_id}/files/{file_id}/content": {"get": self._operation("Containers", "retrieveContainerFileContent", "Retrieve container file content", "Retrieves container file bytes.", None, "BinaryResponse", parameters=[self._path_param("container_id", "Container identifier."), self._path_param("file_id", "Container file identifier.")])},
        }

    def _provider_paths(self) -> dict[str, Any]:
        return {
            "/google/v1beta/models/{model}:generateContent": {"post": self._operation("Chat/google", "googleGenerateContent", "Google Gemini generate content", "Creates Google Gemini generateContent output using the configured Google provider account.", "GoogleGenerateContentRequest", "GoogleGenerateContentResponse", parameters=[self._path_param("model", "Gemini model identifier.")], provider="google")},
            "/google/v1beta/models/{model}:streamGenerateContent": {"post": self._operation("Chat/google", "googleStreamGenerateContent", "Google Gemini stream generate content", "Creates a streamed Google Gemini generateContent response using the configured Google provider account.", "GoogleGenerateContentRequest", "GoogleGenerateContentResponse", parameters=[self._path_param("model", "Gemini model identifier.")], provider="google")},
            "/google/v1beta/models/{model}:embedContent": {"post": self._operation("Embeddings/google", "googleEmbedContent", "Google Gemini embed content", "Creates a Google Gemini embedding using the configured Google provider account.", "GoogleEmbedContentRequest", "GoogleEmbedContentResponse", parameters=[self._path_param("model", "Gemini model identifier.")], provider="google")},
            "/google/v1beta/models/{model}:batchEmbedContents": {"post": self._operation("Embeddings/google", "googleBatchEmbedContents", "Google Gemini batch embed contents", "Creates Google Gemini batch embeddings using the configured Google provider account.", "GoogleBatchEmbedContentsRequest", "GoogleBatchEmbedContentsResponse", parameters=[self._path_param("model", "Gemini model identifier.")], provider="google")},
            "/google/v1beta/models/{model}:countTokens": {"post": self._operation("Chat/google", "googleCountTokens", "Google Gemini count tokens", "Counts Google Gemini input tokens using the configured Google provider account.", "GoogleCountTokensRequest", "GoogleCountTokensResponse", parameters=[self._path_param("model", "Gemini model identifier.")], provider="google")},
            "/google/v1beta/files": {
                "get": self._operation("Files/google", "googleListFiles", "Google Gemini list files", "Lists Google Gemini files using the configured Google provider account.", None, "GoogleFileListResponse", parameters=self._google_list_query_params(), provider="google"),
                "post": self._operation("Files/google", "googleUploadFile", "Google Gemini upload file", "Uploads a Google Gemini file using the configured Google provider account.", None, "GoogleFile", provider="google", multipart_schema="GoogleFileUploadMultipartRequest"),
            },
            "/google/v1beta/files/{file_id}": {"get": self._operation("Files/google", "googleRetrieveFile", "Google Gemini retrieve file", "Retrieves Google Gemini file metadata using the configured Google provider account.", None, "GoogleFile", parameters=[self._path_param("file_id", "Gemini file identifier.")], provider="google"), "delete": self._operation("Files/google", "googleDeleteFile", "Google Gemini delete file", "Deletes Google Gemini file metadata using the configured Google provider account.", None, "GoogleEmptyResponse", parameters=[self._path_param("file_id", "Gemini file identifier.")], provider="google")},
            "/google/v1beta/cachedContents": {
                "get": self._operation("Responses/google", "googleListCachedContents", "Google Gemini list cached contents", "Lists Google Gemini cached contents using the configured Google provider account.", None, "GoogleCachedContentListResponse", parameters=self._google_list_query_params(), provider="google"),
                "post": self._operation("Responses/google", "googleCreateCachedContent", "Google Gemini create cached content", "Creates Google Gemini cached content using the configured Google provider account.", "GoogleCachedContentCreateRequest", "GoogleCachedContent", provider="google"),
            },
            "/google/v1beta/cachedContents/{cached_content_id}": {"get": self._operation("Responses/google", "googleRetrieveCachedContent", "Google Gemini retrieve cached content", "Retrieves Google Gemini cached content using the configured Google provider account.", None, "GoogleCachedContent", parameters=[self._path_param("cached_content_id", "Gemini cached content identifier.")], provider="google"), "delete": self._operation("Responses/google", "googleDeleteCachedContent", "Google Gemini cached content", "Deletes Google Gemini cached content using the configured Google provider account.", None, "GoogleEmptyResponse", parameters=[self._path_param("cached_content_id", "Gemini cached content identifier.")], provider="google")},
            "/anthropic/v1/messages": {"post": self._operation("Chat/anthropic", "anthropicCreateMessage", "Anthropic Claude message", "Creates an Anthropic Messages API response using the configured Anthropic provider account.", "AnthropicMessageCreateRequest", "AnthropicMessage", provider="anthropic")},
            "/anthropic/v1/messages/count_tokens": {"post": self._operation("Chat/anthropic", "anthropicCountMessageTokens", "Anthropic count message tokens", "Counts Anthropic message tokens using the configured Anthropic provider account.", "AnthropicCountMessageTokensRequest", "AnthropicCountMessageTokensResponse", provider="anthropic")},
            "/anthropic/v1/messages/batches": {
                "get": self._operation("Batches/anthropic", "anthropicListMessageBatches", "Anthropic list message batches", "Lists Anthropic message batches using the configured Anthropic provider account.", None, "AnthropicMessageBatchListResponse", parameters=self._anthropic_list_query_params(), provider="anthropic"),
                "post": self._operation("Batches/anthropic", "anthropicCreateMessageBatch", "Anthropic create message batch", "Creates an Anthropic message batch using the configured Anthropic provider account.", "AnthropicMessageBatchCreateRequest", "AnthropicMessageBatch", provider="anthropic"),
            },
            "/anthropic/v1/messages/batches/{batch_id}": {"get": self._operation("Batches/anthropic", "anthropicRetrieveMessageBatch", "Anthropic retrieve message batch", "Retrieves an Anthropic message batch using the configured Anthropic provider account.", None, "AnthropicMessageBatch", parameters=[self._path_param("batch_id", "Anthropic message batch identifier.")], provider="anthropic")},
            "/anthropic/v1/messages/batches/{batch_id}/cancel": {"post": self._operation("Batches/anthropic", "anthropicCancelMessageBatch", "Anthropic cancel message batch", "Cancels an Anthropic message batch using the configured Anthropic provider account.", None, "AnthropicMessageBatch", parameters=[self._path_param("batch_id", "Anthropic message batch identifier.")], provider="anthropic")},
            "/anthropic/v1/files": {
                "get": self._operation("Files/anthropic", "anthropicListFiles", "Anthropic list files", "Lists Anthropic files using the configured Anthropic provider account.", None, "AnthropicFileListResponse", parameters=self._anthropic_list_query_params(), provider="anthropic"),
                "post": self._operation("Files/anthropic", "anthropicUploadFile", "Anthropic upload file", "Uploads an Anthropic file using the configured Anthropic provider account.", None, "AnthropicFile", provider="anthropic", multipart_schema="AnthropicFileUploadMultipartRequest"),
            },
            "/anthropic/v1/files/{file_id}": {"get": self._operation("Files/anthropic", "anthropicRetrieveFile", "Anthropic retrieve file", "Retrieves an Anthropic file using the configured Anthropic provider account.", None, "AnthropicFile", parameters=[self._path_param("file_id", "Anthropic file identifier.")], provider="anthropic"), "delete": self._operation("Files/anthropic", "anthropicDeleteFile", "Anthropic delete file", "Deletes an Anthropic file using the configured Anthropic provider account.", None, "AnthropicDeleteResponse", parameters=[self._path_param("file_id", "Anthropic file identifier.")], provider="anthropic")},
            "/anthropic/v1/files/{file_id}/content": {"get": self._operation("Files/anthropic", "anthropicRetrieveFileContent", "Anthropic retrieve file content", "Retrieves Anthropic file content using the configured Anthropic provider account.", None, "BinaryResponse", parameters=[self._path_param("file_id", "Anthropic file identifier.")], provider="anthropic")},
            "/volcengine/api/v3/contents/generations/tasks": {"post": self._operation("Videos/volcengine", "volcengineCreateContentGenerationTask", "Volcengine Ark content generation task", "Creates a Volcengine Ark image, video, or content generation task using the configured Volcengine provider account.", "VolcengineContentGenerationTaskCreateRequest", "VolcengineContentGenerationTaskCreateResponse", provider="volcengine")},
            "/volcengine/api/v3/contents/generations/tasks/{task_id}": {"get": self._operation("Videos/volcengine", "volcengineRetrieveContentGenerationTask", "Volcengine Ark retrieve content generation task", "Retrieves a Volcengine Ark task using the configured Volcengine provider account.", None, "VolcengineContentGenerationTask", parameters=[self._path_param("task_id", "Volcengine content generation task identifier.")], provider="volcengine")},
            "/suno/v1/music/generations": {"post": self._operation("Audio/suno", "sunoCreateMusicGeneration", "Suno music generation", "Creates a Suno-compatible music generation using the configured Suno provider account.", "SunoMusicGenerationRequest", "SunoMusicGenerationResponse", provider="suno")},
            "/suno/v1/music/generations/{task_id}": {"get": self._operation("Audio/suno", "sunoRetrieveMusicGeneration", "Suno retrieve music generation", "Retrieves a Suno-compatible music generation task using the configured Suno provider account.", None, "SunoMusicGenerationTaskResponse", parameters=[self._path_param("task_id", "Suno task identifier.")], provider="suno")},
            "/midjourney/v1/images/generations": {"post": self._operation("Images/midjourney", "midjourneyCreateImageGeneration", "Midjourney image generation", "Creates a Midjourney-compatible image generation using the configured Midjourney provider account.", "MidjourneyImageGenerationRequest", "MidjourneyImageGenerationTask", provider="midjourney")},
            "/midjourney/v1/images/generations/{task_id}": {"get": self._operation("Images/midjourney", "midjourneyRetrieveImageGeneration", "Midjourney retrieve image generation", "Retrieves a Midjourney-compatible image generation task using the configured Midjourney provider account.", None, "MidjourneyImageGenerationTask", parameters=[self._path_param("task_id", "Midjourney task identifier.")], provider="midjourney")},
            "/kling/v1/videos/generations": {"post": self._operation("Videos/kling", "klingCreateVideoGeneration", "Kling video generation", "Creates a Kling-compatible video generation using the configured Kling provider account.", "KlingVideoGenerationRequest", "KlingVideoGenerationTask", provider="kling")},
            "/kling/v1/videos/generations/{task_id}": {"get": self._operation("Videos/kling", "klingRetrieveVideoGeneration", "Kling retrieve video generation", "Retrieves a Kling-compatible video generation task using the configured Kling provider account.", None, "KlingVideoGenerationTask", parameters=[self._path_param("task_id", "Kling task identifier.")], provider="kling")},
            "/vidu/ent/v2/text2video": {"post": self._operation("Videos/vidu", "viduCreateTextToVideo", "Vidu text to video", "Creates a Vidu text-to-video task using the configured Vidu provider account.", "ViduTextToVideoRequest", "ViduVideoGenerationTask", provider="vidu")},
            "/vidu/ent/v2/img2video": {"post": self._operation("Videos/vidu", "viduCreateImageToVideo", "Vidu image to video", "Creates a Vidu image-to-video task using the configured Vidu provider account.", "ViduImageToVideoRequest", "ViduVideoGenerationTask", provider="vidu")},
            "/vidu/ent/v2/reference2video": {"post": self._operation("Videos/vidu", "viduCreateReferenceToVideo", "Vidu reference to video", "Creates a Vidu reference-to-video task using the configured Vidu provider account.", "ViduReferenceToVideoRequest", "ViduVideoGenerationTask", provider="vidu")},
            "/vidu/ent/v2/start-end2video": {"post": self._operation("Videos/vidu", "viduCreateStartEndToVideo", "Vidu start-end to video", "Creates a Vidu start-end-frame video task using the configured Vidu provider account.", "ViduStartEndToVideoRequest", "ViduVideoGenerationTask", provider="vidu")},
            "/vidu/ent/v2/reference2image": {"post": self._operation("Images/vidu", "viduCreateReferenceToImage", "Vidu reference to image", "Creates Vidu reference-to-image outputs using the configured Vidu provider account.", "ViduReferenceToImageRequest", "ViduImageGenerationTask", provider="vidu")},
            "/vidu/ent/v2/tasks/{task_id}/creations": {"get": self._operation("Videos/vidu", "viduGetTaskCreations", "Vidu get task creations", "Retrieves Vidu task creations using the configured Vidu provider account.", None, "ViduTaskCreationsResponse", parameters=[self._path_param("task_id", "Vidu task identifier.")], provider="vidu")},
            "/nano-banana/v1/images/generations": {"post": self._operation("Images/nano-banana", "nanoBananaCreateImageGeneration", "Nano Banana image generation", "Creates a Nano Banana compatible image generation using the configured Nano Banana provider account.", "NanoBananaImageGenerationRequest", "NanoBananaImageGenerationTask", provider="nano-banana")},
            "/nano-banana/v1/images/generations/{task_id}": {"get": self._operation("Images/nano-banana", "nanoBananaRetrieveImageGeneration", "Nano Banana retrieve image generation", "Retrieves a Nano Banana compatible image generation task using the configured Nano Banana provider account.", None, "NanoBananaImageGenerationTask", parameters=[self._path_param("task_id", "Nano Banana task identifier.")], provider="nano-banana")},
        }

    def _operation(
        self,
        tag: str,
        operation_id: str,
        summary: str,
        description: str,
        request_schema: str | None,
        response_schema: str,
        parameters: list[dict[str, Any]] | None = None,
        provider: str | None = None,
        multipart_schema: str | None = None,
        binary_request: bool = False,
        success_status: str = "200",
        success_content_type: str | None = None,
    ) -> dict[str, Any]:
        operation: dict[str, Any] = {
            "tags": [tag],
            "operationId": operation_id,
            "summary": summary,
            "description": description,
            "parameters": parameters or [],
            "responses": self._responses(response_schema, success_status=success_status, success_content_type=success_content_type),
            "security": [{"bearerAuth": []}],
        }
        request_content: dict[str, Any] = {}
        if request_schema is not None:
            request_content["application/json"] = {
                "schema": {"$ref": f"#/components/schemas/{request_schema}"},
            }
        if multipart_schema is not None:
            request_content["multipart/form-data"] = {
                "schema": {"$ref": f"#/components/schemas/{multipart_schema}"},
            }
        if binary_request:
            request_content["application/octet-stream"] = {
                "schema": {"type": "string", "format": "binary"},
            }
        if request_content:
            operation["requestBody"] = {"required": True, "content": request_content}
        return operation

    def _responses(
        self,
        success_schema: str,
        success_status: str = "200",
        success_content_type: str | None = None,
    ) -> dict[str, Any]:
        success_content: dict[str, Any]
        if success_schema == "BinaryResponse":
            success_content = {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}
        elif success_content_type is not None:
            success_content = {success_content_type: {"schema": {"$ref": f"#/components/schemas/{success_schema}"}}}
        else:
            success_content = {"application/json": {"schema": {"$ref": f"#/components/schemas/{success_schema}"}}}
        return {
            success_status: {"description": "Successful response from Claw Router or the selected upstream provider.", "content": success_content},
            "400": {"description": "Invalid request.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/OpenAiErrorEnvelope"}}}},
            "401": {"description": "Authentication failed.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/OpenAiErrorEnvelope"}}}},
            "404": {"description": "Resource or route target not found.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/OpenAiErrorEnvelope"}}}},
            "501": {"description": "Route is declared but no upstream provider account is configured.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/OpenAiErrorEnvelope"}}}},
            "502": {"description": "Upstream provider relay failed.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/OpenAiErrorEnvelope"}}}},
        }

    def _path_param(self, name: str, description: str) -> dict[str, Any]:
        return {"name": name, "in": "path", "required": True, "description": description, "schema": {"type": "string"}}

    def _query_param(
        self,
        name: str,
        description: str,
        schema: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "name": name,
            "in": "query",
            "required": False,
            "description": description,
            "schema": schema or {"type": "string"},
        }

    def _list_pagination_params(self) -> list[dict[str, Any]]:
        return [
            self._query_param("limit", "Maximum number of objects to return.", {"type": "integer", "minimum": 1, "maximum": 100}),
            self._query_param("order", "Sort order by creation time.", {"type": "string", "enum": ["asc", "desc"]}),
            self._query_param("after", "Cursor for pagination after an object identifier."),
            self._query_param("before", "Cursor for pagination before an object identifier."),
        ]

    def _google_list_query_params(self) -> list[dict[str, Any]]:
        return [
            self._query_param("pageSize", "Maximum number of Google resources to return.", {"type": "integer", "minimum": 1, "maximum": 100}),
            self._query_param("pageToken", "Google pagination token returned by a previous list response."),
        ]

    def _anthropic_list_query_params(self) -> list[dict[str, Any]]:
        return [
            self._query_param("before_id", "Anthropic cursor for results before an object identifier."),
            self._query_param("after_id", "Anthropic cursor for results after an object identifier."),
            self._query_param("limit", "Maximum number of Anthropic objects to return.", {"type": "integer", "minimum": 1, "maximum": 100}),
        ]

    def _include_query_param(self) -> dict[str, Any]:
        return self._query_param(
            "include[]",
            "Additional response fields to include, passed through to the selected upstream.",
            {"type": "array", "items": {"type": "string"}},
        )

    def _components(self) -> dict[str, Any]:
        return {
            "securitySchemes": {
                "bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "Claw Router API key"}
            },
            "schemas": {
                "JsonObject": {"type": "object", "additionalProperties": True, "description": "Provider-specific JSON payload accepted by Claw Router."},
                "DeleteResult": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "object", "deleted"],
                    "properties": {
                        "id": {"type": "string", "description": "Identifier of the deleted resource."},
                        "object": {"type": "string", "description": "Deleted resource object type."},
                        "deleted": {"type": "boolean", "description": "Whether the resource was deleted."},
                    },
                },
                "OpenAiErrorEnvelope": {"type": "object", "additionalProperties": False, "required": ["error"], "properties": {"error": {"$ref": "#/components/schemas/OpenAiError"}}},
                "OpenAiError": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["message", "type", "code"],
                    "properties": {
                        "message": {"type": "string", "description": "Human-readable error message."},
                        "type": {"type": "string", "description": "OpenAI-compatible error type."},
                        "param": {"type": "string", "nullable": True, "description": "Request parameter related to the error when available."},
                        "code": {"type": "string", "description": "Machine-readable error code."},
                        "path": {"type": "string", "description": "Gateway path that produced the error when available."},
                    },
                },
                "OpenAiModelList": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["object", "data"],
                    "properties": {
                        "object": {"type": "string", "enum": ["list"], "description": "Object type, always list."},
                        "data": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiModel"}, "description": "Model objects available to the caller."},
                    },
                },
                "OpenAiModel": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "object", "owned_by"],
                    "properties": {
                        "id": {"type": "string", "description": "Model identifier or Claw Router catalog key."},
                        "object": {"type": "string", "enum": ["model"], "description": "Object type, always model."},
                        "created": {"type": "integer", "format": "int64", "description": "Unix timestamp in seconds when the model was created, when known."},
                        "owned_by": {"type": "string", "description": "Organization or provider that owns the model."},
                    },
                },
                "OpenAiChatCompletionRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["model", "messages"],
                    "properties": {
                        "model": {"type": "string", "description": "Model id or Claw Router catalog key routed to a provider account."},
                        "messages": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiChatMessage"}, "description": "Conversation messages in OpenAI-compatible chat format."},
                        "audio": {"$ref": "#/components/schemas/OpenAiChatAudioConfig"},
                        "frequency_penalty": {"type": "number", "minimum": -2, "maximum": 2, "description": "Penalty applied to repeated tokens."},
                        "function_call": {"$ref": "#/components/schemas/OpenAiFunctionCallChoice"},
                        "functions": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiFunctionDefinition"}, "description": "Legacy function definitions passed through for compatible upstreams."},
                        "logit_bias": {"type": "object", "additionalProperties": {"type": "number"}, "description": "Token bias map keyed by token id."},
                        "logprobs": {"type": "boolean", "description": "Whether to return token log probabilities when supported."},
                        "max_completion_tokens": {"type": "integer", "minimum": 1, "description": "Upper bound for generated completion tokens."},
                        "max_tokens": {"type": "integer", "minimum": 1, "description": "Legacy upper bound for generated tokens."},
                        "metadata": {"type": "object", "additionalProperties": True, "description": "Developer-defined metadata attached to the request."},
                        "modalities": {"type": "array", "items": {"type": "string"}, "description": "Requested output modalities, such as text or audio."},
                        "n": {"type": "integer", "minimum": 1, "description": "Number of chat completion choices to generate."},
                        "parallel_tool_calls": {"type": "boolean", "description": "Whether tool calls may be executed in parallel by compatible upstreams."},
                        "prediction": {"$ref": "#/components/schemas/OpenAiPredictionConfig"},
                        "presence_penalty": {"type": "number", "minimum": -2, "maximum": 2, "description": "Penalty applied to new topic tokens."},
                        "reasoning_effort": {"type": "string", "enum": ["minimal", "low", "medium", "high"], "description": "Reasoning effort hint for reasoning models."},
                        "response_format": {"$ref": "#/components/schemas/OpenAiResponseFormat"},
                        "seed": {"type": "integer", "format": "int64", "description": "Best-effort deterministic sampling seed."},
                        "service_tier": {"type": "string", "enum": ["auto", "default", "flex", "priority"], "description": "Requested upstream service tier when supported."},
                        "stop": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"type": "string"}}], "description": "Stop sequence or list of stop sequences."},
                        "store": {"type": "boolean", "description": "Whether the upstream should store the chat completion when supported."},
                        "stream": {"type": "boolean", "default": False, "description": "Whether to stream chat completion chunks."},
                        "stream_options": {"$ref": "#/components/schemas/OpenAiStreamOptions"},
                        "temperature": {"type": "number", "minimum": 0, "maximum": 2, "description": "Sampling temperature."},
                        "tool_choice": {"$ref": "#/components/schemas/OpenAiToolChoice"},
                        "tools": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiTool"}, "description": "Tool definitions available to the model."},
                        "top_logprobs": {"type": "integer", "minimum": 0, "description": "Number of most likely tokens to return at each position."},
                        "top_p": {"type": "number", "minimum": 0, "maximum": 1, "description": "Nucleus sampling probability mass."},
                        "user": {"type": "string", "description": "End-user identifier forwarded to compatible upstreams."},
                    },
                },
                "OpenAiChatMessage": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["role"],
                    "properties": {
                        "role": {"type": "string", "enum": ["developer", "system", "user", "assistant", "tool", "function"], "description": "Message role, such as developer, system, user, assistant, tool, or function."},
                        "content": {
                            "oneOf": [
                                {"type": "string"},
                                {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiChatContentPart"}},
                                {"type": "null"},
                            ],
                            "description": "Message content as plain text, multimodal content parts, or null for tool call messages.",
                        },
                        "name": {"type": "string", "description": "Optional participant name for the message."},
                        "tool_call_id": {"type": "string", "description": "Tool call identifier that this tool message answers."},
                        "tool_calls": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiToolCall"}, "description": "Tool calls requested by an assistant message."},
                        "function_call": {"$ref": "#/components/schemas/OpenAiFunctionCall"},
                        "refusal": {"type": "string", "description": "Refusal text emitted by compatible upstreams."},
                    },
                },
                "OpenAiChatContentPart": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["text", "image_url", "input_audio", "file"], "description": "Content part type, such as text, image_url, input_audio, or file."},
                        "text": {"type": "string", "description": "Text content for text parts."},
                        "image_url": {"$ref": "#/components/schemas/OpenAiChatImageUrl"},
                        "input_audio": {"$ref": "#/components/schemas/OpenAiChatInputAudio"},
                        "file": {"$ref": "#/components/schemas/OpenAiChatFile"},
                    },
                },
                "OpenAiChatAudioConfig": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "voice": {"type": "string", "description": "Voice identifier for audio output."},
                        "format": {"type": "string", "description": "Audio output format requested from the upstream."},
                    },
                },
                "OpenAiPredictionConfig": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "description": "Prediction configuration type."},
                        "content": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiChatContentPart"}}], "description": "Static predicted content."},
                    },
                },
                "OpenAiResponseFormat": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["text", "json_object", "json_schema"], "description": "Requested response format type."},
                        "json_schema": {"$ref": "#/components/schemas/OpenAiJsonSchemaFormat"},
                    },
                },
                "OpenAiJsonSchemaFormat": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["name"],
                    "properties": {
                        "name": {"type": "string", "description": "JSON schema response format name."},
                        "description": {"type": "string", "description": "Description of the JSON schema response format."},
                        "schema": {"$ref": "#/components/schemas/OpenAiJsonSchema"},
                        "strict": {"type": "boolean", "description": "Whether strict JSON schema adherence is requested."},
                    },
                },
                "OpenAiJsonSchema": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "type": {"type": "string", "description": "JSON schema type."},
                        "description": {"type": "string", "description": "JSON schema description."},
                        "properties": {"type": "object", "additionalProperties": {"$ref": "#/components/schemas/OpenAiJsonSchema"}, "description": "Object property schemas."},
                        "required": {"type": "array", "items": {"type": "string"}, "description": "Required object property names."},
                        "items": {"$ref": "#/components/schemas/OpenAiJsonSchema"},
                        "additionalProperties": {"$ref": "#/components/schemas/OpenAiJsonSchemaAdditionalProperties"},
                        "enum": {"type": "array", "items": {}, "description": "Allowed literal values."},
                    },
                },
                "OpenAiJsonSchemaAdditionalProperties": {
                    "oneOf": [
                        {"type": "boolean"},
                        {"$ref": "#/components/schemas/OpenAiJsonSchema"},
                    ],
                    "description": "Official JSON Schema additionalProperties value: false/true or a nested schema.",
                },
                "OpenAiChatImageUrl": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["url"],
                    "properties": {
                        "url": {"type": "string", "description": "Image URL or data URL."},
                        "detail": {"type": "string", "description": "Image detail preference, such as low, high, or auto."},
                    },
                },
                "OpenAiChatInputAudio": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["data", "format"],
                    "properties": {
                        "data": {"type": "string", "description": "Base64-encoded audio data."},
                        "format": {"type": "string", "description": "Input audio format."},
                    },
                },
                "OpenAiChatFile": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "file_id": {"type": "string", "description": "Uploaded file identifier."},
                        "filename": {"type": "string", "description": "Input filename when sending inline file data."},
                        "file_data": {"type": "string", "description": "Inline file data accepted by compatible upstreams."},
                    },
                },
                "OpenAiStreamOptions": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "include_usage": {"type": "boolean", "description": "Whether the final stream event should include token usage."},
                    },
                },
                "OpenAiTool": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["function"], "description": "Tool type, commonly function."},
                        "function": {"$ref": "#/components/schemas/OpenAiFunctionDefinition"},
                    },
                },
                "OpenAiToolChoice": {
                    "oneOf": [
                        {"type": "string", "enum": ["none", "auto", "required"]},
                        {"$ref": "#/components/schemas/OpenAiNamedToolChoice"},
                    ],
                    "description": "Controls which tool is called by the model.",
                },
                "OpenAiNamedToolChoice": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type", "function"],
                    "properties": {
                        "type": {"type": "string", "enum": ["function"], "description": "Tool type selected by name."},
                        "function": {"$ref": "#/components/schemas/OpenAiNamedToolChoiceFunction"},
                    },
                },
                "OpenAiNamedToolChoiceFunction": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["name"],
                    "properties": {
                        "name": {"type": "string", "description": "Function name to force the model to call."},
                    },
                },
                "OpenAiFunctionCallChoice": {
                    "oneOf": [
                        {"type": "string", "enum": ["none", "auto"]},
                        {"$ref": "#/components/schemas/OpenAiNamedFunctionChoice"},
                    ],
                    "description": "Legacy function calling control.",
                },
                "OpenAiNamedFunctionChoice": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["name"],
                    "properties": {
                        "name": {"type": "string", "description": "Function name to force the model to call."},
                    },
                },
                "OpenAiFunctionDefinition": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["name"],
                    "properties": {
                        "name": {"type": "string", "description": "Function name visible to the model."},
                        "description": {"type": "string", "description": "Function description visible to the model."},
                        "parameters": {"$ref": "#/components/schemas/OpenAiJsonSchema"},
                        "strict": {"type": "boolean", "description": "Whether strict JSON Schema adherence is requested."},
                    },
                },
                "OpenAiToolCall": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "type"],
                    "properties": {
                        "id": {"type": "string", "description": "Tool call identifier."},
                        "type": {"type": "string", "enum": ["function"], "description": "Tool call type, commonly function."},
                        "function": {"$ref": "#/components/schemas/OpenAiFunctionCall"},
                    },
                },
                "OpenAiFunctionCall": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["name", "arguments"],
                    "properties": {
                        "name": {"type": "string", "description": "Function name selected by the model."},
                        "arguments": {"type": "string", "description": "JSON-serialized function arguments."},
                    },
                },
                "OpenAiChatCompletion": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "object", "created", "model", "choices"],
                    "properties": {
                        "id": {"type": "string", "description": "Chat completion identifier."},
                        "object": {"type": "string", "enum": ["chat.completion"], "description": "Object type, normally chat.completion."},
                        "created": {"type": "integer", "format": "int64", "description": "Unix timestamp in seconds when the completion was created."},
                        "model": {"type": "string", "description": "Model id used by the upstream response."},
                        "choices": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiChatCompletionChoice"}, "description": "Generated chat completion choices."},
                        "usage": {"$ref": "#/components/schemas/OpenAiTokenUsage"},
                        "request_id": {"type": "string", "description": "Upstream request identifier when returned."},
                        "service_tier": {"type": "string", "description": "Service tier used by the upstream when returned."},
                        "system_fingerprint": {"type": "string", "description": "Backend fingerprint for deterministic debugging when returned."},
                    },
                },
                "OpenAiChatCompletionChoice": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["index", "message"],
                    "properties": {
                        "index": {"type": "integer", "description": "Choice index in the response."},
                        "message": {"$ref": "#/components/schemas/OpenAiChatMessage"},
                        "finish_reason": {"type": "string", "description": "Reason generation finished, such as stop, length, content_filter, or tool_calls."},
                        "logprobs": {"$ref": "#/components/schemas/OpenAiChoiceLogprobs"},
                    },
                },
                "OpenAiTokenUsage": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["prompt_tokens", "completion_tokens", "total_tokens"],
                    "properties": {
                        "prompt_tokens": {"type": "integer", "description": "Number of input tokens billed for the request."},
                        "completion_tokens": {"type": "integer", "description": "Number of output tokens generated by the model."},
                        "total_tokens": {"type": "integer", "description": "Total input and output token count."},
                        "prompt_tokens_details": {"$ref": "#/components/schemas/OpenAiPromptTokensDetails"},
                        "completion_tokens_details": {"$ref": "#/components/schemas/OpenAiCompletionTokensDetails"},
                    },
                },
                "OpenAiPromptTokensDetails": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "cached_tokens": {"type": "integer", "description": "Number of input tokens served from cache."},
                        "audio_tokens": {"type": "integer", "description": "Number of input audio tokens."},
                    },
                },
                "OpenAiCompletionTokensDetails": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "reasoning_tokens": {"type": "integer", "description": "Number of reasoning tokens generated."},
                        "audio_tokens": {"type": "integer", "description": "Number of output audio tokens generated."},
                        "accepted_prediction_tokens": {"type": "integer", "description": "Prediction tokens accepted by the model."},
                        "rejected_prediction_tokens": {"type": "integer", "description": "Prediction tokens rejected by the model."},
                    },
                },
                "OpenAiChoiceLogprobs": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "content": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiTokenLogprob"}, "description": "Token log probabilities for generated content."},
                        "refusal": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiTokenLogprob"}, "description": "Token log probabilities for refusal content."},
                    },
                },
                "OpenAiTokenLogprob": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["token", "logprob"],
                    "properties": {
                        "token": {"type": "string", "description": "Token text."},
                        "logprob": {"type": "number", "description": "Token log probability."},
                        "bytes": {"type": "array", "items": {"type": "integer"}, "description": "UTF-8 bytes for the token when returned."},
                        "top_logprobs": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiTopLogprob"}, "description": "Most likely token options at this position."},
                    },
                },
                "OpenAiTopLogprob": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["token", "logprob"],
                    "properties": {
                        "token": {"type": "string", "description": "Candidate token text."},
                        "logprob": {"type": "number", "description": "Candidate token log probability."},
                        "bytes": {"type": "array", "items": {"type": "integer"}, "description": "UTF-8 bytes for the candidate token when returned."},
                    },
                },
                "OpenAiResponsesRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["model", "input"],
                    "properties": {
                        "model": {"type": "string", "description": "Model id or Claw Router catalog key routed to a provider account."},
                        "input": {
                            "oneOf": [
                                {"type": "string"},
                                {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiResponseInputItem"}},
                            ],
                            "description": "Text or structured multimodal input items for the Responses API.",
                        },
                        "background": {"type": "boolean", "description": "Whether the response may run in the background when supported."},
                        "conversation": {"oneOf": [{"type": "string"}, {"$ref": "#/components/schemas/OpenAiConversationReference"}], "description": "Conversation identifier or object for stateful response creation."},
                        "include": {"type": "array", "items": {"type": "string"}, "description": "Additional response fields to include."},
                        "instructions": {"type": "string", "description": "System or developer instructions for the response."},
                        "max_output_tokens": {"type": "integer", "minimum": 1, "description": "Maximum number of output tokens to generate."},
                        "max_tool_calls": {"type": "integer", "minimum": 1, "description": "Maximum number of tool calls the model may make."},
                        "metadata": {"type": "object", "additionalProperties": True, "description": "Developer-defined metadata attached to the response."},
                        "parallel_tool_calls": {"type": "boolean", "description": "Whether compatible upstreams may issue parallel tool calls."},
                        "previous_response_id": {"type": "string", "description": "Previous response identifier for chained responses."},
                        "prompt": {"$ref": "#/components/schemas/OpenAiPromptReference"},
                        "prompt_cache_key": {"type": "string", "description": "Application supplied cache key for prompt caching."},
                        "reasoning": {"$ref": "#/components/schemas/OpenAiReasoningConfig"},
                        "service_tier": {"type": "string", "enum": ["auto", "default", "flex", "priority"], "description": "Requested upstream service tier when supported."},
                        "store": {"type": "boolean", "description": "Whether the upstream should store the response."},
                        "stream": {"type": "boolean", "default": False, "description": "Whether to stream response events."},
                        "temperature": {"type": "number", "minimum": 0, "maximum": 2, "description": "Sampling temperature."},
                        "text": {"$ref": "#/components/schemas/OpenAiTextConfig"},
                        "tool_choice": {"$ref": "#/components/schemas/OpenAiToolChoice"},
                        "tools": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiTool"}, "description": "Tools available to the model."},
                        "top_logprobs": {"type": "integer", "minimum": 0, "description": "Number of likely token options to include when logprobs are requested."},
                        "top_p": {"type": "number", "minimum": 0, "maximum": 1, "description": "Nucleus sampling probability mass."},
                        "truncation": {"type": "string", "enum": ["auto", "disabled"], "description": "Input truncation strategy for long context requests."},
                        "user": {"type": "string", "description": "End-user identifier forwarded to compatible upstreams."},
                    },
                },
                "OpenAiConversationReference": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "id": {"type": "string", "description": "Conversation identifier."},
                    },
                },
                "OpenAiPromptReference": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "id": {"type": "string", "description": "Reusable prompt identifier."},
                        "version": {"type": "string", "description": "Reusable prompt version."},
                        "variables": {"type": "object", "additionalProperties": True, "description": "Prompt variables supplied by the caller."},
                    },
                },
                "OpenAiReasoningConfig": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "effort": {"type": "string", "enum": ["minimal", "low", "medium", "high"], "description": "Reasoning effort hint."},
                        "summary": {"type": "string", "enum": ["auto", "concise", "detailed"], "description": "Reasoning summary behavior when supported."},
                    },
                },
                "OpenAiTextConfig": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "format": {"$ref": "#/components/schemas/OpenAiResponseFormat"},
                    },
                },
                "OpenAiResponseInputItem": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "role": {"type": "string", "enum": ["developer", "system", "user", "assistant", "tool", "function"], "description": "Input item role, commonly user, assistant, developer, or system."},
                        "content": {
                            "oneOf": [
                                {"type": "string"},
                                {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiResponseInputContentPart"}},
                            ],
                            "description": "Input item content as text or typed input content parts.",
                        },
                        "type": {"type": "string", "description": "Input item type when using typed Responses API items."},
                        "id": {"type": "string", "description": "Input item identifier when referencing an existing item."},
                        "status": {"type": "string", "description": "Input item status when supplied by upstream state."},
                    },
                },
                "OpenAiResponseInputContentPart": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["input_text", "input_image", "input_file"], "description": "Responses API input content part type."},
                        "text": {"type": "string", "description": "Text for input_text parts."},
                        "image_url": {"type": "string", "description": "Image URL for input_image parts."},
                        "detail": {"type": "string", "description": "Image detail preference when supported."},
                        "file_id": {"type": "string", "description": "Uploaded file identifier for input_file parts."},
                        "filename": {"type": "string", "description": "Filename for inline file inputs."},
                        "file_data": {"type": "string", "description": "Inline file data for compatible upstreams."},
                    },
                },
                "OpenAiResponse": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "object", "model", "output"],
                    "properties": {
                        "id": {"type": "string", "description": "Response identifier."},
                        "object": {"type": "string", "enum": ["response"], "description": "Object type, normally response."},
                        "created_at": {"type": "integer", "format": "int64", "description": "Unix timestamp in seconds when the response was created."},
                        "status": {"type": "string", "enum": ["queued", "in_progress", "completed", "failed", "cancelled", "incomplete"], "description": "Response status."},
                        "model": {"type": "string", "description": "Model id used by the upstream response."},
                        "output": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiResponseOutputItem"}, "description": "Output items generated by the response."},
                        "output_text": {"type": "string", "description": "Convenience text output when returned by the upstream."},
                        "usage": {"$ref": "#/components/schemas/OpenAiResponseUsage"},
                        "error": {"$ref": "#/components/schemas/OpenAiResponseError"},
                        "incomplete_details": {"$ref": "#/components/schemas/OpenAiIncompleteDetails"},
                    },
                },
                "OpenAiResponseOutputItem": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "id": {"type": "string", "description": "Output item identifier."},
                        "type": {"type": "string", "enum": ["message", "function_call", "web_search_call", "file_search_call", "computer_call", "reasoning"], "description": "Output item type."},
                        "role": {"type": "string", "enum": ["developer", "system", "user", "assistant", "tool", "function"], "description": "Role for message output items."},
                        "status": {"type": "string", "description": "Status for the output item."},
                        "content": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiResponseOutputContent"}, "description": "Content parts for message output items."},
                    },
                },
                "OpenAiResponseOutputContent": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["output_text", "refusal"], "description": "Output content type."},
                        "text": {"type": "string", "description": "Text emitted by output_text content parts."},
                        "refusal": {"type": "string", "description": "Refusal text emitted by refusal content parts."},
                        "annotations": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiAnnotation"}, "description": "Annotations attached to the output text."},
                    },
                },
                "OpenAiResponseError": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "code": {"type": "string", "description": "Response error code."},
                        "message": {"type": "string", "description": "Human-readable response error message."},
                        "param": {"type": "string", "description": "Parameter related to the response error."},
                        "type": {"type": "string", "description": "Response error type."},
                    },
                },
                "OpenAiIncompleteDetails": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["reason"],
                    "properties": {
                        "reason": {"type": "string", "enum": ["max_output_tokens", "content_filter"], "description": "Reason the response is incomplete."},
                    },
                },
                "OpenAiAnnotation": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "enum": ["file_citation", "url_citation", "file_path"], "description": "Annotation type."},
                        "file_id": {"type": "string", "description": "Referenced file identifier when applicable."},
                        "filename": {"type": "string", "description": "Referenced filename when applicable."},
                        "index": {"type": "integer", "description": "Annotation index when returned by the upstream."},
                        "url": {"type": "string", "description": "Referenced URL when applicable."},
                        "title": {"type": "string", "description": "Referenced URL title when applicable."},
                        "start_index": {"type": "integer", "description": "Start character index for the annotation."},
                        "end_index": {"type": "integer", "description": "End character index for the annotation."},
                    },
                },
                "OpenAiResponseUsage": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["input_tokens", "output_tokens", "total_tokens"],
                    "properties": {
                        "input_tokens": {"type": "integer", "description": "Number of input tokens billed for the response."},
                        "output_tokens": {"type": "integer", "description": "Number of output tokens generated by the response."},
                        "total_tokens": {"type": "integer", "description": "Total input and output token count."},
                        "input_tokens_details": {"$ref": "#/components/schemas/OpenAiResponseInputTokensDetails"},
                        "output_tokens_details": {"$ref": "#/components/schemas/OpenAiResponseOutputTokensDetails"},
                    },
                },
                "OpenAiResponseInputTokensDetails": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "cached_tokens": {"type": "integer", "description": "Input tokens served from cache."},
                    },
                },
                "OpenAiResponseOutputTokensDetails": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "reasoning_tokens": {"type": "integer", "description": "Reasoning tokens generated by the response."},
                    },
                },
                "OpenAiEmbeddingsRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["model", "input"],
                    "properties": {
                        "model": {"type": "string", "description": "Embedding model id or Claw Router catalog key routed to a provider account."},
                        "input": {
                            "oneOf": [
                                {"type": "string"},
                                {"type": "array", "items": {"type": "string"}},
                                {"type": "array", "items": {"type": "integer"}},
                                {"type": "array", "items": {"type": "array", "items": {"type": "integer"}}},
                            ],
                            "description": "Input text, text array, token array, or token array batch to embed.",
                        },
                        "encoding_format": {"type": "string", "enum": ["float", "base64"], "description": "Format for returned embeddings."},
                        "dimensions": {"type": "integer", "minimum": 1, "description": "Requested embedding dimensionality when supported by the model."},
                        "user": {"type": "string", "description": "End-user identifier forwarded to compatible upstreams."},
                    },
                },
                "OpenAiEmbeddingList": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["object", "data", "usage"],
                    "properties": {
                        "object": {"type": "string", "enum": ["list"], "description": "Object type, always list."},
                        "data": {"type": "array", "items": {"$ref": "#/components/schemas/OpenAiEmbedding"}, "description": "Embedding vectors in input order."},
                        "model": {"type": "string", "description": "Embedding model used by the upstream response."},
                        "usage": {"$ref": "#/components/schemas/OpenAiEmbeddingUsage"},
                    },
                },
                "OpenAiEmbedding": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["object", "index", "embedding"],
                    "properties": {
                        "object": {"type": "string", "enum": ["embedding"], "description": "Object type, always embedding."},
                        "index": {"type": "integer", "description": "Index of the embedding in the input batch."},
                        "embedding": {
                            "oneOf": [
                                {"type": "array", "items": {"type": "number"}},
                                {"type": "string"},
                            ],
                            "description": "Embedding vector as floats, or base64-encoded vector when requested.",
                        },
                    },
                },
                "OpenAiEmbeddingUsage": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["prompt_tokens", "total_tokens"],
                    "properties": {
                        "prompt_tokens": {"type": "integer", "description": "Number of input tokens embedded."},
                        "total_tokens": {"type": "integer", "description": "Total token count for the embedding request."},
                    },
                },
                "OpenAiImageGenerationRequest": {"type": "object", "additionalProperties": True, "required": ["model", "prompt"], "properties": {"model": {"type": "string", "description": "Image model id or Claw Router catalog key."}, "prompt": {"type": "string", "description": "Text prompt describing the image to generate."}, "n": {"type": "integer", "minimum": 1, "maximum": 16, "description": "Number of images to generate when supported."}, "size": {"type": "string", "description": "Requested image size."}, "quality": {"type": "string", "description": "Requested image quality when supported."}, "response_format": {"type": "string", "description": "Desired response format, such as url or b64_json."}}},
                "OpenAiImageEditRequest": {"type": "object", "additionalProperties": True, "required": ["model", "prompt"], "properties": {"model": {"type": "string", "description": "Image edit model id or Claw Router catalog key."}, "prompt": {"type": "string", "description": "Text prompt describing the edit."}, "image": {"$ref": "#/components/schemas/OpenAiImageReferenceInputList"}, "mask": {"$ref": "#/components/schemas/OpenAiImageReferenceInput"}}},
                "OpenAiImageEditMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["model", "prompt", "image"], "properties": {"model": {"type": "string", "description": "Image edit model id or Claw Router catalog key."}, "prompt": {"type": "string", "description": "Text prompt describing the edit."}, "image": {"$ref": "#/components/schemas/OpenAiBinaryFilePart"}, "mask": {"$ref": "#/components/schemas/OpenAiBinaryFilePart"}}},
                "OpenAiImageVariationRequest": {"type": "object", "additionalProperties": True, "required": ["model", "image"], "properties": {"model": {"type": "string", "description": "Image variation model id or Claw Router catalog key."}, "image": {"$ref": "#/components/schemas/OpenAiImageReferenceInput"}, "size": {"type": "string", "description": "Requested image size."}}},
                "OpenAiImageVariationMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["model", "image"], "properties": {"model": {"type": "string", "description": "Image variation model id or Claw Router catalog key."}, "image": {"$ref": "#/components/schemas/OpenAiBinaryFilePart"}, "size": {"type": "string", "description": "Requested image size."}}},
                "OpenAiAudioTranscriptionRequest": {"type": "object", "additionalProperties": True, "required": ["model", "file"], "properties": {"model": {"type": "string", "description": "Transcription model id or Claw Router catalog key."}, "file": {"$ref": "#/components/schemas/OpenAiFileReferenceInput"}, "language": {"type": "string", "description": "Optional source language hint."}, "prompt": {"type": "string", "description": "Optional text prompt to guide transcription."}, "response_format": {"type": "string", "description": "Desired transcription response format."}}},
                "OpenAiAudioTranscriptionMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["model", "file"], "properties": {"model": {"type": "string", "description": "Transcription model id or Claw Router catalog key."}, "file": {"$ref": "#/components/schemas/OpenAiBinaryFilePart"}, "language": {"type": "string", "description": "Optional source language hint."}, "prompt": {"type": "string", "description": "Optional text prompt to guide transcription."}, "response_format": {"type": "string", "description": "Desired transcription response format."}}},
                "OpenAiAudioTranslationRequest": {"type": "object", "additionalProperties": True, "required": ["model", "file"], "properties": {"model": {"type": "string", "description": "Translation model id or Claw Router catalog key."}, "file": {"$ref": "#/components/schemas/OpenAiFileReferenceInput"}, "prompt": {"type": "string", "description": "Optional text prompt to guide translation."}, "response_format": {"type": "string", "description": "Desired translation response format."}}},
                "OpenAiAudioTranslationMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["model", "file"], "properties": {"model": {"type": "string", "description": "Translation model id or Claw Router catalog key."}, "file": {"$ref": "#/components/schemas/OpenAiBinaryFilePart"}, "prompt": {"type": "string", "description": "Optional text prompt to guide translation."}, "response_format": {"type": "string", "description": "Desired translation response format."}}},
                "OpenAiVoiceConsentMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["file"], "properties": {"file": {"type": "string", "format": "binary", "description": "Voice consent file."}, "name": {"type": "string", "description": "Human-readable voice consent name."}, "metadata": {"type": "object", "additionalProperties": True, "description": "Provider-specific metadata for the voice consent."}}},
                "OpenAiFileUploadRequest": {"type": "object", "additionalProperties": True, "required": ["file", "purpose"], "properties": {"file": {"type": "string", "format": "binary", "description": "File bytes to upload."}, "purpose": {"type": "string", "description": "OpenAI-compatible file purpose, such as assistants, batch, fine-tune, vision, or provider-specific values."}}},
                "OpenAiUploadPartMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["data"], "properties": {"data": {"type": "string", "format": "binary", "description": "Binary upload part data."}}},
                "OpenAiRealtimeCallMultipartRequest": {"type": "object", "additionalProperties": True, "required": ["sdp"], "properties": {"sdp": {"type": "string", "description": "WebRTC SDP offer."}, "session": {"type": "string", "description": "JSON-serialized realtime session configuration."}}},
                "SdpResponse": {"type": "string", "description": "WebRTC SDP answer returned as application/sdp."},
                "ProviderMultipartRequest": {"type": "object", "additionalProperties": True, "description": "Provider-specific multipart form fields and binary files."},
                "OpenAiConversationCreateRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "metadata": {
                            "type": "object",
                            "additionalProperties": {"type": "string"},
                            "description": "Developer-defined metadata attached to the conversation.",
                        },
                        "items": {
                            "type": "array",
                            "description": "Initial input items to add to the conversation.",
                            "items": {"$ref": "#/components/schemas/OpenAiConversationItemCreateRequest"},
                        },
                    },
                },
                "OpenAiConversationUpdateRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "metadata": {
                            "type": "object",
                            "additionalProperties": {"type": "string"},
                            "description": "Replacement metadata for the conversation.",
                        },
                    },
                },
                "OpenAiConversation": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "object", "created_at"],
                    "properties": {
                        "id": {"type": "string", "description": "Conversation identifier."},
                        "object": {"type": "string", "enum": ["conversation"], "description": "Object type, always conversation."},
                        "created_at": {"type": "integer", "format": "int64", "description": "Unix timestamp in seconds when the conversation was created."},
                        "metadata": {
                            "type": "object",
                            "additionalProperties": {"type": "string"},
                            "description": "Developer-defined metadata attached to the conversation.",
                        },
                    },
                },
                "OpenAiConversationList": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["object", "data"],
                    "properties": {
                        "object": {"type": "string", "enum": ["list"], "description": "Object type, always list."},
                        "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/OpenAiConversation"},
                            "description": "Conversation objects in the requested page.",
                        },
                        "first_id": {"type": "string", "nullable": True, "description": "Identifier of the first object in the page."},
                        "last_id": {"type": "string", "nullable": True, "description": "Identifier of the last object in the page."},
                        "has_more": {"type": "boolean", "description": "Whether additional pages are available."},
                    },
                },
                "OpenAiConversationItemCreateRequest": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "description": "Conversation item type, such as message, reasoning, tool_call, or provider-specific item type."},
                        "role": {"type": "string", "description": "Message role when the item represents a message."},
                        "content": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/OpenAiConversationContentPart"},
                            "description": "Text or multimodal content parts for the item.",
                        },
                        "metadata": {
                            "type": "object",
                            "additionalProperties": {"type": "string"},
                            "description": "Developer-defined metadata attached to the item.",
                        },
                    },
                },
                "OpenAiConversationItem": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["id", "object", "type"],
                    "properties": {
                        "id": {"type": "string", "description": "Conversation item identifier."},
                        "object": {"type": "string", "enum": ["conversation.item"], "description": "Object type, always conversation.item."},
                        "type": {"type": "string", "description": "Conversation item type."},
                        "role": {"type": "string", "description": "Message role when the item represents a message."},
                        "content": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/OpenAiConversationContentPart"},
                            "description": "Text or multimodal content parts for the item.",
                        },
                        "status": {"type": "string", "description": "Provider item status when returned by the upstream."},
                        "created_at": {"type": "integer", "format": "int64", "description": "Unix timestamp in seconds when the item was created."},
                        "metadata": {
                            "type": "object",
                            "additionalProperties": {"type": "string"},
                            "description": "Developer-defined metadata attached to the item.",
                        },
                    },
                },
                "OpenAiConversationItemList": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["object", "data"],
                    "properties": {
                        "object": {"type": "string", "enum": ["list"], "description": "Object type, always list."},
                        "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/OpenAiConversationItem"},
                            "description": "Conversation items in the requested page.",
                        },
                        "first_id": {"type": "string", "nullable": True, "description": "Identifier of the first object in the page."},
                        "last_id": {"type": "string", "nullable": True, "description": "Identifier of the last object in the page."},
                        "has_more": {"type": "boolean", "description": "Whether additional pages are available."},
                    },
                },
                "OpenAiConversationContentPart": {
                    "type": "object",
                    "additionalProperties": True,
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string", "description": "Content part type, such as input_text, output_text, input_image, or provider-specific type."},
                        "text": {"type": "string", "description": "Text content for text parts."},
                        "image_url": {"type": "string", "description": "Image URL for image parts when represented as a URL."},
                        "file_id": {"type": "string", "description": "Uploaded file identifier for file-backed content parts."},
                    },
                },
                "ViduTextToVideoRequest": {"type": "object", "additionalProperties": True, "required": ["model", "prompt"], "properties": self._vidu_video_request_properties()},
                "ViduImageToVideoRequest": {"type": "object", "additionalProperties": True, "required": ["model", "images"], "properties": {**self._vidu_video_request_properties(), "images": {"type": "array", "items": {"type": "string"}, "description": "Source image URLs or Vidu-supported image references."}}},
                "ViduReferenceToVideoRequest": {"type": "object", "additionalProperties": True, "required": ["model", "images"], "properties": {**self._vidu_video_request_properties(), "images": {"type": "array", "items": {"type": "string"}, "description": "Reference image URLs or Vidu-supported image references."}}},
                "ViduStartEndToVideoRequest": {"type": "object", "additionalProperties": True, "required": ["model", "images"], "properties": {**self._vidu_video_request_properties(), "images": {"type": "array", "items": {"type": "string"}, "description": "Start and end image URLs or Vidu-supported image references."}}},
                "ViduReferenceToImageRequest": {"type": "object", "additionalProperties": True, "required": ["model", "prompt", "images"], "properties": {**self._vidu_image_request_properties(), "images": {"type": "array", "items": {"type": "string"}, "description": "Reference image URLs or Vidu-supported image references."}}},
                "ViduVideoGenerationTask": {"type": "object", "additionalProperties": True, "properties": self._vidu_task_properties("video")},
                "ViduImageGenerationTask": {"type": "object", "additionalProperties": True, "properties": self._vidu_task_properties("image")},
                "ViduTaskCreationsResponse": {"type": "object", "additionalProperties": True, "properties": {**self._vidu_task_properties("creation"), "creations": {"type": "array", "items": {"$ref": "#/components/schemas/ViduCreation"}, "description": "Vidu creation records for the task."}}},
                **self._provider_shared_schemas(),
                **self._google_provider_schemas(),
                **self._anthropic_provider_schemas(),
                **self._media_provider_schemas(),
            },
        }

    def _provider_shared_schemas(self) -> dict[str, Any]:
        return {
            "ProviderJsonValue": {
                "description": "A JSON value forwarded to or returned by a provider extension point.",
                "oneOf": [
                    {"type": "string"},
                    {"type": "number"},
                    {"type": "integer"},
                    {"type": "boolean"},
                    {"$ref": "#/components/schemas/ProviderJsonNull"},
                    {"type": "array", "items": {"$ref": "#/components/schemas/ProviderJsonValue"}},
                    {"$ref": "#/components/schemas/ProviderJsonObject"},
                ],
            },
            "ProviderJsonNull": {
                "type": "string",
                "nullable": True,
                "enum": [None],
                "description": "Reusable OpenAPI 3.0 nullable JSON null value module.",
            },
            "ProviderJsonObject": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "description": "A named JSON object module for provider-defined key-value payloads.",
            },
            "ProviderMetadata": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "description": "Caller or provider metadata represented as JSON key-value pairs.",
            },
            "ProviderGeneratedMediaMetadata": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "description": "Provider-specific metadata for a generated media asset.",
            },
            "ProviderJsonSchema": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "type": {"type": "string", "description": "JSON Schema type name."},
                    "description": {"type": "string", "description": "Human-readable schema description."},
                    "enum": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderJsonValue"}, "description": "Allowed literal values."},
                    "items": {"$ref": "#/components/schemas/ProviderJsonSchema"},
                    "properties": {"type": "object", "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonSchema"}, "description": "Object property schemas keyed by field name."},
                    "required": {"type": "array", "items": {"type": "string"}, "description": "Required object property names."},
                    "additionalProperties": {
                        "oneOf": [
                            {"type": "boolean"},
                            {"$ref": "#/components/schemas/ProviderJsonSchema"},
                        ],
                        "description": "JSON Schema additionalProperties value.",
                    },
                },
                "description": "Reusable JSON Schema object used by provider tool definitions.",
            },
            "ProviderTaskResult": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "id": {"type": "string", "description": "Provider result identifier."},
                    "status": {"type": "string", "description": "Provider result status."},
                    "text": {"type": "string", "description": "Generated text output when returned by the provider."},
                    "content": {"type": "array", "items": {"$ref": "#/components/schemas/VolcengineContentPart"}, "description": "Generated or transformed content parts."},
                    "images": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderGeneratedMedia"}, "description": "Generated image assets."},
                    "videos": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderGeneratedMedia"}, "description": "Generated video assets."},
                    "audios": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderGeneratedMedia"}, "description": "Generated audio assets."},
                    "metadata": {"$ref": "#/components/schemas/ProviderMetadata"},
                },
                "description": "Provider task result payload with common media result fields and typed extension values.",
            },
            "ViduCreation": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "id": {"type": "string", "description": "Vidu creation identifier."},
                    "type": {"type": "string", "description": "Creation object type."},
                    "url": {"type": "string", "description": "Primary creation URL."},
                    "uri": {"type": "string", "description": "Provider URI for the creation."},
                    "video_url": {"type": "string", "description": "Generated video URL."},
                    "image_url": {"type": "string", "description": "Generated image URL."},
                    "audio_url": {"type": "string", "description": "Generated audio URL."},
                    "cover_url": {"type": "string", "description": "Cover image URL."},
                    "duration": {"type": "number", "description": "Media duration in seconds."},
                    "width": {"type": "integer", "description": "Media width in pixels."},
                    "height": {"type": "integer", "description": "Media height in pixels."},
                    "created_at": {"type": "string", "description": "Creation timestamp."},
                    "metadata": {"$ref": "#/components/schemas/ProviderGeneratedMediaMetadata"},
                },
                "description": "Generated media record returned by Vidu task creation endpoints.",
            },
        }

    def _google_provider_schemas(self) -> dict[str, Any]:
        return {
            "GoogleGenerateContentRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["contents"],
                "properties": {
                    "contents": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleContent"}, "description": "Conversation contents sent to the Gemini model."},
                    "tools": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleTool"}, "description": "Tool definitions available to the Gemini model."},
                    "toolConfig": {"$ref": "#/components/schemas/GoogleToolConfig"},
                    "safetySettings": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleSafetySetting"}, "description": "Safety settings overriding model defaults."},
                    "systemInstruction": {"$ref": "#/components/schemas/GoogleContent"},
                    "generationConfig": {"$ref": "#/components/schemas/GoogleGenerationConfig"},
                    "cachedContent": {"type": "string", "description": "Cached content resource name to reuse for the request."},
                },
            },
            "GoogleGenerateContentResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "candidates": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleCandidate"}, "description": "Candidate responses returned by Gemini."},
                    "promptFeedback": {"$ref": "#/components/schemas/GooglePromptFeedback"},
                    "usageMetadata": {"$ref": "#/components/schemas/GoogleUsageMetadata"},
                    "modelVersion": {"type": "string", "description": "Model version that generated the response."},
                    "responseId": {"type": "string", "description": "Provider response identifier."},
                },
            },
            "GoogleContent": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "role": {"type": "string", "description": "Content role, such as user or model."},
                    "parts": {"type": "array", "items": {"$ref": "#/components/schemas/GooglePart"}, "description": "Ordered content parts."},
                },
            },
            "GooglePart": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "text": {"type": "string", "description": "Text content part."},
                    "inlineData": {"$ref": "#/components/schemas/GoogleBlob"},
                    "fileData": {"$ref": "#/components/schemas/GoogleFileData"},
                    "functionCall": {"$ref": "#/components/schemas/GoogleFunctionCall"},
                    "functionResponse": {"$ref": "#/components/schemas/GoogleFunctionResponse"},
                    "executableCode": {"$ref": "#/components/schemas/GoogleExecutableCode"},
                    "codeExecutionResult": {"$ref": "#/components/schemas/GoogleCodeExecutionResult"},
                },
            },
            "GoogleBlob": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "mimeType": {"type": "string", "description": "IANA MIME type for the inline data."},
                    "data": {"type": "string", "format": "byte", "description": "Base64-encoded binary content."},
                },
            },
            "GoogleFileData": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "mimeType": {"type": "string", "description": "IANA MIME type for the referenced file."},
                    "fileUri": {"type": "string", "description": "Gemini file URI."},
                },
            },
            "GoogleFunctionCall": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "name": {"type": "string", "description": "Function name selected by the model."},
                    "args": {"$ref": "#/components/schemas/ProviderJsonObject"},
                },
            },
            "GoogleFunctionResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "name": {"type": "string", "description": "Function name being answered."},
                    "response": {"$ref": "#/components/schemas/ProviderJsonObject"},
                },
            },
            "GoogleExecutableCode": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "language": {"type": "string", "description": "Programming language of executable code."},
                    "code": {"type": "string", "description": "Code emitted by the model."},
                },
            },
            "GoogleCodeExecutionResult": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "outcome": {"type": "string", "description": "Code execution outcome."},
                    "output": {"type": "string", "description": "Code execution output."},
                },
            },
            "GoogleGenerationConfig": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "candidateCount": {"type": "integer", "description": "Number of response candidates to generate."},
                    "stopSequences": {"type": "array", "items": {"type": "string"}, "description": "Stop sequences for generation."},
                    "maxOutputTokens": {"type": "integer", "description": "Maximum output token count."},
                    "temperature": {"type": "number", "description": "Sampling temperature."},
                    "topP": {"type": "number", "description": "Nucleus sampling probability mass."},
                    "topK": {"type": "integer", "description": "Top-k sampling value."},
                    "responseMimeType": {"type": "string", "description": "Requested response MIME type."},
                    "responseSchema": {"$ref": "#/components/schemas/GoogleSchema"},
                    "thinkingConfig": {"$ref": "#/components/schemas/GoogleThinkingConfig"},
                },
            },
            "GoogleThinkingConfig": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "thinkingBudget": {"type": "integer", "description": "Requested thinking token budget."},
                    "includeThoughts": {"type": "boolean", "description": "Whether thought summaries should be included when supported."},
                },
            },
            "GoogleSchema": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "type": {"type": "string", "description": "JSON schema type."},
                    "format": {"type": "string", "description": "JSON schema format."},
                    "description": {"type": "string", "description": "Schema description."},
                    "nullable": {"type": "boolean", "description": "Whether null is accepted."},
                    "enum": {"type": "array", "items": {"type": "string"}, "description": "Allowed string values."},
                    "items": {"$ref": "#/components/schemas/GoogleSchema"},
                    "properties": {"type": "object", "additionalProperties": {"$ref": "#/components/schemas/GoogleSchema"}, "description": "Object property schemas."},
                    "required": {"type": "array", "items": {"type": "string"}, "description": "Required property names."},
                },
            },
            "GoogleTool": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "functionDeclarations": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleFunctionDeclaration"}, "description": "Callable function declarations."},
                    "codeExecution": {"$ref": "#/components/schemas/GoogleCodeExecutionTool"},
                    "googleSearch": {"$ref": "#/components/schemas/GoogleSearchTool"},
                    "urlContext": {"$ref": "#/components/schemas/GoogleUrlContextTool"},
                },
            },
            "GoogleCodeExecutionTool": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "enabled": {"type": "boolean", "description": "Whether code execution is enabled for the tool."},
                },
                "description": "Google code execution tool configuration.",
            },
            "GoogleSearchTool": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "dynamicRetrievalConfig": {"$ref": "#/components/schemas/GoogleDynamicRetrievalConfig"},
                },
                "description": "Google Search grounding tool configuration.",
            },
            "GoogleDynamicRetrievalConfig": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "mode": {"type": "string", "description": "Dynamic retrieval mode."},
                    "dynamicThreshold": {"type": "number", "description": "Dynamic retrieval confidence threshold."},
                },
                "description": "Dynamic retrieval configuration for Google Search grounding.",
            },
            "GoogleUrlContextTool": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "allowedDomains": {"type": "array", "items": {"type": "string"}, "description": "Domains allowed for URL context retrieval."},
                },
                "description": "Google URL context tool configuration.",
            },
            "GoogleFunctionDeclaration": {
                "type": "object",
                "additionalProperties": True,
                "required": ["name"],
                "properties": {
                    "name": {"type": "string", "description": "Function name."},
                    "description": {"type": "string", "description": "Function description."},
                    "parameters": {"$ref": "#/components/schemas/GoogleSchema"},
                    "response": {"$ref": "#/components/schemas/GoogleSchema"},
                },
            },
            "GoogleToolConfig": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "functionCallingConfig": {"$ref": "#/components/schemas/GoogleFunctionCallingConfig"},
                },
            },
            "GoogleFunctionCallingConfig": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "mode": {"type": "string", "description": "Function calling mode."},
                    "allowedFunctionNames": {"type": "array", "items": {"type": "string"}, "description": "Function names the model may call."},
                },
            },
            "GoogleSafetySetting": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "category": {"type": "string", "description": "Safety harm category."},
                    "threshold": {"type": "string", "description": "Blocking threshold."},
                },
            },
            "GoogleCandidate": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "content": {"$ref": "#/components/schemas/GoogleContent"},
                    "finishReason": {"type": "string", "description": "Reason generation stopped."},
                    "safetyRatings": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleSafetyRating"}, "description": "Safety ratings for the candidate."},
                    "citationMetadata": {"$ref": "#/components/schemas/GoogleCitationMetadata"},
                    "tokenCount": {"type": "integer", "description": "Candidate token count when supplied."},
                    "index": {"type": "integer", "description": "Candidate index."},
                },
            },
            "GoogleCitationMetadata": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "citationSources": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleCitationSource"}, "description": "Citation sources used by the candidate."},
                },
                "description": "Citation metadata returned by Gemini.",
            },
            "GoogleCitationSource": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "properties": {
                    "startIndex": {"type": "integer", "description": "Start index of the cited span."},
                    "endIndex": {"type": "integer", "description": "End index of the cited span."},
                    "uri": {"type": "string", "description": "Citation URI."},
                    "license": {"type": "string", "description": "Citation license text when returned."},
                },
                "description": "Single citation source returned by Gemini.",
            },
            "GoogleSafetyRating": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "category": {"type": "string", "description": "Safety harm category."},
                    "probability": {"type": "string", "description": "Estimated harm probability."},
                    "blocked": {"type": "boolean", "description": "Whether content was blocked."},
                },
            },
            "GooglePromptFeedback": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "blockReason": {"type": "string", "description": "Reason the prompt was blocked."},
                    "safetyRatings": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleSafetyRating"}, "description": "Prompt safety ratings."},
                },
            },
            "GoogleUsageMetadata": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "promptTokenCount": {"type": "integer", "description": "Input token count."},
                    "candidatesTokenCount": {"type": "integer", "description": "Candidate output token count."},
                    "totalTokenCount": {"type": "integer", "description": "Total token count."},
                    "cachedContentTokenCount": {"type": "integer", "description": "Cached content token count."},
                    "thoughtsTokenCount": {"type": "integer", "description": "Thinking token count."},
                },
            },
            "GoogleEmbedContentRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["content"],
                "properties": {
                    "content": {"$ref": "#/components/schemas/GoogleContent"},
                    "taskType": {"type": "string", "description": "Embedding task type."},
                    "title": {"type": "string", "description": "Optional document title for retrieval embeddings."},
                    "outputDimensionality": {"type": "integer", "description": "Requested embedding dimensionality."},
                },
            },
            "GoogleEmbedContentResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "embedding": {"$ref": "#/components/schemas/GoogleContentEmbedding"},
                },
            },
            "GoogleBatchEmbedContentsRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["requests"],
                "properties": {
                    "requests": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleEmbedContentRequest"}, "description": "Embedding requests to run as a batch."},
                },
            },
            "GoogleBatchEmbedContentsResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "embeddings": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleContentEmbedding"}, "description": "Embedding vectors in request order."},
                },
            },
            "GoogleContentEmbedding": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "values": {"type": "array", "items": {"type": "number"}, "description": "Embedding vector values."},
                },
            },
            "GoogleCountTokensRequest": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "contents": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleContent"}, "description": "Contents to count."},
                    "generateContentRequest": {"$ref": "#/components/schemas/GoogleGenerateContentRequest"},
                },
            },
            "GoogleCountTokensResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "totalTokens": {"type": "integer", "description": "Total token count."},
                    "cachedContentTokenCount": {"type": "integer", "description": "Cached content token count."},
                },
            },
            "GoogleFileUploadMultipartRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["file"],
                "properties": {
                    "file": {"type": "string", "format": "binary", "description": "Binary file content uploaded to Gemini."},
                    "metadata": {"type": "string", "description": "JSON-encoded Gemini file metadata when required by the upstream upload protocol."},
                },
            },
            "GoogleFileListResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "files": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleFile"}, "description": "Gemini files visible to the provider account."},
                    "nextPageToken": {"type": "string", "description": "Pagination token for the next page."},
                },
            },
            "GoogleFile": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "name": {"type": "string", "description": "Gemini file resource name."},
                    "displayName": {"type": "string", "description": "Human-readable file display name."},
                    "mimeType": {"type": "string", "description": "File MIME type."},
                    "sizeBytes": {"type": "string", "description": "File size in bytes, encoded as a string by the Google API."},
                    "createTime": {"type": "string", "format": "date-time", "description": "Creation timestamp."},
                    "updateTime": {"type": "string", "format": "date-time", "description": "Update timestamp."},
                    "expirationTime": {"type": "string", "format": "date-time", "description": "Expiration timestamp."},
                    "sha256Hash": {"type": "string", "description": "SHA-256 hash for the file."},
                    "uri": {"type": "string", "description": "Gemini file URI."},
                    "state": {"type": "string", "description": "Processing state of the file."},
                    "error": {"$ref": "#/components/schemas/ProviderTaskError"},
                },
            },
            "GoogleCachedContentCreateRequest": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "model": {"type": "string", "description": "Model resource name for the cache."},
                    "contents": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleContent"}, "description": "Content to cache."},
                    "tools": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleTool"}, "description": "Tools associated with cached content."},
                    "toolConfig": {"$ref": "#/components/schemas/GoogleToolConfig"},
                    "systemInstruction": {"$ref": "#/components/schemas/GoogleContent"},
                    "displayName": {"type": "string", "description": "Human-readable cached content display name."},
                    "ttl": {"type": "string", "description": "Time-to-live duration for the cache."},
                    "expireTime": {"type": "string", "format": "date-time", "description": "Absolute expiration time for the cache."},
                },
            },
            "GoogleCachedContentListResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "cachedContents": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleCachedContent"}, "description": "Cached content resources."},
                    "nextPageToken": {"type": "string", "description": "Pagination token for the next page."},
                },
            },
            "GoogleCachedContent": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "name": {"type": "string", "description": "Cached content resource name."},
                    "model": {"type": "string", "description": "Model resource name associated with the cache."},
                    "displayName": {"type": "string", "description": "Human-readable cached content display name."},
                    "contents": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleContent"}, "description": "Cached contents."},
                    "tools": {"type": "array", "items": {"$ref": "#/components/schemas/GoogleTool"}, "description": "Cached tool definitions."},
                    "toolConfig": {"$ref": "#/components/schemas/GoogleToolConfig"},
                    "systemInstruction": {"$ref": "#/components/schemas/GoogleContent"},
                    "usageMetadata": {"$ref": "#/components/schemas/GoogleCachedContentUsageMetadata"},
                    "createTime": {"type": "string", "format": "date-time", "description": "Creation timestamp."},
                    "updateTime": {"type": "string", "format": "date-time", "description": "Update timestamp."},
                    "expireTime": {"type": "string", "format": "date-time", "description": "Expiration timestamp."},
                },
            },
            "GoogleCachedContentUsageMetadata": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "totalTokenCount": {"type": "integer", "description": "Total token count stored in the cache."},
                },
            },
            "GoogleEmptyResponse": {
                "type": "object",
                "additionalProperties": False,
                "description": "Empty JSON object returned by Google APIs for successful delete operations.",
                "required": ["object"],
                "properties": {
                    "object": {
                        "type": "string",
                        "enum": ["empty"],
                        "description": "Object marker for an empty successful Google response.",
                    }
                },
            },
        }

    def _anthropic_provider_schemas(self) -> dict[str, Any]:
        message_request_properties = {
            "model": {"type": "string", "description": "Claude model identifier."},
            "messages": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicMessageParam"}, "description": "Input conversation messages."},
            "max_tokens": {"type": "integer", "minimum": 1, "description": "Maximum number of tokens to generate."},
            "system": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicContentBlockParam"}}], "description": "System prompt content."},
            "metadata": {"$ref": "#/components/schemas/ProviderMetadata"},
            "stop_sequences": {"type": "array", "items": {"type": "string"}, "description": "Custom stop sequences."},
            "stream": {"type": "boolean", "description": "Whether to stream server-sent events."},
            "temperature": {"type": "number", "description": "Sampling temperature."},
            "top_k": {"type": "integer", "description": "Top-k sampling value."},
            "top_p": {"type": "number", "description": "Nucleus sampling value."},
            "tools": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicTool"}, "description": "Tool definitions available to Claude."},
            "tool_choice": {"$ref": "#/components/schemas/AnthropicToolChoice"},
            "thinking": {"$ref": "#/components/schemas/AnthropicThinkingConfig"},
        }
        return {
            "AnthropicMessageCreateRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["model", "messages", "max_tokens"],
                "properties": message_request_properties,
            },
            "AnthropicCountMessageTokensRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["model", "messages"],
                "properties": message_request_properties,
            },
            "AnthropicMessageParam": {
                "type": "object",
                "additionalProperties": True,
                "required": ["role", "content"],
                "properties": {
                    "role": {"type": "string", "enum": ["user", "assistant"], "description": "Message role."},
                    "content": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicContentBlockParam"}}], "description": "Message content."},
                },
            },
            "AnthropicContentBlockParam": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Content block type, such as text, image, document, tool_use, or tool_result."},
                    "text": {"type": "string", "description": "Text content for text blocks."},
                    "source": {"$ref": "#/components/schemas/AnthropicContentSource"},
                    "id": {"type": "string", "description": "Tool use identifier."},
                    "name": {"type": "string", "description": "Tool name."},
                    "input": {"$ref": "#/components/schemas/AnthropicToolInput"},
                    "content": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicContentBlockParam"}}], "description": "Nested tool result content."},
                    "tool_use_id": {"type": "string", "description": "Tool use identifier answered by a tool result."},
                },
            },
            "AnthropicToolInput": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                "description": "JSON input object supplied to or returned from an Anthropic tool use.",
            },
            "AnthropicContentSource": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Source type, such as base64, url, file, or text."},
                    "media_type": {"type": "string", "description": "Media type of the source payload."},
                    "data": {"type": "string", "description": "Base64 or text source payload."},
                    "url": {"type": "string", "description": "URL source."},
                    "file_id": {"type": "string", "description": "Anthropic file identifier."},
                },
            },
            "AnthropicTool": {
                "type": "object",
                "additionalProperties": True,
                "required": ["name", "input_schema"],
                "properties": {
                    "name": {"type": "string", "description": "Tool name."},
                    "description": {"type": "string", "description": "Tool description."},
                    "input_schema": {"$ref": "#/components/schemas/ProviderJsonSchema"},
                },
            },
            "AnthropicToolChoice": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Tool choice type such as auto, any, tool, or none."},
                    "name": {"type": "string", "description": "Tool name when forcing a specific tool."},
                },
            },
            "AnthropicThinkingConfig": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Thinking mode."},
                    "budget_tokens": {"type": "integer", "description": "Thinking token budget."},
                },
            },
            "AnthropicMessage": {
                "type": "object",
                "additionalProperties": True,
                "required": ["id", "type", "role", "content", "model", "stop_reason", "usage"],
                "properties": {
                    "id": {"type": "string", "description": "Anthropic message identifier."},
                    "type": {"type": "string", "enum": ["message"], "description": "Object type, always message."},
                    "role": {"type": "string", "enum": ["assistant"], "description": "Role of the generated message."},
                    "content": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicContentBlock"}, "description": "Generated content blocks."},
                    "model": {"type": "string", "description": "Claude model used for generation."},
                    "stop_reason": {"type": "string", "nullable": True, "description": "Reason generation stopped."},
                    "stop_sequence": {"type": "string", "nullable": True, "description": "Stop sequence that ended generation."},
                    "usage": {"$ref": "#/components/schemas/AnthropicUsage"},
                },
            },
            "AnthropicContentBlock": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Output content block type."},
                    "text": {"type": "string", "description": "Text output."},
                    "id": {"type": "string", "description": "Tool use identifier."},
                    "name": {"type": "string", "description": "Tool name."},
                    "input": {"$ref": "#/components/schemas/AnthropicToolInput"},
                },
            },
            "AnthropicUsage": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "input_tokens": {"type": "integer", "description": "Input token count."},
                    "output_tokens": {"type": "integer", "description": "Output token count."},
                    "cache_creation_input_tokens": {"type": "integer", "description": "Input tokens written to cache."},
                    "cache_read_input_tokens": {"type": "integer", "description": "Input tokens read from cache."},
                },
            },
            "AnthropicCountMessageTokensResponse": {
                "type": "object",
                "additionalProperties": True,
                "required": ["input_tokens"],
                "properties": {
                    "input_tokens": {"type": "integer", "description": "Total input token count."},
                },
            },
            "AnthropicMessageBatchCreateRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["requests"],
                "properties": {
                    "requests": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicMessageBatchRequest"}, "description": "Message requests to execute as a batch."},
                },
            },
            "AnthropicMessageBatchRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["custom_id", "params"],
                "properties": {
                    "custom_id": {"type": "string", "description": "Caller-provided request identifier."},
                    "params": {"$ref": "#/components/schemas/AnthropicMessageCreateRequest"},
                },
            },
            "AnthropicMessageBatchListResponse": {
                "type": "object",
                "additionalProperties": True,
                "required": ["data"],
                "properties": {
                    "data": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicMessageBatch"}, "description": "Message batch objects."},
                    "has_more": {"type": "boolean", "description": "Whether more results are available."},
                    "first_id": {"type": "string", "nullable": True, "description": "First object identifier in the page."},
                    "last_id": {"type": "string", "nullable": True, "description": "Last object identifier in the page."},
                },
            },
            "AnthropicMessageBatch": {
                "type": "object",
                "additionalProperties": True,
                "required": ["id", "type", "processing_status", "request_counts"],
                "properties": {
                    "id": {"type": "string", "description": "Message batch identifier."},
                    "type": {"type": "string", "enum": ["message_batch"], "description": "Object type, always message_batch."},
                    "processing_status": {"type": "string", "description": "Batch processing status."},
                    "request_counts": {"$ref": "#/components/schemas/AnthropicMessageBatchRequestCounts"},
                    "ended_at": {"type": "string", "format": "date-time", "nullable": True, "description": "Time the batch ended."},
                    "created_at": {"type": "string", "format": "date-time", "description": "Time the batch was created."},
                    "expires_at": {"type": "string", "format": "date-time", "description": "Time the batch expires."},
                    "cancel_initiated_at": {"type": "string", "format": "date-time", "nullable": True, "description": "Time cancellation began."},
                    "results_url": {"type": "string", "nullable": True, "description": "URL for batch results when available."},
                },
            },
            "AnthropicMessageBatchRequestCounts": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "processing": {"type": "integer", "description": "Requests still processing."},
                    "succeeded": {"type": "integer", "description": "Requests that succeeded."},
                    "errored": {"type": "integer", "description": "Requests that errored."},
                    "canceled": {"type": "integer", "description": "Requests that were canceled."},
                    "expired": {"type": "integer", "description": "Requests that expired."},
                },
            },
            "AnthropicFileUploadMultipartRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["file"],
                "properties": {
                    "file": {"type": "string", "format": "binary", "description": "File bytes uploaded to Anthropic."},
                },
            },
            "AnthropicFileListResponse": {
                "type": "object",
                "additionalProperties": True,
                "required": ["data"],
                "properties": {
                    "data": {"type": "array", "items": {"$ref": "#/components/schemas/AnthropicFile"}, "description": "Anthropic file objects."},
                    "has_more": {"type": "boolean", "description": "Whether more results are available."},
                    "first_id": {"type": "string", "nullable": True, "description": "First object identifier in the page."},
                    "last_id": {"type": "string", "nullable": True, "description": "Last object identifier in the page."},
                },
            },
            "AnthropicFile": {
                "type": "object",
                "additionalProperties": True,
                "required": ["id", "type", "filename", "mime_type", "size_bytes", "created_at"],
                "properties": {
                    "id": {"type": "string", "description": "Anthropic file identifier."},
                    "type": {"type": "string", "enum": ["file"], "description": "Object type, always file."},
                    "filename": {"type": "string", "description": "Uploaded filename."},
                    "mime_type": {"type": "string", "description": "File MIME type."},
                    "size_bytes": {"type": "integer", "format": "int64", "description": "File size in bytes."},
                    "created_at": {"type": "string", "format": "date-time", "description": "Creation timestamp."},
                    "downloadable": {"type": "boolean", "description": "Whether file content can be downloaded."},
                },
            },
            "AnthropicDeleteResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "id": {"type": "string", "description": "Deleted object identifier."},
                    "type": {"type": "string", "description": "Deleted object type."},
                    "deleted": {"type": "boolean", "description": "Whether the object was deleted."},
                },
            },
        }

    def _media_provider_schemas(self) -> dict[str, Any]:
        image_task_properties = {
            "task_id": {"type": "string", "description": "Provider image generation task identifier."},
            "id": {"type": "string", "description": "Provider task or image identifier."},
            "status": {"type": "string", "description": "Task status."},
            "state": {"type": "string", "description": "Provider task state."},
            "model": {"type": "string", "description": "Model used for generation."},
            "prompt": {"type": "string", "description": "Prompt used for generation."},
            "images": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderGeneratedMedia"}, "description": "Generated image assets."},
            "error": {"$ref": "#/components/schemas/ProviderTaskError"},
            "created_at": {"type": "string", "description": "Task creation timestamp."},
            "updated_at": {"type": "string", "description": "Task update timestamp."},
        }
        video_task_properties = {
            "task_id": {"type": "string", "description": "Provider video generation task identifier."},
            "id": {"type": "string", "description": "Provider task or video identifier."},
            "status": {"type": "string", "description": "Task status."},
            "state": {"type": "string", "description": "Provider task state."},
            "model": {"type": "string", "description": "Model used for generation."},
            "prompt": {"type": "string", "description": "Prompt used for generation."},
            "videos": {"type": "array", "items": {"$ref": "#/components/schemas/ProviderGeneratedMedia"}, "description": "Generated video assets."},
            "error": {"$ref": "#/components/schemas/ProviderTaskError"},
            "created_at": {"type": "string", "description": "Task creation timestamp."},
            "updated_at": {"type": "string", "description": "Task update timestamp."},
        }
        return {
            "ProviderGeneratedMedia": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "id": {"type": "string", "description": "Generated asset identifier."},
                    "url": {"type": "string", "description": "Generated asset URL."},
                    "uri": {"type": "string", "description": "Provider asset URI."},
                    "mime_type": {"type": "string", "description": "Asset MIME type."},
                    "width": {"type": "integer", "description": "Asset width in pixels."},
                    "height": {"type": "integer", "description": "Asset height in pixels."},
                    "duration": {"type": "number", "description": "Asset duration in seconds for audio or video."},
                    "metadata": {"$ref": "#/components/schemas/ProviderGeneratedMediaMetadata"},
                },
            },
            "ProviderTaskError": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "code": {"type": "string", "description": "Provider error code."},
                    "message": {"type": "string", "description": "Provider error message."},
                    "type": {"type": "string", "description": "Provider error type."},
                },
            },
            "VolcengineContentGenerationTaskCreateRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["model", "content"],
                "properties": {
                    "model": {"type": "string", "description": "Volcengine Ark content generation model identifier."},
                    "content": {"type": "array", "items": {"$ref": "#/components/schemas/VolcengineContentPart"}, "description": "Input content parts for image, video, or multimodal generation."},
                    "callback_url": {"type": "string", "description": "Optional callback URL."},
                    "metadata": {"$ref": "#/components/schemas/ProviderMetadata"},
                },
            },
            "VolcengineContentPart": {
                "type": "object",
                "additionalProperties": True,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "description": "Content part type."},
                    "text": {"type": "string", "description": "Text prompt content."},
                    "image_url": {"type": "string", "description": "Input image URL."},
                    "video_url": {"type": "string", "description": "Input video URL."},
                    "file_id": {"type": "string", "description": "Provider file identifier."},
                },
            },
            "VolcengineContentGenerationTaskCreateResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "id": {"type": "string", "description": "Created task identifier."},
                    "task_id": {"type": "string", "description": "Created task identifier."},
                    "status": {"type": "string", "description": "Task status."},
                    "created_at": {"type": "string", "description": "Task creation timestamp."},
                },
            },
            "VolcengineContentGenerationTask": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    **video_task_properties,
                    "content": {"type": "array", "items": {"$ref": "#/components/schemas/VolcengineContentPart"}, "description": "Input or output content parts associated with the task."},
                    "result": {"$ref": "#/components/schemas/ProviderTaskResult"},
                },
            },
            "SunoMusicGenerationRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string", "description": "Lyrics or text prompt for music generation."},
                    "model": {"type": "string", "description": "Suno-compatible model identifier."},
                    "title": {"type": "string", "description": "Requested song title."},
                    "tags": {"type": "string", "description": "Musical style tags."},
                    "negative_tags": {"type": "string", "description": "Musical styles to avoid."},
                    "duration": {"type": "number", "description": "Requested duration in seconds."},
                    "callback_url": {"type": "string", "description": "Optional callback URL."},
                },
            },
            "SunoMusicGenerationResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "task_id": {"type": "string", "description": "Suno task identifier."},
                    "id": {"type": "string", "description": "Suno task identifier."},
                    "status": {"type": "string", "description": "Task status."},
                    "created_at": {"type": "string", "description": "Task creation timestamp."},
                },
            },
            "SunoMusicGenerationTaskResponse": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "task_id": {"type": "string", "description": "Suno task identifier."},
                    "id": {"type": "string", "description": "Suno task identifier."},
                    "status": {"type": "string", "description": "Task status."},
                    "title": {"type": "string", "description": "Generated song title."},
                    "tracks": {"type": "array", "items": {"$ref": "#/components/schemas/SunoMusicTrack"}, "description": "Generated music tracks."},
                    "error": {"$ref": "#/components/schemas/ProviderTaskError"},
                    "created_at": {"type": "string", "description": "Task creation timestamp."},
                    "updated_at": {"type": "string", "description": "Task update timestamp."},
                },
            },
            "SunoMusicTrack": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "id": {"type": "string", "description": "Track identifier."},
                    "title": {"type": "string", "description": "Track title."},
                    "audio_url": {"type": "string", "description": "Generated audio URL."},
                    "video_url": {"type": "string", "description": "Generated video URL when supplied."},
                    "image_url": {"type": "string", "description": "Cover image URL."},
                    "duration": {"type": "number", "description": "Track duration in seconds."},
                    "lyrics": {"type": "string", "description": "Generated lyrics."},
                },
            },
            "MidjourneyImageGenerationRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string", "description": "Image prompt sent to the Midjourney-compatible provider."},
                    "model": {"type": "string", "description": "Model or mode identifier."},
                    "aspect_ratio": {"type": "string", "description": "Requested aspect ratio."},
                    "style": {"type": "string", "description": "Style option."},
                    "seed": {"type": "integer", "format": "int64", "description": "Optional deterministic seed."},
                    "callback_url": {"type": "string", "description": "Optional callback URL."},
                },
            },
            "MidjourneyImageGenerationTask": {
                "type": "object",
                "additionalProperties": True,
                "properties": image_task_properties,
            },
            "KlingVideoGenerationRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string", "description": "Video prompt sent to the Kling-compatible provider."},
                    "model": {"type": "string", "description": "Kling model identifier."},
                    "image": {"type": "string", "description": "Optional source image URL or asset reference."},
                    "image_tail": {"type": "string", "description": "Optional ending image URL or asset reference."},
                    "negative_prompt": {"type": "string", "description": "Negative prompt."},
                    "cfg_scale": {"type": "number", "description": "Prompt guidance scale."},
                    "mode": {"type": "string", "description": "Generation mode."},
                    "duration": {"type": "integer", "description": "Requested video duration in seconds."},
                    "aspect_ratio": {"type": "string", "description": "Requested aspect ratio."},
                    "callback_url": {"type": "string", "description": "Optional callback URL."},
                },
            },
            "KlingVideoGenerationTask": {
                "type": "object",
                "additionalProperties": True,
                "properties": video_task_properties,
            },
            "NanoBananaImageGenerationRequest": {
                "type": "object",
                "additionalProperties": True,
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string", "description": "Image prompt sent to the Nano Banana compatible provider."},
                    "model": {"type": "string", "description": "Image model identifier."},
                    "images": {"type": "array", "items": {"type": "string"}, "description": "Optional reference image URLs or file identifiers."},
                    "size": {"type": "string", "description": "Requested image size."},
                    "aspect_ratio": {"type": "string", "description": "Requested aspect ratio."},
                    "seed": {"type": "integer", "format": "int64", "description": "Optional deterministic seed."},
                    "callback_url": {"type": "string", "description": "Optional callback URL."},
                },
            },
            "NanoBananaImageGenerationTask": {
                "type": "object",
                "additionalProperties": True,
                "properties": image_task_properties,
            },
        }

    def _vidu_video_request_properties(self) -> dict[str, Any]:
        return {
            "model": {"type": "string", "description": "Vidu model name accepted by the upstream account."},
            "prompt": {"type": "string", "description": "Text prompt sent to the Vidu API."},
            "duration": {"type": "integer", "description": "Requested video duration in seconds when supported by the selected Vidu model."},
            "aspect_ratio": {"type": "string", "description": "Requested output aspect ratio."},
            "resolution": {"type": "string", "description": "Requested output resolution when supported."},
            "movement_amplitude": {"type": "string", "description": "Vidu movement amplitude option when supported."},
            "seed": {"type": "integer", "format": "int64", "description": "Optional deterministic seed."},
            "callback_url": {"type": "string", "description": "Optional callback URL sent to Vidu."},
            "payload": {"type": "string", "description": "Optional provider callback payload sent to Vidu."},
        }

    def _vidu_image_request_properties(self) -> dict[str, Any]:
        return {
            "model": {"type": "string", "description": "Vidu image model name accepted by the upstream account."},
            "prompt": {"type": "string", "description": "Text prompt sent to the Vidu API."},
            "style": {"type": "string", "description": "Provider-specific image style option when supported."},
            "aspect_ratio": {"type": "string", "description": "Requested output aspect ratio."},
            "seed": {"type": "integer", "format": "int64", "description": "Optional deterministic seed."},
            "callback_url": {"type": "string", "description": "Optional callback URL sent to Vidu."},
            "payload": {"type": "string", "description": "Optional provider callback payload sent to Vidu."},
        }

    def _vidu_task_properties(self, object_name: str) -> dict[str, Any]:
        return {
            "task_id": {"type": "string", "description": f"Vidu {object_name} task identifier."},
            "state": {"type": "string", "description": "Vidu task state."},
            "model": {"type": "string", "description": "Vidu model used by the task."},
            "created_at": {"type": "string", "description": "Task creation timestamp."},
            "creations": {"type": "array", "items": {"$ref": "#/components/schemas/ViduCreation"}, "description": "Generated media records when included by Vidu."},
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Claw Router gateway OpenAPI spec.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--output", type=Path, default=None, help="Gateway OpenAPI output path")
    parser.add_argument("--check", action="store_true", help="validate generated gateway OpenAPI spec is current")
    args = parser.parse_args()

    generator = ClawRouterGatewayOpenApiGenerator(root=args.root, output_path=args.output)
    if args.check:
        result = generator.check()
        if result.ok:
            print("Claw Router gateway OpenAPI spec is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = generator.write()
    print(f"Wrote Claw Router gateway OpenAPI spec to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
