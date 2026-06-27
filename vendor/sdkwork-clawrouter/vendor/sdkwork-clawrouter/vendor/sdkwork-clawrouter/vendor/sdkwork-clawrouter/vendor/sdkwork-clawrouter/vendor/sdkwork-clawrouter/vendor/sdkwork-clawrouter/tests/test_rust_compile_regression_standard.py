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

    def test_admin_channel_create_request_preserves_multimodal_flag_for_command(self) -> None:
        source = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "admin_channel.rs"
        ).read_text(encoding="utf-8")
        struct_body = source.split("struct NormalizedCreateRequest", 1)[1].split("}", 1)[0]
        normalize_body = source.split("fn normalize_create_request", 1)[1].split(
            "fn normalize_update_request", 1
        )[0]

        self.assertIn("is_multimodal: bool", struct_body)
        self.assertIn("let is_multimodal = capabilities.iter().any", normalize_body)
        self.assertIn("is_multimodal,", normalize_body)

    def test_admin_model_capability_sql_does_not_shadow_capability_code_function(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_model_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_model_store.rs",
        ]:
            source = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(path=relative):
                capability_body = source.split("async fn insert_model_capability", 1)[1].split(
                    "async fn insert_model_pricing", 1
                )[0]
                self.assertIn("let capability_code_text = model_capability_code", capability_body)
                self.assertIn(".bind(capability_code(&command.model_type))", capability_body)
                self.assertIn(".bind(capability_code_text)", capability_body)
                self.assertNotIn("let capability_code = model_capability_code", capability_body)

    def test_usage_logs_timestamp_parsing_uses_concrete_validation_error_helper(self) -> None:
        source = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_usage_logs.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("fn invalid_usage_logs_timestamp_error", source)
        self.assertNotIn("invalid_usage_logs_timestamp(field_name).unwrap_err()", source)


if __name__ == "__main__":
    unittest.main()
