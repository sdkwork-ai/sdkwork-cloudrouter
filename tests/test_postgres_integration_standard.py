import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PostgresIntegrationStandardTest(unittest.TestCase):
    def test_product_postgres_transaction_integration_tests_are_env_gated_and_isolated(self) -> None:
        test_path = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "postgres_transaction_integration.rs"
        )
        self.assertTrue(test_path.exists())
        source = test_path.read_text(encoding="utf-8")

        self.assertIn("SDKWORK_DATABASE_URL", source)
        self.assertIn("CREATE SCHEMA", source)
        self.assertIn("SET search_path", source)
        self.assertIn("DROP SCHEMA IF EXISTS", source)
        self.assertIn("max_connections(4)", source)
        self.assertIn(
            "postgres_payment_callback_concurrent_first_account_creation_credits_one_account",
            source,
        )
        self.assertNotIn(
            "postgres_billing_redeem_concurrent_first_account_creation_credits_one_account",
            source,
        )
        self.assertIn("PostgresPaymentCallbackStore", source)
        self.assertIn("tokio::join!", source)
        self.assertIn("UNIQUE (tenant_id, organization_id, owner_user_id, asset_type, currency_code)", source)
        self.assertNotIn("uk_plus_account_user_type", source)


if __name__ == "__main__":
    unittest.main()
