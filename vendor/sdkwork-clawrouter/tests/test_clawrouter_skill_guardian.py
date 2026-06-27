import json
import hashlib
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.clawrouter_skill_guardian import ClawRouterSkillGuardian


def media_resource(locator: str, kind: str = "image") -> dict:
    source = (
        "external_url"
        if locator.startswith(("http://", "https://"))
        else "data_url"
        if locator.startswith("data:")
        else "provider_asset"
    )
    if source == "provider_asset":
        return {"kind": kind, "source": source, "uri": locator}
    return {"kind": kind, "source": source, "url": locator, "publicUrl": locator}


class ClawRouterSkillGuardianTest(unittest.TestCase):
    def write_skill(self, root: Path, name: str, body: str) -> None:
        skill = root / ".agents" / "skills" / name / "SKILL.md"
        skill.parent.mkdir(parents=True, exist_ok=True)
        skill.write_text(textwrap.dedent(body).strip() + "\n", encoding="utf-8")

    def test_accepts_required_sdk_integration_skills(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_skill_seed_bundle(root, include_clawhub=True)
            self.write_skill(
                root,
                "clawrouter-app-sdk-integration",
                """
                ---
                name: clawrouter-app-sdk-integration
                description: Use @sdkwork/clawrouter-app-sdk for product contract surface integration.
                ---
                Use @sdkwork/clawrouter-app-sdk.
                Select the SDK by contract surface.
                URL path prefixes are not the source of truth.
                Never use raw fetch or axios for remote business endpoints.
                Never hand-edit generated SDK output.
                Regenerate with sdkwork-sdk-generator from generated/openapi/clawrouter-app-openapi.json.
                Do not change apps/sdkwork-clawrouter-pc UI visuals.
                """,
            )
            self.write_skill(
                root,
                "clawrouter-backend-sdk-integration",
                """
                ---
                name: clawrouter-backend-sdk-integration
                description: Use @sdkwork/clawrouter-backend-sdk for management contract surface integration.
                ---
                Use @sdkwork/clawrouter-backend-sdk.
                Select the SDK by contract surface.
                URL path prefixes are not the source of truth.
                Never use raw fetch or axios for remote business endpoints.
                Never hand-edit generated SDK output.
                Regenerate with sdkwork-sdk-generator from generated/openapi/clawrouter-backend-openapi.json.
                Do not change apps/sdkwork-clawrouter-pc UI visuals.
                """,
            )
            self.write_skill(
                root,
                "clawrouter-sdk-generation",
                """
                ---
                name: clawrouter-sdk-generation
                description: Regenerate @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
                ---
                Generate exactly three SDK systems: @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
                URL path prefixes are not used as the standard for SDK ownership.
                Read generated/api/api-contract-manifest.json.
                Write generated/openapi/clawrouter-app-openapi.json.
                Write generated/openapi/clawrouter-backend-openapi.json.
                Write apps/sdkwork-clawrouter-pc/public/openapi.json with tools.clawrouter_gateway_openapi_generator.
                app/backend SDK generation uses the authority OpenAPI snapshots.
                open SDK generation uses openapi/clawrouter-open-sdk.sdkgen.json.
                .sdkwork-assembly.json generationInputSpec declares the actual generation input.
                .sdkwork-assembly.json derivedSpecs declares derived generator artifacts.
                Run sdkwork-sdk-generator.
                Never hand-edit generated SDK output.
                """,
            )

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_or_incomplete_skills(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_skill(
                root,
                "clawrouter-app-sdk-integration",
                """
                ---
                name: clawrouter-app-sdk-integration
                description: incomplete
                ---
                Use @sdkwork/clawrouter-app-sdk.
                """,
            )

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("skill is missing: clawrouter-backend-sdk-integration", result.messages)
            self.assertIn("skill is missing: clawrouter-sdk-generation", result.messages)
            self.assertIn("skill clawrouter-app-sdk-integration must mention contract surface", result.messages)
            self.assertIn("skill clawrouter-app-sdk-integration must mention sdkwork-sdk-generator", result.messages)

    def test_reports_skill_seed_bundle_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_required_skills(root)
            skills_root = root / "data" / "skills"
            skills_root.mkdir(parents=True, exist_ok=True)
            (skills_root / "install-manifest.json").write_text(
                json.dumps({
                    "catalogCode": "sdkwork-agent-skills",
                    "schemaVersion": "agent-skills-seed.v1",
                    "source": "bundled",
                }),
                encoding="utf-8",
            )
            (skills_root / "categories.json").write_text(
                json.dumps([{"id": 1901, "uuid": "cat", "code": "agent-productivity"}]),
                encoding="utf-8",
            )
            (skills_root / "packages.json").write_text(
                json.dumps([{"id": 7101, "uuid": "pkg", "packageKey": "agent-productivity-suite", "categoryId": 1901}]),
                encoding="utf-8",
            )
            (skills_root / "skills.json").write_text(
                json.dumps([
                    {
                        "id": 8101,
                        "uuid": "skill-prompt-optimizer",
                        "skillKey": "prompt-optimizer",
                        "name": "Prompt Optimizer",
                        "categoryId": 1901,
                        "packageId": 7101,
                        "manifestUrl": "data/skills/manifests/prompt-optimizer.json",
                        "version": "1.0.0",
                        "runtime": "builtin",
                        "entrypoint": "sdkwork.skills.prompt_optimizer",
                        "capabilities": ["prompt.analysis"],
                        "configSchema": {"type": "object"},
                        "defaultConfig": {},
                    }
                ]),
                encoding="utf-8",
            )
            (skills_root / "assets.json").write_text(
                json.dumps([{"uuid": "asset", "targetType": 35, "targetId": 8101}]),
                encoding="utf-8",
            )
            (skills_root / "artifacts.json").write_text(
                json.dumps([
                    {
                        "uuid": "artifact",
                        "targetType": 35,
                        "targetId": 8101,
                        "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
                        "artifact": media_resource(
                            "data/skills/artifacts/prompt-optimizer-1.0.0.json",
                            "document",
                        ),
                        "version": "1.0.0",
                        "runtime": "builtin",
                    }
                ]),
                encoding="utf-8",
            )

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "skill seed artifact must exist: data/skills/artifacts/prompt-optimizer-1.0.0.json",
                result.messages,
            )
            self.assertIn(
                "skill seed manifestUrl must exist: data/skills/manifests/prompt-optimizer.json",
                result.messages,
            )

    def test_reports_manifest_artifact_metadata_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_required_skills(root)
            self.write_valid_skill_seed_bundle(root, include_clawhub=True)
            manifest_path = root / "data" / "skills" / "manifests" / "prompt-optimizer.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["artifacts"][0]["checksumHash"] = "sha256:" + "0" * 64
            manifest["artifacts"][0]["artifactSizeBytes"] = 1
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("skill seed manifest artifact metadata mismatch for prompt-optimizer", result.messages)

    def test_reports_marketplace_seed_standard_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_required_skills(root)
            self.write_valid_skill_seed_bundle(root, include_clawhub=True)
            skills_root = root / "data" / "skills"
            packages_path = skills_root / "packages.json"
            packages = json.loads(packages_path.read_text(encoding="utf-8"))
            packages[0]["enabled"] = False
            packages_path.write_text(json.dumps(packages), encoding="utf-8")
            skills_path = skills_root / "skills.json"
            skills = json.loads(skills_path.read_text(encoding="utf-8"))
            skills[0]["marketStatus"] = "DRAFT"
            skills_path.write_text(json.dumps(skills), encoding="utf-8")
            manifest_path = skills_root / "manifests" / "prompt-optimizer.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["schemaVersion"] = "draft"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("skill seed package sdkwork-official-skills must be enabled", result.messages)
            self.assertIn("skill seed skill prompt-optimizer must be published public approved and enabled", result.messages)
            self.assertIn(
                "skill seed manifest schemaVersion must be agent-skill-manifest.v1 for prompt-optimizer",
                result.messages,
            )

    def test_accepts_clawhub_metadata_seed_as_bundled_local_community_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_required_skills(root)
            self.write_valid_skill_seed_bundle(root, include_clawhub=True)

            result = ClawRouterSkillGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def write_valid_skill_seed_bundle(self, root: Path, include_clawhub: bool = False) -> None:
        skills_root = root / "data" / "skills"
        manifests_root = skills_root / "manifests"
        artifacts_root = skills_root / "artifacts"
        clawhub_raw_root = skills_root / "clawhub" / "raw" / "details"
        manifests_root.mkdir(parents=True, exist_ok=True)
        artifacts_root.mkdir(parents=True, exist_ok=True)
        clawhub_raw_root.mkdir(parents=True, exist_ok=True)
        (skills_root / "install-manifest.json").write_text(
            json.dumps({
                "catalogCode": "sdkwork-agent-skills",
                "schemaVersion": "agent-skills-seed.v1",
                "source": "bundled",
            }),
            encoding="utf-8",
        )
        (skills_root / "categories.json").write_text(
            json.dumps([
                {
                    "id": 1901,
                    "uuid": "cat-official",
                    "code": "sdkwork-official",
                    "name": "SDKWork Official",
                    "visible": True,
                    "status": 1,
                    "type": 19,
                },
                {
                    "id": 1902,
                    "uuid": "cat-clawhub",
                    "code": "clawhub-community",
                    "name": "ClawHub Community",
                    "visible": True,
                    "status": 1,
                    "type": 19,
                },
            ]),
            encoding="utf-8",
        )
        (skills_root / "packages.json").write_text(
            json.dumps([
                {
                    "id": 7101,
                    "uuid": "pkg",
                    "packageKey": "sdkwork-official-skills",
                    "categoryId": 1901,
                    "enabled": True,
                    "icon": media_resource("https://cdn.example.test/packages/sdkwork-official/icon.png"),
                    "cover": media_resource("https://cdn.example.test/packages/sdkwork-official/cover.png"),
                },
                *(
                    [
                        {
                            "id": 7201,
                            "uuid": "pkg-clawhub",
                            "packageKey": "clawhub-community-mirror",
                            "categoryId": 1902,
                            "enabled": True,
                            "icon": media_resource("https://cdn.example.test/packages/clawhub/icon.png"),
                            "cover": media_resource("https://cdn.example.test/packages/clawhub/cover.png"),
                        }
                    ]
                    if include_clawhub
                    else []
                ),
            ]),
            encoding="utf-8",
        )
        skills = [
                {
                    "id": 8101,
                    "uuid": "skill-prompt-optimizer",
                    "skillKey": "prompt-optimizer",
                    "name": "Prompt Optimizer",
                    "categoryId": 1901,
                    "packageId": 7101,
                    "manifestUrl": "data/skills/manifests/prompt-optimizer.json",
                    "version": "1.0.0",
                    "versionName": "1.0.0",
                    "runtime": "builtin",
                    "entrypoint": "sdkwork.skills.prompt_optimizer",
                    "sourceType": "OFFICIAL",
                    "provider": "SDKWork",
                    "marketStatus": "PUBLISHED",
                    "visibility": "PUBLIC",
                    "reviewStatus": "APPROVED",
                    "builtin": True,
                    "isBuiltin": True,
                    "enabled": True,
                    "icon": media_resource("https://cdn.example.test/skills/prompt-optimizer/icon.png"),
                    "cover": media_resource("https://cdn.example.test/skills/prompt-optimizer/cover.png"),
                    "capabilities": ["prompt.analysis"],
                    "configSchema": {"type": "object"},
                    "defaultConfig": {},
                }
        ]
        if include_clawhub:
            skills.append(
                {
                    "id": 8201,
                    "uuid": "skill-clawhub-mcp",
                    "skillKey": "clawhub-mcp",
                    "name": "mcp-builder",
                    "categoryId": 1902,
                    "packageId": 7201,
                    "manifestUrl": "data/skills/manifests/clawhub-mcp.json",
                    "version": "1.0.0",
                    "versionName": "1.0.0",
                    "runtime": "metadata",
                    "entrypoint": "clawhub.skills.mcp",
                    "sourceType": "COMMUNITY",
                    "provider": "ClawHub",
                    "marketStatus": "PUBLISHED",
                    "visibility": "PUBLIC",
                    "reviewStatus": "APPROVED",
                    "builtin": False,
                    "isBuiltin": False,
                    "enabled": True,
                    "icon": media_resource("https://cdn.example.test/skills/clawhub-mcp/icon.png"),
                    "cover": media_resource("https://cdn.example.test/skills/clawhub-mcp/cover.png"),
                    "capabilities": ["mcp"],
                    "configSchema": {"type": "object"},
                    "defaultConfig": {"portal": {"frameworks": ["ClawHub"]}},
                    "source": {
                        "vendor": "clawhub",
                        "slug": "mcp",
                        "url": "https://clawhub.ai/skills/mcp",
                        "fetchedAt": "2026-05-10T00:00:00Z",
                    },
                }
            )
        (skills_root / "skills.json").write_text(
            json.dumps(skills),
            encoding="utf-8",
        )
        assets = [
            {
                "uuid": "asset",
                "targetType": 35,
                "targetId": 8101,
                "asset": media_resource("https://cdn.example.test/skills/prompt-optimizer/cover.png"),
                "thumbnail": media_resource("https://cdn.example.test/skills/prompt-optimizer/thumb.png"),
            }
        ]
        if include_clawhub:
            assets.append(
                {
                    "uuid": "asset-clawhub",
                    "targetType": 35,
                    "targetId": 8201,
                    "asset": media_resource("https://cdn.example.test/skills/clawhub-mcp/cover.png"),
                    "thumbnail": media_resource("https://cdn.example.test/skills/clawhub-mcp/thumb.png"),
                }
            )
        (skills_root / "assets.json").write_text(
            json.dumps(assets),
            encoding="utf-8",
        )
        artifact_payload = {
            "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
            "version": "1.0.0",
            "runtime": "builtin",
            "skill": {"id": 8101},
            "instructions": ["Improve the prompt."],
            "inputSchema": {"type": "object"},
            "outputSchema": {"type": "object"},
        }
        checksum_hash = artifact_payload_checksum(artifact_payload)
        artifact_payload["checksumHash"] = checksum_hash
        artifact_payload_text = json.dumps(artifact_payload)
        artifact_size_bytes = len(artifact_payload_text.encode("utf-8"))
        artifacts = [
            {
                "uuid": "artifact",
                "targetType": 35,
                "targetId": 8101,
                "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
                "artifact": media_resource("data/skills/artifacts/prompt-optimizer-1.0.0.json", "document"),
                "version": "1.0.0",
                "runtime": "builtin",
                "checksumHash": checksum_hash,
                "artifactSizeBytes": artifact_size_bytes,
            }
        ]
        clawhub_artifact_payload = None
        if include_clawhub:
            clawhub_artifact_payload = {
                "artifactRef": "clawhub://skills/mcp@1.0.0",
                "version": "1.0.0",
                "runtime": "metadata",
                "skill": {"id": 8201},
                "instructions": ["Display metadata mirrored from ClawHub."],
                "inputSchema": {"type": "object"},
                "outputSchema": {"type": "object"},
            }
            clawhub_checksum = artifact_payload_checksum(clawhub_artifact_payload)
            clawhub_artifact_payload["checksumHash"] = clawhub_checksum
            clawhub_payload_text = json.dumps(clawhub_artifact_payload)
            artifacts.append(
                {
                    "uuid": "artifact-clawhub",
                    "targetType": 35,
                    "targetId": 8201,
                    "artifactRef": "clawhub://skills/mcp@1.0.0",
                    "artifact": media_resource("data/skills/artifacts/clawhub-mcp-1.0.0.json", "document"),
                    "version": "1.0.0",
                    "runtime": "metadata",
                    "checksumHash": clawhub_checksum,
                    "artifactSizeBytes": len(clawhub_payload_text.encode("utf-8")),
                }
            )
        (skills_root / "artifacts.json").write_text(
            json.dumps(artifacts),
            encoding="utf-8",
        )
        (manifests_root / "prompt-optimizer.json").write_text(
            json.dumps({
                "schemaVersion": "agent-skill-manifest.v1",
                "id": 8101,
                "uuid": "skill-prompt-optimizer",
                "skillKey": "prompt-optimizer",
                "name": "Prompt Optimizer",
                "version": "1.0.0",
                "runtime": "builtin",
                "entrypoint": "sdkwork.skills.prompt_optimizer",
                "capabilities": ["prompt.analysis"],
                "configSchema": {"type": "object"},
                "defaultConfig": {},
                "artifacts": [
                    {
                        "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
                        "artifact": media_resource("data/skills/artifacts/prompt-optimizer-1.0.0.json", "document"),
                        "version": "1.0.0",
                        "runtime": "builtin",
                        "checksumHash": checksum_hash,
                        "artifactSizeBytes": artifact_size_bytes,
                    }
                ],
            }),
            encoding="utf-8",
        )
        (artifacts_root / "prompt-optimizer-1.0.0.json").write_text(artifact_payload_text, encoding="utf-8")
        if include_clawhub and clawhub_artifact_payload is not None:
            clawhub_payload_text = json.dumps(clawhub_artifact_payload)
            (manifests_root / "clawhub-mcp.json").write_text(
                json.dumps({
                    "schemaVersion": "agent-skill-manifest.v1",
                    "id": 8201,
                    "uuid": "skill-clawhub-mcp",
                    "skillKey": "clawhub-mcp",
                    "name": "mcp-builder",
                    "version": "1.0.0",
                    "runtime": "metadata",
                    "entrypoint": "clawhub.skills.mcp",
                    "capabilities": ["mcp"],
                    "configSchema": {"type": "object"},
                    "defaultConfig": {"portal": {"frameworks": ["ClawHub"]}},
                    "artifacts": [
                        {
                            "artifactRef": "clawhub://skills/mcp@1.0.0",
                            "artifact": media_resource("data/skills/artifacts/clawhub-mcp-1.0.0.json", "document"),
                            "version": "1.0.0",
                            "runtime": "metadata",
                            "checksumHash": clawhub_artifact_payload["checksumHash"],
                            "artifactSizeBytes": len(clawhub_payload_text.encode("utf-8")),
                        }
                    ],
                }),
                encoding="utf-8",
            )
            (artifacts_root / "clawhub-mcp-1.0.0.json").write_text(clawhub_payload_text, encoding="utf-8")
            (skills_root / "clawhub" / "raw" / "index.json").write_text(
                json.dumps({
                    "mirrorMode": "full-cursor-mirror",
                    "source": {"listApi": "https://clawhub.ai/api/v1/skills"},
                    "totalItems": 1,
                    "detailStatus": {"detailCount": 1, "errorCount": 0, "completeCount": 1},
                    "items": [
                        {
                            "slug": "mcp",
                            "rawDetailPath": "data/skills/clawhub/raw/details/mcp.json",
                            "rawErrorPath": "data/skills/clawhub/raw/errors/mcp.json",
                        }
                    ],
                }),
                encoding="utf-8",
            )
            (skills_root / "clawhub" / "manifest.json").write_text(
                json.dumps({
                    "mirroredSkillCount": 1,
                    "seededSkills": [{"slug": "mcp"}],
                }),
                encoding="utf-8",
            )
            (clawhub_raw_root / "mcp.json").write_text(json.dumps({"skill": {"slug": "mcp"}}), encoding="utf-8")

    def write_required_skills(self, root: Path) -> None:
        self.write_skill(
            root,
            "clawrouter-app-sdk-integration",
            """
            ---
            name: clawrouter-app-sdk-integration
            description: Use @sdkwork/clawrouter-app-sdk for product contract surface integration.
            ---
            Use @sdkwork/clawrouter-app-sdk.
            Select the SDK by contract surface.
            URL path prefixes are not the source of truth.
            Never use raw fetch or axios for remote business endpoints.
            Never hand-edit generated SDK output.
            Regenerate with sdkwork-sdk-generator from generated/openapi/clawrouter-app-openapi.json.
            Do not change apps/sdkwork-clawrouter-pc UI visuals.
            """,
        )
        self.write_skill(
            root,
            "clawrouter-backend-sdk-integration",
            """
            ---
            name: clawrouter-backend-sdk-integration
            description: Use @sdkwork/clawrouter-backend-sdk for management contract surface integration.
            ---
            Use @sdkwork/clawrouter-backend-sdk.
            Select the SDK by contract surface.
            URL path prefixes are not the source of truth.
            Never use raw fetch or axios for remote business endpoints.
            Never hand-edit generated SDK output.
            Regenerate with sdkwork-sdk-generator from generated/openapi/clawrouter-backend-openapi.json.
            Do not change apps/sdkwork-clawrouter-pc UI visuals.
            """,
        )
        self.write_skill(
            root,
            "clawrouter-sdk-generation",
            """
            ---
            name: clawrouter-sdk-generation
            description: Regenerate @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
            ---
            Generate exactly three SDK systems: @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
            URL path prefixes are not used as the standard for SDK ownership.
            Read generated/api/api-contract-manifest.json.
            Write generated/openapi/clawrouter-app-openapi.json.
            Write generated/openapi/clawrouter-backend-openapi.json.
            Write apps/sdkwork-clawrouter-pc/public/openapi.json with tools.clawrouter_gateway_openapi_generator.
            app/backend SDK generation uses the authority OpenAPI snapshots.
            open SDK generation uses openapi/clawrouter-open-sdk.sdkgen.json.
            .sdkwork-assembly.json generationInputSpec declares the actual generation input.
            .sdkwork-assembly.json derivedSpecs declares derived generator artifacts.
            Run sdkwork-sdk-generator.
            Never hand-edit generated SDK output.
            """,
        )

def artifact_payload_checksum(payload: dict) -> str:
    canonical = dict(payload)
    canonical.pop("checksumHash", None)
    encoded = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


if __name__ == "__main__":
    unittest.main()
