import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APPBASE_ROOT = ROOT / ".sdkwork" / "dependencies" / "sdkwork-appbase"


APPBASE_PAYMENT_STORES = [
    "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/sqlite_payment.rs",
    "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/postgres_payment.rs",
]

APPBASE_PROMOTION_STORES = [
    "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/sqlite_promotion.rs",
    "../../sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/postgres_promotion.rs",
]

CONSOLE_COMMERCE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-console-commerce"
    / "src"
)

CONSOLE_WALLET = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-console-wallet"
    / "src"
)

@unittest.skip("Retired legacy billing aggregate; split commerce tests now cover the active commerce flows.")
class BillingRuntimeStandardTest(unittest.TestCase):
    def test_billing_backend_money_uses_exact_decimal_strings(self) -> None:
        payment_domain = (
            APPBASE_ROOT
            / "packages"
            / "native-rust"
            / "commerce"
            / "sdkwork-commerce-payment-rust"
            / "src"
            / "domain"
            / "mod.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("pub amount: CommerceMoney", payment_domain)
        self.assertNotIn("pub amount: f64", payment_domain)

        for relative in APPBASE_PAYMENT_STORES:
            store = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn(
                'commerce_money_cell(row, "amount", "payment record amount")?',
                store,
            )
            self.assertIn("PaymentRecordItem::new", store)
            self.assertNotIn("amount: decimal_cell(row, \"amount\")", store)
            self.assertNotIn("amount: credited_points as f64", store)
            self.assertNotIn('decimal_string_cell(row, "amount").unwrap', store)
            self.assertNotIn('unwrap_or_else(|_| "0.00".to_owned())', store)
            self.assertNotIn("fn decimal_cell", store)
            self.assertNotIn("parse::<f64>()", store)

        promotion_domain = (
            APPBASE_ROOT
            / "packages"
            / "native-rust"
            / "commerce"
            / "sdkwork-commerce-promotion-rust"
            / "src"
            / "domain"
            / "mod.rs"
        ).read_text(encoding="utf-8")
        self.assertIn("pub amount: CommerceMoney", promotion_domain)
        self.assertNotIn("pub amount: f64", promotion_domain)

        for relative in APPBASE_PROMOTION_STORES:
            store = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("CurrentUserCouponItem::new", store)
            self.assertIn("&string_cell(row, \"amount\")", store)
            self.assertIn("RedeemCodeOutcome::new", store)
            self.assertIn("points_to_money_string(credited_points)", store)
            self.assertIn("money_cents(discount_value)?", store)
            self.assertNotIn("parse::<f64>()", store)
            self.assertNotIn("amount: credited_points as f64", store)
            self.assertNotIn('unwrap_or_else(|_| "0.00".to_owned())', store)

    def test_appbase_payment_record_statuses_fail_closed_for_unknown_status_codes(self) -> None:
        for relative in APPBASE_PAYMENT_STORES:
            store = (ROOT / relative).read_text(encoding="utf-8")

            for signature in [
                "fn payment_status_label(value: &str) -> Result<&'static str, CommerceServiceError>",
            ]:
                self.assertIn(signature, store, relative)

            for fragment in [
                "payment_record_status(row)?",
                "CommercePaymentStatus",
                "CommerceRechargeStatus",
                "unsupported payment record payment status",
                "status => Err(CommerceServiceError::storage(format!(",
            ]:
                self.assertIn(fragment, store, relative)

            for forbidden in [
                "fn coupon_status_label(value: i64) -> &'static str",
                "fn payment_status_label(value: i64) -> &'static str",
                "fn coupon_status_label(value: i64)",
                "fn payment_status_label(value: i64)",
                "fn coupon_status_label(value: &str)",
                "CommerceCouponStatus",
                "unsupported billing coupon status",
                '_ => "success"',
                '_ => "pending"',
                'unwrap_or_else(|_| "0.00".to_owned())',
            ]:
                self.assertNotIn(forbidden, store, relative)

    def test_appbase_coupon_history_statuses_fail_closed_without_database_default(self) -> None:
        for relative in APPBASE_PROMOTION_STORES:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(uc.status, 0) AS status", store)
                self.assertNotIn("CAST(COALESCE(uc.status, 0) AS TEXT) AS status", store)
                self.assertIn("c.status AS status", store)
                self.assertIn("CommerceCouponStatus", store)
                self.assertIn(
                    "fn coupon_status_label(value: &str) -> Result<&'static str, CommerceServiceError>",
                    store,
                )
                self.assertIn("let status = coupon_status_label(", compact_store)
                self.assertIn('required_status_cell(row, "status", "redeem")?', compact_store)
                self.assertIn(".to_owned();", compact_store)
                self.assertIn("missing billing redeem status from database row", store)
                self.assertIn("unsupported billing coupon status", store)

    def test_appbase_payment_record_statuses_are_source_aware_and_fail_closed(self) -> None:
        for relative in APPBASE_PAYMENT_STORES:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(p.status, o.status, vr.status, 0) AS status", store)
                self.assertNotIn('let status = payment_status_label(integer_cell(row, "status"))?.to_owned();', store)
                self.assertNotIn("plus_vip_recharge", store)
                self.assertNotIn("commerce_vip_membership", store)
                self.assertIn("AS payment_id", store)
                self.assertIn("AS payment_attempt_id", store)
                self.assertIn("o.status AS order_status", store)
                self.assertIn("pi.status AS payment_status", store)
                self.assertIn("pa.status AS payment_attempt_status", store)
                self.assertIn("let order_status = order_recharge_status_label(", compact_store)
                self.assertIn('required_status_cell(row, "order_status", "order")?', compact_store)
                self.assertIn("let payment_status = related_status_cell(", compact_store)
                self.assertIn('"payment_id", "payment_status", "payment"', compact_store)
                self.assertIn("payment_status_label(&status)", compact_store)
                self.assertIn('.unwrap_or("pending");', compact_store)
                self.assertIn(
                    '"payment_attempt_id", "payment_attempt_status", "payment attempt"',
                    compact_store,
                )
                self.assertIn("fn payment_record_status_label(", store)
                self.assertIn("fn order_recharge_status_label(value: &str) -> Result<&'static str, CommerceServiceError>", store)
                self.assertNotIn("fn vip_recharge_status_label", store)
                self.assertIn("missing payment record {source} status from database row", store)
                self.assertIn('"payment attempt",', store)
                self.assertIn("unsupported payment record order status", store)
                self.assertIn("unsupported payment record payment status", store)

    def test_console_billing_money_uses_exact_decimal_strings(self) -> None:
        billing_service = (CONSOLE_COMMERCE / "commerceService.ts").read_text(encoding="utf-8")
        billing_view = (CONSOLE_COMMERCE / "CommerceView.tsx").read_text(encoding="utf-8")

        self.assertIn("amount: string", billing_service)
        self.assertIn("amount?: string", billing_service)
        self.assertIn("readRequiredMoneyString", billing_service)
        self.assertIn("readOptionalMoneyString(data, 'amount', 'Redeem amount must be a money string')", billing_service)
        commerce_runtime = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "commerce-runtime.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("createIdempotencyParams('commerce-coupon-redeem')", commerce_runtime)
        self.assertIn("'Redeem history amount must be a money string'", billing_service)
        self.assertIn("'Recharge history amount must be a money string'", billing_service)
        self.assertIn("readRequiredString(item, 'date', 'Redeem history date is required')", billing_service)
        self.assertIn("readRequiredString(item, 'method', 'Recharge history payment method is required')", billing_service)
        self.assertIn("throw new Error(`Unsupported billing status: ${status}`)", billing_service)
        self.assertNotIn("amount: number", billing_service)
        self.assertNotIn("amount?: number", billing_service)
        self.assertNotIn("readNumber(data, 'amount')", billing_service)
        self.assertNotIn("readNumber(item, 'amount')", billing_service)
        self.assertNotIn("function readMoneyString", billing_service)
        self.assertNotIn("amount: readMoneyString(item, 'amount')", billing_service)
        self.assertNotIn("date: readString(item, 'date')", billing_service)
        self.assertNotIn("return 'success';", billing_service)

        self.assertIn("useState<string>('')", billing_view)
        self.assertIn("selectedAmount, setSelectedAmount] = useState<string | null>", billing_view)
        self.assertIn("moneyCents(", billing_view)
        self.assertIn("pkg.points.toLocaleString()", billing_view)
        self.assertIn("selectedPackage.points.toLocaleString()", billing_view)
        self.assertIn("formatMoneyAmount(", billing_view)
        self.assertNotIn("pointsForAmount(", billing_view)
        self.assertNotIn("useState<number | ''>", billing_view)
        self.assertNotIn("Number(rechargeAmount)", billing_view)
        self.assertNotIn("item.amount.toFixed", billing_view)
        self.assertNotIn("amt * 10", billing_view)

    def test_console_billing_ui_has_retryable_load_states_without_fake_finance_data(self) -> None:
        billing_view = (CONSOLE_COMMERCE / "CommerceView.tsx").read_text(encoding="utf-8")

        self.assertIn("BusinessStateTableRow", billing_view)
        self.assertIn("loadError", billing_view)
        self.assertIn("accountLoadError", billing_view)
        self.assertIn("historyLoadError", billing_view)
        self.assertIn("loadAccountSummary", billing_view)
        self.assertIn("loadHistory", billing_view)
        self.assertIn("onRetry={() => { void loadHistory(); }}", billing_view)
        self.assertIn("onRetry={() => { void loadAccountSummary(); }}", billing_view)
        self.assertIn("await AccountService.fetchAccountDetails()", billing_view)
        self.assertIn("await CommerceService.fetchRedeemHistory()", billing_view)
        self.assertIn("await CommerceService.fetchRechargeHistory()", billing_view)
        self.assertNotIn("console.error", billing_view)
        self.assertNotIn("emptyAccountStats", billing_view)
        self.assertNotIn("setAccountSummary(emptyAccountStats())", billing_view)
        self.assertNotIn('<Loader2 className="w-6 h-6 animate-spin', billing_view)

    def test_console_billing_hides_unsupported_download_actions_until_contract_exists(self) -> None:
        billing_view = (CONSOLE_COMMERCE / "CommerceView.tsx").read_text(encoding="utf-8")
        billing_service = (CONSOLE_COMMERCE / "commerceService.ts").read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        redeem_history_marker = (
            "  - route: /console/commerce\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-commerce/src/commerceService.ts\n"
            "    operation: fetchRedeemHistory"
        )
        redeem_history_start = contract.index(redeem_history_marker)
        checkout_contract_start = contract.index("  - route: /console/checkout", redeem_history_start + 1)
        billing_read_contract = contract[redeem_history_start:checkout_contract_start]
        redeem_code_marker = (
            "  - route: /console/commerce\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-commerce/src/commerceService.ts\n"
            "    operation: redeemCode"
        )
        redeem_code_start = contract.index(redeem_code_marker)
        next_operation_start = contract.index("\n  - route:", redeem_code_start + 1)
        billing_redeem_contract = contract[redeem_code_start:next_operation_start]
        billing_contract = billing_read_contract + billing_redeem_contract

        self.assertNotIn("readOnlyBillingDownloads", billing_view)
        self.assertNotIn("Read-only", billing_view)
        self.assertNotIn("read-only", billing_view)
        self.assertNotIn("command contract", billing_view)
        self.assertNotIn("<Download", billing_view)
        self.assertNotIn("download poster", billing_view.lower())
        for unsupported_action in [
            "downloadPromotionPoster",
            "downloadPoster",
            "exportBilling",
            "downloadInvoice",
            "handleDownload",
            "static async download",
            "static async export",
        ]:
            self.assertNotIn(unsupported_action, billing_view)
            self.assertNotIn(unsupported_action, billing_service)
        self.assertIn("operation: fetchRedeemHistory", billing_contract)
        self.assertIn("operation: fetchRechargeHistory", billing_contract)
        self.assertNotIn("operation: download", billing_contract)
        self.assertNotIn("operation: downloadPromotionPoster", billing_contract)
        self.assertNotIn("operation: exportBilling", billing_contract)

    def test_console_billing_product_error_states_are_localized(self) -> None:
        service_paths = [
            CONSOLE_COMMERCE / "commerceService.ts",
            CONSOLE_COMMERCE / "checkoutService.ts",
            CONSOLE_COMMERCE / "commerceFoundationService.ts",
        ]
        services = "\n".join(path.read_text(encoding="utf-8") for path in service_paths)
        i18n = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "index.ts"
        ).read_text(encoding="utf-8")

        for marker in [
            "console.billing.errors.redeemHistoryFallback",
            "console.billing.errors.rechargeHistoryFallback",
            "console.billing.errors.redeemFallback",
            "console.billing.errors.checkoutStatusFallback",
            "console.billing.errors.exchangeRateFallback",
            "console.billing.errors.exchangeRulesFallback",
        ]:
            self.assertIn(marker, services + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        for hardcoded_copy in [
            "Failed to fetch redeem history",
            "Failed to fetch recharge history",
            "Failed to redeem code",
            "Failed to fetch checkout status",
            "Failed to fetch account points exchange rate",
            "Failed to fetch account points exchange rules",
        ]:
            self.assertNotIn(hardcoded_copy, services)

    def test_console_redeem_standalone_fake_entry_is_removed_in_favor_of_promotion_contract(self) -> None:
        portal_package = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "package.json"
        ).read_text(encoding="utf-8")
        portal_app = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "src"
            / "App.tsx"
        ).read_text(encoding="utf-8")
        pnpm_lock = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "pnpm-lock.yaml"
        ).read_text(encoding="utf-8")
        wallet_service = (CONSOLE_WALLET / "walletService.ts").read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        standalone_redeem_package = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-redeem"
        )
        standalone_source_files = [
            path
            for path in standalone_redeem_package.glob("src/**/*")
            if path.is_file()
        ]
        standalone_source = "\n".join(
            path.read_text(encoding="utf-8") for path in standalone_source_files
        )

        self.assertIn("appPromotionUserCouponsList", wallet_service)
        self.assertIn("getClawRouterAppSdkClient().system.promotions.userCoupons.wallet.list(params)", wallet_service)
        self.assertIn("appPromotionCodeRedemptionsCreate", wallet_service)
        self.assertIn("getClawRouterAppSdkClient().system.promotions.codes.redemptions.create", wallet_service)
        self.assertNotIn("getClawRouterAppSdkClient().coupon.", wallet_service)
        self.assertNotIn("getClawRouterAppSdkClient().coupons.", wallet_service)
        self.assertIn("route: /console/wallet", contract)
        self.assertIn("operation: redeemCode", contract)
        self.assertIn("operation: fetchRedeemHistory", contract)

        for forbidden in [
            "sdkwork-clawrouter-pc-console-redeem",
            "console/redeem",
            "RedeemView",
        ]:
            self.assertNotIn(forbidden, portal_package)
            self.assertNotIn(forbidden, portal_app)
            self.assertNotIn(forbidden, pnpm_lock)

        for forbidden_fake_runtime in [
            "Mock API call",
            "setTimeout(",
            "GIFT-2026-TEST",
            "setSuccessMessage",
            "setErrorMessage",
        ]:
            self.assertNotIn(forbidden_fake_runtime, standalone_source)

    def test_admin_finance_money_uses_exact_decimal_strings(self) -> None:
        sqlite_store = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_finance_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_finance_store.rs"
        ).read_text(encoding="utf-8")
        finance_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-finance"
            / "src"
            / "financeService.ts"
        ).read_text(encoding="utf-8")
        finance_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-finance"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        for field in ["amount", "balance", "totalCost"]:
            self.assertIn(f"{field}: string", finance_service)
            self.assertNotIn(f"{field}: number", finance_service)
            self.assertNotIn(f"readNumber(item, '{field}')", finance_service)

        for store in [sqlite_store, postgres_store]:
            compact_store = " ".join(store.split())
            self.assertIn("DecimalValue", store)
            self.assertIn(
                'amount: decimal_string_cell(&row, "amount", 2, "admin finance transaction amount")?,',
                store,
            )
            self.assertIn(
                'balance: decimal_string_cell(&row, "balance", 2, "admin finance transaction balance")?,',
                store,
            )
            self.assertIn(
                'total_cost: decimal_string_cell(&row, "total_cost", 2, "admin finance billing total cost")?,',
                store,
            )
            self.assertIn("CommercePaymentStatus", store)
            self.assertIn("RefundStatus", store)
            self.assertIn('let status_source = string_cell(&row, "status_source");', store)
            self.assertIn(
                'let status_value = transaction_status_cell(&row, &status_source)?;',
                store,
            )
            self.assertIn(
                'status: transaction_status_label(&status_source, status_value.as_deref())?.to_owned(),',
                compact_store,
            )
            for forbidden_transaction_status_projection in [
                "COALESCE(h.status, p.status, r.status, o.status, 0) AS status_code",
                "COALESCE(r.status, p.status, o.status, 2) AS status_code",
                'integer_cell(&row, "status_code")',
                "SELECT id, occurred_at, user_id, normalized_type, amount, balance, description, status_source, status_code, normalized_status",
                "'success' AS normalized_status",
                "CAST(NULL AS TEXT) AS payment_status",
                "CAST(NULL AS TEXT) AS refund_status",
                "CAST(NULL AS TEXT) AS order_status",
            ]:
                self.assertNotIn(forbidden_transaction_status_projection, store)
            for required_transaction_status_projection in [
                "l.source_type AS source_type",
                "l.source_id AS source_id",
                "pa.status AS payment_status",
                "r.status AS refund_status",
                "o.status AS order_status",
                "status_source, transaction_status, payment_status, refund_status, order_status",
                "fn transaction_status_cell(",
                "missing admin finance transaction status",
            ]:
                self.assertIn(required_transaction_status_projection, store)
            self.assertIn(
                'status: billing_status_label(',
                store,
            )
            self.assertNotIn("COALESCE(s.payment_status, 0) AS payment_status_code", store)
            self.assertNotIn("COALESCE(s.statement_status, 0) AS statement_status_code", store)
            self.assertNotIn("COALESCE(pi.status, 0) AS invoice_status_code", store)
            self.assertIn("s.payment_status AS payment_status_code", store)
            self.assertIn("s.statement_status AS statement_status_code", store)
            self.assertIn("pi.id AS invoice_id", store)
            self.assertIn("pi.status AS invoice_status_code", store)
            self.assertIn(
                'required_billing_status_cell(&row, "payment_status_code", "payment")?',
                compact_store,
            )
            self.assertIn(
                'required_billing_status_cell(&row, "statement_status_code", "statement")?',
                compact_store,
            )
            self.assertIn(
                'related_billing_status_cell(&row, "invoice_id", "invoice_status_code", "invoice")?',
                compact_store,
            )
            self.assertIn('required_billing_status_cell(&row, "payment_status_code", "payment")?', compact_store)
            self.assertIn('required_billing_status_cell(&row, "statement_status_code", "statement")?', compact_store)
            self.assertIn('related_billing_status_cell(&row, "invoice_id", "invoice_status_code", "invoice")?', compact_store)
            self.assertIn("missing admin finance billing status {source}", store)
            self.assertIn("fn transaction_status_label(", store)
            self.assertIn("source: &str,", store)
            self.assertIn("status: Option<&str>,", store)
            self.assertIn(") -> Result<&'static str, DomainError>", store)
            self.assertIn("fn billing_status_label(", store)
            self.assertIn("fn payment_status_label(", store)
            self.assertIn("fn refund_status_label(", store)
            self.assertIn("fn order_status_label(", store)
            self.assertIn("fn invoice_status_label(", store)
            self.assertIn("unsupported admin finance transaction status", store)
            self.assertIn("unsupported admin finance billing status", store)
            self.assertIn(
                "fn decimal_value_string(",
                store,
            )
            self.assertIn("value: &str,", store)
            self.assertIn("digits: u32,", store)
            self.assertIn("field_name: &str,", store)
            self.assertIn(") -> Result<String, DomainError>", store)
            self.assertIn('format!("invalid {field_name}: {value}")', store)
            self.assertNotIn("DecimalValue::ZERO.to_fixed_string(digits)", store)
            self.assertNotIn("ELSE 'success'", store)
            self.assertNotIn("ELSE 'unpaid'", store)
            self.assertNotIn("row_to_transaction(row: sqlx::sqlite::SqliteRow) -> AdminTransactionRecordItem", store)
            self.assertNotIn("row_to_transaction(row: sqlx::postgres::PgRow) -> AdminTransactionRecordItem", store)

        self.assertIn("readMoneyString", finance_service)
        self.assertIn("formatCurrency = (amount: string)", finance_view)
        self.assertIn("isPositiveMoney(t.amount)", finance_view)
        self.assertIn("moneyCents(", finance_view)
        self.assertNotIn("formatCurrency = (amount: number)", finance_view)
        self.assertNotIn("t.amount > 0", finance_view)

    def test_console_promotion_uses_precise_app_sdk_response_contracts(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        openapi = (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(
            encoding="utf-8"
        )
        system_api = (ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "system.ts").read_text(
            encoding="utf-8"
        )
        wallet_service = (CONSOLE_WALLET / "walletService.ts").read_text(encoding="utf-8")

        for schema_name in [
            "PromotionUserCouponWalletListResponse",
            "PromotionCodeRedemptionRequest",
            "PromotionOperationResponse",
        ]:
            self.assertIn(f"name: {schema_name}", contract)
            self.assertIn(f'"{schema_name}"', openapi)

        self.assertIn('"PromotionsUserCouponsWalletListResult"', openapi)
        self.assertIn('"PromotionsCodesRedemptionsCreateResult"', openapi)
        self.assertIn('"$ref": "#/components/schemas/PromotionUserCouponWalletListResponse"', openapi)
        self.assertIn('"$ref": "#/components/schemas/PromotionCodeRedemptionRequest"', openapi)
        self.assertIn('"$ref": "#/components/schemas/PromotionOperationResponse"', openapi)

        self.assertIn(
            "async list(params?: SystemPromotionsUserCouponsWalletListParams): Promise<PromotionsUserCouponsWalletListResult>",
            system_api,
        )
        self.assertIn("get<PromotionsUserCouponsWalletListResult>", system_api)
        self.assertIn("async create(body: PromotionCodeRedemptionRequest, params: SystemPromotionsCodesRedemptionsCreateParams): Promise<PromotionsCodesRedemptionsCreateResult>", system_api)
        self.assertIn("post<PromotionsCodesRedemptionsCreateResult>", system_api)
        self.assertNotIn("fetchRedeemHistory(params?: QueryParams): Promise<PlusApiResult>", system_api)
        self.assertNotIn("redeemCode(body?: OperationRequest): Promise<PlusApiResult>", system_api)
        self.assertNotIn("fetchRechargeHistory(params?: QueryParams): Promise<PlusApiResult>", system_api)

        result_checks = {
            "promotions-user-coupons-wallet-list-result.ts": "data?: PromotionUserCouponWalletListResponse;",
            "promotions-codes-redemptions-create-result.ts": "data?: PromotionOperationResponse;",
            "promotion-code-redemption-request.ts": "code: string;",
        }
        for file_name, expected in result_checks.items():
            result_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / file_name
            self.assertTrue(result_path.exists(), file_name)
            self.assertIn(expected, result_path.read_text(encoding="utf-8"))

        self.assertIn("appPromotionUserCouponsList", wallet_service)
        self.assertIn("getClawRouterAppSdkClient().system.promotions.userCoupons.wallet.list(params)", wallet_service)
        self.assertIn("appPromotionCodeRedemptionsCreate", wallet_service)
        self.assertIn("getClawRouterAppSdkClient().system.promotions.codes.redemptions.create", wallet_service)


if __name__ == "__main__":
    unittest.main()
