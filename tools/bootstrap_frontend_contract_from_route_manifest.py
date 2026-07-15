from __future__ import annotations

import argparse
import json
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
        "api_surface": "app",
        "manifest_path": "sdks/_route-manifests/app-api/sdkwork-routes-clawrouter-app-api.route-manifest.json",
    },
    {
        "api_surface": "backend",
        "manifest_path": "sdks/_route-manifests/backend-api/sdkwork-routes-clawrouter-backend-api.route-manifest.json",
    },
)


class FrontendContractBootstrapError(RuntimeError):
    """Raised when route metadata is incorrectly used as frontend contract authority."""


def _route_semantic_fields(api_method: str) -> list[str]:
    fields = ["response_schema", "read_sources", "write_tables"]
    if api_method == "GET":
        fields.append("query_parameters")
    if api_method in {"POST", "PUT", "PATCH"}:
        fields.append("request_schema or request_body_required")
    return fields


def _raise_route_manifest_semantic_authority_error(
    route: dict[str, Any],
    target: dict[str, str],
) -> None:
    api_path = route.get("path")
    api_method = route.get("method")
    operation_id = route.get("operationId")
    path_display = api_path if isinstance(api_path, str) and api_path else "<missing path>"
    method_display = api_method.upper() if isinstance(api_method, str) and api_method else "<missing method>"
    operation_display = operation_id if isinstance(operation_id, str) and operation_id else "<missing operationId>"
    fields = ", ".join(_route_semantic_fields(method_display))
    raise FrontendContractBootstrapError(
        "refusing to bootstrap a semantic frontend contract from route metadata for "
        f"{target['api_surface']} {method_display} {path_display} "
        f"(operationId={operation_display}): route manifests do not author {fields}. "
        "Generating this entry would invent NoData, empty query_parameters, or "
        "request_body_required: false. Define the operation explicitly in "
        "docs/schema-registry/frontend-field-contracts/ and materialize the snapshot with "
        "python -B -m tools.frontend_contract_loader --root <application-root>. "
        "Do not treat an OpenAPI operation generated from this bootstrap tool as an independent "
        "semantic authority."
    )


def bootstrap_contract(root: Path) -> dict[str, Any]:
    """Fail closed because route manifests cannot author frontend data semantics."""

    for target in TARGETS:
        manifest_path = root / target["manifest_path"]
        if not manifest_path.is_file():
            raise FrontendContractBootstrapError(f"missing route manifest: {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        routes = manifest.get("routes")
        if not isinstance(routes, list):
            raise FrontendContractBootstrapError(f"route manifest routes must be a list: {manifest_path}")
        for route in routes:
            if not isinstance(route, dict):
                raise FrontendContractBootstrapError(
                    f"route manifest route entries must be mappings: {manifest_path}"
                )
            _raise_route_manifest_semantic_authority_error(route, target)

    raise FrontendContractBootstrapError(
        "refusing to bootstrap an empty frontend contract: route manifests contained no route entries"
    )


def main() -> int:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR

    parser = argparse.ArgumentParser(
        description="Fail closed when asked to bootstrap semantic frontend contracts from route manifests.",
    )
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="New output snapshot path; required with --write and must not already exist.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    parser.add_argument(
        "--merge-portal-routes",
        action="store_true",
        help="Reserved for an explicit --write of a new bootstrap output.",
    )
    args = parser.parse_args()

    if not args.check and not args.write:
        print(
            "refusing to write a frontend field contract by default; use --check or author curated "
            "fragments under docs/schema-registry/frontend-field-contracts/"
        )
        return 2
    if args.merge_portal_routes and not args.write:
        print("--merge-portal-routes requires --write")
        return 2
    if args.write and args.output is None:
        print("--write requires an explicit --output and never overwrites the default documentation snapshot")
        return 2

    root = args.root.resolve()
    output = (
        args.output.resolve()
        if args.output is not None
        else root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
    )
    if args.write and output.exists():
        print(f"refusing to overwrite an existing frontend field contract snapshot: {output}")
        return 1

    try:
        payload = bootstrap_contract(root)
    except FrontendContractBootstrapError as exc:
        print(exc)
        return 1

    if args.merge_portal_routes:
        from tools.bootstrap_frontend_route_classification import bootstrap_contract_routes

        payload["routes"] = bootstrap_contract_routes(root)

    if args.check:
        if not output.is_file():
            print(f"missing frontend field contract snapshot: {output}")
            return 1
        current = yaml.safe_load(output.read_text(encoding="utf-8"))
        if not isinstance(current, dict):
            print(f"frontend field contract snapshot must be a mapping: {output}")
            return 1
        if current.get("schema") != payload["schema"]:
            print(f"frontend field contract schema is stale: {output}")
            return 1
        print(f"frontend field contract snapshot is current: {output}")
        return 0

    rendered = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"Wrote {output} ({len(payload['frontend_operations'])} frontend_operations)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
