import json
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
APPS_ROOT = REPO_ROOT.parent
SEED_PATH = REPO_ROOT / "data" / "app" / "sdkwork-apps.json"
APP_CATEGORY_SEED_PATH = REPO_ROOT / "data" / "app" / "sdkwork-app-categories.json"
APP_CATEGORY_MANIFEST_TOOL = "tools.app_seed_category_manifest"
APP_SEED_EXPORTER_PATH = APPS_ROOT / "scripts" / "initialize-sdkwork-app-standard-v3.mjs"
APP_SEED_SOURCE_PATH = (
    REPO_ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "infrastructure"
    / "sql"
    / "app_seed.rs"
)

PLUS_APP_FIELDS = {
    "name",
    "description",
    "version",
    "icon",
    "accessUrl",
    "config",
    "status",
    "appType",
    "platforms",
    "installPlatforms",
    "installSkill",
    "installConfig",
    "releaseNotes",
    "packageName",
    "bundleId",
    "storeUrl",
    "artifact",
}


def first_json_mismatch(left, right, path="$"):
    if left == right:
        return None
    if isinstance(left, dict) and isinstance(right, dict):
        keys = sorted(set(left.keys()) | set(right.keys()))
        for key in keys:
            child_path = f"{path}.{key}"
            if key not in left:
                return child_path, "<missing>", right[key]
            if key not in right:
                return child_path, left[key], "<missing>"
            mismatch = first_json_mismatch(left[key], right[key], child_path)
            if mismatch is not None:
                return mismatch
        return None
    if isinstance(left, list) and isinstance(right, list):
        if len(left) != len(right):
            return f"{path}.length", len(left), len(right)
        for index, (left_item, right_item) in enumerate(zip(left, right, strict=True)):
            mismatch = first_json_mismatch(left_item, right_item, f"{path}[{index}]")
            if mismatch is not None:
                return mismatch
        return None
    return path, left, right


def portal_category_label(value):
    words = str(value).strip().replace("_", " ").replace("-", " ").split()
    acronyms = {"API", "CLI", "HTML", "PC", "SDK", "UI"}
    return " ".join(word.upper() if word.upper() in acronyms else word.capitalize() for word in words)


def normalize_code(value):
    normalized = []
    last_dash = False
    for char in str(value).strip():
        if char.isascii() and char.isalnum():
            normalized.append(char.lower())
            last_dash = False
        elif not last_dash:
            normalized.append("-")
            last_dash = True
    return "".join(normalized).strip("-")


def stable_hash_mod(value, modulo):
    hash_value = 14_695_981_039_346_656_037
    for byte in value.encode("utf-8"):
        hash_value ^= byte
        hash_value = (hash_value * 1_099_511_628_211) & ((1 << 64) - 1)
    return hash_value % modulo


def assert_media_resource(testcase: unittest.TestCase, value, kind: str) -> None:
    testcase.assertIsInstance(value, dict)
    testcase.assertEqual(kind, value.get("kind"))
    testcase.assertIsInstance(value.get("source"), str)
    testcase.assertTrue(value["source"].strip())
    testcase.assertTrue(media_resource_locator(value))


def assert_media_descriptor(testcase: unittest.TestCase, value, kind: str) -> None:
    testcase.assertIsInstance(value, dict)
    testcase.assertNotIn("url", value)
    assert_media_resource(testcase, value.get("asset"), kind)
    thumbnail = value.get("thumbnail")
    if thumbnail is not None:
        assert_media_resource(testcase, thumbnail, "image")


def media_resource_locator(value) -> str:
    if not isinstance(value, dict):
        return ""
    for key in ("publicUrl", "url", "uri", "objectKey", "objectBlobId", "id"):
        raw = value.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
        if isinstance(raw, int) and raw > 0:
            return str(raw)
    return ""


def media_resource(locator: str, kind: str = "image") -> dict:
    return {
        "kind": kind,
        "source": "data_url" if locator.startswith("data:") else "external_url",
        "url": locator,
        "publicUrl": locator,
    }


def app_category_id(code):
    explicit = {
        "app-store-html": 20_002_001,
        "app-store-react": 20_002_002,
        "app-store-flutter": 20_002_003,
    }
    return explicit.get(code, 20_002_000 + stable_hash_mod(code, 900_000))


def expected_app_categories(seed):
    names = sorted(
        {
            item["plusApp"]["config"]["portal"]["category"].strip()
            for item in seed["apps"]
            if item["plusApp"]["config"]["portal"].get("category", "").strip()
        },
        key=lambda value: f"app-store-{normalize_code(value)}",
    )
    return [
        {
            "id": app_category_id(f"app-store-{normalize_code(name)}"),
            "uuid": f"sdkwork-app-category-{normalize_code(name)}",
            "name": name,
            "description": f"{name} SDKWork app category",
            "code": f"app-store-{normalize_code(name)}",
            "tags": ["sdkwork-app", normalize_code(name)],
            "icon": media_resource(f"https://cdn.sdkwork.com/app-categories/{normalize_code(name)}.svg"),
            "sortWeight": 100 + index,
            "path": f"/app-store/{normalize_code(name)}",
        }
        for index, name in enumerate(names)
    ]


class AppSeedCatalogStandardTest(unittest.TestCase):
    maxDiff = None

    def test_app_seed_catalog_exports_distinct_sdkwork_apps_as_platform_app_projection(self):
        self.assertTrue(
            SEED_PATH.exists(),
            "data/app/sdkwork-apps.json must be the installable app seed bundle",
        )

        seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        self.assertEqual(1, seed.get("schemaVersion"))
        self.assertEqual("sdkwork.platform_app.seed", seed.get("kind"))
        self.assertEqual("sdkwork-clawrouter", seed.get("source", {}).get("rootAppKey"))
        self.assertIsInstance(seed.get("apps"), list)
        self.assertGreater(len(seed["apps"]), 0)
        self.assertEqual(
            len(seed["apps"]),
            seed.get("count"),
            "sdkwork-apps.json count must match the actual apps length",
        )

        app_keys = [item.get("appKey") for item in seed["apps"]]
        self.assertEqual(len(app_keys), len(set(app_keys)), "appKey values must be unique")
        self.assertIn("sdkwork-clawrouter", app_keys)

        for index, item in enumerate(seed["apps"]):
            with self.subTest(app=item.get("appKey") or index):
                self.assertIsInstance(item.get("appKey"), str)
                self.assertRegex(item["appKey"], r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
                self.assertIsInstance(item.get("appRoot"), str)
                self.assertIsInstance(item.get("configPath"), str)
                self.assertIsInstance(item.get("tenantId"), int)
                self.assertIsInstance(item.get("organizationId"), int)

                platform_app = item.get("plusApp")
                self.assertIsInstance(platform_app, dict)
                self.assertTrue(
                    PLUS_APP_FIELDS.issubset(platform_app.keys()),
                    f"plusApp is missing Java PlusApp projection fields: {PLUS_APP_FIELDS - set(platform_app.keys())}",
                )
                self.assertIsInstance(platform_app["name"], str)
                self.assertTrue(platform_app["name"].strip())
                self.assertNotIn("iconUrl", platform_app)
                self.assertNotIn("downloadUrl", platform_app)
                assert_media_resource(self, platform_app.get("icon"), "image")
                artifact = platform_app.get("artifact")
                if artifact is not None:
                    assert_media_resource(self, artifact, "document")
                self.assertIn(
                    platform_app["status"],
                    {"ACTIVE", "INACTIVE"},
                    "PlusApp runtime status must use only ACTIVE/INACTIVE; marketplace state belongs in config.portal.marketStatus",
                )
                self.assertIsInstance(platform_app["config"], dict)
                self.assertEqual(item["appKey"], platform_app["config"].get("standard", {}).get("appKey"))
                expected_market_status = "PUBLISHED" if platform_app["status"] == "ACTIVE" else "DRAFT"
                self.assertEqual(
                    expected_market_status,
                    platform_app["config"].get("portal", {}).get("marketStatus"),
                    "installable app seed must persist marketplace state in PlusApp config.portal.marketStatus",
                )
                portal_category = platform_app["config"].get("portal", {}).get("category")
                self.assertIsInstance(
                    portal_category,
                    str,
                    "installable app seed must persist AppCenter category in PlusApp config.portal.category",
                )
                self.assertTrue(portal_category.strip())
                store_categories = [
                    store.get("category")
                    for store in platform_app["config"].get("publish", {}).get("stores", [])
                    if store.get("category")
                ]
                if store_categories:
                    self.assertEqual(
                        portal_category_label(store_categories[0]),
                        portal_category,
                        "store category enums must be converted into AppCenter display categories in config.portal.category",
                    )
                self.assertIsInstance(platform_app["platforms"].get("platforms"), list)
                self.assertGreater(len(platform_app["platforms"]["platforms"]), 0)
                self.assertIsInstance(platform_app["installPlatforms"].get("platforms"), list)
                self.assertGreater(len(platform_app["installPlatforms"]["platforms"]), 0)
                self.assertIsInstance(platform_app["installConfig"].get("packages"), list)
                self.assertGreater(len(platform_app["installConfig"]["packages"]), 0)
                self.assertIsInstance(platform_app["releaseNotes"], list)
                self.assertGreater(len(platform_app["releaseNotes"]), 0)

    def test_app_seed_media_fields_are_canonical_media_resources(self):
        seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        categories = json.loads(APP_CATEGORY_SEED_PATH.read_text(encoding="utf-8"))["categories"]
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")

        for item in seed["apps"]:
            platform_app = item["plusApp"]
            with self.subTest(app=item["appKey"]):
                self.assertNotIn("iconUrl", platform_app)
                self.assertNotIn("downloadUrl", platform_app)
                assert_media_resource(self, platform_app.get("icon"), "image")
                if platform_app.get("artifact") is not None:
                    assert_media_resource(self, platform_app["artifact"], "document")
                for package in platform_app["installConfig"]["packages"]:
                    self.assertNotIn("url", package)
                    self.assertNotIn("downloadUrl", package)
                    assert_media_resource(self, package.get("artifact"), "document")

                media = platform_app["config"].get("media", {})
                primary_icon = media.get("icons", {}).get("primary")
                if primary_icon is not None:
                    assert_media_descriptor(self, primary_icon, "image")
                for icon in media.get("icons", {}).get("platform", []):
                    assert_media_descriptor(self, icon, "image")
                for screenshot in media.get("screenshots", []):
                    assert_media_descriptor(self, screenshot, "image")
                for preview in media.get("previews", []):
                    preview_kind = "video" if preview.get("format", "").lower() in {"mp4", "webm", "mov"} else "image"
                    assert_media_descriptor(self, preview, preview_kind)

        for category in categories:
            with self.subTest(category=category["code"]):
                assert_media_resource(self, category.get("icon"), "image")

        for legacy in (
            'serde(rename = "iconUrl")',
            'json_text(package, "downloadUrl")',
            '"iconUrl"',
            '"downloadUrl"',
        ):
            self.assertNotIn(legacy, source)

    def test_app_seed_catalog_matches_standard_exporter_output(self):
        if not APP_SEED_EXPORTER_PATH.exists():
            self.skipTest(
                "standard app seed exporter lives outside the writable sdkwork-clawrouter workspace"
            )
        if not APP_SEED_EXPORTER_PATH.is_relative_to(REPO_ROOT):
            self.skipTest(
                "standard app seed exporter lives outside the writable sdkwork-clawrouter workspace"
            )
        result = subprocess.run(
            [
                "node",
                str(APP_SEED_EXPORTER_PATH),
                "--export-plusapp",
                "--apps-root",
                str(APPS_ROOT),
                "--json",
            ],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(
            0,
            result.returncode,
            f"app seed exporter must succeed before installer seed can be trusted\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}",
        )
        exported = json.loads(result.stdout)
        committed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        mismatch = first_json_mismatch(exported, committed)
        self.assertIsNone(
            mismatch,
            "data/app/sdkwork-apps.json must be regenerated from all workspace sibling app repositories "
            f"sdkwork.app.config.json files; first mismatch: {mismatch}",
        )

    def test_app_seed_importer_validates_app_bundle_manifest_before_import(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "fn validate_app_seed_bundle(bundle: &AppSeedBundle) -> Result<(), AppSeedLoadError>",
            source,
            "app seed importer must explicitly validate sdkwork-apps.json before deriving categories/assets/artifacts",
        )
        self.assertIn(
            "validate_app_seed_bundle(&bundle)?;",
            source,
            "app seed importer must fail closed on invalid app seed manifest metadata before import starts",
        )

        load_start = source.index("fn load() -> Result<Self, AppSeedLoadError>")
        category_validation_index = source.index("validate_app_category_seed(&bundle, &categories)?;", load_start)
        app_validation_index = source.index("validate_app_seed_bundle(&bundle)?;", load_start)
        self.assertLess(
            app_validation_index,
            category_validation_index,
            "sdkwork-apps.json metadata must be validated before category seed drift validation",
        )

        validation_start = source.index("fn validate_app_seed_bundle(bundle: &AppSeedBundle) -> Result<(), AppSeedLoadError>")
        validation_end = source.index("fn derive_categories(bundle: &AppSeedBundle) -> Vec<AppCategorySeed>", validation_start)
        validation_source = source[validation_start:validation_end]
        for expected in [
            "invalid bundled app seed schemaVersion",
            "sdkwork.platform_app.seed",
            "invalid bundled app seed count",
            "duplicate bundled app appKey",
            "invalid bundled app appKey",
            'json_path_text(&entry.platform_app.config, &["standard", "appKey"])',
            "does not match config.standard.appKey",
            "invalid bundled app runtime status",
        ]:
            self.assertIn(
                expected,
                validation_source,
                "app seed importer must reject manifest drift and unsafe app identity/status before touching database state",
            )

    def test_app_category_seed_manifest_matches_app_seed_portal_categories(self):
        self.assertTrue(
            APP_CATEGORY_SEED_PATH.exists(),
            "data/app/sdkwork-app-categories.json must make app PlusCategory initialization data auditable",
        )
        seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        category_seed = json.loads(APP_CATEGORY_SEED_PATH.read_text(encoding="utf-8"))

        self.assertEqual(1, category_seed.get("schemaVersion"))
        self.assertEqual("sdkwork.c_category.app_seed", category_seed.get("kind"))
        self.assertEqual("sdkwork.platform_app.seed", category_seed.get("source", {}).get("appSeedKind"))
        self.assertEqual(len(seed["apps"]), category_seed.get("source", {}).get("appCount"))
        self.assertEqual(
            seed["source"],
            category_seed.get("source", {}).get("appSeedSource"),
            "app category seed must preserve the app seed source metadata for install auditability",
        )

        expected_categories = expected_app_categories(seed)
        self.assertEqual(len(expected_categories), category_seed.get("count"))
        mismatch = first_json_mismatch(
            {"categories": expected_categories},
            {"categories": category_seed.get("categories")},
        )
        self.assertIsNone(
            mismatch,
            "data/app/sdkwork-app-categories.json must be derived from sdkwork-apps.json portal categories "
            f"using the Rust installer category id/code rules; first mismatch: {mismatch}",
        )

        codes = [item["code"] for item in category_seed["categories"]]
        self.assertEqual(codes, sorted(codes), "category seed must be sorted by stable code")
        self.assertEqual(len(codes), len(set(codes)), "category codes must be unique")

    def test_app_category_seed_manifest_is_generated_by_standard_tool(self):
        result = subprocess.run(
            ["python", "-B", "-m", APP_CATEGORY_MANIFEST_TOOL, "--check"],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(
            0,
            result.returncode,
            "app category seed manifest must be generated by the repository tool\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}",
        )

        readme = (REPO_ROOT / "data" / "app" / "README.md").read_text(encoding="utf-8")
        self.assertIn(
            f"python -B -m {APP_CATEGORY_MANIFEST_TOOL}",
            readme,
            "data/app README must document the standard category manifest regeneration command",
        )

    def test_app_seed_importer_does_not_accept_runtime_status_aliases(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        self.assertNotIn(
            '"ACTIVE" | "ENABLED" | "PUBLISHED"',
            source,
            "app seed importer must not collapse marketplace or legacy aliases into platform_app.status",
        )
        self.assertNotIn(
            '"ACTIVE" | "ENABLED" | "1"',
            source,
            "app seed importer must not accept numeric or legacy aliases for platform_app.status",
        )

    def test_app_seed_importer_uses_explicit_category_derivation_from_seed_data(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "const APP_CATEGORY_SEED_JSON: &str",
            source,
        )
        self.assertIn(
            '"../../../../../data/app/sdkwork-app-categories.json"',
            source,
        )
        self.assertIn(
            "struct AppCategorySeedBundle",
            source,
            "app seed importer must parse explicit /data/app app category initialization data",
        )
        self.assertIn(
            "validate_app_category_seed",
            source,
            "app seed importer must reject category seed drift from sdkwork-apps.json",
        )
        function_start = source.index("fn app_category_name(entry: &AppSeedEntry) -> String")
        function_end = source.index("fn app_category_code(name: &str) -> String", function_start)
        function_source = source[function_start:function_end]
        self.assertIn('json_path_text(&entry.platform_app.config, &["portal", "category"])', source)
        self.assertIn('json_path_text(&entry.platform_app.config, &["category"])', source)
        self.assertIn(
            'json_path_text(&entry.platform_app.install_config, &["portal", "category"])',
            source,
        )
        self.assertLess(
            function_source.index('json_path_text(&entry.platform_app.config, &["portal", "category"])'),
            function_source.index("entry.platform_app.app_type"),
            "seeded PlusCategory rows must prefer config portal category before falling back to app_type",
        )

    def test_app_seed_importer_preserves_disabled_packages_as_inactive_artifacts(self):
        seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        disabled_package_count = sum(
            1
            for item in seed["apps"]
            for package in item["plusApp"]["installConfig"]["packages"]
            if package.get("enabled") is False
        )
        self.assertGreater(
            disabled_package_count,
            0,
            "seed fixture must include disabled packages so commercial release blockers stay covered",
        )

        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        self.assertNotIn(
            'if !json_bool_default(package, "enabled", true) {\n                continue;\n            }',
            source,
            "app seed importer must not drop disabled packages from ai_skill_artifact",
        )
        self.assertIn(
            'let status = if json_bool_default(package, "enabled", true) {',
            source,
            "app seed importer must derive artifact status from installConfig.packages[].enabled",
        )
        self.assertIn(
            ".bind(item.status)",
            source,
            "app seed importer must persist the derived artifact status for both SQLite and Postgres",
        )
        self.assertIn(
            "artifact_type, version, platform_type, os_name",
            source,
            "app seed importer must preserve standard artifact uniqueness without adding non-standard schema columns",
        )

    def test_app_seed_importer_retires_stale_artifact_projections_for_sqlite_and_postgres(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        for expected in [
            "async fn retire_sqlite_stale_artifacts",
            "async fn retire_postgres_stale_artifacts",
            "async fn sqlite_stale_app_artifact_count",
            "async fn postgres_stale_app_artifact_count",
            "json_extract(metadata, '$.seedKind')",
            "json_extract(metadata, '$.itemType') = 'app_artifact'",
            "metadata ->> 'seedKind'",
            "metadata ->> 'itemType' = 'app_artifact'",
            "deleted_at = CURRENT_TIMESTAMP",
            "deleted_by = 0",
        ]:
            self.assertIn(
                expected,
                source,
                "app seed importer must tombstone stale package projections for both SQLite and Postgres",
            )

    def test_app_seed_importer_retires_stale_asset_projections_for_sqlite_and_postgres(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        for expected in [
            "async fn retire_sqlite_stale_assets",
            "async fn retire_postgres_stale_assets",
            "async fn sqlite_stale_app_asset_count",
            "async fn postgres_stale_app_asset_count",
            "json_extract(metadata, '$.seedKind')",
            "json_extract(metadata, '$.itemType') = 'app_asset'",
            "metadata ->> 'seedKind'",
            "metadata ->> 'itemType' = 'app_asset'",
            "deleted_at = CURRENT_TIMESTAMP",
            "deleted_by = 0",
        ]:
            self.assertIn(
                expected,
                source,
                "app seed importer must tombstone stale media projections for both SQLite and Postgres",
            )

    def test_app_seed_importer_retires_stale_seed_apps_and_categories_without_schema_changes(self):
        source = APP_SEED_SOURCE_PATH.read_text(encoding="utf-8")
        for expected in [
            "async fn retire_sqlite_stale_apps",
            "async fn retire_postgres_stale_apps",
            "async fn retire_sqlite_stale_categories",
            "async fn retire_postgres_stale_categories",
            "async fn sqlite_stale_app_seed_count",
            "async fn postgres_stale_app_seed_count",
            "async fn sqlite_stale_app_category_count",
            "async fn postgres_stale_app_category_count",
            "uuid LIKE 'sdkwork-app-%'",
            "uuid LIKE 'sdkwork-app-category-%'",
            "json_patch",
            "jsonb_set",
            "marketStatus",
            "visible = false",
            "status = ?",
            "status = $1",
        ]:
            self.assertIn(
                expected,
                source,
                "app seed importer must retire stale PlusApp and PlusCategory seed rows without adding schema columns",
            )


if __name__ == "__main__":
    unittest.main()
