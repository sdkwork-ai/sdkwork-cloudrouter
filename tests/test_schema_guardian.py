import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.schema_guardian import APPBASE_COMMERCE_LEGACY_ALIASES, SchemaGuardian


class SchemaGuardianTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def test_rejects_forbidden_synonym_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: [commerce_order_shadow]
                tables:
                  - table: commerce_order_shadow
                    domain: commerce
                    compliance_level: L3
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("forbidden synonym table present: commerce_order_shadow", result.messages)

    def test_rejects_mojibake_in_registry_text(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mojibake = "\u95c2\u4f5d"
            registry = self.write_registry(
                root,
                f"""
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                domain_names:
                  price_side:
                    canonical_name: PriceSide
                    zh_name: {mojibake}
                tables: []
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                f"schema registry contains mojibake text near line 7: zh_name: {mojibake}",
                result.messages,
            )

    def test_rejects_legacy_identity_tables_and_user_foreign_keys(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: plus_user
                    domain: legacy
                  - table: ai_agent_skill
                    domain: legacy
                    foreign_keys:
                      - { name: fk_ai_agent_skill_user, columns: [user_id], references_table: plus_user, references_columns: [id] }
                  - table: ops_referral_stat_snapshot
                    domain: ops
                    profile: projection
                    source_tables: [plus_user, ai_agent_skill]
                    projection_policy:
                      does_not_replace: [plus_user, ai_agent_skill]
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("legacy identity table must be removed: plus_user", result.messages)
            self.assertIn(
                "ai_agent_skill foreign key fk_ai_agent_skill_user must reference iam_user instead of plus_user",
                result.messages,
            )
            self.assertIn(
                "ops_referral_stat_snapshot source_tables must use iam_user instead of plus_user",
                result.messages,
            )
            self.assertIn(
                "ops_referral_stat_snapshot projection_policy.does_not_replace must use iam_user instead of plus_user",
                result.messages,
            )

    def test_rejects_appbase_commerce_legacy_aliases(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: plus_user_coupon
                    domain: legacy
                  - table: plus_order
                    domain: legacy
                  - table: plus_payment
                    domain: legacy
                  - table: plus_vip_user
                    domain: legacy
                  - table: ops_coupon_issue_batch
                    domain: ops
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "appbase commerce legacy alias must be removed: plus_user_coupon -> commerce_coupon",
                result.messages,
            )
            self.assertIn(
                "appbase commerce legacy alias must be removed: plus_order -> commerce_order",
                result.messages,
            )
            self.assertIn(
                "appbase commerce legacy alias must be removed: plus_payment -> commerce_payment_attempt",
                result.messages,
            )
            self.assertIn(
                "appbase commerce legacy alias must be removed: plus_vip_user -> commerce_vip_membership",
                result.messages,
            )
            self.assertIn(
                "appbase commerce legacy alias must be removed: ops_coupon_issue_batch -> commerce_coupon_issue_batch",
                result.messages,
            )

    def test_contract_sources_do_not_reference_appbase_commerce_legacy_aliases(self) -> None:
        root = Path(__file__).resolve().parents[1]
        result = SchemaGuardian(root=root).run()
        stale_references = [
            message
            for message in result.messages
            if "references appbase commerce legacy alias" in message
        ]

        self.assertEqual([], stale_references)

    def test_rejects_appbase_commerce_legacy_alias_references_in_contract_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_account
                    domain: commerce
                """,
            )
            frontend_contract = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            frontend_contract.write_text(
                "frontend_models:\n"
                "  - route: /console/commerce\n"
                "    data_sources: [plus_order]\n",
                encoding="utf-8",
            )
            tools_dir = root / "tools"
            tools_dir.mkdir(parents=True)
            (tools_dir / "api_contract_manifest.py").write_text(
                "TABLE_TAG_RULES = (('plus_payment', 'billing'),)\n",
                encoding="utf-8",
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts.yaml references appbase commerce legacy alias: plus_order -> commerce_order",
                result.messages,
            )
            self.assertIn(
                "tools\\api_contract_manifest.py references appbase commerce legacy alias: plus_payment -> commerce_payment_attempt",
                result.messages,
            )

    def test_rejects_appbase_commerce_legacy_alias_references_in_modular_contract_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_account
                    domain: commerce
                """,
            )
            fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "commerce.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                "frontend_models:\n"
                "  - route: /console/commerce\n"
                "    data_sources: [plus_order]\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - operations/commerce.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml references appbase commerce legacy alias: plus_order -> commerce_order",
                result.messages,
            )

    def test_rejects_v41_platform_legacy_alias_references_in_modular_contract_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: appstore_app
                    domain: platform
                """,
            )
            operations_dir = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations"
            operations_dir.mkdir(parents=True)
            fragment = operations_dir / "app-platform.yaml"
            fragment.write_text(
                "frontend_operations:\n"
                "  - route: /admin/app\n"
                "    read_sources: [plus_app]\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - operations/app-platform.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\app-platform.yaml references v4.1 retired platform alias: plus_app -> appstore_app",
                result.messages,
            )

    def test_rejects_v41_studio_app_template_alias_in_modular_contract_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: appstore_app_template
                    domain: platform
                """,
            )
            models_dir = root / "docs" / "schema-registry" / "frontend-field-contracts" / "models"
            models_dir.mkdir(parents=True)
            fragment = models_dir / "app-center.yaml"
            fragment.write_text(
                "frontend_models:\n"
                "  - route: /admin/app\n"
                "    data_sources: [studio_app_template]\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - models/app-center.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\models\\app-center.yaml references v4.1 retired platform alias: studio_app_template -> appstore_app_template",
                result.messages,
            )

    def test_rejects_bare_media_url_columns_in_schema_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_product_media
                    domain: commerce
                    columns:
                      owner_type: string(64)
                      owner_id: string(512)
                      url: string(2048)
                      callback_url: string(2048)
                  - table: commerce_product_spu
                    domain: commerce
                    columns:
                      cover_image: string(1024)
                  - table: object_provider
                    domain: content
                    columns:
                      endpoint_url: string(512)
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "commerce_product_media.url is a bare media URL column; use MediaResource stable reference fields",
                result.messages,
            )
            self.assertIn(
                "commerce_product_spu.cover_image is a bare media URL column; use MediaResource stable reference fields",
                result.messages,
            )
            self.assertNotIn(
                "commerce_product_media.callback_url is a bare media URL column; use MediaResource stable reference fields",
                result.messages,
            )
            self.assertNotIn(
                "object_provider.endpoint_url is a bare media URL column; use MediaResource stable reference fields",
                result.messages,
            )

    def test_rejects_bare_media_url_fields_in_frontend_contract_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_product_spu
                    domain: commerce
                """,
            )
            fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "commerce.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                "frontend_operations:\n"
                "  - route: /admin/catalog\n"
                "    response_schema:\n"
                "      name: ProductResponse\n"
                "      type: object\n"
                "    fields:\n"
                "    - thumbnailUrl\n"
                "    required_columns:\n"
                "      commerce_product_spu:\n"
                "      - cover_image\n"
                "      properties:\n"
                "        coverImage:\n"
                "          type: string\n"
                "          maxLength: 2048\n"
                "        callbackUrl:\n"
                "          type: string\n"
                "          maxLength: 2048\n"
                "        media:\n"
                "          type: array\n"
                "          items:\n"
                "            type: object\n"
                "            properties:\n"
                "              url:\n"
                "                type: string\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - operations/commerce.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field coverImage is a bare media URL field; use MediaResource",
                result.messages,
            )
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field media.url is a bare media URL field; use MediaResource",
                result.messages,
            )
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field thumbnailUrl is a bare media URL field; use MediaResource",
                result.messages,
            )
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml required column commerce_product_spu.cover_image is a bare media URL column; use MediaResource stable reference fields",
                result.messages,
            )
            self.assertNotIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field callbackUrl is a bare media URL field; use MediaResource",
                result.messages,
            )

    def test_rejects_bare_media_url_fields_in_frontend_contract_derived_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_product_spu
                    domain: commerce
                """,
            )
            fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "commerce.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                "frontend_models:\n"
                "  - route: /admin/catalog\n"
                "    interface: ProductItem\n"
                "    fields:\n"
                "    - id\n"
                "    - title\n"
                "    derived_fields:\n"
                "    - coverImage\n"
                "    - media.assetUrl\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - models/commerce.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\models\\commerce.yaml field coverImage is a bare media URL field; use MediaResource",
                result.messages,
            )
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\models\\commerce.yaml field media.assetUrl is a bare media URL field; use MediaResource",
                result.messages,
            )

    def test_rejects_natural_media_fields_that_remain_plain_strings(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_product_spu
                    domain: commerce
                """,
            )
            fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "commerce.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                "frontend_operations:\n"
                "  - route: /admin/catalog\n"
                "    response_schema:\n"
                "      name: ProductResponse\n"
                "      type: object\n"
                "      properties:\n"
                "        cover:\n"
                "          type: string\n"
                "          maxLength: 2048\n"
                "        icon:\n"
                "          type: string\n"
                "          maxLength: 128\n"
                "        upload:\n"
                "          type: object\n"
                "          properties:\n"
                "            file:\n"
                "              type: string\n"
                "              format: binary\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - operations/commerce.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field cover must use MediaResource schema",
                result.messages,
            )
            self.assertNotIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field icon must use MediaResource schema",
                result.messages,
            )
            self.assertNotIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field upload.file must use MediaResource schema",
                result.messages,
            )

    def test_rejects_media_collections_that_remain_string_arrays(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_product_spu
                    domain: commerce
                """,
            )
            fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "commerce.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                "frontend_operations:\n"
                "  - route: /admin/catalog\n"
                "    response_schema:\n"
                "      name: ProductResponse\n"
                "      type: object\n"
                "      properties:\n"
                "        images:\n"
                "          type: array\n"
                "          items:\n"
                "            type: string\n"
                "            maxLength: 2048\n"
                "        modelGroups:\n"
                "          type: object\n"
                "          properties:\n"
                "            images:\n"
                "              type: array\n"
                "              items:\n"
                "                name: ImageModelOption\n"
                "                type: object\n"
                "                properties:\n"
                "                  model:\n"
                "                    type: string\n",
                encoding="utf-8",
            )
            index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
            index.write_text("fragments:\n  - operations/commerce.yaml\n", encoding="utf-8")

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field images must use MediaResource schema",
                result.messages,
            )
            self.assertNotIn(
                "docs\\schema-registry\\frontend-field-contracts\\operations\\commerce.yaml field modelGroups.images must use MediaResource schema",
                result.messages,
            )

    def test_rejects_external_delivery_tables_under_notification_domain(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: notification_template_binding
                    domain: notification
                    columns:
                      channel: string(32)
                      provider_account_id: int64
                  - table: ops_notification_message
                    domain: ops
                    profile: notification
                    columns:
                      message_code: string(128)
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "external messaging table must use messaging_* prefix and messaging domain: notification_template_binding",
                result.messages,
            )
            self.assertNotIn(
                "external messaging table must use messaging_* prefix and messaging domain: ops_notification_message",
                result.messages,
            )

    def test_requires_messaging_tables_for_external_sms_email_delivery_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: messaging_template
                    domain: messaging
                    columns:
                      template_code: string(128)
                      channel: string(32)
                      scene_code: string(128)
                  - table: messaging_send_request
                    domain: messaging
                    columns:
                      request_no: string(128)
                      channel: string(32)
                      target_hash: string(128)
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("messaging standard table is required: messaging_provider_capability", result.messages)
            self.assertIn("messaging standard table is required: messaging_sender_identity", result.messages)
            self.assertIn("messaging standard table is required: messaging_route_rule", result.messages)
            self.assertIn("messaging standard table is required: messaging_send_attempt", result.messages)

    def test_rejects_skills_hub_studio_skill_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: studio_skill_listing
                    domain: studio
                    frontend_routes: [/skills-hub]
                  - table: ai_agent_skill
                    domain: legacy
                    frontend_routes: [/skills-hub]
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("obsolete SkillsHub table remains: studio_skill_listing", result.messages)
            self.assertIn("/skills-hub still uses obsolete SkillsHub table: studio_skill_listing", result.messages)

    def test_accepts_appbase_commerce_standard_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: commerce_account
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/console/account, /admin/user]
                    api_surfaces: [app, backend, worker]
                  - table: commerce_coupon_template
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/admin/marketing]
                    api_surfaces: [backend, worker]
                  - table: commerce_coupon_issue_batch
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/admin/marketing]
                    api_surfaces: [backend, worker]
                  - table: commerce_coupon
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/console/commerce, /admin/marketing]
                    api_surfaces: [app, backend, worker]
                  - table: commerce_order
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/console/checkout, /console/recharge, /admin/finance]
                    api_surfaces: [app, backend, worker]
                  - table: commerce_payment_attempt
                    domain: commerce
                    profile: appbase_standard
                    compliance_level: L3
                    system_of_record: true
                    write_owner: sdkwork-appbase-commerce
                    generated_by_this_project: false
                    frontend_routes: [/console/checkout, /console/recharge, /admin/finance]
                    api_surfaces: [app, backend, worker]
                  - table: ai_agent_skill
                    domain: legacy
                    frontend_routes: [/skills-hub, /skills-hub/:id]
                    api_surfaces: [app, backend]
                  - table: c_category
                    domain: legacy
                    frontend_routes: [/skills-hub, /skills-hub/:id]
                    api_surfaces: [app, backend]
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertTrue(result.ok, result.messages)

    def test_requires_domain_name_type_bindings_and_persistence_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                domain_names:
                  model_vendor:
                    canonical_name: ModelVendor
                    persistence:
                      table: ai_model_vendor
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.ModelVendor
                      typescript: ModelVendor
                      openapi: ModelVendor
                    builtin_values:
                      - { code: openai }
                tables: []
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("model_vendor persistence table must be registered: ai_model_vendor", result.messages)
            self.assertIn("model_vendor type_bindings.rust is required", result.messages)
            self.assertIn("model_vendor builtin_values must include unknown", result.messages)

    def test_requires_pricing_plan_and_channel_group_bindings(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: ai_pricing_group
                    domain: ai
                    columns: {}
                  - table: iam_gateway_api_key
                    domain: iam
                    columns: {}
                  - table: ai_channel_group
                    domain: ai
                    columns: {}
                  - table: ai_pricing_plan_binding
                    domain: ai
                    columns: {}
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("forbidden pricing table present: ai_pricing_group", result.messages)
            self.assertIn("iam_gateway_api_key must include column channel_group_id", result.messages)
            self.assertIn("ai_channel_group must include column pricing_plan_id", result.messages)
            self.assertIn("ai_pricing_plan_binding must include column subject_type", result.messages)

    def test_requires_multi_modal_billing_and_pricing_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                domain_names:
                  billing_mode:
                    canonical_name: BillingMode
                    builtin_values:
                      - { code: token }
                  billing_meter:
                    canonical_name: BillingMeter
                    persistence:
                      table: ai_billing_meter
                    type_bindings:
                      java: com.sdkwork.claw.router.domain.enums.BillingMeter
                      rust: sdkwork_claw_router::domain::BillingMeter
                      typescript: BillingMeter
                      openapi: BillingMeter
                    builtin_values:
                      - { code: llm_input_token }
                tables:
                  - table: ai_billing_meter
                    domain: ai
                    columns: {}
                  - table: ai_model_pricing
                    domain: ai
                    columns:
                      model: string(128)
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("billing_mode builtin_values must include per_result", result.messages)
            self.assertIn("billing_meter builtin_values must include api_result", result.messages)
            self.assertIn("billing_meter builtin_values must include unknown", result.messages)
            self.assertIn("ai_model_pricing must include column price_side", result.messages)
            self.assertIn("ai_model_pricing must include column reference_multiplier", result.messages)

    def test_requires_frontend_routes_to_match_api_surfaces(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: ops_gateway_instance
                    domain: ops
                    write_owner: ops-service
                    frontend_routes: [/admin/monitor, /console/gateway]
                    api_surfaces: [backend]
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("/console/gateway on ops_gateway_instance requires app api_surface", result.messages)

    def test_rejects_forbidden_new_table_prefixes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  naming_guardrails:
                    forbidden_new_prefixes: [router]
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: router_usage_event
                    domain: ai
                    write_owner: ai-service
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("forbidden new table prefix present: router_usage_event", result.messages)

    def test_allows_custom_api_prefixes_as_registry_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  api_prefixes:
                    app: /app/api
                    backend: /backend/api
                    openai_compatible: /openai
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables: []
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertTrue(result.ok, result.messages)

    def test_requires_projection_tables_to_declare_registered_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: ai_usage
                    domain: ai
                  - table: ops_metric_snapshot
                    domain: ops
                    profile: projection
                    source_tables: [ai_usage, missing_fact]
                  - table: ops_referral_stat_snapshot
                    domain: ops
                    common_columns: projection
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("ops_metric_snapshot source_tables references unregistered table missing_fact", result.messages)
            self.assertIn("ops_referral_stat_snapshot projection table must declare source_tables or source_refs", result.messages)

    def test_requires_projection_over_legacy_tables_to_declare_non_replacement_policy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  legacy_compatibility_guardrails:
                    forbidden_synonym_tables: []
                tables:
                  - table: ai_agent_skill
                    domain: legacy
                  - table: ops_skill_stat_snapshot
                    domain: ops
                    profile: projection
                    source_tables: [ai_agent_skill]
                """,
            )

            result = SchemaGuardian(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "ops_skill_stat_snapshot projection over legacy table ai_agent_skill must declare projection_policy.does_not_replace",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
