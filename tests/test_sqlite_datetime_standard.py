import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQLITE_SOURCE_ROOT = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "infrastructure"
    / "sql"
    / "sqlite"
)
SQLITE_MIGRATION_ROOT = ROOT / "database" / "migrations" / "sqlite"
SQLITE_BASELINE_ROOT = ROOT / "database" / "ddl" / "baseline" / "sqlite"


class SqliteDatetimeStandardTest(unittest.TestCase):
    def test_authoritative_server_has_no_undeclared_sqlite_persistence_assets(self) -> None:
        sqlite_rust_sources = sorted(SQLITE_SOURCE_ROOT.rglob("*.rs"))
        sqlite_migrations = sorted(SQLITE_MIGRATION_ROOT.rglob("*.sql"))
        sqlite_baselines = sorted(SQLITE_BASELINE_ROOT.rglob("*.sql"))

        self.assertEqual([], sqlite_rust_sources)
        self.assertEqual([], sqlite_migrations)
        self.assertEqual([], sqlite_baselines)


if __name__ == "__main__":
    unittest.main()
