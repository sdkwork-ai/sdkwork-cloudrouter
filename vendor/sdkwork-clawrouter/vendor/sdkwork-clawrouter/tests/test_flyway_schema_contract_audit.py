import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.flyway_schema_contract_audit import FlywaySchemaContractAudit


class FlywaySchemaContractAuditTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def write_flyway(self, root: Path, content: str) -> Path:
        flyway = root / "spring-ai-plus-server-application" / "src" / "main" / "resources" / "database" / "postgresql" / "V1__test.sql"
        flyway.parent.mkdir(parents=True, exist_ok=True)
        flyway.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return flyway

    def test_requires_flyway_indexes_in_registry_with_method(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_product
                    domain: legacy
                    indexes:
                      - { name: uk_plus_product_code, unique: true, columns: [code] }
                      - { name: gin_plus_product_tags, columns: [tags] }
                      - { name: gin_plus_product_resources, method: btree, columns: [resources] }
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uk_plus_product_code ON plus_product (code);
                CREATE INDEX IF NOT EXISTS gin_plus_product_tags ON plus_product USING GIN (tags);
                CREATE INDEX IF NOT EXISTS gin_plus_product_resources
                    ON plus_product USING GIN (resources);
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_product registry must mirror Flyway index gin_plus_product_tags using gin on tags",
                result.messages,
            )
            self.assertIn(
                "plus_product registry must mirror Flyway index gin_plus_product_resources using gin on resources",
                result.messages,
            )

    def test_requires_flyway_foreign_keys_in_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_sku
                    domain: legacy
                    indexes:
                      - { name: idx_plus_sku_product, columns: [product_id] }
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                DO $$
                BEGIN
                    ALTER TABLE plus_sku
                        ADD CONSTRAINT fk_plus_sku_product
                        FOREIGN KEY (product_id) REFERENCES plus_product (id);
                END $$;
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_sku registry must mirror Flyway foreign key "
                "fk_plus_sku_product on product_id references plus_product(id)",
                result.messages,
            )

    def test_requires_create_table_not_null_columns_in_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment
                    domain: legacy
                    not_null_columns: [order_id]
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_payment (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    v BIGINT NOT NULL DEFAULT 0,
                    tenant_id BIGINT NOT NULL DEFAULT 0,
                    organization_id BIGINT NOT NULL DEFAULT 0,
                    data_scope INTEGER NOT NULL DEFAULT 0,
                    order_id BIGINT NOT NULL,
                    provider INTEGER NOT NULL,
                    amount NUMERIC(18,2) NOT NULL
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn("plus_payment registry must mirror Flyway NOT NULL column provider", result.messages)
            self.assertIn("plus_payment registry must mirror Flyway NOT NULL column amount", result.messages)
            self.assertNotIn("plus_payment registry must mirror Flyway NOT NULL column uuid", result.messages)

    def test_requires_create_table_inline_unique_constraints_in_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment_webhook_event
                    domain: legacy
                    not_null_columns: [provider, event_id, nonce, status]
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_payment_webhook_event (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    provider INTEGER NOT NULL,
                    event_id VARCHAR(128) NOT NULL,
                    nonce VARCHAR(128) NOT NULL,
                    status VARCHAR(32) NOT NULL
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_payment_webhook_event registry must mirror Flyway unique constraint on uuid",
                result.messages,
            )

    def test_requires_create_table_inline_foreign_keys_in_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_sku
                    domain: legacy
                    not_null_columns: [product_id]
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_sku (
                    id BIGINT PRIMARY KEY,
                    product_id BIGINT NOT NULL REFERENCES plus_product (id)
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_sku registry must mirror Flyway foreign key on product_id references plus_product(id)",
                result.messages,
            )

    def test_requires_declared_column_types_to_match_create_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_product
                    domain: legacy
                    not_null_columns: [code]
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                    column_types:
                      code: varchar(32)
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_product (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    code VARCHAR(64) NOT NULL
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_product registry column code type must mirror Flyway type varchar(64)",
                result.messages,
            )

    def test_requires_create_table_columns_to_have_registry_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment_webhook_event
                    domain: legacy
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                    not_null_columns: [provider, event_id, nonce, status]
                    physical_columns:
                      inherited: PlusBaseEntity columns
                      own: [provider, event_id, status]
                      ignored: [payload_digest]
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_payment_webhook_event (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    provider INTEGER NOT NULL,
                    event_id VARCHAR(128) NOT NULL,
                    nonce VARCHAR(128) NOT NULL,
                    payload_digest VARCHAR(128),
                    status VARCHAR(32) NOT NULL
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "plus_payment_webhook_event registry must declare Flyway physical column nonce ownership",
                result.messages,
            )
            self.assertNotIn(
                "plus_payment_webhook_event registry must declare Flyway physical column id ownership",
                result.messages,
            )

    def test_accepts_create_table_columns_with_registry_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_product
                    domain: legacy
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                    not_null_columns: [title, price, status]
                    physical_columns:
                      inherited: PlusBaseEntity columns
                      own: [title, price, status]
                      projection_only_ignored: [search_vector]
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE TABLE IF NOT EXISTS plus_product (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    price NUMERIC(18,2) NOT NULL,
                    status INTEGER NOT NULL,
                    search_vector TSVECTOR
                );
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_matching_flyway_indexes_and_foreign_keys(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_product
                    domain: legacy
                    not_null_columns: [code]
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                    column_types:
                      code: varchar(64)
                    physical_columns:
                      own: [code]
                    indexes:
                      - { name: uk_plus_product_code, unique: true, columns: [code] }
                      - { name: gin_plus_product_tags, method: gin, columns: [tags] }
                  - table: plus_sku
                    domain: legacy
                    foreign_keys:
                      - { name: fk_plus_sku_product, columns: [product_id], references_table: plus_product, references_columns: [id] }
                    indexes:
                      - { name: idx_plus_sku_product, columns: [product_id] }
                """,
            )
            flyway = self.write_flyway(
                root,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uk_plus_product_code ON plus_product (code);
                CREATE INDEX IF NOT EXISTS gin_plus_product_tags ON plus_product USING GIN (tags);
                CREATE TABLE IF NOT EXISTS plus_product (
                    id BIGINT PRIMARY KEY,
                    uuid VARCHAR(255) NOT NULL UNIQUE,
                    code VARCHAR(64) NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_plus_sku_product ON plus_sku (product_id);
                ALTER TABLE plus_sku
                    ADD CONSTRAINT fk_plus_sku_product
                    FOREIGN KEY (product_id) REFERENCES plus_product (id);
                """,
            )

            result = FlywaySchemaContractAudit(root=root, registry_path=registry, flyway_paths=[flyway]).run()

            self.assertTrue(result.ok, result.messages)

    def test_skips_when_default_flyway_files_are_absent(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, "tables: []")

            result = FlywaySchemaContractAudit(root=root, registry_path=registry).run()

            self.assertTrue(result.ok, result.messages)


if __name__ == "__main__":
    unittest.main()
