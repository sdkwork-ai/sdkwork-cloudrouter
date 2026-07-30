import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RustCompileRegressionStandardTest(unittest.TestCase):
    def test_app_api_key_create_normalizes_borrowed_fields_before_owned_modalities(self) -> None:
        source = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_api_keys.rs"
        ).read_text(encoding="utf-8")
        create_body = source.split("async fn create_key_inner", 1)[1].split(
            "let idempotency_key", 1
        )[0]

        self.assertLess(
            create_body.index("let quota_limit = normalize_quota_limit(&request)?;"),
            create_body.index("let requested_modalities = normalize_modalities(request.modalities)?;"),
        )

    def test_usage_logs_timestamp_parsing_uses_concrete_validation_error_helper(self) -> None:
        source = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_usage_logs.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("fn invalid_usage_logs_timestamp_error", source)
        self.assertNotIn("invalid_usage_logs_timestamp(field_name).unwrap_err()", source)

    def test_invoice_routes_reuse_the_process_database_identity_without_iam_env_rewrites(self) -> None:
        app_crate = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api"
        app_source = (app_crate / "src" / "invoice_runtime.rs").read_text(encoding="utf-8")
        self.assertIn("bootstrap_invoice_database_from_env()", app_source)
        self.assertNotIn("apply_unified_claw_postgres_env", app_source)
        self.assertNotIn("sdkwork_iam_database_host", app_source)

        for crate in [
            "sdkwork-routes-clawrouter-app-api",
            "sdkwork-routes-clawrouter-backend-api",
        ]:
            cargo = (ROOT / "crates" / crate / "Cargo.toml").read_text(encoding="utf-8")
            with self.subTest(crate=crate):
                self.assertNotIn("sdkwork-iam-database-host", cargo)
                self.assertNotIn("sdkwork-iam-embedded-application-bootstrap", cargo)

        runtime = (
            ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs"
        ).read_text(encoding="utf-8")
        context_body = runtime.split("async fn all_in_one_runtime_context_from_env", 1)[1].split(
            "let api_key_security_config", 1
        )[0]
        self.assertIn(
            "materialize_federated_database_env_from_config(&database_config)",
            context_body,
        )
        self.assertIn("server_runtime_rejects_sqlite_before_database_initialization", runtime)
        self.assertIn('DatabaseConfig::from_url("sqlite::memory:")', runtime)
        self.assertNotIn("bootstrap_iam_database_from_env", runtime)
        self.assertNotIn("apply_unified_claw_postgres_env", runtime)


if __name__ == "__main__":
    unittest.main()
