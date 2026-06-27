from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.frontend_contract_loader import default_frontend_contract_path, load_frontend_field_contract

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class ApiContractManifestCheckResult:
    ok: bool
    messages: list[str]


class ApiContractManifestGenerator:
    """Compile frontend operation contracts into SDK/API gateway manifest data."""

    SDK_BOUNDARIES: dict[str, dict[str, str]] = {
        "app": {
            "api_prefix": "/app/v3/api",
            "sdk_family": "clawrouter-app-sdk",
            "sdk_client": "SdkworkAppClient",
            "openapi_source": "generated/openapi/clawrouter-app-openapi.json",
            "generated_sdk_home": "sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript",
            "generator": "../sdkwork-sdk-generator",
        },
        "backend": {
            "api_prefix": "/backend/v3/api",
            "sdk_family": "clawrouter-backend-sdk",
            "sdk_client": "SdkworkBackendClient",
            "openapi_source": "generated/openapi/clawrouter-backend-openapi.json",
            "generated_sdk_home": "sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript",
            "generator": "../sdkwork-sdk-generator",
        },
        "openai_v1": {
            "api_prefix": "/v1",
            "sdk_family": "clawrouter-open-sdk",
            "sdk_client": "SdkworkAiClient",
            "openapi_source": "apps/sdkwork-clawrouter-pc/public/openapi.json",
            "generated_sdk_home": "sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript",
            "generator": "../sdkwork-sdk-generator",
        },
    }
    VALID_KINDS = {"read", "create", "update", "delete", "action"}
    KIND_METHODS = {
        "read": {"GET"},
        "create": {"POST"},
        "update": {"PATCH", "PUT"},
        "delete": {"DELETE"},
        "action": {"POST"},
    }
    PATH_PARAM_PATTERN = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")
    PAYLOAD_SCHEMA_NAME_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9]*$")
    RESERVED_PAYLOAD_SCHEMA_NAMES = {
        "ErrorResponse",
        "OperationRequest",
        "OperationResponse",
        "PageResult",
        "PlusApiResult",
        "NoData",
    }
    STANDARD_PAYLOAD_SCHEMA_NAMES = {
        "NoData",
    }
    STANDARD_QUERY_PARAMETER_ALIASES = {
        "search_query": ("q", "search text"),
        "searchQuery": ("q", "search text"),
        "keyword": ("q", "search text"),
        "search": ("q", "search text"),
        "size": ("page_size", "page size"),
        "page_no": ("page", "page index"),
    }
    APP_BACKEND_SURFACES = {"app", "backend"}
    VALID_REQUEST_CONTENT_TYPES = {
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
    }
    LEGACY_PROVIDER_PLATFORM_SNAKE = "open" + "_platform"
    LEGACY_PROVIDER_PLATFORM_CAMEL = "open" + "Platform"
    LEGACY_PROVIDER_PLATFORM_PATTERN = re.compile(r"open[_-]?platform", re.IGNORECASE)
    STANDARD_TAG_DOMAINS = {
        "auth": "iam",
        "iam": "iam",
        "profile": "iam",
        "billing": "commerce",
        "commerce": "commerce",
        "accounts": "commerce",
        "addresses": "commerce",
        "audit": "commerce",
        "catalog": "commerce",
        "cart": "commerce",
        "checkout": "commerce",
        "coupons": "commerce",
        "fulfillments": "commerce",
        "invoices": "commerce",
        "inventory": "commerce",
        "memberships": "commerce",
        "orders": "commerce",
        "payments": "commerce",
        "recharges": "commerce",
        "refunds": "commerce",
        "shipments": "commerce",
        "wallet": "commerce",
        "commerce_reports": "commerce",
        "content": "content",
        "communication": "communication",
        "messaging": "messaging",
        "notification": "notification",
        "ai": "intelligence",
        "chat": "chat",
        "memory": "memory",
        "mcp": "mcp",
        "prompts": "prompts",
        "runtime": "runtime",
        "agents": "agents",
        "sdkReference": "sdkReference",
        "system": "system",
        "oss": "oss",
        "sites": "sites",
        "storage": "storage",
        "platform": "platform",
        "serviceProviders": "integration",
        "integration": "integration",
        "ecosystem": "ecosystem",
    }
    DOMAIN_ALIASES = {
        "auth": "iam",
        "identity": "iam",
        "user": "iam",
        "users": "iam",
        "profile": "iam",
        "account": "commerce",
        "accounts": "commerce",
        "address": "commerce",
        "addresses": "commerce",
        "cart": "commerce",
        "checkout": "commerce",
        "billing": "commerce",
        "commerce": "commerce",
        "commerce_reports": "commerce",
        "catalog": "commerce",
        "coupon": "commerce",
        "coupons": "commerce",
        "fulfillment": "commerce",
        "fulfillments": "commerce",
        "invoice": "commerce",
        "invoices": "commerce",
        "inventory": "commerce",
        "membership": "commerce",
        "memberships": "commerce",
        "order": "commerce",
        "orders": "commerce",
        "payment": "commerce",
        "payments": "commerce",
        "promotion": "promotion",
        "promotions": "promotion",
        "recharge": "commerce",
        "recharges": "commerce",
        "refund": "commerce",
        "refunds": "commerce",
        "shipment": "commerce",
        "shipments": "commerce",
        "wallet": "commerce",
        "audit": "commerce",
        "feed": "content",
        "comment": "content",
        "content": "content",
        "model": "intelligence",
        "models": "intelligence",
        "router": "intelligence",
        "ai": "intelligence",
        "chat": "chat",
        "memory": "memory",
        "mcp": "mcp",
        "prompt": "prompts",
        "prompts": "prompts",
        "runtime": "runtime",
        "agent": "agents",
        "agents": "agents",
        "sdkReference": "sdkReference",
        "sdkreference": "sdkReference",
        "sdk_reference": "sdkReference",
        "intelligence": "intelligence",
        "provider": "integration",
        "providers": "integration",
        "integration": "integration",
        "app": "platform",
        "apps": "platform",
        "platform": "platform",
        "serviceProvider": "integration",
        "serviceProviders": "integration",
        "serviceprovider": "integration",
        "serviceproviders": "integration",
        "service_provider": "integration",
        "service_providers": "integration",
        "skill": "ecosystem",
        "skills": "ecosystem",
        "ecosystem": "ecosystem",
        "system": "system",
        "oss": "oss",
        "site": "sites",
        "sites": "sites",
        "aiSite": "sites",
        "aiSites": "sites",
        "ai_site": "sites",
        "ai_sites": "sites",
        "objectStorage": "oss",
        "objectstorage": "oss",
        "object_storage": "oss",
        "s3": "oss",
        "storage": "storage",
        "notification": "notification",
        "notifications": "notification",
        "message_delivery": "messaging",
        "messaging": "messaging",
        "sms": "messaging",
        "email": "messaging",
        "ops": "system",
    }
    TOP_LEVEL_TAGS = set(STANDARD_TAG_DOMAINS)
    ROUTER_IAM_SEGMENTS = {"api_keys", "api-keys"}
    ROUTER_AI_SEGMENTS = {
        "dashboard",
        "gateway",
        "model_rankings",
        "model-rankings",
        "model_vendors",
        "model-vendors",
        "models",
        "providers",
        "routing",
        "settlements",
        "usage",
    }
    ROUTER_CONTENT_SEGMENTS = {"announcements"}
    ROUTER_SYSTEM_SEGMENTS = {"firewall", "monitor", "rate_limits", "rate-limits"}
    ACTION_SEGMENTS = {
        "activate",
        "approve",
        "cancel",
        "deactivate",
        "disable",
        "enable",
        "publish",
        "refresh",
        "reject",
        "resend",
        "restore",
        "revoke",
        "submit",
        "unpublish",
        "verify",
    }
    READ_ACTION_SEGMENTS = {"list"}
    DETAIL_SEGMENTS = {"detail"}
    STATIC_SEGMENT_ALIASES = {
        "apikey": "api_keys",
        "api-key": "api_keys",
        "api-keys": "api_keys",
        "announcement": "announcements",
        "app": "apps",
        "agent": "agents",
        "channel": "channels",
        "comment": "comments",
        "coupon": "coupons",
        "promotion-codes": "promotion_codes",
        "feed": "feeds",
        "firewall": "firewalls",
        "model": "models",
        "model-rankings": "model_rankings",
        "model-vendors": "model_vendors",
        "notification": "notifications",
        "provider-secret": "provider_secrets",
        "provider-secrets": "provider_secrets",
        "rate-limits": "rate_limits",
        "record": "records",
        "skill": "skills",
        "user": "users",
    }
    TABLE_TAG_RULES = (
        ("integration_service_provider_", "serviceProviders"),
        ("integration_service_provider", "serviceProviders"),
        ("ai_usage_service_provider_", "serviceProviders"),
        ("commerce_usage_service_provider_", "serviceProviders"),
        ("commerce_service_provider_", "serviceProviders"),
        ("analytics_service_provider_", "serviceProviders"),
        ("iam_", "iam"),
        ("ai_mcp_", "mcp"),
        ("ai_mcp", "mcp"),
        ("ai_prompt_", "prompts"),
        ("ai_prompt", "prompts"),
        ("ai_site_", "sites"),
        ("ai_site", "sites"),
        ("ai_", "ai"),
        ("promotion_", "system"),
        ("commerce_", "commerce"),
        ("content_", "content"),
        ("messaging_", "messaging"),
        ("object_", "storage"),
        ("storage_", "storage"),
        ("upload_", "storage"),
        ("drive_", "storage"),
        ("file_", "storage"),
        ("appstore_app", "platform"),
        ("c_category", "platform"),
        ("content_comment", "content"),
        ("content_reaction", "content"),
        ("content_favorite", "content"),
        ("ai_agent_skill", "ecosystem"),
        ("ops_notification", "notification"),
        ("ops_", "system"),
    )
    JSON_SCHEMA_CONSTRAINT_KEYS = {
        "$ref",
        "allOf",
        "anyOf",
        "const",
        "default",
        "deprecated",
        "enum",
        "example",
        "examples",
        "exclusiveMaximum",
        "exclusiveMinimum",
        "format",
        "items",
        "maxItems",
        "maxLength",
        "maxProperties",
        "maximum",
        "minItems",
        "minLength",
        "minProperties",
        "minimum",
        "multipleOf",
        "not",
        "nullable",
        "oneOf",
        "pattern",
        "patternProperties",
        "propertyNames",
        "readOnly",
        "uniqueItems",
        "writeOnly",
    }

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
            else self.root / "generated" / "api" / "api-contract-manifest.json"
        )

    def generate(self) -> dict[str, Any]:
        operations = [
            self._compile_operation(entry)
            for entry in self._frontend_operations()
            if isinstance(entry, dict)
        ]
        operations.sort(key=lambda item: item["key"])

        api_surface_counts: dict[str, int] = {}
        sdk_client_counts: dict[str, int] = {}
        route_scope_counts: dict[str, int] = {}
        method_counts: dict[str, int] = {}
        for operation in operations:
            self._increment(api_surface_counts, operation["api_surface"])
            self._increment(sdk_client_counts, operation["sdk_client"])
            self._increment(route_scope_counts, operation["route_scope"])
            self._increment(method_counts, operation["api_method"])

        return {
            "schema": {
                "name": "sdkwork-clawrouter-api-contract-manifest",
                "version": "0.1.0",
                "contract_path": self._display_path(self.contract_path),
            },
            "summary": {
                "operation_count": len(operations),
                "api_surface_counts": dict(sorted(api_surface_counts.items())),
                "sdk_client_counts": dict(sorted(sdk_client_counts.items())),
                "route_scope_counts": dict(sorted(route_scope_counts.items())),
                "api_method_counts": dict(sorted(method_counts.items())),
            },
            "sdk_boundaries": self.SDK_BOUNDARIES,
            "operations": operations,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        validation = self.validate()
        if not validation.ok:
            raise ValueError("\n".join(validation.messages))

        target = Path(output_path) if output_path is not None else self.output_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8", newline="\n")
        return target

    def check(self, output_path: Path | None = None) -> ApiContractManifestCheckResult:
        validation = self.validate()
        if not validation.ok:
            return validation

        target = Path(output_path) if output_path is not None else self.output_path
        expected = self.render_json()
        if not target.exists():
            return ApiContractManifestCheckResult(ok=False, messages=[f"api contract manifest is missing: {target}"])
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return ApiContractManifestCheckResult(ok=False, messages=[f"api contract manifest is stale: {target}"])
        return ApiContractManifestCheckResult(ok=True, messages=[])

    def validate(self) -> ApiContractManifestCheckResult:
        entries = self._frontend_operations()
        messages: list[str] = []
        keys: set[str] = set()
        openapi_operations: dict[tuple[str, str, str], str] = {}
        operation_ids: dict[tuple[str, str], str] = {}

        for entry in entries:
            if not isinstance(entry, dict):
                messages.append("frontend_operations entries must be mappings")
                continue
            compiled_entry = self._compile_operation(entry)

            source = entry.get("source")
            operation = entry.get("operation")
            route = entry.get("route")
            kind = entry.get("kind")
            api_surface = entry.get("api_surface")
            api_method = entry.get("api_method")
            api_path = entry.get("api_path")
            operation_id = compiled_entry.get("operation_id")
            openapi_exposed = entry.get("openapi_exposed", True)
            key = self._operation_key(source, operation, route)

            if key in keys:
                messages.append(f"duplicate api contract operation: {key}")
            else:
                keys.add(key)

            if "openapi_exposed" in entry and not isinstance(openapi_exposed, bool):
                messages.append(f"api contract {key} openapi_exposed must be boolean")
            is_app_backend_openapi_operation = (
                openapi_exposed is not False
                and isinstance(api_surface, str)
                and api_surface in {"app", "backend"}
            )

            if (
                openapi_exposed is not False
                and
                isinstance(api_surface, str)
                and api_surface in self.SDK_BOUNDARIES
                and isinstance(api_method, str)
                and isinstance(api_path, str)
            ):
                standard_api_path = self._string(compiled_entry.get("api_path")) or api_path
                openapi_key = (api_surface, api_method.upper(), standard_api_path)
                existing = openapi_operations.get(openapi_key)
                if existing is not None and existing != key:
                    messages.append(
                        f"duplicate OpenAPI path/method on {api_surface} {api_method.upper()} {standard_api_path}: {existing} and {key}"
                    )
                else:
                    openapi_operations[openapi_key] = key

            if not isinstance(source, str) or not source:
                messages.append(f"api contract {key} must declare source")
            if not isinstance(operation, str) or not operation:
                messages.append(f"api contract {key} must declare operation")
            if is_app_backend_openapi_operation and not self._valid_operation_id(operation_id):
                messages.append(
                    f"api contract {key} operation_id must use dotted lowerCamel segments, "
                    "for example sessions.create"
                )
            if not isinstance(route, str) or not route:
                messages.append(f"api contract {key} must declare route")
            if not isinstance(kind, str) or kind not in self.VALID_KINDS:
                messages.append(f"api contract {key} kind must be one of {', '.join(sorted(self.VALID_KINDS))}")
            if not isinstance(api_surface, str) or api_surface not in self.SDK_BOUNDARIES:
                messages.append(f"api contract {key} api_surface must be one of {', '.join(sorted(self.SDK_BOUNDARIES))}")
                continue
            if not isinstance(api_method, str):
                messages.append(f"api contract {key} must declare api_method")
            elif isinstance(kind, str) and kind in self.KIND_METHODS:
                method = api_method.upper()
                allowed_methods = self._allowed_methods(kind, api_surface)
                if method not in allowed_methods:
                    messages.append(f"api contract {key} kind {kind} does not allow api_method {method}")
            if not isinstance(api_path, str):
                messages.append(f"api contract {key} must declare api_path")
            else:
                if self._has_legacy_provider_platform_token(api_path):
                    messages.append(
                        f"api contract {key} must not use legacy {self.LEGACY_PROVIDER_PLATFORM_SNAKE} API path; "
                        "use appbase iam oauth dependency routes"
                    )
                invalid_param = self._invalid_path_param(api_path)
                if invalid_param:
                    messages.append(f"api contract {key} path param is invalid: {invalid_param}")
            raw_operation_id = entry.get("operation_id")
            if isinstance(raw_operation_id, str) and self._has_legacy_provider_platform_token(raw_operation_id):
                messages.append(
                    f"api contract {key} must not use legacy {self.LEGACY_PROVIDER_PLATFORM_CAMEL} operation_id; "
                    "use oauth resource operation ids"
                )
            raw_sdk_domain = entry.get("sdk_domain")
            if isinstance(raw_sdk_domain, str) and self._has_legacy_provider_platform_token(raw_sdk_domain):
                messages.append(
                    f"api contract {key} must not use legacy {self.LEGACY_PROVIDER_PLATFORM_CAMEL} sdk_domain; "
                    "use iam for appbase OAuth or the product owner domain"
                )

            if isinstance(route, str):
                if route.startswith("/admin") and api_surface != "backend":
                    messages.append(f"api contract {key} route {route} must use backend api_surface")
                elif not route.startswith("/admin") and api_surface == "backend":
                    messages.append(f"api contract {key} route {route} must not use backend api_surface")
            if is_app_backend_openapi_operation:
                if isinstance(operation_id, str):
                    operation_id_key = (api_surface, operation_id)
                    existing_operation = operation_ids.get(operation_id_key)
                    if existing_operation is not None and existing_operation != key:
                        messages.append(
                            f"duplicate OpenAPI operation_id on {api_surface} {operation_id}: "
                            f"{existing_operation} and {key}"
                        )
                    else:
                        operation_ids[operation_id_key] = key
                method = api_method.upper() if isinstance(api_method, str) else ""
                if method == "GET" and "query_parameters" not in entry:
                    messages.append(
                        f"api contract {key} GET operations must explicitly declare query_parameters, "
                        "use [] when there are no query inputs"
                    )
                if method in {"POST", "PUT", "PATCH"} and not isinstance(entry.get("request_schema"), dict):
                    if entry.get("request_body_required") is not False:
                        messages.append(
                            f"api contract {key} {method} operations without request_schema must explicitly set "
                            "request_body_required: false"
                        )
                request_content_type = self._string(entry.get("request_content_type"))
                if request_content_type and request_content_type not in self.VALID_REQUEST_CONTENT_TYPES:
                    messages.append(
                        f"api contract {key} request_content_type must be one of "
                        f"{', '.join(sorted(self.VALID_REQUEST_CONTENT_TYPES))}"
                    )
                if not isinstance(entry.get("response_schema"), dict):
                    messages.append(f"api contract {key} must explicitly declare response_schema")

            read_sources = entry.get("read_sources")
            if not isinstance(read_sources, list) or not all(isinstance(item, str) for item in read_sources):
                messages.append(f"api contract {key} must declare read_sources as string list")
            else:
                messages.extend(self._legacy_provider_platform_table_messages(key, "read_sources", read_sources))
            write_tables = entry.get("write_tables", [])
            if write_tables and (not isinstance(write_tables, list) or not all(isinstance(item, str) for item in write_tables)):
                messages.append(f"api contract {key} write_tables must be a string list")
            elif isinstance(write_tables, list):
                messages.extend(self._legacy_provider_platform_table_messages(key, "write_tables", write_tables))
            file_targets = entry.get("file_targets", [])
            if file_targets and (not isinstance(file_targets, list) or not all(isinstance(item, str) for item in file_targets)):
                messages.append(f"api contract {key} file_targets must be a string list")
            messages.extend(self._query_parameter_validation_messages(key, entry.get("query_parameters")))
            for field in ("request_schema", "response_schema"):
                messages.extend(self._payload_schema_validation_messages(key, field, entry.get(field)))

        return ApiContractManifestCheckResult(ok=not messages, messages=messages)

    def _compile_operation(self, entry: dict[str, Any]) -> dict[str, Any]:
        source = self._string(entry.get("source"))
        operation = self._string(entry.get("operation"))
        route = self._string(entry.get("route"))
        api_surface = self._string(entry.get("api_surface"))
        api_method = self._string(entry.get("api_method")).upper()
        raw_api_path = self._string(entry.get("api_path"))
        boundary = self.SDK_BOUNDARIES.get(api_surface, self.SDK_BOUNDARIES["app"])
        read_sources = self._string_list(entry.get("read_sources"))
        write_tables = self._string_list(entry.get("write_tables"))
        file_targets = self._string_list(entry.get("file_targets"))
        api_path = self._standard_api_path(
            api_surface=api_surface,
            api_path=raw_api_path,
            api_method=api_method,
            kind=self._string(entry.get("kind")),
            read_sources=read_sources,
            write_tables=write_tables,
            fallback_operation=operation,
        )
        tag = self._standard_tag(
            api_surface=api_surface,
            api_path=api_path,
            read_sources=read_sources,
            write_tables=write_tables,
        )
        sdk_domain = self._standard_sdk_domain(entry, tag, read_sources, write_tables)
        operation_id = self._standard_operation_id(
            entry=entry,
            api_surface=api_surface,
            api_method=api_method,
            api_path=api_path,
            tag=tag,
            fallback_operation=operation,
        )

        compiled = {
            "key": self._operation_key(source, operation, route),
            "source": source,
            "operation": operation,
            "operation_id": operation_id,
            "route": route,
            "route_scope": self._route_scope(route),
            "module": self._module_name(source, route),
            "kind": self._string(entry.get("kind")),
            "api_surface": api_surface,
            "api_method": api_method,
            "api_path": api_path,
            "tag": tag,
            "path_params": self.PATH_PARAM_PATTERN.findall(api_path),
            "sdk_family": boundary["sdk_family"],
            "sdk_client": boundary["sdk_client"],
            "sdk_api_prefix": boundary["api_prefix"],
            "sdk_domain": sdk_domain,
            "openapi_exposed": entry.get("openapi_exposed", True) is not False,
            "idempotency_required": bool(entry.get("idempotency_required")),
            "request_id_header": bool(entry.get("request_id_header")),
            "request_body_required": entry.get("request_body_required"),
            "read_sources": read_sources,
            "write_tables": write_tables,
            "file_targets": file_targets,
            "query_parameters_declared": "query_parameters" in entry,
            "query_parameters": self._normalize_query_parameters(entry.get("query_parameters")),
        }
        description = self._string(entry.get("description"))
        if description:
            compiled["description"] = description
        summary = self._string(entry.get("summary"))
        if summary:
            compiled["summary"] = summary
        request_content_type = self._string(entry.get("request_content_type"))
        if request_content_type:
            compiled["request_content_type"] = request_content_type
        request_schema = self._normalize_payload_schema(entry.get("request_schema"))
        if request_schema is not None:
            compiled["request_schema"] = request_schema
        response_schema = self._normalize_payload_schema(entry.get("response_schema"))
        if response_schema is not None:
            compiled["response_schema"] = response_schema
        return compiled

    def _frontend_operations(self) -> list[Any]:
        contract = self._load_contract()
        operations = contract.get("frontend_operations", [])
        if operations is None:
            return []
        if not isinstance(operations, list):
            raise ValueError("frontend_operations must be a list")
        return operations

    def _load_contract(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend field contracts") from _YAML_IMPORT_ERROR
        contract = load_frontend_field_contract(self.root, self.contract_path)
        if not isinstance(contract, dict):
            raise ValueError("frontend field contract root must be a mapping")
        return contract

    def _allowed_methods(self, kind: str, api_surface: str) -> set[str]:
        return set(self.KIND_METHODS[kind])

    def _invalid_path_param(self, api_path: str) -> str | None:
        for raw in re.findall(r"\{([^}]*)\}", api_path):
            if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", raw):
                return raw
        return None

    def _legacy_provider_platform_table_messages(self, key: str, field: str, values: list[Any]) -> list[str]:
        messages: list[str] = []
        for value in values:
            if isinstance(value, str) and self._has_legacy_provider_platform_token(value):
                messages.append(
                    f"api contract {key} {field} must not use legacy {self.LEGACY_PROVIDER_PLATFORM_SNAKE} table name: {value}"
                )
        return messages

    def _has_legacy_provider_platform_token(self, value: str) -> bool:
        return self.LEGACY_PROVIDER_PLATFORM_PATTERN.search(value) is not None

    def _standard_api_path(
        self,
        *,
        api_surface: str,
        api_path: str,
        api_method: str,
        kind: str,
        read_sources: list[str],
        write_tables: list[str],
        fallback_operation: str,
    ) -> str:
        if api_surface not in self.APP_BACKEND_SURFACES:
            return api_path
        boundary = self.SDK_BOUNDARIES.get(api_surface)
        prefix = boundary["api_prefix"] if boundary else ""
        if not prefix or not api_path.startswith(prefix):
            return api_path

        segments = self._relative_path_segments(api_surface, api_path)
        if not segments:
            return api_path
        if self._is_standard_promotion_resource_path(segments):
            return api_path
        if api_surface == "app" and self._is_standard_appbase_resource_path(segments):
            return api_path
        tag = self._tag_from_segments(segments, read_sources, write_tables)
        canonical_segments = self._canonical_resource_segments(
            segments=segments,
            tag=tag,
            api_method=api_method,
            kind=kind,
            fallback_operation=fallback_operation,
        )
        if canonical_segments and canonical_segments[0] == tag:
            relative_segments = canonical_segments
        else:
            relative_segments = [self._path_segment_from_tag(tag), *canonical_segments]
        return prefix + "/" + "/".join(relative_segments)

    def _is_standard_promotion_resource_path(self, segments: list[str]) -> bool:
        return bool(segments) and self._normalize_static_segment(segments[0]) == "promotions"

    def _is_standard_appbase_resource_path(self, segments: list[str]) -> bool:
        return bool(segments) and self._normalize_static_segment(segments[0]) in {
            "agent",
            "agents",
            "auth",
            "chat",
            "iam",
            "memory",
            "oauth",
            "runtime",
            "system",
        }

    def _standard_tag(
        self,
        *,
        api_surface: str,
        api_path: str,
        read_sources: list[str],
        write_tables: list[str],
    ) -> str:
        if api_surface not in self.APP_BACKEND_SURFACES:
            return self._tag(api_surface, api_path)
        segments = self._relative_path_segments(api_surface, api_path)
        if not segments:
            return "system"
        tag = self._tag_from_segments(segments, read_sources, write_tables)
        if self.STANDARD_TAG_DOMAINS.get(tag) == "commerce":
            return "commerce"
        return tag if tag in self.TOP_LEVEL_TAGS else self._tag_from_tables(read_sources, write_tables) or "system"

    def _standard_sdk_domain(
        self,
        entry: dict[str, Any],
        tag: str,
        read_sources: list[str],
        write_tables: list[str],
    ) -> str:
        explicit = self._canonical_domain(self._string(entry.get("sdk_domain")))
        if explicit:
            return explicit
        tag_domain = self.STANDARD_TAG_DOMAINS.get(tag)
        if tag_domain:
            return tag_domain
        table_tag = self._tag_from_tables(read_sources, write_tables)
        if table_tag:
            return self.STANDARD_TAG_DOMAINS.get(table_tag, "")
        return ""

    def _standard_operation_id(
        self,
        *,
        entry: dict[str, Any],
        api_surface: str,
        api_method: str,
        api_path: str,
        tag: str,
        fallback_operation: str,
    ) -> str:
        if api_surface not in self.APP_BACKEND_SURFACES:
            return self._string(entry.get("operation_id")) or fallback_operation
        explicit = self._string(entry.get("operation_id"))
        if self._valid_standard_operation_id(explicit):
            return explicit
        segments = self._relative_path_segments(api_surface, api_path)
        if segments and segments[0] == self._path_segment_from_tag(tag):
            segments = segments[1:]
        kind = self._string(entry.get("kind"))
        last_segment_is_path_param = bool(segments) and self._is_path_param(segments[-1])
        resource_segments, explicit_action = self._operation_resource_segments(segments, api_method, kind)
        action = explicit_action or self._default_action(api_method, resource_segments, kind)
        if api_method == "GET" and last_segment_is_path_param and action == "list":
            action = "retrieve"
        if api_method == "DELETE" and explicit_action in {"like", "pin"}:
            action = f"un{explicit_action}"
        resource_segments = self._trim_action_like_resource_segments(resource_segments, action)
        if not resource_segments:
            resource_segments = [self._resource_from_operation(fallback_operation) or "operations"]
        operation_id = ".".join([*resource_segments, action])
        return operation_id

    def _valid_standard_operation_id(self, value: Any) -> bool:
        return (
            isinstance(value, str)
            and bool(value)
            and re.match(r"^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$", value) is not None
            and "__" not in value
        )

    def _relative_path_segments(self, api_surface: str, api_path: str) -> list[str]:
        boundary = self.SDK_BOUNDARIES.get(api_surface)
        prefix = boundary["api_prefix"] if boundary else ""
        path = api_path[len(prefix) :] if prefix and api_path.startswith(prefix) else api_path
        return [segment for segment in path.split("/") if segment]

    def _tag_from_segments(self, segments: list[str], read_sources: list[str], write_tables: list[str]) -> str:
        static_segments = [segment for segment in segments if not self._is_path_param(segment)]
        if not static_segments:
            return self._tag_from_tables(read_sources, write_tables) or "system"
        first = self._normalize_static_segment(static_segments[0])
        if first == "router":
            router_segments = static_segments[1:]
            router_tag = self._tag_from_router_segments(router_segments, read_sources, write_tables)
            return router_tag or self._tag_from_tables(read_sources, write_tables) or "ai"
        if first in {"auth", "iam", "oauth", "profile"}:
            return "iam"
        if first in {"system", "storage"}:
            return first
        if first in {"service_provider", "service_providers", "serviceprovider", "serviceproviders"}:
            return "serviceProviders"
        if first in {"site", "sites"}:
            return "sites"
        if first in {"app", "apps", "platform"}:
            return "platform"
        if first in {"skill", "skills", "ecosystem"}:
            return "ecosystem"
        if first in {
            "accounts",
            "addresses",
            "audit",
            "billing",
            "catalog",
            "cart",
            "checkout",
            "commerce",
            "commerce_reports",
            "coupons",
            "fulfillments",
            "inventory",
            "invoices",
            "memberships",
            "orders",
            "payments",
            "recharges",
            "refunds",
            "shipments",
            "wallet",
        }:
            return first
        if first in {"coupon", "payment", "vip", "account", "finance"}:
            return self._tag_from_tables(read_sources, write_tables) or "commerce"
        if first in {"feed", "feeds", "comment", "comments", "announcement", "announcements", "content"}:
            return "content"
        if first in {"messaging", "message_delivery", "sms", "email"}:
            return "messaging"
        if first in {"notification", "notifications"}:
            return "notification"
        if first in {"message", "messages", "communication"}:
            return "communication"
        if first in {"channel", "channels", "provider", "providers", "provider_secrets", "integration"}:
            return "integration"
        if first in {"agent", "agents"}:
            return "agents"
        if first in {"sdk_reference", "sdk-reference", "sdkreference"}:
            return "sdkReference"
        if first in {"chat", "mcp", "memory", "prompts", "runtime"}:
            return first
        if first in {"ai", "model", "models", "model_vendors", "model_rankings", "routing", "playground"}:
            return "ai"
        if first in {"dashboard", "monitor", "firewall", "rate_limits", "record", "records"}:
            return "system"
        return self._tag_from_tables(read_sources, write_tables) or self._lower_camel_segment(first)

    def _tag_from_router_segments(
        self,
        segments: list[str],
        read_sources: list[str],
        write_tables: list[str],
    ) -> str:
        first = self._normalize_static_segment(segments[0]) if segments else ""
        if first in self.ROUTER_IAM_SEGMENTS:
            return "iam"
        if first in self.ROUTER_CONTENT_SEGMENTS:
            return "content"
        if first in self.ROUTER_SYSTEM_SEGMENTS:
            return "system"
        if first in self.ROUTER_AI_SEGMENTS:
            return "ai"
        return self._tag_from_tables(read_sources, write_tables)

    def _tag_from_tables(self, read_sources: list[str], write_tables: list[str]) -> str:
        tables = [*read_sources, *write_tables]
        for table in tables:
            normalized = table.lower()
            for prefix, tag in self.TABLE_TAG_RULES:
                if normalized == prefix.rstrip("_") or normalized.startswith(prefix):
                    return tag
        return ""

    def _canonical_domain(self, value: str) -> str:
        if not value:
            return ""
        normalized = self._lower_camel_segment(value)
        return self.DOMAIN_ALIASES.get(normalized, normalized if normalized in set(self.DOMAIN_ALIASES.values()) else "")

    def _canonical_resource_segments(
        self,
        *,
        segments: list[str],
        tag: str,
        api_method: str,
        kind: str,
        fallback_operation: str,
    ) -> list[str]:
        static_segments = list(segments)
        if static_segments and self._normalize_static_segment(static_segments[0]) == "router":
            static_segments = static_segments[1:]
        if static_segments:
            first = self._normalize_static_segment(static_segments[0])
            if self._is_top_level_path_segment_for_tag(first, tag):
                static_segments = static_segments[1:]

        result: list[str] = []
        for index, segment in enumerate(static_segments):
            if self._is_path_param(segment):
                result.append(self._normalize_path_param_segment(segment))
                continue
            normalized = self._normalize_static_segment(segment)
            normalized = self._canonical_static_segment(normalized, result, index, api_method, kind)
            if not normalized:
                continue
            result.append(normalized)
        operation_action = self._operation_action(fallback_operation, kind, api_method)
        if operation_action:
            result = self._replace_terminal_action_segment(result, operation_action)
        return result

    def _canonical_static_segment(
        self,
        segment: str,
        prior_segments: list[str],
        index: int,
        api_method: str,
        kind: str,
    ) -> str:
        alias = self.STATIC_SEGMENT_ALIASES.get(segment, segment)
        if alias in {"my", "mine"}:
            return "current"
        if alias in {"list", "search"}:
            return ""
        if alias in self.DETAIL_SEGMENTS:
            return ""
        if alias == "test":
            return "verify"
        if alias in {"sync", "import"}:
            return "refresh"
        if alias == "offline":
            return "unpublish"
        return alias

    def _is_top_level_path_segment_for_tag(self, segment: str, tag: str) -> bool:
        normalized_segment = self._normalize_static_segment(segment)
        normalized_tag_segment = self._normalize_static_segment(self._path_segment_from_tag(tag))
        normalized_top_level_tags = {self._normalize_static_segment(value) for value in self.TOP_LEVEL_TAGS}
        return normalized_segment == normalized_tag_segment or normalized_segment in normalized_top_level_tags

    def _path_segment_from_tag(self, tag: str) -> str:
        if tag == "ai":
            return "ai"
        if tag == "sdkReference":
            return "sdk_reference"
        if tag == "serviceProviders":
            return "service_providers"
        return tag

    def _operation_resource_segments(
        self,
        path_segments: list[str],
        api_method: str,
        kind: str,
    ) -> tuple[list[str], str]:
        resource_segments: list[str] = []
        explicit_action = ""
        for segment in path_segments:
            if self._is_path_param(segment):
                continue
            normalized = self._normalize_static_segment(segment)
            if normalized == "list" and kind == "read":
                explicit_action = self._read_collection_action(api_method)
                continue
            if not normalized or normalized == "list":
                continue
            if normalized in self.DETAIL_SEGMENTS:
                continue
            if normalized == "my":
                normalized = "mine"
            if normalized in self.ACTION_SEGMENTS:
                explicit_action = normalized
                continue
            if normalized in self.READ_ACTION_SEGMENTS:
                explicit_action = normalized
                continue
            resource_segments.append(self._lower_camel_segment(normalized))
        return resource_segments, explicit_action

    def _operation_action(self, operation: str, kind: str, api_method: str) -> str:
        words = [word.lower() for word in self._operation_words(operation)]
        if not words:
            return ""

        joined = "_".join(words)
        method = api_method.upper()
        for action in sorted(self.ACTION_SEGMENTS | self.READ_ACTION_SEGMENTS, key=len, reverse=True):
            action_words = action.split("_")
            action_joined = "".join(action_words)
            if words[0] == action or words[0] == action_joined or joined.startswith(action_joined):
                return self._lower_camel_segment(action)

        verb = words[0]
        if verb in {"fetch", "list", "query"}:
            return self._read_collection_action(api_method) if kind == "read" else "list"
        if verb in {"search"}:
            return self._read_collection_action(api_method) if kind == "read" else ""
        if verb in {"get", "load", "read"}:
            return "retrieve"
        if verb == "check":
            return "retrieve" if kind == "read" else "verify"
        if verb in {"create", "add", "submit", "register"}:
            return "create"
        if verb in {"update", "edit", "patch", "set"}:
            return "update"
        if verb in {"delete", "remove"}:
            return "delete"
        if verb in {"sync", "import"}:
            return "refresh"
        if kind == "read":
            return "retrieve" if method == "GET" else self._read_collection_action(api_method)
        return ""

    def _replace_terminal_action_segment(self, segments: list[str], operation_action: str) -> list[str]:
        if not segments:
            return segments
        normalized_action = self._normalize_static_segment(operation_action)
        if normalized_action not in self.ACTION_SEGMENTS and normalized_action not in self.READ_ACTION_SEGMENTS:
            return segments

        result = list(segments)
        for index in range(len(result) - 1, -1, -1):
            segment = result[index]
            if self._is_path_param(segment):
                continue
            normalized = self._normalize_static_segment(segment)
            if normalized_action.startswith("un") and normalized == normalized_action[2:]:
                return result
            if normalized in self.ACTION_SEGMENTS or normalized in self.READ_ACTION_SEGMENTS:
                result[index] = normalized_action
            break
        return result

    def _default_action(self, api_method: str, resource_segments: list[str], kind: str = "") -> str:
        method = api_method.upper()
        if method == "GET":
            return "retrieve" if self._looks_like_singleton_resource(resource_segments) else "list"
        if method == "POST" and kind == "read":
            return self._read_collection_action(api_method)
        if method == "POST":
            return "create"
        if method in {"PUT", "PATCH"}:
            return "update"
        if method == "DELETE":
            return "delete"
        return "execute"

    def _read_collection_action(self, api_method: str) -> str:
        return "list"

    def _trim_action_like_resource_segments(self, resource_segments: list[str], action: str) -> list[str]:
        if not resource_segments:
            return resource_segments
        last = resource_segments[-1]
        if last == action:
            return resource_segments[:-1]
        if action.startswith("un") and len(action) > 2 and last == action[2:]:
            return resource_segments[:-1]
        return resource_segments

    def _looks_like_singleton_resource(self, resource_segments: list[str]) -> bool:
        if not resource_segments:
            return False
        return resource_segments[-1] in {"current", "mine", "status", "overview", "summary", "settings", "detail"}

    def _resource_from_operation(self, operation: str) -> str:
        words = self._operation_words(operation)
        if len(words) <= 1:
            return ""
        resource_words = [
            word.lower()
            for word in words[1:]
            if word.lower() not in {"by", "for", "and"}
        ]
        return self._lower_camel_segment("_".join(resource_words)) if resource_words else ""

    def _operation_words(self, value: str) -> list[str]:
        spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value or "")
        spaced = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", spaced)
        return [word for word in re.split(r"[^A-Za-z0-9]+", spaced) if word]

    def _normalize_static_segment(self, segment: str) -> str:
        segment = segment.strip()
        if not segment:
            return ""
        if self._is_path_param(segment):
            return segment
        value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", segment)
        value = re.sub(r"[^A-Za-z0-9]+", "_", value)
        value = re.sub(r"_+", "_", value).strip("_").lower()
        return value

    def _normalize_path_param_segment(self, segment: str) -> str:
        name = segment[1:-1]
        return "{" + self._lower_camel_segment(name) + "}"

    def _is_path_param(self, segment: str) -> bool:
        return segment.startswith("{") and segment.endswith("}")

    def _valid_operation_id(self, value: Any) -> bool:
        return (
            isinstance(value, str)
            and bool(value)
            and re.match(r"^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$", value) is not None
        )

    def _payload_schema_validation_messages(self, key: str, field: str, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, dict):
            return [f"api contract {key} {field} must be an object"]

        messages: list[str] = []
        name = value.get("name")
        if not isinstance(name, str) or not self.PAYLOAD_SCHEMA_NAME_PATTERN.match(name):
            messages.append(f"api contract {key} {field}.name must be PascalCase")
        elif name in self.RESERVED_PAYLOAD_SCHEMA_NAMES and name not in self.STANDARD_PAYLOAD_SCHEMA_NAMES:
            messages.append(f"api contract {key} {field}.name must not use reserved schema name {name}")

        schema = value.get("schema")
        schema_source = schema if isinstance(schema, dict) else value
        schema_type = self._string(schema_source.get("type")) or "object" if isinstance(schema_source, dict) else "object"
        if schema_type == "array":
            items = schema_source.get("items") if isinstance(schema_source, dict) else None
            if not isinstance(items, dict):
                messages.append(f"api contract {key} {field}.items must be an object")
            else:
                messages.extend(self._payload_object_property_validation_messages(key, f"{field}.items", items))
        else:
            messages.extend(self._payload_object_property_validation_messages(key, field, schema_source))

        required = schema_source.get("required") if isinstance(schema_source, dict) else None
        if required is not None and (not isinstance(required, list) or not all(isinstance(item, str) for item in required)):
            messages.append(f"api contract {key} {field}.required must be a string list")
        return messages

    def _query_parameter_validation_messages(self, key: str, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            return [f"api contract {key} query_parameters must be a list"]

        messages: list[str] = []
        names: set[str] = set()
        for index, parameter in enumerate(value):
            if not isinstance(parameter, dict):
                messages.append(f"api contract {key} query_parameters[{index}] must be an object")
                continue
            name = parameter.get("name")
            if not isinstance(name, str):
                messages.append(
                    f"api contract {key} query_parameters[{index}].name must be lower_snake_case URL parameter"
                )
            elif name in self.STANDARD_QUERY_PARAMETER_ALIASES:
                standard_name, meaning = self.STANDARD_QUERY_PARAMETER_ALIASES[name]
                messages.append(
                    f"api contract {key} query_parameters[{index}].name must use {standard_name} for {meaning}"
                )
            elif not re.match(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$", name):
                messages.append(
                    f"api contract {key} query_parameters[{index}].name must be lower_snake_case URL parameter"
                )
            elif name in names:
                messages.append(f"api contract {key} query_parameters duplicate name: {name}")
            else:
                names.add(name)

            location = parameter.get("in", "query")
            if location != "query":
                messages.append(f"api contract {key} query_parameters[{index}].in must be query")

            required = parameter.get("required", False)
            if not isinstance(required, bool):
                messages.append(f"api contract {key} query_parameters[{index}].required must be boolean")

            schema = parameter.get("schema")
            if schema is not None and not isinstance(schema, dict):
                messages.append(f"api contract {key} query_parameters[{index}].schema must be an object")
        return messages

    def _payload_object_property_validation_messages(
        self,
        key: str,
        field: str,
        schema_source: Any,
    ) -> list[str]:
        if not isinstance(schema_source, dict):
            return [f"api contract {key} {field}.properties must be an object"]
        if isinstance(schema_source.get("$ref"), str):
            return []
        schema_type = self._string(schema_source.get("type")) or "object"
        if schema_type != "object":
            return []

        properties = schema_source.get("properties")
        if not isinstance(properties, dict):
            return [f"api contract {key} {field}.properties must be an object"]

        messages: list[str] = []
        for property_name, property_schema in properties.items():
            if not isinstance(property_name, str) or not property_name:
                messages.append(f"api contract {key} {field}.properties keys must be non-empty strings")
            if not isinstance(property_schema, dict):
                messages.append(f"api contract {key} {field}.properties.{property_name} must be an object")
            elif self._is_search_text_property_alias(property_name, property_schema):
                messages.append(
                    f"api contract {key} {field}.properties.{property_name} must use q for search text"
                )
        return messages

    def _is_search_text_property_alias(self, property_name: str, property_schema: dict[str, Any]) -> bool:
        if property_name not in {"keyword", "search", "search_query", "searchQuery"}:
            return False
        schema_type, _ = self._normalize_schema_type(property_schema.get("type"))
        if schema_type and schema_type != "string":
            return False
        return True

    def _normalize_payload_schema(self, value: Any) -> dict[str, Any] | None:
        if not isinstance(value, dict) or not isinstance(value.get("name"), str):
            return None

        raw_schema = value.get("schema")
        schema_source = raw_schema if isinstance(raw_schema, dict) else value
        if not isinstance(schema_source, dict):
            return None

        schema = self._normalize_json_schema(schema_source)
        if not isinstance(schema, dict):
            return None
        return {
            "name": value["name"],
            "schema": schema,
        }

    def _normalize_json_schema(self, value: Any) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        if isinstance(value.get("$ref"), str):
            return {"$ref": value["$ref"]}

        schema: dict[str, Any] = {}
        name = value.get("name")
        if isinstance(name, str) and self.PAYLOAD_SCHEMA_NAME_PATTERN.match(name):
            schema["name"] = name

        schema_type, type_nullable = self._normalize_schema_type(value.get("type"))
        if schema_type:
            schema["type"] = schema_type
        elif isinstance(value.get("properties"), dict):
            schema["type"] = "object"
        if type_nullable:
            schema["nullable"] = True

        additional_properties = value.get("additionalProperties")
        if isinstance(additional_properties, bool):
            schema["additionalProperties"] = additional_properties
        elif isinstance(additional_properties, dict):
            normalized = self._normalize_json_schema(additional_properties)
            if normalized is not None:
                schema["additionalProperties"] = normalized

        properties = value.get("properties")
        if isinstance(properties, dict):
            schema.setdefault("type", "object")
            schema.setdefault("additionalProperties", False)
            schema["properties"] = {
                property_name: normalized
                for property_name, property_schema in properties.items()
                if isinstance(property_name, str)
                for normalized in [self._normalize_json_schema(property_schema)]
                if normalized is not None
            }

        required = value.get("required")
        if isinstance(required, list):
            schema["required"] = [item for item in required if isinstance(item, str)]

        description = value.get("description")
        if isinstance(description, str) and description:
            schema["description"] = description

        for key in sorted(self.JSON_SCHEMA_CONSTRAINT_KEYS):
            if key in {"$ref", "additionalProperties", "description", "properties", "required", "type"}:
                continue
            if key in value:
                normalized = self._normalize_schema_constraint_value(value[key])
                if normalized is not None:
                    schema[key] = normalized

        self._normalize_int64_json_schema(schema)
        return schema if schema else None

    def _normalize_int64_json_schema(self, schema: dict[str, Any]) -> None:
        if schema.get("format") != "int64":
            return

        schema_type = schema.get("type")
        if isinstance(schema_type, list):
            schema["type"] = ["string" if item in {"integer", "number"} else item for item in schema_type]
        elif schema_type in {"integer", "number", "string"}:
            schema["type"] = "string"
        elif schema_type is None:
            schema["type"] = "string"
        else:
            return

        schema.setdefault("pattern", self._int64_string_pattern(schema))
        schema["x-sdkwork-int64-string"] = True
        schema.setdefault("x-sdkwork-rust-type", "i64")
        for numeric_constraint in (
            "minimum",
            "maximum",
            "exclusiveMinimum",
            "exclusiveMaximum",
            "multipleOf",
        ):
            schema.pop(numeric_constraint, None)

    def _int64_string_pattern(self, schema: dict[str, Any]) -> str:
        minimum = schema.get("minimum")
        exclusive_minimum = schema.get("exclusiveMinimum")
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

    def _normalize_schema_type(self, value: Any) -> tuple[str, bool]:
        if isinstance(value, str):
            return value, False
        if not isinstance(value, list):
            return "", False

        types = [item for item in value if isinstance(item, str)]
        non_null_types = [item for item in types if item != "null"]
        nullable = len(non_null_types) != len(types)
        if len(non_null_types) != 1:
            return "", nullable
        return non_null_types[0], nullable

    def _normalize_schema_constraint_value(self, value: Any) -> Any:
        if isinstance(value, dict):
            return self._normalize_json_schema(value)
        if isinstance(value, list):
            result: list[Any] = []
            for item in value:
                if isinstance(item, dict):
                    normalized = self._normalize_json_schema(item)
                    if normalized is not None:
                        result.append(normalized)
                elif isinstance(item, (str, int, float, bool)) or item is None:
                    result.append(item)
            return result
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return None

    def _normalize_query_parameters(self, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []

        result: list[dict[str, Any]] = []
        seen: set[str] = set()
        for parameter in value:
            if not isinstance(parameter, dict):
                continue
            name = parameter.get("name")
            if not isinstance(name, str) or not re.match(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$", name):
                continue
            if name in seen:
                continue
            seen.add(name)

            normalized: dict[str, Any] = {
                "name": name,
                "in": "query",
                "required": bool(parameter.get("required", False)),
                "schema": self._normalize_json_schema(parameter.get("schema"))
                if isinstance(parameter.get("schema"), dict)
                else {"type": "string"},
            }
            description = parameter.get("description")
            if isinstance(description, str) and description:
                normalized["description"] = description
            style = parameter.get("style")
            if isinstance(style, str) and style:
                normalized["style"] = style
            if "explode" in parameter:
                normalized["explode"] = bool(parameter.get("explode"))
            if "allowReserved" in parameter:
                normalized["allowReserved"] = bool(parameter.get("allowReserved"))
            if "deprecated" in parameter:
                normalized["deprecated"] = bool(parameter.get("deprecated"))
            result.append(normalized)
        return result

    def _module_name(self, source: str, route: str) -> str:
        parts = source.replace("\\", "/").split("/")
        if "packages" in parts:
            package_index = parts.index("packages") + 1
            if package_index < len(parts):
                package = parts[package_index]
                prefix = "sdkwork-clawrouter-"
                if package.startswith(prefix):
                    return package[len(prefix) :]
                return package
        route_parts = [part for part in route.split("/") if part]
        if route_parts:
            return route_parts[-1]
        return "root"

    def _tag(self, api_surface: str, api_path: str) -> str:
        boundary = self.SDK_BOUNDARIES.get(api_surface)
        prefix = boundary["api_prefix"] if boundary else ""
        path = api_path[len(prefix) :] if prefix and api_path.startswith(prefix) else api_path
        segments = [segment for segment in path.split("/") if segment and not segment.startswith("{")]
        if not segments:
            return "root"
        if api_surface == "backend" and segments[0] == "router" and len(segments) > 1:
            return self._lower_camel_segment(segments[1])
        return self._lower_camel_segment(segments[0])

    def _lower_camel_segment(self, segment: str) -> str:
        parts = [part for part in re.split(r"[^A-Za-z0-9]+", segment) if part]
        if not parts:
            return "root"
        first = parts[0][0].lower() + parts[0][1:]
        rest = "".join(part[0].upper() + part[1:] for part in parts[1:])
        return first + rest

    def _route_scope(self, route: str) -> str:
        if route.startswith("/admin"):
            return "admin"
        if route.startswith("/console"):
            return "console"
        return "public"

    def _operation_key(self, source: Any, operation: Any, route: Any = None) -> str:
        base = f"{self._string(source)}#{self._string(operation)}"
        route_value = self._string(route)
        if route_value:
            return f"{base}@{route_value}"
        return base

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _increment(self, counter: dict[str, int], key: str) -> None:
        counter[key] = counter.get(key, 0) + 1

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate sdkwork-clawrouter API contract manifest.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--contract", type=Path, default=None, help="frontend field contract YAML path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="output path; defaults to generated/api/api-contract-manifest.json",
    )
    parser.add_argument("--check", action="store_true", help="validate that the generated API contract manifest is current")
    args = parser.parse_args()

    generator = ApiContractManifestGenerator(root=args.root, contract_path=args.contract, output_path=args.output)
    if args.check:
        result = generator.check(args.output)
        if result.ok:
            print("API contract manifest is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    try:
        output = generator.write(args.output)
    except ValueError as exc:
        print(exc)
        return 1
    print(f"Wrote API contract manifest to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
