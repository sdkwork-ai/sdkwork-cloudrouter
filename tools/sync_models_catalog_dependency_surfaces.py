"""Sync sdkwork-models dependency ownership metadata into dependency-api-surfaces.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "specs" / "dependency-api-surfaces.json"

BACKEND_OPERATIONS = [
    ("GET", "/backend/v3/api/ai/model_vendors", "modelVendors.list", "getModelsBackendSdkClient().ai.modelVendors.list", True),
    ("POST", "/backend/v3/api/ai/model_vendors", "modelVendors.create", "getModelsBackendSdkClient().ai.modelVendors.create", True),
    ("GET", "/backend/v3/api/ai/models", "models.list", "getModelsBackendSdkClient().ai.models.list", True),
    ("POST", "/backend/v3/api/ai/models", "models.create", "getModelsBackendSdkClient().ai.models.create", True),
    ("PATCH", "/backend/v3/api/ai/models/{modelId}", "models.update", "getModelsBackendSdkClient().ai.models.update", True),
    ("DELETE", "/backend/v3/api/ai/models/{modelId}", "models.delete", "getModelsBackendSdkClient().ai.models.delete", True),
    ("POST", "/backend/v3/api/ai/models/sync", "models.sync", "getModelsBackendSdkClient().ai.models.sync", True),
    ("GET", "/backend/v3/api/ai/model_mappings", "modelMappings.list", "getModelsBackendSdkClient().ai.modelMappings.list", True),
    ("POST", "/backend/v3/api/ai/model_mappings", "modelMappings.create", "getModelsBackendSdkClient().ai.modelMappings.create", True),
    ("PATCH", "/backend/v3/api/ai/model_mappings/{mappingId}", "modelMappings.update", "getModelsBackendSdkClient().ai.modelMappings.update", True),
    ("DELETE", "/backend/v3/api/ai/model_mappings/{mappingId}", "modelMappings.delete", "getModelsBackendSdkClient().ai.modelMappings.delete", True),
    ("POST", "/backend/v3/api/ai/model_mappings/resolve", "modelMappings.resolve", "getModelsBackendSdkClient().ai.modelMappings.resolve", True),
    ("GET", "/backend/v3/api/ai/model_rankings", "modelRankings.list", "getModelsBackendSdkClient().ai.modelRankings.list", True),
    ("GET", "/backend/v3/api/ai/model_rankings/status", "modelRankings.status.retrieve", "getModelsBackendSdkClient().ai.modelRankings.status.retrieve", True),
    ("GET", "/backend/v3/api/ai/model_rankings/jobs", "modelRankings.jobs.list", "getModelsBackendSdkClient().ai.modelRankings.jobs.list", True),
    ("POST", "/backend/v3/api/ai/model_rankings/refresh", "modelRankings.refresh", "getModelsBackendSdkClient().ai.modelRankings.refresh", True),
    ("GET", "/backend/v3/api/ai/resources", "resources.list", "getModelsBackendSdkClient().ai.aiResources.list", True),
    ("POST", "/backend/v3/api/ai/resources", "resources.create", "getModelsBackendSdkClient().ai.aiResources.create", False),
    ("PUT", "/backend/v3/api/ai/resources/{resourceId}", "resources.update", "getModelsBackendSdkClient().ai.aiResources.update", False),
    ("GET", "/backend/v3/api/ai/resource_groups", "resourceGroups.list", "getModelsBackendSdkClient().ai.aiResourceGroups.list", True),
    ("POST", "/backend/v3/api/ai/resource_groups", "resourceGroups.create", "getModelsBackendSdkClient().ai.aiResourceGroups.create", False),
    ("PATCH", "/backend/v3/api/ai/resource_groups/{groupId}", "resourceGroups.update", "getModelsBackendSdkClient().ai.aiResourceGroups.update", False),
    ("DELETE", "/backend/v3/api/ai/resource_groups/{groupId}", "resourceGroups.delete", "getModelsBackendSdkClient().ai.aiResourceGroups.delete", False),
    ("GET", "/backend/v3/api/ai/resource_groups/{groupIdOrCode}/resources", "resourceGroups.resources.list", "getModelsBackendSdkClient().ai.aiResourceGroups.resources.list", False),
]

APP_OPERATIONS = [
    ("GET", "/app/v3/api/ai/models", "models.list", "getModelsAppSdkClient().ai.models.list", True),
    ("GET", "/app/v3/api/ai/model_vendors", "modelVendors.list", "getModelsAppSdkClient().ai.modelVendors.list", True),
    ("GET", "/app/v3/api/ai/model_rankings", "modelRankings.list", "getModelsAppSdkClient().ai.modelRankings.list", True),
]


def operation_entries(rows: list[tuple[str, str, str, str, bool]]) -> list[dict]:
    return [
        {
            "method": method,
            "path": path,
            "operationId": operation_id,
            "owner": "sdkwork-models",
            "sdkClient": sdk_client,
            "consumerRequired": consumer_required,
        }
        for method, path, operation_id, sdk_client, consumer_required in rows
    ]


def same_origin_runtime(required_env: str) -> dict:
    return {
        "mode": "same-origin-mounted",
        "sameOriginAllowed": True,
        "targetRuntimeIntegration": {
            "mode": "shared-gateway",
            "gatewayApplication": "sdkwork-api-cloud-gateway",
            "commonSdkRootEnv": "PORTAL_PUBLIC_SDK_BASE_URL",
            "catalogPolicy": "no-dedicated-gateway-catalog",
        },
        "requiredBaseUrlEnv": required_env,
        "commonBaseUrlEnv": "PORTAL_PUBLIC_SDK_BASE_URL",
        "rustRouteContractCrate": {
            "crate": "sdkwork-routes-models-catalog-backend-api",
            "executableRouterExport": "admin_model_catalog_router",
        },
        "handlerAdapterExports": [
            {
                "export": "AiRoutingCacheInvalidatingModelCatalogAdminStore",
                "hostCrate": "sdkwork-clawrouter-router-service",
                "evidence": "services/sdkwork-clawrouter-router-service/src/application/ai_routing_cache_invalidation.rs wraps catalog admin mutations with routing cache invalidation.",
            }
        ],
        "mountCoverage": {
            "status": "verified",
            "evidence": [
                "Model catalog admin CRUD, mappings, sync, and rankings routes are owned by sdkwork-models route crates and mounted in sdkwork-routes-clawrouter-backend-api through sdkwork_routes_models_catalog_backend_api.",
                "Catalog admin stores live in sdkwork-models-catalog-repository-sqlx; Claw Router wires Sqlite/Postgres stores and cache invalidation adapters at compose time.",
                "cargo test -p sdkwork-routes-models-catalog-backend-api --test route_manifest verifies backend route manifest alignment.",
            ],
        },
    }


def same_origin_app_runtime() -> dict:
    runtime = same_origin_runtime("VITE_SDKWORK_MODELS_APP_API_BASE_URL")
    runtime["rustRouteContractCrate"] = {
        "crate": "sdkwork-routes-models-catalog-app-api",
        "executableRouterExport": "admin_model_catalog_router",
    }
    runtime["handlerAdapterExports"] = []
    runtime["mountCoverage"]["evidence"] = [
        "Model catalog and rankings app routes are owned by sdkwork-models route crates and mounted in sdkwork-routes-clawrouter-app-api through sdkwork_routes_models_catalog_app_api.",
        "Catalog handlers and domain types live in sdkwork-models-catalog-service; Claw Router supplies RefreshableSqlPricingCatalog as the host pricing snapshot port.",
        "cargo test -p sdkwork-routes-models-catalog-app-api --test route_manifest verifies app route manifest alignment.",
    ]
    return runtime


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for entry in manifest["dependencies"]:
        if entry["workspace"] == "sdkwork-models-backend-sdk":
            entry["dependencyOwnedOperations"] = operation_entries(BACKEND_OPERATIONS)
            entry["runtimeIntegration"] = same_origin_runtime("VITE_SDKWORK_MODELS_BACKEND_API_BASE_URL")
        if entry["workspace"] == "sdkwork-models-app-sdk":
            entry["dependencyOwnedOperations"] = operation_entries(APP_OPERATIONS)
            entry["runtimeIntegration"] = same_origin_app_runtime()
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"updated {MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
