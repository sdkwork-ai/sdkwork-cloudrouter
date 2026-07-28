from __future__ import annotations

# clawrouter-openapi-strong-types-marker
import argparse
import copy
import json
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class ClawRouterOpenApiCheckResult:
    ok: bool
    messages: list[str]


class ClawRouterOpenApiGenerator:
    """Generate app/backend OpenAPI specs from the ClawRouter API contract manifest."""

    SURFACES = ("app", "backend")
    OUTPUTS = {
        "app": "clawrouter-app-openapi.json",
        "backend": "clawrouter-backend-openapi.json",
    }
    API_AUTHORITY_OUTPUTS = {
        "app": Path("apis/app-api/clawrouter/clawrouter-app-api.openapi.json"),
        "backend": Path("apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json"),
    }
    MODELS_CATALOG_OUTPUTS = {
        "app": "clawrouter-models-catalog-app-openapi.json",
        "backend": "clawrouter-models-catalog-backend-openapi.json",
    }
    BACKEND_CONTRACT_OVERRIDES = Path(
        "apis/backend-api/clawrouter/clawrouter-backend-contract-overrides.json"
    )
    MODELS_CATALOG_SOURCE_MARKERS = (
        "../sdkwork-models/",
        "sdkwork-models-pc-admin-catalog",
        "sdkwork-models-pc-admin-resource",
    )
    MODELS_CATALOG_APP_PATHS = {
        "/app/v3/api/ai/models",
        "/app/v3/api/ai/model_vendors",
        "/app/v3/api/ai/model_rankings",
    }
    MODELS_CATALOG_BACKEND_PATH_PREFIXES = (
        "/backend/v3/api/ai/model_vendors",
        "/backend/v3/api/ai/models",
        "/backend/v3/api/ai/model_mappings",
        "/backend/v3/api/ai/model_rankings",
        "/backend/v3/api/ai/resources",
        "/backend/v3/api/ai/resource_groups",
    )
    DEPENDENCY_PATH_PREFIXES = {
        "app": (
            "/app/v3/api/accounts",
            "/app/v3/api/addresses",
            "/app/v3/api/after_sales",
            "/app/v3/api/ai/model_rankings",
            "/app/v3/api/ai/model_vendors",
            "/app/v3/api/ai/models",
            "/app/v3/api/billing",
            "/app/v3/api/cart",
            "/app/v3/api/catalog",
            "/app/v3/api/checkout",
            "/app/v3/api/fulfillments",
            "/app/v3/api/memberships",
            "/app/v3/api/orders",
            "/app/v3/api/payments",
            "/app/v3/api/promotions",
            "/app/v3/api/recharges",
            "/app/v3/api/refunds",
            "/app/v3/api/shipments",
            "/app/v3/api/wallet",
            "/app/v3/api/withdrawals",
        ),
        "backend": (
            "/backend/v3/api/ai/model_mappings",
            "/backend/v3/api/ai/model_rankings",
            "/backend/v3/api/ai/model_vendors",
            "/backend/v3/api/ai/models",
            "/backend/v3/api/ai/resource_groups",
            "/backend/v3/api/ai/resources",
        ),
    }
    TITLES = {
        "app": "SDKWork Claw Router App API",
        "backend": "SDKWork Claw Router Backend API",
    }
    SERVERS = {
        "app": "http://localhost:18082",
        "backend": "http://localhost:18081",
    }
    DEFAULT_PREFIXES = {
        "app": "/app/v3/api",
        "backend": "/backend/v3/api",
    }
    DEFAULT_CLIENTS = {
        "app": "SdkworkAppClient",
        "backend": "SdkworkBackendClient",
    }
    PUBLIC_IAM_OPERATION_IDS = {
        "oauth.authorizationUrls.create",
        "oauth.sessions.create",
        "passwordResetRequests.create",
        "passwordResets.create",
        "registrations.create",
        "iam.runtime.retrieve",
        "iam.verificationPolicy.retrieve",
        "sessions.create",
        "verificationCodes.create",
        "verificationCodes.verify",
    }
    REFRESH_TOKEN_OPERATION_IDS = {"sessions.refresh"}
    PUBLIC_MODELS_APP_CATALOG_OPERATION_IDS = {
        "models.list",
        "modelVendors.list",
        "modelRankings.list",
    }
    PUBLIC_APP_CATALOG_OPERATION_IDS = PUBLIC_MODELS_APP_CATALOG_OPERATION_IDS | {
        "memberships.plans.list",
        "memberships.benefits.list",
        "memberships.packages.list",
        "memberships.packages.retrieve",
        "memberships.packageGroups.list",
        "memberships.packageGroups.retrieve",
        "memberships.packageGroups.packages.list",
        "site.runtime.retrieve",
    }
    PUBLIC_PROJECT_LEGACY_RECORD_COMPONENTS = {
        "PlusAgentSkillPackageRecord",
        "PlusAgentSkillRecord",
        "PlusCategoryRecord",
    }
    DEFAULT_QUERY_PARAMETERS = [
        {"name": "page", "in": "query", "required": False, "schema": {"type": "integer", "format": "int32"}},
        {"name": "page_size", "in": "query", "required": False, "schema": {"type": "integer", "format": "int32"}},
        {"name": "q", "in": "query", "required": False, "schema": {"type": "string"}},
        {"name": "status", "in": "query", "required": False, "schema": {"type": "string"}},
        {"name": "start_time", "in": "query", "required": False, "schema": {"type": "string", "format": "date-time"}},
        {"name": "end_time", "in": "query", "required": False, "schema": {"type": "string", "format": "date-time"}},
    ]

    def __init__(
        self,
        root: Path,
        manifest_path: Path | None = None,
        output_dir: Path | None = None,
        schema_components_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self.root / "generated" / "api" / "api-contract-manifest.json"
        )
        self.output_dir = Path(output_dir).resolve() if output_dir is not None else self.root / "generated" / "openapi"
        self.schema_components_path = (
            Path(schema_components_path).resolve()
            if schema_components_path is not None
            else self.root / "generated" / "openapi" / "schema-components.yaml"
        )
        self._response_entities_cache: dict[str, Any] | None = None

    def generate(self, surface: str) -> dict[str, Any]:
        if surface not in self.SURFACES:
            raise ValueError(f"unsupported OpenAPI surface: {surface}")
        manifest = self._load_manifest()
        boundary = self._boundary(manifest, surface)
        operations = [
            operation
            for operation in manifest.get("operations", [])
            if (
                isinstance(operation, dict)
                and operation.get("api_surface") == surface
                and operation.get("openapi_exposed", True) is not False
            )
        ]
        operations.sort(key=lambda item: (self._string(item.get("api_path")), self._string(item.get("api_method")), self._string(item.get("operation"))))
        operation_ids = self._operation_ids(operations)
        schema_components = self._schema_component_schemas()

        paths: dict[str, Any] = {}
        for operation in operations:
            api_path = self._string(operation.get("api_path"))
            method = self._string(operation.get("api_method")).lower()
            if not api_path or not method:
                continue
            paths.setdefault(api_path, {})[method] = self._operation_spec(
                operation,
                operation_ids[id(operation)],
                schema_components,
                surface=surface,
            )

        components = self._components(operations, operation_ids, schema_components)
        self._normalize_component_schemas(components)

        spec = {
            "openapi": "3.1.2",
            "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
            "info": {
                "title": self.TITLES[surface],
                "version": self._version(manifest),
                "description": f"Generated from generated/api/api-contract-manifest.json for {boundary['sdk_client']}.",
            },
            "servers": [{"url": self.SERVERS[surface], "description": f"Local {surface} API server"}],
            "security": [{"AuthToken": [], "AccessToken": []}],
            "tags": self._tags(operations),
            "x-sdk-client": boundary["sdk_client"],
            "x-sdk-family": boundary.get("sdk_family", surface),
            "x-api-prefix": boundary["api_prefix"],
            "paths": paths,
            "components": components,
        }
        spec = self._merge_models_catalog_surface_spec(spec, surface)
        spec = self._exclude_dependency_operations(spec, surface)
        spec = self._apply_contract_overrides(spec, surface)
        return self._align_envelope_document(spec)

    def _apply_contract_overrides(
        self,
        payload: dict[str, Any],
        surface: str,
    ) -> dict[str, Any]:
        if surface != "backend":
            return payload
        override_path = self.root / self.BACKEND_CONTRACT_OVERRIDES
        if not override_path.is_file():
            return payload
        overrides = json.loads(override_path.read_text(encoding="utf-8"))
        if overrides.get("kind") != "sdkwork.openapi.contract-overrides":
            raise ValueError(f"invalid backend contract override kind: {override_path}")
        if overrides.get("owner") != "sdkwork-clawrouter" or overrides.get("surface") != "backend-api":
            raise ValueError(f"invalid backend contract override ownership: {override_path}")

        result = copy.deepcopy(payload)
        components = result.setdefault("components", {})
        schemas = components.setdefault("schemas", {})
        override_schemas = overrides.get("schemas")
        if not isinstance(override_schemas, dict):
            raise ValueError(f"backend contract override schemas must be an object: {override_path}")
        for schema_name, schema in override_schemas.items():
            if isinstance(schema_name, str) and isinstance(schema, dict):
                schemas.setdefault(schema_name, copy.deepcopy(schema))

        operation_overrides = overrides.get("operations")
        if not isinstance(operation_overrides, dict):
            raise ValueError(f"backend contract override operations must be an object: {override_path}")
        for operation_key, contract in operation_overrides.items():
            if not isinstance(operation_key, str) or not isinstance(contract, dict):
                raise ValueError(f"invalid backend operation override in {override_path}")
            try:
                method, api_path = operation_key.split(" ", 1)
            except ValueError as exc:
                raise ValueError(f"invalid backend operation override key: {operation_key}") from exc
            operation = (result.get("paths") or {}).get(api_path, {}).get(method.lower())
            if not isinstance(operation, dict):
                raise ValueError(
                    f"stale backend contract override operation is not exposed: {operation_key}"
                )

            request_schema = contract.get("requestSchema")
            if isinstance(request_schema, str):
                if request_schema not in schemas:
                    raise ValueError(f"backend request override schema is missing: {request_schema}")
                operation["requestBody"] = {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{request_schema}"},
                        }
                    },
                }

            response_schema = contract.get("responseSchema")
            if isinstance(response_schema, str):
                if response_schema not in schemas:
                    raise ValueError(f"backend response override schema is missing: {response_schema}")
                self._apply_response_data_schema_override(
                    operation=operation,
                    schemas=schemas,
                    response_schema=response_schema,
                )

        self._prune_unreachable_component_schemas(result.get("paths") or {}, components)
        return result

    def _apply_response_data_schema_override(
        self,
        *,
        operation: dict[str, Any],
        schemas: dict[str, Any],
        response_schema: str,
    ) -> None:
        responses = operation.get("responses")
        if not isinstance(responses, dict):
            raise ValueError(f"operation has no responses for {response_schema}")
        for status, response in responses.items():
            if not str(status).startswith("2") or not isinstance(response, dict):
                continue
            response_document = (((response.get("content") or {}).get("application/json") or {}).get("schema"))
            if not isinstance(response_document, dict):
                continue
            result_schema = self._local_schema_ref_name(response_document.get("$ref"))
            if result_schema is None or not isinstance(schemas.get(result_schema), dict):
                raise ValueError(f"operation response wrapper is missing for {response_schema}")
            wrapper = schemas[result_schema]
            for branch in wrapper.get("allOf", []):
                if not isinstance(branch, dict):
                    continue
                properties = branch.get("properties")
                if not isinstance(properties, dict) or "data" not in properties:
                    continue
                properties["data"] = {
                    "allOf": [{"$ref": f"#/components/schemas/{response_schema}"}],
                    "description": f"Typed {response_schema} response data.",
                }
                return
        raise ValueError(f"operation success response data is missing for {response_schema}")

    def _local_schema_ref_name(self, value: Any) -> str | None:
        prefix = "#/components/schemas/"
        return value[len(prefix):] if isinstance(value, str) and value.startswith(prefix) else None

    def _exclude_dependency_operations(self, payload: dict[str, Any], surface: str) -> dict[str, Any]:
        if not self._has_declared_sdk_dependencies(surface):
            return payload
        filtered = copy.deepcopy(payload)
        paths = filtered.get("paths")
        if not isinstance(paths, dict):
            return filtered
        dependency_operations = self._dependency_operation_keys(surface)
        prefixes = self.DEPENDENCY_PATH_PREFIXES[surface]
        for api_path in list(paths):
            path_item = paths.get(api_path)
            if not isinstance(path_item, dict):
                continue
            for method in list(path_item):
                if (api_path, method.lower()) in dependency_operations:
                    del path_item[method]
            if not any(
                method.lower() in {"get", "post", "put", "patch", "delete"}
                for method in path_item
            ) or any(api_path == prefix or api_path.startswith(f"{prefix}/") for prefix in prefixes):
                del paths[api_path]
        components = filtered.get("components")
        if isinstance(components, dict):
            self._prune_unreachable_component_schemas(paths, components)
        return filtered

    def _dependency_operation_keys(self, surface: str) -> set[tuple[str, str]]:
        manifest = self._surface_sdk_manifest(surface)
        dependencies = manifest.get("sdkDependencies")
        if not isinstance(dependencies, list):
            return set()

        operations: set[tuple[str, str]] = set()
        suffix = f"-{surface}-sdk"
        for dependency in dependencies:
            if not isinstance(dependency, dict) or dependency.get("dependencyMode") != "consumer-sdk":
                continue
            workspace = self._string(dependency.get("workspace"))
            if not workspace.endswith(suffix):
                continue
            owner_workspace = workspace[: -len(suffix)]
            family_root = self.root.parent / owner_workspace / "sdks" / workspace
            dependency_manifest_path = family_root / "sdk-manifest.json"
            if not dependency_manifest_path.is_file():
                continue
            dependency_manifest = json.loads(
                dependency_manifest_path.read_text(encoding="utf-8")
            )
            authority_spec = self._string(dependency_manifest.get("authoritySpec"))
            generation_input = self._string(dependency_manifest.get("generationInputSpec"))
            spec_path = family_root / (authority_spec or generation_input)
            if not spec_path.is_file():
                continue
            spec = self._load_openapi_document(spec_path)
            for api_path, path_item in (spec.get("paths") or {}).items():
                if not isinstance(api_path, str) or not isinstance(path_item, dict):
                    continue
                for method, operation in path_item.items():
                    if method.lower() in {"get", "post", "put", "patch", "delete"} and isinstance(
                        operation, dict
                    ):
                        operations.add((api_path, method.lower()))
        return operations

    def _surface_sdk_manifest(self, surface: str) -> dict[str, Any]:
        family = f"clawrouter-{surface}-sdk"
        manifest_path = self.root / "sdks" / family / "sdk-manifest.json"
        if not manifest_path.is_file():
            return {}
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}

    def _load_openapi_document(self, path: Path) -> dict[str, Any]:
        content = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".json":
            payload = json.loads(content)
        else:
            if yaml is None:
                raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR
            payload = yaml.safe_load(content) or {}
        if not isinstance(payload, dict):
            raise ValueError(f"OpenAPI authority must be an object: {path}")
        return payload

    def _has_declared_sdk_dependencies(self, surface: str) -> bool:
        manifest = self._surface_sdk_manifest(surface)
        dependencies = manifest.get("sdkDependencies")
        return isinstance(dependencies, list) and any(
            isinstance(dependency, dict)
            and dependency.get("dependencyMode") == "consumer-sdk"
            for dependency in dependencies
        )

    def _envelope_align_script_path(self) -> Path:
        return self.root.parent / "sdkwork-specs" / "tools" / "align-openapi-response-envelope.mjs"

    def _align_envelope_document(self, spec: dict[str, Any]) -> dict[str, Any]:
        script = self._envelope_align_script_path()
        if not script.exists():
            return spec
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
            temp_path = Path(handle.name)
            handle.write(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True))
            handle.write("\n")
        try:
            for legacy_envelope in ("CommerceApiResult", "PlusApiResult"):
                subprocess.run(
                    [
                        "node",
                        str(script),
                        "--file",
                        str(temp_path),
                        "--legacy-envelope",
                        legacy_envelope,
                    ],
                    check=True,
                    cwd=self.root,
                    capture_output=True,
                    text=True,
                )
            aligned = json.loads(temp_path.read_text(encoding="utf-8"))
            if not isinstance(aligned, dict):
                raise ValueError("aligned OpenAPI document must be an object")
            return aligned
        finally:
            temp_path.unlink(missing_ok=True)

    def _strip_standard_extensions(self, spec: dict[str, Any]) -> dict[str, Any]:
        normalized = copy.deepcopy(spec)
        info = normalized.get("info")
        if isinstance(info, dict):
            for key in list(info.keys()):
                if str(key).startswith("x-sdkwork-"):
                    del info[key]
        paths = normalized.get("paths")
        if isinstance(paths, dict):
            for path_item in paths.values():
                if not isinstance(path_item, dict):
                    continue
                for method, operation in list(path_item.items()):
                    if method.startswith("x-") or not isinstance(operation, dict):
                        continue
                    for key in list(operation.keys()):
                        if str(key).startswith("x-sdkwork-"):
                            del operation[key]
        return normalized

    def _normalized_openapi_text(self, surface: str, *, from_disk: bool) -> str:
        if from_disk:
            output = self.output_path(surface)
            payload = json.loads(output.read_text(encoding="utf-8"))
        else:
            payload = self.generate(surface)
            payload = self._align_envelope_document(payload)
        normalized = self._strip_standard_extensions(payload)
        return json.dumps(normalized, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def _merge_models_catalog_surface_spec(self, spec: dict[str, Any], surface: str) -> dict[str, Any]:
        catalog = self.generate_models_catalog(surface)
        merged = copy.deepcopy(spec)
        merged_paths = dict(merged.get("paths", {}))
        for api_path, methods in catalog.get("paths", {}).items():
            merged_paths.setdefault(api_path, {}).update(methods)
        merged["paths"] = merged_paths

        merged_components = copy.deepcopy(merged.get("components", {}))
        catalog_components = catalog.get("components", {})
        for section, values in catalog_components.items():
            if not isinstance(values, dict):
                continue
            merged_components.setdefault(section, {})
            merged_components[section].update(values)
        merged["components"] = merged_components

        merged_tags = list(merged.get("tags", []))
        seen = {self._string(tag.get("name")) for tag in merged_tags if isinstance(tag, dict)}
        for tag in catalog.get("tags", []):
            if not isinstance(tag, dict):
                continue
            name = self._string(tag.get("name"))
            if name and name not in seen:
                merged_tags.append(tag)
                seen.add(name)
        merged["tags"] = merged_tags
        return merged

    def render_json(self, surface: str) -> str:
        return json.dumps(self.generate(surface), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def _is_models_catalog_operation(self, operation: dict[str, Any], surface: str) -> bool:
        source = self._string(operation.get("source")).replace("\\", "/")
        api_path = self._string(operation.get("api_path"))
        if any(marker in source for marker in self.MODELS_CATALOG_SOURCE_MARKERS):
            return True
        if surface == "app" and api_path in self.MODELS_CATALOG_APP_PATHS:
            return True
        if surface == "backend" and any(
            api_path == prefix or api_path.startswith(f"{prefix}/")
            for prefix in self.MODELS_CATALOG_BACKEND_PATH_PREFIXES
        ):
            return True
        return False

    def _models_catalog_operation_rank(self, operation: dict[str, Any]) -> int:
        source = self._string(operation.get("source")).replace("\\", "/")
        score = 0
        if self._payload_schema(operation.get("response_schema")) is not None:
            score += 10_000
        if any(marker in source for marker in self.MODELS_CATALOG_SOURCE_MARKERS):
            score += 1_000
        declared = operation.get("query_parameters")
        if isinstance(declared, list):
            score += len(declared)
        if operation.get("query_parameters_declared") is True:
            score += 1
        return score

    def _dedupe_models_catalog_operations(self, operations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        selected: dict[tuple[str, str], dict[str, Any]] = {}
        for operation in operations:
            api_path = self._string(operation.get("api_path"))
            method = self._string(operation.get("api_method")).upper()
            if not api_path or not method:
                continue
            key = (api_path, method)
            current = selected.get(key)
            if current is None:
                selected[key] = operation
                continue
            if self._models_catalog_operation_rank(operation) > self._models_catalog_operation_rank(
                current
            ):
                selected[key] = operation
        return list(selected.values())

    def generate_models_catalog(self, surface: str) -> dict[str, Any]:
        if surface not in self.SURFACES:
            raise ValueError(f"unsupported OpenAPI surface: {surface}")
        manifest = self._load_manifest()
        boundary = self._boundary(manifest, surface)
        operations = self._dedupe_models_catalog_operations(
            [
                operation
                for operation in manifest.get("operations", [])
                if isinstance(operation, dict)
                and operation.get("api_surface") == surface
                and operation.get("openapi_exposed", True) is not False
                and self._is_models_catalog_operation(operation, surface)
            ]
        )
        operations.sort(
            key=lambda item: (
                self._string(item.get("api_path")),
                self._string(item.get("api_method")),
                self._string(item.get("operation")),
            )
        )
        operation_ids = self._operation_ids(operations)
        schema_components = self._schema_component_schemas()

        paths: dict[str, Any] = {}
        for operation in operations:
            api_path = self._string(operation.get("api_path"))
            method = self._string(operation.get("api_method")).lower()
            if not api_path or not method:
                continue
            operation_spec = self._operation_spec(
                operation,
                operation_ids[id(operation)],
                schema_components,
                surface=surface,
            )
            operation_spec["x-sdkwork-owner"] = "sdkwork-models"
            operation_spec["x-sdkwork-api-authority"] = (
                "sdkwork-models-app-api" if surface == "app" else "sdkwork-models-backend-api"
            )
            operation_spec["x-sdkwork-source-route-crate"] = (
                "sdkwork-routes-models-catalog-app-api" if surface == "app" else "sdkwork-routes-models-catalog-backend-api"
            )
            paths.setdefault(api_path, {})[method] = operation_spec

        components = self._components(operations, operation_ids, schema_components)
        self._normalize_component_schemas(components)

        return {
            "openapi": "3.1.2",
            "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
            "info": {
                "title": (
                    "SDKWork Models App API"
                    if surface == "app"
                    else "SDKWork Models Backend API"
                ),
                "version": self._version(manifest),
                "description": (
                    "Composed intelligence catalog mount surface extracted from "
                    "generated/api/api-contract-manifest.json for sdkwork-models authority."
                ),
            },
            "servers": [{"url": self.SERVERS[surface], "description": f"Local {surface} API server"}],
            "security": [{"AuthToken": [], "AccessToken": []}],
            "tags": self._tags(operations),
            "x-sdk-client": boundary["sdk_client"],
            "x-sdk-family": (
                "sdkwork-models-app-sdk" if surface == "app" else "sdkwork-models-backend-sdk"
            ),
            "x-api-prefix": boundary["api_prefix"],
            "paths": paths,
            "components": components,
        }

    def render_models_catalog_json(self, surface: str) -> str:
        payload = self.generate_models_catalog(surface)
        payload = self._align_envelope_document(payload)
        return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self) -> dict[str, Path]:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        outputs: dict[str, Path] = {}
        for surface in self.SURFACES:
            output = self.output_path(surface)
            rendered = self.render_json(surface)
            output.write_text(rendered, encoding="utf-8", newline="\n")
            outputs[surface] = output
            api_authority_output = self.api_authority_output_path(surface)
            api_authority_output.parent.mkdir(parents=True, exist_ok=True)
            api_authority_output.write_text(rendered, encoding="utf-8", newline="\n")
            outputs[f"api-authority-{surface}"] = api_authority_output
            models_catalog_output = self.models_catalog_output_path(surface)
            models_catalog_output.write_text(
                self.render_models_catalog_json(surface),
                encoding="utf-8",
                newline="\n",
            )
            outputs[f"models-catalog-{surface}"] = models_catalog_output
        return outputs

    def check(self) -> ClawRouterOpenApiCheckResult:
        messages: list[str] = []
        try:
            for surface in self.SURFACES:
                output = self.output_path(surface)
                expected = self._normalized_openapi_text(surface, from_disk=False)
                if not output.exists():
                    messages.append(f"clawrouter {surface} OpenAPI spec is missing: {output}")
                    continue
                actual = self._normalized_openapi_text(surface, from_disk=True)
                if actual != expected:
                    messages.append(f"clawrouter {surface} OpenAPI spec is stale: {output}")
                api_authority_output = self.api_authority_output_path(surface)
                api_authority_expected = self._normalized_openapi_text(surface, from_disk=False)
                if not api_authority_output.exists():
                    messages.append(f"clawrouter {surface} API authority OpenAPI spec is missing: {api_authority_output}")
                    continue
                api_authority_payload = json.loads(api_authority_output.read_text(encoding="utf-8"))
                api_authority_actual = json.dumps(
                    self._strip_standard_extensions(api_authority_payload),
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=True,
                ) + "\n"
                if api_authority_actual != api_authority_expected:
                    messages.append(
                        f"clawrouter {surface} API authority OpenAPI spec is stale: {api_authority_output}"
                    )
                models_catalog_output = self.models_catalog_output_path(surface)
                models_catalog_expected = self.render_models_catalog_json(surface)
                if not models_catalog_output.exists():
                    messages.append(
                        f"clawrouter models catalog {surface} OpenAPI spec is missing: {models_catalog_output}"
                    )
                    continue
                models_catalog_actual = models_catalog_output.read_text(encoding="utf-8")
                if models_catalog_actual != models_catalog_expected:
                    messages.append(
                        f"clawrouter models catalog {surface} OpenAPI spec is stale: {models_catalog_output}"
                    )
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            messages.append(str(exc))
        return ClawRouterOpenApiCheckResult(ok=not messages, messages=messages)

    def output_path(self, surface: str) -> Path:
        if surface not in self.OUTPUTS:
            raise ValueError(f"unsupported OpenAPI surface: {surface}")
        return self.output_dir / self.OUTPUTS[surface]

    def api_authority_output_path(self, surface: str) -> Path:
        if surface not in self.API_AUTHORITY_OUTPUTS:
            raise ValueError(f"unsupported OpenAPI surface: {surface}")
        return self.root / self.API_AUTHORITY_OUTPUTS[surface]

    def models_catalog_output_path(self, surface: str) -> Path:
        if surface not in self.MODELS_CATALOG_OUTPUTS:
            raise ValueError(f"unsupported OpenAPI surface: {surface}")
        return self.output_dir / self.MODELS_CATALOG_OUTPUTS[surface]

    def _prune_unreachable_component_schemas(self, paths: dict[str, Any], components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        reachable = self._collect_component_schema_refs(paths)
        queue = list(reachable)
        while queue:
            schema_name = queue.pop()
            schema = schemas.get(schema_name)
            if not isinstance(schema, (dict, list)):
                continue
            for nested_ref in self._collect_component_schema_refs(schema):
                if nested_ref in reachable:
                    continue
                reachable.add(nested_ref)
                queue.append(nested_ref)

        for schema_name in list(schemas.keys()):
            if schema_name not in reachable:
                del schemas[schema_name]

    def _collect_component_schema_refs(self, value: Any) -> set[str]:
        refs: set[str] = set()
        if isinstance(value, list):
            for item in value:
                refs.update(self._collect_component_schema_refs(item))
            return refs
        if not isinstance(value, dict):
            return refs
        ref = value.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            refs.add(ref.removeprefix("#/components/schemas/"))
        for item in value.values():
            refs.update(self._collect_component_schema_refs(item))
        return refs

    def _operation_spec(
        self,
        operation: dict[str, Any],
        operation_id: str,
        schema_components: dict[str, Any],
        *,
        surface: str | None = None,
    ) -> dict[str, Any]:
        method = self._string(operation.get("api_method")).upper()
        path_params = self._string_list(operation.get("path_params"))
        parameters = [self._path_parameter(param) for param in path_params]
        if bool(operation.get("idempotency_required")):
            parameters.extend(self._idempotency_parameters())
        if bool(operation.get("if_match_required")):
            parameters.extend(self._if_match_parameters())
        parameters.extend(self._operation_query_parameters(operation, method))

        spec: dict[str, Any] = {
            "tags": [self._string(operation.get("tag")) or "router"],
            "operationId": operation_id,
            "summary": self._summary(operation, operation_id),
            "description": self._description(operation),
            "parameters": parameters,
            "responses": self._operation_responses(operation, operation_id, schema_components),
            "x-source-file": self._string(operation.get("source")),
            "x-route-scope": self._string(operation.get("route_scope")),
            "x-contract-kind": self._string(operation.get("kind")),
            "x-read-sources": self._string_list(operation.get("read_sources")),
            "x-write-tables": self._string_list(operation.get("write_tables")),
            "x-file-targets": self._string_list(operation.get("file_targets")),
        }
        spec["security"] = self._operation_security(operation_id, surface=surface)
        if bool(operation.get("idempotency_required")):
            spec["x-sdkwork-idempotent"] = True
        if bool(operation.get("if_match_required")):
            spec["x-sdkwork-conditional-write"] = True
        rate_limit_tier = self._string(operation.get("rate_limit_tier"))
        if rate_limit_tier:
            spec["x-sdkwork-rate-limit-tier"] = rate_limit_tier
        sdk_domain = self._string(operation.get("sdk_domain"))
        if sdk_domain:
            spec["x-sdkwork-domain"] = sdk_domain
            spec["x-sdk-domain"] = sdk_domain
        spec["x-sdkwork-resource"] = self._sdkwork_resource(operation_id)
        if method in {"POST", "PUT", "PATCH"} and self._operation_has_request_body(operation):
            request_schema_ref = self._operation_request_schema(operation, operation_id)
            request_content_type = self._request_content_type(operation)
            spec["requestBody"] = {
                "required": self._request_body_required(operation, request_schema_ref),
                "description": self._request_body_description(operation, operation_id),
                "content": {
                    request_content_type: {
                        "schema": request_schema_ref,
                    },
                },
            }
        return spec

    def _operation_responses(
        self,
        operation: dict[str, Any],
        operation_id: str,
        schema_components: dict[str, Any],
    ) -> dict[str, Any]:
        method = self._string(operation.get("api_method")).upper()
        responses: dict[str, Any] = {}
        if method == "DELETE":
            responses["204"] = {"description": "No Content"}
        else:
            status = "201" if method == "POST" and self._operation_id_action(operation_id) == "create" else "200"
            responses[status] = {
                "description": "Created" if status == "201" else "OK",
                "content": {
                    "application/json": {
                        "schema": self._success_response_schema(operation, operation_id, schema_components),
                    },
                },
            }
        responses["default"] = self._problem_response("Error response.")
        responses["400"] = self._problem_response("Bad Request")
        responses["401"] = self._problem_response("Unauthorized")
        responses["500"] = self._problem_response("Server Error")
        return responses

    def _operation_id_action(self, operation_id: str) -> str:
        if not operation_id:
            return ""
        return operation_id.rsplit(".", 1)[-1]

    def _problem_response(self, description: str) -> dict[str, Any]:
        return {
            "description": description,
            "content": {
                "application/problem+json": {
                    "schema": {"$ref": "#/components/schemas/ProblemDetail"},
                },
            },
        }

    def _tags(self, operations: list[dict[str, Any]]) -> list[dict[str, str]]:
        tags = sorted(
            {
                self._string(operation.get("tag")) or "router"
                for operation in operations
                if isinstance(operation, dict)
            }
        )
        return [
            {
                "name": tag,
                "description": f"{self._tag_label(tag)} operations exposed by Claw Router.",
            }
            for tag in tags
        ]

    def _tag_label(self, tag: str) -> str:
        words = [word for word in re.split(r"[^A-Za-z0-9]+", tag) if word]
        return " ".join(words) if words else "Router"

    def _request_body_description(self, operation: dict[str, Any], operation_id: str) -> str:
        summary = self._summary(operation, operation_id)
        return f"Typed request payload for {summary.lower()}."

    def _operation_has_request_body(self, operation: dict[str, Any]) -> bool:
        if self._payload_schema(operation.get("request_schema")) is not None:
            return True
        if isinstance(operation.get("request_body_required"), bool) and not operation["request_body_required"]:
            return False
        return True

    def _request_content_type(self, operation: dict[str, Any]) -> str:
        request_content_type = self._string(operation.get("request_content_type"))
        return request_content_type or "application/json"

    def _request_body_required(
        self,
        operation: dict[str, Any],
        request_schema_ref: dict[str, str],
    ) -> bool:
        if isinstance(operation.get("request_body_required"), bool):
            return bool(operation["request_body_required"])
        return self._payload_schema(operation.get("request_schema")) is not None

    def _success_response_schema(
        self,
        operation: dict[str, Any],
        operation_id: str,
        schema_components: dict[str, Any],
    ) -> dict[str, str]:
        return {"$ref": f"#/components/schemas/{self._operation_result_component_name(operation_id)}"}

    def _operation_request_schema(self, operation: dict[str, Any], operation_id: str) -> dict[str, str]:
        payload_schema = self._payload_schema(operation.get("request_schema"))
        if payload_schema is None:
            return {"$ref": f"#/components/schemas/{self._operation_request_component_name(operation_id)}"}
        return {"$ref": f"#/components/schemas/{payload_schema[0]}"}

    def _path_parameter(self, name: str) -> dict[str, Any]:
        return {
            "name": name,
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": f"{self._field_label(name).capitalize()} path parameter.",
        }

    def _idempotency_parameters(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "Idempotency-Key",
                "in": "header",
                "required": True,
                "schema": {"type": "string", "minLength": 1, "maxLength": 128},
                "description": "Required stable idempotency key for this write operation.",
            },
        ]

    def _if_match_parameters(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "If-Match",
                "in": "header",
                "required": True,
                "schema": {"type": "string", "maxLength": 128},
                "description": "Required entity version precondition for this conditional write.",
            },
        ]

    def _operation_query_parameters(self, operation: dict[str, Any], method: str) -> list[dict[str, Any]]:
        declared = operation.get("query_parameters")
        if isinstance(declared, list) and declared:
            parameters: list[dict[str, Any]] = []
            seen: set[str] = set()
            for parameter in declared:
                if not isinstance(parameter, dict):
                    continue
                name = self._string(parameter.get("name"))
                if not name or name in seen:
                    continue
                seen.add(name)
                schema = parameter.get("schema")
                item = {
                    "name": name,
                    "in": "query",
                    "required": bool(parameter.get("required", False)),
                    "schema": self._normalized_parameter_schema(
                        schema,
                        location=f"#/paths/{self._string(operation.get('api_path'))}/{method.lower()}/parameters/{name}.schema",
                    ),
                }
                description = self._string(parameter.get("description"))
                if description:
                    item["description"] = description
                else:
                    item["description"] = f"{self._field_label(name).capitalize()} query parameter."
                for field in ("style", "explode", "allowReserved", "deprecated", "allowEmptyValue"):
                    if field in parameter:
                        item[field] = parameter[field]
                parameters.append(item)
            if parameters:
                return parameters
        if operation.get("query_parameters_declared") is True:
            return []
        return []

    def _description(self, operation: dict[str, Any]) -> str:
        read_sources = ", ".join(self._string_list(operation.get("read_sources"))) or "none"
        write_tables = ", ".join(self._string_list(operation.get("write_tables"))) or "none"
        file_targets = ", ".join(self._string_list(operation.get("file_targets"))) or "none"
        description = self._string(operation.get("description"))
        suffix = f"Reads {read_sources}. Writes {write_tables}. File targets {file_targets}."
        if description:
            return f"{description} {suffix}"
        return f"{self._summary(operation, self._string(operation.get('operation')))}. {suffix}"

    def _summary(self, operation: dict[str, Any], operation_id: str) -> str:
        explicit = self._string(operation.get("summary"))
        if explicit:
            return explicit
        source = self._string(operation.get("operation")) or operation_id
        words = self._operation_words(source)
        if not words:
            return operation_id or "Run operation"

        verb = words[0].lower()
        noun_words = words[1:]
        prefix = self._summary_verb(verb)
        if not noun_words:
            return prefix
        noun = self._humanize_words(noun_words)
        return f"{prefix} {noun}"

    def _summary_verb(self, verb: str) -> str:
        if verb in {"fetch", "list", "search", "query"}:
            return "List"
        if verb in {"get", "load", "read"}:
            return "Get"
        if verb in {"create", "add", "submit"}:
            return "Create"
        if verb in {"update", "edit", "patch"}:
            return "Update"
        if verb in {"delete", "remove"}:
            return "Delete"
        if verb in {"sync", "import"}:
            return "Sync"
        if verb in {"enable", "disable", "publish", "approve", "reject", "trigger", "redeem", "offline"}:
            return verb.capitalize()
        return verb.capitalize()

    def _humanize_words(self, words: list[str]) -> str:
        normalized = [self._summary_word(word, index == len(words) - 1) for index, word in enumerate(words)]
        return " ".join(word for word in normalized if word)

    def _summary_word(self, word: str, is_last: bool) -> str:
        lower = word.lower()
        acronyms = {
            "api": "API",
            "id": "ID",
            "ip": "IP",
            "oauth": "OAuth",
            "qps": "QPS",
            "url": "URL",
            "vip": "VIP",
        }
        if lower in acronyms:
            return acronyms[lower]
        if lower == "apps" and not is_last:
            return "app"
        if lower == "keys" and not is_last:
            return "key"
        return lower

    def _operation_words(self, value: str) -> list[str]:
        spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value)
        spaced = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", spaced)
        return [word for word in re.split(r"[^A-Za-z0-9]+", spaced) if word]

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

    def _sdkwork_resource(self, operation_id: str) -> str:
        parts = [part for part in operation_id.split(".") if part]
        if len(parts) <= 1:
            return ""
        return ".".join(parts[:-1])

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

    def _operation_security(
        self, operation_id: str, *, surface: str | None = None
    ) -> list[dict[str, list[str]]]:
        if operation_id in self.PUBLIC_IAM_OPERATION_IDS:
            return []
        if (
            surface == "app"
            and operation_id in self.PUBLIC_APP_CATALOG_OPERATION_IDS
        ):
            return []
        if operation_id in self.REFRESH_TOKEN_OPERATION_IDS:
            return [{"AuthToken": [], "AccessToken": []}]
        return [{"AuthToken": [], "AccessToken": []}]

    def _components(
        self,
        operations: list[dict[str, Any]],
        operation_ids: dict[int, str],
        schema_components: dict[str, Any],
    ) -> dict[str, Any]:
        schemas = {
            "JsonValue": {
                "description": "JSON value accepted by flexible Claw Router metadata and extension maps.",
                "oneOf": [
                    {"type": "string", "description": "String JSON value."},
                    {"type": "number", "description": "Number JSON value."},
                    {"type": "integer", "description": "Integer JSON value."},
                    {"type": "boolean", "description": "Boolean JSON value."},
                    {"type": "array", "items": {"$ref": "#/components/schemas/JsonValue"}, "description": "Array JSON value."},
                    {"$ref": "#/components/schemas/JsonObject", "description": "Object JSON value."},
                    {"$ref": "#/components/schemas/JsonNull", "description": "Null JSON value."},
                ],
            },
            "JsonNull": {
                "type": "null",
                "description": "JSON null value.",
            },
            "JsonObject": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                "description": "JSON object with typed JSON values.",
            },
            "NoData": {
                "type": "object",
                "additionalProperties": False,
                "properties": {},
                "description": "Closed empty payload for operations that complete without business data.",
            },
            "SdkWorkApiResponse": {
                "type": "object",
                "additionalProperties": False,
                "required": ["code", "data", "traceId"],
                "properties": {
                    "code": {
                        "type": "integer",
                        "format": "int32",
                        "enum": [0],
                        "default": 0,
                        "minimum": 0,
                        "maximum": 0,
                        "description": "Numeric success result code. Must be 0 on HTTP 2xx.",
                    },
                    "data": {"description": "Operation-specific payload typed per response schema."},
                    "traceId": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Server-owned request correlation id.",
                    },
                },
                "description": "Canonical SDKWork success response envelope.",
            },
            "SdkWorkResourceData": {
                "type": "object",
                "additionalProperties": False,
                "required": ["item"],
                "properties": {
                    "item": {
                        "type": "object",
                        "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                        "description": "Typed domain resource for the operation.",
                    },
                },
                "description": "Canonical single-resource success data payload.",
            },
            "SdkWorkPageData": {
                "type": "object",
                "additionalProperties": False,
                "required": ["items", "pageInfo"],
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {"type": "object", "additionalProperties": {"$ref": "#/components/schemas/JsonValue"}},
                        "description": "Page items returned by the operation.",
                    },
                    "pageInfo": {
                        "$ref": "#/components/schemas/PageInfo",
                        "description": "Server pagination metadata.",
                    },
                },
                "description": "Canonical list/search success data payload.",
            },
            "SdkWorkCommandData": {
                "type": "object",
                "additionalProperties": False,
                "required": ["accepted"],
                "properties": {
                    "accepted": {"type": "boolean", "const": True, "description": "Whether the command was accepted."},
                    "resourceId": {"type": "string", "description": "Affected resource id when available."},
                    "status": {"type": "string", "description": "Command status when available."},
                },
                "description": "Canonical command success data payload.",
            },
            "PageInfo": {
                "type": "object",
                "additionalProperties": False,
                "required": ["mode"],
                "properties": {
                    "mode": {"type": "string", "enum": ["offset", "cursor"], "description": "Pagination mode."},
                    "page": {"type": "integer", "minimum": 1, "description": "One-based page index for offset mode."},
                    "pageSize": {"type": "integer", "minimum": 1, "maximum": 200, "description": "Effective page size."},
                    "totalItems": {"type": "string", "pattern": "^[0-9]+$", "description": "Total matching items when available."},
                    "totalPages": {"type": "integer", "minimum": 0, "description": "Total pages when available."},
                    "nextCursor": {"type": ["string", "null"], "description": "Opaque cursor for the next page."},
                    "hasMore": {"type": "boolean", "description": "Whether another page exists."},
                },
                "description": "SDKWork pagination metadata.",
            },
            "SdkWorkPlatformErrorCode": {
                "type": "integer",
                "format": "int32",
                "minimum": 40001,
                "maximum": 79999,
                "description": "Platform or domain error code per API_SPEC.md section 15.3.",
            },
            "SdkWorkResourceResponse": {
                "allOf": [
                    {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                    {
                        "type": "object",
                        "required": ["data"],
                        "properties": {"data": {"$ref": "#/components/schemas/SdkWorkResourceData"}},
                    },
                ],
                "description": "Generic SDKWork resource success response.",
            },
            "SdkWorkListResponse": {
                "allOf": [
                    {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                    {
                        "type": "object",
                        "required": ["data"],
                        "properties": {"data": {"$ref": "#/components/schemas/SdkWorkPageData"}},
                    },
                ],
                "description": "Generic SDKWork list success response.",
            },
            "SdkWorkCommandResponse": {
                "allOf": [
                    {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                    {
                        "type": "object",
                        "required": ["data"],
                        "properties": {"data": {"$ref": "#/components/schemas/SdkWorkCommandData"}},
                    },
                ],
                "description": "Generic SDKWork command success response.",
            },
            "FieldError": {
                "type": "object",
                "additionalProperties": False,
                "description": "Field-level validation problem detail.",
                "required": ["field", "message"],
                "properties": {
                    "field": {"type": "string", "description": "Problem field path."},
                    "message": {"type": "string", "description": "Human-readable field validation message."},
                    "code": {
                        "type": "integer",
                        "format": "int32",
                        "minimum": 40011,
                        "maximum": 40099,
                        "description": "Field-level validation subcode.",
                    },
                },
            },
            "ProblemDetail": {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                "description": "RFC 9457 problem details error response.",
                "required": ["type", "title", "status", "code", "traceId"],
                "properties": {
                    "type": {"type": "string", "format": "uri-reference", "description": "Problem type URI reference."},
                    "title": {"type": "string", "description": "Short human-readable problem title."},
                    "status": {
                        "type": "integer",
                        "minimum": 100,
                        "maximum": 599,
                        "description": "HTTP status code generated by the origin server.",
                    },
                    "detail": {"type": "string", "description": "Human-readable explanation specific to this occurrence."},
                    "instance": {"type": "string", "description": "URI reference identifying this occurrence."},
                    "code": {"$ref": "#/components/schemas/SdkWorkPlatformErrorCode"},
                    "traceId": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Server-owned request correlation id.",
                    },
                    "errors": {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/FieldError"},
                        "description": "Field-level validation errors.",
                    },
                },
            },
        }
        for name, schema in self._operation_payload_schemas(operations).items():
            schemas[name] = schema
        for name, schema in self._operation_fallback_request_schemas(operations, operation_ids).items():
            schemas[name] = schema
        for name, schema in self._operation_result_schemas(operations, operation_ids, schema_components).items():
            schemas[name] = schema
        for name in self._reachable_schema_component_names(schemas, schema_components, operations):
            schemas.setdefault(name, schema_components[name])
        return {
            "schemas": schemas,
            "securitySchemes": {
                "AuthToken": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "SDKWork auth token",
                },
                "AccessToken": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "Access-Token",
                },
            },
        }

    def _normalize_component_schemas(self, components: dict[str, Any]) -> None:
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        for schema_name, schema in list(schemas.items()):
            if not isinstance(schema, dict):
                continue
            self._normalize_schema_node(schema, schema_name=schema_name, location=f"#/components/schemas/{schema_name}")

    def _normalize_schema_node(self, node: Any, *, schema_name: str, location: str) -> None:
        if isinstance(node, list):
            for index, item in enumerate(node):
                self._normalize_schema_node(item, schema_name=schema_name, location=f"{location}[{index}]")
            return
        if not isinstance(node, dict):
            return
        schema_ref = node.get("$ref")
        if isinstance(schema_ref, str):
            if node.get("nullable") is True:
                description = node.get("description") or self._default_schema_node_description(
                    schema_name=schema_name,
                    location=location,
                    node=node,
                )
                field_label = self._field_label(self._property_name_from_location(location) or "value")
                node.clear()
                node["oneOf"] = [
                    {
                        "allOf": [{"$ref": schema_ref}],
                        "description": description,
                    },
                    {
                        "allOf": [{"$ref": "#/components/schemas/JsonNull"}],
                        "description": f"Null variant accepted by {field_label}.",
                    },
                ]
                node["description"] = description
                return
            description = node.get("description")
            if isinstance(description, str) and description.strip() and len(node) > 1:
                node.clear()
                node["allOf"] = [{"$ref": schema_ref}]
                node["description"] = description
            return

        if node.get("nullable") is True and "type" not in node:
            all_of = node.get("allOf")
            if isinstance(all_of, list) and len(all_of) == 1 and isinstance(all_of[0], dict):
                base_schema = {
                    key: value
                    for key, value in all_of[0].items()
                    if key not in {"description", "nullable"}
                }
                description = node.get("description") or all_of[0].get("description")
                node.pop("allOf", None)
                node.update(base_schema)
                node["nullable"] = True
                if description:
                    node["description"] = description

        schema_type = node.get("type")
        self._normalize_int64_json_schema(node)
        schema_type = node.get("type")
        if schema_type == "object":
            if "additionalProperties" not in node:
                node["additionalProperties"] = False
            elif node.get("additionalProperties") is True:
                node["additionalProperties"] = {"$ref": "#/components/schemas/JsonValue"}
        description = node.get("description")
        if not isinstance(description, str) or not description.strip():
            node["description"] = self._default_schema_node_description(schema_name=schema_name, location=location, node=node)

        additional_properties = node.get("additionalProperties")
        if isinstance(additional_properties, dict):
            self._wrap_ref_schema_with_description(
                additional_properties,
                description=self._default_schema_node_description(
                    schema_name=schema_name,
                    location=f"{location}.additionalProperties",
                    node=additional_properties,
                ),
            )
            self._normalize_schema_node(
                additional_properties,
                schema_name=schema_name,
                location=f"{location}.additionalProperties",
            )

        properties = node.get("properties")
        if isinstance(properties, dict):
            for property_name, property_schema in properties.items():
                if not isinstance(property_schema, dict):
                    continue
                if not isinstance(property_schema.get("description"), str) or not property_schema["description"].strip():
                    property_schema["description"] = self._default_property_description(
                        schema_name=schema_name,
                        property_name=property_name,
                    )
                self._wrap_ref_schema_with_description(
                    property_schema,
                    description=property_schema["description"],
                )
                self._normalize_schema_node(
                    property_schema,
                    schema_name=schema_name,
                    location=f"{location}.properties.{property_name}",
                )

        items = node.get("items")
        if isinstance(items, dict):
            self._normalize_schema_node(items, schema_name=schema_name, location=f"{location}.items")

        for union_key in ("oneOf", "anyOf", "allOf"):
            branches = node.get(union_key)
            if not isinstance(branches, list):
                continue
            for index, branch in enumerate(branches):
                if isinstance(branch, dict) and union_key in {"oneOf", "anyOf"}:
                    if not isinstance(branch.get("description"), str) or not branch["description"].strip():
                        branch["description"] = self._default_union_branch_description(
                            property_name=self._property_name_from_location(location),
                            branch=branch,
                        )
                    self._wrap_ref_schema_with_description(
                        branch,
                        description=branch["description"],
                    )
                self._normalize_schema_node(
                    branch,
                    schema_name=schema_name,
                    location=f"{location}.{union_key}[{index}]",
                )

    def _normalized_parameter_schema(self, value: Any, *, location: str) -> dict[str, Any]:
        schema = copy.deepcopy(value) if isinstance(value, dict) else {"type": "string"}
        self._normalize_int64_json_schema_tree(schema, location=location)
        return schema

    def _normalize_int64_json_schema_tree(self, node: Any, *, location: str) -> None:
        if isinstance(node, list):
            for index, item in enumerate(node):
                self._normalize_int64_json_schema_tree(item, location=f"{location}[{index}]")
            return
        if not isinstance(node, dict):
            return
        self._normalize_int64_json_schema(node)
        for key, value in list(node.items()):
            if key == "$ref":
                continue
            self._normalize_int64_json_schema_tree(value, location=f"{location}.{key}")

    def _normalize_int64_json_schema(self, node: dict[str, Any]) -> None:
        if node.get("format") != "int64":
            return

        schema_type = node.get("type")
        if isinstance(schema_type, list):
            node["type"] = ["string" if item in {"integer", "number"} else item for item in schema_type]
        elif schema_type in {"integer", "number", "string"}:
            node["type"] = "string"
        elif schema_type is None:
            node["type"] = "string"
        else:
            return

        node["format"] = "int64"
        node.setdefault("pattern", self._int64_string_pattern(node))
        node["x-sdkwork-int64-string"] = True
        node.setdefault("x-sdkwork-rust-type", "i64")
        for numeric_constraint in (
            "minimum",
            "maximum",
            "exclusiveMinimum",
            "exclusiveMaximum",
            "multipleOf",
        ):
            node.pop(numeric_constraint, None)

    def _int64_string_pattern(self, node: dict[str, Any]) -> str:
        minimum = node.get("minimum")
        exclusive_minimum = node.get("exclusiveMinimum")
        if isinstance(minimum, (int, float)):
            if minimum >= 1:
                return "^[1-9][0-9]*$"
            if minimum >= 0:
                return "^[0-9]+$"
        if isinstance(exclusive_minimum, (int, float)):
            if exclusive_minimum >= 0:
                return "^[1-9][0-9]*$"
            if exclusive_minimum >= -1:
                return "^[0-9]+$"
        return "^-?[0-9]+$"

    def _wrap_ref_schema_with_description(self, schema: dict[str, Any], *, description: str) -> None:
        schema_ref = schema.get("$ref")
        if not isinstance(schema_ref, str):
            return
        if schema.get("nullable") is True:
            schema.setdefault("description", description)
            return
        schema.clear()
        schema["allOf"] = [{"$ref": schema_ref}]
        schema["description"] = description

    def _default_schema_node_description(self, *, schema_name: str, location: str, node: dict[str, Any]) -> str:
        if location == f"#/components/schemas/{schema_name}":
            return f"{self._schema_label(schema_name).capitalize()} schema exposed by Claw Router."
        property_name = self._property_name_from_location(location)
        if property_name:
            return self._default_property_description(schema_name=schema_name, property_name=property_name)
        schema_type = node.get("type")
        if isinstance(schema_type, str):
            return f"{schema_type.capitalize()} schema used by {self._schema_label(schema_name)}."
        return f"Schema fragment used by {self._schema_label(schema_name)}."

    def _default_property_description(self, *, schema_name: str, property_name: str) -> str:
        return f"{self._field_label(property_name).capitalize()} field on {self._schema_label(schema_name)}."

    def _default_union_branch_description(self, *, property_name: str, branch: dict[str, Any]) -> str:
        field_label = self._field_label(property_name) if property_name else "value"
        ref = branch.get("$ref")
        if isinstance(ref, str):
            return f"{field_label.capitalize()} variant using {self._schema_label(ref.rsplit('/', 1)[-1])}."
        schema_type = branch.get("type")
        if isinstance(schema_type, str):
            return f"{schema_type.capitalize()} variant accepted by {field_label}."
        return f"Schema variant accepted by {field_label}."

    def _property_name_from_location(self, location: str) -> str:
        match = re.search(r"\.properties\.([^.[]+)(?:\.|$)", location)
        return match.group(1) if match else ""

    def _schema_label(self, schema_name: str) -> str:
        return " ".join(self._identifier_words(schema_name)).lower()

    def _field_label(self, field_name: str) -> str:
        return " ".join(self._identifier_words(field_name)).lower() or field_name

    def _identifier_words(self, identifier: str) -> list[str]:
        return re.findall(r"[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+", identifier.replace("_", " "))

    def _operation_payload_schemas(self, operations: list[dict[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for operation in operations:
            for field in ("request_schema", "response_schema"):
                if field == "request_schema" and not self._operation_has_request_body(operation):
                    continue
                payload_schema = self._payload_schema(operation.get(field))
                if payload_schema is None:
                    continue
                name, schema = payload_schema
                if name in {"NoData", "PlusApiResult"}:
                    continue
                if self._is_self_schema_ref(name, schema):
                    continue
                lifted_schema = self._lift_named_nested_schemas(schema, result, {name})
                if name not in result or self._is_self_schema_ref(name, result[name]):
                    result[name] = lifted_schema
        return result

    def _lift_named_nested_schemas(
        self,
        value: Any,
        components: dict[str, Any],
        parent_names: set[str],
    ) -> Any:
        if isinstance(value, list):
            return [
                self._lift_named_nested_schemas(item, components, parent_names)
                for item in value
            ]
        if not isinstance(value, dict):
            return value
        if isinstance(value.get("$ref"), str):
            ref = value["$ref"]
            if ref.startswith("#/x_response_entities/"):
                entity_key = ref.removeprefix("#/x_response_entities/")
                entity = self._response_entities().get(entity_key)
                if isinstance(entity, dict):
                    return self._lift_named_nested_schemas(
                        copy.deepcopy(entity),
                        components,
                        parent_names,
                    )
            return dict(value)

        nested_name = value.get("name")
        if (
            isinstance(nested_name, str)
            and nested_name not in parent_names
            and re.match(r"^[A-Z][A-Za-z0-9]*$", nested_name)
            and isinstance(value.get("properties"), dict)
        ):
            component_schema = {
                key: item for key, item in value.items() if key != "name"
            }
            component_schema = self._lift_named_nested_schemas(
                component_schema,
                components,
                parent_names | {nested_name},
            )
            components[nested_name] = component_schema
            if value.get("nullable") is True:
                return {
                    "$ref": f"#/components/schemas/{nested_name}",
                    "nullable": True,
                }
            return {"$ref": f"#/components/schemas/{nested_name}"}

        if (
            value.get("nullable") is True
            and isinstance(value.get("type"), str)
            and value.get("type") in {"string", "integer", "number", "boolean"}
        ):
            base_schema = {
                key: self._lift_named_nested_schemas(item, components, parent_names)
                for key, item in value.items()
                if key != "nullable"
            }
            return {"allOf": [base_schema], "nullable": True}

        return {
            key: self._lift_named_nested_schemas(item, components, parent_names)
            for key, item in value.items()
        }

    def _operation_result_schemas(
        self,
        operations: list[dict[str, Any]],
        operation_ids: dict[int, str],
        schema_components: dict[str, Any],
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for operation in operations:
            if self._string(operation.get("api_method")).upper() == "DELETE":
                continue
            data_schema = self._operation_data_schema(operation, schema_components)
            if data_schema is None:
                data_schema = self._no_data_schema("No business data returned by this operation.")
            operation_id = operation_ids[id(operation)]
            result[self._operation_result_component_name(operation_id)] = {
                "allOf": [
                    {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["data"],
                        "properties": {
                            "data": data_schema,
                        },
                    },
                ],
                "x-operation-id": operation_id,
            }
        return result

    def _no_data_schema(self, description: str) -> dict[str, Any]:
        return {
            "allOf": [{"$ref": "#/components/schemas/NoData"}],
            "description": description,
        }

    def _operation_fallback_request_schemas(
        self,
        operations: list[dict[str, Any]],
        operation_ids: dict[int, str],
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for operation in operations:
            method = self._string(operation.get("api_method")).upper()
            if method not in {"POST", "PUT", "PATCH"} or not self._operation_has_request_body(operation):
                continue
            if self._payload_schema(operation.get("request_schema")) is not None:
                continue
            operation_id = operation_ids[id(operation)]
            result[self._operation_request_component_name(operation_id)] = {
                "type": "object",
                "additionalProperties": False,
                "description": f"Explicit empty request body for {self._summary(operation, operation_id).lower()}.",
                "properties": {},
            }
        return result

    def _operation_data_schema(self, operation: dict[str, Any], schema_components: dict[str, Any]) -> dict[str, Any] | None:
        response_schema = self._payload_schema(operation.get("response_schema"))
        if response_schema is not None:
            if response_schema[0] in {"PlusApiResult", "NoData"}:
                return None
            if self._operation_is_list(operation):
                if self._schema_is_page_payload(response_schema[1]):
                    return {"$ref": f"#/components/schemas/{response_schema[0]}"}
                return self._page_data_schema(self._list_item_schema(response_schema))
            return {"$ref": f"#/components/schemas/{response_schema[0]}"}
        if self._string(operation.get("api_method")).upper() != "GET":
            return None
        read_sources = self._string_list(operation.get("read_sources"))
        if len(read_sources) != 1:
            return None
        component_name = self._record_component_name(read_sources[0])
        if component_name not in schema_components:
            return None
        record_ref = {"$ref": f"#/components/schemas/{component_name}"}
        if self._string_list(operation.get("path_params")):
            return record_ref
        return self._page_data_schema(record_ref)

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

    def _list_item_schema(self, response_schema: tuple[str, dict[str, Any]]) -> dict[str, Any]:
        name, schema = response_schema
        if schema.get("type") == "array" and isinstance(schema.get("items"), dict):
            item_name = schema["items"].get("name")
            if (
                isinstance(item_name, str)
                and item_name != name
                and re.match(r"^[A-Z][A-Za-z0-9]*$", item_name)
            ):
                return {"$ref": f"#/components/schemas/{item_name}"}
            return copy.deepcopy(schema["items"])
        return {"$ref": f"#/components/schemas/{name}"}

    def _page_data_schema(self, item_schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "object",
            "additionalProperties": False,
            "required": ["items", "pageInfo"],
            "properties": {
                "items": {
                    "type": "array",
                    "items": item_schema,
                },
                "pageInfo": {"$ref": "#/components/schemas/PageInfo"},
            },
        }

    def _reachable_schema_component_names(
        self,
        schemas: dict[str, Any],
        schema_components: dict[str, Any],
        operations: list[dict[str, Any]],
    ) -> list[str]:
        pending = self._schema_component_root_names(operations, schema_components)
        pending.extend(self._schema_ref_names(schemas))
        reachable: list[str] = []
        seen: set[str] = set()
        while pending:
            name = pending.pop(0)
            if name in seen:
                continue
            seen.add(name)
            if name in schemas:
                pending.extend(self._schema_ref_names(schemas[name]))
                continue
            component = schema_components.get(name)
            if not isinstance(component, dict):
                continue
            reachable.append(name)
            pending.extend(self._schema_ref_names(component))
        return reachable

    def _schema_component_root_names(
        self,
        operations: list[dict[str, Any]],
        schema_components: dict[str, Any],
    ) -> list[str]:
        roots: list[str] = []
        seen: set[str] = set()

        def add(name: str) -> None:
            if name in schema_components and name not in seen:
                seen.add(name)
                roots.append(name)

        for name in self.PUBLIC_PROJECT_LEGACY_RECORD_COMPONENTS:
            component = schema_components.get(name)
            if not isinstance(component, dict):
                continue
            if component.get("x-domain") != "legacy":
                continue
            if component.get("x-generated-by-this-project") is not True:
                continue
            add(name)

        for operation in operations:
            if self._operation_has_request_body(operation):
                request_schema = self._payload_schema(operation.get("request_schema"))
                if request_schema is not None:
                    add(request_schema[0])
            response_schema = self._payload_schema(operation.get("response_schema"))
            if response_schema is not None:
                add(response_schema[0])
                continue
            if self._string(operation.get("api_method")).upper() != "GET":
                continue
            read_sources = self._string_list(operation.get("read_sources"))
            if len(read_sources) == 1:
                add(self._record_component_name(read_sources[0]))
        return roots

    def _schema_ref_names(self, value: Any) -> list[str]:
        names: list[str] = []
        seen: set[str] = set()

        def visit(node: Any) -> None:
            if isinstance(node, list):
                for item in node:
                    visit(item)
                return
            if not isinstance(node, dict):
                return
            ref_name = self._component_ref_name(node.get("$ref"))
            if ref_name and ref_name not in seen:
                seen.add(ref_name)
                names.append(ref_name)
            for item in node.values():
                visit(item)

        visit(value)
        return names

    def _component_ref_name(self, value: Any) -> str:
        if not isinstance(value, str):
            return ""
        prefix = "#/components/schemas/"
        if not value.startswith(prefix):
            return ""
        return value.removeprefix(prefix)

    def _operation_request_component_name(self, operation_id: str) -> str:
        if not operation_id:
            return "OperationRequest"
        safe = self._component_safe_operation_name(operation_id)
        return safe[0].upper() + safe[1:] + "Request"

    def _operation_result_component_name(self, operation_id: str) -> str:
        if not operation_id:
            return "OperationResult"
        safe = self._component_safe_operation_name(operation_id)
        return safe[0].upper() + safe[1:] + "Result"

    def _record_component_name(self, table_name: str) -> str:
        return "".join(part.capitalize() for part in table_name.split("_")) + "Record"

    def _response_entities(self) -> dict[str, Any]:
        if self._response_entities_cache is not None:
            return self._response_entities_cache
        contract_path = self.root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        if not contract_path.exists() or yaml is None:
            self._response_entities_cache = {}
            return self._response_entities_cache
        payload = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
        entities = payload.get("x_response_entities", {}) if isinstance(payload, dict) else {}
        self._response_entities_cache = entities if isinstance(entities, dict) else {}
        return self._response_entities_cache

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

    def _payload_schema(self, value: Any) -> tuple[str, dict[str, Any]] | None:
        if not isinstance(value, dict):
            return None
        name = value.get("name")
        schema = value.get("schema")
        if not isinstance(name, str):
            return None
        if isinstance(schema, dict):
            return name, schema
        inline_schema = {key: item for key, item in value.items() if key != "name"}
        if not inline_schema:
            return None
        return name, inline_schema

    def _is_self_schema_ref(self, name: str, schema: dict[str, Any]) -> bool:
        return schema == {"$ref": f"#/components/schemas/{name}"}

    def _load_manifest(self) -> dict[str, Any]:
        if not self.manifest_path.exists():
            raise ValueError(f"api contract manifest is missing: {self.manifest_path}")
        payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("api contract manifest root must be an object")
        return payload

    def _boundary(self, manifest: dict[str, Any], surface: str) -> dict[str, Any]:
        boundaries = manifest.get("sdk_boundaries", {})
        boundary = boundaries.get(surface, {}) if isinstance(boundaries, dict) else {}
        if not isinstance(boundary, dict):
            boundary = {}
        return {
            "api_prefix": self._string(boundary.get("api_prefix")) or self.DEFAULT_PREFIXES[surface],
            "sdk_client": self._string(boundary.get("sdk_client")) or self.DEFAULT_CLIENTS[surface],
            "sdk_family": self._string(boundary.get("sdk_family")) or surface,
        }

    def _version(self, manifest: dict[str, Any]) -> str:
        schema = manifest.get("schema", {})
        if isinstance(schema, dict):
            version = schema.get("version")
            if isinstance(version, str) and version:
                return version
        return "0.1.0"

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate sdkwork-clawrouter app/backend OpenAPI specs.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="API contract manifest path")
    parser.add_argument("--output-dir", type=Path, default=None, help="OpenAPI output directory")
    parser.add_argument("--check", action="store_true", help="validate generated OpenAPI specs are current")
    args = parser.parse_args()

    generator = ClawRouterOpenApiGenerator(root=args.root, manifest_path=args.manifest, output_dir=args.output_dir)
    if args.check:
        result = generator.check()
        if result.ok:
            print("ClawRouter OpenAPI specs are current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    outputs = generator.write()
    for surface, output in outputs.items():
        print(f"Wrote {surface} OpenAPI spec to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
