import json
import tempfile
import unittest
from pathlib import Path

from tools.appbase_openapi_schema_guardian import AppbaseOpenApiSchemaGuardian


class AppbaseOpenApiSchemaGuardianTest(unittest.TestCase):
    def write_openapi(self, root: Path, surface: str, spec: dict) -> None:
        output = root / "generated" / "openapi" / f"clawrouter-{surface}-openapi.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def write_manifest(self, root: Path, operations: list[dict]) -> None:
        output = root / "generated" / "api" / "api-contract-manifest.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(
                {
                    "schema": {"version": "0.1.0"},
                    "operations": operations,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    def write_sdk(self, root: Path, surface: str, source: str) -> None:
        package = "clawrouter-app-sdk" if surface == "app" else "clawrouter-backend-sdk"
        api_dir = root / "sdks" / package / f"{package}-typescript" / "src" / "api"
        api_dir.mkdir(parents=True, exist_ok=True)
        (api_dir / "commerce.ts").write_text(source, encoding="utf-8")

    def write_sdk_type(self, root: Path, surface: str, component_name: str) -> None:
        package = "clawrouter-app-sdk" if surface == "app" else "clawrouter-backend-sdk"
        types_dir = root / "sdks" / package / f"{package}-typescript" / "src" / "types"
        types_dir.mkdir(parents=True, exist_ok=True)
        module_name = self.component_module_name(component_name)
        (types_dir / f"{module_name}.ts").write_text(
            f"export interface {component_name} {{}}\n",
            encoding="utf-8",
        )
        index_path = types_dir / "index.ts"
        with index_path.open("a", encoding="utf-8") as handle:
            handle.write(f"export type {{ {component_name} }} from './{module_name}';\n")

    def write_sdk_types(self, root: Path, surface: str, component_names: list[str]) -> None:
        for component_name in component_names:
            self.write_sdk_type(root, surface, component_name)

    def write_dependency_sdk(self, root: Path, surface: str, source: str) -> None:
        package = "sdkwork-commerce-app-sdk" if surface == "app" else "sdkwork-commerce-backend-sdk"
        api_dir = (
            root
            / "sdkwork-commerce"
            / "sdks"
            / package
            / f"{package}-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "api"
        )
        api_dir.mkdir(parents=True, exist_ok=True)
        (api_dir / "commerce.ts").write_text(source, encoding="utf-8")

    def write_dependency_sdk_type(self, root: Path, surface: str, component_name: str) -> None:
        package = "sdkwork-commerce-app-sdk" if surface == "app" else "sdkwork-commerce-backend-sdk"
        types_dir = (
            root
            / "sdkwork-commerce"
            / "sdks"
            / package
            / f"{package}-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "types"
        )
        types_dir.mkdir(parents=True, exist_ok=True)
        module_name = self.component_module_name(component_name)
        (types_dir / f"{module_name}.ts").write_text(
            f"export interface {component_name} {{}}\n",
            encoding="utf-8",
        )
        index_path = types_dir / "index.ts"
        with index_path.open("a", encoding="utf-8") as handle:
            handle.write(f"export type {{ {component_name} }} from './{module_name}';\n")

    def write_dependency_sdk_types(self, root: Path, surface: str, component_names: list[str]) -> None:
        for component_name in component_names:
            self.write_dependency_sdk_type(root, surface, component_name)

    def component_module_name(self, component_name: str) -> str:
        result = []
        for index, char in enumerate(component_name):
            if char.isupper() and index > 0:
                result.append("-")
            result.append(char.lower())
        return "".join(result)

    def valid_spec(self, surface: str) -> dict:
        api_prefix = "/app/v3/api" if surface == "app" else "/backend/v3/api"
        operation_id = "catalog.products.retrieve"
        path = f"{api_prefix}/catalog/products/{{productId}}"
        return {
            "openapi": "3.1.2",
            "paths": {
                path: {
                    "get": {
                        "operationId": operation_id,
                        "tags": ["catalog"],
                        "summary": "Get product",
                        "description": "Get product. Reads commerce_product_spu. Writes none.",
                        "parameters": [
                            {
                                "name": "productId",
                                "in": "path",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/CatalogProductsRetrieveResult"
                                        }
                                    }
                                },
                            },
                            "default": {
                                "description": "Error response.",
                                "content": {
                                    "application/problem+json": {
                                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                                    }
                                },
                            },
                        },
                        "x-sdkwork-domain": "commerce",
                        "x-sdkwork-resource": "catalog.products",
                    }
                }
            },
            "components": {
                "schemas": {
                    "ProblemDetail": {
                        "type": "object",
                        "required": ["type", "title", "status"],
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                            "status": {"type": "integer"},
                        },
                    },
                    "CommerceProductSpuDetailResponse": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "item": {"$ref": "#/components/schemas/CommerceProductSpuItem"}
                        },
                    },
                    "CommerceProductSpuItem": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["id"],
                        "properties": {"id": {"type": "string"}},
                    },
                    "CatalogProductsRetrieveResult": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["code"],
                        "x-operation-id": operation_id,
                        "properties": {
                            "code": {"type": "string"},
                            "data": {
                                "$ref": "#/components/schemas/CommerceProductSpuDetailResponse"
                            },
                        },
                    },
                }
            },
        }

    def valid_create_spec(self, surface: str) -> dict:
        api_prefix = "/app/v3/api" if surface == "app" else "/backend/v3/api"
        operation_id = "catalog.products.create"
        path = f"{api_prefix}/catalog/products"
        return {
            "openapi": "3.1.2",
            "paths": {
                path: {
                    "post": {
                        "operationId": operation_id,
                        "tags": ["catalog"],
                        "summary": "Create product",
                        "description": "Create product. Reads none. Writes commerce_product_spu.",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/CatalogProductsCreateRequest"
                                    }
                                }
                            },
                        },
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/CatalogProductsCreateResult"
                                        }
                                    }
                                },
                            },
                            "default": {
                                "description": "Error response.",
                                "content": {
                                    "application/problem+json": {
                                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                                    }
                                },
                            },
                        },
                        "x-sdkwork-domain": "commerce",
                        "x-sdkwork-resource": "catalog.products",
                    }
                }
            },
            "components": {
                "schemas": {
                    "ProblemDetail": {
                        "type": "object",
                        "required": ["type", "title", "status"],
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                            "status": {"type": "integer"},
                        },
                    },
                    "CatalogProductsCreateRequest": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["title"],
                        "properties": {"title": {"type": "string"}},
                    },
                    "CatalogProductsUnexpectedRequest": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["title"],
                        "properties": {"title": {"type": "string"}},
                    },
                    "CatalogProductsCreateResponse": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["item"],
                        "properties": {"item": {"$ref": "#/components/schemas/CommerceProductSpuItem"}},
                    },
                    "CatalogProductsUnexpectedResponse": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["item"],
                        "properties": {"item": {"$ref": "#/components/schemas/CommerceProductSpuItem"}},
                    },
                    "CommerceProductSpuItem": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["id"],
                        "properties": {"id": {"type": "string"}},
                    },
                    "CatalogProductsCreateResult": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["code"],
                        "x-operation-id": operation_id,
                        "properties": {
                            "code": {"type": "string"},
                            "data": {
                                "allOf": [
                                    {
                                        "$ref": "#/components/schemas/CatalogProductsCreateResponse"
                                    }
                                ],
                                "description": "Data field on catalog products create result.",
                            },
                        },
                    },
                }
            },
        }

    def test_accepts_complete_canonical_subset_with_generated_sdk_method(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", self.valid_spec("app"))
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "app",
                [
                    "CatalogProductsRetrieveResult",
                    "CommerceProductSpuDetailResponse",
                    "CommerceProductSpuItem",
                ],
            )
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_dependency_commerce_sdk_generated_server_openapi_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", self.valid_spec("app"))
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_dependency_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_dependency_sdk_types(
                root,
                "app",
                [
                    "CatalogProductsRetrieveResult",
                    "CommerceProductSpuDetailResponse",
                    "CommerceProductSpuItem",
                ],
            )
            self.write_dependency_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                sdk_root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_dependency_commerce_sdk_generic_result_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", self.valid_spec("app"))
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_dependency_sdk(
                root,
                "app",
                "import type { CommerceApiResult } from '../types';\n"
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CommerceApiResult> {}\n"
                "}\n",
            )
            package = "sdkwork-commerce-app-sdk"
            types_dir = (
                root
                / "sdkwork-commerce"
                / "sdks"
                / package
                / f"{package}-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "types"
            )
            types_dir.mkdir(parents=True, exist_ok=True)
            (types_dir / "commerce-api-result.ts").write_text(
                "export interface CommerceApiResult {}\n",
                encoding="utf-8",
            )
            (types_dir / "commerce-operation-command.ts").write_text(
                "export interface CommerceOperationCommand {}\n",
                encoding="utf-8",
            )
            (types_dir / "index.ts").write_text(
                "export type { CommerceApiResult } from './commerce-api-result';\n"
                "export type { CommerceOperationCommand } from './commerce-operation-command';\n",
                encoding="utf-8",
            )
            self.write_dependency_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                sdk_root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_missing_default_error_response_and_sdk_method(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "openapi_exposed": True,
            }
            spec = self.valid_spec("app")
            del spec["paths"]["/app/v3/api/catalog/products/{productId}"]["get"]["responses"]["default"]
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", spec)
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(root, "app", "export class CommerceCatalogProductsApi {}\n")
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce app catalog.products.retrieve must declare default application/problem+json ProblemDetail response",
                result.messages,
            )
            self.assertIn(
                "appbase commerce app catalog.products.retrieve generated SDK method is missing: retrieve",
                result.messages,
            )

    def test_rejects_weak_success_data_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CatalogProductsRetrieveResult"]["properties"]["data"] = {
                "type": "object",
                "additionalProperties": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", spec)
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "app",
                [
                    "CatalogProductsRetrieveResult",
                    "CommerceProductSpuDetailResponse",
                    "CommerceProductSpuItem",
                ],
            )
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce app catalog.products.retrieve result schema CatalogProductsRetrieveResult.data must use a typed schema or component reference",
                result.messages,
            )

    def test_rejects_unresolved_referenced_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            spec = self.valid_spec("app")
            spec["components"]["schemas"]["CommerceProductSpuDetailResponse"]["properties"]["item"] = {
                "$ref": "#/components/schemas/MissingProductItem"
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", spec)
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "app",
                [
                    "CatalogProductsRetrieveResult",
                    "CommerceProductSpuDetailResponse",
                    "CommerceProductSpuItem",
                ],
            )
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce app catalog.products.retrieve component CommerceProductSpuDetailResponse.item references missing schema MissingProductItem",
                result.messages,
            )

    def test_rejects_weak_request_schema_properties(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "backend",
                "api_method": "POST",
                "api_path": "/backend/v3/api/catalog/products",
                "operation_id": "catalog.products.create",
                "sdk_domain": "commerce",
                "path_params": [],
                "request_schema": {"name": "CatalogProductsCreateRequest"},
                "openapi_exposed": True,
            }
            spec = self.valid_spec("backend")
            app_path = "/backend/v3/api/catalog/products/{productId}"
            create_path = "/backend/v3/api/catalog/products"
            spec["paths"] = {
                create_path: {
                    "post": {
                        **spec["paths"][app_path]["get"],
                        "operationId": "catalog.products.create",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/CatalogProductsCreateRequest"
                                    }
                                }
                            },
                        },
                    }
                }
            }
            del spec["paths"][create_path]["post"]["parameters"]
            spec["components"]["schemas"]["CatalogProductsCreateRequest"] = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {},
                    "media": {"type": "array"},
                    "subtitle": {"nullable": True},
                },
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", {"paths": {}, "components": {"schemas": {}}})
            self.write_openapi(root, "backend", spec)
            self.write_sdk(root, "app", "")
            self.write_sdk(
                root,
                "backend",
                "export class CommerceCatalogProductsApi {\n"
                "  async create(body: CatalogProductsCreateRequest): Promise<CatalogProductsCreateResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "backend",
                [
                    "CatalogProductsRetrieveResult",
                    "CommerceProductSpuDetailResponse",
                    "CommerceProductSpuItem",
                    "CatalogProductsCreateRequest",
                ],
            )

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("backend", "POST", "/backend/v3/api/catalog/products", "catalog.products.create"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce backend catalog.products.create request schema CatalogProductsCreateRequest.title must use a typed schema or component reference",
                result.messages,
            )
            self.assertIn(
                "appbase commerce backend catalog.products.create request schema CatalogProductsCreateRequest.media array schema must declare typed items",
                result.messages,
            )
            self.assertIn(
                "appbase commerce backend catalog.products.create request schema CatalogProductsCreateRequest.subtitle nullable schema must also declare a base type or reference",
                result.messages,
            )

    def test_rejects_missing_generated_sdk_type_file_and_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", self.valid_spec("app"))
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_sdk_type(root, "app", "CatalogProductsRetrieveResult")
            self.write_sdk_type(root, "app", "CommerceProductSpuDetailResponse")
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce app catalog.products.retrieve generated SDK type file is missing for component CommerceProductSpuItem: src/types/commerce-product-spu-item.ts",
                result.messages,
            )

    def test_rejects_generated_sdk_type_file_without_public_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "app",
                "api_method": "GET",
                "api_path": "/app/v3/api/catalog/products/{productId}",
                "operation_id": "catalog.products.retrieve",
                "sdk_domain": "commerce",
                "path_params": ["productId"],
                "query_parameters": [],
                "openapi_exposed": True,
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", self.valid_spec("app"))
            self.write_openapi(root, "backend", {"paths": {}, "components": {"schemas": {}}})
            self.write_sdk(
                root,
                "app",
                "export class CommerceCatalogProductsApi {\n"
                "  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(root, "app", ["CatalogProductsRetrieveResult", "CommerceProductSpuDetailResponse"])
            package = "clawrouter-app-sdk"
            types_dir = root / "sdks" / package / f"{package}-typescript" / "src" / "types"
            (types_dir / "commerce-product-spu-item.ts").write_text(
                "export interface CommerceProductSpuItem {}\n",
                encoding="utf-8",
            )
            self.write_sdk(root, "backend", "")

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("app", "GET", "/app/v3/api/catalog/products/{productId}", "catalog.products.retrieve"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce app catalog.products.retrieve generated SDK type export is missing for component CommerceProductSpuItem in src/types/index.ts",
                result.messages,
            )

    def test_rejects_request_schema_that_differs_from_manifest_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "backend",
                "api_method": "POST",
                "api_path": "/backend/v3/api/catalog/products",
                "operation_id": "catalog.products.create",
                "sdk_domain": "commerce",
                "path_params": [],
                "query_parameters": [],
                "request_schema": {"name": "CatalogProductsCreateRequest"},
                "response_schema": {"name": "CatalogProductsCreateResponse"},
                "openapi_exposed": True,
            }
            spec = self.valid_create_spec("backend")
            spec["paths"]["/backend/v3/api/catalog/products"]["post"]["requestBody"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/CatalogProductsUnexpectedRequest"
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", {"paths": {}, "components": {"schemas": {}}})
            self.write_openapi(root, "backend", spec)
            self.write_sdk(root, "app", "")
            self.write_sdk(
                root,
                "backend",
                "export class CommerceCatalogProductsApi {\n"
                "  async create(body: CatalogProductsUnexpectedRequest): Promise<CatalogProductsCreateResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "backend",
                [
                    "CatalogProductsCreateResult",
                    "CatalogProductsUnexpectedRequest",
                    "CatalogProductsCreateResponse",
                    "CommerceProductSpuItem",
                ],
            )

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("backend", "POST", "/backend/v3/api/catalog/products", "catalog.products.create"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce backend catalog.products.create OpenAPI requestBody schema must match manifest request_schema CatalogProductsCreateRequest",
                result.messages,
            )

    def test_rejects_response_data_schema_that_differs_from_manifest_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            operation = {
                "api_surface": "backend",
                "api_method": "POST",
                "api_path": "/backend/v3/api/catalog/products",
                "operation_id": "catalog.products.create",
                "sdk_domain": "commerce",
                "path_params": [],
                "query_parameters": [],
                "request_schema": {"name": "CatalogProductsCreateRequest"},
                "response_schema": {"name": "CatalogProductsCreateResponse"},
                "openapi_exposed": True,
            }
            spec = self.valid_create_spec("backend")
            spec["components"]["schemas"]["CatalogProductsCreateResult"]["properties"]["data"] = {
                "allOf": [
                    {
                        "$ref": "#/components/schemas/CatalogProductsUnexpectedResponse"
                    }
                ],
                "description": "Data field on catalog products create result.",
            }
            self.write_manifest(root, [operation])
            self.write_openapi(root, "app", {"paths": {}, "components": {"schemas": {}}})
            self.write_openapi(root, "backend", spec)
            self.write_sdk(root, "app", "")
            self.write_sdk(
                root,
                "backend",
                "export class CommerceCatalogProductsApi {\n"
                "  async create(body: CatalogProductsCreateRequest): Promise<CatalogProductsCreateResult> {}\n"
                "}\n",
            )
            self.write_sdk_types(
                root,
                "backend",
                [
                    "CatalogProductsCreateResult",
                    "CatalogProductsCreateRequest",
                    "CatalogProductsUnexpectedResponse",
                    "CommerceProductSpuItem",
                ],
            )

            result = AppbaseOpenApiSchemaGuardian(
                root=root,
                canonical_operations=(("backend", "POST", "/backend/v3/api/catalog/products", "catalog.products.create"),),
            ).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce backend catalog.products.create OpenAPI result data schema must match manifest response_schema CatalogProductsCreateResponse",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
