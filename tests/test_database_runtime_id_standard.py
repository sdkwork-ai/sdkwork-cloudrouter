import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQL_SOURCE_ROOT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
GENERATED_POSTGRES_SCHEMA = ROOT / "generated" / "schema" / "postgres" / "schema.sql"
SCHEMA_COMPILER_DOC = (
    ROOT / "docs" / "architecture" / "tech" / "TECH-21-schema-compiler-postgres-ddl.md"
)
KUBERNETES_RUNTIME_DEPLOYMENTS = (
    ROOT / "deployments" / "kubernetes" / "claw-router-gateway.yaml",
    ROOT / "deployments" / "kubernetes" / "claw-router-app-api.yaml",
    ROOT / "deployments" / "kubernetes" / "claw-router-admin-api.yaml",
    ROOT / "deployments" / "kubernetes" / "claw-router-edge.yaml",
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

    def test_cluster_deployments_use_database_leased_node_identity(self) -> None:
        for path in KUBERNETES_RUNTIME_DEPLOYMENTS:
            text = path.read_text(encoding="utf-8")
            with self.subTest(deployment=path.name):
                self.assertIn("name: SDKWORK_NODE_HOSTNAME", text)
                self.assertIn("fieldPath: metadata.name", text)
                self.assertIn("name: SDKWORK_NODE_INSTANCE_ID", text)
                self.assertIn("fieldPath: metadata.uid", text)
                self.assertNotIn("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", text)

    def test_runtime_uses_the_canonical_database_fenced_allocator(self) -> None:
        runtime_id_source = (SQL_SOURCE_ROOT / "runtime_id.rs").read_text(encoding="utf-8")
        service_manifest = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "Cargo.toml"
        ).read_text(encoding="utf-8")

        self.assertIn("SnowflakeNodeAllocator::allocate_process_generator", runtime_id_source)
        self.assertIn("NodeLease", runtime_id_source)
        self.assertIn("sdkwork-database-id.workspace = true", service_manifest)
        self.assertNotIn("sdkwork-id-core.workspace = true", service_manifest)

    def test_runtime_id_health_and_failures_are_exported_with_bounded_labels(self) -> None:
        runtime_id_source = (SQL_SOURCE_ROOT / "runtime_id.rs").read_text(encoding="utf-8")

        self.assertIn("clawrouter_runtime_id_generator_ready", runtime_id_source)
        self.assertIn("clawrouter_runtime_id_failures_total", runtime_id_source)
        self.assertIn('&["operation", "reason"]', runtime_id_source)
        for reason in (
            "configuration",
            "database",
            "node_exhaustion",
            "contention",
            "lease",
            "clock",
            "sequence_exhaustion",
            "state",
        ):
            self.assertIn(f'"{reason}"', runtime_id_source)


if __name__ == "__main__":
    unittest.main()
