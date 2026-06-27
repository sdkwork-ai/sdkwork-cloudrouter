import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator
from tools.schema_registry_loader import render_schema_registry


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-marketing"
)
SERVICE_PATH = PACKAGE_ROOT / "src" / "marketingService.ts"
VIEW_PATH = PACKAGE_ROOT / "src" / "index.tsx"
PACKAGE_JSON_PATH = PACKAGE_ROOT / "package.json"
ADMIN_FINANCE_SERVICE_PATH = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-finance"
    / "src"
    / "financeService.ts"
)
BACKEND_SDK_SYSTEM_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "api"
    / "system.ts"
)
BACKEND_SDK_TYPES_INDEX_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "types"
    / "index.ts"
)
BACKEND_SDK_MARKETING_RESULT_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "types"
    / "marketing-referral-stats-list-result.ts"
)
BACKEND_SDK_REFERRAL_RESPONSE_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "types"
    / "admin-referral-stats-response.ts"
)
PRODUCT_ADMIN_MARKETING_PORT_PATH = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "ports"
    / "admin_marketing_store.rs"
)
PRODUCT_ADMIN_MARKETING_API_PATH = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "api"
    / "admin_marketing.rs"
)
PRODUCT_ADMIN_MARKETING_SQLITE_STORE_PATH = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "infrastructure"
    / "sql"
    / "sqlite"
    / "admin_marketing_store.rs"
)
PRODUCT_ADMIN_MARKETING_POSTGRES_STORE_PATH = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "infrastructure"
    / "sql"
    / "postgres"
    / "admin_marketing_store.rs"
)
FRONTEND_FIELD_CONTRACT_PATH = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
FRONTEND_ADMIN_ENTITY_CONTRACT_PATH = (
    ROOT
    / "docs"
    / "schema-registry"
    / "frontend-field-contracts"
    / "shared"
    / "entities"
    / "admin.yaml"
)
FRONTEND_ROUTE_CLASSIFICATION_PATH = (
    ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"
)
FRONTEND_ROUTE_CONTRACT_PATH = (
    ROOT
    / "docs"
    / "schema-registry"
    / "frontend-field-contracts"
    / "routes"
    / "routes.yaml"
)
TABLE_REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
SCHEMA_MANIFEST_PATH = ROOT / "generated" / "schema" / "manifest" / "schema-manifest.json"
API_CONTRACT_MANIFEST_PATH = ROOT / "generated" / "api" / "api-contract-manifest.json"
OPENAPI_SCHEMA_COMPONENTS_PATH = ROOT / "generated" / "openapi" / "schema-components.yaml"
BACKEND_OPENAPI_PATH = ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json"
APP_OPENAPI_PATH = ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
APP_SDK_OPENAPI_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "openapi"
    / "clawrouter-app-sdk.openapi.json"
)
APP_SDK_SDKGEN_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "openapi"
    / "clawrouter-app-sdk.sdkgen.json"
)
BACKEND_SDK_OPENAPI_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "openapi"
    / "clawrouter-backend-sdk.openapi.json"
)
BACKEND_SDK_SDKGEN_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "openapi"
    / "clawrouter-backend-sdk.sdkgen.json"
)
APP_SDK_PROMOTION_COUPON_STOCK_TYPE_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "clawrouter-app-sdk-typescript"
    / "src"
    / "types"
    / "promotion-coupon-stock-record.ts"
)
APP_SDK_PROMOTION_CODE_TYPE_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "clawrouter-app-sdk-typescript"
    / "src"
    / "types"
    / "promotion-code-record.ts"
)
BACKEND_SDK_PROMOTION_COUPON_STOCK_TYPE_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "types"
    / "promotion-coupon-stock-record.ts"
)
BACKEND_SDK_PROMOTION_CODE_TYPE_PATH = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
    / "types"
    / "promotion-code-record.ts"
)
ADMIN_MARKETING_STANDARD_SPEC_PATH = (
    ROOT
    / "docs"
    / "superpowers"
    / "specs"
    / "2026-05-26-admin-marketing-promotion-standard-design.md"
)
API_GATEWAY_STANDARD_DOC_PATH = ROOT / "docs" / "06-API-Gateway与接口标准设�?md"
ADMIN_MARKETING_DESIGN_DOC_PATHS = [
    ROOT / "CHECK_RESULT.md",
    ROOT / "docs" / "12-前端功能模块与数据库表结构映�?md",
    ROOT / "docs" / "14-数据结构细节复核与补强记�?md",
]


@unittest.skipUnless(
    SERVICE_PATH.exists(),
    "admin marketing package removed from claw router PC surface",
)
class AdminMarketingRuntimeStandardTest(unittest.TestCase):
    def test_product_admin_marketing_port_uses_promotion_coupon_domain_names(self) -> None:
        port = PRODUCT_ADMIN_MARKETING_PORT_PATH.read_text(encoding="utf-8")
        api = PRODUCT_ADMIN_MARKETING_API_PATH.read_text(encoding="utf-8")
        combined = port + "\n" + api

        for required_token in [
            "ListPromotionOffersQuery",
            "ListPromotionCouponStocksQuery",
            "ListPromotionCodesQuery",
            "ListPromotionCodeRedemptionsQuery",
            "CreatePromotionOfferCommand",
            "DeletePromotionOfferCommand",
            "UpdatePromotionOfferCommand",
            "GeneratePromotionCouponStockCommand",
            "UpdatePromotionCodeStatusCommand",
            "PromotionOfferItem",
            "PromotionCouponStockItem",
            "PromotionCodeItem",
            "PromotionCodeRedemptionItem",
            "list_promotion_offers",
            "create_promotion_offer",
            "generate_promotion_coupon_stock",
            "list_promotion_code_redemptions",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "AdminCouponItem",
            "AdminCouponBatchItem",
            "AdminPromoCodeItem",
            "AdminRedemptionRecordItem",
            "ListAdminCouponsQuery",
            "ListAdminCouponBatchesQuery",
            "ListAdminPromoCodesQuery",
            "ListAdminRedemptionRecordsQuery",
            "CreateAdminCouponCommand",
            "DeleteAdminCouponCommand",
            "UpdateAdminCouponCommand",
            "GenerateAdminCouponBatchCommand",
            "UpdateAdminPromoCodeStatusCommand",
            "list_coupons",
            "create_coupon",
            "generate_batch",
            "list_promo_codes",
            "list_redemption_records",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_product_admin_marketing_commands_use_offer_stock_code_fields(self) -> None:
        port = PRODUCT_ADMIN_MARKETING_PORT_PATH.read_text(encoding="utf-8")
        api = PRODUCT_ADMIN_MARKETING_API_PATH.read_text(encoding="utf-8")
        combined = port + "\n" + api

        for required_token in [
            "CreatePromotionOfferRequest",
            "GeneratePromotionCouponStockRequest",
            "UpdatePromotionCodeStatusRequest",
            "MAX_COUPON_STOCK_QUANTITY",
            "/backend/v3/api/promotions/offers/{offer_id}",
            "offer_uuid",
            "offer_id",
            "discount_type",
            "stock_uuid",
            "stock_id",
            "code_id",
            "total_quantity",
            "code_prefix",
            "normalize_discount_type",
            "normalize_discount_value",
            "normalize_offer_status",
            "normalize_stock_quantity",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "CreateCouponRequest",
            "GenerateBatchRequest",
            "UpdatePromoCodeStatusRequest",
            "MAX_BATCH_COUNT",
            "{coupon_id}",
            "coupon_uuid",
            "coupon_id",
            "coupon_type",
            "batch_uuid",
            "batch_id",
            "promo_code_id",
            "normalize_coupon_type",
            "normalize_coupon_value",
            "normalize_coupon_status",
            "normalize_batch_count",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_frontend_field_contract_uses_promotion_coupon_entities(self) -> None:
        contract = FRONTEND_FIELD_CONTRACT_PATH.read_text(encoding="utf-8")
        admin_entities = FRONTEND_ADMIN_ENTITY_CONTRACT_PATH.read_text(encoding="utf-8")
        combined = contract + "\n" + admin_entities

        for required_token in [
            "promotion_offer_record:",
            "name: PromotionOfferRecord",
            "promotion_coupon_stock_record:",
            "name: PromotionCouponStockRecord",
            "promotion_code_record:",
            "name: PromotionCodeRecord",
            "promotion_code_redemption_record:",
            "name: PromotionCodeRedemptionRecord",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "admin_coupon_item:",
            "name: AdminCouponItem",
            "admin_coupon_batch_item:",
            "name: AdminCouponBatchItem",
            "admin_promo_code_item:",
            "name: AdminPromoCodeItem",
            "admin_redemption_record_item:",
            "name: AdminRedemptionRecordItem",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_marketing_route_contracts_use_promotion_code_page_semantics(self) -> None:
        combined = "\n".join(
            [
                FRONTEND_FIELD_CONTRACT_PATH.read_text(encoding="utf-8"),
                FRONTEND_ROUTE_CLASSIFICATION_PATH.read_text(encoding="utf-8"),
                FRONTEND_ROUTE_CONTRACT_PATH.read_text(encoding="utf-8"),
                render_schema_registry(TABLE_REGISTRY_PATH),
                SCHEMA_MANIFEST_PATH.read_text(encoding="utf-8"),
            ]
        )

        for required_token in [
            "/admin/marketing/promotion-coupon-stocks",
            "/admin/marketing/promotion-codes",
            "/admin/marketing/promotion-code-redemptions",
            "/admin/marketing/promotion-coupon-ledger",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "/admin/marketing/coupon-stocks",
            "/admin/marketing/coupon-codes",
            "/admin/marketing/coupon-code-redemptions",
            "/admin/marketing/coupon-ledger",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_finance_contract_no_longer_carries_legacy_coupon_marketing_operations(self) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml",
                FRONTEND_FIELD_CONTRACT_PATH,
                ROOT / "generated" / "schema" / "frontend" / "frontend-operation-audit.json",
                API_CONTRACT_MANIFEST_PATH,
            ]
            if path.exists()
        )

        for retired_token in [
            "operations/backend-commerce-coupons.yaml",
            "backendCouponsTemplatesList",
            "backendCouponsCampaignsList",
            "backendCouponsCodesList",
            "backendCouponsRedemptionsList",
            "Finance Coupon Offers List",
            "Finance Coupon Stocks List",
            "Finance Coupon Codes List",
            "Finance Coupon Code Redemptions List",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_product_admin_marketing_store_uses_standard_coupon_stock_and_promotion_code_language(
        self,
    ) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                PRODUCT_ADMIN_MARKETING_SQLITE_STORE_PATH,
                PRODUCT_ADMIN_MARKETING_POSTGRES_STORE_PATH,
            ]
        )

        for required_token in [
            "COUPON_STOCK_LIST_SQL",
            "COUPON_STOCK_BY_ID_SQL",
            "promotion_offer_from_row",
            "promotion_coupon_stock_from_row",
            "promotion_code_from_row",
            "next_promotion_code_sequence",
            "promotion_code_sequence",
            "promotion_code_status_value",
            "ensure_promotion_code_status_transition",
            "promotion_code_status_label",
            '"offer_id": &command.offer_id',
            '"stock_id": &stock_id',
            '"code_id": &command.code_id',
            '"discount_type": &command.discount_type',
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "BATCH_LIST_SQL",
            "BATCH_BY_ID_SQL",
            "batch_from_row",
            "promo_code_from_row",
            "next_promo_code_sequence",
            "next_available_promo_code",
            "promo_code_exists",
            "promo_code_sequence",
            "format_promo_code",
            "promo_status_value",
            "ensure_promo_status_transition",
            "promo_status_label",
            "load_promo_code_status_fact",
            "promo_code_status_fact",
            "promo status",
            '"offerId":',
            '"stockId":',
            '"codeId":',
            '"type": &command.discount_type',
            "admin coupon",
            "coupon batch",
            "promo code",
            "admin coupons",
            "coupon was not found",
            "created coupon could not be reloaded",
            "updated coupon could not be reloaded",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_marketing_tooling_no_longer_keeps_retired_coupon_batch_aliases(self) -> None:
        manifest_tool = (ROOT / "tools" / "api_contract_manifest.py").read_text(encoding="utf-8")
        payload_audit_tool = (ROOT / "tools" / "clawrouter_payload_sdk_audit.py").read_text(encoding="utf-8")
        product_runtime_test = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")
        combined_tooling = "\n".join([manifest_tool, payload_audit_tool, product_runtime_test])

        self.assertIn('"promotion-codes": "promotion_codes"', manifest_tool)
        for retired_token in [
            '"coupon-batches": "coupon_batches"',
            '"batch"',
            '"batchId"',
            '"couponId"',
            "readRequiredString(item, 'batchId'",
            "readRequiredString(item, 'couponId'",
            "firstRequiredString(item, ['id', 'couponId', 'coupon_id'",
        ]:
            self.assertNotIn(retired_token, combined_tooling)

    def test_admin_marketing_coupon_stock_contract_no_longer_exposes_batch_semantics(self) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                PRODUCT_ADMIN_MARKETING_API_PATH,
                VIEW_PATH,
                FRONTEND_ADMIN_ENTITY_CONTRACT_PATH,
                FRONTEND_ROUTE_CONTRACT_PATH,
                SCHEMA_MANIFEST_PATH,
                OPENAPI_SCHEMA_COMPONENTS_PATH,
                BACKEND_OPENAPI_PATH,
                APP_OPENAPI_PATH,
                APP_SDK_OPENAPI_PATH,
                APP_SDK_SDKGEN_PATH,
                BACKEND_SDK_OPENAPI_PATH,
                BACKEND_SDK_SDKGEN_PATH,
                APP_SDK_PROMOTION_COUPON_STOCK_TYPE_PATH,
                APP_SDK_PROMOTION_CODE_TYPE_PATH,
                BACKEND_SDK_PROMOTION_COUPON_STOCK_TYPE_PATH,
                BACKEND_SDK_PROMOTION_CODE_TYPE_PATH,
            ]
        )

        for required_token in [
            "stock_no",
            "code_no",
            "promotion_code_last4",
            "PromotionCouponStockRecord",
            "PromotionCodeRecord",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "batch_no",
            "code_batch_no",
            "code_batch_no(",
            "admin.col.batch",
            "'Batch'",
            '"Batch"',
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_marketing_sql_stores_use_standard_stock_type_not_legacy_batch(
        self,
    ) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                PRODUCT_ADMIN_MARKETING_SQLITE_STORE_PATH,
                PRODUCT_ADMIN_MARKETING_POSTGRES_STORE_PATH,
            ]
        )

        self.assertIn("'code_claim'", combined)
        self.assertNotIn("'batch'", combined)

    def test_admin_marketing_standard_docs_no_longer_keep_legacy_batch_semantics(
        self,
    ) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [
                ADMIN_MARKETING_STANDARD_SPEC_PATH,
                API_GATEWAY_STANDARD_DOC_PATH,
            ]
        )

        for required_token in [
            "promotion_coupon_stock",
            "promotion_code",
            "/backend/v3/api/promotions/**",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "code_batch_no",
            "coupon batch",
            "code batches",
            "Stock/batch",
            "stock/batch",
            "Platform stock/batch id",
            "/backend/v3/api/coupon/**",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_finance_service_no_longer_keeps_legacy_coupon_marketing_bridge(
        self,
    ) -> None:
        service = ADMIN_FINANCE_SERVICE_PATH.read_text(encoding="utf-8")

        for required_token in [
            "backendInvoicesTitlesList",
            "backendInvoicesList",
            "backendCommerceReportsPaymentReconciliationRetrieve",
            "backendCommerceReportsOrderRevenueList",
            "backendCommerceReportsRefundsList",
            "backendAuditCommerceEventsList",
        ]:
            self.assertIn(required_token, service)

        for retired_token in [
            "backendCouponsTemplatesList",
            "backendCouponsCampaignsList",
            "backendCouponsCodesList",
            "backendCouponsRedemptionsList",
            "readRequiredCouponItems",
            "readRequiredCouponBatchItems",
            "readRequiredPromoCodeItems",
            "Coupon records are required",
            "Coupon batch records are required",
            "Promo code records are required",
            "Promo code id is required",
        ]:
            self.assertNotIn(retired_token, service)

    def test_admin_marketing_design_docs_no_longer_describe_retired_coupon_model(
        self,
    ) -> None:
        combined = "\n".join(path.read_text(encoding="utf-8") for path in ADMIN_MARKETING_DESIGN_DOC_PATHS)

        for required_token in [
            "PromotionOfferRecord",
            "PromotionCouponStockRecord",
            "PromotionCodeRecord",
            "PromotionCodeRedemptionRecord",
            "promotion_offer",
            "promotion_coupon_stock",
            "promotion_code",
            "promotion_code_redemption",
        ]:
            self.assertIn(required_token, combined)

        for retired_token in [
            "MarketingService.addCoupon",
            "MarketingService.generateBatch",
            "CouponCreateInput",
            "CouponBatchGenerateInput",
            "`Coupon`、`Batch`、`PromoCode`、`RedemptionRecord`",
            "`Coupon` / `PromoCode` / `ReferralStat`",
            "batchId",
            "usedBy",
            "promo-code view",
        ]:
            self.assertNotIn(retired_token, combined)

    def test_admin_marketing_referral_stats_contract_uses_backend_surface(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        key = (
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-admin-marketing/src/marketingService.ts#fetchReferralStats"
        )
        operation = operations[key]

        self.assertEqual("fetchReferralStats", operation["operation"])
        self.assertEqual("marketing.referralStats.list", operation["operation_id"])
        self.assertEqual("backend", operation["api_surface"])
        self.assertEqual("GET", operation["api_method"])
        self.assertEqual("/backend/v3/api/system/marketing/referral_stats", operation["api_path"])
        self.assertEqual("read", operation["kind"])
        self.assertEqual("AdminReferralStatsResponse", operation["response_schema"]["name"])

    def test_admin_marketing_frontend_and_backend_sdk_use_typed_referral_stats(self) -> None:
        package = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
        service = SERVICE_PATH.read_text(encoding="utf-8")
        view = VIEW_PATH.read_text(encoding="utf-8")
        sdk_system = BACKEND_SDK_SYSTEM_PATH.read_text(encoding="utf-8")
        sdk_types_index = BACKEND_SDK_TYPES_INDEX_PATH.read_text(encoding="utf-8")
        referral_list_result = BACKEND_SDK_MARKETING_RESULT_PATH.read_text(encoding="utf-8")
        referral_response = BACKEND_SDK_REFERRAL_RESPONSE_PATH.read_text(encoding="utf-8")

        self.assertEqual("module", package["type"])
        self.assertEqual("tsc --noEmit", package["scripts"]["typecheck"])

        self.assertIn("export interface ReferralStat", service)
        for token in [
            "id: string;",
            "inviter: string;",
            "total_invited: number;",
            "total_revenue: string;",
            "bonus_awarded: string;",
            "link: string;",
            "static async fetchReferralStats(): Promise<ReferralStat[]>",
            "getClawRouterBackendSdkClient().system.marketing.referralStats.list()",
            "readRequiredApiItems(result, 'Failed to fetch referral stats')",
            "normalizeReferralStat",
            "readRequiredString(item, 'id', 'Referral stat id is required')",
            "readRequiredString(item, 'inviter', 'Referral inviter is required')",
            "readRequiredNumber(item, 'total_invited', 'Referral invited total is required')",
            "readRequiredString(item, 'total_revenue', 'Referral revenue is required')",
            "readRequiredString(item, 'bonus_awarded', 'Referral bonus is required')",
            "readRequiredString(item, 'link', 'Referral link is required')",
        ]:
            self.assertIn(token, service)
        for retired_token in [
            "getClawRouterAppSdkClient()",
            "getClawRouterCommerceService()",
            "AdminCouponCreateRequest",
            "AdminCouponBatchGenerateRequest",
            "AdminPromoCodeStatusUpdateRequest",
            "generateBatch",
            "updatePromoCodeStatus",
            "BillingService",
            "console.billing",
        ]:
            self.assertNotIn(retired_token, service)

        self.assertIn("MarketingService.fetchReferralStats()", view)
        self.assertIn("AdminResourceCenter", view)
        self.assertIn("buildMarketingSections", view)
        self.assertIn("id: 'referrals'", view)
        self.assertIn("load: () => MarketingService.fetchReferralStats()", view)
        self.assertIn("tableViewportDataAttribute=\"admin-marketing-table-viewport\"", view)
        self.assertIn("showSectionNavigation={false}", view)
        self.assertIn("Referral Stats", view)
        for token in [
            "{ key: 'inviter'",
            "{ key: 'link'",
            "{ key: 'total_invited'",
            "{ key: 'total_revenue'",
            "{ key: 'bonus_awarded'",
        ]:
            self.assertIn(token, view)
        for retired_token in [
            "AdminCouponCreateRequest",
            "AdminCouponBatchGenerateRequest",
            "AdminPromoCodeStatusUpdateRequest",
            "generateBatch",
            "updatePromoCodeStatus",
            "BillingService",
            "console.billing",
            "coupon.add",
            "promo code",
        ]:
            self.assertNotIn(retired_token, view)

        self.assertIn("public readonly referralStats: SystemMarketingReferralStatsApi;", sdk_system)
        self.assertIn("async list(): Promise<MarketingReferralStatsListResult>", sdk_system)
        self.assertIn("backendApiPath(`/system/marketing/referral_stats`)", sdk_system)
        self.assertIn("export type { MarketingReferralStatsListResult }", sdk_types_index)
        self.assertIn("export type { AdminReferralStatsResponse }", sdk_types_index)
        self.assertIn("export interface MarketingReferralStatsListResult", referral_list_result)
        self.assertIn("data?: AdminReferralStatsResponse;", referral_list_result)
        self.assertIn("export interface AdminReferralStatsResponse", referral_response)
        self.assertIn("items: AdminReferralStatItem[];", referral_response)


if __name__ == "__main__":
    unittest.main()
