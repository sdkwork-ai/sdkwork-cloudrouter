import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ConsoleRoutingBackendRuntimeStandardTest(unittest.TestCase):
    def test_console_routing_operations_are_backed_by_real_app_api_router(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        app_routing_path = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_routing.rs"
        )

        self.assertTrue(app_routing_path.exists())
        app_routing = app_routing_path.read_text(encoding="utf-8")

        self.assertIn("mod app_routing;", product_api_mod)
        self.assertIn("app_routing_router", product_api_mod)
        self.assertIn("app_routing_router_with_read_store", product_api_mod)

        for api_path in [
            "/app/v3/api/ai/routing/channels",
            "/app/v3/api/ai/routing/api_keys",
            "/app/v3/api/ai/routing/request_traces",
            "/app/v3/api/ai/routing/usage",
        ]:
            self.assertIn(api_path, app_routing)

        self.assertIn("TrustedRequestSubject", app_routing)
        self.assertIn("require_subject", app_routing)
        self.assertIn("AppRoutingReadStore", app_routing)
        self.assertIn("EmptyAppRoutingReadStore", app_routing)
        self.assertIn('problem_from_wire_code("4010"', app_routing)
        self.assertNotIn("PlusApiResult", app_routing)
        self.assertIn("app routing read model is unavailable", app_routing)

        self.assertIn("AppRoutingReadStore", app_api)
        self.assertIn("AppRoutingStore", app_api)
        self.assertIn("SqliteAppRoutingReadStore", app_api)
        self.assertIn("PostgresAppRoutingReadStore", app_api)
        self.assertIn("app_routing_router()", app_api)
        self.assertIn("app_routing_router_with_read_store", app_api)
        self.assertIn("app_request_subject_boundary", app_api)

    def test_console_routing_port_exposes_typed_frontend_models_without_mock_data(self) -> None:
        ports_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
        ).read_text(encoding="utf-8")
        port_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "app_routing_read_store.rs"
        )

        self.assertTrue(port_path.exists())
        port = port_path.read_text(encoding="utf-8")

        self.assertIn("mod app_routing_read_store;", ports_mod)
        for export_name in [
            "AppRoutingReadFuture",
            "AppRoutingReadStore",
            "AppRoutingSubject",
            "AppRoutingChannelItem",
            "AppRoutingApiKeyItem",
            "AppRoutingRequestTraceItem",
            "AppRoutingUsageSnapshot",
            "AppRoutingUsageData",
            "AppRoutingModelStats",
        ]:
            self.assertIn(export_name, ports_mod)
            self.assertIn(export_name, port)

        for field_name in [
            "provider_code",
            "access_type",
            "base_url",
            "api_key",
            "is_multimodal",
            "total_usage",
            "created_at",
            "chart_data",
            "model_stats",
        ]:
            self.assertIn(field_name, port)

        self.assertIn("#[serde(rename_all = \"camelCase\")]", port)
        self.assertNotIn("mock", port.lower())

    def test_console_routing_sql_read_stores_use_real_tables_and_subject_scope(self) -> None:
        for relative, store_name in [
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_routing_read_store.rs",
                "SqliteAppRoutingReadStore",
            ),
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_routing_read_store.rs",
                "PostgresAppRoutingReadStore",
            ),
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")

            self.assertIn(store_name, store)
            for table in [
                "ai_channel",
                "ai_channel_resource",
                "ai_channel_credential",
                "ai_resource",
                "ai_resource_group",
                "iam_gateway_api_key",
                "ai_request_trace",
                "ai_routing_decision_log",
                "ai_usage",
            ]:
                self.assertIn(table, store)

            for scope_column in ["tenant_id", "organization_id", "user_id"]:
                self.assertIn(scope_column, store)

            for method_name in [
                "load_routing_channels",
                "load_routing_api_keys",
                "load_routing_request_traces",
                "load_routing_usage",
            ]:
                self.assertIn(method_name, store)

            self.assertIn("LIMIT", store)
            self.assertIn("status_label", store)
            self.assertIn("enabled", store)
            self.assertIn("disabled", store)
            self.assertNotIn("SELECT *", store)

    def test_console_routing_strategy_write_store_uses_versioned_profiles_and_safe_rule_codes(self) -> None:
        for relative, store_name in [
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_routing_strategy_store.rs",
                "SqliteAppRoutingStrategyStore",
            ),
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_routing_strategy_store.rs",
                "PostgresAppRoutingStrategyStore",
            ),
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")

            self.assertIn(store_name, store)
            self.assertIn("next_profile_version", store)
            self.assertIn("LOAD_NEXT_PROFILE_VERSION", store)
            self.assertIn("LOAD_PROFILE_ID_BY_UUID", store)
            self.assertIn("format!(\"model-map-{sequence:04}-{normalized}\")", store)
            self.assertNotIn("const ROUTING_PROFILE_VERSION", store)
            self.assertNotIn("ON CONFLICT(policy_id, profile_version) DO UPDATE", store)
            self.assertNotIn("SOFT_DELETE_PROFILE_RULES", store)
            self.assertNotIn("deleted_at = ?1", store)
            self.assertNotIn("deleted_at = $1", store)

    def test_console_routing_strategy_read_model_rejects_missing_or_unknown_strategy_codes(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_routing_strategy_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_routing_strategy_store.rs",
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(p.fallback_mode, 1) AS strategy_code", store)
                self.assertIn("p.fallback_mode AS strategy_code", store)
                self.assertNotIn(
                    'AppRoutingStrategyType::from_code(integer_cell(&policy, "strategy_code"))',
                    compact_store,
                )
                self.assertIn(
                    'routing_strategy_type(required_integer_cell(&policy, "strategy_code")?)?',
                    compact_store,
                )
                self.assertIn(
                    "fn routing_strategy_type(value: i64) -> DomainResult<AppRoutingStrategyType>",
                    store,
                )
                self.assertIn("fn required_integer_cell", store)
                self.assertIn("missing routing strategy {column} from database row", store)
                self.assertIn("invalid routing strategy code from database row", store)

        port = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "app_routing_strategy_store.rs"
        ).read_text(encoding="utf-8")
        self.assertNotIn("pub fn from_code(code: i64) -> Self", port)
        self.assertNotIn("_ => Self::Latency", port)

    def test_console_routing_strategy_mapping_rules_fail_closed_for_malformed_rows(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_routing_strategy_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_routing_strategy_store.rs",
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")
            compact_store = " ".join(store.split())

            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(match_expression, '{}') AS match_expression_json", store)
                self.assertNotIn("CAST(COALESCE(match_expression, '{}'::jsonb) AS TEXT) AS match_expression_json", store)
                self.assertNotIn("COALESCE(NULLIF(target_model, ''), '') AS target_model", store)
                self.assertIn("match_expression", store)
                self.assertIn("target_model AS target_model", store)
                self.assertIn(
                    "rows .into_iter() .map(row_to_mapping_rule) .collect::<DomainResult<Vec<_>>>()?",
                    compact_store,
                )
                self.assertIn("fn row_to_mapping_rule", store)
                self.assertIn("-> DomainResult<AppRoutingMappingRule>", store)
                self.assertIn(
                    'source_model_from_match_expression(&required_string_cell(&row, "match_expression")?)',
                    compact_store,
                )
                self.assertIn("target_model: required_non_empty_string_cell(&row, \"target_model\")?", compact_store)
                self.assertIn("invalid routing strategy match_expression json from database row", store)
                self.assertIn("missing routing strategy match_expression from database row", store)
                self.assertIn("missing routing strategy target_model from database row", store)
                self.assertIn("missing routing strategy sourceModel from database row", store)
                self.assertNotIn(".unwrap_or_default()", store)
                self.assertNotIn("source_model_from_rule_code", store)

    def test_console_routing_channel_commands_are_real_app_api_and_store_backed(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        ports_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )
        router_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "api"
            / "app_routing_channel_command.rs"
        )
        port_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "app_routing_channel_command_store.rs"
        )

        self.assertTrue(router_path.exists())
        self.assertTrue(port_path.exists())
        router = router_path.read_text(encoding="utf-8")
        port = port_path.read_text(encoding="utf-8")

        self.assertIn("mod app_routing_channel_command;", product_api_mod)
        self.assertIn("app_routing_channel_command_router", product_api_mod)
        self.assertIn("app_routing_channel_command_router_with_store", product_api_mod)
        self.assertIn("mod app_routing_channel_command_store;", ports_mod)
        for export_name in [
            "AppRoutingChannelCommandStore",
            "CreateAppRoutingChannelCommand",
            "UpdateAppRoutingChannelCommand",
            "SetAppRoutingChannelStatusCommand",
            "DeleteAppRoutingChannelCommand",
            "TestAppRoutingChannelCommand",
            "AppRoutingChannelMutationOutcome",
            "AppRoutingChannelTestOutcome",
        ]:
            self.assertIn(export_name, ports_mod)
            self.assertIn(export_name, port)

        for api_path in [
            "/app/v3/api/ai/routing/channels",
            "/app/v3/api/ai/routing/channels/{channel_id}",
            "/app/v3/api/ai/routing/channels/{channel_id}/status",
            "/app/v3/api/ai/routing/channels/{channel_id}/verify",
        ]:
            self.assertIn(api_path, router)

        self.assertIn("TrustedRequestSubject", router)
        self.assertIn("reject_plaintext_auth_key", router)
        self.assertIn("validate_secret_ref", router)
        self.assertIn("routing channel command store is unavailable", router)
        self.assertIn("routing_channel_system_response", router)
        self.assertIn("tracing::error!", router)
        self.assertNotIn("format!(\"routing channel command store is unavailable: {error}\")", router)

        self.assertIn("AppRoutingChannelCommandStore", app_api)
        self.assertIn("AppRoutingChannelCommandRuntimeStore", app_api)
        self.assertIn("SqliteAppRoutingChannelCommandStore", app_api)
        self.assertIn("PostgresAppRoutingChannelCommandStore", app_api)
        self.assertIn("app_routing_channel_command_router_with_store", app_api)

    def test_console_routing_channel_sql_command_stores_use_real_tables_scope_and_safe_secret_refs(self) -> None:
        for relative, store_name in [
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_routing_channel_command_store.rs",
                "SqliteAppRoutingChannelCommandStore",
            ),
            (
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_routing_channel_command_store.rs",
                "PostgresAppRoutingChannelCommandStore",
            ),
        ]:
            store_path = ROOT / relative
            self.assertTrue(store_path.exists())
            store = store_path.read_text(encoding="utf-8")

            self.assertIn(store_name, store)
            for table in [
                "integration_provider",
                "ai_channel_credential",
                "ai_channel",
                "ai_channel_resource",
                "ai_resource",
                "ops_config_snapshot",
                "ops_audit_log",
            ]:
                self.assertIn(table, store)
            self.assertNotIn("ai_channel_model", store)

            for method_name in [
                "create_channel",
                "update_channel",
                "set_channel_status",
                "delete_channel",
                "test_channel",
                "insert_or_load_provider",
                "replace_channel_credential",
                "replace_channel_resource_bindings",
                "soft_delete_channel",
            ]:
                self.assertIn(method_name, store)

            for scope_column in ["tenant_id", "organization_id", "user_id"]:
                self.assertIn(scope_column, store)

            self.assertIn("secret_hash", store)
            self.assertIn("masked_label", store)
            self.assertIn("mask_secret_ref", store)
            self.assertIn("digest_hex", store)
            self.assertIn("DomainError::conflict", store)
            self.assertIn("store_error", store)
            self.assertNotIn("SELECT *", store)
            self.assertNotIn("secret_ref: item.secret_ref", store)

    def test_console_routing_contract_response_schemas_are_precise(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")

        for operation_marker, schema_name in [
            ("api_path: /app/v3/api/ai/routing/channels", "name: RoutingChannelsResponse"),
            ("api_path: /app/v3/api/ai/routing/api_keys", "name: RoutingApiKeysResponse"),
            (
                "api_path: /app/v3/api/ai/routing/request_traces",
                "name: RoutingRequestTracesResponse",
            ),
            ("api_path: /app/v3/api/ai/routing/usage", "name: RoutingUsageSnapshot"),
        ]:
            operation_index = contract.index(operation_marker)
            schema_index = contract.index(schema_name, operation_index)
            self.assertLess(schema_index - operation_index, 1200)

        self.assertIn("items:", contract)
        self.assertIn("chartData:", contract)
        self.assertIn("modelStats:", contract)


if __name__ == "__main__":
    unittest.main()
