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

from tools.frontend_contract_guardian import FrontendContractGuardian

SCHEMA_NAME = "sdkwork-clawrouter-frontend-route-classification"
APP_SOURCE = "apps/sdkwork-clawrouter-pc/src/App.tsx"
CONTRACT_SNAPSHOT = "docs/schema-registry/frontend-field-contracts.yaml"

LOCAL_TOOL_ROUTES: set[str] = set()

DOCUMENTS_ROUTES = {
    "/docs",
    "/sdk-reference",
    "/product-docs",
    "/api-reference",
}

PLAYGROUND_ROUTES = {
    "/playground",
    "/c/:conversationId",
}

PLAYGROUND_EVIDENCE = [
    APP_SOURCE,
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx",
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx",
    CONTRACT_SNAPSHOT,
]

DOCUMENTS_EVIDENCE = {
    "/docs": [
        APP_SOURCE,
        "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/index.ts",
        CONTRACT_SNAPSHOT,
    ],
    "/sdk-reference": [
        APP_SOURCE,
        "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/index.ts",
        CONTRACT_SNAPSHOT,
    ],
    "/product-docs": [
        APP_SOURCE,
        "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/index.ts",
        CONTRACT_SNAPSHOT,
    ],
    "/api-reference": [
        APP_SOURCE,
        "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/index.ts",
        CONTRACT_SNAPSHOT,
    ],
}

COMMERCE_PACKAGE_PREFIXES = (
    "@sdkwork/commerce-pc-",
    "@sdkwork/clawrouter-pc-admin-payments",
    "@sdkwork/clawrouter-pc-admin-wallet",
    "@sdkwork/clawrouter-pc-admin-orders",
    "@sdkwork/clawrouter-pc-admin-memberships",
    "@sdkwork/clawrouter-pc-admin-finance",
    "@sdkwork/clawrouter-pc-admin-inventory",
    "@sdkwork/clawrouter-pc-admin-marketing",
)

SPECIAL_CLASSIFICATIONS: dict[str, dict[str, Any]] = {
    "/rankings": {
        "delivery_kind": "sdk_backed_business_runtime",
        "api_surface": "app",
        "package": "@sdkwork/clawrouter-pc-rankings",
        "owner": "product-surface",
        "route_scope": "public",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
        "operation_routes": ["/rankings"],
        "evidence": [
            APP_SOURCE,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-rankings/src/rankingCatalog.ts",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-rankings/src/rankingService.ts",
            CONTRACT_SNAPSHOT,
        ],
    },
    "/models": {
        "delivery_kind": "sdk_backed_business_runtime",
        "api_surface": "app",
        "package": "@sdkwork/clawrouter-pc-models",
        "owner": "product-surface",
        "route_scope": "public",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
        "operation_routes": ["/models", "/models/:id", "/models/:provider/:model"],
        "evidence": [
            APP_SOURCE,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/runtimeModelCatalog.ts",
            CONTRACT_SNAPSHOT,
        ],
    },
    "/models/:id": {
        "delivery_kind": "sdk_backed_business_runtime",
        "api_surface": "app",
        "package": "@sdkwork/clawrouter-pc-models",
        "owner": "product-surface",
        "route_scope": "public",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
        "operation_routes": ["/models", "/models/:id", "/models/:provider/:model"],
        "evidence": [
            APP_SOURCE,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts",
            CONTRACT_SNAPSHOT,
        ],
    },
    "/models/:provider/:model": {
        "delivery_kind": "sdk_backed_business_runtime",
        "api_surface": "app",
        "package": "@sdkwork/clawrouter-pc-models",
        "owner": "product-surface",
        "route_scope": "public",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
        "operation_routes": ["/models", "/models/:id", "/models/:provider/:model"],
        "evidence": [
            APP_SOURCE,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts",
            CONTRACT_SNAPSHOT,
        ],
    },
    "/playground": {
        "delivery_kind": "sdk_backed_business_runtime",
        "api_surface": "app",
        "package": "@sdkwork/clawrouter-pc-playground",
        "owner": "developer-tools",
        "route_scope": "public",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-clawrouter-app-sdk",
        "operation_routes": ["/playground", "/c/:conversationId"],
        "evidence": PLAYGROUND_EVIDENCE,
    },
}


def _resolve_dependency_sdk_family(package_name: str | None, route: str) -> str:
    if route in DOCUMENTS_ROUTES:
        return "sdkwork-documents-app-sdk"
    if route in PLAYGROUND_ROUTES:
        return "sdkwork-clawrouter-app-sdk"
    if route in {"/models", "/models/:id", "/models/:provider/:model", "/rankings"}:
        return "sdkwork-clawrouter-app-sdk"
    if package_name and "oauth" in package_name:
        return "sdkwork-iam-backend-sdk"
    if route.startswith("/console"):
        return "sdkwork-clawrouter-app-sdk"
    if route.startswith("/admin"):
        return "sdkwork-clawrouter-backend-sdk"
    return "sdkwork-clawrouter-app-sdk"


def _resolve_api_surface(route: str, manifest_route: dict[str, Any] | None) -> str:
    if isinstance(manifest_route, dict):
        surface = manifest_route.get("required_api_surface")
        if surface in {"app", "backend"}:
            return str(surface)
    if route.startswith("/admin"):
        return "backend"
    return "app"


def _resolve_route_scope(route: str, manifest_route: dict[str, Any] | None) -> str:
    if isinstance(manifest_route, dict) and isinstance(manifest_route.get("route_scope"), str):
        return str(manifest_route["route_scope"])
    if route.startswith("/admin"):
        return "admin"
    if route.startswith("/console"):
        return "console"
    return "public"


def _resolve_owner(route: str, package_name: str | None) -> str:
    if package_name and "oauth" in package_name:
        return "appbase-iam"
    if route.startswith("/admin"):
        return "admin-control-plane"
    if route.startswith("/console"):
        return "console-surface"
    return "product-surface"


def _package_to_folder(package_name: str) -> str:
    return f"sdkwork-{package_name.removeprefix('@sdkwork/')}"


def _default_service_evidence(package_name: str) -> str | None:
    folder = _package_to_folder(package_name)
    package_root = Path("apps/sdkwork-clawrouter-pc/packages") / folder / "src"
    if not package_root.exists():
        return None
    for candidate in sorted(package_root.glob("*Service.ts")):
        return f"apps/sdkwork-clawrouter-pc/packages/{folder}/src/{candidate.name}"
    index_tsx = package_root / "index.tsx"
    if index_tsx.exists():
        return f"apps/sdkwork-clawrouter-pc/packages/{folder}/src/index.tsx"
    return None


def _build_documents_entry(route: str, package_name: str, route_scope: str) -> dict[str, Any]:
    return {
        "route": route,
        "package": package_name,
        "owner": "developer-tools",
        "route_scope": route_scope,
        "delivery_kind": "sdk_backed_business_runtime",
        "dependency_owned": True,
        "dependency_sdk_family": "sdkwork-documents-app-sdk",
        "api_surface": "app",
        "operation_routes": [route],
        "evidence": DOCUMENTS_EVIDENCE.get(route, [APP_SOURCE, CONTRACT_SNAPSHOT]),
    }


def _build_dependency_owned_entry(
    route: str,
    package_name: str,
    manifest_route: dict[str, Any] | None,
) -> dict[str, Any]:
    api_surface = _resolve_api_surface(route, manifest_route)
    dependency_sdk_family = _resolve_dependency_sdk_family(package_name, route)
    owner = _resolve_owner(route, package_name)
    route_scope = _resolve_route_scope(route, manifest_route)
    evidence = [APP_SOURCE, CONTRACT_SNAPSHOT]
    service_evidence = _default_service_evidence(package_name) if package_name else None
    if service_evidence is not None:
        evidence.insert(1, service_evidence)
    return {
        "route": route,
        "package": package_name or "portal-root",
        "owner": owner,
        "route_scope": route_scope,
        "delivery_kind": "sdk_backed_business_runtime",
        "dependency_owned": True,
        "dependency_sdk_family": dependency_sdk_family,
        "api_surface": api_surface,
        "operation_routes": [route],
        "evidence": evidence,
    }


def bootstrap_route_classification(root: Path) -> dict[str, Any]:
    guardian = FrontendContractGuardian(root=root)
    portal_routes = guardian.extract_portal_routes()
    route_packages = guardian.extract_portal_route_packages()
    manifest = json.loads(
        (root / "generated" / "schema" / "manifest" / "schema-manifest.json").read_text(encoding="utf-8")
    )
    manifest_routes = manifest.get("routes", {})
    if not isinstance(manifest_routes, dict):
        manifest_routes = {}

    entries: list[dict[str, Any]] = []
    for route in portal_routes:
        if route in SPECIAL_CLASSIFICATIONS:
            entry = {"route": route, **SPECIAL_CLASSIFICATIONS[route]}
            entries.append(entry)
            continue

        package_name = route_packages.get(route, "portal-root")
        manifest_route = manifest_routes.get(route)
        if route in DOCUMENTS_ROUTES:
            entries.append(
                _build_documents_entry(
                    route,
                    package_name,
                    _resolve_route_scope(route, manifest_route if isinstance(manifest_route, dict) else None),
                )
            )
            continue

        entries.append(
            _build_dependency_owned_entry(route, package_name, manifest_route if isinstance(manifest_route, dict) else None)
        )

    return {
        "schema": SCHEMA_NAME,
        "source": APP_SOURCE,
        "routes": entries,
    }


def bootstrap_contract_routes(root: Path) -> list[dict[str, Any]]:
    guardian = FrontendContractGuardian(root=root)
    portal_routes = guardian.extract_portal_routes()
    route_packages = guardian.extract_portal_route_packages()
    manifest = json.loads(
        (root / "generated" / "schema" / "manifest" / "schema-manifest.json").read_text(encoding="utf-8")
    )
    manifest_routes = manifest.get("routes", {})
    if not isinstance(manifest_routes, dict):
        manifest_routes = {}

    routes: list[dict[str, Any]] = []
    for route in portal_routes:
        manifest_route = manifest_routes.get(route)
        tables = ["ops_audit_log"]
        if isinstance(manifest_route, dict):
            manifest_tables = manifest_route.get("tables")
            if isinstance(manifest_tables, list) and manifest_tables:
                tables = [str(item) for item in manifest_tables if isinstance(item, str)]

        package_name = route_packages.get(route)
        entry: dict[str, Any] = {
            "route": route,
            "required_tables": tables,
            "dependency_owned": True,
            "dependency_sdk_family": _resolve_dependency_sdk_family(package_name, route),
        }
        routes.append(entry)
    return routes


def merge_contract_routes(root: Path, contract_path: Path) -> None:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR
    contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
    if not isinstance(contract, dict):
        raise ValueError("frontend field contract root must be a mapping")
    contract["routes"] = bootstrap_contract_routes(root)
    contract_path.write_text(yaml.safe_dump(contract, sort_keys=False, allow_unicode=True), encoding="utf-8", newline="\n")


def main() -> int:
    if yaml is None:
        raise RuntimeError("PyYAML is required") from _YAML_IMPORT_ERROR

    parser = argparse.ArgumentParser(description="Bootstrap frontend route classification registry.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output path (default: docs/schema-registry/frontend-route-classification.yaml)",
    )
    parser.add_argument(
        "--merge-contract-routes",
        action="store_true",
        help="Also merge portal route entries into frontend-field-contracts.yaml",
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    output = (
        args.output.resolve()
        if args.output is not None
        else root / "docs" / "schema-registry" / "frontend-route-classification.yaml"
    )
    payload = bootstrap_route_classification(root)
    rendered = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)

    if args.merge_contract_routes:
        merge_contract_routes(root, root / "docs" / "schema-registry" / "frontend-field-contracts.yaml")

    if args.check:
        if not output.is_file():
            print(f"missing frontend route classification registry: {output}")
            return 1
        current = yaml.safe_load(output.read_text(encoding="utf-8"))
        if current != payload:
            print(f"frontend route classification registry is stale: {output}")
            return 1
        print(f"frontend route classification registry is current: {output}")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"Wrote {output} ({len(payload['routes'])} routes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
