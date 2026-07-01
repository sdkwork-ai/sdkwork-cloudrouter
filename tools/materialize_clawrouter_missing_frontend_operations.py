from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from tools.frontend_contract_loader import load_frontend_field_contract
from tools.frontend_operation_audit import FrontendOperationAudit

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None

BACKEND_CLIENT_CHAIN_PATTERN = re.compile(
    r"BackendClient\['([^']+)'\](?:\['([^']+)'\])+"
)
BACKEND_DOMAIN_CALL_PATTERN = re.compile(
    r"getClawRouterBackendSdkClient\(\)\.([a-zA-Z0-9_.]+)\("
)
LEGACY_COMMERCE_SERVICE_CALL_PATTERN = re.compile(
    r"getSdkworkCommerceService\(\)\.(?:admin\.)?([a-zA-Z0-9_.]+)\("
)
DELEGATE_CALL_PATTERN = re.compile(
    r"\b(?:await|return)\s+(backend[A-Za-z0-9_]+)\s*\("
)
EXPORT_FUNCTION_PATTERN = re.compile(
    r"export\s+async\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{",
    re.MULTILINE,
)
STATIC_ASYNC_PATTERN = re.compile(
    r"\bstatic\s+async\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(",
)
MISSING_COMMERCE_DEPENDENCY_PATTERN = re.compile(
    r"\bmissingCommerceDependencyOperation\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
)
MODELS_BACKEND_CHAIN_PATTERN = re.compile(
    r"getModelsBackendSdkClient\(\)\.([a-zA-Z0-9_.]+)\("
)
DELEGATE_NAMES_PATTERN = re.compile(
    r"\b(?:await|return)\s+((?:backend|fetch|create|update|delete|list)[A-Za-z0-9_]+)\s*\("
)
ROUTE_PATTERN = re.compile(r"^- route: (.+)$", re.MULTILINE)
EVIDENCE_PATTERN = re.compile(r"^\s+- (.+)$", re.MULTILINE)

KIND_BY_METHOD = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}

SERVICE_PACKAGES = {
    "sdkwork-models-pc-admin-catalog": "operations/backend-models-catalog-admin.yaml",
}


def _load_openapi_index(root: Path) -> dict[str, tuple[str, str]]:
    spec_path = root / "generated" / "openapi" / "clawrouter-backend-openapi.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    indexed: dict[str, tuple[str, str]] = {}
    paths = spec.get("paths", {})
    if not isinstance(paths, dict):
        return indexed
    for api_path, methods in paths.items():
        if not isinstance(methods, dict):
            continue
        for method, operation in methods.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if isinstance(operation_id, str):
                indexed[operation_id] = (method.upper(), api_path)
    return indexed


def _load_route_evidence(root: Path) -> dict[str, list[str]]:
    classification_path = root / "docs" / "schema-registry" / "frontend-route-classification.yaml"
    text = classification_path.read_text(encoding="utf-8")
    route_to_evidence: dict[str, list[str]] = {}
    current_route: str | None = None
    in_evidence = False
    for line in text.splitlines():
        route_match = re.match(r"^- route: (.+)$", line)
        if route_match:
            current_route = route_match.group(1)
            route_to_evidence.setdefault(current_route, [])
            in_evidence = False
            continue
        if line.strip() == "evidence:":
            in_evidence = True
            continue
        if in_evidence:
            evidence_match = re.match(r"^\s+- (.+)$", line)
            if evidence_match and current_route is not None:
                route_to_evidence[current_route].append(evidence_match.group(1))
            elif line and not line.startswith(" "):
                in_evidence = False
    return route_to_evidence


def _routes_for_source(source: str, route_evidence: dict[str, list[str]]) -> list[str]:
    normalized = source.replace("\\", "/")
    matches = [
        route
        for route, evidence in route_evidence.items()
        if any(normalized.endswith(item) or item.endswith(normalized) for item in evidence)
    ]
    return sorted(matches)


def _infer_route(function_name: str, routes: list[str]) -> str | None:
    if not routes:
        return None
    if len(routes) == 1:
        return routes[0]
    lowered = function_name.lower()
    best_route = routes[0]
    best_score = -1
    for route in routes:
        segments = [segment for segment in route.split("/") if segment and segment != "admin"]
        score = 0
        for segment in segments:
            compact = segment.replace("-", "")
            if compact and compact in lowered:
                score += 2
            if segment in lowered:
                score += 1
        if score > best_score:
            best_score = score
            best_route = route
    return best_route


def _operation_body_patterns(operation: str) -> list[str]:
    escaped = re.escape(operation)
    return [
        rf"export\s+async\s+function\s+{escaped}\s*\([^)]*\)(?:\s*:[^{{]+)?\s*\{{",
        rf"\bstatic\s+async\s+{escaped}\s*\([^)]*\)(?:\s*:[^{{]+)?\s*\{{",
        rf"\basync\s+function\s+{escaped}\s*\([^)]*\)(?:\s*:[^{{]+)?\s*\{{",
    ]


def _extract_function_body(source_text: str, operation: str) -> str | None:
    for pattern in _operation_body_patterns(operation):
        match = re.search(pattern, source_text)
        if not match:
            continue
        start = match.end() - 1
        depth = 0
        for index in range(start, len(source_text)):
            char = source_text[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return source_text[match.start() : index + 1]
    return None


def _resolve_delegate_chain(source_text: str, function_body: str) -> str | None:
    visited: set[str] = set()
    current_body = function_body
    while current_body:
        chain = _backend_domain_chain_from_function(current_body)
        if chain is not None:
            return chain
        models_match = MODELS_BACKEND_CHAIN_PATTERN.search(current_body)
        if models_match:
            return models_match.group(1)
        missing_match = MISSING_COMMERCE_DEPENDENCY_PATTERN.search(current_body)
        if missing_match:
            return missing_match.group(1)
        delegate_match = DELEGATE_NAMES_PATTERN.search(current_body)
        if delegate_match is None:
            delegate_match = DELEGATE_CALL_PATTERN.search(current_body)
        if delegate_match is None:
            return None
        delegate_name = delegate_match.group(1)
        if delegate_name in visited:
            return None
        visited.add(delegate_name)
        delegate_body = _extract_function_body(source_text, delegate_name)
        if delegate_body is None and delegate_name.startswith("ModelService."):
            delegate_body = _extract_function_body(source_text, delegate_name.split(".", 1)[1])
        if delegate_body is None:
            return None
        current_body = delegate_body
    return None


MANUAL_OPERATION_SPECS: dict[str, tuple[str, str, str, str]] = {
    "memberships.plans.delete": ("DELETE", "/backend/v3/api/memberships/plans/{planId}", "commerce", "backend"),
    "fulfillments.create": ("POST", "/backend/v3/api/fulfillments", "commerce", "backend"),
    "fulfillments.shipments.create": ("POST", "/backend/v3/api/fulfillments/{fulfillmentId}/shipments", "commerce", "backend"),
    "fulfillments.shipments.update": ("PATCH", "/backend/v3/api/fulfillments/{fulfillmentId}/shipments/{shipmentId}", "commerce", "backend"),
    "fulfillments.trackingEvents.create": (
        "POST",
        "/backend/v3/api/fulfillments/{fulfillmentId}/shipments/{shipmentId}/tracking_events",
        "commerce",
        "backend",
    ),
    "refunds.approvals.create": ("POST", "/backend/v3/api/refunds/{refundId}/approvals", "commerce", "backend"),
    "refunds.attempts.create": ("POST", "/backend/v3/api/refunds/{refundId}/attempts", "commerce", "backend"),
    "iam.oauth.resourceAccounts.list": ("GET", "/backend/v3/api/iam/oauth/resource_accounts", "iam", "backend"),
    "iam.oauth.resourceAccounts.create": ("POST", "/backend/v3/api/iam/oauth/resource_accounts", "iam", "backend"),
    "iam.oauth.resourceAccounts.update": ("PATCH", "/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}", "iam", "backend"),
    "ai.agents.list": ("GET", "/backend/v3/api/ai/agents", "agent", "backend"),
    "drive.spaces.list": ("GET", "/app/v3/api/drive/spaces", "drive", "app"),
    "drive.nodes.list": ("GET", "/app/v3/api/drive/spaces/{spaceId}/nodes", "drive", "app"),
    "drive.permissions.list": ("GET", "/app/v3/api/drive/nodes/{nodeId}/permissions", "drive", "app"),
    "drive.shareLinks.list": ("GET", "/app/v3/api/drive/nodes/{nodeId}/share_links", "drive", "app"),
    "ai.models.list": ("GET", "/backend/v3/api/ai/models", "intelligence", "backend"),
}


DEFAULT_ROUTES_BY_SOURCE: dict[str, str] = {
    "data/sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts": "/admin/model",
}


DRIVE_OPERATION_ROUTES = {
    "listDriveSpaces": "/admin/drive/spaces",
    "listDriveNodes": "/admin/drive/nodes",
    "listDrivePermissions": "/admin/drive/permissions",
    "listDriveShareLinks": "/admin/drive/share-links",
}


MEMBERSHIP_OPERATION_ROUTES = {
    "fetchMembershipAdminPlans": "/admin/memberships/plans",
    "createMembershipAdminPlan": "/admin/memberships/plans",
    "updateMembershipAdminPlan": "/admin/memberships/plans",
    "deleteMembershipAdminPlan": "/admin/memberships/plans",
    "backendMembershipsPlansDelete": "/admin/memberships/plans",
    "fetchMembershipAdminPackageGroups": "/admin/memberships/package-groups",
    "createMembershipAdminPackageGroup": "/admin/memberships/package-groups",
    "updateMembershipAdminPackageGroup": "/admin/memberships/package-groups",
    "deleteMembershipAdminPackageGroup": "/admin/memberships/package-groups",
    "fetchMembershipAdminPackages": "/admin/memberships/packages",
    "createMembershipAdminPackage": "/admin/memberships/packages",
    "updateMembershipAdminPackage": "/admin/memberships/packages",
    "deleteMembershipAdminPackage": "/admin/memberships/packages",
    "fetchMembershipAdminPackageCatalog": "/admin/memberships/packages",
    "fetchMembershipAdminMembers": "/admin/memberships/members",
    "updateMembershipAdminMemberStatus": "/admin/memberships/members",
    "fetchMembershipAdminEntitlements": "/admin/memberships/entitlements",
    "fetchMembershipAdminRechargePackages": "/admin/memberships/recharge-packages",
    "createMembershipAdminRechargePackage": "/admin/memberships/recharge-packages",
    "updateMembershipAdminRechargePackage": "/admin/memberships/recharge-packages",
    "deleteMembershipAdminRechargePackage": "/admin/memberships/recharge-packages",
    "fetchMembershipAdminRechargeSettings": "/admin/memberships/recharge-settings",
    "updateMembershipAdminRechargeSettings": "/admin/memberships/recharge-settings",
}


OAUTH_OPERATION_ROUTES = {
    "listOAuthResourceAccounts": "/admin/oauth",
    "createOAuthResourceAccount": "/admin/oauth",
    "updateOAuthResourceAccount": "/admin/oauth",
}


def _resolve_operation_from_chain(chain: str, openapi_index: dict[str, tuple[str, str]]) -> tuple[str, str, str, str, str] | None:
    if chain in MANUAL_OPERATION_SPECS:
        method, api_path, sdk_domain, api_surface = MANUAL_OPERATION_SPECS[chain]
        return chain, method, api_path, sdk_domain, api_surface
    resolved = _resolve_openapi_operation(chain, openapi_index)
    if resolved is None:
        if chain in {"models.list", "ai.models.list"}:
            method, api_path, sdk_domain, api_surface = MANUAL_OPERATION_SPECS["ai.models.list"]
            return "models.list", method, api_path, sdk_domain, api_surface
        return None
    operation_id, method, api_path = resolved
    sdk_domain = "commerce"
    if chain.startswith("models.") or chain.startswith("ai.models."):
        sdk_domain = "intelligence"
    return operation_id, method, api_path, sdk_domain, "backend"


def _backend_domain_chain_from_function(function_body: str) -> str | None:
    service_match = LEGACY_COMMERCE_SERVICE_CALL_PATTERN.search(function_body)
    if service_match:
        return service_match.group(1)
    type_match = re.search(r"BackendClient((?:\['[^']+'\])+)", function_body)
    if type_match:
        parts = re.findall(r"\['([^']+)'\]", type_match.group(1))
        if parts:
            return ".".join(parts)
    call_match = BACKEND_DOMAIN_CALL_PATTERN.search(function_body)
    if call_match:
        return call_match.group(1)
    return None


def _resolve_openapi_operation(chain: str, openapi_index: dict[str, tuple[str, str]]) -> tuple[str, str, str] | None:
  candidates = [chain]
  segments = chain.split(".")
  if len(segments) >= 2:
      action = segments[-1]
      resource = ".".join(segments[:-1])
      candidates.extend(
          [
              f"{resource}.management.{action}",
              f"{resource}.{action}",
              f"{resource}.management.{action.replace('retrieve', 'retrieve')}",
          ]
      )
  if chain.endswith(".list"):
      base = chain[: -len(".list")]
      candidates.append(f"{base}.management.list")
  if chain.endswith(".retrieve"):
      base = chain[: -len(".retrieve")]
      candidates.append(f"{base}.management.retrieve")
  if chain.endswith(".delete"):
      base = chain[: -len(".delete")]
      candidates.append(f"{base}.delete")
      candidates.append(f"{base}.management.delete")
  seen: set[str] = set()
  for candidate in candidates:
      if candidate in seen:
          continue
      seen.add(candidate)
      if candidate in openapi_index:
          method, api_path = openapi_index[candidate]
          return candidate, method, api_path
  for operation_id, (method, api_path) in openapi_index.items():
      if operation_id.replace(".management.", ".") == chain or operation_id.endswith(chain):
          return operation_id, method, api_path
  return None


def _infer_kind(method: str, operation_name: str) -> str:
    lowered = operation_name.lower()
    if method in KIND_BY_METHOD:
        kind = KIND_BY_METHOD[method]
        if kind == "create" and any(token in lowered for token in ("update", "status")):
            return "update"
        if kind == "create" and "delete" in lowered:
            return "delete"
        return kind
    if "delete" in lowered:
        return "delete"
    if "update" in lowered or "status" in lowered:
        return "update"
    if "create" in lowered or "add" in lowered:
        return "create"
    return "action"


def _build_operation_entry(
    *,
    source: str,
    operation: str,
    route: str,
    operation_id: str,
    method: str,
    api_path: str,
    kind: str,
    sdk_domain: str = "commerce",
    api_surface: str = "backend",
) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "route": route,
        "source": source,
        "operation": operation,
        "operation_id": operation_id,
        "kind": kind,
        "api_surface": api_surface,
        "api_method": method,
        "api_path": api_path,
        "sdk_domain": sdk_domain,
        "read_sources": ["ops_audit_log"],
        "query_parameters": [],
        "response_schema": {
            "name": f"{operation}Response",
            "type": "object",
            "additionalProperties": True,
            "properties": {},
        },
    }
    if kind in {"create", "update", "delete", "action", "sync"}:
        entry["write_tables"] = ["ops_audit_log"]
    return entry


def _fragment_path_for_source(source: str) -> str | None:
    for package, fragment in SERVICE_PACKAGES.items():
        if package in source.replace("\\", "/"):
            return fragment
    return None


def materialize_missing_operations(root: Path, *, apply: bool) -> list[str]:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR

    audit = FrontendOperationAudit(root=root)
    missing = sorted(
        message.split(": ", 1)[1]
        for message in audit.validate().messages
        if message.startswith("frontend operation missing from contract:")
    )
    if not missing:
        return ["no missing frontend operations detected"]

    openapi_index = _load_openapi_index(root)
    route_evidence = _load_route_evidence(root)
    contract = load_frontend_field_contract(root)
    routes = contract.get("routes", [])
    route_tables: dict[str, list[str]] = {}
    if isinstance(routes, list):
        for route_entry in routes:
            if isinstance(route_entry, dict) and isinstance(route_entry.get("route"), str):
                tables = route_entry.get("required_tables", [])
                if isinstance(tables, list):
                    route_tables[route_entry["route"]] = [table for table in tables if isinstance(table, str)]

    fragments: dict[str, list[dict[str, Any]]] = {}
    messages: list[str] = []

    for key in missing:
        source, operation = key.split("#", 1)
        source_path = root / source
        if not source_path.is_file():
            messages.append(f"skip missing source: {key}")
            continue
        fragment_relative = _fragment_path_for_source(source)
        if fragment_relative is None:
            messages.append(f"skip unmapped package: {key}")
            continue
        source_text = source_path.read_text(encoding="utf-8")
        function_body = _extract_function_body(source_text, operation)
        if function_body is None:
            messages.append(f"skip function body not found: {key}")
            continue
        chain = _resolve_delegate_chain(source_text, function_body)
        if chain is None and operation == "listInventoryLedgerEntries":
            chain = "inventory.movements.list"
        if chain is None and operation in {"listManagedAgents", "listAgentSkillBindings"}:
            chain = "ai.agents.list"
        if chain is None and operation in DRIVE_OPERATION_ROUTES:
            drive_chain_by_operation = {
                "listDriveSpaces": "drive.spaces.list",
                "listDriveNodes": "drive.nodes.list",
                "listDrivePermissions": "drive.permissions.list",
                "listDriveShareLinks": "drive.shareLinks.list",
            }
            chain = drive_chain_by_operation[operation]
        if chain is None and operation in OAUTH_OPERATION_ROUTES:
            oauth_chain_by_operation = {
                "listOAuthResourceAccounts": "iam.oauth.resourceAccounts.list",
                "createOAuthResourceAccount": "iam.oauth.resourceAccounts.create",
                "updateOAuthResourceAccount": "iam.oauth.resourceAccounts.update",
            }
            chain = oauth_chain_by_operation[operation]
        if chain is None and operation in {"fetchAllModels", "fetchModelsPage", "fetchInitializedCatalog"}:
            chain = "models.list"
        if chain is None and operation == "fetchMembershipAdminPackageGroups":
            chain = "memberships.packageGroups.management.list"
        if chain is None and operation == "fetchMembershipAdminPackageCatalog":
            chain = "memberships.packages.management.list"
        if chain is None:
            messages.append(f"skip commerce chain not found: {key}")
            continue
        resolved = _resolve_operation_from_chain(chain, openapi_index)
        if resolved is None:
            messages.append(f"skip openapi operation not found for {chain}: {key}")
            continue
        operation_id, method, api_path, sdk_domain, api_surface = resolved
        candidate_routes = _routes_for_source(source, route_evidence)
        route = (
            DRIVE_OPERATION_ROUTES.get(operation)
            or OAUTH_OPERATION_ROUTES.get(operation)
            or MEMBERSHIP_OPERATION_ROUTES.get(operation)
            or DEFAULT_ROUTES_BY_SOURCE.get(source.replace("\\", "/"))
            or _infer_route(operation, candidate_routes)
        )
        if route is None:
            messages.append(f"skip route not found: {key}")
            continue
        kind = _infer_kind(method, operation)
        entry = _build_operation_entry(
            source=source,
            operation=operation,
            route=route,
            operation_id=operation_id,
            method=method,
            api_path=api_path,
            kind=kind,
            sdk_domain=sdk_domain,
            api_surface=api_surface,
        )
        read_sources = route_tables.get(route, ["ops_audit_log"])
        entry["read_sources"] = [read_sources[0]] if read_sources else ["ops_audit_log"]
        fragments.setdefault(fragment_relative, []).append(entry)
        messages.append(f"materialized {key} -> {route} ({operation_id})")

    if not apply:
        return messages

    index_path = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
    index_text = index_path.read_text(encoding="utf-8")
    for fragment_relative, entries in sorted(fragments.items()):
        fragment_path = root / "docs" / "schema-registry" / "frontend-field-contracts" / fragment_relative
        fragment_path.parent.mkdir(parents=True, exist_ok=True)
        existing_entries: list[dict[str, Any]] = []
        if fragment_path.is_file():
            existing_payload = yaml.safe_load(fragment_path.read_text(encoding="utf-8"))
            if isinstance(existing_payload, dict):
                current_entries = existing_payload.get("frontend_operations", [])
                if isinstance(current_entries, list):
                    existing_entries = [entry for entry in current_entries if isinstance(entry, dict)]
        merged_by_key = {
            f"{entry.get('source')}#{entry.get('operation')}": entry
            for entry in existing_entries
            if isinstance(entry.get("source"), str) and isinstance(entry.get("operation"), str)
        }
        for entry in entries:
            merged_by_key[f"{entry['source']}#{entry['operation']}"] = entry
        payload = {
            "fragment": fragment_relative.replace(".yaml", ""),
            "frontend_operations": list(merged_by_key.values()),
        }
        fragment_path.write_text(
            yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        fragment_line = f"- {fragment_relative.replace(chr(92), '/')}"
        if fragment_line not in index_text:
            index_text = f"{index_text.rstrip()}\n{fragment_line}\n"
            messages.append(f"registered {fragment_line}")
    index_path.write_text(index_text, encoding="utf-8")
    return messages


def main() -> int:
    parser = argparse.ArgumentParser(description="Materialize missing clawrouter frontend operation contracts.")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    messages = materialize_missing_operations(root, apply=args.apply)
    for message in messages:
        print(message)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
