import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator


class ClawRouterOpenApiGeneratorTest(unittest.TestCase):
    def assertDescribedSchemaRef(self, schema: dict[str, object], expected_ref: str) -> None:
        self.assertEqual([{"$ref": expected_ref}], schema.get("allOf"))
        self.assertIsInstance(schema.get("description"), str)
        self.assertNotEqual("", schema.get("description", "").strip())
        self.assertNotIn("$ref", schema)

    def assertSdkWorkResponseDataSchema(
        self,
        schema: dict[str, object],
        expected_data_schema: dict[str, object],
    ) -> None:
        self.assertEqual([{"$ref": "#/components/schemas/SdkWorkApiResponse"}], schema.get("allOf")[:1])
        overlay = schema.get("allOf")[1]
        self.assertIsInstance(overlay, dict)
        self.assertEqual(["data"], overlay.get("required"))
        data_schema = overlay.get("properties", {}).get("data")
        self.assertEqual(expected_data_schema, data_schema)
        self.assertNotIn("code", overlay.get("properties", {}))
        self.assertNotIn("msg", overlay.get("properties", {}))
        self.assertNotIn("message", overlay.get("properties", {}))

    def walk_schema_nodes(self, value: object):
        if isinstance(value, dict):
            yield value
            for item in value.values():
                yield from self.walk_schema_nodes(item)
        elif isinstance(value, list):
            for item in value:
                yield from self.walk_schema_nodes(item)

    def write_manifest(self, root: Path) -> Path:
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
                            "api_path": "/app/v3/api/ecosystem/skills/categories",
                            "operation": "getCategories",
                            "operation_id": "categories.list",
                            "tag": "ecosystem",
                            "sdk_domain": "ecosystem",
                            "kind": "read",
                            "module": "skills-hub",
                            "path_params": [],
                            "source": "apps/portal/skillService.ts",
                            "read_sources": ["agent_skill"],
                            "write_tables": [],
                            "query_parameters_declared": True,
                            "query_parameters": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/ai/model_vendors",
                            "operation": "fetchModelVendors",
                            "operation_id": "modelVendors.list",
                            "tag": "ai",
                            "sdk_domain": "intelligence",
                            "kind": "read",
                            "module": "models",
                            "path_params": [],
                            "source": "apps/portal/modelService.ts",
                            "read_sources": ["ai_model_vendor"],
                            "write_tables": [],
                            "query_parameters_declared": True,
                            "query_parameters": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/ai/model_vendors/{vendorCode}",
                            "operation": "getModelVendor",
                            "operation_id": "modelVendors.retrieve",
                            "tag": "ai",
                            "sdk_domain": "intelligence",
                            "kind": "read",
                            "module": "models",
                            "path_params": ["vendorCode"],
                            "source": "apps/portal/modelService.ts",
                            "read_sources": ["ai_model_vendor"],
                            "write_tables": [],
                            "query_parameters_declared": True,
                            "query_parameters": [],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/ai/model_vendors",
                            "operation": "fetchModelVendorsForRankings",
                            "operation_id": "modelVendors.list",
                            "tag": "ai",
                            "sdk_domain": "intelligence",
                            "kind": "read",
                            "module": "rankings",
                            "path_params": [],
                            "source": "apps/portal/rankingService.ts",
                            "read_sources": ["ai_model_vendor", "ai_model"],
                            "write_tables": [],
                            "openapi_exposed": False,
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/promotions/codes/redemptions",
                            "operation": "redeemPromotionCode",
                            "operation_id": "promotions.codes.redemptions.create",
                            "tag": "promotions",
                            "sdk_domain": "commerce",
                            "kind": "action",
                            "module": "wallet",
                            "path_params": [],
                            "source": "apps/portal/promotionService.ts",
                            "read_sources": ["promotion_code", "promotion_coupon_stock"],
                            "write_tables": ["promotion_code_redemption", "promotion_user_coupon"],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/content/feeds/{id}/collect",
                            "operation": "collectForumFeed",
                            "operation_id": "feeds.collect",
                            "tag": "content",
                            "sdk_domain": "content",
                            "kind": "action",
                            "module": "forum",
                            "path_params": ["id"],
                            "source": "apps/portal/forumService.ts",
                            "read_sources": ["content_forum_post", "content_favorite"],
                            "write_tables": ["content_favorite", "content_forum_post"],
                            "request_id_header": True,
                            "request_body_required": False,
                            "query_parameters_declared": True,
                            "query_parameters": [
                                {
                                    "name": "folderId",
                                    "schema": {"type": "integer", "format": "int64", "minimum": 1},
                                }
                            ],
                            "response_schema": {
                                "name": "ForumFeedItem",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["id", "title"],
                                    "properties": {
                                        "id": {"type": "string"},
                                        "title": {"type": "string"},
                                    },
                                },
                            },
                        },
                        {
                            "api_surface": "app",
                            "api_method": "DELETE",
                            "api_path": "/app/v3/api/content/comments/{commentId}",
                            "operation": "deleteForumComment",
                            "operation_id": "comments.delete",
                            "tag": "content",
                            "sdk_domain": "content",
                            "kind": "delete",
                            "module": "forum",
                            "path_params": ["commentId"],
                            "source": "apps/portal/forumService.ts",
                            "read_sources": ["content_comment"],
                            "write_tables": ["content_comment"],
                        },
                        {
                            "api_surface": "app",
                            "api_method": "GET",
                            "api_path": "/app/v3/api/promotions/user_coupons",
                            "operation": "fetchUserCoupons",
                            "operation_id": "promotions.userCoupons.wallet.list",
                            "tag": "promotions",
                            "sdk_domain": "commerce",
                            "kind": "read",
                            "module": "wallet",
                            "path_params": [],
                            "source": "apps/portal/promotionService.ts",
                            "read_sources": ["promotion_user_coupon", "promotion_offer"],
                            "write_tables": [],
                            "query_parameters_declared": True,
                            "query_parameters": [],
                            "response_schema": {
                                "name": "PromotionUserCouponWalletResponse",
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "name": "PromotionUserCouponWalletItem",
                                        "required": ["id", "coupon_no", "face_value_minor", "currency_code", "status"],
                                        "properties": {
                                            "id": {"type": "string"},
                                            "coupon_no": {"type": "string"},
                                            "face_value_minor": {"type": "integer", "format": "int64"},
                                            "currency_code": {"type": "string", "minLength": 3, "maxLength": 3},
                                            "status": {"type": "string", "enum": ["active", "redeemed", "expired"]},
                                        },
                                    },
                                },
                            },
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/iam/api_keys",
                            "operation": "createKey",
                            "operation_id": "apiKeys.create",
                            "tag": "iam",
                            "sdk_domain": "iam",
                            "kind": "create",
                            "module": "console-api-keys",
                            "path_params": [],
                            "source": "apps/portal/apiKeyService.ts",
                            "idempotency_required": True,
                            "read_sources": ["ai_channel_group"],
                            "write_tables": ["iam_gateway_api_key", "ops_audit_log"],
                            "request_schema": {
                                "name": "CreateApiKeyRequest",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["name", "group"],
                                    "properties": {
                                        "name": {"type": "string", "maxLength": 128},
                                        "group": {"type": "string", "maxLength": 64},
                                        "note": {"type": "string", "nullable": True},
                                    },
                                },
                            },
                            "response_schema": {
                                "name": "CreateApiKeyResponse",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["item", "rawKey"],
                                    "properties": {
                                        "item": {"type": "object", "additionalProperties": True},
                                        "rawKey": {"type": "string", "minLength": 1},
                                    },
                                },
                            },
                        },
                        {
                            "api_surface": "backend",
                            "api_method": "PATCH",
                            "api_path": "/backend/v3/api/content/announcements/{announcementId}",
                            "operation": "updateAnnouncement",
                            "operation_id": "announcements.update",
                            "tag": "content",
                            "sdk_domain": "content",
                            "kind": "update",
                            "module": "admin-announcement",
                            "path_params": ["announcementId"],
                            "source": "apps/portal/announcementService.ts",
                            "read_sources": ["content_announcement"],
                            "write_tables": ["content_announcement"],
                        },
                        {
                            "api_surface": "backend",
                            "api_method": "GET",
                            "api_path": "/backend/v3/api/content/announcement_audit_events",
                            "operation": "fetchAnnouncementAuditEvents",
                            "operation_id": "announcementAuditEvents.list",
                            "tag": "content",
                            "sdk_domain": "content",
                            "kind": "read",
                            "module": "admin-announcement",
                            "path_params": [],
                            "source": "apps/portal/announcementService.ts",
                            "read_sources": ["content_announcement_audit_event"],
                            "write_tables": [],
                            "query_parameters_declared": True,
                            "query_parameters": [],
                            "response_schema": {
                                "name": "AdminAnnouncementAuditEventResponse",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["id"],
                                    "properties": {
                                        "id": {"type": "integer", "format": "int64", "minimum": 1},
                                        "title": {"type": "string"},
                                    },
                                },
                            },
                        },
                        {
                            "api_surface": "app",
                            "api_method": "POST",
                            "api_path": "/app/v3/api/auth/qr_login_codes",
                            "operation": "generateLoginQrCode",
                            "operation_id": "loginQrCodes.create",
                            "tag": "auth",
                            "sdk_domain": "auth",
                            "kind": "create",
                            "module": "login",
                            "path_params": [],
                            "source": "apps/portal/authController.ts",
                            "read_sources": [],
                            "write_tables": [],
                            "request_body_required": False,
                            "response_schema": {
                                "name": "IamLoginQrCodeResponse",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["qrKey", "qrContent"],
                                    "properties": {
                                        "qrKey": {"type": "string", "minLength": 1, "maxLength": 128},
                                        "qrContent": {"type": "string", "minLength": 1, "maxLength": 2048},
                                    },
                                },
                            },
                        },
                        {
                            "api_surface": "openai_v1",
                            "api_method": "POST",
                            "api_path": "/v1/chat/completions",
                            "operation": "createChatCompletion",
                            "tag": "chat",
                            "kind": "action",
                            "module": "playground",
                            "path_params": [],
                            "source": "apps/portal/playgroundService.ts",
                            "read_sources": ["ai_model"],
                            "write_tables": ["ai_usage"],
                        },
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        return manifest

    def write_schema_components(self, root: Path) -> Path:
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
                          maxLength: 64
                        enabled:
                          type: boolean
                      required:
                        - vendor_code
                        - enabled
                    ProviderRetryPolicy:
                      type: object
                      properties:
                        maxAttempts:
                          type: integer
                          minimum: 1
                    NullableRetryCarrier:
                      type: object
                      properties:
                        retryPolicy:
                          $ref: '#/components/schemas/ProviderRetryPolicy'
                          nullable: true
                    AiUsageFactRecord:
                      type: object
                      x-table: ai_usage
                      properties:
                        request_id:
                          type: string
                        customer_charge_amount:
                          type: string
                          format: decimal
                        upstream_cost_amount:
                          type: string
                          format: decimal
                    MediaResource:
                      type: object
                      properties:
                        id:
                          type: string
                    PlusAgentSkillPackageRecord:
                      type: object
                      x-table: ai_agent_skill_package
                      x-domain: legacy
                      x-generated-by-this-project: true
                      properties:
                        name:
                          type: string
                        icon:
                          $ref: '#/components/schemas/MediaResource'
                    PlusAgentSkillRecord:
                      type: object
                      x-table: ai_agent_skill
                      x-domain: legacy
                      x-generated-by-this-project: true
                      properties:
                        name:
                          type: string
                        icon:
                          $ref: '#/components/schemas/MediaResource'
                    PlusCategoryRecord:
                      type: object
                      x-table: c_category
                      x-domain: legacy
                      x-generated-by-this-project: true
                      properties:
                        name:
                          type: string
                        icon:
                          $ref: '#/components/schemas/MediaResource'
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return components

    def test_generates_surface_specific_openapi_specs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            generator = ClawRouterOpenApiGenerator(root=root)
            app_spec = generator.generate("app")
            backend_spec = generator.generate("backend")

            self.assertEqual("3.1.2", app_spec["openapi"])
            self.assertEqual("SDKWork Claw Router App API", app_spec["info"]["title"])
            self.assertEqual("SdkworkAppClient", app_spec["x-sdk-client"])
            self.assertEqual("http://localhost:18082", app_spec["servers"][0]["url"])
            self.assertIn("/app/v3/api/promotions/codes/redemptions", app_spec["paths"])
            self.assertNotIn("/backend/v3/api/content/announcements/{announcementId}", app_spec["paths"])
            self.assertNotIn("/v1/chat/completions", app_spec["paths"])

            self.assertEqual("SDKWork Claw Router Backend API", backend_spec["info"]["title"])
            self.assertEqual("SdkworkBackendClient", backend_spec["x-sdk-client"])
            self.assertEqual("http://localhost:18081", backend_spec["servers"][0]["url"])
            self.assertIn("/backend/v3/api/content/announcements/{announcementId}", backend_spec["paths"])
            self.assertNotIn("/app/v3/api/promotions/codes/redemptions", backend_spec["paths"])

    def test_emits_problem_detail_error_responses_and_domain_extensions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/iam/api_keys"]["post"]
            schemas = app_spec["components"]["schemas"]

            self.assertIn("ProblemDetail", schemas)
            self.assertNotIn("ErrorResponse", schemas)
            self.assertEqual("iam", operation["x-sdkwork-domain"])
            self.assertEqual("apiKeys", operation["x-sdkwork-resource"])
            for status in ("400", "401", "500"):
                response = operation["responses"][status]
                self.assertIn("application/problem+json", response["content"])
                self.assertEqual(
                    {"$ref": "#/components/schemas/ProblemDetail"},
                    response["content"]["application/problem+json"]["schema"],
                )

            problem_detail = schemas["ProblemDetail"]
            self.assertEqual(["type", "title", "status", "code", "traceId"], problem_detail["required"])
            self.assertDescribedSchemaRef(
                problem_detail["properties"]["code"],
                "#/components/schemas/SdkWorkPlatformErrorCode",
            )
            self.assertIn("traceId", problem_detail["properties"])
            self.assertNotIn("requestId", problem_detail["properties"])
            self.assertIn("errors", problem_detail["properties"])

    def test_emits_path_parameters_request_body_and_query_marker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")
            operation = backend_spec["paths"]["/backend/v3/api/content/announcements/{announcementId}"]["patch"]

            self.assertEqual("announcements.update", operation["operationId"])
            self.assertEqual("announcementId", operation["parameters"][0]["name"])
            self.assertEqual("path", operation["parameters"][0]["in"])
            self.assertTrue(operation["parameters"][0]["required"])
            self.assertEqual(
                {"$ref": "#/components/schemas/AnnouncementsUpdateRequest"},
                operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/AnnouncementsUpdateResult"},
                operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            backend_schemas = backend_spec["components"]["schemas"]
            self.assertIn("AnnouncementsUpdateResult", backend_schemas)
            self.assertIn("NoData", backend_schemas)
            self.assertNotIn("PlusApiResult", backend_schemas)
            self.assertSdkWorkResponseDataSchema(
                backend_schemas["AnnouncementsUpdateResult"],
                {
                    "allOf": [{"$ref": "#/components/schemas/NoData"}],
                    "description": "No business data returned by this operation.",
                },
            )

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            query_operation = app_spec["paths"]["/app/v3/api/ecosystem/skills/categories"]["get"]
            self.assertEqual([], query_operation["parameters"])

            self.assertNotIn("/app/v3/api/content/feeds/{feedId}/collect", app_spec["paths"])
            post_query_operation = app_spec["paths"]["/app/v3/api/content/feeds/{id}/collect"]["post"]
            self.assertIn(
                {
                    "name": "id",
                    "in": "path",
                    "required": True,
                    "schema": {"type": "string"},
                    "description": "Id path parameter.",
                },
                post_query_operation["parameters"],
            )
            self.assertIn(
                {
                    "name": "folderId",
                    "in": "query",
                    "required": False,
                    "schema": {
                        "type": "string",
                        "format": "int64",
                        "pattern": "^[1-9][0-9]*$",
                        "x-sdkwork-int64-string": True,
                        "x-sdkwork-rust-type": "i64",
                    },
                    "description": "Folder id query parameter.",
                },
                post_query_operation["parameters"],
            )
            self.assertNotIn("requestBody", post_query_operation)

    def test_delete_operation_uses_no_content_success_without_json_body(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            delete_operation = app_spec["paths"]["/app/v3/api/content/comments/{commentId}"]["delete"]
            schemas = app_spec["components"]["schemas"]

            self.assertEqual({"description": "No Content"}, delete_operation["responses"]["204"])
            self.assertNotIn("200", delete_operation["responses"])
            self.assertNotIn("201", delete_operation["responses"])
            self.assertNotIn("202", delete_operation["responses"])
            self.assertNotIn("CommentsDeleteResult", schemas)
            self.assertIn("NoData", schemas)
            self.assertNotIn("PlusApiResult", schemas)
            for schema_name, schema in schemas.items():
                properties = schema.get("properties") if isinstance(schema, dict) else None
                if isinstance(properties, dict):
                    with self.subTest(schema_name=schema_name):
                        self.assertNotIn(None, properties.values())

    def test_operation_payload_schemas_drive_request_and_response_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/iam/api_keys"]["post"]
            schemas = app_spec["components"]["schemas"]

            self.assertEqual(
                {"$ref": "#/components/schemas/CreateApiKeyRequest"},
                operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertTrue(operation["requestBody"]["required"])
            self.assertEqual(
                {"$ref": "#/components/schemas/ApiKeysCreateResult"},
                operation["responses"]["201"]["content"]["application/json"]["schema"],
            )
            self.assertNotIn("200", operation["responses"])
            self.assertEqual(["name", "group"], schemas["CreateApiKeyRequest"]["required"])
            self.assertEqual(128, schemas["CreateApiKeyRequest"]["properties"]["name"]["maxLength"])
            self.assertSdkWorkResponseDataSchema(
                schemas["ApiKeysCreateResult"],
                {
                    "allOf": [{"$ref": "#/components/schemas/CreateApiKeyResponse"}],
                    "description": "Data field on api keys create result.",
                },
            )
            self.assertEqual(["item", "rawKey"], schemas["CreateApiKeyResponse"]["required"])

            qr_result = schemas["LoginQrCodesCreateResult"]
            self.assertSdkWorkResponseDataSchema(
                qr_result,
                {
                    "allOf": [{"$ref": "#/components/schemas/IamLoginQrCodeResponse"}],
                    "description": "Data field on login qr codes create result.",
                },
            )
            self.assertEqual(
                ["qrKey", "qrContent"],
                schemas["IamLoginQrCodeResponse"]["required"],
            )

    def test_multipart_file_targets_are_exposed_as_operation_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.write_manifest(root)
            payload = json.loads(manifest.read_text(encoding="utf-8"))
            payload["operations"].append(
                {
                    "api_surface": "app",
                    "api_method": "POST",
                    "api_path": "/app/v3/api/content/forum/attachments",
                    "operation": "uploadForumAttachment",
                    "operation_id": "forum.attachments.create",
                    "tag": "content",
                    "kind": "create",
                    "module": "forum",
                    "path_params": [],
                    "source": "apps/portal/forumService.ts",
                    "read_sources": [],
                    "write_tables": [],
                    "file_targets": ["forum_attachment_uploads"],
                    "request_content_type": "multipart/form-data",
                    "request_schema": {
                        "name": "ForumAttachmentUploadRequest",
                        "schema": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["file"],
                            "properties": {
                                "file": {"type": "string", "format": "binary"},
                            },
                        },
                    },
                    "response_schema": {
                        "name": "ForumAttachmentUploadResponse",
                        "schema": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["attachment"],
                            "properties": {
                                "attachment": {"$ref": "#/components/schemas/MediaResource"},
                            },
                        },
                    },
                }
            )
            manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            schema_components = root / "generated" / "openapi" / "schema-components.yaml"
            schema_components.parent.mkdir(parents=True, exist_ok=True)
            schema_components.write_text(
                textwrap.dedent(
                    """
                    components:
                      schemas:
                        MediaResource:
                          type: object
                          additionalProperties: false
                          required:
                            - kind
                            - source
                          properties:
                            kind:
                              type: string
                            source:
                              type: string
                            uri:
                              type: string
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/content/forum/attachments"]["post"]
            schemas = app_spec["components"]["schemas"]

            self.assertEqual(
                {"$ref": "#/components/schemas/ForumAttachmentUploadRequest"},
                operation["requestBody"]["content"]["multipart/form-data"]["schema"],
            )
            self.assertEqual(["forum_attachment_uploads"], operation["x-file-targets"])
            self.assertIn("File targets forum_attachment_uploads.", operation["description"])
            self.assertIn("MediaResource", schemas)
            self.assertDescribedSchemaRef(
                schemas["ForumAttachmentUploadResponse"]["properties"]["attachment"],
                "#/components/schemas/MediaResource",
            )

    def test_registration_schema_preserves_required_verification_code(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.write_manifest(root)
            payload = json.loads(manifest.read_text(encoding="utf-8"))
            payload["operations"].append(
                {
                    "api_surface": "app",
                    "api_method": "POST",
                    "api_path": "/app/v3/api/auth/registrations",
                    "operation": "register",
                    "operation_id": "registrations.create",
                    "tag": "auth",
                    "kind": "create",
                    "module": "auth",
                    "path_params": [],
                    "source": "apps/portal/authController.ts",
                    "request_id_header": True,
                    "read_sources": ["iam_user", "iam_user_identity", "iam_credential"],
                    "write_tables": ["iam_user", "iam_user_identity", "iam_credential", "iam_session"],
                    "request_schema": {
                        "name": "IamRegistrationCreateRequest",
                        "schema": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["username", "password", "verificationCode"],
                            "properties": {
                                "username": {"type": "string", "minLength": 1, "maxLength": 128},
                                "password": {"type": "string", "minLength": 1, "maxLength": 128},
                                "verificationCode": {"type": "string", "maxLength": 32},
                            },
                        },
                    },
                }
            )
            manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/auth/registrations"]["post"]
            schema = app_spec["components"]["schemas"]["IamRegistrationCreateRequest"]

            self.assertEqual("registrations.create", operation["operationId"])
            self.assertEqual(
                {"$ref": "#/components/schemas/IamRegistrationCreateRequest"},
                operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(["username", "password", "verificationCode"], schema["required"])
            self.assertEqual("string", schema["properties"]["verificationCode"]["type"])

    def test_false_request_body_required_marks_declared_request_schema_as_optional_body(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
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
                                "api_surface": "backend",
                                "api_method": "POST",
                                "api_path": "/backend/v3/api/ecosystem/skills/{skillId}/publish",
                                "operation": "publishSkill",
                                "operation_id": "skills.publish",
                                "tag": "ecosystem",
                                "kind": "action",
                                "module": "admin-skill",
                                "path_params": ["skillId"],
                                "source": "apps/portal/skillService.ts",
                                "read_sources": ["agent_skill"],
                                "write_tables": ["agent_skill"],
                                "request_body_required": False,
                                "request_schema": {
                                    "name": "PublishSkillRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {},
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminSkillMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "type": "object",
                                                "additionalProperties": True,
                                            }
                                        },
                                    },
                                },
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")
            operation = backend_spec["paths"]["/backend/v3/api/ecosystem/skills/{skillId}/publish"]["post"]

            self.assertEqual(
                {"$ref": "#/components/schemas/PublishSkillRequest"},
                operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertFalse(operation["requestBody"]["required"])
            self.assertIn("PublishSkillRequest", backend_spec["components"]["schemas"])

    def test_array_response_schema_drives_result_data_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/promotions/user_coupons"]["get"]
            schemas = app_spec["components"]["schemas"]

            self.assertEqual(
                {"$ref": "#/components/schemas/PromotionsUserCouponsWalletListResult"},
                operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertSdkWorkResponseDataSchema(
                schemas["PromotionsUserCouponsWalletListResult"],
                {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["items", "pageInfo"],
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/PromotionUserCouponWalletItem"},
                            "description": "Items field on promotions user coupons wallet list result.",
                        },
                        "pageInfo": {
                            "allOf": [{"$ref": "#/components/schemas/PageInfo"}],
                            "description": "Page info field on promotions user coupons wallet list result.",
                        },
                    },
                    "description": "Data field on promotions user coupons wallet list result.",
                },
            )
            self.assertEqual("array", schemas["PromotionUserCouponWalletResponse"]["type"])
            self.assertEqual(
                {"$ref": "#/components/schemas/PromotionUserCouponWalletItem"},
                schemas["PromotionUserCouponWalletResponse"]["items"],
            )
            self.assertEqual(
                ["id", "coupon_no", "face_value_minor", "currency_code", "status"],
                schemas["PromotionUserCouponWalletItem"]["required"],
            )
            face_value_schema = schemas["PromotionUserCouponWalletItem"]["properties"]["face_value_minor"]
            self.assertEqual("string", face_value_schema["type"])
            self.assertEqual("int64", face_value_schema["format"])
            self.assertEqual("^-?[0-9]+$", face_value_schema["pattern"])
            self.assertEqual(True, face_value_schema["x-sdkwork-int64-string"])
            self.assertEqual("i64", face_value_schema["x-sdkwork-rust-type"])

    def test_openapi_generation_never_emits_integer_int64_json_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            for surface in ("app", "backend"):
                spec = ClawRouterOpenApiGenerator(root=root).generate(surface)
                integer_int64_nodes = [
                    node
                    for node in self.walk_schema_nodes(spec)
                    if node.get("type") == "integer" and node.get("format") == "int64"
                ]
                self.assertEqual([], integer_int64_nodes, f"{surface} OpenAPI must serialize int64 as strings")

                int64_string_nodes = [
                    node
                    for node in self.walk_schema_nodes(spec)
                    if node.get("type") == "string" and node.get("format") == "int64"
                ]
                self.assertTrue(int64_string_nodes, f"{surface} OpenAPI test fixture must contain int64 string nodes")
                for node in int64_string_nodes:
                    self.assertIn(node.get("pattern"), {"^-?[0-9]+$", "^[0-9]+$", "^[1-9][0-9]*$"})
                    self.assertEqual(True, node.get("x-sdkwork-int64-string"))
                    self.assertEqual("i64", node.get("x-sdkwork-rust-type"))

    def test_merges_schema_components_into_final_openapi_specs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")

            schema = app_spec["components"]["schemas"]["AiModelVendorRecord"]
            self.assertEqual(["vendor_code", "enabled"], schema["required"])
            self.assertEqual(64, schema["properties"]["vendor_code"]["maxLength"])
            self.assertNotIn("OperationRequest", app_spec["components"]["schemas"])
            self.assertIn(
                "PromotionsCodesRedemptionsCreateRequest",
                app_spec["components"]["schemas"],
            )
            self.assertEqual(
                {
                    "type": "object",
                    "additionalProperties": False,
                    "description": "Explicit empty request body for redeem promotion code.",
                    "properties": {},
                },
                app_spec["components"]["schemas"]["PromotionsCodesRedemptionsCreateRequest"],
            )

    def test_filters_unreachable_schema_components_from_openapi_specs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")

            app_schemas = app_spec["components"]["schemas"]
            self.assertIn("AiModelVendorRecord", app_schemas)
            self.assertNotIn("AiUsageFactRecord", app_schemas)
            self.assertNotIn("AiUsageFactRecord", backend_spec["components"]["schemas"])

    def test_preserves_public_project_legacy_record_components_for_sdk_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")

            for schemas in (
                app_spec["components"]["schemas"],
                backend_spec["components"]["schemas"],
            ):
                self.assertIn("PlusCategoryRecord", schemas)
                self.assertIn("PlusAgentSkillRecord", schemas)
                self.assertIn("PlusAgentSkillPackageRecord", schemas)
                self.assertIn("MediaResource", schemas)
                self.assertDescribedSchemaRef(
                    schemas["PlusCategoryRecord"]["properties"]["icon"],
                    "#/components/schemas/MediaResource",
                )

    def test_get_single_read_source_uses_record_response_wrapper(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]

            self.assertEqual(
                {"$ref": "#/components/schemas/ModelVendorsListResult"},
                operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            result_schema = app_spec["components"]["schemas"]["ModelVendorsListResult"]
            self.assertSdkWorkResponseDataSchema(
                result_schema,
                {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["items", "pageInfo"],
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/AiModelVendorRecord"},
                            "description": "Items field on model vendors list result.",
                        },
                        "pageInfo": {
                            "allOf": [{"$ref": "#/components/schemas/PageInfo"}],
                            "description": "Page info field on model vendors list result.",
                        },
                    },
                    "description": "Data field on model vendors list result.",
                },
            )

    def test_get_single_read_source_with_path_param_uses_record_response_wrapper(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/ai/model_vendors/{vendorCode}"]["get"]

            self.assertEqual(
                {"$ref": "#/components/schemas/ModelVendorsRetrieveResult"},
                operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            result_schema = app_spec["components"]["schemas"]["ModelVendorsRetrieveResult"]
            self.assertSdkWorkResponseDataSchema(
                result_schema,
                {
                    "allOf": [{"$ref": "#/components/schemas/AiModelVendorRecord"}],
                    "description": "Data field on model vendors retrieve result.",
                },
            )

    def test_dotted_operation_ids_are_structural_and_unique_per_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation_ids = [
                method_spec["operationId"]
                for path_spec in app_spec["paths"].values()
                for method_spec in path_spec.values()
            ]

            self.assertEqual(len(operation_ids), len(set(operation_ids)))
            self.assertIn("categories.list", operation_ids)
            self.assertTrue(all("." in operation_id for operation_id in operation_ids))

    def test_skips_non_exposed_frontend_derived_operations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]

            self.assertEqual("modelVendors.list", operation["operationId"])
            self.assertNotIn("FetchModelVendorsForRankingsResult", app_spec["components"]["schemas"])

    def test_get_operations_do_not_receive_default_query_parameters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.write_manifest(root)
            payload = json.loads(manifest.read_text(encoding="utf-8"))
            operation = next(
                item
                for item in payload["operations"]
                if item["operation"] == "fetchModelVendors"
            )
            operation.pop("query_parameters_declared", None)
            operation.pop("query_parameters", None)
            manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            generated_operation = app_spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]

            self.assertEqual([], generated_operation["parameters"])

    def test_generates_friendly_summary_and_contract_description(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            operation = app_spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]

            self.assertEqual("List model vendors", operation["summary"])
            self.assertNotEqual(operation["operationId"], operation["summary"])
            self.assertNotIn("Manifest operation", operation["description"])
            self.assertIn("List model vendors.", operation["description"])
            self.assertIn("Reads ai_model_vendor.", operation["description"])

    def test_normalizes_openapi_reference_quality_for_sdk_docs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest_path = self.write_manifest(root)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["operations"].append(
                {
                    "api_surface": "app",
                    "api_method": "GET",
                    "api_path": "/app/v3/api/integration/retry_policy_probe",
                    "operation": "fetchRetryPolicyProbe",
                    "operation_id": "retryPolicyProbe.retrieve",
                    "tag": "integration",
                    "sdk_domain": "integration",
                    "kind": "read",
                    "module": "integration",
                    "path_params": [],
                    "source": "apps/portal/integrationService.ts",
                    "read_sources": ["integration_provider"],
                    "write_tables": [],
                    "query_parameters_declared": True,
                    "query_parameters": [],
                    "response_schema": {
                        "name": "NullableRetryCarrier",
                        "schema": {"$ref": "#/components/schemas/NullableRetryCarrier"},
                    },
                }
            )
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            schemas = app_spec["components"]["schemas"]

            tag_names = {tag["name"] for tag in app_spec["tags"]}
            self.assertIn("ecosystem", tag_names)
            self.assertTrue(all(tag.get("description") for tag in app_spec["tags"]))
            self.assertEqual([{"AuthToken": [], "AccessToken": []}], app_spec["security"])
            self.assertEqual(
                {"type": "http", "scheme": "bearer", "bearerFormat": "SDKWork auth token"},
                app_spec["components"]["securitySchemes"]["AuthToken"],
            )
            self.assertEqual(
                {"type": "apiKey", "in": "header", "name": "Access-Token"},
                app_spec["components"]["securitySchemes"]["AccessToken"],
            )

            self.assertEqual(
                {
                    "description": "Error response.",
                    "content": {
                        "application/problem+json": {
                            "schema": {"$ref": "#/components/schemas/ProblemDetail"},
                        },
                    },
                },
                app_spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]["responses"]["default"],
            )

            redeem_operation = app_spec["paths"]["/app/v3/api/promotions/codes/redemptions"]["post"]
            self.assertEqual(
                {"$ref": "#/components/schemas/PromotionsCodesRedemptionsCreateRequest"},
                redeem_operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/PromotionsCodesRedemptionsCreateResult"},
                redeem_operation["responses"]["201"]["content"]["application/json"]["schema"],
            )
            self.assertIn("PromotionsCodesRedemptionsCreateResult", schemas)
            self.assertSdkWorkResponseDataSchema(
                schemas["PromotionsCodesRedemptionsCreateResult"],
                {
                    "allOf": [{"$ref": "#/components/schemas/NoData"}],
                    "description": "No business data returned by this operation.",
                },
            )
            self.assertTrue(redeem_operation["requestBody"]["description"])

            create_key_operation = app_spec["paths"]["/app/v3/api/iam/api_keys"]["post"]
            self.assertEqual(
                {"$ref": "#/components/schemas/ApiKeysCreateResult"},
                create_key_operation["responses"]["201"]["content"]["application/json"]["schema"],
            )

            path_operation = app_spec["paths"]["/app/v3/api/ai/model_vendors/{vendorCode}"]["get"]
            self.assertTrue(path_operation["parameters"][0]["description"])
            query_operation = app_spec["paths"]["/app/v3/api/ecosystem/skills/categories"]["get"]
            self.assertEqual([], query_operation["parameters"])

            self.assertTrue(schemas["CreateApiKeyRequest"]["description"])
            self.assertTrue(schemas["CreateApiKeyRequest"]["properties"]["name"]["description"])
            self.assertEqual("string", schemas["CreateApiKeyRequest"]["properties"]["note"]["type"])
            self.assertTrue(schemas["CreateApiKeyRequest"]["properties"]["note"]["nullable"])

            self.assertTrue(schemas["AiModelVendorRecord"]["description"])
            self.assertFalse(schemas["AiModelVendorRecord"]["additionalProperties"])
            self.assertTrue(schemas["AiModelVendorRecord"]["properties"]["vendor_code"]["description"])

            self.assertNotIn("OperationRequest", schemas)
            self.assertNotIn("OperationResponse", schemas)
            self.assertNotIn("PageResult", schemas)
            self.assertNotIn("ErrorResponse", schemas)
            self.assertIn("ProblemDetail", schemas)
            self.assertIn("NoData", schemas)
            self.assertIn("PromotionsCodesRedemptionsCreateRequest", schemas)
            self.assertIn("JsonValue", schemas)
            self.assertIn("JsonNull", schemas)
            self.assertIn("SdkWorkApiResponse", schemas)
            self.assertIn("SdkWorkPlatformErrorCode", schemas)
            self.assertIn("PageInfo", schemas)
            self.assertNotIn("PlusApiResult", schemas)

            nullable_ref = schemas["NullableRetryCarrier"]["properties"]["retryPolicy"]
            self.assertEqual(
                [
                    {
                        "allOf": [{"$ref": "#/components/schemas/ProviderRetryPolicy"}],
                        "description": "Retry policy field on nullable retry carrier.",
                    },
                    {
                        "allOf": [{"$ref": "#/components/schemas/JsonNull"}],
                        "description": "Null variant accepted by retry policy.",
                    },
                ],
                nullable_ref["oneOf"],
            )
            self.assertNotIn("$ref", nullable_ref)
            self.assertNotIn("nullable", nullable_ref)

    def test_success_responses_always_use_sdkwork_envelopes_with_explicit_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            self.write_schema_components(root)

            app_spec = ClawRouterOpenApiGenerator(root=root).generate("app")
            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")

            self.assertEqual(
                {"$ref": "#/components/schemas/ApiKeysCreateResult"},
                app_spec["paths"]["/app/v3/api/iam/api_keys"]["post"]["responses"]["201"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/FeedsCollectResult"},
                app_spec["paths"]["/app/v3/api/content/feeds/{id}/collect"]["post"]["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/PromotionsCodesRedemptionsCreateResult"},
                app_spec["paths"]["/app/v3/api/promotions/codes/redemptions"]["post"]["responses"]["201"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"description": "No Content"},
                app_spec["paths"]["/app/v3/api/content/comments/{commentId}"]["delete"]["responses"]["204"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/AnnouncementsUpdateResult"},
                backend_spec["paths"]["/backend/v3/api/content/announcements/{announcementId}"]["patch"]["responses"]["200"]["content"]["application/json"]["schema"],
            )
            for surface, spec in (("app", app_spec), ("backend", backend_spec)):
                schemas = spec["components"]["schemas"]
                self.assertNotIn("OperationRequest", schemas)
                self.assertNotIn("OperationResponse", schemas)
                self.assertNotIn("PageResult", schemas)
                self.assertIn("NoData", schemas)
                self.assertIn("SdkWorkApiResponse", schemas)
                self.assertNotIn("PlusApiResult", schemas)
                for path, path_item in spec["paths"].items():
                    for method, operation in path_item.items():
                        with self.subTest(surface=surface, method=method, path=path):
                            responses = operation["responses"]
                            if "204" in responses:
                                self.assertNotIn("content", responses["204"])
                                self.assertNotIn("200", responses)
                                self.assertNotIn("201", responses)
                                self.assertNotIn("202", responses)
                                continue
                            success_statuses = [status for status in ("200", "201", "202") if status in responses]
                            self.assertEqual(1, len(success_statuses))
                            schema = responses[success_statuses[0]]["content"]["application/json"]["schema"]
                            self.assertNotEqual("#/components/schemas/OperationResponse", schema.get("$ref"))
                            self.assertTrue(schema.get("$ref", "").endswith("Result"))
                            component_name = schema["$ref"].rsplit("/", 1)[-1]
                            self.assertIn(component_name, schemas)
                            self.assertSdkWorkResponseDataSchema(
                                schemas[component_name],
                                schemas[component_name]["allOf"][1]["properties"]["data"],
                            )
                for component_name, schema in schemas.items():
                    if not component_name.endswith("Result") or not isinstance(schema, dict):
                        continue
                    with self.subTest(surface=surface, result=component_name):
                        self.assertSdkWorkResponseDataSchema(
                            schema,
                            schema["allOf"][1]["properties"]["data"],
                        )

    def test_explicit_page_payload_stays_typed_inside_sdkwork_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = self.write_manifest(root)
            payload = json.loads(manifest.read_text(encoding="utf-8"))
            payload["operations"].append(
                {
                    "api_surface": "backend",
                    "api_method": "GET",
                    "api_path": "/backend/v3/api/system/cache/namespaces/{namespace}/keys",
                    "operation": "listCacheNamespaceKeys",
                    "operation_id": "cache.namespaces.keys.list",
                    "tag": "system",
                    "sdk_domain": "system",
                    "kind": "read",
                    "module": "cache",
                    "path_params": ["namespace"],
                    "source": "apps/portal/cacheService.ts",
                    "read_sources": ["system"],
                    "write_tables": [],
                    "query_parameters_declared": True,
                    "query_parameters": [
                        {
                            "name": "page_size",
                            "schema": {
                                "type": "integer",
                                "format": "int32",
                                "minimum": 1,
                                "maximum": 200,
                                "default": 200,
                            },
                        },
                        {
                            "name": "cursor",
                            "schema": {"type": "string", "maxLength": 2048},
                        },
                    ],
                    "response_schema": {
                        "name": "CacheNamespaceKeyPage",
                        "schema": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["items", "pageInfo"],
                            "properties": {
                                "items": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["key"],
                                        "properties": {"key": {"type": "string"}},
                                    },
                                },
                                "pageInfo": {"$ref": "#/components/schemas/PageInfo"},
                            },
                        },
                    },
                }
            )
            manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

            backend_spec = ClawRouterOpenApiGenerator(root=root).generate("backend")
            operation = backend_spec["paths"]["/backend/v3/api/system/cache/namespaces/{namespace}/keys"]["get"]
            schemas = backend_spec["components"]["schemas"]

            self.assertEqual(
                {"$ref": "#/components/schemas/CacheNamespacesKeysListResult"},
                operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(["page_size", "cursor"], [param["name"] for param in operation["parameters"][1:]])
            self.assertNotIn("SdkWorkListResponse", operation["responses"]["200"]["content"]["application/json"]["schema"].get("$ref", ""))
            self.assertSdkWorkResponseDataSchema(
                schemas["CacheNamespacesKeysListResult"],
                {
                    "allOf": [{"$ref": "#/components/schemas/CacheNamespaceKeyPage"}],
                    "description": "Data field on cache namespaces keys list result.",
                },
            )
            self.assertNotIn("code", schemas["CacheNamespacesKeysListResult"].get("properties", {}))
            self.assertNotIn("msg", schemas["CacheNamespacesKeysListResult"].get("properties", {}))
    def test_writes_and_checks_specs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_manifest(root)
            generator = ClawRouterOpenApiGenerator(root=root)

            outputs = generator.write()

            self.assertEqual(
                {
                    "app": root / "generated" / "openapi" / "clawrouter-app-openapi.json",
                    "backend": root / "generated" / "openapi" / "clawrouter-backend-openapi.json",
                    "api-authority-app": root / "apis" / "app-api" / "clawrouter" / "clawrouter-app-api.openapi.json",
                    "api-authority-backend": root / "apis" / "backend-api" / "clawrouter" / "clawrouter-backend-api.openapi.json",
                    "models-catalog-app": root / "generated" / "openapi" / "clawrouter-models-catalog-app-openapi.json",
                    "models-catalog-backend": root / "generated" / "openapi" / "clawrouter-models-catalog-backend-openapi.json",
                    "domain-transport-app": root / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-domain-transport.openapi.json",
                    "domain-transport-backend": root / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-domain-transport.openapi.json",
                },
                outputs,
            )
            self.assertTrue(generator.check().ok)

            outputs["app"].write_text("{}\n", encoding="utf-8")
            result = generator.check()
            self.assertFalse(result.ok)
            self.assertIn(f"clawrouter app OpenAPI spec is stale: {outputs['app']}", result.messages)


if __name__ == "__main__":
    unittest.main()
