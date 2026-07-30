import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator
from tools.clawrouter_openapi_precision_audit import ClawRouterOpenApiPrecisionAudit


class ClawRouterOpenApiPrecisionAuditTest(unittest.TestCase):
    def write_manifest(self, root: Path) -> None:
        manifest = root / "generated" / "api" / "api-contract-manifest.json"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(
            json.dumps(
                {
                    "schema": {"version": "0.1.0"},
                    "sdk_boundaries": {
                        "app": {
                            "api_prefix": "/app/v3/api",
                            "sdk_client": "SdkworkAppClient",
                            "sdk_family": "app",
                        },
                        "backend": {
                            "api_prefix": "/backend/v3/api",
                            "sdk_client": "SdkworkBackendClient",
                            "sdk_family": "backend",
                        },
                    },
                    "operations": [
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/model-vendors",
                            "operation": "fetchModelVendors",
                            "operation_id": "modelVendors.list",
                            "tag": "models",
                            "kind": "read",
                            "path_params": [],
                            "source": "apps/portal/modelService.ts",
                            "read_sources": ["ai_model_vendor"],
                            "write_tables": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/model-vendors/{vendorCode}",
                            "operation": "getModelVendor",
                            "operation_id": "modelVendors.retrieve",
                            "tag": "models",
                            "kind": "read",
                            "path_params": ["vendorCode"],
                            "source": "apps/portal/modelService.ts",
                            "read_sources": ["ai_model_vendor"],
                            "write_tables": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/model-vendors",
                            "operation": "fetchModelVendorsForRankings",
                            "operation_id": "modelVendors.rankings.list",
                            "tag": "models",
                            "kind": "read",
                            "path_params": [],
                            "source": "apps/portal/rankingService.ts",
                            "read_sources": ["ai_model_vendor", "ai_model"],
                            "write_tables": [],
                            "openapi_exposed": False,
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/dashboard",
                            "operation": "fetchDashboard",
                            "operation_id": "dashboard.retrieve",
                            "tag": "dashboard",
                            "kind": "read",
                            "path_params": [],
                            "source": "apps/portal/dashboardService.ts",
                            "read_sources": ["ai_model_vendor", "ai_request_trace"],
                            "write_tables": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/model-vendors",
                            "operation": "createModelVendor",
                            "operation_id": "modelVendors.create",
                            "tag": "models",
                            "kind": "create",
                            "path_params": [],
                            "source": "apps/portal/modelService.ts",
                            "read_sources": ["ai_model_vendor"],
                            "write_tables": ["ai_model_vendor"],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/iam/api_keys",
                            "operation": "createKey",
                            "operation_id": "apiKeys.create",
                            "tag": "iam",
                            "kind": "create",
                            "path_params": [],
                            "source": "apps/portal/apiKeyService.ts",
                            "read_sources": ["ai_channel_group"],
                            "write_tables": ["iam_gateway_api_key", "ops_audit_log"],
                            "response_schema": {
                                "name": "CreateApiKeyResponse",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["rawKey"],
                                    "properties": {
                                        "rawKey": {"type": "string"},
                                    },
                                },
                            },
                        },
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    def write_schema_components(self, root: Path) -> None:
        components = root / "generated" / "openapi" / "schema-components.yaml"
        components.parent.mkdir(parents=True, exist_ok=True)
        components.write_text(
            textwrap.dedent(
                """
                components:
                  schemas:
                    AiModelVendorRecord:
                      type: object
                      x-table: ai_model_vendor
                      properties:
                        vendor_code:
                          type: string
                    AiRequestTraceRecord:
                      type: object
                      x-table: ai_request_trace
                      properties:
                        trace_id:
                          type: string
                    IamGatewayChannelGroupRecord:
                      type: object
                      x-table: ai_channel_group
                      properties:
                        code:
                          type: string
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

    def write_generated_openapi(self, root: Path) -> None:
        self.write_manifest(root)
        self.write_schema_components(root)
        ClawRouterOpenApiGenerator(root=root).write()

    def read_app_spec(self, root: Path) -> dict:
        return json.loads((root / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(encoding="utf-8"))

    def write_app_spec(self, root: Path, spec: dict) -> None:
        (root / "generated" / "openapi" / "clawrouter-app-openapi.json").write_text(
            json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def test_accepts_generated_precise_get_responses(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)

            self.assertEqual(
                "modelVendors.list",
                spec["paths"]["/app/v3/api/model-vendors"]["get"]["operationId"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/ModelVendorsListResult"},
                spec["paths"]["/app/v3/api/model-vendors"]["get"]["responses"]["200"]["content"]["application/json"]["schema"],
            )

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_explicit_response_schema_for_non_get_operation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)

            self.assertEqual(
                {"$ref": "#/components/schemas/ApiKeysCreateResult"},
                spec["paths"]["/app/v3/api/iam/api_keys"]["post"]["responses"]["201"]["content"]["application/json"]["schema"],
            )

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_no_data_operation_uses_operation_result_with_no_data_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            self.assertEqual(
                {"$ref": "#/components/schemas/ModelVendorsCreateResult"},
                spec["paths"]["/app/v3/api/model-vendors"]["post"]["responses"]["201"]["content"]["application/json"]["schema"],
            )
            self.assertIn("ModelVendorsCreateResult", spec["components"]["schemas"])
            self.assertIn("NoData", spec["components"]["schemas"])
            self.assertEqual(
                [{"$ref": "#/components/schemas/NoData"}],
                spec["components"]["schemas"]["ModelVendorsCreateResult"]["allOf"][1]["properties"]["data"]["allOf"],
            )

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_operation_result_wrapper_for_no_data_operation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            spec["components"]["schemas"]["UnexpectedModelVendorsCreateResult"] = {
                "type": "object",
                "additionalProperties": False,
                "required": ["code"],
                "x-operation-id": "modelVendors.create",
                "properties": {
                    "code": {"type": "string"},
                    "data": {"$ref": "#/components/schemas/AiModelVendorRecord"},
                },
            }
            self.write_app_spec(root, spec)

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app modelVendors.create result schema name must be ModelVendorsCreateResult",
                result.messages,
            )

    def test_rejects_business_data_schema_for_no_data_operation_result(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            spec["components"]["schemas"]["ModelVendorsCreateResult"] = {
                "type": "object",
                "additionalProperties": False,
                "required": ["code"],
                "x-operation-id": "modelVendors.create",
                "properties": {
                    "code": {"type": "string"},
                    "data": {"$ref": "#/components/schemas/AiModelVendorRecord"},
                },
            }
            self.write_app_spec(root, spec)

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app modelVendors.create data schema must be {'$ref': '#/components/schemas/NoData'}",
                result.messages,
            )

    def test_rejects_shared_plus_api_result_for_business_data_operation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            spec["paths"]["/app/v3/api/iam/api_keys"]["post"]["responses"]["201"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/PlusApiResult"
            }
            self.write_app_spec(root, spec)

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app apiKeys.create success response must reference #/components/schemas/ApiKeysCreateResult",
                result.messages,
            )

    def test_rejects_array_data_for_path_parameter_get_record_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            result_schema = spec["components"]["schemas"]["ModelVendorsRetrieveResult"]
            result_schema["allOf"][1]["properties"]["data"] = {
                "type": "array",
                "items": {"$ref": "#/components/schemas/AiModelVendorRecord"},
            }
            self.write_app_spec(root, spec)

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app modelVendors.retrieve data schema must be {'$ref': '#/components/schemas/AiModelVendorRecord'}",
                result.messages,
            )

    def test_dependency_operation_matches_normalized_path_parameter_names(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            workspace_root = Path(tmp)
            root = workspace_root / "sdkwork-clawrouter"
            manifest_path = root / "generated" / "api" / "api-contract-manifest.json"
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(
                json.dumps(
                    {
                        "schema": {"version": "0.1.0"},
                        "sdk_boundaries": {
                            "app": {
                                "api_prefix": "/app/v3/api",
                                "sdk_client": "SdkworkAppClient",
                                "sdk_family": "app",
                            },
                            "backend": {
                                "api_prefix": "/backend/v3/api",
                                "sdk_client": "SdkworkBackendClient",
                                "sdk_family": "backend",
                            },
                        },
                        "operations": [
                            {
                                "api_surface": "app",
                                "api_method": "GET",
                                "api_path": "/app/v3/api/iam/users/{userId}",
                                "operation": "fetchUser",
                                "operation_id": "users.retrieve",
                                "tag": "iam",
                                "kind": "read",
                                "path_params": ["userId"],
                                "source": "apps/portal/userService.ts",
                                "read_sources": ["iam_user"],
                                "write_tables": [],
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            app_family = root / "sdks" / "clawrouter-app-sdk"
            app_family.mkdir(parents=True, exist_ok=True)
            (app_family / "sdk-manifest.json").write_text(
                json.dumps(
                    {
                        "sdkDependencies": [
                            {
                                "workspace": "sdkwork-iam-app-sdk",
                                "dependencyMode": "consumer-sdk",
                            }
                        ]
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            dependency_family = (
                workspace_root / "sdkwork-iam" / "sdks" / "sdkwork-iam-app-sdk"
            )
            dependency_openapi = (
                dependency_family / "openapi" / "sdkwork-iam-app-api.openapi.json"
            )
            dependency_openapi.parent.mkdir(parents=True, exist_ok=True)
            (dependency_family / "sdk-manifest.json").write_text(
                json.dumps(
                    {"authoritySpec": "openapi/sdkwork-iam-app-api.openapi.json"},
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            dependency_openapi.write_text(
                json.dumps(
                    {
                        "openapi": "3.1.2",
                        "paths": {
                            "/app/v3/api/iam/users/{id}": {
                                "get": {"operationId": "users.retrieve"}
                            }
                        },
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_public_model_catalog_private_pricing_schema_regression(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_generated_openapi(root)
            spec = self.read_app_spec(root)
            schemas = spec["components"]["schemas"]
            schemas["AppModelCatalogItem"] = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "model": {"type": "string"},
                    "lowestUpstreamCostUnitPrice": {"type": "string", "nullable": True},
                    "priceAvailability": {"$ref": "#/components/schemas/AppModelCatalogPriceAvailability"},
                },
            }
            schemas["AppModelCatalogPriceAvailability"] = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "status": {"type": "string", "enum": ["available", "unavailable"]},
                    "customerUnitPrice": {"type": "string"},
                    "grossMarginPerUnit": {"type": "string", "nullable": True},
                    "pricingPlanCode": {"type": "string"},
                    "groupCode": {"type": "string"},
                },
            }
            self.write_app_spec(root, spec)

            result = ClawRouterOpenApiPrecisionAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app AppModelCatalogPriceAvailability.status enum must be ['reference', 'unavailable']",
                result.messages,
            )
            self.assertIn(
                "app AppModelCatalogItem must not expose public private pricing field lowestUpstreamCostUnitPrice",
                result.messages,
            )
            self.assertIn(
                "app AppModelCatalogPriceAvailability must not expose public private pricing field customerUnitPrice",
                result.messages,
            )
            self.assertIn(
                "app AppModelCatalogPriceAvailability must not expose public private pricing field grossMarginPerUnit",
                result.messages,
            )
            self.assertIn(
                "app AppModelCatalogPriceAvailability must not expose public private pricing field pricingPlanCode",
                result.messages,
            )
            self.assertIn(
                "app AppModelCatalogPriceAvailability must not expose public private pricing field groupCode",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
