import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQLITE_SOURCE_ROOT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite"

TEXT_TIMESTAMP_COLUMNS = (
    "effective_from",
    "effective_to",
    "expire_at",
    "published_at",
)

FORBIDDEN_CURRENT_TIMESTAMP_COMPARISON = re.compile(
    rf"\b(?:[a-zA-Z_][a-zA-Z0-9_]*\.)?(?:{'|'.join(TEXT_TIMESTAMP_COLUMNS)})\b\s*(?:<=|>=|<|>)\s*CURRENT_TIMESTAMP",
    re.IGNORECASE,
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class SqliteDatetimeStandardTest(unittest.TestCase):
    def test_sqlite_text_timestamps_use_datetime_normalization_before_current_timestamp_comparison(self) -> None:
        offenders: list[str] = []
        for path in sorted(SQLITE_SOURCE_ROOT.rglob("*.rs")):
            text = read_text(path)
            for match in FORBIDDEN_CURRENT_TIMESTAMP_COMPARISON.finditer(text):
                line_no = text.count("\n", 0, match.start()) + 1
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {match.group(0)}")

        self.assertEqual(
            [],
            offenders,
            "SQLite stores many timestamp values as TEXT and model catalog data uses RFC3339. "
            "Compare text timestamp columns through datetime(column) before CURRENT_TIMESTAMP.",
        )


if __name__ == "__main__":
    unittest.main()
