import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
_SDKWORK_MODELS_MOUNT = ROOT / "data" / "sdkwork-models"
_SDKWORK_MODELS_SIBLING = ROOT.parent / "sdkwork-models"
SDKWORK_MODELS = (
    _SDKWORK_MODELS_MOUNT
    if _SDKWORK_MODELS_MOUNT.is_dir()
    else _SDKWORK_MODELS_SIBLING
)
SDKWORK_MODELS_SDK = SDKWORK_MODELS / "sdks" / "sdkwork-models-sdk"
CLIENT_API_SUPPORT_STATUSES = ("supported", "unsupported", "partial", "convert")
RUST_INSTALLER_PATH = (
    ROOT
    / "services"
    / "sdkwork-clawrouter-router-service"
    / "src"
    / "infrastructure"
    / "sql"
    / "installer.rs"
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict:
    return json.loads(read_text(path))


def load_json_from_yaml(path: Path) -> dict:
    return yaml.safe_load(read_text(path))


def lang_sdk(language: str) -> Path:
    return SDKWORK_MODELS_SDK / f"sdkwork-models-sdk-{language}"


def lang_sdk_rel(language: str, *parts: str) -> str:
    return (Path("sdks/sdkwork-models-sdk") / f"sdkwork-models-sdk-{language}" / Path(*parts)).as_posix()


def catalog_subprocess_env() -> dict[str, str]:
    return os.environ.copy()


def resolve_sdkwork_utils_package() -> Path | None:
    for candidate in (
        ROOT.parent / "sdkwork-utils" / "packages" / "sdkwork-utils-typescript",
        SDKWORK_MODELS.parent.parent / "sdkwork-utils" / "packages" / "sdkwork-utils-typescript",
    ):
        if (candidate / "package.json").is_file():
            return candidate.resolve()
    return None


def ensure_catalog_utils_dependency() -> None:
    utils_package = resolve_sdkwork_utils_package()
    if utils_package is None:
        raise unittest.SkipTest(
            "sdkwork-utils package missing; install sibling sdkwork-utils workspace"
        )
    if not (utils_package / "dist" / "crypto.js").is_file():
        completed = subprocess.run(
            ["pnpm", "build"],
            cwd=utils_package,
            text=True,
            capture_output=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                "failed to build @sdkwork/utils for catalog tools: "
                f"{completed.stdout}{completed.stderr}"
            )

    link_target = SDKWORK_MODELS / "node_modules" / "@sdkwork" / "utils"
    if link_target.exists():
        return

    link_target.parent.mkdir(parents=True, exist_ok=True)
    if os.name == "nt":
        completed = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link_target), str(utils_package)],
            text=True,
            capture_output=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                "failed to junction @sdkwork/utils for catalog tools: "
                f"{completed.stdout}{completed.stderr}"
            )
        return

    link_target.symlink_to(utils_package, target_is_directory=True)


CATALOG_TEMP_COPY_IGNORE = shutil.ignore_patterns(
    "node_modules",
    "sdks/sdkwork-models-sdk/sdkwork-models-sdk-typescript/dist",
    "sdks/sdkwork-models-sdk/sdkwork-models-sdk-rust/target",
    "sdks/sdkwork-models-sdk/sdkwork-models-sdk-java/target",
    "target-codex",
    "__pycache__",
)


def link_catalog_node_modules(temp_root: Path) -> None:
    source = (SDKWORK_MODELS / "node_modules").resolve()
    target = temp_root / "node_modules"
    if not source.is_dir():
        raise unittest.SkipTest("data/sdkwork-models node_modules missing; run pnpm install")
    if target.exists():
        return
    if os.name == "nt":
        completed = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(target), str(source)],
            text=True,
            capture_output=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                "failed to junction catalog node_modules: "
                f"{completed.stdout}{completed.stderr}"
            )
        return
    target.symlink_to(source, target_is_directory=True)


def copy_catalog_workspace(temp_root: Path) -> None:
    shutil.copytree(SDKWORK_MODELS, temp_root, ignore=CATALOG_TEMP_COPY_IGNORE)
    link_catalog_node_modules(temp_root)


def model_id_from_catalog_file(root: Path, file_path: Path) -> str:
    payload = load_json(file_path)
    model_id = payload.get("modelId")
    if isinstance(model_id, str) and model_id:
        return model_id
    rel = file_path.relative_to(root).with_suffix("")
    return rel.as_posix()


def pricing_path_for_model_path(model_path: Path) -> Path:
    rel = model_path.relative_to(SDKWORK_MODELS / "models")
    vendor_code, region_code = rel.parts[0], rel.parts[1]
    model_root = SDKWORK_MODELS / "models" / vendor_code / region_code / "models"
    model_id = model_id_from_catalog_file(model_root, model_path)
    return SDKWORK_MODELS / "models" / vendor_code / region_code / "pricing" / f"{model_id}.json"


def unsupported_client_api_compatibility() -> dict:
    return {
        "codex": {
            "clientApiCode": "codex",
            "displayName": "Codex",
            "supportStatus": "unsupported",
            "protocolCodes": [],
            "apiCodes": [],
            "resourceCodes": [],
            "notes": "Test fixture vendor does not expose the Codex client API surface directly.",
            "source": {
                "sourceUrl": "https://sdkwork.cloud/standards/sdkwork-models/client-api-compatibility",
                "observedAt": "2026-06-03T00:00:00Z",
            },
        },
        "claude_code": {
            "clientApiCode": "claude_code",
            "displayName": "Claude Code",
            "supportStatus": "unsupported",
            "protocolCodes": [],
            "apiCodes": [],
            "resourceCodes": [],
            "notes": "Test fixture vendor does not expose the Claude Code client API surface directly.",
            "source": {
                "sourceUrl": "https://sdkwork.cloud/standards/sdkwork-models/client-api-compatibility",
                "observedAt": "2026-06-03T00:00:00Z",
            },
        },
        "gemini_cli": {
            "clientApiCode": "gemini_cli",
            "displayName": "Gemini CLI",
            "supportStatus": "unsupported",
            "protocolCodes": [],
            "apiCodes": [],
            "resourceCodes": [],
            "notes": "Test fixture vendor does not expose the Gemini CLI client API surface directly.",
            "source": {
                "sourceUrl": "https://sdkwork.cloud/standards/sdkwork-models/client-api-compatibility",
                "observedAt": "2026-06-03T00:00:00Z",
            },
        },
    }


class SdkworkModelsStandardTest(unittest.TestCase):
    def test_standard_files_exist(self) -> None:
        required = [
            "README.md",
            "sdkwork-models.json",
            "package.json",
            "CHANGELOG.md",
            "LICENSE",
            "schemas/catalog.schema.json",
            "schemas/index.schema.json",
            "schemas/official-model-snapshot.schema.json",
            "schemas/official-verification-policy.schema.json",
            "schemas/vendor-sources.schema.json",
            "schemas/meter.schema.json",
            "schemas/vendor.schema.json",
            "schemas/family.schema.json",
            "schemas/model.schema.json",
            "schemas/pricing.schema.json",
            "schemas/ranking.schema.json",
            "schemas/provider-overlay.schema.json",
            "models/index.json",
            "models/meters.json",
            "models/vendors.json",
            "sources/vendor-sources.json",
            "sources/official-model-snapshots.json",
            "tools/catalog-lib.mjs",
            "tools/validate-catalog.mjs",
            "tools/build-index.mjs",
            "tools/catalog-audit.mjs",
            "tools/catalog-diff.mjs",
            "tools/freshness-report.mjs",
            "tools/release-catalog.mjs",
        ]
        for rel in required:
            with self.subTest(path=rel):
                self.assertTrue((SDKWORK_MODELS / rel).exists(), rel)

    def test_language_sdk_entrypoints_exist(self) -> None:
        expected = {
            "typescript": [
                "README.md",
                "package.json",
                "tsconfig.json",
                "src/index.ts",
            ],
            "python": [
                "README.md",
                "pyproject.toml",
                "sdkwork_models/__init__.py",
            ],
            "java": [
                "README.md",
                "pom.xml",
                "src/main/java/com/sdkwork/models/SdkworkModels.java",
            ],
            "rust": [
                "README.md",
                "Cargo.toml",
                "src/lib.rs",
            ],
            "flutter": [
                "README.md",
                "pubspec.yaml",
                "lib/sdkwork_models.dart",
            ],
        }
        for language, files in expected.items():
            for rel in files:
                path = lang_sdk(language) / rel
                with self.subTest(path=f"{language}/{rel}"):
                    self.assertTrue(path.exists(), str(path))

    def test_language_sdk_docs_use_standard_catalog_key_contract(self) -> None:
        readmes = [
            SDKWORK_MODELS / "README.md",
            lang_sdk("typescript") / "README.md",
            lang_sdk("python") / "README.md",
            lang_sdk("java") / "README.md",
            lang_sdk("rust") / "README.md",
            lang_sdk("flutter") / "README.md",
        ]
        forbidden = [
            "loadVendorCatalog(pathOrUrl, vendorCode)",
            "load_vendor_catalog(path_or_url, vendor_code)",
            "findModel(catalog, modelId)",
            "find_model(catalog, model_id)",
            "getModelPrices(catalog, modelId)",
            "get_model_prices(catalog, model_id)",
            "listModelsByVendor",
            "models/openai/models",
            "models/<vendorCode>/models",
            "vendorCode/regionCode/modelId",
            "minimax_cn",
            "deepseek_cn",
            "moonshot_cn",
            "alibaba_cn",
            "vendorGroupCode",
        ]
        required = [
            "regionCode",
            "vendorCode/modelId",
        ]
        for readme in readmes:
            source = read_text(readme)
            with self.subTest(path=readme.relative_to(SDKWORK_MODELS).as_posix()):
                for token in forbidden:
                    self.assertNotIn(token, source)
                for token in required:
                    self.assertIn(token, source)

    def test_language_sdk_docs_publish_complete_query_api_contract(self) -> None:
        readmes = [
            SDKWORK_MODELS / "README.md",
            lang_sdk("typescript") / "README.md",
            lang_sdk("python") / "README.md",
            lang_sdk("java") / "README.md",
            lang_sdk("rust") / "README.md",
            lang_sdk("flutter") / "README.md",
        ]
        common_tokens = [
            "vendorCode",
            "regionCode",
            "familyCode",
            "capability",
            "inputModality",
            "outputModality",
            "releaseStage",
            "shelfState",
            "routingState",
            "apiFormat",
        ]
        language_tokens = {
            "README.md": ["listMeters(catalog)", "findMeter(catalog, meterCode)"],
            lang_sdk_rel("typescript", "README.md"): ["listMeters(catalog)", "findMeter(catalog, meterCode)", "listAvailableModels(catalog)"],
            lang_sdk_rel("python", "README.md"): ["list_meters(catalog)", "find_meter(catalog, meter_code)", "list_available_models(catalog)"],
            lang_sdk_rel("java", "README.md"): [
                "SdkworkModels.listModels(ModelCatalog catalog, Map<String, String> filter)",
                "SdkworkModels.listAvailableModels(ModelCatalog catalog)",
                "SdkworkModels.listMeters(ModelCatalog catalog)",
                "SdkworkModels.findMeter(ModelCatalog catalog, String meterCode)",
            ],
            lang_sdk_rel("rust", "README.md"): ["list_meters(&catalog)", "find_meter(&catalog, meter_code)", "list_available_models(&catalog"],
            lang_sdk_rel("flutter", "README.md"): ["listMeters(catalog)", "findMeter(catalog, meterCode)", "listAvailableModels(catalog)"],
        }
        for readme in readmes:
            rel = readme.relative_to(SDKWORK_MODELS).as_posix()
            source = read_text(readme)
            with self.subTest(path=rel):
                for token in common_tokens + language_tokens[rel]:
                    self.assertIn(token, source)

    def test_language_sdk_query_api_uses_regionless_catalog_key(self) -> None:
        source_paths = [
            SDKWORK_MODELS / "tools" / "catalog-lib.mjs",
            lang_sdk("typescript") / "src" / "query.ts",
            lang_sdk("python") / "sdkwork_models" / "query.py",
            lang_sdk("java")
            / "src"
            / "main"
            / "java"
            / "com"
            / "sdkwork"
            / "models"
            / "ModelCatalogQuery.java",
            lang_sdk("rust") / "src" / "query.rs",
            lang_sdk("flutter") / "lib" / "src" / "query.dart",
        ]

        forbidden_signatures = [
            "catalogKey(vendorCode, regionCode, modelId)",
            "catalog_key(vendor_code, region_code, model_id)",
            "catalogKey(String vendorCode, String regionCode, String modelId)",
            "catalog_key(vendor_code: &str, _region_code: &str, model_id: &str)",
            "catalogKey(String vendorCode, String regionCode, String modelId)",
            "catalogKey(vendorCode, _regionCode, modelId)",
        ]
        required_signatures = [
            "catalogKey(vendorCode, modelId)",
            "catalogKey(vendorCode: string, modelId: string)",
            "catalog_key(vendor_code, model_id)",
            "catalog_key(vendor_code: str, model_id: str)",
            "catalogKey(String vendorCode, String modelId)",
            "catalog_key(vendor_code: &str, model_id: &str)",
            "catalogKey(String vendorCode, String modelId)",
        ]

        for path in source_paths:
            source = read_text(path)
            with self.subTest(path=path.relative_to(SDKWORK_MODELS).as_posix()):
                for token in forbidden_signatures:
                    self.assertNotIn(token, source)
                self.assertTrue(
                    any(token in source for token in required_signatures),
                    "language SDK query API must expose catalogKey(vendorCode, modelId); "
                    "regionCode is a filter/deployment/pricing dimension.",
                )

    def test_language_sdk_catalog_key_parser_splits_on_first_slash(self) -> None:
        source_forbidden_tokens = {
            lang_sdk_rel("typescript", "src/query.ts"): [
                "parts.length !== 2",
            ],
            lang_sdk_rel("python", "sdkwork_models/query.py"): [
                "len(parts) != 2",
                "catalog_key_value.split(\"/\")",
            ],
            lang_sdk_rel("java", "src/main/java/com/sdkwork/models/ModelCatalogQuery.java"): [
                "parts.length != 2",
                "catalogKey.split(\"/\", -1)",
            ],
            lang_sdk_rel("rust", "src/query.rs"): [
                "parts.next().is_some()",
                "catalog_key.split('/')",
            ],
            lang_sdk_rel("flutter", "lib/src/query.dart"): [
                "parts.length != 2",
                "catalogKeyValue.split('/')",
            ],
        }

        for rel, forbidden_tokens in source_forbidden_tokens.items():
            source = read_text(SDKWORK_MODELS / rel)
            with self.subTest(path=rel):
                for token in forbidden_tokens:
                    self.assertNotIn(
                        token,
                        source,
                        "catalog key parsing must split on the first slash only so "
                        "OpenRouter-style model ids such as anthropic/claude-3-opus remain intact.",
                    )

    def test_catalog_audit_uses_canonical_model_id_path_helper(self) -> None:
        source = read_text(SDKWORK_MODELS / "tools" / "catalog-audit.mjs")
        self.assertIn("modelFileName", source)
        self.assertIn('from "./catalog-lib.mjs"', source)
        for token in [
            "${modelId}.json",
            "${model.modelId}.json",
            "${pricing.modelId}.json",
        ]:
            with self.subTest(token=token):
                self.assertNotIn(
                    token,
                    source,
                    "catalog audit diagnostics must use the same slash-delimited "
                    "modelId path normalization as index generation and validation.",
                )

    def test_docs_publish_official_verification_policy_release_gate_contract(self) -> None:
        docs = [
            SDKWORK_MODELS / "README.md",
            SDKWORK_MODELS / "RELEASE.md",
            SDKWORK_MODELS / "releases" / "README.md",
            ROOT / "docs" / "32-sdkwork-models-standard.md",
            ROOT / "docs" / "33-sdkwork-models-install-flow.md",
            ROOT / "README.md",
        ]
        tokens = [
            "sources/official-verification-policy.json",
            "schemas/official-verification-policy.schema.json",
            "requiredVerifiedVendorRegions",
            "official_verified",
            "release gate",
        ]
        for doc in docs:
            source = read_text(doc)
            with self.subTest(path=doc.relative_to(ROOT).as_posix()):
                for token in tokens:
                    self.assertIn(token, source)

    def test_catalog_manifest_and_index_versions_match(self) -> None:
        manifest = load_json(SDKWORK_MODELS / "sdkwork-models.json")
        index = load_json(SDKWORK_MODELS / "models" / "index.json")
        self.assertEqual("sdkwork-models", manifest.get("name"))
        self.assertEqual(manifest.get("catalogVersion"), index.get("catalogVersion"))
        self.assertRegex(manifest.get("schemaVersion", ""), r"^\d+\.\d+\.\d+$")
        self.assertRegex(manifest.get("catalogVersion", ""), r"^\d{4}\.\d{2}\.\d{2}\.\d+$")

    def test_catalog_index_declares_remote_loadable_vendor_files(self) -> None:
        index = load_json(SDKWORK_MODELS / "models" / "index.json")
        for vendor in index.get("vendors", []):
            with self.subTest(vendor=f"{vendor.get('vendorCode')}/{vendor.get('regionCode')}"):
                model_files = vendor.get("modelFiles")
                pricing_files = vendor.get("pricingFiles")
                self.assertIsInstance(model_files, list)
                self.assertIsInstance(pricing_files, list)
                self.assertEqual(vendor.get("modelCount"), len(model_files))
                self.assertEqual(vendor.get("pricingFileCount"), len(pricing_files))
                for rel_path in [vendor.get("path"), vendor.get("familiesPath"), vendor.get("rankingsPath"), *model_files, *pricing_files]:
                    self.assertIsInstance(rel_path, str)
                    self.assertTrue((SDKWORK_MODELS / "models" / rel_path).is_file(), rel_path)

    def test_catalog_index_schema_defines_file_level_remote_manifest_contract(self) -> None:
        schema = load_json(SDKWORK_MODELS / "schemas" / "index.schema.json")
        required = schema.get("required", [])
        self.assertIn("vendors", required)
        vendor_schema = schema.get("$defs", {}).get("vendorRegionIndex", {})
        vendor_required = vendor_schema.get("required", [])
        for field in [
            "vendorCode",
            "regionCode",
            "catalogKeyPrefix",
            "path",
            "familiesPath",
            "modelsPath",
            "modelFiles",
            "pricingPath",
            "pricingFiles",
            "rankingsPath",
            "sha256",
        ]:
            with self.subTest(field=field):
                self.assertIn(field, vendor_required)
        self.assertEqual(
            "^[a-z0-9_]+/$",
            vendor_schema["properties"]["catalogKeyPrefix"]["pattern"],
        )
        self.assertEqual(
            "^[a-z0-9_]+/[a-z0-9_]+/models/[^\\\\]+\\.json$",
            vendor_schema["properties"]["modelFiles"]["items"]["pattern"],
        )
        self.assertEqual(
            "^[a-z0-9_]+/[a-z0-9_]+/pricing/[^\\\\]+\\.json$",
            vendor_schema["properties"]["pricingFiles"]["items"]["pattern"],
        )

    def test_catalog_tools_accept_slash_delimited_model_ids_as_safe_nested_paths(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            copy_catalog_workspace(temp_root)
            vendor_root = temp_root / "models" / "openrouter" / "global"
            model_dir = vendor_root / "models" / "anthropic"
            pricing_dir = vendor_root / "pricing" / "anthropic"
            model_dir.mkdir(parents=True)
            pricing_dir.mkdir(parents=True)
            (vendor_root / "vendor.json").write_text(
                json.dumps(
                    {
                        "schemaVersion": "1.1.0",
                        "vendorCode": "openrouter",
                        "regionCode": "global",
                        "displayName": "OpenRouter",
                        "vendorType": "commercial",
                        "marketScope": "global",
                        "billingCurrency": "USD",
                        "billingJurisdiction": "US",
                        "operatingRegions": ["GLOBAL"],
                        "capabilities": ["chat"],
                        "supportedProtocols": ["openai_compatible"],
                        "clientApiCompatibility": unsupported_client_api_compatibility(),
                        "source": {"sourceUrl": "https://openrouter.ai", "observedAt": "2026-06-02"},
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            (vendor_root / "families.json").write_text(
                json.dumps(
                    {
                        "schemaVersion": "1.1.0",
                        "vendorCode": "openrouter",
                        "regionCode": "global",
                        "families": [
                            {
                                "familyCode": "anthropic",
                                "displayName": "Anthropic via OpenRouter",
                                "familyType": "llm",
                                "primaryModality": "text",
                                "defaultModel": "anthropic/claude-3-opus",
                            }
                        ],
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            model_payload = {
                "schemaVersion": "1.1.0",
                "catalogKey": "openrouter/anthropic/claude-3-opus",
                "modelId": "anthropic/claude-3-opus",
                "displayName": "Claude 3 Opus through OpenRouter",
                "vendorCode": "openrouter",
                "regionCode": "global",
                "familyCode": "anthropic",
                "primaryCapability": "chat",
                "capabilities": ["chat"],
                "inputModalities": ["text"],
                "outputModalities": ["text"],
                "apiFormat": "openai_compatible",
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": {"sourceUrl": "https://openrouter.ai", "observedAt": "2026-06-02"},
            }
            (model_dir / "claude-3-opus.json").write_text(
                json.dumps(model_payload, indent=2) + "\n",
                encoding="utf-8",
            )
            (pricing_dir / "claude-3-opus.json").write_text(
                json.dumps(
                    {
                        "schemaVersion": "1.1.0",
                        "catalogKey": "openrouter/anthropic/claude-3-opus",
                        "vendorCode": "openrouter",
                        "regionCode": "global",
                        "modelId": "anthropic/claude-3-opus",
                        "currency": "USD",
                        "prices": [
                            {
                                "priceId": "openrouter-claude-opus-input",
                                "priceSide": "reference",
                                "pricingScope": "model",
                                "meterCode": "llm_input_token",
                                "unitSize": "1000000",
                                "unitPrice": "15.000000",
                                "minimumQuantity": "0",
                                "currency": "USD",
                                "effectiveFrom": "2026-06-02",
                                "source": {"sourceUrl": "https://openrouter.ai", "observedAt": "2026-06-02"},
                            }
                        ],
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            (vendor_root / "rankings.json").write_text(
                json.dumps(
                    {
                        "schemaVersion": "1.1.0",
                        "vendorCode": "openrouter",
                        "regionCode": "global",
                        "snapshots": [],
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            build_result = subprocess.run(
                ["node", "tools/build-index.mjs"],
                cwd=temp_root,
                text=True,
                capture_output=True,
                env=catalog_subprocess_env(),
            )
            validate_result = subprocess.run(
                ["node", "tools/validate-catalog.mjs"],
                cwd=temp_root,
                text=True,
                capture_output=True,
                env=catalog_subprocess_env(),
            )

            self.assertEqual(0, build_result.returncode, build_result.stdout + build_result.stderr)
            self.assertEqual(0, validate_result.returncode, validate_result.stdout + validate_result.stderr)

            index = load_json(temp_root / "models" / "index.json")
            openrouter = next(
                vendor
                for vendor in index["vendors"]
                if vendor["vendorCode"] == "openrouter" and vendor["regionCode"] == "global"
            )
            self.assertIn("openrouter/global/models/anthropic/claude-3-opus.json", openrouter["modelFiles"])
            self.assertIn("openrouter/global/pricing/anthropic/claude-3-opus.json", openrouter["pricingFiles"])
            self.assertEqual("openrouter/", openrouter["catalogKeyPrefix"])

    def test_official_snapshot_schema_defines_source_evidence_contract(self) -> None:
        schema = load_json(SDKWORK_MODELS / "schemas" / "official-model-snapshot.schema.json")
        required = schema.get("required", [])
        for field in ["schemaVersion", "catalogVersion", "observedAt", "vendors"]:
            with self.subTest(field=field):
                self.assertIn(field, required)

        vendor_schema = schema.get("$defs", {}).get("vendorSnapshot", {})
        vendor_required = vendor_schema.get("required", [])
        for field in ["vendorCode", "regionCode", "observedAt", "officialUrls", "models", "sourceSnapshotHash"]:
            with self.subTest(vendor_field=field):
                self.assertIn(field, vendor_required)

        self.assertEqual(
            "^[a-z0-9_]+$",
            vendor_schema["properties"]["vendorCode"]["pattern"],
        )
        self.assertEqual(
            "^[a-z0-9_]+$",
            vendor_schema["properties"]["regionCode"]["pattern"],
        )
        self.assertEqual(1, vendor_schema["properties"]["officialUrls"]["minItems"])
        self.assertEqual(1, vendor_schema["properties"]["models"]["minItems"])
        self.assertEqual(
            "^[a-f0-9]{64}$",
            vendor_schema["properties"]["sourceSnapshotHash"]["pattern"],
        )
        model_schema = schema.get("$defs", {}).get("modelSnapshot", {})
        self.assertIn("modelId", model_schema.get("required", []))

    def test_vendor_sources_schema_defines_update_source_contract(self) -> None:
        schema = load_json(SDKWORK_MODELS / "schemas" / "vendor-sources.schema.json")
        required = schema.get("required", [])
        for field in ["schemaVersion", "catalogVersion", "observedAt", "policy", "vendors"]:
            with self.subTest(field=field):
                self.assertIn(field, required)

        vendor_schema = schema.get("$defs", {}).get("vendorSource", {})
        vendor_required = vendor_schema.get("required", [])
        for field in [
            "vendorCode",
            "regionCode",
            "verificationStatus",
            "official",
            "lastCheckedAt",
            "requiredModels",
        ]:
            with self.subTest(vendor_field=field):
                self.assertIn(field, vendor_required)

        self.assertEqual(
            ["official_url_declared", "official_verified"],
            vendor_schema["properties"]["verificationStatus"]["enum"],
        )
        official_schema = schema.get("$defs", {}).get("officialSource", {})
        self.assertEqual(
            ["modelsUrl", "pricingUrl"],
            official_schema.get("required", []),
        )

    def test_official_verification_policy_schema_defines_release_gate_contract(self) -> None:
        schema = load_json(SDKWORK_MODELS / "schemas" / "official-verification-policy.schema.json")
        required = schema.get("required", [])
        for field in [
            "schemaVersion",
            "catalogVersion",
            "generatedAt",
            "policy",
            "requiredVerifiedVendorRegions",
        ]:
            with self.subTest(field=field):
                self.assertIn(field, required)

        policy_schema = schema.get("$defs", {}).get("policy", {})
        self.assertEqual(
            ["mode", "description"],
            policy_schema.get("required", []),
        )
        self.assertEqual(
            ["release_gate"],
            policy_schema["properties"]["mode"]["enum"],
        )

        vendor_region_schema = schema.get("$defs", {}).get("requiredVerifiedVendorRegion", {})
        vendor_region_required = vendor_region_schema.get("required", [])
        for field in ["vendorCode", "regionCode", "reason"]:
            with self.subTest(vendor_region_field=field):
                self.assertIn(field, vendor_region_required)
        self.assertEqual(
            "^[a-z0-9_]+$",
            vendor_region_schema["properties"]["vendorCode"]["pattern"],
        )
        self.assertEqual(
            "^[a-z0-9_]+$",
            vendor_region_schema["properties"]["regionCode"]["pattern"],
        )
        self.assertEqual(
            1,
            schema["properties"]["requiredVerifiedVendorRegions"]["minItems"],
        )

    def test_validator_reports_explicit_index_file_manifest_mismatch(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            copy_catalog_workspace(temp_root)
            index_path = temp_root / "models" / "index.json"
            index = load_json(index_path)
            target_vendor = next(vendor for vendor in index["vendors"] if vendor["modelFiles"])
            target_vendor["modelFiles"] = target_vendor["modelFiles"][:-1]
            target_vendor["modelCount"] = len(target_vendor["modelFiles"])
            index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

            result = subprocess.run(
                [
                    "node",
                    "--input-type=module",
                    "-e",
                    "import { validateCatalog } from './tools/validate-catalog.mjs'; console.log(JSON.stringify(validateCatalog(process.cwd())));",
                ],
                cwd=temp_root,
                text=True,
                capture_output=True,
                env=catalog_subprocess_env(),
            )

            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            report = json.loads(result.stdout)
            issue_codes = {issue["code"] for issue in report["issues"]}
            self.assertIn("index.model_files.mismatch", issue_codes)

    def test_catalog_uses_vendor_region_directories(self) -> None:
        vendors = load_json(SDKWORK_MODELS / "models" / "vendors.json").get("vendors", [])
        self.assertGreaterEqual(len(vendors), 3)
        for vendor in vendors:
            vendor_code = vendor["vendorCode"]
            vendor_dir = SDKWORK_MODELS / "models" / vendor_code
            with self.subTest(vendor=vendor_code):
                self.assertTrue(vendor_dir.is_dir())
                self.assertFalse((vendor_dir / "vendor.json").exists())
                self.assertGreaterEqual(len(vendor.get("regions", [])), 1)
                for region in vendor["regions"]:
                    region_dir = vendor_dir / region["regionCode"]
                    self.assertTrue((region_dir / "vendor.json").exists())
                    self.assertTrue((region_dir / "families.json").exists())
                    self.assertTrue((region_dir / "models").is_dir())
                    self.assertTrue((region_dir / "pricing").is_dir())

    def test_vendor_standard_uses_unique_vendor_identity_with_regions(self) -> None:
        schema = load_json(SDKWORK_MODELS / "schemas" / "vendor.schema.json")
        self.assertIn("regionCode", schema.get("required", []))
        self.assertNotIn("vendorGroupCode", schema.get("required", []))

        vendors = load_json(SDKWORK_MODELS / "models" / "vendors.json").get("vendors", [])
        for vendor in vendors:
            with self.subTest(vendor=vendor["vendorCode"]):
                self.assertRegex(vendor.get("vendorCode", ""), r"^[a-z0-9_]+$")
                self.assertIn("regions", vendor)
                self.assertNotIn("qwen", vendor["vendorCode"])
                self.assertNotIn("kling", vendor["vendorCode"])
                self.assertNotIn("hunyuan", vendor["vendorCode"])
                self.assertNotIn("bigmodel", vendor["vendorCode"])
                self.assertNotRegex(vendor["vendorCode"], r"_(cn|global)$")

    def test_vendor_client_api_compatibility_is_structured_and_readable(self) -> None:
        required_client_apis = {
            "codex": {
                "displayName": "Codex",
                "defaultApiCode": "openai.codex.responses",
                "defaultResourceCode": "api.openai.codex",
            },
            "claude_code": {
                "displayName": "Claude Code",
                "defaultApiCode": "anthropic.claude_code",
                "defaultResourceCode": "api.anthropic.claude_code",
            },
            "gemini_cli": {
                "displayName": "Gemini CLI",
                "defaultApiCode": "gemini.generate_content",
                "defaultResourceCode": "api.gemini.generate_content",
            },
        }
        schema = load_json(SDKWORK_MODELS / "schemas" / "vendor.schema.json")
        self.assertIn("clientApiCompatibility", schema.get("required", []))
        compatibility_schema = schema["properties"]["clientApiCompatibility"]
        self.assertEqual("object", compatibility_schema["type"])
        for client_code in required_client_apis:
            self.assertIn(client_code, compatibility_schema.get("required", []))

        vendors_index = load_json(SDKWORK_MODELS / "models" / "vendors.json")
        self.assertIn("clientApiCompatibility", vendors_index["vendors"][0])
        self.assertIn("clientApiCompatibility", vendors_index["vendors"][0]["regions"][0])

        resource_payloads = [
            load_json(SDKWORK_MODELS.parent / "ai-routing" / "resources" / "openai-resources.json"),
            load_json(SDKWORK_MODELS.parent / "ai-routing" / "resources" / "vendor-native-resources.json"),
        ]
        resource_codes = {
            item["resourceCode"]
            for payload in resource_payloads
            for item in payload.get("items", [])
        }
        api_codes = {
            item["apiCode"]
            for payload in resource_payloads
            for item in payload.get("items", [])
        }

        for vendor_path in sorted((SDKWORK_MODELS / "models").glob("*/*/vendor.json")):
            vendor = load_json(vendor_path)
            compatibility = vendor.get("clientApiCompatibility")
            with self.subTest(vendor=vendor_path.relative_to(SDKWORK_MODELS).as_posix()):
                self.assertIsInstance(compatibility, dict)
                for client_code, client_standard in required_client_apis.items():
                    item = compatibility.get(client_code)
                    self.assertIsInstance(item, dict)
                    self.assertEqual(client_code, item.get("clientApiCode"))
                    self.assertEqual(client_standard["displayName"], item.get("displayName"))
                    self.assertIn(item.get("supportStatus"), CLIENT_API_SUPPORT_STATUSES)
                    self.assertIsInstance(item.get("notes"), str)
                    self.assertTrue(item.get("source", {}).get("sourceUrl"))
                    self.assertTrue(item.get("source", {}).get("observedAt"))
                    if item.get("supportStatus") in {"supported", "partial"}:
                        self.assertIn(
                            client_standard["defaultApiCode"],
                            item.get("apiCodes", []),
                        )
                        self.assertIn(
                            client_standard["defaultResourceCode"],
                            item.get("resourceCodes", []),
                        )
                    for api_code in item.get("apiCodes", []):
                        self.assertIn(api_code, api_codes)
                    for resource_code in item.get("resourceCodes", []):
                        self.assertIn(resource_code, resource_codes)

        ts_types = read_text(lang_sdk("typescript") / "src" / "types.ts")
        ts_query = read_text(lang_sdk("typescript") / "src" / "query.ts")
        py_query = read_text(lang_sdk("python") / "sdkwork_models" / "query.py")
        rust_types = read_text(lang_sdk("rust") / "src" / "types.rs")
        rust_query = read_text(lang_sdk("rust") / "src" / "query.rs")
        for source, token in [
            (ts_types, "clientApiCompatibility"),
            (ts_query, "listClientApiCompatibilityByVendor"),
            (py_query, "list_client_api_compatibility_by_vendor"),
            (rust_types, "client_api_compatibility"),
            (rust_query, "list_client_api_compatibility_by_vendor"),
        ]:
            self.assertIn(token, source)

        registry = load_json_from_yaml(
            ROOT.parent / "sdkwork-models" / "docs" / "schema-registry" / "tables" / "001-catalog.yaml"
        )
        ai_model_vendor = next(
            table for table in registry["tables"] if table.get("table") == "ai_model_vendor"
        )
        self.assertIn("supported_protocols", ai_model_vendor["columns"])
        self.assertIn("client_api_compatibility", ai_model_vendor["columns"])
        models_baseline = read_text(
            ROOT.parent
            / "sdkwork-models"
            / "database"
            / "ddl"
            / "baseline"
            / "postgres"
            / "0001_sdkwork-models_baseline.sql"
        )
        self.assertIn("supported_protocols JSONB", models_baseline)
        self.assertIn("client_api_compatibility JSONB", models_baseline)
        generated_schema = read_text(ROOT / "generated" / "schema" / "postgres" / "schema.sql")
        self.assertNotIn("CREATE TABLE IF NOT EXISTS ai_model_vendor (", generated_schema)
        for importer in [
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "model_catalog_import.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "model_catalog_import.rs",
        ]:
            source = read_text(importer)
            self.assertIn("supported_protocols", source)
            self.assertIn("client_api_compatibility", source)

    def test_prices_are_decimal_strings(self) -> None:
        for pricing_path in sorted((SDKWORK_MODELS / "models").glob("*/*/pricing/**/*.json")):
            payload = load_json(pricing_path)
            for index, price in enumerate(payload.get("prices", [])):
                for field in ("unitSize", "unitPrice", "minimumQuantity"):
                    with self.subTest(path=pricing_path, index=index, field=field):
                        self.assertIsInstance(price.get(field), str)
                        self.assertRegex(price[field], r"^(0|[1-9][0-9]*)(\.[0-9]+)?$")
                self.assertTrue(price.get("source", {}).get("sourceUrl"))
                self.assertTrue(price.get("source", {}).get("observedAt"))
                self.assertTrue(price.get("effectiveFrom"))

    def test_enabled_or_listed_models_have_billable_pricing(self) -> None:
        for model_path in sorted((SDKWORK_MODELS / "models").glob("*/*/models/**/*.json")):
            model = load_json(model_path)
            must_have_pricing = (
                model.get("routingState") == "enabled"
                or model.get("shelfState") == "listed"
                or model.get("releaseStage") == "active"
            )
            if not must_have_pricing:
                continue

            pricing_path = pricing_path_for_model_path(model_path)
            with self.subTest(model=model.get("catalogKey")):
                self.assertTrue(pricing_path.exists(), str(pricing_path))
                pricing = load_json(pricing_path)
                self.assertGreater(len(pricing.get("prices", [])), 0)

    def test_family_default_model_points_to_enabled_listed_priced_model(self) -> None:
        for families_path in sorted((SDKWORK_MODELS / "models").glob("*/*/families.json")):
            families = load_json(families_path)
            model_dir = families_path.parent / "models"
            pricing_dir = families_path.parent / "pricing"
            models = {
                model_id_from_catalog_file(model_dir, path): load_json(path)
                for path in sorted(model_dir.glob("**/*.json"))
            }
            for family in families.get("families", []):
                default_model = family.get("defaultModel")
                if not default_model:
                    continue
                with self.subTest(family=f"{families_path.parent.parent.name}/{families_path.parent.name}/{family.get('familyCode')}"):
                    self.assertIn(default_model, models)
                    model = models[default_model]
                    self.assertEqual("enabled", model.get("routingState"))
                    self.assertEqual("listed", model.get("shelfState"))
                    self.assertTrue((pricing_dir / f"{default_model}.json").exists())

    def test_validator_and_index_check_pass(self) -> None:
        ensure_catalog_utils_dependency()
        for command in (
            ["node", "tools/build-index.mjs", "--check"],
            ["node", "tools/validate-catalog.mjs"],
            [
                "node",
                "tools/freshness-report.mjs",
                "--max-age-policy",
                "catalog-freshness-policy.json",
                "--as-of",
                "2026-05-08",
            ],
            ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
            ["node", "tools/release-catalog.mjs", "--check", "--as-of", "2026-05-08"],
        ):
            with self.subTest(command=" ".join(command)):
                result = subprocess.run(
                    command,
                    cwd=SDKWORK_MODELS,
                    text=True,
                    capture_output=True,
                    env=catalog_subprocess_env(),
                )
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_installer_no_longer_owns_public_model_catalog_seed_arrays(self) -> None:
        source = read_text(RUST_INSTALLER_PATH)
        forbidden = [
            "OPENAI_ACTIVE_MODEL_SEEDS",
            "GLOBAL_MODEL_SEEDS",
            "global_model_catalog_seed_sql",
            "global_model_pricing_seed_sql",
            "global_model_ranking_seed_sql",
        ]
        for symbol in forbidden:
            with self.subTest(symbol=symbol):
                self.assertNotIn(symbol, source)
        self.assertIn("sdkwork_models", source)


if __name__ == "__main__":
    unittest.main()
