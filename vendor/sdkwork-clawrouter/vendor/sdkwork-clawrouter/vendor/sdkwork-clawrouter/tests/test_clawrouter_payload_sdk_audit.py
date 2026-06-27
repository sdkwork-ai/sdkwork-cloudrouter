import json
import tempfile
import unittest
from pathlib import Path

from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator
from tools.clawrouter_payload_sdk_audit import ClawRouterPayloadSdkAudit


class ClawRouterPayloadSdkAuditTest(unittest.TestCase):
    def write_manifest(self, root: Path) -> None:
        manifest = root / "generated" / "api" / "api-contract-manifest.json"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(
            json.dumps(
                {
                    "schema": {"version": "0.1.0"},
                    "sdk_boundaries": {
                        "app": {"api_prefix": "/app/v3/api", "sdk_client": "SdkworkAppClient", "sdk_family": "app"},
                        "backend": {
                            "api_prefix": "/backend/v3/api",
                            "sdk_client": "SdkworkBackendClient",
                            "sdk_family": "backend",
                        },
                    },
                    "operations": [
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
                            "request_schema": {
                                "name": "CreateApiKeyRequest",
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["name", "group"],
                                    "properties": {
                                        "name": {"type": "string"},
                                        "group": {"type": "string"},
                                    },
                                },
                            },
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
                        }
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    def write_openapi(self, root: Path) -> None:
        self.write_manifest(root)
        ClawRouterOpenApiGenerator(root=root).write()

    def write_sdk(self, root: Path, *, generic_method: bool = False) -> None:
        base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
        (base / "src" / "api").mkdir(parents=True, exist_ok=True)
        (base / "src" / "types").mkdir(parents=True, exist_ok=True)
        method = (
            "  async createKey(body?: OperationRequest): Promise<PlusApiResult> {\n"
            "    return this.client.post<PlusApiResult>(appApiPath(`/iam/api_keys`), body, undefined, undefined, 'application/json');\n"
            "  }\n"
            if generic_method
            else "  async create(body: CreateApiKeyRequest, headers?: Record<string, string>): Promise<ApiKeysCreateResult> {\n"
            "    return this.client.post<ApiKeysCreateResult>(appApiPath(`/iam/api_keys`), body, undefined, headers, 'application/json');\n"
            "  }\n"
        )
        (base / "src" / "api" / "iam.ts").write_text(
            "import { appApiPath } from './paths';\n"
            "import type { HttpClient } from '../http/client';\n"
            "import type { ApiKeysCreateResult, CreateApiKeyRequest, OperationRequest, PlusApiResult } from '../types';\n"
            "export class IamApiKeysApi {\n"
            "  constructor(private client: HttpClient) {}\n"
            f"{method}"
            "}\n",
            encoding="utf-8",
        )
        (base / "src" / "types" / "create-api-key-request.ts").write_text(
            "export interface CreateApiKeyRequest { name: string; group: string; }\n",
            encoding="utf-8",
        )
        (base / "src" / "types" / "create-api-key-response.ts").write_text(
            "export interface CreateApiKeyResponse { rawKey: string; }\n",
            encoding="utf-8",
        )
        (base / "src" / "types" / "api-keys-create-result.ts").write_text(
            "import type { CreateApiKeyResponse } from './create-api-key-response';\n"
            "export interface ApiKeysCreateResult { code: string; data?: CreateApiKeyResponse; }\n",
            encoding="utf-8",
        )
        (base / "src" / "types" / "index.ts").write_text(
            "export type { CreateApiKeyRequest } from './create-api-key-request';\n"
            "export type { CreateApiKeyResponse } from './create-api-key-response';\n"
            "export type { ApiKeysCreateResult } from './api-keys-create-result';\n",
            encoding="utf-8",
        )
        backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
        (backend / "api").mkdir(parents=True, exist_ok=True)
        (backend / "types").mkdir(parents=True, exist_ok=True)

    def read_app_spec(self, root: Path) -> dict:
        return json.loads((root / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(encoding="utf-8"))

    def write_app_spec(self, root: Path, spec: dict) -> None:
        (root / "generated" / "openapi" / "clawrouter-app-openapi.json").write_text(
            json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def test_accepts_payload_schema_openapi_and_sdk_closure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_openapi(root)
            self.write_sdk(root)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_closed_empty_request_object_as_record_never_type_alias(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "POST",
                                "api_path": "/app/v3/api/billing/vip/points/daily_rewards",
                                "operation": "createVipDailyReward",
                                "operation_id": "vip.points.dailyRewards.create",
                                "tag": "billing",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/billingService.ts",
                                "read_sources": [],
                                "write_tables": [],
                                "request_schema": {
                                    "name": "CommerceEmptyCommandRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {},
                                    },
                                },
                                "response_schema": {
                                    "name": "CommerceOperationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["id"],
                                        "properties": {"id": {"type": "string"}},
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "billing.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { CommerceEmptyCommandRequest, VipPointsDailyRewardsCreateResult } from '../types';\n"
                "export class BillingVipPointsDailyRewardsApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: CommerceEmptyCommandRequest): Promise<VipPointsDailyRewardsCreateResult> {\n"
                "    return this.client.post<VipPointsDailyRewardsCreateResult>(appApiPath(`/billing/vip/points/daily_rewards`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "commerce-empty-command-request.ts").write_text(
                "export type CommerceEmptyCommandRequest = Record<string, never>;\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "commerce-operation-response.ts").write_text(
                "export interface CommerceOperationResponse { id: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "vip-points-daily-rewards-create-result.ts").write_text(
                "import type { CommerceOperationResponse } from './commerce-operation-response';\n"
                "export interface VipPointsDailyRewardsCreateResult { code: string; data?: CommerceOperationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { CommerceEmptyCommandRequest } from './commerce-empty-command-request';\n"
                "export type { CommerceOperationResponse } from './commerce-operation-response';\n"
                "export type { VipPointsDailyRewardsCreateResult } from './vip-points-daily-rewards-create-result';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_multipart_payload_schema_with_request_dto_sdk_body(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "generated" / "api").mkdir(parents=True, exist_ok=True)
            (root / "generated" / "openapi").mkdir(parents=True, exist_ok=True)
            (root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api").mkdir(parents=True)
            (root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types").mkdir(parents=True)
            (root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api").mkdir(parents=True)
            (root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types").mkdir(parents=True)

            upload_request = {
                "type": "object",
                "additionalProperties": False,
                "required": ["file"],
                "properties": {"file": {"type": "string", "format": "binary"}},
            }
            upload_response = {
                "type": "object",
                "additionalProperties": False,
                "required": ["video", "sha256"],
                "properties": {
                    "video": {"$ref": "#/components/schemas/MediaResource"},
                    "sha256": {"type": "string"},
                },
            }
            media_resource = {
                "type": "object",
                "additionalProperties": False,
                "required": ["kind", "source"],
                "properties": {
                    "kind": {"type": "string"},
                    "source": {"type": "string"},
                    "uri": {"type": "string"},
                },
            }
            manifest = {
                "schema": {"version": "0.1.0"},
                "operations": [
                    {
                        "api_surface": "app",
                        "api_method": "POST",
                        "api_path": "/app/v3/api/content/forum/attachments",
                        "operation": "uploadForumAttachment",
                        "operation_id": "forum.attachments.create",
                        "tag": "content",
                        "kind": "create",
                        "path_params": [],
                        "source": "apps/portal/forumService.ts",
                        "read_sources": [],
                        "write_tables": [],
                        "request_content_type": "multipart/form-data",
                        "request_schema": {
                            "name": "ForumAttachmentUploadRequest",
                            "schema": upload_request,
                        },
                        "response_schema": {
                            "name": "ForumAttachmentUploadResponse",
                            "schema": upload_response,
                        },
                    }
                ],
            }
            (root / "generated" / "api" / "api-contract-manifest.json").write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            app_spec = {
                "openapi": "3.1.0",
                "paths": {
                    "/app/v3/api/content/forum/attachments": {
                        "post": {
                            "operationId": "forum.attachments.create",
                            "requestBody": {
                                "required": True,
                                "content": {
                                    "multipart/form-data": {
                                        "schema": {
                                            "$ref": "#/components/schemas/ForumAttachmentUploadRequest"
                                        }
                                    }
                                },
                            },
                            "responses": {
                                "200": {
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "$ref": "#/components/schemas/ForumAttachmentsCreateResult"
                                            }
                                        }
                                    }
                                }
                            },
                        }
                    }
                },
                "components": {
                    "schemas": {
                        "ForumAttachmentUploadRequest": upload_request,
                        "ForumAttachmentUploadResponse": upload_response,
                        "MediaResource": media_resource,
                        "ForumAttachmentsCreateResult": {
                            "type": "object",
                            "properties": {
                                "data": {
                                    "$ref": "#/components/schemas/ForumAttachmentUploadResponse"
                                }
                            },
                        },
                    }
                },
            }
            (root / "generated" / "openapi" / "clawrouter-app-openapi.json").write_text(
                json.dumps(app_spec, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            (root / "generated" / "openapi" / "clawrouter-backend-openapi.json").write_text(
                json.dumps({"openapi": "3.1.0", "paths": {}, "components": {"schemas": {}}}) + "\n",
                encoding="utf-8",
            )

            sdk_base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (sdk_base / "api" / "content.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ForumAttachmentsCreateResult, ForumAttachmentUploadRequest } from '../types';\n"
                "export class ContentForumAttachmentsApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: ForumAttachmentUploadRequest): Promise<ForumAttachmentsCreateResult> {\n"
                "    return this.client.post<ForumAttachmentsCreateResult>(appApiPath(`/content/forum/attachments`), body, undefined, undefined, 'multipart/form-data');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (sdk_base / "types" / "forum-attachment-upload-request.ts").write_text(
                "export interface ForumAttachmentUploadRequest { file: string; }\n",
                encoding="utf-8",
            )
            (sdk_base / "types" / "forum-attachment-upload-response.ts").write_text(
                "import type { MediaResource } from './media-resource';\n"
                "export interface ForumAttachmentUploadResponse { attachment: MediaResource; sha256: string; }\n",
                encoding="utf-8",
            )
            (sdk_base / "types" / "media-resource.ts").write_text(
                "export interface MediaResource { kind: string; source: string; uri?: string; }\n",
                encoding="utf-8",
            )
            (sdk_base / "types" / "forum-attachments-create-result.ts").write_text(
                "import type { ForumAttachmentUploadResponse } from './forum-attachment-upload-response';\n"
                "export interface ForumAttachmentsCreateResult { data?: ForumAttachmentUploadResponse; }\n",
                encoding="utf-8",
            )
            (sdk_base / "types" / "index.ts").write_text(
                "export type { ForumAttachmentUploadRequest } from './forum-attachment-upload-request';\n"
                "export type { ForumAttachmentUploadResponse } from './forum-attachment-upload-response';\n"
                "export type { MediaResource } from './media-resource';\n"
                "export type { ApplicationsVideosCreateResult } from './applications-videos-create-result';\n",
                encoding="utf-8",
            )

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_no_data_response_without_public_sdk_no_data_type(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "DELETE",
                                "api_path": "/app/v3/api/comments/{commentId}",
                                "operation": "deleteForumComment",
                                "operation_id": "comments.delete",
                                "tag": "comments",
                                "kind": "delete",
                                "path_params": ["commentId"],
                                "source": "apps/portal/forumService.ts",
                                "read_sources": ["content_comment"],
                                "write_tables": ["content_comment"],
                                "response_schema": {
                                    "name": "NoData",
                                    "schema": {"$ref": "#/components/schemas/NoData"},
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "comment.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { CommentsDeleteResult } from '../types';\n"
                "export class CommentApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async delete(commentId: string | number): Promise<CommentsDeleteResult> {\n"
                "    return this.client.delete<CommentsDeleteResult>(appApiPath(`/comments/${commentId}`));\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "comments-delete-result.ts").write_text(
                "export interface CommentsDeleteResult { code: string; data?: never; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { CommentsDeleteResult } from './comments-delete-result';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_top_level_array_response_type_alias(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "GET",
                                "api_path": "/app/v3/api/promotions/user_coupons",
                                "operation": "appPromotionUserCouponsList",
                                "operation_id": "promotions.userCoupons.wallet.list",
                                "tag": "promotions",
                                "kind": "read",
                                "path_params": [],
                                "source": "apps/portal/promotionService.ts",
                                "read_sources": ["promotion_user_coupon", "promotion_coupon_stock"],
                                "write_tables": [],
                                "response_schema": {
                                    "name": "PromotionUserCouponWalletListResponse",
                                    "schema": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/PromotionCouponWalletItem"},
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            spec = self.read_app_spec(root)
            spec["components"]["schemas"]["PromotionCouponWalletItem"] = {
                "type": "object",
                "additionalProperties": False,
                "required": ["coupon_no", "currency_code", "status"],
                "properties": {
                    "coupon_no": {"type": "string"},
                    "currency_code": {"type": "string"},
                    "status": {"type": "string"},
                },
            }
            self.write_app_spec(root, spec)

            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "promotions.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { PromotionsUserCouponsWalletListResult } from '../types';\n"
                "export class PromotionsUserCouponsWalletApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async list(): Promise<PromotionsUserCouponsWalletListResult> {\n"
                "    return this.client.get<PromotionsUserCouponsWalletListResult>(appApiPath(`/promotions/user_coupons`));\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "promotion-coupon-wallet-item.ts").write_text(
                "export interface PromotionCouponWalletItem { couponNo: string; currencyCode: string; status: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "promotion-user-coupon-wallet-list-response.ts").write_text(
                "import type { PromotionCouponWalletItem } from './promotion-coupon-wallet-item';\n"
                "export type PromotionUserCouponWalletListResponse = PromotionCouponWalletItem[];\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "promotions-user-coupons-wallet-list-result.ts").write_text(
                "import type { PromotionUserCouponWalletListResponse } from './promotion-user-coupon-wallet-list-response';\n"
                "export interface PromotionsUserCouponsWalletListResult { code: string; data?: PromotionUserCouponWalletListResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { PromotionCouponWalletItem } from './promotion-coupon-wallet-item';\n"
                "export type { PromotionUserCouponWalletListResponse } from './promotion-user-coupon-wallet-list-response';\n"
                "export type { PromotionsUserCouponsWalletListResult } from './promotions-user-coupons-wallet-list-result';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_top_level_boolean_response_type_alias(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "GET",
                                "api_path": "/app/v3/api/feeds/check-collected/{id}",
                                "operation": "checkForumFeedCollected",
                                "operation_id": "feeds.checkCollected.retrieve",
                                "tag": "feeds",
                                "kind": "read",
                                "path_params": ["id"],
                                "source": "apps/portal/forumService.ts",
                                "read_sources": ["content_favorite"],
                                "write_tables": [],
                                "response_schema": {
                                    "name": "ForumBooleanResponse",
                                    "schema": {"type": "boolean"},
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "feed.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { FeedsCheckCollectedRetrieveResult } from '../types';\n"
                "export class FeedApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async retrieve(id: string | number): Promise<FeedsCheckCollectedRetrieveResult> {\n"
                "    return this.client.get<FeedsCheckCollectedRetrieveResult>(appApiPath(`/feeds/check-collected/${id}`));\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "forum-boolean-response.ts").write_text(
                "export type ForumBooleanResponse = boolean;\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "feeds-check-collected-retrieve-result.ts").write_text(
                "import type { ForumBooleanResponse } from './forum-boolean-response';\n"
                "export interface FeedsCheckCollectedRetrieveResult { code: string; data?: ForumBooleanResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { FeedsCheckCollectedRetrieveResult } from './feeds-check-collected-retrieve-result';\n"
                "export type { ForumBooleanResponse } from './forum-boolean-response';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_ignores_non_exposed_derived_frontend_operations(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "GET",
                                "api_path": "/app/v3/api/router/models",
                                "operation": "fetchModels",
                                "operation_id": "models.list",
                                "tag": "router",
                                "kind": "read",
                                "path_params": [],
                                "source": "apps/portal/modelService.ts",
                                "read_sources": ["ai_model"],
                                "write_tables": [],
                            },
                            {
                                "api_surface": "app",
                                "api_method": "GET",
                                "api_path": "/app/v3/api/router/models",
                                "operation": "fetchModelVendors",
                                "operation_id": "modelVendors.list",
                                "tag": "router",
                                "kind": "read",
                                "path_params": [],
                                "source": "apps/portal/rankingService.ts",
                                "read_sources": ["ai_model_vendor", "ai_model"],
                                "write_tables": [],
                                "openapi_exposed": False,
                                "response_schema": {
                                    "name": "RankingVendorOptionsResponse",
                                    "schema": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "additionalProperties": False,
                                            "required": ["label", "code", "modelCount"],
                                            "properties": {
                                                "label": {"type": "string"},
                                                "code": {"type": "string"},
                                                "modelCount": {"type": "integer"},
                                            },
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
            ClawRouterOpenApiGenerator(root=root).write()
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_generated_sdk_method_with_tag_suffix_removed(self) -> None:
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
                                "api_path": "/backend/v3/api/channel",
                                "operation": "addChannel",
                                "operation_id": "channels.create",
                                "tag": "channel",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/channelService.tsx",
                                "read_sources": ["ai_channel"],
                                "write_tables": ["ai_channel"],
                                "request_schema": {
                                    "name": "AdminChannelCreateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["name"],
                                        "properties": {"name": {"type": "string"}},
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminChannelMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "type": "object",
                                                "additionalProperties": False,
                                                "required": ["id"],
                                                "properties": {
                                                    "id": {"type": "string"},
                                                    "name": {"type": "string"},
                                                },
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "channel.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ChannelsCreateResult, AdminChannelCreateRequest } from '../types';\n"
                "export class ChannelApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: AdminChannelCreateRequest): Promise<ChannelsCreateResult> {\n"
                "    return this.client.post<ChannelsCreateResult>(backendApiPath(`/channel`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-create-request.ts").write_text(
                "export interface AdminChannelCreateRequest { name: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-mutation-response.ts").write_text(
                "export interface AdminChannelMutationResponse { item: { id: string; name?: string }; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "channels-create-result.ts").write_text(
                "import type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n"
                "export interface ChannelsCreateResult { code: string; data?: AdminChannelMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { ChannelsCreateResult } from './channels-create-result';\n"
                "export type { AdminChannelCreateRequest } from './admin-channel-create-request';\n"
                "export type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_generated_sdk_method_with_plural_tag_suffix_removed(self) -> None:
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
                                "api_path": "/backend/v3/api/provider-secrets",
                                "operation": "addProviderSecret",
                                "operation_id": "providerSecrets.create",
                                "tag": "provider-secrets",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/channelService.tsx",
                                "read_sources": ["integration_provider_account"],
                                "write_tables": ["integration_provider_account", "ops_audit_log"],
                                "request_schema": {
                                    "name": "AdminProviderSecretCreateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["providerCode", "name", "secretRef"],
                                        "properties": {
                                            "providerCode": {"type": "string"},
                                            "name": {"type": "string"},
                                            "secretRef": {"type": "string"},
                                        },
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminProviderSecretMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "name": "AdminProviderSecretItem",
                                                "type": "object",
                                                "additionalProperties": False,
                                                "required": ["id"],
                                                "properties": {"id": {"type": "string"}},
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "provider-secret.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ProviderSecretsCreateResult, AdminProviderSecretCreateRequest } from '../types';\n"
                "export class ProviderSecretApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: AdminProviderSecretCreateRequest): Promise<ProviderSecretsCreateResult> {\n"
                "    return this.client.post<ProviderSecretsCreateResult>(backendApiPath(`/provider-secrets`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-provider-secret-item.ts").write_text(
                "export interface AdminProviderSecretItem { id: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-provider-secret-create-request.ts").write_text(
                "export interface AdminProviderSecretCreateRequest { providerCode: string; name: string; secretRef: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-provider-secret-mutation-response.ts").write_text(
                "import type { AdminProviderSecretItem } from './admin-provider-secret-item';\n"
                "export interface AdminProviderSecretMutationResponse { item: AdminProviderSecretItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "provider-secrets-create-result.ts").write_text(
                "import type { AdminProviderSecretMutationResponse } from './admin-provider-secret-mutation-response';\n"
                "export interface ProviderSecretsCreateResult { code: string; data?: AdminProviderSecretMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { ProviderSecretsCreateResult } from './provider-secrets-create-result';\n"
                "export type { AdminProviderSecretCreateRequest } from './admin-provider-secret-create-request';\n"
                "export type { AdminProviderSecretItem } from './admin-provider-secret-item';\n"
                "export type { AdminProviderSecretMutationResponse } from './admin-provider-secret-mutation-response';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_resource_tree_method_matched_by_template_path(self) -> None:
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
                                "api_method": "PUT",
                                "api_path": "/backend/v3/api/skill/{skillId}/assets/{assetId}",
                                "operation": "updateSkillAsset",
                                "operation_id": "skills.assets.update",
                                "tag": "skill",
                                "kind": "update",
                                "path_params": ["skillId", "assetId"],
                                "source": "apps/portal/skillService.tsx",
                                "read_sources": ["ai_agent_skill", "ai_skill_asset"],
                                "write_tables": ["ai_skill_asset", "ops_audit_log"],
                                "request_schema": {
                                    "name": "AdminSkillAssetUpdateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": [],
                                        "properties": {"title": {"type": "string"}},
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminSkillAssetMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "name": "AdminSkillAssetItem",
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
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "skill.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { AdminSkillAssetUpdateRequest, SkillsAssetsUpdateResult } from '../types';\n"
                "export class SkillAssetsApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async update(skillId: string, assetId: string, body: AdminSkillAssetUpdateRequest): Promise<SkillsAssetsUpdateResult> {\n"
                "    return this.client.put<SkillsAssetsUpdateResult>(backendApiPath(`/skill/${skillId}/assets/${assetId}`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-skill-asset-item.ts").write_text(
                "export interface AdminSkillAssetItem { id: string; title: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-skill-asset-update-request.ts").write_text(
                "export interface AdminSkillAssetUpdateRequest { title?: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-skill-asset-mutation-response.ts").write_text(
                "import type { AdminSkillAssetItem } from './admin-skill-asset-item';\n"
                "export interface AdminSkillAssetMutationResponse { item: AdminSkillAssetItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "skills-assets-update-result.ts").write_text(
                "import type { AdminSkillAssetMutationResponse } from './admin-skill-asset-mutation-response';\n"
                "export interface SkillsAssetsUpdateResult { code: string; data?: AdminSkillAssetMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { AdminSkillAssetItem } from './admin-skill-asset-item';\n"
                "export type { AdminSkillAssetMutationResponse } from './admin-skill-asset-mutation-response';\n"
                "export type { AdminSkillAssetUpdateRequest } from './admin-skill-asset-update-request';\n"
                "export type { SkillsAssetsUpdateResult } from './skills-assets-update-result';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_explicit_no_body_operation_with_sdk_body_parameter(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "POST",
                                "api_path": "/app/v3/api/feeds/collect/{id}",
                                "operation": "collectForumFeed",
                                "operation_id": "feeds.collect",
                                "tag": "feeds",
                                "kind": "action",
                                "path_params": ["id"],
                                "source": "apps/portal/forumService.ts",
                                "read_sources": ["content_forum_post", "content_favorite"],
                                "write_tables": ["content_forum_post", "content_favorite"],
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
                                        "required": ["id"],
                                        "properties": {"id": {"type": "integer", "format": "int64", "minimum": 1}},
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()

            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "feed.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { FeedsCollectResult, UnexpectedBodyRequest } from '../types';\n"
                "export class FeedApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async collect(id: string | number, body?: UnexpectedBodyRequest): Promise<FeedsCollectResult> {\n"
                "    return this.client.post<FeedsCollectResult>(appApiPath(`/feeds/collect/${id}`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "unexpected-body-request.ts").write_text(
                "export interface UnexpectedBodyRequest { folderId?: number; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "forum-feed-item.ts").write_text(
                "export interface ForumFeedItem { id: number; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "feeds-collect-result.ts").write_text(
                "import type { ForumFeedItem } from './forum-feed-item';\n"
                "export interface FeedsCollectResult { code: string; data?: ForumFeedItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { FeedsCollectResult } from './feeds-collect-result';\n"
                "export type { ForumFeedItem } from './forum-feed-item';\n"
                "export type { UnexpectedBodyRequest } from './unexpected-body-request';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app feeds.collect SDK method must not accept body parameter for explicit no-body operation",
                result.messages,
            )

    def test_accepts_optional_request_body_when_request_schema_is_declared(self) -> None:
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
                                "api_path": "/backend/v3/api/ecosystem/skills/list",
                                "operation": "fetchSkills",
                                "operation_id": "skills.list",
                                "tag": "ecosystem",
                                "kind": "read",
                                "path_params": [],
                                "source": "apps/portal/skillService.ts",
                                "read_sources": ["agent_skill"],
                                "write_tables": [],
                                "request_body_required": False,
                                "request_schema": {
                                    "name": "AdminSkillListRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "q": {"type": "string", "maxLength": 128},
                                        },
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminSkillListResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["items"],
                                        "properties": {
                                            "items": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "required": ["id"],
                                                    "properties": {
                                                        "id": {"type": "string"},
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()

            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (backend / "src" / "api").mkdir(parents=True, exist_ok=True)
            (backend / "src" / "types").mkdir(parents=True, exist_ok=True)
            (backend / "src" / "api" / "ecosystem.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { AdminSkillListRequest, SkillsListResult } from '../types';\n"
                "export class EcosystemApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async list(body?: AdminSkillListRequest, xRequestId?: string): Promise<SkillsListResult> {\n"
                "    return this.client.post<SkillsListResult>(backendApiPath(`/ecosystem/skills/list`), body, undefined, { 'X-Request-Id': xRequestId }, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "admin-skill-list-request.ts").write_text(
                "export interface AdminSkillListRequest { q?: string; }\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "admin-skill-list-response.ts").write_text(
                "export interface AdminSkillListResponse { items: { id: string }[]; }\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "skills-list-result.ts").write_text(
                "import type { AdminSkillListResponse } from './admin-skill-list-response';\n"
                "export interface SkillsListResult { code: string; data?: AdminSkillListResponse; }\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "index.ts").write_text(
                "export type { AdminSkillListRequest } from './admin-skill-list-request';\n"
                "export type { AdminSkillListResponse } from './admin-skill-list-response';\n"
                "export type { SkillsListResult } from './skills-list-result';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_request_body_search_text_aliases(self) -> None:
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
                                "api_path": "/backend/v3/api/ecosystem/skills/list",
                                "operation": "fetchSkills",
                                "operation_id": "skills.list",
                                "tag": "ecosystem",
                                "kind": "read",
                                "path_params": [],
                                "source": "apps/portal/skillService.ts",
                                "read_sources": ["agent_skill"],
                                "write_tables": [],
                                "request_body_required": False,
                                "request_schema": {
                                    "name": "AdminSkillListRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "q": {"type": "string", "maxLength": 128},
                                            "keyword": {"type": "string", "maxLength": 128},
                                            "search_query": {"type": "string", "maxLength": 128},
                                            "search": {"type": "string", "maxLength": 128},
                                            "searchQuery": {"type": "string", "maxLength": 128},
                                        },
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminSkillListResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["items"],
                                        "properties": {
                                            "items": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "required": ["id"],
                                                    "properties": {
                                                        "id": {"type": "string"},
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()

            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (backend / "src" / "api").mkdir(parents=True, exist_ok=True)
            (backend / "src" / "types").mkdir(parents=True, exist_ok=True)
            (backend / "src" / "api" / "ecosystem.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { AdminSkillListRequest, SkillsListResult } from '../types';\n"
                "export class EcosystemApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async list(body?: AdminSkillListRequest, xRequestId?: string): Promise<SkillsListResult> {\n"
                "    return this.client.post<SkillsListResult>(backendApiPath(`/ecosystem/skills/list`), body, undefined, { 'X-Request-Id': xRequestId }, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "admin-skill-list-request.ts").write_text(
                "export interface AdminSkillListRequest {\n"
                "  q?: string;\n"
                "  keyword?: string;\n"
                "  search_query?: string;\n"
                "  search?: string;\n"
                "  searchQuery?: string;\n"
                "}\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "admin-skill-list-response.ts").write_text(
                "export interface AdminSkillListResponse { items: { id: string }[]; }\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "skills-list-result.ts").write_text(
                "import type { AdminSkillListResponse } from './admin-skill-list-response';\n"
                "export interface SkillsListResult { code: string; data?: AdminSkillListResponse; }\n",
                encoding="utf-8",
            )
            (backend / "src" / "types" / "index.ts").write_text(
                "export type { AdminSkillListRequest } from './admin-skill-list-request';\n"
                "export type { AdminSkillListResponse } from './admin-skill-list-response';\n"
                "export type { SkillsListResult } from './skills-list-result';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            for property_name in ("keyword", "search_query", "search", "searchQuery"):
                self.assertIn(
                    f"backend skills.list request schema AdminSkillListRequest.{property_name} must use q for search text",
                    result.messages,
                )
                self.assertIn(
                    f"backend skills.list SDK request type AdminSkillListRequest.{property_name} must use q for search text",
                    result.messages,
                )
            self.assertFalse(any(".q must use q for search text" in message for message in result.messages))

    def test_accepts_generated_sdk_method_with_singular_path_resource_suffix_removed(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "POST",
                                "api_path": "/app/v3/api/feeds/collect/{id}",
                                "operation": "collectForumFeed",
                                "operation_id": "feeds.collect",
                                "tag": "feeds",
                                "kind": "action",
                                "path_params": ["id"],
                                "source": "apps/portal/forumService.ts",
                                "read_sources": ["content_forum_post", "content_favorite"],
                                "write_tables": ["content_forum_post", "content_favorite"],
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
                                        "required": ["id"],
                                        "properties": {"id": {"type": "integer", "format": "int64", "minimum": 1}},
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "feed.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import { appendQueryString, buildQueryString } from './query';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { FeedsCollectResult } from '../types';\n"
                "export class FeedApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async collect(id: string | number, folderId?: number): Promise<FeedsCollectResult> {\n"
                "    const query = buildQueryString([{ name: 'folderId', value: folderId, style: 'form', explode: true, allowReserved: false }]);\n"
                "    return this.client.post<FeedsCollectResult>(appendQueryString(appApiPath(`/feeds/collect/${id}`), query));\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "forum-feed-item.ts").write_text(
                "export interface ForumFeedItem { id: number; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "feeds-collect-result.ts").write_text(
                "import type { ForumFeedItem } from './forum-feed-item';\n"
                "export interface FeedsCollectResult { code: string; data?: ForumFeedItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { FeedsCollectResult } from './feeds-collect-result';\n"
                "export type { ForumFeedItem } from './forum-feed-item';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_sdk_query_parameter_serialization_that_differs_from_openapi(self) -> None:
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
                                "api_surface": "app",
                                "api_method": "POST",
                                "api_path": "/app/v3/api/feeds/collect/{id}",
                                "operation": "collectForumFeed",
                                "operation_id": "feeds.collect",
                                "tag": "feeds",
                                "kind": "action",
                                "path_params": ["id"],
                                "source": "apps/portal/forumService.ts",
                                "read_sources": ["content_forum_post", "content_favorite"],
                                "write_tables": ["content_forum_post", "content_favorite"],
                                "request_body_required": False,
                                "query_parameters_declared": True,
                                "query_parameters": [
                                    {
                                        "name": "folder_id",
                                        "schema": {"type": "integer", "format": "int64", "minimum": 1},
                                    }
                                ],
                                "response_schema": {
                                    "name": "ForumFeedItem",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["id"],
                                        "properties": {"id": {"type": "integer", "format": "int64", "minimum": 1}},
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "feed.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import { appendQueryString, buildQueryString } from './query';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { FeedsCollectResult } from '../types';\n"
                "export class FeedApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async collect(id: string | number, folderId?: number): Promise<FeedsCollectResult> {\n"
                "    const query = buildQueryString([{ name: 'folderId', value: folderId, style: 'form', explode: true, allowReserved: false }]);\n"
                "    return this.client.post<FeedsCollectResult>(appendQueryString(appApiPath(`/feeds/collect/${id}`), query));\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "forum-feed-item.ts").write_text(
                "export interface ForumFeedItem { id: number; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "feeds-collect-result.ts").write_text(
                "import type { ForumFeedItem } from './forum-feed-item';\n"
                "export interface FeedsCollectResult { code: string; data?: ForumFeedItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { FeedsCollectResult } from './feeds-collect-result';\n"
                "export type { ForumFeedItem } from './forum-feed-item';\n",
                encoding="utf-8",
            )
            backend = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
            (backend / "api").mkdir(parents=True, exist_ok=True)
            (backend / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app feeds.collect SDK query serialization must include OpenAPI query parameter folder_id",
                result.messages,
            )

    def test_accepts_nested_router_backend_module_method_with_tag_suffix_removed(self) -> None:
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
                                "api_path": "/backend/v3/api/router/firewall/rules",
                                "operation": "addFirewall",
                                "operation_id": "firewalls.rules.create",
                                "tag": "firewall",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/ratelimitService.ts",
                                "read_sources": ["iam_gateway_risk_rule"],
                                "write_tables": ["iam_gateway_risk_rule", "ops_audit_log"],
                                "request_schema": {
                                    "name": "AdminFirewallRuleCreateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["type", "value"],
                                        "properties": {
                                            "type": {"type": "string"},
                                            "value": {"type": "string"},
                                        },
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminFirewallMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "name": "AdminFirewallItem",
                                                "type": "object",
                                                "additionalProperties": False,
                                                "required": ["id"],
                                                "properties": {"id": {"type": "string"}},
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "firewall.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { FirewallsRulesCreateResult, AdminFirewallRuleCreateRequest } from '../types';\n"
                "export class FirewallApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: AdminFirewallRuleCreateRequest): Promise<FirewallsRulesCreateResult> {\n"
                "    return this.client.post<FirewallsRulesCreateResult>(backendApiPath(`/router/firewall/rules`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-firewall-item.ts").write_text(
                "export interface AdminFirewallItem { id: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-firewall-mutation-response.ts").write_text(
                "import type { AdminFirewallItem } from './admin-firewall-item';\n"
                "export interface AdminFirewallMutationResponse { item: AdminFirewallItem; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-firewall-rule-create-request.ts").write_text(
                "export interface AdminFirewallRuleCreateRequest { type: string; value: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "firewalls-rules-create-result.ts").write_text(
                "import type { AdminFirewallMutationResponse } from './admin-firewall-mutation-response';\n"
                "export interface FirewallsRulesCreateResult { code: string; data?: AdminFirewallMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { FirewallsRulesCreateResult } from './firewalls-rules-create-result';\n"
                "export type { AdminFirewallItem } from './admin-firewall-item';\n"
                "export type { AdminFirewallMutationResponse } from './admin-firewall-mutation-response';\n"
                "export type { AdminFirewallRuleCreateRequest } from './admin-firewall-rule-create-request';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_sdk_method_that_ignores_explicit_payload_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_openapi(root)
            self.write_sdk(root, generic_method=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app apiKeys.create SDK method must accept body: CreateApiKeyRequest",
                result.messages,
            )
            self.assertIn(
                "app apiKeys.create SDK method must return Promise<ApiKeysCreateResult>",
                result.messages,
            )

    def test_rejects_openapi_operation_without_explicit_request_schema_ref(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_openapi(root)
            self.write_sdk(root)
            spec = self.read_app_spec(root)
            spec["paths"]["/app/v3/api/iam/api_keys"]["post"]["requestBody"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/OperationRequest"
            }
            self.write_app_spec(root, spec)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app apiKeys.create requestBody must reference #/components/schemas/CreateApiKeyRequest",
                result.messages,
            )

    def test_rejects_loose_response_item_object_without_required_stable_id(self) -> None:
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
                                "api_path": "/backend/v3/api/channel",
                                "operation": "addChannel",
                                "operation_id": "channels.create",
                                "tag": "channel",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/channelService.ts",
                                "read_sources": ["ai_channel"],
                                "write_tables": ["ai_channel"],
                                "request_schema": {
                                    "name": "AdminChannelCreateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["name"],
                                        "properties": {"name": {"type": "string"}},
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminChannelMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {"type": "object", "additionalProperties": True},
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "channel.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ChannelsCreateResult, AdminChannelCreateRequest } from '../types';\n"
                "export class ChannelApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: AdminChannelCreateRequest): Promise<ChannelsCreateResult> {\n"
                "    return this.client.post<ChannelsCreateResult>(backendApiPath(`/channel`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-create-request.ts").write_text(
                "export interface AdminChannelCreateRequest { name: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-mutation-response.ts").write_text(
                "export interface AdminChannelMutationResponse { item: Record<string, unknown>; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "channels-create-result.ts").write_text(
                "import type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n"
                "export interface ChannelsCreateResult { code: string; data?: AdminChannelMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { ChannelsCreateResult } from './channels-create-result';\n"
                "export type { AdminChannelCreateRequest } from './admin-channel-create-request';\n"
                "export type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend channels.create response schema AdminChannelMutationResponse.item must declare a closed object schema",
                result.messages,
            )
            self.assertIn(
                "backend channels.create response schema AdminChannelMutationResponse.item must require stable id",
                result.messages,
            )

    def test_rejects_sdk_response_type_that_keeps_closed_entity_as_record(self) -> None:
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
                                "api_path": "/backend/v3/api/channel",
                                "operation": "addChannel",
                                "operation_id": "channels.create",
                                "tag": "channel",
                                "kind": "create",
                                "path_params": [],
                                "source": "apps/portal/channelService.ts",
                                "read_sources": ["ai_channel"],
                                "write_tables": ["ai_channel"],
                                "request_schema": {
                                    "name": "AdminChannelCreateRequest",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["name"],
                                        "properties": {"name": {"type": "string"}},
                                    },
                                },
                                "response_schema": {
                                    "name": "AdminChannelMutationResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["item"],
                                        "properties": {
                                            "item": {
                                                "name": "AdminChannelItem",
                                                "type": "object",
                                                "additionalProperties": False,
                                                "required": ["id"],
                                                "properties": {"id": {"type": "string"}},
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "channel.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ChannelsCreateResult, AdminChannelCreateRequest } from '../types';\n"
                "export class ChannelApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: AdminChannelCreateRequest): Promise<ChannelsCreateResult> {\n"
                "    return this.client.post<ChannelsCreateResult>(backendApiPath(`/channel`), body, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-create-request.ts").write_text(
                "export interface AdminChannelCreateRequest { name: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-item.ts").write_text(
                "export interface AdminChannelItem { id: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-channel-mutation-response.ts").write_text(
                "export interface AdminChannelMutationResponse { item: Record<string, unknown>; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "channels-create-result.ts").write_text(
                "import type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n"
                "export interface ChannelsCreateResult { code: string; data?: AdminChannelMutationResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { ChannelsCreateResult } from './channels-create-result';\n"
                "export type { AdminChannelCreateRequest } from './admin-channel-create-request';\n"
                "export type { AdminChannelItem } from './admin-channel-item';\n"
                "export type { AdminChannelMutationResponse } from './admin-channel-mutation-response';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "backend channels.create SDK response type AdminChannelMutationResponse.item must use AdminChannelItem",
                result.messages,
            )

    def test_accepts_sdk_response_array_entity_type(self) -> None:
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
                                "api_path": "/backend/v3/api/models/sync",
                                "operation": "syncVendorsAndModels",
                                "operation_id": "models.sync",
                                "tag": "model",
                                "kind": "sync",
                                "path_params": [],
                                "source": "apps/portal/modelService.ts",
                                "read_sources": ["ai_model_vendor", "ai_model"],
                                "write_tables": ["ai_model_vendor", "ai_model"],
                                "response_schema": {
                                    "name": "AdminModelCatalogSyncResponse",
                                    "schema": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["synced", "vendors", "models"],
                                        "properties": {
                                            "synced": {"type": "boolean"},
                                            "vendors": {
                                                "type": "array",
                                                "items": {
                                                    "name": "AdminModelVendorItem",
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "required": ["id"],
                                                    "properties": {"id": {"type": "string"}},
                                                },
                                            },
                                            "models": {
                                                "type": "array",
                                                "items": {
                                                    "name": "AdminAiModelItem",
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "required": ["id", "vendorId"],
                                                    "properties": {
                                                        "id": {"type": "string"},
                                                        "vendorId": {"type": "string"},
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            ClawRouterOpenApiGenerator(root=root).write()
            base = root / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api" / "model.ts").write_text(
                "import { backendApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ModelsSyncResult } from '../types';\n"
                "export class ModelApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async sync(): Promise<ModelsSyncResult> {\n"
                "    return this.client.post<ModelsSyncResult>(backendApiPath(`/models/sync`), undefined, undefined, undefined, 'application/json');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-ai-model-item.ts").write_text(
                "export interface AdminAiModelItem { id: string; vendorId: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-model-vendor-item.ts").write_text(
                "export interface AdminModelVendorItem { id: string; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-model-catalog-sync-response.ts").write_text(
                "import type { AdminAiModelItem } from './admin-ai-model-item';\n"
                "import type { AdminModelVendorItem } from './admin-model-vendor-item';\n"
                "export interface AdminModelCatalogSyncResponse {\n"
                "  models: AdminAiModelItem[];\n"
                "  synced: boolean;\n"
                "  vendors: AdminModelVendorItem[];\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "models-sync-result.ts").write_text(
                "import type { AdminModelCatalogSyncResponse } from './admin-model-catalog-sync-response';\n"
                "export interface ModelsSyncResult { code: string; data?: AdminModelCatalogSyncResponse; }\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                "export type { AdminAiModelItem } from './admin-ai-model-item';\n"
                "export type { AdminModelCatalogSyncResponse } from './admin-model-catalog-sync-response';\n"
                "export type { AdminModelVendorItem } from './admin-model-vendor-item';\n"
                "export type { ModelsSyncResult } from './models-sync-result';\n",
                encoding="utf-8",
            )
            app = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
            (app / "api").mkdir(parents=True, exist_ok=True)
            (app / "types").mkdir(parents=True, exist_ok=True)

            result = ClawRouterPayloadSdkAudit(root=root).run()

            self.assertTrue(result.ok, result.messages)


if __name__ == "__main__":
    unittest.main()
