import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminModelRuntimeStandardTest(unittest.TestCase):
    def test_admin_model_write_contracts_use_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts"

        sync_models = operations[f"{source}#syncVendorsAndModels@/admin/model"]
        add_vendor = operations[f"{source}#addVendor@/admin/model"]
        add_model = operations[f"{source}#addModel@/admin/model"]

        self.assertEqual("AdminModelCatalogSyncRequest", sync_models["request_schema"]["name"])
        self.assertEqual([], sync_models["request_schema"]["schema"]["required"])
        sync_properties = sync_models["request_schema"]["schema"]["properties"]
        self.assertEqual(
            {"source", "mode", "vendorCodes", "force", "catalogRoot", "catalogVersion"},
            set(sync_properties),
        )
        self.assertIn("sdkwork_models", sync_properties["source"]["description"])
        self.assertEqual(
            ["official_refresh", "vendor_refresh", "catalog_version_refresh", "dry_run"],
            sync_properties["mode"]["enum"],
        )
        self.assertEqual(32, sync_properties["vendorCodes"]["maxItems"])
        self.assertEqual("AdminModelCatalogSyncResponse", sync_models["response_schema"]["name"])
        self.assertFalse(sync_models["request_id_header"])

        self.assertEqual("AdminModelVendorCreateRequest", add_vendor["request_schema"]["name"])
        self.assertEqual(["name"], add_vendor["request_schema"]["schema"]["required"])
        self.assertEqual("AdminModelVendorMutationResponse", add_vendor["response_schema"]["name"])
        self.assertFalse(add_vendor["request_id_header"])

        self.assertEqual("AdminAiModelCreateRequest", add_model["request_schema"]["name"])
        self.assertEqual(
            ["vendorId", "model", "type", "regionPrices", "contextTokens"],
            add_model["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminAiModelMutationResponse", add_model["response_schema"]["name"])
        self.assertFalse(add_model["request_id_header"])

    def test_admin_model_frontend_and_backend_sdk_do_not_use_generic_write_payloads(self) -> None:
        service = (
            ROOT
            / "data"
            / "sdkwork-models"
            / "apps"
            / "sdkwork-models-pc"
            / "packages"
            / "sdkwork-models-pc-admin-catalog"
            / "src"
            / "modelService.ts"
        ).read_text(encoding="utf-8")
        ai_api = (
            ROOT.parent
            / "sdkwork-models"
            / "sdks"
            / "sdkwork-models-backend-sdk"
            / "sdkwork-models-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "api"
            / "ai.ts"
        ).read_text(encoding="utf-8")
        sync_request_type = (
            ROOT.parent
            / "sdkwork-models"
            / "sdks"
            / "sdkwork-models-backend-sdk"
            / "sdkwork-models-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "types"
            / "admin-model-catalog-sync-request.ts"
        ).read_text(encoding="utf-8")
        type_exports = (
            ROOT.parent
            / "sdkwork-models"
            / "sdks"
            / "sdkwork-models-backend-sdk"
            / "sdkwork-models-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "types"
            / "index.ts"
        ).read_text(encoding="utf-8")
        ai_model_item_type = (
            ROOT.parent
            / "sdkwork-models"
            / "sdks"
            / "sdkwork-models-backend-sdk"
            / "sdkwork-models-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "types"
            / "admin-ai-model-item.ts"
        ).read_text(encoding="utf-8")
        backend_openapi = json.loads(
            (
                ROOT.parent
                / "sdkwork-models"
                / "apis"
                / "backend-api"
                / "intelligence"
                / "openapi.json"
            ).read_text(encoding="utf-8")
        )
        openapi_sync_request = backend_openapi["components"]["schemas"]["AdminModelCatalogSyncRequest"]
        openapi_model_item = backend_openapi["components"]["schemas"]["AdminAiModelItem"]
        openapi_create_request = backend_openapi["components"]["schemas"]["AdminAiModelCreateRequest"]
        openapi_update_request = backend_openapi["components"]["schemas"]["AdminAiModelUpdateRequest"]

        for token in [
            "AdminModelCatalogSyncRequest",
            "ModelCatalogSyncReport",
            "AdminModelVendorCreateRequest",
            "AdminAiModelCreateRequest",
            "toSyncCatalogRequest",
            "toCreateVendorRequest",
            "toCreateModelRequest",
        ]:
            self.assertIn(token, service)
        for token in [
            "createIdempotencyParams('admin-model-catalog-sync')",
            "createIdempotencyParams('admin-model-vendor-create')",
            "createIdempotencyParams('admin-ai-model-create')",
        ]:
            self.assertNotIn(token, service)
        self.assertNotIn("name?: string;", service)
        self.assertNotIn("Pick<ModelCreateInput, 'model' | 'name'>", service)

        self.assertIn("source: 'sdkwork_models'", service)
        self.assertIn("mode: 'official_refresh'", service)
        self.assertIn("force: true", service)
        self.assertIn("static async syncVendorsAndModels(): Promise<ModelCatalogSyncReport>", service)
        for token in [
            "meterCount",
            "vendorCount",
            "familyCount",
            "modelCount",
            "capabilityCount",
            "priceCount",
            "rankingCount",
            "acceptedCount",
            "snapshotId",
            "syncRunId",
        ]:
            self.assertIn(token, service)
        self.assertNotIn("official_docs", service)
        self.assertNotIn("local_catalog", service)
        self.assertNotIn("router.syncVendorsAndModels({})", service)
        self.assertNotIn("router.addVendor(vendor)", service)
        self.assertNotIn("model.add(model)", service)
        self.assertNotIn("as unknown as Record<string, unknown>", service)
        self.assertIn("getModelsBackendSdkClient().ai.modelVendors.list()", service)
        self.assertIn("getModelsBackendSdkClient().ai.models.refresh(", service)
        self.assertIn("getModelsBackendSdkClient().ai.modelVendors.create(", service)
        self.assertIn("getModelsBackendSdkClient().ai.modelRankings.list(", service)
        for count_field in [
            "meterCount",
            "vendorCount",
            "familyCount",
            "modelCount",
            "capabilityCount",
            "priceCount",
            "rankingCount",
            "acceptedCount",
        ]:
            self.assertIn(
                f"{count_field}: readRequiredNonNegativeInteger(data, '{count_field}', 'Model catalog sync response {count_field.replace('Count', ' count')}')",
                service,
            )
        self.assertIn("readRequiredNonNegativeInt64String(value, 'requests', 'Admin model ranking requests')", service)
        self.assertIn("readRequiredNonNegativeInt64String(value, 'baseVolume', 'Admin model ranking base volume')", service)
        self.assertIn("tenantId: readRequiredNonNegativeInt64String(value, 'tenantId', 'Model ranking refresh status tenant id')", service)
        self.assertIn("organizationId: readRequiredNonNegativeInt64String(value, 'organizationId', 'Model ranking refresh status organization id')", service)
        self.assertIn("refreshIntervalSeconds: readRequiredPositiveInteger(value, 'refreshIntervalSeconds', 'Model ranking refresh status refresh interval seconds')", service)
        self.assertIn("generatedCount: readRequiredNonNegativeInteger(value, 'generatedCount', 'Model ranking refresh status generated count')", service)
        self.assertIn("durationMs: readRequiredNonNegativeInteger(item, 'durationMs', 'Model ranking refresh job duration ms')", service)
        self.assertIn("successCount: readRequiredNonNegativeInteger(item, 'successCount', 'Model ranking refresh job success count')", service)
        self.assertIn("generatedCount: readRequiredNonNegativeInteger(value, 'generatedCount', 'Model ranking refresh trigger generated count')", service)
        self.assertIn("cacheMaxAgeSeconds: readRequiredPositiveInteger(value, 'cacheMaxAgeSeconds', 'Model ranking refresh trigger cache max age seconds')", service)
        self.assertIn("function readRequiredNonNegativeInteger(record: ApiRecord, key: string, label: string): number", service)
        self.assertIn("function readRequiredNonNegativeInt64String(record: ApiRecord, key: string, label: string): string", service)
        self.assertIn("function readRequiredPositiveInteger(record: ApiRecord, key: string, label: string): number", service)
        self.assertIn("Admin model ranking requests must be a non-negative integer", (ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-model-runtime.test.ts").read_text(encoding="utf-8"))
        self.assertIn("Model ranking refresh status generated count must be a non-negative integer", (ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-model-runtime.test.ts").read_text(encoding="utf-8"))
        self.assertIn("Model catalog sync response meter count must be a non-negative integer", (ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-model-runtime.test.ts").read_text(encoding="utf-8"))

        self.assertIn(
            "async refresh(body: AdminModelCatalogSyncRequest): Promise<ModelsRefreshResult>",
            ai_api,
        )
        for token in [
            "source?: string;",
            "mode?:",
            "vendorCodes?: string[];",
            "force?: boolean;",
            "catalogRoot?: string;",
            "catalogVersion?: string;",
        ]:
            self.assertIn(token, sync_request_type)
        self.assertNotIn("Deprecated compatibility alias for model", ai_api)
        self.assertNotIn("defaults to local_catalog", sync_request_type)
        self.assertEqual(
            {"source", "mode", "vendorCodes", "force", "catalogRoot", "catalogVersion"},
            set(openapi_sync_request["properties"]),
        )
        self.assertIn("sdkwork_models", openapi_sync_request["properties"]["source"]["description"])
        self.assertIn(
            "async create(body: AdminModelVendorCreateRequest): Promise<ModelVendorsCreateResult>",
            ai_api,
        )
        self.assertNotIn("async syncVendorsAndModels(body?: OperationRequest): Promise<PlusApiResult>", ai_api)
        self.assertNotIn("async addVendor(body?: OperationRequest): Promise<PlusApiResult>", ai_api)

        self.assertIn(
            "async create(body: AdminAiModelCreateRequest): Promise<ModelsCreateResult>",
            ai_api,
        )
        self.assertNotIn("async add(body?: OperationRequest): Promise<PlusApiResult>", ai_api)

        self.assertIn("regionPrices", openapi_model_item["required"])
        self.assertEqual(
            "AdminAiModelRegionPrice",
            openapi_model_item["properties"]["regionPrices"]["items"]["$ref"].split("/")[-1],
        )
        self.assertIn("regionPrices", openapi_create_request["required"])
        self.assertEqual(
            ["vendorId", "model", "type", "regionPrices", "contextTokens"],
            openapi_create_request["required"],
        )
        for schema_name, schema in [
            ("AdminAiModelItem", openapi_model_item),
            ("AdminAiModelCreateRequest", openapi_create_request),
            ("AdminAiModelUpdateRequest", openapi_update_request),
        ]:
            with self.subTest(schema=schema_name):
                self.assertNotIn("priceIn", schema["properties"])
                self.assertNotIn("priceOut", schema["properties"])
                self.assertNotIn("cacheReadPrice", schema["properties"])
                self.assertNotIn("cacheWritePrice", schema["properties"])
        self.assertIn("import type { AdminAiModelRegionPrice }", ai_model_item_type)
        self.assertIn("regionPrices: AdminAiModelRegionPrice[];", ai_model_item_type)
        self.assertNotIn("priceIn:", ai_model_item_type)
        self.assertNotIn("priceOut:", ai_model_item_type)
        self.assertNotIn("cacheReadPrice:", ai_model_item_type)
        self.assertNotIn("cacheWritePrice:", ai_model_item_type)

        for token in [
            "AdminModelCatalogSyncRequest",
            "AdminModelCatalogSyncResponse",
            "AdminModelVendorCreateRequest",
            "AdminModelVendorMutationResponse",
            "AdminAiModelCreateRequest",
            "AdminAiModelRegionPrice",
            "AdminAiModelMutationResponse",
            "ModelsRefreshResult",
            "ModelVendorsCreateResult",
            "ModelsCreateResult",
        ]:
            self.assertIn(f"export type {{ {token} }}", type_exports)

    def test_admin_model_create_forms_use_dedicated_inputs(self) -> None:
        package_root = (
            ROOT
            / "data"
            / "sdkwork-models"
            / "apps"
            / "sdkwork-models-pc"
            / "packages"
            / "sdkwork-models-pc-admin-catalog"
        )
        package = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "modelService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "modelForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type VendorCreateInput", service)
        self.assertIn("export type ModelCreateInput", service)
        self.assertIn("static async addVendor(vendor: VendorCreateInput): Promise<Vendor>", service)
        self.assertIn("static async addModel(model: ModelCreateInput): Promise<Model>", service)
        self.assertIn("function toCreateVendorRequest(vendor: VendorCreateInput)", service)
        self.assertIn("function toCreateModelRequest(model: ModelCreateInput)", service)
        self.assertIn("createVendorInputFromForm", view)
        self.assertIn("createModelInputFromForm", view)
        self.assertIn("const vendorInput = createVendorInputFromForm(formData, vendorSelection, KNOWN_VENDORS, vendorDesc)", view)
        self.assertIn("ModelService.addVendor(vendorInput)", view)
        self.assertIn("ModelService.addModel(createModelInputFromForm(formData, selectedVendor.id))", view)
        self.assertNotIn("gateway model catalog", view)
        self.assertNotIn("Omit<Vendor", service)
        self.assertNotIn("Omit<Model", service)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("Math.random()", view)
        self.assertIn("export function createVendorInputFromForm", form)
        self.assertIn("export function createModelInputFromForm", form)
        self.assertNotIn("Date.now()", form)
        self.assertNotIn("Math.random()", form)
        self.assertIn("admin-model-runtime.test.ts", verifier)

    def test_admin_model_read_model_validates_modalities_json(self) -> None:
        store_paths = [
            "../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/sqlite/model_catalog_admin_store.rs",
            "../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/postgres/model_catalog_admin_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn('try_get::<String, _>("modalities_json")', compact_store)
                self.assertIn(".map_err(row_error)?", compact_store)
                self.assertIn("model_type: model_type_label(capability, &modalities)?", compact_store)
                self.assertIn("fn model_type_label(", compact_store)
                self.assertIn("capability: Option<i64>", compact_store)
                self.assertIn("modalities: &[String]", compact_store)
                self.assertIn("-> DomainResult<String>", compact_store)
                self.assertIn("invalid model modalities json from database row", store)
                self.assertNotIn(
                    'try_get::<String, _>("modalities_json").unwrap_or_else(|_| "[]".to_owned())',
                    compact_store,
                )

    def test_admin_model_read_model_fails_closed_for_vendor_and_model_status(self) -> None:
        store_paths = [
            "../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/sqlite/model_catalog_admin_store.rs",
            "../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/postgres/model_catalog_admin_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn(
                    'status: status_label(required_integer_cell(&row, "status", "vendor status")?)?',
                    compact_store,
                )
                self.assertIn(
                    'status: status_label(required_integer_cell(&row, "status", "model status")?)?',
                    compact_store,
                )
                self.assertIn(
                    "fn status_label(value: i64) -> DomainResult<String>",
                    compact_store,
                )
                self.assertIn("missing admin model vendor status from database row", store)
                self.assertIn("missing admin model model status from database row", store)
                self.assertIn("invalid admin model status from database row", store)
                self.assertNotIn('status_label(optional_integer_cell(&row, "status"))', store)

    def test_admin_model_catalog_route_uses_standard_router_not_fallback_compat_layer(self) -> None:
        product_api_mod = (ROOT / "services/sdkwork-clawrouter-router-service/src/api/mod.rs").read_text(encoding="utf-8")
        admin_api = (ROOT / "crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs").read_text(
            encoding="utf-8"
        )
        product_api_dir = ROOT / "services/sdkwork-clawrouter-router-service/src/api"

        self.assertFalse(
            (product_api_dir / "admin_model_catalog_fallback.rs").exists(),
            "Admin model catalog route must be a first-class standard route, not a fallback/compat module.",
        )
        for source_name, source in {
            "product api module": product_api_mod,
            "admin api router": admin_api,
        }.items():
            with self.subTest(source=source_name):
                self.assertNotIn("admin_model_catalog_fallback", source)
                self.assertNotIn("catalog_fallback_router", source)
                self.assertIn("admin_model_catalog_router", source)
                self.assertIn("admin_model_catalog_router_with_api_key_hasher", source)


if __name__ == "__main__":
    unittest.main()
