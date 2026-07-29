import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminFirewallRuntimeStandardTest(unittest.TestCase):
    def test_admin_firewall_read_model_rejects_missing_required_rule_codes(self) -> None:
        store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_firewall_rule_store.rs"
        ).read_text(encoding="utf-8")
        compact_store = " ".join(store.split())

        self.assertNotIn("COALESCE(rule_type, 0) AS rule_type", store)
        self.assertNotIn("COALESCE(target_type, 0) AS target_type", store)
        self.assertNotIn("COALESCE(action, 0) AS action", store)
        self.assertNotIn("optional_integer_cell(&row, \"rule_type\").unwrap_or_default()", store)
        self.assertNotIn("optional_integer_cell(&row, \"target_type\").unwrap_or_default()", store)
        self.assertNotIn("optional_integer_cell(&row, \"action\").unwrap_or_default()", store)
        self.assertIn('required_integer_cell(&row, "rule_type")? as i32', compact_store)
        self.assertIn('required_integer_cell(&row, "target_type")? as i32', compact_store)
        self.assertIn('required_integer_cell(&row, "action")? as i32', compact_store)
        self.assertIn("missing firewall rule {column} from database row", store)

    def test_admin_firewall_read_model_fails_closed_for_unknown_rule_codes(self) -> None:
        store = (
            ROOT
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_firewall_rule_store.rs"
        ).read_text(encoding="utf-8")
        compact_store = " ".join(store.split())

        self.assertIn(
            "firewall_type: firewall_type_label(rule_type, target_type, action)?,",
            compact_store,
        )
        self.assertIn(
            "fn firewall_type_label(rule_type: i32, target_type: i32, action: i32) -> DomainResult<String>",
            store,
        )
        self.assertNotIn("let target = if target_type == TARGET_TYPE_IP", store)
        self.assertNotIn("let list = if action == ACTION_ALLOW || rule_type == 22", store)
        self.assertIn("invalid firewall rule type from database row", store)
        self.assertIn("invalid firewall target type from database row", store)
        self.assertIn("invalid firewall action from database row", store)
        self.assertIn("inconsistent firewall rule type/action from database row", store)


if __name__ == "__main__":
    unittest.main()
