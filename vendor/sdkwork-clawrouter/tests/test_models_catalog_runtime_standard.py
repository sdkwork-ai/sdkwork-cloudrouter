import re
import json
import unittest
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
MODELS_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-models"
)
CONTRACT_PATH = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
CLASSIFICATION_PATH = ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"

SENSITIVE_APP_MODEL_PRICE_FIELDS = (
    ("lowestUpstreamCostUnitPrice", "lowest_upstream_cost_unit_price"),
    ("upstreamCost", "upstream_cost"),
    ("providerCost", "provider_cost"),
    ("channelCost", "channel_cost"),
    ("costPrice", "cost_price"),
    ("customerUnitPrice", "customer_unit_price"),
    ("grossMarginPerUnit", "gross_margin_per_unit"),
    ("pricingPlanCode", "pricing_plan_code"),
    ("groupCode", "group_code"),
)


class ModelsCatalogRuntimeStandardTest(unittest.TestCase):
    def test_models_package_build_is_source_package_type_validation(self) -> None:
        package = json.loads((MODELS_PACKAGE / "package.json").read_text(encoding="utf-8"))
        scripts = package.get("scripts", {})
        dev_dependencies = package.get("devDependencies", {})

        self.assertEqual("tsc --noEmit", scripts.get("build"))
        self.assertEqual("tsc --noEmit", scripts.get("typecheck"))
        self.assertEqual("tsc --noEmit --watch", scripts.get("dev"))
        self.assertNotIn(
            "vite build",
            " ".join(str(value) for value in scripts.values()),
            "The models package is a source-imported route package and must not use app-mode Vite builds that require index.html.",
        )
        self.assertNotIn("vite", dev_dependencies)

    def test_model_group_filter_is_data_backed_not_noop(self) -> None:
        page_source = (MODELS_PACKAGE / "src" / "pages" / "Models.tsx").read_text(encoding="utf-8")
        model_data_source = (MODELS_PACKAGE / "src" / "data" / "models.ts").read_text(encoding="utf-8")
        catalog_source_path = MODELS_PACKAGE / "src" / "modelCatalog.ts"
        i18n_models_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "public"
            / "models.ts"
        ).read_text(encoding="utf-8")

        self.assertTrue(
            catalog_source_path.exists(),
            "Model catalog filtering must live in a testable pure module instead of inline page logic.",
        )
        catalog_source = catalog_source_path.read_text(encoding="utf-8")

        self.assertIn("export type ModelGroupKey", model_data_source)
        self.assertIn("groups: ModelGroupKey[];", model_data_source)
        self.assertIn("MODEL_CATEGORIES", page_source)
        self.assertNotIn("const CATEGORIES =", page_source)
        self.assertNotIn("selectedGroups.length === 0 || selectedGroups.length > 0", page_source)
        self.assertIn("filterModelsForCatalog(", page_source)
        self.assertIn("filterProvidersForCatalog(", page_source)
        self.assertIn("resolveDisplayedProvidersForCatalog(", page_source)
        self.assertIn("resolveProviderShowMoreStateForCatalog(", page_source)
        self.assertIn("deriveModelCatalogCardView(", page_source)
        self.assertIn("deriveModelCatalogPricingView(", page_source)
        self.assertIn("modelCatalogCategoryLabelKey(", page_source)
        self.assertIn("count: providerShowMoreState.hiddenCount", page_source)
        self.assertIn("defaultValue: providerShowMoreState.fallbackLabel", page_source)
        self.assertNotIn("t(providerShowMoreState.labelKey, providerShowMoreState.fallbackLabel)", page_source)
        self.assertNotIn(".toLowerCase().replace(/\\s+/g, '')", page_source)
        self.assertNotIn("encodeURIComponent(model.id)", page_source)
        self.assertNotIn("`models.data.${model.id}.desc`", page_source)
        self.assertNotIn("model.capabilities.map", page_source)
        self.assertNotIn("modelCatalogCapabilityLabelKey(cap)", page_source)
        self.assertNotIn("model.modality === 'Text'", page_source)
        self.assertNotIn("model.pricing.cachedInput !== undefined", page_source)
        self.assertNotIn("providers.filter(provider", page_source)
        self.assertNotIn("new Set(catalogModels.map", page_source)
        self.assertNotIn("new Set(catalogModels.flatMap", page_source)
        self.assertNotIn("filteredProviders.slice(0, 5)", page_source)
        self.assertNotIn("filteredProviders.length > 5", page_source)
        self.assertNotIn("filteredProviders.length - 5", page_source)
        self.assertNotIn("(showAllProviders || filters.providerSearchQuery)", page_source)
        self.assertIn("selectedGroups", page_source)
        self.assertIn("export function filterModelsForCatalog", catalog_source)
        self.assertIn("export function filterProvidersForCatalog", catalog_source)
        self.assertIn("export function deriveModelCatalogFilterOptions", catalog_source)
        self.assertIn("export function deriveModelCatalogCardView", catalog_source)
        self.assertIn("export function deriveModelCatalogPricingView", catalog_source)
        self.assertIn("export function modelCatalogCategoryLabelKey", catalog_source)
        self.assertIn("export function modelCatalogCapabilityLabelKey", catalog_source)
        self.assertIn("export function resolveDisplayedProvidersForCatalog", catalog_source)
        self.assertIn("export function resolveProviderShowMoreStateForCatalog", catalog_source)
        self.assertIn("export function createDefaultModelCatalogFilters", catalog_source)
        self.assertIn("export function resetModelCatalogFilters", catalog_source)
        self.assertIn("export const MODEL_CATALOG_FILTER_FIELDS", catalog_source)
        self.assertIn("export const MODEL_CATEGORIES", catalog_source)
        self.assertIn("'Recommended'", catalog_source)
        self.assertIn("'New'", catalog_source)
        self.assertIn("selectedGroups.some", catalog_source)
        self.assertIn("model.groups.includes", catalog_source)
        self.assertIn('"models.showMore": "Show {{count}} More"', i18n_models_source)

    def test_model_catalog_runtime_contract_declares_complete_taxonomy(self) -> None:
        model_data_source = (MODELS_PACKAGE / "src" / "data" / "models.ts").read_text(encoding="utf-8")
        runtime_catalog_source = (MODELS_PACKAGE / "src" / "runtimeModelCatalog.ts").read_text(encoding="utf-8")
        model_catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")

        self.assertNotIn("export const ALL_MODELS", model_data_source)
        self.assertIn("export type ModelGroupKey = string", model_data_source)
        self.assertIn("export type ModelCategoryKey", model_data_source)
        self.assertIn("groups: ModelGroupKey[];", model_data_source)
        self.assertIn("categories: ModelCategoryKey[];", model_data_source)
        self.assertIn("groups: ModelGroupKey[];", runtime_catalog_source)
        self.assertIn("categories: ModelCategoryKey[];", runtime_catalog_source)
        self.assertIn("normalizeRuntimeModelGroups", runtime_catalog_source)
        self.assertNotIn("isRuntimeModelGroup", runtime_catalog_source)
        self.assertIn("normalizeRuntimeModelCategories", runtime_catalog_source)
        self.assertNotIn("export const MODEL_GROUPS", model_catalog_source)
        self.assertIn("deriveModelCatalogGroupOptions", model_catalog_source)
        self.assertIn("modelCatalogGroupLabelKey", model_catalog_source)
        self.assertIn("modelCatalogGroupFallbackLabel", model_catalog_source)
        self.assertIn("MODEL_CATEGORIES", model_catalog_source)
        for group in ("default", "vip", "enterprise", "beta"):
            self.assertIn(group, model_catalog_source)
        for category in ("Recommended", "Open Source", "Proprietary", "Free", "New"):
            self.assertIn(category, model_catalog_source)

    def test_playground_model_groups_are_derived_from_standard_app_model_catalog(self) -> None:
        contract = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
        app_openapi = json.loads((ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(encoding="utf-8"))
        playground_types_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "playgroundTypes.ts"
        ).read_text(encoding="utf-8")
        playground_service_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "playgroundService.ts"
        ).read_text(encoding="utf-8")
        playground_runtime_test_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "console-app-runtime.test.ts"
        ).read_text(encoding="utf-8")
        rust_api_source = (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_models.rs").read_text(encoding="utf-8")
        sdk_ai_source = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "api"
            / "ai.ts"
        ).read_text(encoding="utf-8")

        operation = self._operation(
            contract,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts",
            "fetchModelGroups",
        )
        group_schema = operation["response_schema"]["properties"]["groups"]["items"]

        self.assertEqual("/app/v3/api/ai/models", operation["api_path"])
        self.assertFalse(operation["openapi_exposed"])
        removed_playground_models_path = "/app/v3/api/ai/playground" + "/models"
        self.assertNotIn(removed_playground_models_path, app_openapi["paths"])
        self.assertNotIn("PlaygroundModelVendorGroup", app_openapi["components"]["schemas"])
        self.assertNotIn("AiPlaygroundModelsApi", sdk_ai_source)
        self.assertNotIn("playground.models.list", sdk_ai_source)
        self.assertNotIn("ai.playground.models.list", playground_service_source)
        self.assertIn("listModelCatalog()", playground_service_source)
        self.assertIn("officialReferencePrices", playground_service_source)
        self.assertIn("readReferencePrices", playground_service_source)
        self.assertNotIn("officialReferenceUnitPrice", playground_service_source)
        self.assertNotIn("officialReferenceCurrency", playground_service_source)

        self.assertEqual(["id", "vendor", "llms", "images", "videos", "audios", "music", "sfx"], group_schema["required"])
        self.assertIn("id: string;", playground_types_source)
        self.assertIn("llms: PlaygroundModelOption[];", playground_types_source)
        self.assertIn("audios: PlaygroundModelOption[];", playground_types_source)
        self.assertNotIn("agents: PlaygroundModelOption[];", playground_types_source)
        self.assertIn("id: option.vendorCode,", playground_service_source)
        self.assertIn('group.id === "openai"', playground_runtime_test_source)
        self.assertIn('assert.ok(openai)', playground_runtime_test_source)
        self.assertIn("openai.llms", playground_runtime_test_source)
        self.assertIn("elevenlabs.audios", playground_runtime_test_source)
        self.assertNotIn("AppPlaygroundModelVendorGroupResponse", rust_api_source)
        self.assertNotIn(removed_playground_models_path, rust_api_source)

    def test_static_model_catalog_public_copy_is_ascii_only(self) -> None:
        model_data_path = MODELS_PACKAGE / "src" / "data" / "models.ts"
        violations: list[str] = []

        for line_number, line in enumerate(model_data_path.read_text(encoding="utf-8").splitlines(), start=1):
            non_ascii = sorted({char for char in line if ord(char) > 127})
            if non_ascii:
                escaped = ", ".join(f"U+{ord(char):04X}" for char in non_ascii)
                violations.append(f"{model_data_path.relative_to(ROOT).as_posix()}:{line_number}: {escaped}")

        self.assertEqual(
            [],
            violations,
            "Public model catalog seed copy must stay ASCII-only so UI, SSR, logs, and delivery docs remain portable.",
        )

    def test_models_route_is_app_sdk_backed_runtime_catalog(self) -> None:
        contract = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
        classification = yaml.safe_load(CLASSIFICATION_PATH.read_text(encoding="utf-8"))
        model_service_path = MODELS_PACKAGE / "src" / "modelService.ts"
        runtime_catalog_path = MODELS_PACKAGE / "src" / "runtimeModelCatalog.ts"
        app_sdk_types_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types"
        app_models_api_path = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_models.rs"

        self.assertTrue(
            model_service_path.exists(),
            "/models runtime catalog must have a focused app SDK service boundary.",
        )
        self.assertTrue(
            runtime_catalog_path.exists(),
            "/models runtime catalog mapping must live in a pure module that can run in Node tests.",
        )
        model_service_source = model_service_path.read_text(encoding="utf-8")
        runtime_catalog_source = runtime_catalog_path.read_text(encoding="utf-8")
        app_models_api_source = app_models_api_path.read_text(encoding="utf-8")
        app_model_item_source = (app_sdk_types_path / "app-model-catalog-item.ts").read_text(encoding="utf-8")
        app_price_availability_source = (
            app_sdk_types_path / "app-model-catalog-price-availability.ts"
        ).read_text(encoding="utf-8")
        route_entry = self._route_entry(classification, "/models")
        operation = self._operation(
            contract,
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts",
            "fetchModels",
        )

        self.assertEqual("sdk_backed_business_runtime", route_entry["delivery_kind"])
        self.assertEqual("app", route_entry["api_surface"])
        self.assertIn(
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts",
            route_entry["evidence"],
        )

        self.assertEqual("/models", operation["route"])
        self.assertEqual("read", operation["kind"])
        self.assertEqual("app", operation["api_surface"])
        self.assertEqual("GET", operation["api_method"])
        self.assertEqual("/app/v3/api/ai/models", operation["api_path"])
        self.assertEqual(
            [
                "ai_model_vendor",
                "ai_model",
                "ai_model_capability",
                "ai_model_pricing",
                "ai_channel_group",
                "ai_channel_group_member",
            ],
            operation["read_sources"],
        )
        self.assertEqual("AppModelCatalogResponse", operation["response_schema"]["name"])
        self.assertIn("items", operation["response_schema"]["required"])
        item_schema = operation["response_schema"]["properties"]["items"]["items"]
        item_properties = item_schema["properties"]
        price_availability_properties = item_properties["priceAvailability"]["properties"]

        for camel_field, snake_field in SENSITIVE_APP_MODEL_PRICE_FIELDS:
            self.assertNotIn(camel_field, item_properties)
            self.assertNotIn(camel_field, price_availability_properties)
            self.assertNotIn(camel_field, model_service_source)
            self.assertNotIn(camel_field, app_model_item_source)
            self.assertNotIn(camel_field, app_price_availability_source)
            self.assertNotIn(snake_field, app_models_api_source)

        self.assertEqual(
            ["reference", "unavailable"],
            price_availability_properties["status"]["enum"],
            "Public app model catalog availability must expose only public-safe states.",
        )
        self.assertIn("status: 'reference' | 'unavailable'", app_price_availability_source)
        self.assertNotIn("'available'", app_price_availability_source)

        self.assertIn("getClawRouterAppSdkClient", model_service_source)
        self.assertIn(".ai.models.list", model_service_source)
        self.assertIn("mergeRuntimeModelCatalog", runtime_catalog_source)
        self.assertIn("resolveRuntimeModelCatalog", model_service_source)
        self.assertIn("resolveRuntimeModelCatalog", runtime_catalog_source)
        self.assertIn("Array.isArray(items)", runtime_catalog_source)
        self.assertIn("toRuntimeCatalogItem", runtime_catalog_source)
        self.assertIn("isStringArray", runtime_catalog_source)
        self.assertIn("value.every((item) => typeof item === 'string')", runtime_catalog_source)
        self.assertIn("normalizeReferencePrices", runtime_catalog_source)
        self.assertIn("normalizePriceAvailability", runtime_catalog_source)
        self.assertNotIn("return runtimeModels.length > 0 ? runtimeModels : [...ALL_MODELS]", runtime_catalog_source)
        self.assertNotIn(": [...ALL_MODELS]", runtime_catalog_source)
        self.assertIn("readRequiredApiItems", model_service_source)
        self.assertIn("models: resolveRuntimeModelCatalog(readRequiredApiItems(result, 'Failed to fetch models'))", model_service_source)
        self.assertIn("groups: resolveRuntimeModelCatalogGroups(readRecordArray(data, 'groups'))", model_service_source)
        self.assertNotIn("return resolveRuntimeModelCatalog(result.data?.items)", model_service_source)
        self.assertNotIn("return mergeRuntimeModelCatalog(result.data?.items ?? [])", model_service_source)
        self.assertIn("findModelByCatalogRouteId", runtime_catalog_source)
        self.assertIn("decodeModelRouteId", runtime_catalog_source)
        self.assertNotIn("getClawRouterAppSdkClient", runtime_catalog_source)
        self.assertNotRegex(model_service_source, r"\bfetch\s*\(")
        self.assertNotIn("axios", model_service_source)

    def test_models_page_loads_runtime_catalog_without_static_runtime_fallback(self) -> None:
        page_source = (MODELS_PACKAGE / "src" / "pages" / "Models.tsx").read_text(encoding="utf-8")

        self.assertIn("ModelService.fetchModelCatalog({", page_source)
        self.assertIn("vendorCodes: selectedProviderCodes", page_source)
        self.assertIn("modalities: filters.selectedModalities", page_source)
        self.assertIn("capabilities: filters.selectedCapabilities", page_source)
        self.assertIn("categories: filters.selectedCategories", page_source)
        self.assertIn("groups: filters.selectedGroups", page_source)
        self.assertIn("searchQuery: filters.searchQuery", page_source)
        self.assertIn("limit: 1000", page_source)
        self.assertIn("resolveSelectedProviderCodes", page_source)
        self.assertIn("catalogModels", page_source)
        self.assertIn("setCatalogModels", page_source)
        self.assertIn("useState<Model[]>([])", page_source)
        self.assertIn("filterModelsForCatalog(catalogModels", page_source)
        self.assertNotIn("setCatalogModels(ALL_MODELS)", page_source)
        self.assertNotIn("ALL_MODELS", page_source)
        self.assertNotIn("filterModelsForCatalog(ALL_MODELS", page_source)

    def test_models_clear_filters_resets_every_filter_state(self) -> None:
        page_source = (MODELS_PACKAGE / "src" / "pages" / "Models.tsx").read_text(encoding="utf-8")
        catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")

        self.assertIn("createDefaultModelCatalogFilters", page_source)
        self.assertIn("resetModelCatalogFilters", page_source)
        self.assertIn("useState<ModelCatalogFilters>(() => createDefaultModelCatalogFilters())", page_source)
        self.assertIn("const clearFilters = () => {", page_source)
        self.assertIn("setFilters(resetModelCatalogFilters)", page_source)
        self.assertIn("onClick={clearFilters}", page_source)
        self.assertNotIn("useState('')", page_source)
        self.assertNotIn("useState<string[]>([])", page_source)
        self.assertNotIn("useState<ModelGroupKey[]>([])", page_source)
        self.assertNotIn("onClick={() => { setSearchQuery('')", page_source)

        for required_field in (
            "searchQuery",
            "providerSearchQuery",
            "selectedProviders",
            "selectedModalities",
            "selectedCapabilities",
            "selectedCategories",
            "selectedGroups",
            "sortBy",
        ):
            self.assertIn(required_field, catalog_source)

    def test_model_catalog_filter_fields_are_registry_driven(self) -> None:
        catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")
        runtime_test_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "models-runtime.test.ts"
        ).read_text(encoding="utf-8")

        registry_match = re.search(
            r"export const MODEL_CATALOG_FILTER_FIELDS = \[(?P<body>.*?)\] as const;",
            catalog_source,
            re.S,
        )
        self.assertIsNotNone(
            registry_match,
            "Model catalog filter fields must be declared once in MODEL_CATALOG_FILTER_FIELDS.",
        )
        registry_fields = re.findall(r"'([^']+)'", registry_match.group("body") if registry_match else "")
        self.assertEqual(
            [
                "searchQuery",
                "providerSearchQuery",
                "selectedProviders",
                "selectedModalities",
                "selectedCapabilities",
                "selectedCategories",
                "selectedGroups",
                "sortBy",
            ],
            registry_fields,
            "Filter field registry must preserve the public filter state shape and key order.",
        )
        self.assertIn("export type ModelCatalogFilterField = (typeof MODEL_CATALOG_FILTER_FIELDS)[number]", catalog_source)
        self.assertIn("type ModelCatalogFilterValueByField = {", catalog_source)
        self.assertIn("selectedGroups: ModelGroupKey[];", catalog_source)
        self.assertIn("export type ModelCatalogFilters = {", catalog_source)
        self.assertIn("[Field in ModelCatalogFilterField]: ModelCatalogFilterValueByField[Field];", catalog_source)
        self.assertIn("satisfies ModelCatalogFilters", catalog_source)
        self.assertIn("MODEL_CATALOG_FILTER_FIELDS", runtime_test_source)
        self.assertIn("model catalog filter field registry matches defaults and reset output", runtime_test_source)
        self.assertIn("Object.keys(defaults), MODEL_CATALOG_FILTER_FIELDS", runtime_test_source)
        self.assertIn("Object.keys(reset), MODEL_CATALOG_FILTER_FIELDS", runtime_test_source)

    def test_model_details_resolves_runtime_catalog_models(self) -> None:
        details_source = (MODELS_PACKAGE / "src" / "pages" / "ModelDetails.tsx").read_text(encoding="utf-8")
        service_source = (MODELS_PACKAGE / "src" / "modelService.ts").read_text(encoding="utf-8")
        catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")

        self.assertIn("findModelByCatalogRouteId", service_source)
        self.assertIn("ModelService.fetchModels()", details_source)
        self.assertIn("findModelByCatalogRouteId", details_source)
        self.assertIn("const routeModelId = id ?? (provider && modelParam ? `${provider}/${modelParam}` : '')", details_source)
        self.assertIn("useState<Model | null>", details_source)
        self.assertNotIn("ALL_MODELS.find", details_source)
        self.assertIn("deriveModelCatalogDetailView(", details_source)
        self.assertIn("export function deriveModelCatalogDetailView", catalog_source)
        self.assertNotIn("formatModelPrice(", details_source)
        self.assertNotIn("modelPricingUnitLabel(", details_source)
        self.assertNotIn("model.provider.toLowerCase().replace", details_source)
        self.assertNotIn("`models.data.${model.id}.desc`", details_source)
        self.assertNotIn("`models.data.${model.id}.intro`", details_source)
        self.assertNotIn("`models.data.${model.id}.useCases.${idx}`", details_source)
        self.assertNotIn("`models.data.${model.id}.limitations.${idx}`", details_source)
        self.assertNotIn("Object.entries(model.parameters)", details_source)
        self.assertNotIn("model.supportedLanguages.map", details_source)
        self.assertIn("detail.performanceSummary", details_source)
        self.assertNotIn("performanceData", details_source)
        self.assertNotIn("from 'recharts'", details_source)
        self.assertNotIn("<AreaChart", details_source)
        self.assertNotIn("<LineChart", details_source)
        self.assertIn("detail.performanceSummary.providerDocsLabelKey", details_source)
        self.assertIn("detail.performanceSummary.specificationsLabelKey", details_source)
        self.assertNotIn(">Provider Docs<", details_source)
        self.assertNotIn(">Specifications<", details_source)
        self.assertNotIn("{row.label}</span>", details_source)
        self.assertNotIn("{row.label}</div>", details_source)
        self.assertNotIn("label: 'Context Window'", catalog_source)
        self.assertNotIn("label: 'Avg. Latency'", catalog_source)
        self.assertIn("labelKey: 'models.details.contextTokens'", catalog_source)
        self.assertIn("labelKey: 'models.details.avgLatency'", catalog_source)

    def test_model_details_code_example_uses_single_derived_source(self) -> None:
        details_source = (MODELS_PACKAGE / "src" / "pages" / "ModelDetails.tsx").read_text(encoding="utf-8")
        catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")
        sdk_clients_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-clients.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("text={detail.apiExample}", details_source)
        self.assertIn("<code>{detail.apiExample}</code>", details_source)
        self.assertNotIn("{model.id}", details_source)
        self.assertNotIn("'{model.id}'", details_source)
        self.assertIn("apiExample: modelCatalogApiExample(model.id)", catalog_source)
        self.assertIn("return createClawRouterAppSdkModelExample(modelId, NODE_ENV_REFERENCE);", catalog_source)
        self.assertIn("export function createClawRouterAppSdkModelExample", sdk_clients_source)
        self.assertIn("JSON.stringify(modelId)", sdk_clients_source)
        self.assertNotIn("model: '${modelId}'", catalog_source)

    def test_runtime_unavailable_price_is_not_rendered_as_free(self) -> None:
        model_data_source = (MODELS_PACKAGE / "src" / "data" / "models.ts").read_text(encoding="utf-8")
        service_source = (MODELS_PACKAGE / "src" / "modelService.ts").read_text(encoding="utf-8")
        runtime_catalog_source = (MODELS_PACKAGE / "src" / "runtimeModelCatalog.ts").read_text(encoding="utf-8")
        catalog_source = (MODELS_PACKAGE / "src" / "modelCatalog.ts").read_text(encoding="utf-8")
        pricing_source = (MODELS_PACKAGE / "src" / "pricing.ts").read_text(encoding="utf-8")
        models_source = (MODELS_PACKAGE / "src" / "pages" / "Models.tsx").read_text(encoding="utf-8")
        details_source = (MODELS_PACKAGE / "src" / "pages" / "ModelDetails.tsx").read_text(encoding="utf-8")

        self.assertIn("export type ModelPricingStatus", model_data_source)
        self.assertIn("status?: ModelPricingStatus;", model_data_source)
        self.assertIn("reason?: string;", model_data_source)
        self.assertIn("pricingStatus(selectedReferenceUnitPrice", runtime_catalog_source)
        self.assertNotIn("customerUnitPrice", runtime_catalog_source)
        self.assertNotIn("grossMarginPerUnit", runtime_catalog_source)
        self.assertIn("function readPositiveDecimal(value: string | null | undefined)", runtime_catalog_source)
        self.assertIn("function normalizeReferencePrices(value: unknown)", runtime_catalog_source)
        self.assertIn("typeof priceAvailability?.reason === 'string'", runtime_catalog_source)
        self.assertIn("pricing.status", runtime_catalog_source)
        self.assertIn("pricing.reason", runtime_catalog_source)
        self.assertIn("unavailableFields?: Array<'input' | 'output' | 'cachedInput'>;", model_data_source)
        self.assertIn("unavailablePricingFields", runtime_catalog_source)
        self.assertIn("modelPricingFieldUnitLabel", catalog_source)
        self.assertIn("isModelPricingFieldUnavailable", catalog_source)
        self.assertIn("Price is unavailable for the selected billing meter.", pricing_source)
        self.assertIn("mergeRuntimeModelCatalog", service_source)
        self.assertIn("isModelExplicitlyFree", catalog_source)
        self.assertIn("model.pricing.status !== 'unavailable'", catalog_source)
        self.assertIn("modelPricingSortValue", catalog_source)
        self.assertIn("Number.POSITIVE_INFINITY", catalog_source)
        self.assertIn("Number.NEGATIVE_INFINITY", catalog_source)
        self.assertIn("modelPricingSortValue(a, 'low-to-high')", catalog_source)
        self.assertIn("modelPricingSortValue(a, 'high-to-low')", catalog_source)
        self.assertIn("formatModelPrice(", pricing_source)
        self.assertIn("formatModelPrice(", catalog_source)
        self.assertIn("deriveModelCatalogPricingView", models_source)
        self.assertNotIn("formatModelPrice(", models_source)
        self.assertIn("deriveModelCatalogDetailView", details_source)
        self.assertNotIn("formatModelPrice(", details_source)
        self.assertNotIn("model.pricing.input.toFixed", models_source)
        self.assertNotIn("model.pricing.input.toFixed", details_source)

    def test_models_runtime_node_test_covers_public_price_semantics(self) -> None:
        runtime_test_path = ROOT / "apps" / "sdkwork-clawrouter-pc" / "models-runtime.test.ts"
        verifier_path = ROOT / "scripts" / "verify-claw-router-application.mjs"

        self.assertTrue(runtime_test_path.exists(), "Portal must have executable Node tests for /models runtime mapping.")
        runtime_test_source = runtime_test_path.read_text(encoding="utf-8")
        verifier_source = verifier_path.read_text(encoding="utf-8")

        self.assertIn("mergeRuntimeModelCatalog", runtime_test_source)
        self.assertIn("deriveModelCatalogFilterOptions", runtime_test_source)
        self.assertIn("modelCatalogCategoryLabelKey", runtime_test_source)
        self.assertIn("modelCatalogCapabilityLabelKey", runtime_test_source)
        self.assertIn("deriveModelCatalogCardView", runtime_test_source)
        self.assertIn("deriveModelCatalogPricingView", runtime_test_source)
        self.assertIn("deriveModelCatalogDetailView", runtime_test_source)
        self.assertIn("filterModelsForCatalog", runtime_test_source)
        self.assertIn("filterProvidersForCatalog", runtime_test_source)
        self.assertIn("resolveDisplayedProvidersForCatalog", runtime_test_source)
        self.assertIn("resolveProviderShowMoreStateForCatalog", runtime_test_source)
        self.assertIn("model catalog provider search is pure case-insensitive and whitespace tolerant", runtime_test_source)
        self.assertIn("model catalog filter options derive unique sorted provider modality and capability values", runtime_test_source)
        self.assertIn("model catalog i18n label keys are normalized outside page rendering", runtime_test_source)
        self.assertIn("model catalog card view derives stable route copy and capability label keys", runtime_test_source)
        self.assertIn("model catalog pricing view derives token flat and unavailable cached cells", runtime_test_source)
        self.assertIn(
            "model catalog pricing view marks missing billing meters unavailable without rendering zero prices",
            runtime_test_source,
        )
        self.assertIn('unavailableFields: ["output", "cachedInput"]', runtime_test_source)
        self.assertIn("model catalog detail view derives copy route and sidebar rows", runtime_test_source)
        self.assertIn("model catalog detail view fills optional empty sidebar sections and performance safely", runtime_test_source)
        self.assertIn("model catalog displayed providers respect default limit search and show-all state", runtime_test_source)
        self.assertIn("model catalog provider show-more state is derived from filtered providers", runtime_test_source)
        self.assertIn("MODEL_CATEGORIES", runtime_test_source)
        self.assertIn("model catalog category filters are explicit business rules instead of passthrough labels", runtime_test_source)
        self.assertIn("runtime model catalog maps backend-owned model taxonomy instead of deriving sidebar filters locally", runtime_test_source)
        self.assertIn("model service sends sidebar filters through the generated app SDK query contract", runtime_test_source)
        self.assertIn("vendorCodes: [\"openai\", \"anthropic\"]", runtime_test_source)
        self.assertIn('requestUrl.searchParams.get("vendor_codes")', runtime_test_source)
        self.assertIn('requestUrl.searchParams.get("categories")', runtime_test_source)
        self.assertIn('requestUrl.searchParams.get("groups")', runtime_test_source)
        self.assertIn('requestUrl.searchParams.get("q")', runtime_test_source)
        self.assertIn('selectedCategories: ["Recommended"]', runtime_test_source)
        self.assertIn('selectedCategories: ["New"]', runtime_test_source)
        self.assertIn('selectedCategories: ["Unsupported"]', runtime_test_source)
        self.assertIn("formatModelPrice", runtime_test_source)
        self.assertIn("modelPricingBadgeLabel", runtime_test_source)
        self.assertIn("modelPricingUnitLabel", runtime_test_source)
        self.assertIn("status: \"reference\"", runtime_test_source)
        self.assertIn("status: \"unavailable\"", runtime_test_source)
        self.assertIn('officialReferencePrices: [', runtime_test_source)
        self.assertIn('regionCode: "global"', runtime_test_source)
        self.assertNotIn("officialReferenceUnitPrice", runtime_test_source)
        self.assertNotIn("officialReferenceCurrency", runtime_test_source)
        self.assertIn("pricing.status, \"reference\"", runtime_test_source)
        self.assertIn("pricing.status, \"unavailable\"", runtime_test_source)
        self.assertIn("resolveRuntimeModelCatalog", runtime_test_source)
        self.assertIn("returns an empty runtime catalog", runtime_test_source)
        self.assertIn("resolveRuntimeModelCatalog([])", runtime_test_source)
        self.assertIn("resolveRuntimeModelCatalog(null)", runtime_test_source)
        self.assertIn("malformedCatalogModels", runtime_test_source)
        self.assertIn("invalidCatalogModels", runtime_test_source)
        self.assertIn("skips malformed items while keeping usable runtime models", runtime_test_source)
        self.assertIn("bad-capability", runtime_test_source)
        self.assertIn("runtime-good", runtime_test_source)
        self.assertIn("model detail route resolver accepts encoded catalog route ids", runtime_test_source)
        self.assertIn('findModelByCatalogRouteId(TEST_ROUTE_MODELS, "openai%2Fgpt-4o-mini")', runtime_test_source)
        self.assertIn('findModelByCatalogRouteId(runtimeModels, encodeURIComponent("newvendor/runtime-good"))', runtime_test_source)
        self.assertIn('findModelByCatalogRouteId(runtimeModels, "%E0%A4%A")', runtime_test_source)
        self.assertIn("runtime model catalog rejects unsafe identifiers and caps public runtime text", runtime_test_source)
        self.assertIn('model: "bad\\nmodel"', runtime_test_source)
        self.assertIn("models[0].name.length <= 80", runtime_test_source)
        self.assertIn("models[0].pricing.reason?.length <= 160", runtime_test_source)
        self.assertIn("runtime model catalog omits blank normalized price reasons", runtime_test_source)
        self.assertIn('reason: "   "', runtime_test_source)
        self.assertIn('models[0].pricing.reason, "Public reference price is not configured for this model."', runtime_test_source)
        self.assertIn("treats malformed price payloads as unavailable instead of crashing", runtime_test_source)
        self.assertIn("treats malformed price payloads as unavailable instead of crashing", runtime_test_source)
        self.assertIn("reason: 100", runtime_test_source)
        for sensitive_field, _ in SENSITIVE_APP_MODEL_PRICE_FIELDS:
            self.assertIn(sensitive_field, runtime_test_source)

        self.assertIn("portal models runtime tests", verifier_source)
        self.assertIn("apps/sdkwork-clawrouter-pc/models-runtime.test.ts", verifier_source)

    def test_models_production_smoke_covers_routes_and_bundle_semantics(self) -> None:
        smoke_path = ROOT / "apps" / "sdkwork-clawrouter-pc" / "scripts" / "smoke-production-browser.mjs"
        product_test_path = ROOT / "scripts" / "run-claw-router-application.test.mjs"

        self.assertTrue(smoke_path.exists(), "Portal production smoke script must exist.")
        ssr_smoke_path = ROOT / "apps" / "sdkwork-clawrouter-pc" / "models-ssr-smoke.test.cjs"
        service_path = MODELS_PACKAGE / "src" / "modelService.ts"
        catalog_path = MODELS_PACKAGE / "src" / "modelCatalog.ts"
        smoke_source = smoke_path.read_text(encoding="utf-8")
        ssr_smoke_source = ssr_smoke_path.read_text(encoding="utf-8")
        product_test_source = product_test_path.read_text(encoding="utf-8")
        service_source = service_path.read_text(encoding="utf-8")
        catalog_source = catalog_path.read_text(encoding="utf-8")
        sdk_clients_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-clients.ts"
        ).read_text(encoding="utf-8")

        self.assertIn('pathName: "/models"', smoke_source)
        self.assertIn('pathName: "/models/openai%2Fgpt-5.5-pro"', smoke_source)
        self.assertIn('"GPT-5.5 Pro"', smoke_source)
        self.assertIn('"GPT-5.5"', smoke_source)
        self.assertIn('"Claude Opus 4.7"', smoke_source)
        self.assertIn('pathName: "/models?__browser-smoke-runtime=1"', smoke_source)
        self.assertIn('pathName: "/models?__browser-smoke-groups=1"', smoke_source)
        self.assertIn('pathName: "/models?__browser-smoke-filter=1"', smoke_source)
        self.assertIn('pathName: "/models?__browser-smoke-empty-runtime=1"', smoke_source)
        self.assertIn('pathName: "/models/newvendor%2Fruntime-good?__browser-smoke-detail=1"', smoke_source)
        self.assertIn('pathName: "/models/unpricedvendor%2Fruntime-unpriced?__browser-smoke-unavailable-detail=1"', smoke_source)
        self.assertIn("APP_SDK_MODEL_FIXTURE_MODE", smoke_source)
        self.assertIn("/app/v3/api/ai/models", smoke_source)
        self.assertIn("Runtime Good", smoke_source)
        self.assertIn("Runtime Enterprise", smoke_source)
        self.assertIn("Runtime Unpriced", smoke_source)
        self.assertIn(
            "Public reference price only. Customer-specific pricing requires an API key context.",
            smoke_source,
        )
        self.assertIn("Public reference price is not configured for this model.", smoke_source)
        self.assertIn("Price is unavailable for the selected billing meter.", smoke_source)
        for sensitive_field, _ in SENSITIVE_APP_MODEL_PRICE_FIELDS:
            self.assertIn(sensitive_field, smoke_source)

        self.assertIn("getModelsAppSdkClient().ai.models.list", service_source)
        self.assertIn("normalizeQueryValues(filters.vendorCodes)", service_source)
        self.assertIn("normalizeQueryValues(filters.categories)", service_source)
        self.assertIn("normalizeQueryValues(filters.groups)", service_source)
        self.assertIn("filterModelsForCatalog", catalog_source)
        self.assertIn("resetModelCatalogFilters", catalog_source)
        self.assertIn("resolveProviderShowMoreStateForCatalog", catalog_source)
        self.assertIn("selectedGroups", catalog_source)
        self.assertIn("providerDocsLabelKey", catalog_source)
        self.assertIn("specificationsLabelKey", catalog_source)
        self.assertIn("models.details.performanceSource", catalog_source)
        self.assertIn("createClawRouterAppSdkModelExample", catalog_source)
        self.assertIn("JSON.stringify(modelId)", sdk_clients_source)

        self.assertIn("portal production browser DOM smoke", product_test_source)
        self.assertIn("/models?__browser-smoke-runtime=1", product_test_source)
        self.assertIn("models route SSR renders the SDK-backed shell without exposing private pricing fields", ssr_smoke_source)
        self.assertIn("model detail encoded id route SSR matches the catalog card navigation path", ssr_smoke_source)
        self.assertIn("'/models/openai%2Fgpt-5.5-pro'", ssr_smoke_source)
        self.assertNotIn("'/models/openai/global/gpt-5.5-pro'", ssr_smoke_source)
        self.assertNotIn("path: '/models/:provider/:region/:model'", ssr_smoke_source)
        self.assertIn("path: '/models/:id'", ssr_smoke_source)

    def _route_entry(self, classification: dict[str, Any], route: str) -> dict[str, Any]:
        for entry in classification.get("routes", []):
            if isinstance(entry, dict) and entry.get("route") == route:
                return entry
        self.fail(f"Missing frontend route classification for {route}.")

    def _operation(self, contract: dict[str, Any], source: str, operation: str) -> dict[str, Any]:
        for entry in contract.get("frontend_operations", []):
            if (
                isinstance(entry, dict)
                and entry.get("source") == source
                and entry.get("operation") == operation
            ):
                return entry
        self.fail(f"Missing frontend operation contract for {source}#{operation}.")


if __name__ == "__main__":
    unittest.main()
