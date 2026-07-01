"""Hydrate relay portal frontend_models and service operations from generated audit snapshots."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None

from tools.bootstrap_frontend_contract_from_route_manifest import bootstrap_contract
from tools.relay_retired_admin_surfaces import (
    is_relay_retired_admin_operation_route,
    is_relay_retired_admin_portal_route,
    is_relay_retired_admin_source,
    is_route_manifest_bootstrap_source,
)

WRITE_KINDS = frozenset({"create", "update", "delete", "action", "sync"})

ROUTE_TABLE_SUPPLEMENTS: dict[str, tuple[str, ...]] = {
    "/admin/dashboard": ("iam_user", "iam_organization_membership"),
    "/admin/group": ("ai_resource", "ai_resource_group_item"),
    "/admin/model/resources": ("ai_resource", "ai_resource_group", "ai_resource_group_item"),
}

ROUTE_CONTRACT_SUPPLEMENTS: tuple[dict[str, Any], ...] = (
    {
        "route": "/console/notifications",
        "required_tables": ["ops_audit_log"],
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
    },
    {
        "route": "/auth/login",
        "required_tables": [
            "iam_user",
            "iam_user_identity",
            "iam_credential",
            "iam_session",
            "iam_security_event",
            "iam_audit_event",
            "ops_config_snapshot",
        ],
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
    },
    {
        "route": "/auth/forgot-password",
        "required_tables": [
            "iam_user",
            "iam_user_identity",
            "iam_credential",
            "iam_security_event",
            "iam_audit_event",
        ],
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
    },
    {
        "route": "/auth/register",
        "required_tables": [
            "iam_user",
            "iam_user_identity",
            "iam_credential",
            "iam_session",
            "iam_security_event",
            "iam_audit_event",
        ],
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
    },
    {
        "route": "/auth/oauth/callback/:provider",
        "required_tables": [
            "iam_user",
            "iam_user_identity",
            "iam_session",
            "iam_security_event",
            "iam_audit_event",
            "ops_audit_log",
        ],
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
    },
)

FIELD_MODEL_SOURCE_ALIASES: dict[str, str] = {
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-commons/src/notificationService.ts": (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/notificationService.ts"
    ),
}


def _operation_priority(entry: dict[str, Any]) -> tuple[int, str]:
    source = str(entry.get("source", "")).replace("\\", "/")
    if is_route_manifest_bootstrap_source(source):
        return (10, source)
    if "clawRouterAuthController.ts" in source:
        return (1, source)
    if "/admin-" in source or "/sdkwork-models-pc-admin-" in source:
        return (2, source)
    if "sdkwork-clawrouter-pc-commons/src/notificationService.ts" in source:
        return (3, source)
    if "clawroutes-pc-commons/src/notificationService.ts" in source:
        return (4, source)
    if "clawroutes-pc-commons/src/sessionService.ts" in source:
        return (5, source)
    if "playground" in source:
        return (8, source)
    return (6, source)


def _finalize_openapi_exposure(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    path_winners: dict[tuple[str, str, str], str] = {}
    operation_id_winners: dict[tuple[str, str], str] = {}
    for entry in sorted(entries, key=_operation_priority):
        if is_route_manifest_bootstrap_source(str(entry.get("source", ""))):
            continue
        api_surface = entry.get("api_surface")
        api_method = entry.get("api_method")
        api_path = entry.get("api_path")
        operation_id = entry.get("operation_id")
        source = entry.get("source")
        operation = entry.get("operation")
        if not all(isinstance(value, str) for value in (api_surface, api_method, api_path, source, operation)):
            continue
        entry_key = f"{source}#{operation}"
        path_winners.setdefault((api_surface, api_method.upper(), api_path), entry_key)
        if isinstance(operation_id, str) and operation_id.strip():
            operation_id_winners.setdefault((api_surface, operation_id), entry_key)

    finalized: list[dict[str, Any]] = []
    for entry in entries:
        api_surface = entry.get("api_surface")
        api_method = entry.get("api_method")
        api_path = entry.get("api_path")
        operation_id = entry.get("operation_id")
        source = entry.get("source")
        operation = entry.get("operation")
        if all(isinstance(value, str) for value in (api_surface, api_method, api_path, source, operation)):
            entry_key = f"{source}#{operation}"
            path_owner = path_winners.get((api_surface, api_method.upper(), api_path))
            operation_id_owner = (
                operation_id_winners.get((api_surface, operation_id))
                if isinstance(operation_id, str)
                else None
            )
            if (
                (path_owner is not None and path_owner != entry_key)
                or (operation_id_owner is not None and operation_id_owner != entry_key)
            ):
                entry = {**entry, "openapi_exposed": False}
        finalized.append(entry)
    return finalized


def _contract_operation_key(entry: dict[str, Any]) -> str | None:
    source = entry.get("source")
    operation = entry.get("operation")
    if not isinstance(source, str) or not isinstance(operation, str):
        return None
    if is_route_manifest_bootstrap_source(source):
        api_surface = entry.get("api_surface")
        api_method = entry.get("api_method")
        api_path = entry.get("api_path")
        if all(isinstance(value, str) and value.strip() for value in (api_surface, api_method, api_path)):
            return f"{source}#{api_surface}#{api_method.upper()}#{api_path}"
        operation_id = entry.get("operation_id")
        if isinstance(operation_id, str) and operation_id.strip():
            return f"{source}#{operation_id}"
    return f"{source}#{operation}"


def _merge_contract_operations(
    service_operations: list[dict[str, Any]],
    bootstrap_operations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for entry in bootstrap_operations:
        key = _contract_operation_key(entry)
        if key is not None:
            merged[key] = entry
    for entry in service_operations:
        key = _contract_operation_key(entry)
        if key is not None:
            merged[key] = entry
    return _finalize_openapi_exposure(list(merged.values()))


def _route_tables(contract: dict[str, Any]) -> dict[str, list[str]]:
    route_tables: dict[str, list[str]] = {}
    routes = contract.get("routes", [])
    if not isinstance(routes, list):
        return route_tables
    for route_entry in routes:
        if not isinstance(route_entry, dict):
            continue
        route = route_entry.get("route")
        required_tables = route_entry.get("required_tables", [])
        if isinstance(route, str) and isinstance(required_tables, list):
            route_tables[route] = [table for table in required_tables if isinstance(table, str)]
    return route_tables


def _expand_route_tables(routes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_route: dict[str, dict[str, Any]] = {}
    for route_entry in routes:
        if isinstance(route_entry, dict) and isinstance(route_entry.get("route"), str):
            by_route[route_entry["route"]] = dict(route_entry)
    for route_entry in ROUTE_CONTRACT_SUPPLEMENTS:
        route = route_entry["route"]
        entry = by_route.setdefault(route, {"route": route, "required_tables": []})
        entry["dependency_owned"] = route_entry.get("dependency_owned", entry.get("dependency_owned"))
        entry["dependency_sdk_family"] = route_entry.get(
            "dependency_sdk_family",
            entry.get("dependency_sdk_family"),
        )
        tables = entry.setdefault("required_tables", [])
        if not isinstance(tables, list):
            tables = []
            entry["required_tables"] = tables
        for table in route_entry.get("required_tables", []):
            if isinstance(table, str) and table not in tables:
                tables.append(table)
    for route, supplements in ROUTE_TABLE_SUPPLEMENTS.items():
        entry = by_route.setdefault(route, {"route": route, "required_tables": []})
        tables = entry.setdefault("required_tables", [])
        if not isinstance(tables, list):
            tables = []
            entry["required_tables"] = tables
        for table in supplements:
            if table not in tables:
                tables.append(table)
    return sorted(by_route.values(), key=lambda item: str(item.get("route", "")))


def _clamp_operation_tables(entry: dict[str, Any], route_tables: dict[str, list[str]]) -> dict[str, Any]:
    route = entry.get("route")
    if not isinstance(route, str):
        return entry
    allowed = route_tables.get(route, [])
    if not allowed:
        return entry
    allowed_set = set(allowed)
    read_sources = entry.get("read_sources", [])
    if isinstance(read_sources, list):
        clamped = [item for item in read_sources if isinstance(item, str) and item in allowed_set]
        entry["read_sources"] = clamped or [allowed[0]]
    write_tables = entry.get("write_tables", [])
    if isinstance(write_tables, list) and write_tables:
        clamped_writes = [item for item in write_tables if isinstance(item, str) and item in allowed_set]
        if clamped_writes:
            entry["write_tables"] = clamped_writes
        elif "ops_audit_log" in allowed_set:
            entry["write_tables"] = ["ops_audit_log"]
        else:
            entry["write_tables"] = [allowed[0]]
    return entry


def _infer_sdk_domain(api_path: str, api_surface: str) -> str:
    relative = api_path
    for prefix in ("/backend/v3/api/", "/app/v3/api/"):
        if relative.startswith(prefix):
            relative = relative.removeprefix(prefix)
            break
    segment = relative.split("/", 1)[0] if relative else "router"
    if segment in {"ai", "system", "ops", "content", "iam"}:
        return segment
    if segment == "accounts":
        return "commerce"
    return segment or "router"


def _infer_operation_id(api_path: str, api_method: str, operation: str) -> str:
    relative = api_path
    for prefix in ("/backend/v3/api/", "/app/v3/api/"):
        if relative.startswith(prefix):
            relative = relative.removeprefix(prefix).strip("/")
            break
    if relative:
        slug = re.sub(r"\{[^}]+\}", "byId", relative)
        slug = re.sub(r"[^a-zA-Z0-9]+", ".", slug).strip(".")
        return f"{slug}.{api_method.lower()}" if slug else f"{operation}.{api_method.lower()}"
    return f"{operation}.{api_method.lower()}"


def _model_from_audit_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    source = entry.get("source")
    interface = entry.get("interface")
    route = entry.get("route")
    fields = entry.get("fields")
    if not isinstance(source, str) or not isinstance(interface, str) or not isinstance(route, str):
        return None
    if not isinstance(fields, list) or not all(isinstance(field, str) for field in fields):
        return None
    model: dict[str, Any] = {
        "route": route,
        "source": source,
        "interface": interface,
        "fields": fields,
    }
    data_sources = entry.get("data_sources", [])
    if isinstance(data_sources, list) and data_sources:
        model["data_sources"] = [item for item in data_sources if isinstance(item, str)]
    file_targets = entry.get("file_targets", [])
    if isinstance(file_targets, list) and file_targets:
        model["file_targets"] = [item for item in file_targets if isinstance(item, str)]
    return model


def _operation_from_audit_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    source = entry.get("source")
    operation = entry.get("operation")
    route = entry.get("route")
    kind = entry.get("kind")
    api_surface = entry.get("api_surface")
    api_method = entry.get("api_method")
    api_path = entry.get("api_path")
    if not all(isinstance(value, str) for value in (source, operation, route, kind, api_surface, api_method, api_path)):
        return None
    contract_entry: dict[str, Any] = {
        "route": route,
        "source": source,
        "operation": operation,
        "operation_id": _infer_operation_id(api_path, api_method, operation),
        "kind": kind,
        "api_surface": api_surface,
        "api_method": api_method,
        "api_path": api_path,
        "sdk_domain": _infer_sdk_domain(api_path, api_surface),
        "read_sources": [
            item
            for item in entry.get("read_sources", [])
            if isinstance(item, str)
        ]
        or ["ops_audit_log"],
        "response_schema": {"name": "NoData", "properties": {}},
    }
    if api_method.upper() == "GET":
        contract_entry["query_parameters"] = []
    if api_method.upper() in {"POST", "PUT", "PATCH"}:
        contract_entry["request_body_required"] = False
    write_tables = [item for item in entry.get("write_tables", []) if isinstance(item, str)]
    if kind in WRITE_KINDS:
        contract_entry["write_tables"] = write_tables or ["ops_audit_log"]
    file_targets = [item for item in entry.get("file_targets", []) if isinstance(item, str)]
    if file_targets:
        contract_entry["file_targets"] = file_targets
    operation_scope = entry.get("operation_scope")
    if isinstance(operation_scope, str) and operation_scope.strip():
        contract_entry["operation_scope"] = operation_scope
    return contract_entry


def _load_json_mapping(path: Path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"missing {label}: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{label} root must be a mapping")
    return payload


def _source_exists(root: Path, source: str) -> bool:
    return (root / source.replace("\\", "/")).is_file()


def hydrate_frontend_contract(root: Path) -> dict[str, Any]:
    root = root.resolve()
    field_audit_path = root / "generated" / "schema" / "frontend" / "frontend-field-audit.json"
    operation_audit_path = root / "generated" / "schema" / "frontend" / "frontend-operation-audit.json"
    contract_path = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"

    field_audit = _load_json_mapping(field_audit_path, "frontend field audit")
    operation_audit = _load_json_mapping(operation_audit_path, "frontend operation audit")

    existing: dict[str, Any] = {}
    if contract_path.is_file():
        existing = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
        if not isinstance(existing, dict):
            existing = {}

    payload = bootstrap_contract(root)
    if isinstance(existing.get("routes"), list):
        payload["routes"] = _expand_route_tables(existing["routes"])
    else:
        payload["routes"] = _expand_route_tables([])
    if isinstance(existing.get("x_response_entities"), dict):
        payload["x_response_entities"] = existing["x_response_entities"]

    route_tables = _route_tables(payload)

    frontend_models: list[dict[str, Any]] = []
    for entry in field_audit.get("interfaces", []):
        if not isinstance(entry, dict):
            continue
        source = entry.get("source")
        route = entry.get("route")
        if not isinstance(source, str) or not isinstance(route, str):
            continue
        if is_relay_retired_admin_source(source):
            continue
        if is_relay_retired_admin_portal_route(route):
            continue
        if not _source_exists(root, source):
            continue
        model = _model_from_audit_entry(entry)
        if model is not None:
            frontend_models.append(model)

    for alias_target, alias_source in FIELD_MODEL_SOURCE_ALIASES.items():
        if not _source_exists(root, alias_target) or not _source_exists(root, alias_source):
            continue
        for model in list(frontend_models):
            if model.get("source") == alias_source:
                frontend_models.append({**model, "source": alias_target})

    service_operations: list[dict[str, Any]] = []
    for entry in operation_audit.get("operations", []):
        if not isinstance(entry, dict):
            continue
        source = entry.get("source")
        route = entry.get("route")
        if not isinstance(source, str) or not isinstance(route, str):
            continue
        if is_route_manifest_bootstrap_source(source):
            continue
        if is_relay_retired_admin_source(source):
            continue
        if is_relay_retired_admin_operation_route(route) or is_relay_retired_admin_portal_route(route):
            continue
        if not _source_exists(root, source):
            continue
        operation = _operation_from_audit_entry(entry)
        if operation is not None:
            source = str(operation.get("source", ""))
            if source.endswith("clawRouterAuthSettingsService.ts"):
                operation["operation_scope"] = "app_shell"
            service_operations.append(_clamp_operation_tables(operation, route_tables))

    merged_operations = _merge_contract_operations(service_operations, payload["frontend_operations"])

    payload["frontend_models"] = sorted(
        frontend_models,
        key=lambda item: (item.get("source", ""), item.get("interface", "")),
    )
    payload["frontend_operations"] = sorted(
        merged_operations,
        key=lambda item: (
            item.get("api_surface", ""),
            item.get("api_path", ""),
            item.get("api_method", ""),
            item.get("operation_id", ""),
        ),
    )
    return payload


def main() -> int:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR

    parser = argparse.ArgumentParser(
        description="Hydrate relay frontend_models and service operations from generated audit snapshots.",
    )
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="defaults to docs/schema-registry/frontend-field-contracts.yaml",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    output = (
        args.output.resolve()
        if args.output is not None
        else root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
    )
    payload = hydrate_frontend_contract(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True), encoding="utf-8", newline="\n")
    print(
        "Wrote "
        f"{output} "
        f"({len(payload.get('frontend_models', []))} frontend_models, "
        f"{len(payload.get('frontend_operations', []))} frontend_operations)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
