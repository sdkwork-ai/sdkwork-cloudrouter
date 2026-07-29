import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PaymentCallbackRuntimeStandardTest(unittest.TestCase):
    def test_payment_callback_contract_is_backed_by_real_app_routes(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        ).read_text(encoding="utf-8")

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
        self.assertIn("PostgresPaymentCallbackStore", app_api)
        self.assertNotIn("SqlitePaymentCallbackStore", app_api)
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
        self.assertIn("resolve_payment_supplier_code", app_callback)
        self.assertIn("default_payment_provider_registry", app_callback)
        self.assertIn("parse_payment_callback_payload", app_callback)
        self.assertIn("outTradeNo", app_callback)
        self.assertIn("out_trade_no", app_callback)
        self.assertIn("transactionId", app_callback)
        self.assertIn("transaction_id", app_callback)
        self.assertIn("tradeNo", app_callback)
        self.assertIn("x-sdkwork-event-id", app_callback)
        self.assertIn("x-event-id", app_callback)
        self.assertIn("x-sdkwork-nonce", app_callback)
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
        app_api = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        ).read_text(encoding="utf-8")

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
        runtime_doc = (
            ROOT
            / "docs"
            / "architecture"
            / "tech"
            / "TECH-27-rust-runtime-and-sdk-integration-standard.md"
        ).read_text(encoding="utf-8")
        module_doc = (
            ROOT
            / "docs"
            / "architecture"
            / "tech"
            / "TECH-29-rust-backend-module-standard.md"
        ).read_text(encoding="utf-8")

        for source_doc in [runtime_doc, module_doc]:
            doc = " ".join(source_doc.split())
            self.assertIn("PaymentWebhookConfig", doc)
            self.assertIn("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET", doc)
            self.assertIn("SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS", doc)
            self.assertIn("unsigned payment callbacks are forbidden", doc)
            self.assertIn("must not use", doc)
            self.assertIn("app_request_subject_boundary", doc)
            self.assertIn("Payment callback amounts", doc)
            self.assertIn("parsed as exact decimal values", doc)
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

    def test_payment_callback_has_postgres_sql_contract_tests(self) -> None:
        contract_test_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "postgres_payment_callback_sql_contract.rs"
        )

        self.assertTrue(contract_test_path.exists())
        source = contract_test_path.read_text(encoding="utf-8")
        self.assertIn("POSTGRES_PAYMENT_CALLBACK_STORE", source)
        self.assertIn("payment_callback_webhook_event_queries_lock_and_scope_idempotency", source)
        self.assertIn("payment_callback_success_updates_appbase_payment_order_and_ledger_tables", source)
        self.assertIn("FOR UPDATE OF pa, o, pi", source)
        self.assertIn("commerce_payment_webhook_event", source)
        self.assertIn("commerce_account_ledger_entry", source)
        self.assertNotIn("SqlitePaymentCallbackStore", source)

    def test_sql_payment_callback_stores_are_atomic_idempotent_and_fulfill_recharge_once(self) -> None:
        store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        for expected in [
            "commerce_payment_webhook_event",
            "commerce_payment_intent",
            "commerce_payment_attempt",
            "commerce_order",
            "commerce_account",
            "commerce_account_ledger_entry",
            "begin_webhook_event",
            "finish_webhook_event",
            "duplicate",
            "nonce replay",
            "provider",
            "out_trade_no",
            "amount",
            "transaction_id",
            "fulfill_recharge_once",
            "existing_account_history_count",
            "ensure_points_account",
            "update_account_points",
            "insert_account_history",
            "CommercePaymentStatus::Succeeded.as_str()",
            "CommercePaymentStatus::Failed.as_str()",
            "CommercePaymentStatus::Canceled.as_str()",
            "ORDER_STATUS_PAID",
            "ORDER_STATUS_CANCELLED",
            "asset_type",
            "CommerceAccountAssetType::Points.as_str()",
            "CommerceLedgerDirection::Credit.as_str()",
            "business_type = 'recharge'",
            "'commerce_payment_attempt'",
            "SUCCESS",
            "FAILED",
            'status: required_string_cell(&row, "status", "payment")?',
            "missing payment callback payment status from database row",
            "pa.status AS status",
            ".begin()",
            "tx.commit()",
            "FOR UPDATE",
        ]:
            self.assertIn(expected, store)
        for forbidden in [
            "plus_payment_webhook_event",
            "plus_payment",
            "plus_order",
            "plus_vip_recharge",
            "plus_account_history",
            "plus_vip_point_change",
            "existing_point_change_count",
            "insert_point_change",
            "COALESCE(p.status, 0) AS status",
            "COALESCE(status, 0) AS status",
            'status: integer_cell(&row, "status")',
            'status: required_integer_cell(&row, "status", "payment")?',
        ]:
            self.assertNotIn(forbidden, store)

    def test_payment_callback_amount_uses_exact_decimal_contract_not_binary_float(self) -> None:
        callback_port = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/ports/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        app_callback = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/api/app_payment_callback.rs"
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

        self.assertIn("DecimalValue", postgres_store)
        self.assertIn("amount: String", postgres_store)
        self.assertIn("money_matches(&payment.amount, amount)", postgres_store)
        self.assertIn("DecimalValue::parse(expected)", postgres_store)
        self.assertIn("DecimalValue::parse(actual)", postgres_store)
        self.assertNotIn("amount: f64", postgres_store)
        self.assertNotIn("fn money_matches(expected: f64, actual: f64)", postgres_store)

        self.assertIn('assert_eq!(Some("88.50".to_owned()), captured[0].amount)', route_test)
        self.assertIn('assert_eq!(Some("12.34".to_owned()), captured[0].amount)', route_test)

    def test_payment_callback_semantics_are_owned_by_current_rust_contract(self) -> None:
        callback_port = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/ports/payment_callback_store.rs"
        ).read_text(encoding="utf-8")
        app_callback = (
            ROOT / "services/sdkwork-clawrouter-router-service/src/api/app_payment_callback.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs"
        ).read_text(encoding="utf-8")

        for status in ["Success", "Failed", "Closed"]:
            self.assertIn(status, callback_port)
        for identity in ["event_id", "nonce", "payload_digest", "out_trade_no"]:
            self.assertIn(identity, callback_port)
            self.assertIn(identity, postgres_store)
        for provider_route in ["wechat", "alipay", "{provider}"]:
            self.assertIn(f'payments/callback/{provider_route}', app_callback)
        self.assertIn("default_payment_provider_registry", app_callback)
        self.assertIn("fulfill_recharge_once", postgres_store)
        self.assertIn("FOR UPDATE", postgres_store)
        self.assertNotIn("legacy-java-plus", callback_port + app_callback + postgres_store)


if __name__ == "__main__":
    unittest.main()
