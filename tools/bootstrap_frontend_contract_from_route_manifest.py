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

TARGETS = (
    {
        "surface": "app",
        "api_surface": "app",
        "manifest_path": "sdks/_route-manifests/app-api/sdkwork-routes-clawrouter-app-api.route-manifest.json",
        "api_prefix": "/app/v3/api",
        "route_scope": "console",
    },
    {
        "surface": "backend",
        "api_surface": "backend",
        "manifest_path": "sdks/_route-manifests/backend-api/sdkwork-routes-clawrouter-backend-api.route-manifest.json",
        "api_prefix": "/backend/v3/api",
        "route_scope": "admin",
    },
)

KIND_BY_METHOD = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}


def _infer_tag(api_path: str, api_prefix: str, tags: list[Any]) -> str:
    if tags and isinstance(tags[0], str) and tags[0].strip():
        return tags[0].strip()
    relative = api_path.removeprefix(api_prefix).strip("/")
    return relative.split("/", 1)[0] if relative else "router"


def _infer_ui_route(api_path: str, api_prefix: str, route_scope: str) -> str:
    relative = api_path.removeprefix(api_prefix).strip("/")
    return f"/{route_scope}/{relative or 'root'}"


def _operation_name(operation_id: str) -> str:
    parts = [part for part in operation_id.split(".") if part]
    return parts[-1] if parts else "operation"


def _read_source_tag(tag: str) -> str:
    normalized = re.sub(r"[^a-z0-9_]+", "_", tag.lower()).strip("_")
    return normalized or "ops_audit_log"


def _build_operation(route: dict[str, Any], target: dict[str, str]) -> dict[str, Any]:
    api_path = str(route["path"])
    api_method = str(route["method"]).upper()
    operation_id = str(route.get("operationId") or f"{api_method.lower()}.operation")
    tag = _infer_tag(api_path, target["api_prefix"], route.get("tags", []))
    kind = KIND_BY_METHOD.get(api_method, "action")
    entry: dict[str, Any] = {
        "route": _infer_ui_route(api_path, target["api_prefix"], target["route_scope"]),
        "source": "tools/bootstrap_frontend_contract_from_route_manifest.py",
        "operation": _operation_name(operation_id),
        "operation_id": operation_id,
        "kind": kind,
        "api_surface": target["api_surface"],
        "api_method": api_method,
        "api_path": api_path,
        "read_sources": [_read_source_tag(tag)],
        "response_schema": {"name": "NoData", "properties": {}},
    }
    if api_method == "GET":
        entry["query_parameters"] = []
    if api_method in {"POST", "PUT", "PATCH"}:
        entry["request_body_required"] = False
    if api_method in {"POST", "PUT", "PATCH", "DELETE"}:
        entry["write_tables"] = ["ops_audit_log"]
    return entry


def bootstrap_contract(root: Path) -> dict[str, Any]:
    operations: list[dict[str, Any]] = []
    for target in TARGETS:
        manifest_path = root / target["manifest_path"]
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for route in manifest.get("routes", []):
            if not isinstance(route, dict):
                continue
            if not route.get("path") or not route.get("method"):
                continue
            operations.append(_build_operation(route, target))
    operations.sort(key=lambda item: (item["api_surface"], item["api_path"], item["api_method"], item["operation_id"]))
    return {
        "schema": {
            "name": "sdkwork-clawrouter-frontend-field-contracts",
            "version": "0.1.0",
            "source": "tools/bootstrap_frontend_contract_from_route_manifest.py",
        },
        "frontend_operations": operations,
    }


def main() -> int:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR

    parser = argparse.ArgumentParser(
        description="Bootstrap frontend-field-contracts.yaml from sdkwork-routes-* route manifests.",
    )
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output snapshot path (default: docs/schema-registry/frontend-field-contracts.yaml)",
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    output = (
        args.output.resolve()
        if args.output is not None
        else root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
    )
    payload = bootstrap_contract(root)
    rendered = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)

    if args.check:
        if not output.is_file():
            print(f"missing frontend field contract snapshot: {output}")
            return 1
        current = yaml.safe_load(output.read_text(encoding="utf-8"))
        if current != payload:
            print(f"frontend field contract snapshot is stale: {output}")
            return 1
        print(f"frontend field contract snapshot is current: {output}")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"Wrote {output} ({len(payload['frontend_operations'])} frontend_operations)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
