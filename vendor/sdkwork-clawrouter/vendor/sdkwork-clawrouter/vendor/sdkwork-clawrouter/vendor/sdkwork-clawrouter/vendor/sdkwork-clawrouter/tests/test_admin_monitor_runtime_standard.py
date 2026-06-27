import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminMonitorRuntimeStandardTest(unittest.TestCase):
    def test_admin_monitor_read_model_rejects_missing_required_health_and_alert_fields(self) -> None:
        store_paths = [
            "crates/sdkwork-clawrouter-admin-monitor-repository-sqlx/src/sqlite.rs",
            "crates/sdkwork-clawrouter-admin-monitor-repository-sqlx/src/postgres.rs",
        ]

        forbidden_fragments = [
            "COALESCE(i.health_status, i.status)",
            "COALESCE(i.health_status, i.status, 0)",
            "COALESCE(h.cpu_percent, '0')",
            "COALESCE(h.memory_percent, '0')",
            "COALESCE(h.cpu_percent, 0)",
            "COALESCE(h.memory_percent, 0)",
            "COALESCE(h.uptime_seconds, 0)",
            "COALESCE(severity, 1)",
            "COALESCE(alert_status, 1)",
            "COALESCE(last_seen_at, first_seen_at, created_at, '')",
            "status.unwrap_or(0)",
            "severity.unwrap_or(1)",
            "unwrap_or(0.0)",
            "optional_integer_cell(&row, \"health_status\")",
            "optional_integer_cell(&row, \"severity\")",
            "optional_integer_cell(&row, \"alert_status\")",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                for fragment in forbidden_fragments:
                    self.assertNotIn(fragment, store)
                self.assertIn("fn required_integer_cell", store)
                self.assertIn("fn required_decimal_cell", store)
                self.assertIn("missing monitor {column} from database row", store)
                self.assertIn("invalid monitor {column} from database row", store)
                self.assertIn("i.health_status AS health_status", store)
                self.assertIn('node_status_label(required_integer_cell(&row, "health_status")?)?', compact_store)
                self.assertIn('severity_label(required_integer_cell(&row, "severity")?)?', compact_store)
                self.assertIn('required_integer_cell(&row, "alert_status")?', compact_store)
                self.assertIn('cpu: required_decimal_cell(&row, "cpu")?', compact_store)
                self.assertIn('memory: required_decimal_cell(&row, "memory")?', compact_store)
                self.assertIn('network: required_decimal_cell(&row, "network")?', compact_store)


if __name__ == "__main__":
    unittest.main()
