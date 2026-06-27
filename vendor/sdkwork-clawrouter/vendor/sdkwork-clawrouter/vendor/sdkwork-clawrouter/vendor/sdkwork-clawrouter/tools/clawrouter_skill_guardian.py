from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ClawRouterSkillGuardianResult:
    ok: bool
    messages: list[str]


class ClawRouterSkillGuardian:
    """Validate project-local skills that enforce ClawRouter SDK integration."""

    REQUIRED_SKILLS: dict[str, tuple[str, ...]] = {
        "clawrouter-app-sdk-integration": (
            "@sdkwork/clawrouter-app-sdk",
            "contract surface",
            "URL path prefixes are not the source of truth",
            "sdkwork-sdk-generator",
            "Never hand-edit generated SDK output",
            "raw fetch",
            "axios",
            "apps/sdkwork-clawrouter-pc",
        ),
        "clawrouter-backend-sdk-integration": (
            "@sdkwork/clawrouter-backend-sdk",
            "contract surface",
            "URL path prefixes are not the source of truth",
            "sdkwork-sdk-generator",
            "Never hand-edit generated SDK output",
            "raw fetch",
            "axios",
            "apps/sdkwork-clawrouter-pc",
        ),
        "clawrouter-sdk-generation": (
            "@sdkwork/clawrouter-app-sdk",
            "@sdkwork/clawrouter-backend-sdk",
            "@sdkwork/clawrouter-open-sdk",
            "exactly three",
            "URL path prefixes are not used as the standard for SDK ownership",
            "generated/api/api-contract-manifest.json",
            "generated/openapi/clawrouter-app-openapi.json",
            "generated/openapi/clawrouter-backend-openapi.json",
            "app/backend SDK generation uses the authority OpenAPI snapshots",
            "open SDK generation uses openapi/clawrouter-open-sdk.sdkgen.json",
            "generationInputSpec",
            "derivedSpecs",
            "sdkwork-sdk-generator",
            "Never hand-edit generated SDK output",
        ),
    }

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()
        self.skills_root = self.root / ".agents" / "skills"

    def run(self) -> ClawRouterSkillGuardianResult:
        messages: list[str] = []
        for name, tokens in self.REQUIRED_SKILLS.items():
            skill_path = self.skills_root / name / "SKILL.md"
            if not skill_path.exists():
                messages.append(f"skill is missing: {name}")
                continue
            try:
                content = skill_path.read_text(encoding="utf-8")
            except OSError as exc:
                messages.append(f"skill cannot be read: {name}: {exc}")
                continue
            messages.extend(self._check_content(name, content, tokens))
        messages.extend(self._check_skill_seed_bundle())
        return ClawRouterSkillGuardianResult(ok=not messages, messages=messages)

    def _check_content(self, name: str, content: str, tokens: tuple[str, ...]) -> list[str]:
        messages: list[str] = []
        lowered = content.lower()
        for token in tokens:
            if token.lower() not in lowered:
                messages.append(f"skill {name} must mention {token}")
        if f"name: {name}" not in content:
            messages.append(f"skill {name} frontmatter name must be {name}")
        if "description:" not in content:
            messages.append(f"skill {name} must declare description frontmatter")
        return messages

    def _check_skill_seed_bundle(self) -> list[str]:
        skills_root = self.root / "data" / "skills"
        if not skills_root.exists():
            return [f"skill seed bundle is missing: {self._display(skills_root)}"]

        messages: list[str] = []
        manifest = self._read_seed_json(skills_root / "install-manifest.json", messages)
        categories = self._read_seed_json(skills_root / "categories.json", messages)
        packages = self._read_seed_json(skills_root / "packages.json", messages)
        skills = self._read_seed_json(skills_root / "skills.json", messages)
        assets = self._read_seed_json(skills_root / "assets.json", messages)
        artifacts = self._read_seed_json(skills_root / "artifacts.json", messages)
        if messages:
            return messages
        if not isinstance(manifest, dict):
            messages.append("skill seed install-manifest.json must be an object")
            return messages
        for label, value in [
            ("categories", categories),
            ("packages", packages),
            ("skills", skills),
            ("assets", assets),
            ("artifacts", artifacts),
        ]:
            if not isinstance(value, list):
                messages.append(f"skill seed {label}.json must be an array")
        if messages:
            return messages

        if manifest.get("catalogCode") != "sdkwork-agent-skills":
            messages.append("skill seed catalogCode must be sdkwork-agent-skills")
        if manifest.get("schemaVersion") != "agent-skills-seed.v1":
            messages.append("skill seed schemaVersion must be agent-skills-seed.v1")
        if manifest.get("source") != "bundled":
            messages.append("skill seed source must be bundled")

        category_ids = self._id_set(categories, "category", messages)
        package_ids = self._id_set(packages, "package", messages)
        skill_ids = self._id_set(skills, "skill", messages)
        skill_by_id = {item.get("id"): item for item in skills if isinstance(item, dict)}
        self._unique_values((item.get("skillKey") for item in skills if isinstance(item, dict)), "skillKey", messages)
        self._unique_values((item.get("uuid") for item in artifacts if isinstance(item, dict)), "artifact uuid", messages)
        self._unique_values((item.get("uuid") for item in assets if isinstance(item, dict)), "asset uuid", messages)

        if not categories:
            messages.append("skill seed categories.json must not be empty")
        elif not isinstance(categories[0], dict) or categories[0].get("code") != "sdkwork-official":
            messages.append("skill seed first category must be sdkwork-official")

        for package in packages:
            if not isinstance(package, dict):
                messages.append("skill seed package entries must be objects")
                continue
            package_key = package.get("packageKey")
            self._reject_legacy_media_fields(package, f"package {package_key}", messages)
            self._require_media_resource(package.get("icon"), "image", f"skill seed package {package_key} icon", messages)
            self._require_media_resource(package.get("cover"), "image", f"skill seed package {package_key} cover", messages)
            category_id = package.get("categoryId")
            if category_id not in category_ids:
                messages.append(f"skill seed package {package_key} references missing categoryId: {category_id}")
            if package.get("enabled") is not True:
                messages.append(f"skill seed package {package_key} must be enabled")

        artifacts_by_skill: dict[Any, list[dict[str, Any]]] = {}
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                messages.append("skill seed artifact entries must be objects")
                continue
            artifact_uuid = artifact.get("uuid")
            self._reject_legacy_media_fields(artifact, f"artifact {artifact_uuid}", messages)
            target_id = artifact.get("targetId")
            if artifact.get("targetType") != 35:
                messages.append(f"skill seed artifact {artifact_uuid} targetType must be 35")
            if target_id not in skill_ids:
                messages.append(f"skill seed artifact {artifact_uuid} references missing targetId: {target_id}")
            artifact_ref = artifact.get("artifactRef")
            target_skill = skill_by_id.get(target_id)
            if isinstance(target_skill, dict) and self._is_clawhub_community_skill(target_skill):
                if not isinstance(artifact_ref, str) or not artifact_ref.startswith("clawhub://skills/"):
                    messages.append(f"skill seed artifact {artifact_uuid} must use clawhub artifactRef")
                if artifact.get("runtime") != "metadata":
                    messages.append(f"skill seed artifact {artifact_uuid} must use metadata runtime for ClawHub")
            else:
                if not isinstance(artifact_ref, str) or not artifact_ref.startswith("builtin://sdkwork.skills."):
                    messages.append(f"skill seed artifact {artifact_uuid} must use builtin artifactRef")
            checksum_hash = artifact.get("checksumHash")
            if not isinstance(checksum_hash, str) or not self._is_sha256_hash(checksum_hash):
                messages.append(f"skill seed artifact {artifact_uuid} checksumHash must be sha256:<64 lowercase hex>")
            artifact_resource = self._require_media_resource(
                artifact.get("artifact"),
                "document",
                f"skill seed artifact {artifact_uuid} artifact",
                messages,
            )
            artifact_locator = self._media_resource_url(artifact_resource)
            artifact_path = self._local_seed_path(artifact_locator, messages) if artifact_locator else None
            if artifact_path is not None:
                if not artifact_path.exists():
                    messages.append(f"skill seed artifact must exist: {artifact_locator}")
                else:
                    if artifact.get("artifactSizeBytes") != artifact_path.stat().st_size:
                        messages.append(
                            f"skill seed artifact {artifact_uuid} artifactSizeBytes must match payload size: {artifact_locator}"
                        )
                    payload = self._read_seed_json(artifact_path, messages)
                    if isinstance(payload, dict):
                        if payload.get("artifactRef") != artifact_ref:
                            messages.append(f"skill seed artifact payload artifactRef mismatch: {artifact_locator}")
                        if payload.get("version") != artifact.get("version"):
                            messages.append(f"skill seed artifact payload version mismatch: {artifact_locator}")
                        if payload.get("runtime") != artifact.get("runtime"):
                            messages.append(f"skill seed artifact payload runtime mismatch: {artifact_locator}")
                        if payload.get("checksumHash") != checksum_hash:
                            messages.append(f"skill seed artifact payload checksumHash mismatch: {artifact_locator}")
                        if self._artifact_payload_checksum(payload) != checksum_hash:
                            messages.append(f"skill seed artifact checksumHash does not match payload: {artifact_locator}")
                        if payload.get("skill", {}).get("id") != target_id:
                            messages.append(f"skill seed artifact payload skill id mismatch: {artifact_locator}")
                        if not isinstance(payload.get("instructions"), list) or not payload.get("instructions"):
                            messages.append(f"skill seed artifact payload instructions must be non-empty: {artifact_locator}")
                        if not isinstance(payload.get("inputSchema"), dict):
                            messages.append(f"skill seed artifact payload inputSchema must be an object: {artifact_locator}")
                        if not isinstance(payload.get("outputSchema"), dict):
                            messages.append(f"skill seed artifact payload outputSchema must be an object: {artifact_locator}")
            artifacts_by_skill.setdefault(target_id, []).append(artifact)

        assets_by_skill: dict[Any, list[dict[str, Any]]] = {}
        for asset in assets:
            if not isinstance(asset, dict):
                messages.append("skill seed asset entries must be objects")
                continue
            asset_uuid = asset.get("uuid")
            self._reject_legacy_media_fields(asset, f"asset {asset_uuid}", messages)
            target_id = asset.get("targetId")
            if asset.get("targetType") != 35:
                messages.append(f"skill seed asset {asset_uuid} targetType must be 35")
            if target_id not in skill_ids:
                messages.append(f"skill seed asset {asset_uuid} references missing targetId: {target_id}")
            self._require_media_resource(asset.get("asset"), "image", f"skill seed asset {asset_uuid} asset", messages)
            if asset.get("thumbnail") is not None:
                self._require_media_resource(asset.get("thumbnail"), "image", f"skill seed asset {asset_uuid} thumbnail", messages)
            assets_by_skill.setdefault(target_id, []).append(asset)

        for skill in skills:
            if not isinstance(skill, dict):
                messages.append("skill seed skill entries must be objects")
                continue
            skill_id = skill.get("id")
            skill_key = skill.get("skillKey")
            self._reject_legacy_media_fields(skill, f"skill {skill_key}", messages)
            self._require_media_resource(skill.get("icon"), "image", f"skill seed skill {skill_key} icon", messages)
            self._require_media_resource(skill.get("cover"), "image", f"skill seed skill {skill_key} cover", messages)
            if skill.get("categoryId") not in category_ids:
                messages.append(f"skill seed skill {skill_key} references missing categoryId: {skill.get('categoryId')}")
            if skill.get("packageId") not in package_ids:
                messages.append(f"skill seed skill {skill_key} references missing packageId: {skill.get('packageId')}")
            if (
                skill.get("marketStatus") != "PUBLISHED"
                or skill.get("visibility") != "PUBLIC"
                or skill.get("reviewStatus") != "APPROVED"
                or skill.get("enabled") is not True
            ):
                messages.append(f"skill seed skill {skill_key} must be published public approved and enabled")
            if self._is_sdkwork_official_skill(skill):
                if skill.get("builtin") is not True or skill.get("isBuiltin") is not True:
                    messages.append(f"skill seed skill {skill_key} must be builtin official seed data")
                if skill.get("runtime") != "builtin":
                    messages.append(f"skill seed skill {skill_key} must use builtin runtime for SDKWork official data")
            elif self._is_clawhub_community_skill(skill):
                if skill.get("builtin") is not False or skill.get("isBuiltin") is not False:
                    messages.append(f"skill seed skill {skill_key} must be non-builtin ClawHub community metadata")
                if skill.get("runtime") != "metadata":
                    messages.append(f"skill seed skill {skill_key} must use metadata runtime for ClawHub community data")
                source = skill.get("source")
                if not isinstance(source, dict) or source.get("vendor") != "clawhub":
                    messages.append(f"skill seed skill {skill_key} must preserve clawhub source metadata")
            else:
                messages.append(f"skill seed skill {skill_key} must be SDKWork official or ClawHub community seed data")
            if skill.get("versionName") != skill.get("version"):
                messages.append(f"skill seed skill {skill_key} versionName must match version")
            if skill_id not in artifacts_by_skill:
                messages.append(f"skill seed skill {skill_key} must have at least one artifact")
            if skill_id not in assets_by_skill:
                messages.append(f"skill seed skill {skill_key} must have at least one asset")
            manifest_url = skill.get("manifestUrl")
            manifest_path = self._local_seed_path(manifest_url, messages)
            if manifest_path is not None:
                if not manifest_path.exists():
                    messages.append(f"skill seed manifestUrl must exist: {manifest_url}")
                else:
                    skill_manifest = self._read_seed_json(manifest_path, messages)
                    if isinstance(skill_manifest, dict):
                        if skill_manifest.get("schemaVersion") != "agent-skill-manifest.v1":
                            messages.append(f"skill seed manifest schemaVersion must be agent-skill-manifest.v1 for {skill_key}")
                        for field in ["id", "uuid", "skillKey", "name", "version", "runtime", "entrypoint", "capabilities", "configSchema", "defaultConfig"]:
                            if skill_manifest.get(field) != skill.get(field):
                                messages.append(f"skill seed manifest field mismatch for {skill_key}: {field}")
                        expected_artifacts = sorted(
                            (
                                self._manifest_artifact_metadata(artifact)
                                for artifact in artifacts_by_skill.get(skill_id, [])
                                if isinstance(artifact.get("artifactRef"), str)
                            ),
                            key=lambda artifact: artifact.get("artifactRef") or "",
                        )
                        manifest_artifacts = skill_manifest.get("artifacts")
                        if not isinstance(manifest_artifacts, list):
                            messages.append(f"skill seed manifest artifacts must be an array for {skill_key}")
                            continue
                        actual_artifacts = sorted(
                            (
                                self._manifest_artifact_metadata(artifact)
                                for artifact in manifest_artifacts
                                if isinstance(artifact, dict) and isinstance(artifact.get("artifactRef"), str)
                            ),
                            key=lambda artifact: artifact.get("artifactRef") or "",
                        )
                        if actual_artifacts != expected_artifacts:
                            messages.append(f"skill seed manifest artifact metadata mismatch for {skill_key}")

        messages.extend(self._check_clawhub_local_mirror(skills_root, skills))
        return messages

    def _check_clawhub_local_mirror(self, skills_root: Path, skills: list[Any]) -> list[str]:
        clawhub_skills = [
            skill
            for skill in skills
            if isinstance(skill, dict) and self._is_clawhub_community_skill(skill)
        ]
        if not clawhub_skills:
            return []

        messages: list[str] = []
        raw_index_path = skills_root / "clawhub" / "raw" / "index.json"
        normalized_manifest_path = skills_root / "clawhub" / "manifest.json"
        raw_index = self._read_seed_json(raw_index_path, messages)
        normalized_manifest = self._read_seed_json(normalized_manifest_path, messages)
        if not isinstance(raw_index, dict) or not isinstance(normalized_manifest, dict):
            return messages

        if raw_index.get("mirrorMode") != "full-cursor-mirror":
            messages.append("skill seed ClawHub raw mirror must be full-cursor-mirror")
        if raw_index.get("source", {}).get("listApi") != "https://clawhub.ai/api/v1/skills":
            messages.append("skill seed ClawHub raw mirror must use the public ClawHub list API")

        items = raw_index.get("items")
        if not isinstance(items, list) or len(items) < len(clawhub_skills):
            messages.append("skill seed ClawHub raw mirror must include all seeded community skills")
        mirrored_slugs = {item.get("slug") for item in items if isinstance(item, dict)}
        seeded_manifest_slugs = {
            item.get("slug")
            for item in normalized_manifest.get("seededSkills", [])
            if isinstance(item, dict)
        }
        for skill in clawhub_skills:
            source = skill.get("source") if isinstance(skill.get("source"), dict) else {}
            slug = source.get("slug")
            if slug not in mirrored_slugs:
                messages.append(f"skill seed ClawHub mirror is missing raw list slug for {skill.get('skillKey')}")
            if slug not in seeded_manifest_slugs:
                messages.append(f"skill seed ClawHub normalized manifest is missing seeded slug for {skill.get('skillKey')}")
        return messages

    def _read_seed_json(self, path: Path, messages: list[str]) -> Any:
        if not path.exists():
            messages.append(f"skill seed file is missing: {self._display(path)}")
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            messages.append(f"skill seed file cannot be read: {self._display(path)}: {exc}")
            return None

    def _local_seed_path(self, value: Any, messages: list[str]) -> Path | None:
        if not isinstance(value, str) or not value.strip():
            messages.append(f"skill seed local reference must be a non-empty string: {value}")
            return None
        normalized = value.replace("\\", "/")
        if normalized.startswith(("http://", "https://")):
            messages.append(f"skill seed local reference must not be remote: {value}")
            return None
        if not normalized.startswith("data/skills/"):
            messages.append(f"skill seed local reference must stay under data/skills: {value}")
            return None
        return self.root / normalized

    def _reject_legacy_media_fields(self, item: dict[str, Any], label: str, messages: list[str]) -> None:
        for field in ("coverImage", "assetUrl", "thumbnailUrl", "artifactUrl"):
            if field in item:
                messages.append(f"skill seed {label} must not use legacy media field {field}")

    def _require_media_resource(
        self,
        value: Any,
        kind: str,
        label: str,
        messages: list[str],
    ) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            messages.append(f"{label} must be a MediaResource object")
            return None
        if value.get("kind") != kind:
            messages.append(f"{label} kind must be {kind}")
        source = value.get("source")
        if not isinstance(source, str) or not source.strip():
            messages.append(f"{label} source must be a non-empty string")
        if not self._media_resource_url(value):
            messages.append(f"{label} must include a stable locator")
        return value

    def _media_resource_url(self, value: Any) -> str:
        if not isinstance(value, dict):
            return ""
        for key in ("publicUrl", "url", "uri", "objectKey", "objectBlobId", "id"):
            raw = value.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
            if isinstance(raw, int) and raw > 0:
                return str(raw)
        return ""

    def _id_set(self, items: list[Any], label: str, messages: list[str]) -> set[Any]:
        values = [item.get("id") for item in items if isinstance(item, dict)]
        self._unique_values(values, f"{label} id", messages)
        return set(values)

    def _unique_values(self, values: Any, label: str, messages: list[str]) -> None:
        materialized = list(values)
        if len(materialized) != len(set(materialized)):
            messages.append(f"skill seed {label} values must be unique")

    def _is_sha256_hash(self, value: str) -> bool:
        return len(value) == 71 and value.startswith("sha256:") and all(char in "0123456789abcdef" for char in value[7:])

    def _is_sdkwork_official_skill(self, skill: dict[str, Any]) -> bool:
        return skill.get("sourceType") == "OFFICIAL" and skill.get("provider") == "SDKWork"

    def _is_clawhub_community_skill(self, skill: dict[str, Any]) -> bool:
        return skill.get("sourceType") == "COMMUNITY" and skill.get("provider") == "ClawHub"

    def _artifact_payload_checksum(self, payload: dict[str, Any]) -> str:
        canonical = dict(payload)
        canonical.pop("checksumHash", None)
        encoded = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return "sha256:" + hashlib.sha256(encoded).hexdigest()

    def _manifest_artifact_metadata(self, artifact: dict[str, Any]) -> dict[str, Any]:
        return {
            "artifactRef": artifact.get("artifactRef"),
            "artifact": artifact.get("artifact"),
            "version": artifact.get("version"),
            "runtime": artifact.get("runtime"),
            "checksumHash": artifact.get("checksumHash"),
            "artifactSizeBytes": artifact.get("artifactSizeBytes"),
        }

    def _display(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return str(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check sdkwork-clawrouter project-local SDK skills.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    args = parser.parse_args()

    result = ClawRouterSkillGuardian(root=args.root).run()
    if result.ok:
        print("ClawRouter project skills passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
