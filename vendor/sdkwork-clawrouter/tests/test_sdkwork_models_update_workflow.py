import json
import hashlib
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SDKWORK_MODELS = ROOT / "data" / "sdkwork-models"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def model_id_from_catalog_file(path: Path) -> str:
    payload = load_json(path)
    model_id = payload.get("modelId")
    return model_id if isinstance(model_id, str) and model_id else path.stem


def stable_json(value: object) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True)


def snapshot_hash(snapshot: dict) -> str:
    canonical = dict(snapshot)
    canonical.pop("sourceSnapshotHash", None)
    return hashlib.sha256(stable_json(canonical).encode("utf-8")).hexdigest()


class SdkworkModelsUpdateWorkflowTest(unittest.TestCase):
    def test_catalog_update_tools_and_release_files_exist(self) -> None:
        required = [
            "tools/catalog-audit.mjs",
            "tools/catalog-diff.mjs",
            "tools/freshness-report.mjs",
            "tools/release-catalog.mjs",
            "sources/vendor-sources.json",
            "sources/official-model-snapshots.json",
            "sources/official-verification-policy.json",
            "catalog-freshness-policy.json",
            "releases/README.md",
            "RELEASE.md",
        ]
        for rel in required:
            with self.subTest(path=rel):
                self.assertTrue((SDKWORK_MODELS / rel).exists(), rel)

    def test_catalog_freshness_report_passes_for_release_date(self) -> None:
        result = subprocess.run(
            [
                "node",
                "tools/freshness-report.mjs",
                "--max-age-policy",
                "catalog-freshness-policy.json",
                "--as-of",
                "2026-05-08",
            ],
            cwd=SDKWORK_MODELS,
            text=True,
            capture_output=True,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report["ok"])
        self.assertEqual([], report["staleSources"])

    def test_release_metadata_tracks_catalog_version_and_freshness(self) -> None:
        manifest = load_json(SDKWORK_MODELS / "sdkwork-models.json")
        release = load_json(
            SDKWORK_MODELS / "releases" / f"{manifest['catalogVersion']}.json"
        )
        self.assertEqual(manifest["catalogVersion"], release["catalogVersion"])
        self.assertEqual(manifest["schemaVersion"], release["schemaVersion"])
        self.assertIn("vendorChanges", release)
        self.assertIn("freshnessReport", release)
        self.assertIn("sourceEvidenceSha256", release)
        self.assertIn("vendorSources", release["sourceEvidenceSha256"])
        self.assertIn("officialModelSnapshots", release["sourceEvidenceSha256"])
        self.assertIn("officialVerificationPolicy", release["sourceEvidenceSha256"])
        self.assertIn("requiredVerifiedRegionCount", release["sourceAudit"])
        self.assertIn("officialVerifiedSourceRegionCount", release["sourceAudit"])
        self.assertIn("requiredVerifiedRegions", release["sourceAudit"])
        self.assertIn("officialVerifiedSourceRegions", release["sourceAudit"])
        self.assertIn("officialSnapshotHashes", release["sourceEvidenceSha256"])
        self.assertEqual(6, release["sourceAudit"]["requiredVerifiedRegionCount"])
        self.assertEqual(
            [
                "deepseek/cn",
                "deepseek/global",
                "minimax/cn",
                "minimax/global",
                "moonshot/cn",
                "moonshot/global",
            ],
            release["sourceAudit"]["requiredVerifiedRegions"],
        )
        self.assertEqual(
            release["sourceAudit"]["officialVerifiedSourceRegionCount"],
            release["sourceAudit"]["requiredVerifiedRegionCount"],
        )
        self.assertEqual(
            release["sourceAudit"]["requiredVerifiedRegions"],
            release["sourceAudit"]["officialVerifiedSourceRegions"],
        )
        self.assertTrue(release["freshnessReport"]["ok"])
        self.assertEqual(0, release["validation"]["issueCount"])

    def test_official_model_snapshots_record_per_vendor_region_snapshot_hash(self) -> None:
        snapshots = load_json(SDKWORK_MODELS / "sources" / "official-model-snapshots.json")
        required_regions = {
            f"{vendor['vendorCode']}/{vendor.get('regionCode', 'global')}"
            for vendor in snapshots["vendors"]
        }
        self.assertEqual(6, len(required_regions))

        for vendor in snapshots["vendors"]:
            vendor_region = f"{vendor['vendorCode']}/{vendor.get('regionCode', 'global')}"
            with self.subTest(vendor_region=vendor_region):
                self.assertRegex(vendor.get("sourceSnapshotHash", ""), r"^[a-f0-9]{64}$")
                self.assertEqual(snapshot_hash(vendor), vendor["sourceSnapshotHash"])

    def test_release_metadata_records_official_snapshot_hashes_by_vendor_region(self) -> None:
        manifest = load_json(SDKWORK_MODELS / "sdkwork-models.json")
        snapshots = load_json(SDKWORK_MODELS / "sources" / "official-model-snapshots.json")
        release = load_json(
            SDKWORK_MODELS / "releases" / f"{manifest['catalogVersion']}.json"
        )
        expected = {
            f"{vendor['vendorCode']}/{vendor.get('regionCode', 'global')}": vendor["sourceSnapshotHash"]
            for vendor in snapshots["vendors"]
        }
        self.assertEqual(expected, release["sourceEvidenceSha256"]["officialSnapshotHashes"])

    def test_release_check_passes_for_current_catalog(self) -> None:
        result = subprocess.run(
            ["node", "tools/release-catalog.mjs", "--check", "--as-of", "2026-05-08"],
            cwd=SDKWORK_MODELS,
            text=True,
            capture_output=True,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_catalog_audit_passes_for_current_vendor_sources(self) -> None:
        result = subprocess.run(
            ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
            cwd=SDKWORK_MODELS,
            text=True,
            capture_output=True,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report["ok"])
        self.assertEqual([], report["errors"])
        self.assertGreaterEqual(report["vendorCount"], 17)

    def test_catalog_audit_enforces_independent_official_model_snapshots(self) -> None:
        result = subprocess.run(
            ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
            cwd=SDKWORK_MODELS,
            text=True,
            capture_output=True,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        for vendor in report["vendors"]:
            with self.subTest(vendor=vendor["vendorCode"]):
                if vendor["verificationStatus"] == "official_verified":
                    self.assertGreater(
                        vendor["officialSnapshotModelCount"],
                        0,
                        "official_verified vendors must have an independent official snapshot",
                    )
                    self.assertEqual(
                        [],
                        vendor["missingOfficialSnapshotModels"],
                        "required/enabled models must be covered by the official snapshot",
                    )

    def test_official_model_snapshots_track_current_catalog_version(self) -> None:
        manifest = load_json(SDKWORK_MODELS / "sdkwork-models.json")
        snapshots = load_json(SDKWORK_MODELS / "sources" / "official-model-snapshots.json")
        self.assertEqual(manifest["schemaVersion"], snapshots["schemaVersion"])
        self.assertEqual(manifest["catalogVersion"], snapshots["catalogVersion"])

    def test_vendor_sources_track_current_catalog_version(self) -> None:
        manifest = load_json(SDKWORK_MODELS / "sdkwork-models.json")
        sources = load_json(SDKWORK_MODELS / "sources" / "vendor-sources.json")
        self.assertEqual(manifest["schemaVersion"], sources["schemaVersion"])
        self.assertEqual(manifest["catalogVersion"], sources["catalogVersion"])

    def test_catalog_audit_rejects_invalid_official_snapshot_contract(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            snapshots_path = temp_root / "sources" / "official-model-snapshots.json"
            snapshots = load_json(snapshots_path)
            deepseek_cn = next(
                vendor
                for vendor in snapshots["vendors"]
                if vendor["vendorCode"] == "deepseek" and vendor["regionCode"] == "cn"
            )
            deepseek_cn["officialUrls"].append("https://unapproved.example.com/models")
            deepseek_cn["models"].append({"modelId": deepseek_cn["models"][0]["modelId"]})
            deepseek_cn["models"].append({"modelId": "not-in-catalog"})
            snapshots_path.write_text(
                json.dumps(snapshots, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_snapshot.url.unapproved", issue_codes)
        self.assertIn("official_snapshot.model.duplicate", issue_codes)
        self.assertIn("official_snapshot.model.unknown", issue_codes)

    def test_catalog_audit_rejects_official_snapshot_hash_mismatch(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            snapshots_path = temp_root / "sources" / "official-model-snapshots.json"
            snapshots = load_json(snapshots_path)
            snapshots["vendors"][0]["officialUrls"].append(
                snapshots["vendors"][0]["officialUrls"][0] + "#hash-mismatch"
            )
            snapshots_path.write_text(
                json.dumps(snapshots, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_snapshot.hash.mismatch", issue_codes)

    def test_catalog_audit_rejects_stale_or_unmapped_official_snapshots(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            snapshots_path = temp_root / "sources" / "official-model-snapshots.json"
            snapshots = load_json(snapshots_path)
            snapshots["catalogVersion"] = "2000.01.01.1"
            snapshots["vendors"].append(
                {
                    "vendorCode": "ghost_vendor",
                    "regionCode": "global",
                    "observedAt": "2026-05-08T00:00:00Z",
                    "officialUrls": ["https://example.com/models"],
                    "models": [{"modelId": "ghost-model"}],
                }
            )
            snapshots_path.write_text(
                json.dumps(snapshots, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_snapshot.catalog_version.mismatch", issue_codes)
        self.assertIn("official_snapshot.vendor_source.missing", issue_codes)
        self.assertIn("official_snapshot.vendor_catalog.missing", issue_codes)

    def test_catalog_audit_rejects_duplicate_vendor_source_regions(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            sources_path = temp_root / "sources" / "vendor-sources.json"
            sources = load_json(sources_path)
            sources["vendors"].append(dict(sources["vendors"][0]))
            sources_path.write_text(
                json.dumps(sources, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("vendor.source.duplicate", issue_codes)

    def test_catalog_audit_rejects_stale_vendor_source_manifest_version(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            sources_path = temp_root / "sources" / "vendor-sources.json"
            sources = load_json(sources_path)
            sources["schemaVersion"] = "0.0.1"
            sources["catalogVersion"] = "2000.01.01.1"
            sources_path.write_text(
                json.dumps(sources, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("vendor_sources.schema_version.mismatch", issue_codes)
        self.assertIn("vendor_sources.catalog_version.mismatch", issue_codes)

    def test_catalog_audit_rejects_vendor_sources_schema_violations(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            sources_path = temp_root / "sources" / "vendor-sources.json"
            sources = load_json(sources_path)
            del sources["vendors"][0]["official"]["modelsUrl"]
            sources_path.write_text(
                json.dumps(sources, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("schema.vendor_sources.required", issue_codes)

    def test_catalog_audit_rejects_official_snapshot_schema_violations(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            snapshots_path = temp_root / "sources" / "official-model-snapshots.json"
            snapshots = load_json(snapshots_path)
            del snapshots["vendors"][0]["models"]
            snapshots_path.write_text(
                json.dumps(snapshots, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("schema.official_model_snapshots.required", issue_codes)

    def test_catalog_audit_enforces_official_verification_policy(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            policy_path = temp_root / "sources" / "official-verification-policy.json"
            policy = load_json(policy_path)
            policy["requiredVerifiedVendorRegions"].append(
                {
                    "vendorCode": "openai",
                    "regionCode": "global",
                    "reason": "frontier vendor release gate",
                }
            )
            policy_path.write_text(
                json.dumps(policy, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "node",
                    "tools/catalog-audit.mjs",
                    "--as-of",
                    "2026-05-08",
                    "--official-verification-policy",
                    "sources/official-verification-policy.json",
                ],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_verification.required_status", issue_codes)
        self.assertIn("official_verification.required_snapshot", issue_codes)

    def test_catalog_audit_rejects_official_verification_policy_schema_violations(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            policy_path = temp_root / "sources" / "official-verification-policy.json"
            policy = load_json(policy_path)
            del policy["requiredVerifiedVendorRegions"][0]["reason"]
            policy["policy"]["mode"] = "advisory"
            policy_path.write_text(
                json.dumps(policy, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("schema.official_verification_policy.required", issue_codes)
        self.assertIn("schema.official_verification_policy.enum", issue_codes)

    def test_catalog_audit_requires_official_verification_policy_file(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            (temp_root / "sources" / "official-verification-policy.json").unlink()

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_verification_policy.missing", issue_codes)

    def test_catalog_audit_rejects_duplicate_official_verification_policy_regions(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            policy_path = temp_root / "sources" / "official-verification-policy.json"
            policy = load_json(policy_path)
            duplicate = dict(policy["requiredVerifiedVendorRegions"][0])
            duplicate["reason"] = "duplicate release gate entry should be rejected"
            policy["requiredVerifiedVendorRegions"].append(duplicate)
            policy_path.write_text(
                json.dumps(policy, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_verification.policy.duplicate", issue_codes)

    def test_catalog_audit_requires_official_verified_sources_in_release_gate(self) -> None:
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "sdkwork-models"
            shutil.copytree(
                SDKWORK_MODELS,
                temp_root,
                ignore=shutil.ignore_patterns(
                    "sdkwork-models-typescript/dist",
                    "sdkwork-models-rust/target",
                    "sdkwork-models-java/target",
                    "target-codex",
                    "__pycache__",
                ),
            )
            policy_path = temp_root / "sources" / "official-verification-policy.json"
            policy = load_json(policy_path)
            policy["requiredVerifiedVendorRegions"] = [
                region
                for region in policy["requiredVerifiedVendorRegions"]
                if not (
                    region["vendorCode"] == "deepseek"
                    and region["regionCode"] == "cn"
                )
            ]
            policy_path.write_text(
                json.dumps(policy, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                ["node", "tools/catalog-audit.mjs", "--as-of", "2026-05-08"],
                cwd=temp_root,
                text=True,
                capture_output=True,
            )

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        issue_codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("official_verification.policy.missing", issue_codes)

    def test_frontier_vendor_catalog_contains_current_verified_models(self) -> None:
        expected_models = {
            "openai": {
                "gpt-5.5",
                "gpt-5.4",
                "gpt-5.4-pro",
                "gpt-5.5-pro",
                "gpt-5.4-mini",
                "gpt-5.4-nano",
                "gpt-image-2",
                "gpt-realtime-1.5",
            },
            "anthropic": {
                "claude-sonnet-4-6",
                "claude-haiku-4-5",
                "claude-opus-4-7",
            },
            "google": {
                "gemini-3.1-pro-preview",
                "gemini-3-flash-preview",
                "gemini-3.1-flash-lite",
                "gemini-3.1-flash-lite-preview",
                "gemini-3.1-flash-live-preview",
                "gemini-3.1-flash-image-preview",
                "gemini-3.1-flash-tts-preview",
                "veo-3.1-generate-preview",
                "veo-3.1-fast-generate-preview",
                "veo-3.1-lite-generate-preview",
            },
            ("deepseek", "global"): {
                "deepseek-v4-pro",
                "deepseek-v4-flash",
            },
            ("deepseek", "cn"): {
                "deepseek-v4-pro",
                "deepseek-v4-flash",
            },
            ("moonshot", "global"): {
                "kimi-k2.6",
            },
            ("moonshot", "cn"): {
                "kimi-k2.6",
            },
            ("minimax", "cn"): {
                "MiniMax-M2.7",
                "MiniMax-M2.7-highspeed",
                "MiniMax-M2.5",
                "MiniMax-M2.5-highspeed",
                "M2-her",
            },
            ("minimax", "global"): {
                "MiniMax-M2.7",
                "MiniMax-M2.7-highspeed",
                "MiniMax-M2.5",
                "MiniMax-M2.5-highspeed",
                "M2-her",
            },
        }
        for vendor_key, model_ids in expected_models.items():
            if isinstance(vendor_key, tuple):
                vendor_code, region_code = vendor_key
            else:
                vendor_code, region_code = vendor_key, "global"
            model_dir = SDKWORK_MODELS / "models" / vendor_code / region_code / "models"
            pricing_dir = SDKWORK_MODELS / "models" / vendor_code / region_code / "pricing"
            actual_model_ids = {model_id_from_catalog_file(path) for path in model_dir.glob("**/*.json")}
            actual_pricing_ids = {model_id_from_catalog_file(path) for path in pricing_dir.glob("**/*.json")}
            with self.subTest(vendor=vendor_code, region=region_code, check="models"):
                self.assertTrue(model_ids.issubset(actual_model_ids), model_ids - actual_model_ids)
            with self.subTest(vendor=vendor_code, region=region_code, check="pricing"):
                self.assertTrue(model_ids.issubset(actual_pricing_ids), model_ids - actual_pricing_ids)

    def test_latest_official_pricing_uses_vendor_native_units_and_modal_meters(self) -> None:
        meters = load_json(SDKWORK_MODELS / "models" / "meters.json")["meters"]
        meter_codes = {meter["meterCode"] for meter in meters}
        for meter_code in {
            "audio_input_token",
            "audio_output_token",
            "video_input_token",
            "video_output_token",
        }:
            with self.subTest(meter=meter_code):
                self.assertIn(meter_code, meter_codes)

        qwen_price = load_json(
            SDKWORK_MODELS
            / "models"
            / "alibaba"
            / "cn"
            / "pricing"
            / "qwen3.6-max-preview.json"
        )
        self.assertEqual("CNY", qwen_price["currency"])
        self.assertEqual({price["currency"] for price in qwen_price["prices"]}, {"CNY"})

        deepseek_model = load_json(
            SDKWORK_MODELS
            / "models"
            / "deepseek"
            / "global"
            / "models"
            / "deepseek-v4-pro.json"
        )
        self.assertEqual(1048576, deepseek_model["contextTokens"])
        self.assertEqual(1048576, deepseek_model["maxInputTokens"])
        self.assertEqual(393216, deepseek_model["maxOutputTokens"])
        deepseek_price = load_json(
            SDKWORK_MODELS
            / "models"
            / "deepseek"
            / "global"
            / "pricing"
            / "deepseek-v4-pro.json"
        )
        self.assertIn(
            "llm_cache_read_token",
            {price["meterCode"] for price in deepseek_price["prices"]},
        )

        realtime_price = load_json(
            SDKWORK_MODELS
            / "models"
            / "openai"
            / "global"
            / "pricing"
            / "gpt-realtime-1.5.json"
        )
        realtime_meters = {price["meterCode"] for price in realtime_price["prices"]}
        self.assertIn("audio_input_token", realtime_meters)
        self.assertIn("audio_output_token", realtime_meters)
        self.assertNotIn("audio_input_second", realtime_meters)
        self.assertNotIn("audio_output_second", realtime_meters)

        google_model_ids = {
            model_id_from_catalog_file(path)
            for path in (SDKWORK_MODELS / "models" / "google" / "global" / "models").glob("**/*.json")
        }
        self.assertIn("veo-3.1-generate-preview", google_model_ids)
        self.assertIn("veo-3.1-fast-generate-preview", google_model_ids)
        self.assertIn("veo-3.1-lite-generate-preview", google_model_ids)
        self.assertNotIn("veo-3.1-generate-001", google_model_ids)

    def test_vendor_operating_region_and_billing_currency_are_explicit(self) -> None:
        vendors = load_json(SDKWORK_MODELS / "models" / "vendors.json")["vendors"]
        vendor_regions = {
            (vendor["vendorCode"], region["regionCode"])
            for vendor in vendors
            for region in vendor.get("regions", [])
        }

        self.assertIn(("minimax", "cn"), vendor_regions)
        self.assertIn(("minimax", "global"), vendor_regions)

        for vendor_path in sorted((SDKWORK_MODELS / "models").glob("*/*/vendor.json")):
            vendor = load_json(vendor_path)
            vendor_code = vendor["vendorCode"]
            with self.subTest(vendor=vendor_code, check="vendor_fields"):
                self.assertEqual(vendor_path.parent.parent.name, vendor["vendorCode"])
                self.assertEqual(vendor_path.parent.name, vendor["regionCode"])
                self.assertIn(vendor.get("marketScope"), {"china_mainland", "global", "international"})
                self.assertRegex(vendor.get("billingCurrency", ""), r"^[A-Z]{3}$")
                self.assertTrue(vendor.get("operatingRegions"))
                self.assertTrue(vendor.get("billingJurisdiction"))

            for pricing_path in sorted((vendor_path.parent / "pricing").glob("**/*.json")):
                pricing = load_json(pricing_path)
                price_currencies = {
                    price.get("currency", pricing.get("currency"))
                    for price in pricing.get("prices", [])
                }
                with self.subTest(vendor=vendor_code, pricing=pricing_path.name):
                    self.assertEqual(vendor["billingCurrency"], pricing["currency"])
                    self.assertEqual({vendor["billingCurrency"]}, price_currencies)

        minimax_cn = load_json(SDKWORK_MODELS / "models" / "minimax" / "cn" / "pricing" / "MiniMax-M2.7.json")
        minimax_global = load_json(SDKWORK_MODELS / "models" / "minimax" / "global" / "pricing" / "MiniMax-M2.7.json")
        self.assertEqual("CNY", minimax_cn["currency"])
        self.assertEqual("USD", minimax_global["currency"])
        self.assertEqual(
            "2.100000",
            next(price["unitPrice"] for price in minimax_cn["prices"] if price["meterCode"] == "llm_input_token"),
        )
        self.assertEqual(
            "0.300000",
            next(price["unitPrice"] for price in minimax_global["prices"] if price["meterCode"] == "llm_input_token"),
        )

    def test_unique_vendor_codes_have_explicit_regions(self) -> None:
        vendors = load_json(SDKWORK_MODELS / "models" / "vendors.json")["vendors"]
        vendor_regions = {
            vendor["vendorCode"]: {region["regionCode"] for region in vendor.get("regions", [])}
            for vendor in vendors
        }

        expected_regions = {
            "alibaba": {"cn"},
            "baidu": {"cn"},
            "bytedance": {"cn", "global"},
            "deepseek": {"cn", "global"},
            "kuaishou": {"cn", "global"},
            "minimax": {"cn", "global"},
            "moonshot": {"cn", "global"},
            "tencent": {"cn"},
            "zhipu": {"cn"},
        }
        for vendor_code, regions in expected_regions.items():
            with self.subTest(vendor=vendor_code):
                self.assertTrue(regions.issubset(vendor_regions.get(vendor_code, set())))

        forbidden_product_vendor_codes = {
            "alibaba_qwen",
            "baidu_qianfan",
            "bytedance_seed",
            "kuaishou_kling",
            "tencent_hunyuan",
            "zhipu_bigmodel",
        }
        self.assertTrue(forbidden_product_vendor_codes.isdisjoint(vendor_regions))

        for vendor_path in sorted((SDKWORK_MODELS / "models").glob("*/*/vendor.json")):
            vendor = load_json(vendor_path)
            with self.subTest(path=vendor_path.relative_to(SDKWORK_MODELS).as_posix()):
                self.assertRegex(vendor.get("vendorCode", ""), r"^[a-z0-9_]+$")
                self.assertRegex(vendor.get("regionCode", ""), r"^[a-z0-9_]+$")
                self.assertNotIn("vendorGroupCode", vendor)

    def test_region_specific_directories_are_required_for_split_markets(self) -> None:
        vendors = load_json(SDKWORK_MODELS / "models" / "vendors.json")["vendors"]
        vendor_codes = {vendor["vendorCode"] for vendor in vendors}
        forbidden_regional_vendor_codes = {
            "alibaba_qwen",
            "alibaba_qwen_cn",
            "alibaba_cn",
            "baidu_qianfan_cn",
            "baidu_cn",
            "bytedance_cn",
            "bytedance_seed_global",
            "bytedance_volcengine_cn",
            "deepseek_cn",
            "deepseek_global",
            "kuaishou_cn",
            "kuaishou_global",
            "minimax_cn",
            "minimax_global",
            "moonshot_cn",
            "moonshot_global",
            "tencent_cn",
            "tencent_hunyuan_cn",
            "zhipu_cn",
            "zhipu_bigmodel_cn",
        }
        self.assertTrue(forbidden_regional_vendor_codes.isdisjoint(vendor_codes))

        expected_region_dirs = {
            ("alibaba", "cn"),
            ("baidu", "cn"),
            ("bytedance", "cn"),
            ("bytedance", "global"),
            ("deepseek", "cn"),
            ("deepseek", "global"),
            ("kuaishou", "global"),
            ("kuaishou", "cn"),
            ("minimax", "cn"),
            ("minimax", "global"),
            ("moonshot", "cn"),
            ("moonshot", "global"),
            ("tencent", "cn"),
            ("zhipu", "cn"),
        }
        for vendor_code, region_code in expected_region_dirs:
            with self.subTest(vendor=vendor_code, region=region_code):
                self.assertTrue((SDKWORK_MODELS / "models" / vendor_code / region_code / "vendor.json").exists())


    def test_catalog_removes_retired_minimax_abab_models(self) -> None:
        for rel in [
            "models/minimax_cn/models/abab7.1.json",
            "models/minimax_cn/pricing/abab7.1.json",
            "models/minimax_global/models/abab7.1.json",
            "models/minimax_global/pricing/abab7.1.json",
            "models/minimax/cn/models/abab7.1.json",
            "models/minimax/cn/pricing/abab7.1.json",
            "models/minimax/global/models/abab7.1.json",
            "models/minimax/global/pricing/abab7.1.json",
        ]:
            with self.subTest(path=rel):
                self.assertFalse((SDKWORK_MODELS / rel).exists(), rel)

        for json_path in sorted((SDKWORK_MODELS / "models").glob("**/*.json")):
            with self.subTest(path=json_path.relative_to(SDKWORK_MODELS).as_posix()):
                self.assertNotIn("abab7.1", json_path.read_text(encoding="utf-8"))

    def test_root_verification_runs_models_check(self) -> None:
        package_json = load_json(ROOT / "package.json")
        self.assertIn("models:check", package_json.get("scripts", {}))
        self.assertIn("freshness-report.mjs", package_json["scripts"]["models:check"])
        self.assertIn("catalog-audit.mjs", package_json["scripts"]["models:check"])
        self.assertIn("release-catalog.mjs --check", package_json["scripts"]["models:check"])

        verify_script = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(
            encoding="utf-8"
        )
        self.assertIn("sdkwork-models catalog check", verify_script)
        self.assertIn("models:check", verify_script)

    def test_release_check_defaults_to_manifest_generated_at(self) -> None:
        result = subprocess.run(
            ["node", "tools/release-catalog.mjs", "--check"],
            cwd=SDKWORK_MODELS,
            text=True,
            capture_output=True,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
