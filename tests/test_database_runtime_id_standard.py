import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQL_SOURCE_ROOT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
GENERATED_POSTGRES_SCHEMA = ROOT / "generated" / "schema" / "postgres" / "schema.sql"
SCHEMA_COMPILER_DOC = (
    ROOT / "docs" / "architecture" / "tech" / "TECH-21-schema-compiler-postgres-ddl.md"
)


FORBIDDEN_RUNTIME_ID_PATTERNS = {
    "BIGSERIAL": re.compile(r"\bBIGSERIAL\b", re.IGNORECASE),
    "AUTOINCREMENT": re.compile(r"\bAUTOINCREMENT\b", re.IGNORECASE),
    "last_insert_rowid": re.compile(r"\blast_insert_rowid\b", re.IGNORECASE),
    "nextval": re.compile(r"\bnextval\s*\(", re.IGNORECASE),
    "identity": re.compile(
        r"\bGENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\b|\bAS\s+IDENTITY\b",
        re.IGNORECASE,
    ),
    "max_id_plus_one": re.compile(r"\bMAX\s*\(\s*id\s*\)\s*\+\s*1\b", re.IGNORECASE),
}


def _runtime_sql_files() -> list[Path]:
    return sorted(SQL_SOURCE_ROOT.rglob("*.rs"))


def _scan(path: Path, patterns: dict[str, re.Pattern[str]]) -> list[str]:
    text = path.read_text(encoding="utf-8")
    findings: list[str] = []
    for name, pattern in patterns.items():
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            line_start = text.rfind("\n", 0, match.start()) + 1
            if text[line_start:match.start()].lstrip().startswith("//"):
                continue
            findings.append(f"{path.relative_to(ROOT)}:{line}: {name}")
    return findings


class DatabaseRuntimeIdStandardTest(unittest.TestCase):
    def test_runtime_sql_sources_do_not_allocate_ids_in_database(self) -> None:
        findings: list[str] = []
        for path in _runtime_sql_files():
            findings.extend(_scan(path, FORBIDDEN_RUNTIME_ID_PATTERNS))

        self.assertFalse(
            findings,
            "runtime database writes must bind Snowflake ids before executing SQL; "
            "database-side id allocation is forbidden:\n" + "\n".join(findings),
        )

    def test_generated_postgres_schema_uses_explicit_bigint_ids(self) -> None:
        findings = _scan(
            GENERATED_POSTGRES_SCHEMA,
            FORBIDDEN_RUNTIME_ID_PATTERNS,
        )

        self.assertFalse(
            findings,
            "generated PostgreSQL schema must not allocate runtime ids in the database:\n"
            + "\n".join(findings),
        )

    def test_schema_compiler_doc_documents_snowflake_id_contract(self) -> None:
        text = SCHEMA_COMPILER_DOC.read_text(encoding="utf-8")

        self.assertIn("id BIGINT NOT NULL PRIMARY KEY", text)
        self.assertNotIn("BIGSERIAL", text)
        self.assertNotIn("AUTOINCREMENT", text.upper())


if __name__ == "__main__":
    unittest.main()
