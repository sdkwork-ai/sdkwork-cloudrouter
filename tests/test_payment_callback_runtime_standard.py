import unittest
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


class PaymentCallbackRuntimeStandardTest(unittest.TestCase):
    def test_payment_callback_contract_is_backed_by_real_app_routes(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )

        self.assertTrue(
            (
                ROOT
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "api"
                / "app_payment_callback.rs"
            ).exists()
        )
        self.assertIn("app_payment_callback_router", product_api_mod)
        self.assertIn("app_payment_callback_router_with_store", product_api_mod)
        self.assertIn("app_payment_callback_router()", app_api)
        self.assertIn("app_payment_callback_router_with_store", app_api)
        self.assertIn("PaymentCallbackStore", app_api)
        self.assertIn("SqlitePaymentCallbackStore", app_api)
        self.assertIn("PostgresPaymentCallbackStore", app_api)
        self.assertIn("payment callback router must not use app_request_subject_boundary", app_api)

    def test_payment_callback_port_and_api_define_idempotent_runtime_contract(self) -> None:
        ports_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
        ).read_text(encoding="utf-8")
        callback_port = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        app_callback = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_payment_callback.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("PaymentCallbackStore", ports_mod)
        self.assertIn("PaymentCallbackFuture", ports_mod)
        self.assertIn("PaymentCallbackCommand", callback_port)
        self.assertIn("PaymentCallbackOutcome", callback_port)
        self.assertIn("process_payment_callback", callback_port)

        self.assertIn('"/app/v3/api/payments/callback/{provider}"', app_callback)
        self.assertIn('"/app/v3/api/payments/callback/wechat"', app_callback)
        self.assertIn('"/app/v3/api/payments/callback/alipay"', app_callback)
        self.assertIn("EmptyPaymentCallbackStore", app_callback)
        self.assertIn("validate_payment_callback", app_callback)
        self.assertIn("parse_payment_provider", app_callback)
        self.assertIn("parse_payment_callback_payload", app_callback)
        self.assertIn("outTradeNo", app_callback)
        self.assertIn("out_trade_no", app_callback)
        self.assertIn("transactionId", app_callback)
        self.assertIn("transaction_id", app_callback)
        self.assertIn("tradeNo", app_callback)
        self.assertIn("x-sdkwork-event-id", app_callback)
        self.assertIn("x-event-id", app_callback)
        self.assertIn("x-sdkwork-nonce", app_callback)
        self.assertIn("x-request-id", app_callback)
        self.assertIn("x-sdkwork-timestamp", app_callback)
        self.assertIn("x-timestamp", app_callback)
        self.assertIn("x-sdkwork-signature", app_callback)
        self.assertIn("Wechatpay-Signature", app_callback)
        self.assertIn("DEFAULT_CALLBACK_BODY_MAX_BYTES", app_callback)
        self.assertIn("RequestLimitsConfig::DEFAULT_PAYMENT_CALLBACK_BODY_MAX_BYTES", app_callback)
        self.assertIn("PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET", app_callback)
        self.assertIn('problem_from_wire_code("4001"', app_callback)
        self.assertIn('problem_from_wire_code("4090"', app_callback)
        self.assertIn('problem_from_wire_code("5000"', app_callback)
        self.assertNotIn("PlusApiResult", app_callback)

    def test_payment_callback_security_defaults_require_configured_signature(self) -> None:
        app_callback = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_payment_callback.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("validate_payment_callback_signature", app_callback)
        self.assertIn("PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET", app_callback)
        self.assertIn("payment callback signature is required", app_callback)
        self.assertIn("payment callback signature secret is required", app_callback)
        self.assertIn("payment callback timestamp is required when signature is enabled", app_callback)
        self.assertIn("payment callback timestamp is outside allowed skew", app_callback)
        self.assertIn("expected.eq_ignore_ascii_case(&provided)", app_callback)
        self.assertNotIn("(None, None) => Ok(())", app_callback)
        self.assertNotIn("PAYMENT_WEBHOOK_ALLOW_UNSIGNED", app_callback)
        self.assertNotIn("SDKWORK_PAYMENT_WEBHOOK_SECRET", app_callback)

    def test_payment_callback_security_config_is_centralized_and_claw_prefixed(self) -> None:
        config_lib = (ROOT / "crates" / "sdkwork-claw-config" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        payment_webhook_config_path = (
            ROOT / "crates" / "sdkwork-claw-config" / "src" / "payment_webhook.rs"
        )
        app_callback = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_payment_callback.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )

        self.assertTrue(payment_webhook_config_path.exists())
        payment_webhook_config = payment_webhook_config_path.read_text(encoding="utf-8")

        self.assertIn("pub mod payment_webhook;", config_lib)
        self.assertIn("pub use payment_webhook::PaymentWebhookConfig;", config_lib)
        self.assertIn("pub struct PaymentWebhookConfig", payment_webhook_config)
        self.assertIn(
            'ENV_PAYMENT_WEBHOOK_SECRET: &\'static str = "SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET"',
            payment_webhook_config,
        )
        self.assertIn("MIN_SIGNING_SECRET_LEN: usize = 32", payment_webhook_config)
        self.assertIn("DEFAULT_MAX_CLOCK_SKEW_SECONDS: u64 = 600", payment_webhook_config)
        self.assertIn("MAX_CLOCK_SKEW_SECONDS: u64 = 3_600", payment_webhook_config)
        self.assertIn("from_env()", payment_webhook_config)
        self.assertIn('field("signing_secret", &"[REDACTED]")', payment_webhook_config)

        self.assertIn("PaymentWebhookConfig", app_callback)
        self.assertIn("payment_webhook_config", app_callback)
        self.assertIn("PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET", app_callback)
        self.assertNotIn("use std::env", app_callback)
        self.assertNotIn("env::var", app_callback)

        self.assertIn("PaymentWebhookConfig", app_api)
        self.assertIn("PaymentWebhookConfig::from_env()", app_api)
        self.assertIn("require_payment_webhook_config", app_api)
        self.assertIn("payment_webhook_config,", app_api)

    def test_payment_callback_runtime_docs_define_signed_webhook_standard(self) -> None:
        runtime_doc = (ROOT / "docs" / "27-rust-runtime-and-sdk-integration-standard.md").read_text(
            encoding="utf-8"
        )
        module_doc = (ROOT / "docs" / "29-rust-backend-module-standard.md").read_text(
            encoding="utf-8"
        )

        for doc in [runtime_doc, module_doc]:
            self.assertIn("PaymentWebhookConfig", doc)
            self.assertIn("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET", doc)
            self.assertIn("SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS", doc)
            self.assertIn("unsigned payment callbacks are forbidden", doc)
            self.assertIn("must not use app_request_subject_boundary", doc)
            self.assertIn("Payment callback amounts must be parsed as exact decimal values", doc)
            self.assertIn("binary floating-point comparison is forbidden", doc)
            self.assertIn("sub-cent callback precision must be rejected", doc)

    def test_payment_callback_has_executable_route_and_config_tests(self) -> None:
        route_test_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "app_payment_callback_route.rs"
        )
        config_test_path = (
            ROOT / "crates" / "sdkwork-claw-config" / "tests" / "payment_webhook_config.rs"
        )

        self.assertTrue(route_test_path.exists())
        self.assertTrue(config_test_path.exists())

        route_test = route_test_path.read_text(encoding="utf-8")
        config_test = config_test_path.read_text(encoding="utf-8")

        self.assertIn("app_payment_callback_route_accepts_signed_json_and_passes_canonical_command_to_store", route_test)
        self.assertIn("app_payment_callback_route_rejects_missing_signature_before_store", route_test)
        self.assertIn("app_payment_callback_route_rejects_sub_cent_amount_before_store", route_test)
        self.assertIn("wechat_payment_callback_route_accepts_signed_xml_and_returns_provider_ack", route_test)
        self.assertIn("PaymentWebhookConfig::from_signing_secret", route_test)
        self.assertIn("app_payment_callback_router_with_store", route_test)
        self.assertIn("x-sdkwork-signature", route_test)
        self.assertIn("x-sdkwork-timestamp", route_test)
        self.assertIn("x-sdkwork-event-id", route_test)
        self.assertIn("x-sdkwork-nonce", route_test)
        self.assertIn("HmacSha256", route_test)
        self.assertIn("captured.lock().unwrap()", route_test)

        self.assertIn("payment_webhook_config_accepts_valid_secret_and_defaults", config_test)
        self.assertIn("payment_webhook_config_rejects_missing_blank_short_and_invalid_skew", config_test)
        self.assertIn("payment_webhook_config_debug_redacts_secret", config_test)
        self.assertIn("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET", config_test)
        self.assertIn("[REDACTED]", config_test)

    def test_payment_callback_has_sqlite_fulfillment_integration_test(self) -> None:
        integration_test_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "sqlite_payment_callback_store.rs"
        )

        self.assertTrue(integration_test_path.exists())
        source = integration_test_path.read_text(encoding="utf-8")

        self.assertIn("SqlitePaymentCallbackStore", source)
        self.assertIn("sqlite_payment_callback_fulfills_appbase_recharge_once_and_records_webhook_success", source)
        self.assertIn("sqlite_payment_callback_duplicate_event_does_not_credit_twice", source)
        self.assertIn("sqlite_payment_callback_rejects_nonce_replay", source)
        self.assertIn("sqlite_payment_callback_rejects_amount_mismatch_and_marks_webhook_failed", source)
        self.assertIn("CREATE TABLE commerce_payment_webhook_event", source)
        self.assertIn("CREATE TABLE commerce_payment_intent", source)
        self.assertIn("CREATE TABLE commerce_payment_attempt", source)
        self.assertIn("CREATE TABLE commerce_order", source)
        self.assertIn("CREATE TABLE commerce_account", source)
        self.assertIn("CREATE TABLE commerce_account_ledger_entry", source)
        self.assertIn("available_amount", source)
        self.assertIn("commerce_account_ledger_entry", source)
        self.assertNotIn("CREATE TABLE plus_payment_webhook_event", source)
        self.assertNotIn("CREATE TABLE plus_payment", source)
        self.assertNotIn("CREATE TABLE plus_order", source)
        self.assertNotIn("CREATE TABLE plus_vip_recharge", source)
        self.assertNotIn("CREATE TABLE plus_account_history", source)
        self.assertNotIn("CREATE TABLE plus_vip_point_change", source)
        self.assertNotIn("point_change_uuid", source)

    def test_sql_payment_callback_stores_are_atomic_idempotent_and_fulfill_recharge_once(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("commerce_payment_webhook_event", store)
            self.assertIn("commerce_payment_intent", store)
            self.assertIn("commerce_payment_attempt", store)
            self.assertIn("commerce_order", store)
            self.assertIn("commerce_account", store)
            self.assertIn("commerce_account_ledger_entry", store)
            self.assertNotIn("plus_payment_webhook_event", store)
            self.assertNotIn("plus_payment", store)
            self.assertNotIn("plus_order", store)
            self.assertNotIn("plus_vip_recharge", store)
            self.assertNotIn("plus_account_history", store)
            self.assertNotIn("plus_vip_point_change", store)
            self.assertIn("BEGIN", store.upper())
            self.assertIn("COMMIT", store.upper())
            self.assertIn("begin_webhook_event", store)
            self.assertIn("finish_webhook_event", store)
            self.assertIn("duplicate", store)
            self.assertIn("nonce replay", store)
            self.assertIn("provider", store)
            self.assertIn("out_trade_no", store)
            self.assertIn("amount", store)
            self.assertIn("transaction_id", store)
            self.assertIn("fulfill_recharge_once", store)
            self.assertIn("existing_account_history_count", store)
            self.assertIn("ensure_points_account", store)
            self.assertIn("update_account_points", store)
            self.assertIn("insert_account_history", store)
            self.assertNotIn("existing_point_change_count", store)
            self.assertNotIn("insert_point_change", store)
            self.assertIn("CommercePaymentStatus::Succeeded.as_str()", store)
            self.assertIn("CommercePaymentStatus::Failed.as_str()", store)
            self.assertIn("CommercePaymentStatus::Canceled.as_str()", store)
            self.assertIn("ORDER_STATUS_PAID", store)
            self.assertIn("ORDER_STATUS_CANCELLED", store)
            self.assertIn("asset_type", store)
            self.assertIn("CommerceAccountAssetType::Points.as_str()", store)
            self.assertIn("CommerceLedgerDirection::Credit.as_str()", store)
            self.assertIn("business_type = 'recharge'", store)
            self.assertIn("'commerce_payment_attempt'", store)
            self.assertIn("SUCCESS", store)
            self.assertIn("FAILED", store)
            self.assertIn('status: required_string_cell(&row, "status", "payment")?', store)
            self.assertIn("missing payment callback payment status from database row", store)
            self.assertNotIn("COALESCE(p.status, 0) AS status", store)
            self.assertNotIn("COALESCE(status, 0) AS status", store)
            self.assertNotIn('status: integer_cell(&row, "status")', store)
            self.assertNotIn('status: required_integer_cell(&row, "status", "payment")?', store)

        sqlite_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        self.assertIn("pa.status AS status", sqlite_store)
        self.assertIn("pa.status AS status", postgres_store)

    def test_sqlite_and_postgres_payment_callback_stores_preserve_same_fulfillment_semantics(self) -> None:
        sqlite_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs"
        ).read_text(encoding="utf-8")

        def function_names(source: str) -> set[str]:
            return set(re.findall(r"(?:async\s+)?fn\s+([A-Za-z0-9_]+)\(", source))

        self.assertEqual(function_names(sqlite_store), function_names(postgres_store))

        required_semantics = [
            "payment callback nonce replay detected",
            "payment callback amount does not match payment amount",
            "payment callback points payload is required for recharge",
            "duplicate webhook event ignored",
            "payment callback fulfilled recharge successfully",
            "commerce_payment_webhook_event",
            "commerce_payment_intent",
            "commerce_payment_attempt",
            "commerce_order",
            "commerce_account",
            "commerce_account_ledger_entry",
            "CommercePaymentStatus::Succeeded.as_str()",
            "CommercePaymentStatus::Failed.as_str()",
            "CommercePaymentStatus::Canceled.as_str()",
            "ORDER_STATUS_PAID",
            "ORDER_STATUS_CANCELLED",
            "asset_type",
            "CommerceAccountAssetType::Points.as_str()",
            "CommerceLedgerDirection::Credit.as_str()",
            "'commerce_payment_attempt'",
            "existing_account_history_count",
            "finish_webhook_event",
            '"SUCCESS"',
            '"FAILED"',
            "'RECEIVED'",
            'required_string_cell(&row, "status", "payment")?',
            "missing payment callback payment status from database row",
        ]
        for semantic in required_semantics:
            self.assertIn(semantic, sqlite_store)
            self.assertIn(semantic, postgres_store)

        for forbidden in [
            "COALESCE(p.status, 0) AS status",
            "COALESCE(status, 0) AS status",
            'status: integer_cell(&row, "status")',
            "plus_payment_webhook_event",
            "plus_vip_recharge",
            "plus_account_history",
            "plus_vip_point_change",
        ]:
            self.assertNotIn(forbidden, sqlite_store)
            self.assertNotIn(forbidden, postgres_store)

        self.assertIn("FOR UPDATE", postgres_store)
        self.assertIn("FOR UPDATE OF pa, o, pi", postgres_store)

    def test_payment_callback_amount_uses_exact_decimal_contract_not_binary_float(self) -> None:
        callback_port = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/ports/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        app_callback = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/api/app_payment_callback.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        route_test = (
            ROOT / "services/sdkwork-clawrouter-router-service/tests/app_payment_callback_route.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("pub amount: Option<String>", callback_port)
        self.assertNotIn("pub amount: Option<f64>", callback_port)

        self.assertIn("parse_callback_money_amount", app_callback)
        self.assertIn("parse_total_fee_cents", app_callback)
        self.assertIn("DecimalValue::parse", app_callback)
        self.assertNotIn("fn json_number", app_callback)
        self.assertNotIn("fn round_money", app_callback)

        for store in [sqlite_store, postgres_store]:
            self.assertIn("DecimalValue", store)
            self.assertIn("amount: String", store)
            self.assertIn("money_matches(&payment.amount, amount)", store)
            self.assertIn("DecimalValue::parse(expected)", store)
            self.assertIn("DecimalValue::parse(actual)", store)
            self.assertNotIn("amount: f64", store)
            self.assertNotIn("fn money_matches(expected: f64, actual: f64)", store)

        self.assertIn('assert_eq!(Some("88.50".to_owned()), captured[0].amount)', route_test)
        self.assertIn('assert_eq!(Some("12.34".to_owned()), captured[0].amount)', route_test)

    def test_payment_callback_semantics_match_java_trade_webhook_and_vip_entities(self) -> None:
        entity_root = ROOT.parent.parent / "legacy-java-plus-entity" / "src/main/java"
        service_root = ROOT.parent.parent / "legacy-java-plus-service" / "src/main/java"
        app_api_root = ROOT.parent.parent / "legacy-java-plus-app-api" / "src/main/java"

        webhook_entity = (
            entity_root
            / "com/sdkwork/spring/ai/plus/entity/trade/PlusPaymentWebhookEvent.java"
        ).read_text(encoding="utf-8")
        webhook_status = (
            entity_root
            / "com/sdkwork/spring/ai/plus/enums/trade/WebhookProcessStatus.java"
        ).read_text(encoding="utf-8")
        payment_status = (
            entity_root / "com/sdkwork/spring/ai/plus/enums/trade/PaymentStatus.java"
        ).read_text(encoding="utf-8")
        order_status = (
            entity_root / "com/sdkwork/spring/ai/plus/enums/trade/OrderStatus.java"
        ).read_text(encoding="utf-8")
        recharge_entity = (
            entity_root / "com/sdkwork/spring/ai/plus/entity/vip/PlusVipRecharge.java"
        ).read_text(encoding="utf-8")
        java_payment_service = (
            service_root
            / "com/sdkwork/spring/ai/plus/service/trade/impl/PlusPaymentServiceImpl.java"
        ).read_text(encoding="utf-8")
        java_payment_controller = (
            app_api_root
            / "com/sdkwork/ai/gateway/api/app/v3/trade/PaymentAppApiController.java"
        ).read_text(encoding="utf-8")

        self.assertIn("uk_payment_webhook_provider_event", webhook_entity)
        self.assertIn("uk_payment_webhook_provider_nonce", webhook_entity)
        self.assertIn("payloadDigest", webhook_entity)
        self.assertIn("RECEIVED", webhook_status)
        self.assertIn("SUCCESS", webhook_status)
        self.assertIn("FAILED", webhook_status)
        self.assertIn('SUCCESS(2, "trade.status.payment.success"', payment_status)
        self.assertIn('FAILED(3, "trade.status.payment.failed"', payment_status)
        self.assertIn('CLOSED(5, "trade.status.payment.closed"', payment_status)
        self.assertIn('PAID(2, "trade.status.order.paid"', order_status)
        self.assertIn("Recharge status (1-Success 2-Failed 3-Processing)", recharge_entity)
        self.assertIn("x-sdkwork-event-id", java_payment_service)
        self.assertIn("x-sdkwork-nonce", java_payment_service)
        self.assertIn("x-sdkwork-timestamp", java_payment_service)
        self.assertIn("x-sdkwork-signature", java_payment_service)
        self.assertIn("markPaymentSuccess", java_payment_service)
        self.assertIn("markOrderPaidIfNecessary", java_payment_service)
        self.assertIn('@RequestMapping("/app/v3/api/payments")', java_payment_controller)
        self.assertIn('@PostMapping("/callback/wechat")', java_payment_controller)
        self.assertIn('@PostMapping("/callback/alipay")', java_payment_controller)
        self.assertIn('@PostMapping("/callback/{provider}")', java_payment_controller)


if __name__ == "__main__":
    unittest.main()
