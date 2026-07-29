import json
import tempfile
import unittest
from pathlib import Path

from tools.clawrouter_openapi_contract_audit import ClawRouterOpenApiContractAudit


class ClawRouterOpenApiContractAuditTest(unittest.TestCase):
    def write_specs(
        self,
        root: Path,
        *,
        app_spec: dict | None = None,
        backend_spec: dict | None = None,
    ) -> None:
        openapi_dir = root / "generated" / "openapi"
        openapi_dir.mkdir(parents=True, exist_ok=True)
        (openapi_dir / "clawrouter-app-openapi.json").write_text(
            json.dumps(app_spec or self.valid_spec("app"), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (openapi_dir / "clawrouter-backend-openapi.json").write_text(
            json.dumps(backend_spec or self.valid_spec("backend"), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def valid_spec(self, surface: str) -> dict:
        api_prefix = "/app/v3/api" if surface == "app" else "/backend/v3/api"
        return {
            "openapi": "3.1.2",
            "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
            "info": {
                "title": f"Claw Router {surface} API",
                "version": "0.1.0",
                "description": f"Generated {surface} OpenAPI contract.",
            },
            "servers": [{"url": "http://localhost:18082" if surface == "app" else "http://localhost:18081"}],
            "security": [{"AuthToken": [], "AccessToken": []}],
            "tags": [{"name": "ai"}],
            "paths": {
                f"{api_prefix}/ai/model_vendors": {
                    "post": {
                        "operationId": "modelVendors.create",
                        "summary": "Create model vendor",
                        "description": "Create a model vendor resource.",
                        "tags": ["ai"],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/CreateModelVendorRequest"}
                                }
                            },
                        },
                        "responses": {
                            "201": {
                                "description": "Created response.",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/CreateModelVendorResult"}
                                    }
                                },
                            },
                            "default": {
                                "description": "Error response.",
                                "content": {
                                    "application/problem+json": {"schema": {"$ref": "#/components/schemas/ProblemDetail"}}
                                },
                            },
                        },
                        "x-sdkwork-domain": "intelligence",
                        "x-sdkwork-resource": "modelVendors",
                    }
                },
                f"{api_prefix}/ai/model_vendors/refresh": {
                    "post": {
                        "operationId": "modelVendors.refresh",
                        "summary": "Refresh model vendors",
                        "description": "Refresh derived model vendor data.",
                        "tags": ["ai"],
                        "responses": {
                            "200": {
                                "description": "Successful response.",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/RefreshModelVendorsResult"}
                                    }
                                },
                            },
                            "default": {
                                "description": "Error response.",
                                "content": {
                                    "application/problem+json": {"schema": {"$ref": "#/components/schemas/ProblemDetail"}}
                                },
                            },
                        },
                        "x-sdkwork-domain": "intelligence",
                        "x-sdkwork-resource": "modelVendors",
                    }
                }
            },
            "components": {
                "securitySchemes": {
                    "AuthToken": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "SDKWork auth token",
                    },
                    "AccessToken": {
                        "type": "apiKey",
                        "in": "header",
                        "name": "Access-Token",
                    },
                },
                "schemas": {
                    "CreateModelVendorRequest": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["vendorCode"],
                        "properties": {
                            "vendorCode": {"type": "string"},
                        },
                    },
                    "CreateModelVendorResult": {
                        "allOf": [
                            {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                            {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["data"],
                                "properties": {
                                    "data": {
                                        "allOf": [{"$ref": "#/components/schemas/AiModelVendorRecord"}],
                                        "description": "Created model vendor payload.",
                                    },
                                },
                            },
                        ],
                        "x-operation-id": "modelVendors.create",
                    },
                    "AiModelVendorRecord": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "vendorCode": {"type": "string"},
                        },
                    },
                    "SdkWorkApiResponse": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["code", "data", "traceId"],
                        "properties": {
                            "code": {"type": "integer", "format": "int32", "enum": [0], "minimum": 0, "maximum": 0},
                            "data": {"description": "Operation-specific payload."},
                            "traceId": {"type": "string", "format": "uuid"},
                        },
                    },
                    "SdkWorkPlatformErrorCode": {
                        "type": "integer",
                        "format": "int32",
                        "minimum": 40001,
                        "maximum": 79999,
                    },
                    "NoData": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {},
                        "description": "Closed empty payload for operations that complete without business data.",
                    },
                    "RefreshModelVendorsResult": {
                        "allOf": [
                            {"$ref": "#/components/schemas/SdkWorkApiResponse"},
                            {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["data"],
                                "properties": {
                                    "data": {
                                        "allOf": [{"$ref": "#/components/schemas/NoData"}],
                                        "description": "No business data returned by this operation.",
                                    },
                                },
                            },
                        ],
                        "x-operation-id": "modelVendors.refresh",
                    },
                    "FieldError": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["field", "message"],
                        "properties": {
                            "field": {"type": "string"},
                            "code": {"type": "integer", "format": "int32", "minimum": 40011, "maximum": 40099},
                            "message": {"type": "string"},
                        },
                    },
                    "ProblemDetail": {
                        "type": "object",
                        "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                        "required": ["type", "title", "status", "code", "traceId"],
                        "properties": {
                            "type": {"type": "string", "format": "uri-reference"},
                            "title": {"type": "string"},
                            "status": {"type": "integer", "minimum": 100, "maximum": 599},
                            "detail": {"type": "string"},
                            "instance": {"type": "string"},
                            "code": {"$ref": "#/components/schemas/SdkWorkPlatformErrorCode"},
                            "traceId": {"type": "string", "format": "uuid"},
                            "errors": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/FieldError"},
                            },
                        },
                    },
                    "JsonValue": {
                        "oneOf": [
                            {"type": "string"},
                            {"$ref": "#/components/schemas/JsonObject"},
                        ]
                    },
                    "JsonObject": {
                        "type": "object",
                        "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                    },
                },
            },
        }

    def test_accepts_precise_app_and_backend_specs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_specs(root)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_multipart_request_body_component_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            operation = spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]
            operation["requestBody"] = {
                "required": True,
                "content": {
                    "multipart/form-data": {
                        "schema": {"$ref": "#/components/schemas/CreateModelVendorRequest"}
                    }
                },
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_single_bearer_auth_security_regression(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["security"] = [{"bearerAuth": []}]
            spec["components"]["securitySchemes"] = {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                }
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app OpenAPI components.securitySchemes.AuthToken must be an http bearer scheme",
                result.messages,
            )
            self.assertIn(
                "app OpenAPI security must require AuthToken and AccessToken",
                result.messages,
            )

    def test_rejects_openapi_30_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["openapi"] = "3.0.3"
            spec.pop("jsonSchemaDialect", None)
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("app OpenAPI version must be 3.1.2", result.messages)
            self.assertIn(
                "app OpenAPI jsonSchemaDialect must be https://json-schema.org/draft/2020-12/schema",
                result.messages,
            )

    def test_rejects_flat_operation_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["operationId"] = "createModelVendor"
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors operationId createModelVendor must use dotted lowerCamel resource.action format",
                result.messages,
            )

    def test_rejects_operation_id_that_repeats_tag_namespace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["operationId"] = "ai.modelVendors.create"
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors operationId ai.modelVendors.create must not repeat tag ai",
                result.messages,
            )

    def test_accepts_top_level_vertical_sdk_domains_that_repeat_tag_namespace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            create_prompt = spec["paths"].pop("/backend/v3/api/ai/model_vendors")
            render_prompt = spec["paths"].pop("/backend/v3/api/ai/model_vendors/refresh")
            create_prompt["post"]["operationId"] = "prompts.create"
            create_prompt["post"]["tags"] = ["prompts"]
            create_prompt["post"]["x-sdkwork-domain"] = "prompts"
            create_prompt["post"]["x-sdkwork-resource"] = "prompts"
            render_prompt["post"]["operationId"] = "prompts.versions.render"
            render_prompt["post"]["tags"] = ["prompts"]
            render_prompt["post"]["x-sdkwork-domain"] = "prompts"
            render_prompt["post"]["x-sdkwork-resource"] = "prompts.versions"

            discover_mcp = json.loads(json.dumps(render_prompt))
            discover_mcp["post"]["operationId"] = "mcp.servers.discover"
            discover_mcp["post"]["tags"] = ["mcp"]
            discover_mcp["post"]["x-sdkwork-domain"] = "mcp"
            discover_mcp["post"]["x-sdkwork-resource"] = "mcp.servers"
            health_check = json.loads(json.dumps(discover_mcp))
            health_check["post"]["operationId"] = "mcp.servers.healthCheck"

            spec["tags"] = [{"name": "prompts"}, {"name": "mcp"}]
            spec["paths"]["/backend/v3/api/prompts"] = create_prompt
            spec["paths"]["/backend/v3/api/prompts/versions/{versionId}/render"] = render_prompt
            spec["paths"]["/backend/v3/api/mcp/servers/{serverId}/discover"] = discover_mcp
            spec["paths"]["/backend/v3/api/mcp/servers/{serverId}/health_check"] = health_check
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_non_standard_operation_actions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["operationId"] = "modelVendors.search"
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors operationId action search must use standard SDKWork action vocabulary",
                result.messages,
            )

    def test_accepts_commerce_purchase_lifecycle_operation_actions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            renew_operation = spec["paths"].pop("/app/v3/api/ai/model_vendors/refresh")
            renew_operation["post"]["operationId"] = "vip.purchase.renew"
            renew_operation["post"]["tags"] = ["billing"]
            renew_operation["post"]["x-sdkwork-domain"] = "commerce"
            renew_operation["post"]["x-sdkwork-resource"] = "vip.purchase"
            upgrade_operation = json.loads(json.dumps(renew_operation))
            upgrade_operation["post"]["operationId"] = "vip.purchase.upgrade"
            spec["paths"]["/app/v3/api/billing/vip/purchase/renew"] = renew_operation
            spec["paths"]["/app/v3/api/billing/vip/purchase/upgrade"] = upgrade_operation
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_unapproved_backend_hyphenated_content_resources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            operation = spec["paths"].pop("/backend/v3/api/ai/model_vendors")
            operation["post"]["operationId"] = "contentOffers.review"
            operation["post"]["tags"] = ["content"]
            operation["post"]["x-sdkwork-domain"] = "content"
            operation["post"]["x-sdkwork-resource"] = "contentOffers"
            spec["paths"]["/backend/v3/api/content/content-offers"] = operation
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend path /backend/v3/api/content/content-offers static segment content-offers must be lowercase lower_snake_case",
                result.messages,
            )

    def test_rejects_rpc_style_path_segments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            operation = spec["paths"].pop("/app/v3/api/ai/model_vendors")
            operation["post"]["operationId"] = "modelVendors.list"
            spec["paths"]["/app/v3/api/ai/model_vendors/list"] = operation
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app path /app/v3/api/ai/model_vendors/list static segment list must not encode RPC action; use resource path plus operationId action",
                result.messages,
            )

    def test_allows_non_standard_surface_prefix_but_rejects_path_naming(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            operation = spec["paths"].pop("/app/v3/api/ai/model_vendors")
            spec["paths"]["/v3/api/ai/modelVendors/{model_vendor_id}"] = operation
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertNotIn(
                "app path /v3/api/ai/modelVendors/{model_vendor_id} must start with /app/v3/api",
                result.messages,
            )
            self.assertIn(
                "app path /v3/api/ai/modelVendors/{model_vendor_id} static segment modelVendors must be lowercase lower_snake_case",
                result.messages,
            )
            self.assertIn(
                "app path /v3/api/ai/modelVendors/{model_vendor_id} parameter model_vendor_id must be lowerCamelCase",
                result.messages,
            )

    def test_rejects_backend_auth_namespace_routes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            operation = spec["paths"].pop("/backend/v3/api/ai/model_vendors")
            spec["paths"]["/backend/v3/api/auth/sessions"] = operation
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend path /backend/v3/api/auth/sessions must not expose auth namespace routes",
                result.messages,
            )

    def test_rejects_non_standard_access_token_security_scheme(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["securitySchemes"]["AccessToken"]["name"] = "X-Access-Token"
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app OpenAPI components.securitySchemes.AccessToken must be an apiKey header named Access-Token",
                result.messages,
            )

    def test_rejects_branded_access_token_security_scheme_names(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            vendor = "Sdkwork"
            spec["components"]["securitySchemes"][f"{vendor}AccessToken"] = {
                "type": "apiKey",
                "in": "header",
                "name": "Access-Token",
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app OpenAPI must not declare branded access token security scheme names",
                result.messages,
            )

    def test_rejects_non_lower_snake_case_query_parameter_names(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["parameters"] = [
                {
                    "name": "pageSize",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "integer", "minimum": 1, "maximum": 200},
                }
            ]
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter pageSize must be lower_snake_case",
                result.messages,
            )

    def test_rejects_standard_query_parameter_aliases(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["parameters"] = [
                {
                    "name": "q",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string", "maxLength": 128},
                },
                {
                    "name": "keyword",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string", "maxLength": 128},
                },
                {
                    "name": "search_query",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string", "maxLength": 128},
                },
                {
                    "name": "search",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string", "maxLength": 128},
                },
                {
                    "name": "searchQuery",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string", "maxLength": 128},
                },
                {
                    "name": "size",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "integer", "minimum": 1, "maximum": 200},
                },
            ]
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter keyword must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter search_query must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter search must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter searchQuery must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors query parameter size must use page_size for page size",
                result.messages,
            )

    def test_rejects_request_body_search_aliases_and_allows_q(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CreateModelVendorRequest"]["properties"] = {
                "vendorCode": {"type": "string"},
                "q": {"type": "string", "maxLength": 128},
                "keyword": {"type": "string", "maxLength": 128},
                "search_query": {"type": "string", "maxLength": 128},
                "search": {"type": "string", "maxLength": 128},
                "searchQuery": {"type": "string", "maxLength": 128},
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors request schema CreateModelVendorRequest.keyword must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors request schema CreateModelVendorRequest.search_query must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors request schema CreateModelVendorRequest.search must use q for search text",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors request schema CreateModelVendorRequest.searchQuery must use q for search text",
                result.messages,
            )
            self.assertFalse(
                any("CreateModelVendorRequest.q must use" in message for message in result.messages),
                result.messages,
            )

    def test_rejects_error_response_component_and_json_error_media_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["ErrorResponse"] = {
                "type": "object",
                "properties": {"message": {"type": "string"}},
            }
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["responses"]["default"]["content"] = {
                "application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app schema component ErrorResponse is forbidden; use ProblemDetail for error responses",
                result.messages,
            )
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors default response must use application/problem+json",
                result.messages,
            )

    def test_rejects_missing_default_problem_detail_error_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            del spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["responses"]["default"]
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors must declare default application/problem+json ProblemDetail response",
                result.messages,
            )

    def test_rejects_problem_detail_with_request_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["ProblemDetail"]["properties"]["requestId"] = {"type": "string"}
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app schema component ProblemDetail must not declare forbidden wire field requestId",
                result.messages,
            )

    def test_rejects_shared_weak_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            spec["components"]["schemas"]["OperationRequest"] = {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
            }
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend schema component OperationRequest is forbidden; use operation-specific request DTOs",
                result.messages,
            )

    def test_rejects_unbounded_empty_request_body_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CreateModelVendorRequest"] = {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                "properties": {},
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors request schema CreateModelVendorRequest must be a closed empty object or define explicit properties",
                result.messages,
            )

    def test_rejects_ref_sibling_fields_ignored_by_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CreateModelVendorResult"]["allOf"][1]["properties"]["data"] = {
                "$ref": "#/components/schemas/AiModelVendorRecord",
                "description": "Ignored by OpenAPI Reference Object rules.",
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app components.schemas.CreateModelVendorResult.allOf[1].properties.data $ref must not have sibling fields; use allOf/oneOf composition",
                result.messages,
            )

    def test_rejects_missing_local_component_reference(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            del spec["components"]["schemas"]["AiModelVendorRecord"]
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend components.schemas.CreateModelVendorResult.allOf[1].properties.data.allOf[0] references missing component schema AiModelVendorRecord",
                result.messages,
            )

    def test_rejects_direct_plus_api_result_for_no_data_success_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors/refresh"]["post"]["responses"]["200"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/PlusApiResult"
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors/refresh 200 response must use SdkWorkApiResponse envelope, not legacy PlusApiResult",
                result.messages,
            )

    def test_rejects_shared_plus_api_result_for_business_data_success_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["paths"]["/app/v3/api/ai/model_vendors"]["post"]["responses"]["201"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/PlusApiResult"
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors 201 response must use SdkWorkApiResponse envelope, not legacy PlusApiResult",
                result.messages,
            )

    def test_rejects_result_schema_with_plus_api_result_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CreateModelVendorResult"]["allOf"][1]["properties"]["data"] = {
                "$ref": "#/components/schemas/PlusApiResult"
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors result schema CreateModelVendorResult.data must not reference PlusApiResult",
                result.messages,
            )

    def test_rejects_result_schema_without_explicit_data_field(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            del spec["components"]["schemas"]["CreateModelVendorResult"]["allOf"][1]["properties"]["data"]
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend POST /backend/v3/api/ai/model_vendors result schema CreateModelVendorResult.data must be explicitly declared",
                result.messages,
            )

    def test_rejects_plus_api_result_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            spec["components"]["schemas"]["PlusApiResult"] = {
                "type": "object",
                "properties": {"code": {"type": "string"}, "data": {"type": "object"}},
            }
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend schema component PlusApiResult is forbidden; use SdkWorkApiResponse per API_SPEC.md section 15",
                result.messages,
            )

    def test_rejects_open_no_data_schema_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["NoData"] = {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
                "properties": {"unexpected": {"type": "string"}},
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app schema component NoData must be a closed empty object",
                result.messages,
            )

    def test_rejects_unbounded_result_data_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["AiModelVendorRecord"] = {
                "type": "object",
                "additionalProperties": True,
                "properties": {},
            }
            self.write_specs(root, app_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app POST /app/v3/api/ai/model_vendors result schema CreateModelVendorResult.data component AiModelVendorRecord object schema must not use unbounded additionalProperties true",
                result.messages,
            )

    def test_rejects_array_schema_without_typed_items(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = self.valid_spec("backend")
            spec["components"]["schemas"]["CreateModelVendorRequest"]["properties"]["labels"] = {
                "type": "array"
            }
            self.write_specs(root, backend_spec=spec)

            result = ClawRouterOpenApiContractAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend POST /backend/v3/api/ai/model_vendors request schema CreateModelVendorRequest.labels array schema must declare typed items",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
