import json
import os
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
PORTAL_PACKAGES = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"
DEPENDENCIES_ROOT = ROOT / ".sdkwork" / "dependencies"


def dependency_root(name: str) -> Path:
    local_mirror = DEPENDENCIES_ROOT / name
    if local_mirror.exists():
        return local_mirror
    return WORKSPACE_ROOT / name


def first_existing_path(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


APPBASE_ROOT = dependency_root("sdkwork-appbase")
IAM_ROOT = dependency_root("sdkwork-iam")
IAM_PC_PACKAGES = IAM_ROOT / "apps" / "sdkwork-iam-pc" / "packages"
IAM_COMMON_PACKAGES = IAM_ROOT / "apps" / "sdkwork-iam-common" / "packages"
IAM_SERVICE_INDEX = first_existing_path(
    IAM_COMMON_PACKAGES / "sdkwork-iam-service" / "src" / "index.ts",
    APPBASE_ROOT / "packages" / "common" / "iam" / "sdkwork-iam-service" / "src" / "index.ts",
)
IAM_USER_PC_USER = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-user-pc-react" / "src" / "user.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-user-pc-react" / "src" / "user.ts",
)
IAM_USER_PC_USER_SERVICE = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-user-pc-react" / "src" / "user-service.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-user-pc-react" / "src" / "user-service.ts",
)
IAM_AUTH_PC_SERVICE = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-auth-pc-react" / "src" / "auth-service.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-auth-pc-react" / "src" / "auth-service.ts",
)
IAM_AUTH_PC_RUNTIME = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-auth-pc-react" / "src" / "auth-iam-runtime.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-auth-pc-react" / "src" / "auth-iam-runtime.ts",
)
IAM_AUTH_PC_AUTHORITY = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-auth-pc-react" / "src" / "auth-authority.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-auth-pc-react" / "src" / "auth-authority.ts",
)
IAM_AUTH_PC_RUNTIME_AUTHORITY = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-auth-pc-react" / "src" / "auth-runtime-authority.ts",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-auth-pc-react" / "src" / "auth-runtime-authority.ts",
)
IAM_AUTH_PC_PAGE = first_existing_path(
    IAM_PC_PACKAGES / "sdkwork-auth-pc-react" / "src" / "pages" / "AuthPage.tsx",
    APPBASE_ROOT / "packages" / "pc-react" / "iam" / "sdkwork-auth-pc-react" / "src" / "pages" / "AuthPage.tsx",
)
COMMERCE_ROOT = dependency_root("sdkwork-commerce")
GENERATIONS_ROOT = dependency_root("sdkwork-generations")
IMAGE_ROOT = dependency_root("sdkwork-image")
MUSIC_ROOT = dependency_root("sdkwork-music")
VOICE_ROOT = dependency_root("sdkwork-voice")
MODELS_ROOT = WORKSPACE_ROOT / "sdkwork-models"
MODELS_CATALOG_SERVICE = (
    MODELS_ROOT
    / "apps"
    / "sdkwork-models-pc"
    / "packages"
    / "sdkwork-models-pc-admin-catalog"
    / "src"
    / "modelService.ts"
)
COMMERCE_PC_PACKAGES = COMMERCE_ROOT / "apps" / "sdkwork-commerce-pc" / "packages"
COMMERCE_ADMIN_PRODUCT = COMMERCE_PC_PACKAGES / "sdkwork-commerce-pc-admin-product" / "src"
APPBASE_PC_CONTENT = APPBASE_ROOT / "packages" / "pc-react" / "content"
IMAGE_PC_CONTENT = IMAGE_ROOT / "packages" / "pc-react" / "content"
IMAGE_PC_APP_PACKAGES = IMAGE_ROOT / "apps" / "sdkwork-image-pc" / "packages"
MUSIC_PC_CONTENT = MUSIC_ROOT / "packages" / "pc-react" / "content"
VOICE_PC_CONTENT = VOICE_ROOT / "packages" / "pc-react" / "content"
COMMERCE_PC_ORDER = COMMERCE_PC_PACKAGES / "sdkwork-commerce-pc-order" / "src"
COMMERCE_PC_PAYMENT = COMMERCE_PC_PACKAGES / "sdkwork-commerce-pc-payment" / "src"
COMMERCE_PC_CHECKOUT = COMMERCE_PC_PACKAGES / "sdkwork-commerce-pc-checkout" / "src"
COMMERCE_PC_MEMBERSHIP = COMMERCE_PC_PACKAGES / "sdkwork-commerce-pc-membership" / "src"
SDKWORK_IMAGE_PC_REACT = first_existing_path(
    IMAGE_PC_APP_PACKAGES / "sdkwork-image-pc",
    IMAGE_PC_CONTENT / "sdkwork-image-pc-react",
    APPBASE_PC_CONTENT / "sdkwork-image-pc-react",
)
SDKWORK_AUDIO_PC_REACT = first_existing_path(
    MUSIC_PC_CONTENT / "sdkwork-audio-pc-react",
    VOICE_PC_CONTENT / "sdkwork-audio-pc-react",
    APPBASE_PC_CONTENT / "sdkwork-audio-pc-react",
)
SDKWORK_MEDIA_PC_REACT = first_existing_path(
    MUSIC_PC_CONTENT / "sdkwork-media-pc-react",
    APPBASE_PC_CONTENT / "sdkwork-media-pc-react",
)
SDKWORK_GENERATION_PC_REACT = first_existing_path(
    IMAGE_PC_APP_PACKAGES / "sdkwork-image-pc-generation",
    IMAGE_PC_CONTENT / "sdkwork-generation-pc-react",
    APPBASE_PC_CONTENT / "sdkwork-generation-pc-react",
)
GENERATIONS_PC_WORKSPACE = (
    GENERATIONS_ROOT
    / "apps"
    / "sdkwork-generations-pc"
    / "packages"
    / "sdkwork-generations-pc-workspace"
)
CLAW_APP_SDK = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
CLAW_BACKEND_SDK = ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript"
CLAW_APP_SDK_TYPES_SRC = CLAW_APP_SDK / "src" / "types"
CLAW_BACKEND_SDK_TYPES_SRC = CLAW_BACKEND_SDK / "src" / "types"
CLAW_APP_SDK_GENERATED = CLAW_APP_SDK / "generated" / "server-openapi"
CLAW_BACKEND_SDK_GENERATED = CLAW_BACKEND_SDK / "generated" / "server-openapi"
CLAW_APP_SDK_TYPES_DIST = CLAW_APP_SDK_GENERATED / "dist" / "types"
CLAW_BACKEND_SDK_TYPES_DIST = CLAW_BACKEND_SDK_GENERATED / "dist" / "types"
CLAW_APP_SDK_TYPES_PUBLISHED = first_existing_path(
    CLAW_APP_SDK_GENERATED / "src" / "types",
    CLAW_APP_SDK_TYPES_DIST,
)
CLAW_BACKEND_SDK_TYPES_PUBLISHED = first_existing_path(
    CLAW_BACKEND_SDK_GENERATED / "src" / "types",
    CLAW_BACKEND_SDK_TYPES_DIST,
)
def sdk_published_type_file(types_root: Path, stem: str) -> Path:
    return first_existing_path(
        types_root / f"{stem}.ts",
        types_root / f"{stem}.d.ts",
    )


CLAW_APP_SDK_API_SRC = CLAW_APP_SDK / "src" / "api"
CLAW_BACKEND_SDK_API_SRC = CLAW_BACKEND_SDK / "src" / "api"
APPBASE_STUDIO_TEMPLATE_SQLX = APPBASE_ROOT / "crates" / "sdkwork-studio-template-repository-sqlx"
APPBASE_USER_CENTER_TAURI_HOST = first_existing_path(
    IAM_ROOT / "crates" / "sdkwork-user-center-tauri-host",
    APPBASE_ROOT / "crates" / "sdkwork-user-center-tauri-host",
)


def rel(source: Path) -> str:
    try:
        return source.relative_to(ROOT).as_posix()
    except ValueError:
        return source.relative_to(WORKSPACE_ROOT).as_posix()


def service_rel(source: Path) -> str:
    return rel(source)


COMMONS_RUNTIME_IMPORT_MARKERS = (
    "sdkwork-clawroutes-pc-commons/runtime",
    "@sdkwork/clawroutes-pc-commons/runtime",
)


def imports_commons_runtime(source: str) -> bool:
    return any(marker in source for marker in COMMONS_RUNTIME_IMPORT_MARKERS)


def package_rel(source: Path) -> str:
    if source.name == "package.json":
        return rel(source)
    for parent in [source.parent, *source.parents]:
        package_json = parent / "package.json"
        if package_json.exists():
            return rel(package_json)
    return rel(source)


def shim_rel(_: Path) -> str:
    return rel(PORTAL_ROOT / "src" / "typecheck-shims.d.ts")


class FrontendSourceHygieneStandardTest(unittest.TestCase):
    def test_portal_sources_do_not_ship_mock_or_fake_business_naming(self) -> None:
        violations: list[str] = []
        forbidden = re.compile(r"\b(?:mock|fake)[A-Za-z0-9_]*\b", re.IGNORECASE)

        for source in self._portal_sources():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if forbidden.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Portal production source must use seed/catalog/sample naming instead of mock/fake business naming.",
        )

    def test_portal_sources_do_not_ship_known_mojibake_text(self) -> None:
        mojibake_markers = [
            "\u95b3",
            "\u68e3",
            "\u6960",
            "\u95ba",
            "\u95b8",
            "\u95bb",
            "\u59ab",
            "\u6fde",
            "\u7f01",
            "\u95c1",
            "\u5a34",
            "\u7035",
            "\u5a23",
            "\u7039",
            "\u9435\u56ec\u6531",
            "\u95b9\u517c\u7c8e",
            "\u940e\u7535\u5387",
            "\u95bb\u6a3f\u5796",
            "\u941f\u6b0f\u68dd",
            "\u95b9\u8235\u7260",
            "\u00e5\u00a6\u00af",
            "\u00e2\u201e\u0083",
            "\u00ee",
            "\u00e7\u00bc\u0081",
            "\u00e9\u008d",
            "\u00e9\u00bb\u0098\u00e8\u00ae\u00a4",
            "\u00e5\u0088\u0086\u00e7\u00bb\u0084",
            "\u00e4\u00bc\u0081\u00e4\u00b8\u009a",
            "\u00e5\u0086\u0085\u00e6\u00b5\u008b",
            "\u00e9\u00b2\u009c",
            "\u95b3\u30e6\u6530",
        ]
        violations: list[str] = []

        for source in self._portal_sources():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for marker in mojibake_markers:
                if marker in content:
                    violations.append(f"{relative}: contains mojibake marker {marker!r}")

        self.assertEqual(
            [],
            violations,
            "Portal source text must be readable UTF-8 and must not ship mojibake UI copy.",
        )

    def test_portal_runtime_sources_do_not_log_errors_to_browser_console(self) -> None:
        allowed_example_sources = {
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/Docs.tsx",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-core/src/index.ts",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/pages/ModelDetails.tsx",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/components/SdkEndpointView.tsx",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/data/sdkData.ts",
        }
        violations: list[str] = []
        console_call = re.compile(r"\bconsole\.(?:log|error|warn|debug|trace)\s*\(")

        for source in self._portal_sources():
            relative = rel(source)
            if relative in allowed_example_sources:
                continue
            content = source.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if console_call.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Portal runtime source must surface errors through UI state instead of browser console logging.",
        )

    def test_commons_json_highlighter_accepts_unknown_input_without_any_boundary(self) -> None:
        highlighter = PORTAL_PACKAGES / "sdkwork-clawroutes-pc-commons" / "src" / "utils" / "index.ts"
        source = highlighter.read_text(encoding="utf-8")

        self.assertIn("export const syntaxHighlightJson = (json: unknown): string =>", source)
        self.assertIn("formatSyntaxHighlightJsonValue", source)
        self.assertIn("escapeHtml", source)
        self.assertNotIn("json: any", source)
        self.assertNotIn(": any", source)
        self.assertNotIn("as any", source)

    def test_i18n_browser_language_detection_uses_typed_legacy_navigator(self) -> None:
        i18n_source_path = PORTAL_PACKAGES / "sdkwork-clawrouter-pc-i18n" / "src" / "index.ts"
        source = i18n_source_path.read_text(encoding="utf-8")

        self.assertIn("interface LegacyNavigatorLanguage", source)
        self.assertIn("const navigatorLanguage = window.navigator as Navigator & LegacyNavigatorLanguage", source)
        self.assertIn("navigatorLanguage.userLanguage", source)
        self.assertNotIn("window.navigator as any", source)
        self.assertNotIn("as any", source)

    def test_portal_services_do_not_cast_read_api_items_to_business_models(self) -> None:
        violations: list[str] = []
        forbidden = re.compile(r"readApiItems\([^;\n]*\)\s+as\s+(?:[A-Z][A-Za-z0-9_]*\[\]|Parameters<)")

        for source in self._portal_sources():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if forbidden.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Portal services must validate SDK list payloads with explicit type guards instead of casting readApiItems results.",
        )

    def test_portal_service_media_fields_preserve_media_resource_objects(self) -> None:
        service_sources = [
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-core" / "src" / "admin-category-options.ts",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-user" / "src" / "userService.ts",
        ]
        media_fields = (
            "avatar",
            "cover",
            "icon",
            "thumbnail",
            "asset",
            "artifact",
            "video",
        )
        object_to_string_assignment = re.compile(
            rf"\b(?:{'|'.join(media_fields)})\s*:\s*readMediaResourceUrl\s*\(",
        )
        legacy_url_fallback = re.compile(
            r"\b(?:avatarUrl|coverImage|coverUrl|iconUrl|assetUrl|thumbnailUrl|artifactUrl|videoUrl)\b",
        )
        violations: list[str] = []

        for source in service_sources:
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if object_to_string_assignment.search(line) or legacy_url_fallback.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Portal service models must preserve MediaResource objects; URL extraction belongs at display/input boundaries only.",
        )

    def test_display_media_strings_use_src_or_href_names(self) -> None:
        source_roots = [
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-user" / "src",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src",
        ]
        forbidden_patterns = [
            re.compile(
                r"\bconst\s+[A-Za-z0-9_]*(?:avatar|asset|download|image|thumbnail|video|qrCode)[A-Za-z0-9_]*Url\s*=\s*read(?:MediaResourceUrl|SdkworkGenerationMediaUrl)\s*\(",
                re.IGNORECASE,
            ),
            re.compile(r"\bfunction\s+getReleaseDownloadUrl\b"),
        ]
        violations: list[str] = []

        for source_root in source_roots:
            for source in source_root.rglob("*"):
                if source.suffix not in {".ts", ".tsx"}:
                    continue
                relative = rel(source)
                content = source.read_text(encoding="utf-8", errors="ignore")
                for pattern in forbidden_patterns:
                    for match in pattern.finditer(content):
                        line_number = content.count("\n", 0, match.start()) + 1
                        line = content.splitlines()[line_number - 1].strip()
                        violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Concrete media URL strings in UI rendering must be named by final use, such as imageSrc, avatarSrc, thumbnailSrc, or downloadHref.",
        )

    def test_specs_define_canonical_media_resource_contract(self) -> None:
        api_spec = (ROOT / "specs" / "API_SPEC.md").read_text(encoding="utf-8", errors="ignore")
        database_spec = (ROOT / "specs" / "DATABASE_SPEC.md").read_text(encoding="utf-8", errors="ignore")

        api_required = [
            "## Media Resource Fields",
            "Media fields MUST be JSON `MediaResource` objects end to end",
            "`cover`, `thumbnail`, `asset`, `artifact`, `video`, `audio`, `avatar`, `icon`, `logo`, `favicon`, `qrCode`",
            "Concrete URL strings are allowed only at input, display, download, playback, or provider protocol boundaries",
            "Do not introduce `coverMedia`, `coverImage`, `coverUrl`, `thumbnailUrl`, `assetUrl`, `videoUrl`, or `*_url` JSON fields",
            "Generated SDK types must expose media fields as `MediaResource`, not `string`",
        ]
        database_required = [
            "## Media Resource Persistence",
            "Business tables MUST NOT store naked media URL columns",
            "`<field>_media_resource_id`",
            "`<field>_object_blob_id`",
            "`<field>_resource_snapshot`",
            "S3, OSS, MinIO, local disk, CDN, and future AI-generated media providers",
            "MediaResource snapshots are immutable historical views",
        ]

        violations: list[str] = []
        for snippet in api_required:
            if snippet not in api_spec:
                violations.append(f"specs/API_SPEC.md: missing {snippet!r}")
        for snippet in database_required:
            if snippet not in database_spec:
                violations.append(f"specs/DATABASE_SPEC.md: missing {snippet!r}")

        self.assertEqual(
            [],
            violations,
            "Specs must define the canonical MediaResource object contract and forbid naked URL media fields.",
        )

    def test_contract_generator_upload_fixtures_preserve_media_resource_objects(self) -> None:
        fixture_sources = [
            ROOT / "tests" / "test_api_contract_manifest.py",
            ROOT / "tests" / "test_clawrouter_openapi_generator.py",
            ROOT / "tests" / "test_clawrouter_payload_sdk_audit.py",
            ROOT / "tests" / "test_clawrouter_strict_sdk_generate.py",
            ROOT / "tests" / "test_frontend_field_audit.py",
        ]
        forbidden = re.compile(r"\bvideoUrl\b")
        violations: list[str] = []

        for source in fixture_sources:
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if forbidden.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Contract, OpenAPI, SDK, and frontend audit upload fixtures must expose video as a MediaResource object, not a legacy upload URL alias.",
        )

    def test_test_support_ai_model_media_columns_use_resource_snapshots(self) -> None:
        source = ROOT / "crates" / "sdkwork-claw-test-support" / "src" / "lib.rs"
        content = source.read_text(encoding="utf-8", errors="ignore")
        required_snippets = [
            "logo_media_resource_id TEXT",
            "logo_object_blob_id INTEGER",
            "logo_resource_snapshot TEXT",
            "icon_media_resource_id TEXT",
            "icon_object_blob_id INTEGER",
            "icon_resource_snapshot TEXT",
        ]
        forbidden = re.compile(r"\b(?:logo_url|icon_url)\s+TEXT\b")
        violations: list[str] = []

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{rel(source)}: missing {snippet!r}")
        for match in forbidden.finditer(content):
            line_number = content.count("\n", 0, match.start()) + 1
            line = content.splitlines()[line_number - 1].strip()
            violations.append(f"{rel(source)}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Test support AI model tables must mirror canonical MediaResource reference columns instead of bare icon/logo URL fields.",
        )

    def test_admin_api_database_config_test_schema_uses_media_resource_columns(self) -> None:
        source = ROOT / "services" / "sdkwork-clawrouter-admin-api-server" / "tests" / "database_config_router.rs"
        relative = rel(source)
        content = source.read_text(encoding="utf-8", errors="ignore")
        required_snippets = [
            "logo_media_resource_id TEXT",
            "logo_object_blob_id INTEGER",
            "logo_resource_snapshot TEXT",
            "icon_media_resource_id TEXT",
            "icon_object_blob_id INTEGER",
            "icon_resource_snapshot TEXT",
            "cover_media_resource_id TEXT",
            "cover_object_blob_id INTEGER",
            "cover_resource_snapshot TEXT",
        ]
        forbidden_patterns = (
            re.compile(r"\blogo_url\s+TEXT\b"),
            re.compile(r"\bicon_url\s+TEXT\b"),
            re.compile(r"\bcover_image\s+TEXT\b"),
        )
        violations: list[str] = []

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for line_number, line in enumerate(content.splitlines(), start=1):
            if any(pattern.search(line) for pattern in forbidden_patterns):
                violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Admin API database-config test schema must use canonical MediaResource columns instead of legacy logo/icon/cover URL columns.",
        )

    def test_appbase_native_studio_migrations_use_media_resource_columns(self) -> None:
        migration_sources = [
            APPBASE_STUDIO_TEMPLATE_SQLX / "migrations" / "0001_studio_catalog.sql",
            APPBASE_STUDIO_TEMPLATE_SQLX / "migrations" / "0002_studio_app_template.sql",
        ]
        if not all(source.is_file() for source in migration_sources):
            self.skipTest("appbase native studio migration fixtures are unavailable in this workspace checkout")
        required_by_file = {
            "0001_studio_catalog.sql": [
                "asset_media_resource_id VARCHAR(128)",
                "asset_object_blob_id BIGINT",
                "asset_resource_snapshot JSONB",
                "thumbnail_media_resource_id VARCHAR(128)",
                "thumbnail_object_blob_id BIGINT",
                "thumbnail_resource_snapshot JSONB",
                "artifact_media_resource_id VARCHAR(128)",
                "artifact_object_blob_id BIGINT",
                "artifact_resource_snapshot JSONB",
            ],
            "0002_studio_app_template.sql": [
                "icon_media_resource_id VARCHAR(128)",
                "icon_object_blob_id BIGINT",
                "icon_resource_snapshot JSONB",
                "cover_media_resource_id VARCHAR(128)",
                "cover_object_blob_id BIGINT",
                "cover_resource_snapshot JSONB",
            ],
        }
        forbidden = re.compile(r"\b(?:asset_url|thumbnail_url|artifact_url|icon_url|cover_url)\b")
        violations: list[str] = []

        for source in migration_sources:
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_by_file[source.name]:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for match in forbidden.finditer(content):
                line_number = content.count("\n", 0, match.start()) + 1
                line = content.splitlines()[line_number - 1].strip()
                violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Appbase native studio migrations must persist media through canonical MediaResource reference and snapshot columns.",
        )

    def test_active_design_docs_describe_canonical_media_resource_fields(self) -> None:
        docs_dir = ROOT / "docs" / "architecture" / "tech"
        active_doc_sources = [
            docs_dir / "TECH-11-design.md",
            docs_dir / "TECH-12-featuresmodules.md",
            docs_dir / "TECH-legacy-14.md",
            docs_dir / "TECH-17-appcenter-plusapp-compatible-design.md",
            docs_dir / "TECH-18-skillshub-agentskills-pluscategory-compatible-design.md",
        ]
        legacy_media_fields = re.compile(
            r"\b(?:cover_image|cover_url|icon_url|logo_url|thumbnail_url|video_url|asset_url|artifact_url|media_url)\b"
        )
        required_snippets = {
            "11": [
                "icon_media_resource_id",
                "logo_resource_snapshot",
                "cover_resource_snapshot",
                "video_resource_snapshot",
            ],
            "12": [
                "icon_resource_snapshot",
                "asset_resource_snapshot",
                "thumbnail_resource_snapshot",
                "MediaResource",
            ],
            "14": [
                "logo_media_resource_id",
                "icon_resource_snapshot",
            ],
            "TECH-17-appcenter-plusapp-compatible-design.md": [
                "MediaResource",
                "icon_resource_snapshot",
                "resource_list",
            ],
            "TECH-18-skillshub-agentskills-pluscategory-compatible-design.md": [
                "MediaResource",
                "cover_resource_snapshot",
                "icon_resource_snapshot",
            ],
        }
        violations: list[str] = []
        snippet_key_by_name = {
            "TECH-11-design.md": "11",
            "TECH-12-featuresmodules.md": "12",
            "TECH-legacy-14.md": "14",
        }

        for source in active_doc_sources:
            relative = rel(source)
            snippet_key = snippet_key_by_name.get(source.name, source.name)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets[snippet_key]:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for match in legacy_media_fields.finditer(content):
                line_number = content.count("\n", 0, match.start()) + 1
                line = content.splitlines()[line_number - 1].strip()
                violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Active design docs must describe canonical MediaResource object/reference fields instead of legacy bare media URL columns.",
        )

    def test_app_agent_registry_backend_media_fields_preserve_media_resource_objects(self) -> None:
        self.skipTest("app agent registry removed from claw router; owned by sdkwork-kernel")

    def test_generation_history_media_fields_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "historyMapper.ts": [
                "asset: normalizeOptionalMediaResource(item.asset),",
                "images: normalizeMediaResourceArray(item.images),",
                "videos: normalizeMediaResourceArray(item.videos),",
            ],
            SDKWORK_GENERATION_PC_REACT / "src" / "generation-history.ts": [
                "export type SdkworkGenerationMediaResource = SdkworkMediaResource;",
                "asset: SdkworkGenerationMediaResource;",
                "asset?: SdkworkGenerationMediaResource;",
                "images?: SdkworkGenerationMediaResource[];",
            ],
        }
        forbidden_patterns = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "historyMapper.ts": [
                r"\burl\s*:\s*normalizeOptionalString\(item\.url\)",
                r"\bnormalizeStringArray\b",
                r"\bnormalizeVideoArray\b",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "playgroundGenerationsService.ts": [
                r"\breadFirstString\s*\(\s*value\s*,\s*\[[^\]]*(?:assetUrl|downloadUrl|fileUrl|mediaUrl)",
                r"\breadFirstString\s*\(\s*record\s*,\s*\[[^\]]*(?:thumbnailUrl|posterUrl|coverUrl|previewUrl)",
                r"\bcreateExternalUrlMediaResource\b",
                r"\bmediaKindForGenerationTargetType\b",
            ],
            SDKWORK_GENERATION_PC_REACT / "src" / "generation-history.ts": [
                r"\bexport\s+type\s+SdkworkGenerationMedia\s*=\s*string",
                r"\bimages\?:\s*string\[\]",
                r"\bupdatedAt\?:\s*string;\s*\n\s*url\?:\s*string;",
                r"\burl:\s*item\.url\s*\|\|",
                r"(?s)export\s+interface\s+SdkworkGenerationArtifact\s*\{[^}]*\bthumb\?:\s*string",
                r"(?s)export\s+interface\s+SdkworkGenerationArtifact\s*\{[^}]*\burl:\s*string",
            ],
        }
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")

        for source, patterns in forbidden_patterns.items():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    line_number = content.count("\n", 0, match.start()) + 1
                    line = content.splitlines()[line_number - 1].strip()
                    violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Generation history media fields must remain MediaResource objects across backend and frontend view models; URL extraction belongs in preview/download/playback rendering only.",
        )

    def test_catalog_and_branding_media_models_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-catalog" / "src" / "ProductCreatePage.tsx": [
                r"\bimageUrl\s*:\s*string\b",
                r"\bimageUrl\s*=",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-catalog" / "src" / "SkuManagementPage.tsx": [
                r"\bimageUrl\b",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-catalog" / "src" / "ProductListPage.tsx": [
                r"\breadProductString\s*\(\s*record\s*,\s*\[[^\]]*(?:coverUrl|imageUrl|thumbnailUrl)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-site" / "src" / "SiteSettingsService.ts": [
                r"\b(?:logoUrl|iconUrl|faviconUrl)\s*:",
                r"\breadString\s*\(\s*record\s*,\s*'(?:logoUrl|iconUrl|faviconUrl)'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawroutes-pc-commons" / "src" / "siteBranding.ts": [
                r"\b(?:logoUrl|iconUrl|faviconUrl)\s*:",
                r"\breadConfiguredString\s*\(\s*record\s*,\s*'(?:logoUrl|iconUrl|faviconUrl)'",
            ],
        }
        violations: list[str] = []

        for source, patterns in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    line_number = content.count("\n", 0, match.start()) + 1
                    line = content.splitlines()[line_number - 1].strip()
                    violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Catalog and site branding media models must carry MediaResource objects; only concrete UI display/input code may read URL strings.",
        )

    def test_admin_product_list_cover_reader_returns_media_resource_object(self) -> None:
        source = PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-catalog" / "src" / "ProductListPage.tsx"
        if not source.exists():
            self.skipTest("admin catalog package removed from claw router PC surface")
        re_export = source.read_text(encoding="utf-8", errors="ignore")
        self.assertIn("@sdkwork/commerce-pc-admin-product", re_export)
        self.assertIn("readProductCoverResource", re_export)
        implementation_source = first_existing_path(
            COMMERCE_ADMIN_PRODUCT / "ProductListPage.tsx",
            source,
        )
        if not implementation_source.exists():
            self.skipTest("commerce admin product package is not available in this workspace")
        relative = rel(implementation_source)
        content = implementation_source.read_text(encoding="utf-8", errors="ignore")
        violations: list[str] = []
        required_snippets = [
            "export function readProductCoverResource(record: ProductRecord): ClawRouterMediaResource | undefined",
            "const coverSource = readMediaResourceUrl(coverResource);",
            "return readMediaResource(preferred.resource);",
        ]
        forbidden_patterns = [
            r"\breadProductCoverSource\b",
            r"\bexport\s+function\s+readProductCoverResource\([^)]*\):\s*string\b",
            r"\breadMediaResourceUrl\s*\(\s*(?:item|preferred)\.resource\s*\)",
            r"\breadProductString\s*\(\s*record\s*,\s*\[[^\]]*(?:coverUrl|imageUrl|thumbnailUrl)",
        ]

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for pattern in forbidden_patterns:
            for match in re.finditer(pattern, content):
                line_number = content.count("\n", 0, match.start()) + 1
                line = content.splitlines()[line_number - 1].strip()
                violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Product list cover normalization must return a MediaResource object and defer URL extraction to the img display boundary.",
        )

    def test_admin_sku_management_form_preserves_image_media_resource_object(self) -> None:
        source = PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-catalog" / "src" / "SkuManagementPage.tsx"
        if not source.exists():
            self.skipTest("admin catalog package removed from claw router PC surface")
        re_export = source.read_text(encoding="utf-8", errors="ignore")
        self.assertIn("@sdkwork/commerce-pc-admin-product", re_export)
        self.assertIn("SkuManagementPage", re_export)
        implementation_source = first_existing_path(
            COMMERCE_ADMIN_PRODUCT / "SkuManagementPage.tsx",
            source,
        )
        if not implementation_source.exists():
            self.skipTest("commerce admin product package is not available in this workspace")
        relative = rel(implementation_source)
        content = implementation_source.read_text(encoding="utf-8", errors="ignore")
        violations: list[str] = []
        required_snippets = [
            "image?: ClawRouterMediaResource;",
            "image: readSkuImage(record),",
            "image: form.image,",
            "onChange={(event) => setForm((current) => ({ ...current, image: toExternalUrlMediaResource(event.target.value, 'image') }))}",
            "value={readMediaResourceUrl(form.image)}",
        ]
        forbidden_patterns = [
            r"\bimageUrl\b",
            r"\breadMediaResourceUrl\s*\(\s*readSkuImage\s*\(",
        ]

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for pattern in forbidden_patterns:
            for match in re.finditer(pattern, content):
                line_number = content.count("\n", 0, match.start()) + 1
                line = content.splitlines()[line_number - 1].strip()
                violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Admin SKU management forms must preserve SKU image as a MediaResource object and only read URLs at concrete input/display boundaries.",
        )

    def test_business_runtime_media_models_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-memberships" / "src" / "membershipsService.ts": [
                r"\bicon\??\s*:\s*string\b",
                r"\bicon\s*:\s*readMediaResourceUrl\s*\(",
                r"\b(?:iconUrl|icon_url)\b",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "components" / "views" / "AssetGalleryView.tsx": [
                r"\bthumbnail\??\s*:\s*string\b",
                r"\burl\??\s*:\s*string\b",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "components" / "views" / "AssetView.tsx": [
                r"\burl\s*:\s*string\s*\|\s*undefined\b",
                r"\breadAssetThumbnail\s*\([^)]*,\s*url\s*\)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-vip" / "src" / "vipService.ts": [
                r"\bicon\??\s*:\s*string\b",
            ],
        }
        violations: list[str] = []

        for source, patterns in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    line_number = content.count("\n", 0, match.start()) + 1
                    line = content.splitlines()[line_number - 1].strip()
                    violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Business runtime media models must preserve MediaResource objects; URL strings belong only at display/input boundaries.",
        )

    def test_app_sdk_published_types_export_media_resource(self) -> None:
        sdk_types_index = sdk_published_type_file(CLAW_APP_SDK_TYPES_PUBLISHED, "index")
        sdk_media_type = sdk_published_type_file(CLAW_APP_SDK_TYPES_PUBLISHED, "media-resource")

        self.assertTrue(sdk_types_index.exists(), f"{rel(sdk_types_index)} must exist")
        self.assertTrue(sdk_media_type.exists(), f"{rel(sdk_media_type)} must exist")
        self.assertIn(
            "export type { MediaResource } from './media-resource';",
            sdk_types_index.read_text(encoding="utf-8", errors="ignore"),
            "@sdkwork/clawrouter-app-sdk published types must export MediaResource so portal media models can share the SDK object shape.",
        )

    def test_backend_sdk_published_category_types_preserve_media_resource_icon(self) -> None:
        update_request = sdk_published_type_file(
            CLAW_BACKEND_SDK_TYPES_PUBLISHED,
            "admin-site-settings-update-request",
        )

        relative = rel(update_request)
        content = update_request.read_text(encoding="utf-8", errors="ignore")
        self.assertIn(
            "import type { MediaResource } from './media-resource';",
            content,
            f"{relative} must import MediaResource for site icon.",
        )
        self.assertIn(
            "icon?: MediaResource;",
            content,
            f"{relative} must preserve site icon as MediaResource.",
        )

    def test_generated_table_record_sdk_media_fields_preserve_media_resource_objects(self) -> None:
        sdk_record_expectations = {
            CLAW_APP_SDK_TYPES_SRC / "site-runtime-settings-response.ts": [
                "favicon: MediaResource;",
                "icon: MediaResource;",
                "logo: MediaResource;",
            ],
            sdk_published_type_file(CLAW_APP_SDK_TYPES_PUBLISHED, "site-runtime-settings-response"): [
                "favicon: MediaResource;",
                "icon: MediaResource;",
                "logo: MediaResource;",
            ],
            CLAW_BACKEND_SDK_TYPES_SRC / "admin-site-settings-update-request.ts": [
                "icon?: MediaResource;",
            ],
            sdk_published_type_file(CLAW_BACKEND_SDK_TYPES_PUBLISHED, "admin-site-settings-update-request"): [
                "icon?: MediaResource;",
            ],
        }

        for source, required_snippets in sdk_record_expectations.items():
            if not source.exists():
                self.fail(f"{rel(source)} must exist")
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            self.assertIn(
                "import type { MediaResource } from './media-resource';",
                content,
                f"{relative} must import MediaResource for table-record media fields.",
            )
            for snippet in required_snippets:
                self.assertIn(snippet, content, f"{relative} must preserve {snippet}")
            self.assertNotIn(
                "icon?: string;",
                content,
                f"{relative} must not collapse table-record icon media into a string URL.",
            )
            for forbidden in (
                "image: string;",
                "screenshots: string[];",
                "cover?: string;",
                "artifact?: string;",
            ):
                self.assertNotIn(forbidden, content, f"{relative} must not collapse table-record media into strings.")

    def test_generated_table_record_sdks_do_not_expose_media_storage_columns(self) -> None:
        sdk_type_roots = [
            CLAW_APP_SDK_TYPES_SRC,
            CLAW_APP_SDK_TYPES_PUBLISHED,
            CLAW_BACKEND_SDK_TYPES_SRC,
            CLAW_BACKEND_SDK_TYPES_PUBLISHED,
        ]
        media_storage_pattern = re.compile(r"\b[A-Za-z0-9_]+_(?:media_resource_id|object_blob_id|resource_snapshot)\??:")
        violations: list[str] = []

        for sdk_type_root in sdk_type_roots:
            if not sdk_type_root.exists():
                continue
            for source in [*sdk_type_root.glob("*-record.ts"), *sdk_type_root.glob("*-record.d.ts")]:
                content = source.read_text(encoding="utf-8", errors="ignore")
                for line_number, line in enumerate(content.splitlines(), start=1):
                    if media_storage_pattern.search(line):
                        relative = rel(source)
                        violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Generated SDK record types must expose logical MediaResource fields, not storage snapshot/id columns.",
        )

    def test_appbase_business_media_models_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            IAM_SERVICE_INDEX: [
                "avatar?: SdkworkMediaResource;",
                "avatar: readSdkworkMediaResource(remote.avatar),",
            ],
            IAM_USER_PC_USER: [
                "avatar?: SdkworkMediaResource;",
                "avatar: profile.avatar,",
            ],
            IAM_USER_PC_USER_SERVICE: [
                "avatar?: SdkworkMediaResource;",
                "avatar: readSdkworkMediaResource(profile.avatar),",
                "avatar: readSdkworkMediaResource(updated.avatar) || profile.avatar,",
            ],
            COMMERCE_PC_ORDER / "order-service.ts": [
                "productImage?: SdkworkMediaResource;",
                "image?: SdkworkMediaResource;",
                "productImage: readSdkworkMediaResource(order.productImage),",
                "image: readSdkworkMediaResource(item.productImage),",
            ],
            COMMERCE_PC_PAYMENT / "payment.ts": [
                "icon?: SdkworkMediaResource;",
            ],
            COMMERCE_PC_PAYMENT / "payment-service.ts": [
                "icon: readSdkworkMediaResource(method.methodIcon) || readSdkworkMediaResource(method.icon),",
            ],
            COMMERCE_PC_MEMBERSHIP / "membership-service.ts": [
                "icon?: SdkworkMediaResource;",
                "icon: readSdkworkMediaResource(level.icon),",
            ],
        }
        forbidden_patterns = (
            re.compile(r"\bavatarUrl\??:\s*string\b"),
            re.compile(r"\bavatar\??:\s*string\b"),
            re.compile(r"\bproductImage\??:\s*string\b"),
            re.compile(r"\bimage\??:\s*string\b"),
            re.compile(r"\bicon\??:\s*string\b"),
            re.compile(r"\bavatarUrl\b"),
            re.compile(r"\btoSdkworkCommerceOptionalString\s*\(\s*(?:order|item)\.productImage\s*\)"),
            re.compile(r"\btoSdkworkCommerceOptionalString\s*\(\s*(?:method\.methodIcon|method\.icon|level\.icon)\s*\)"),
            re.compile(r"\bnormalizeOptionalString\s*\(\s*(?:profile|updated)\.avatar\s*\)"),
        )
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if any(pattern.search(line) for pattern in forbidden_patterns):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Appbase IAM and commerce business models must preserve SdkworkMediaResource objects; URL strings belong only at input/display/action boundaries.",
        )

    def test_appbase_auth_user_avatar_preserves_media_resource_objects(self) -> None:
        source_expectations = {
            IAM_AUTH_PC_SERVICE: [
                "avatar?: SdkworkMediaResource;",
                "avatar: readSdkworkMediaResource(identity.avatar),",
                "avatar: readFirstAuthMediaResource(primary?.avatar, secondary?.avatar),",
                "avatar: readSdkworkMediaResource(identity.avatar),",
            ],
            IAM_AUTH_PC_RUNTIME: [
                "avatar: readSdkworkMediaResource(user.avatar),",
            ],
            IAM_AUTH_PC_AUTHORITY: [
                "avatar?: SdkworkMediaResource;",
                "avatar: input.avatar,",
            ],
            IAM_AUTH_PC_RUNTIME_AUTHORITY: [
                "avatar?: SdkworkMediaResource;",
                "avatar: request.avatar,",
            ],
        }
        forbidden_patterns = (
            re.compile(r"\bavatarUrl\??:\s*(?:string|unknown)\b"),
            re.compile(r"\bavatar\??:\s*string\b"),
            re.compile(r"\bavatarUrl\b"),
            re.compile(r"\bnormalizeOptional(?:String|Scalar|Text)\s*\([^)]*\.avatar"),
        )
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if any(pattern.search(line) for pattern in forbidden_patterns):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Appbase auth user/avatar models must expose avatar as SdkworkMediaResource and must not retain avatarUrl compatibility fields.",
        )

    def test_appbase_auth_qr_images_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            IAM_AUTH_PC_SERVICE: [
                "qrCode?: SdkworkMediaResource;",
                "qrCode: readSdkworkMediaResource(session.qrCode),",
            ],
            IAM_AUTH_PC_RUNTIME: [
                "qrCode?: unknown;",
                "qrCode: readSdkworkMediaResource(record.qrCode),",
            ],
            IAM_AUTH_PC_PAGE: [
                "const qrImageResourceSrc = getSdkworkMediaDeliveryUrl(nextQrCode.qrCode);",
            ],
        }
        forbidden_patterns = (
            re.compile(r"\bimageUrl\??:\s*(?:string|unknown)\b"),
            re.compile(r"\bqrUrl\??:\s*string\b"),
            re.compile(r"\bqrCodeUrl\??:\s*(?:string|unknown)\b"),
            re.compile(r"\bqrImageUrl\??:\s*(?:string|unknown)\b"),
            re.compile(r"\bresolveQrImageUrl\b"),
            re.compile(r"\bnormalizeOptionalQrImageUrl\b"),
        )
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if any(pattern.search(line) for pattern in forbidden_patterns):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Auth QR login image payloads must use qrCode as SdkworkMediaResource; qrContent may remain text for generated QR codes.",
        )

    def test_appbase_payment_qr_images_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            COMMERCE_PC_PAYMENT / "payment.ts": [
                "qrImage?: SdkworkMediaResource;",
                "qrContent?: string;",
            ],
            COMMERCE_PC_PAYMENT / "payment-service.ts": [
                "deriveQrImage(payment)",
                "qrContent: deriveQrContent(payment) || fallback.qrContent,",
                "qrImage: deriveQrImage(payment) || fallback.qrImage,",
            ],
            COMMERCE_PC_PAYMENT / "components" / "payment-detail-drawer.tsx": [
                "const qrImageResourceSrc = getSdkworkMediaDeliveryUrl(detail.qrImage);",
                "QRCode.toDataURL(detail.qrContent",
            ],
            COMMERCE_PC_CHECKOUT / "checkout-service.ts": [
                "qrImage?: SdkworkMediaResource;",
                "qrContent?: string;",
                "qrContent = payment.qrContent;",
                "qrImage = payment.qrImage;",
            ],
        }
        forbidden_patterns = (
            re.compile(r"\bqrCode\??:\s*string\b"),
            re.compile(r"\bqrCode:\s*deriveQrCode\b"),
            re.compile(r"\bdetail\.qrCode\b"),
            re.compile(r"\bpayment\.qrCode\b"),
        )
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if any(pattern.search(line) for pattern in forbidden_patterns):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Payment QR payloads must split qrContent text from qrImage SdkworkMediaResource; image/data URL QR values must not remain qrCode strings.",
        )

    def test_appbase_chat_attachments_preserve_media_resource_objects(self) -> None:
        source = APPBASE_ROOT / "packages" / "pc-react" / "intelligence" / "sdkwork-chat-pc-react" / "src" / "chat.ts"
        if not source.is_file():
            self.skipTest("appbase chat package source is unavailable in this workspace checkout")
        relative = rel(source)
        content = source.read_text(encoding="utf-8", errors="ignore")
        required_snippets = [
            "type SdkworkMediaResource,",
            "getSdkworkMediaDeliveryUrl,",
            "resource: SdkworkMediaResource;",
            "const deliveryUrl = getSdkworkMediaDeliveryUrl(attachment.resource);",
        ]
        package_source = APPBASE_ROOT / "packages" / "pc-react" / "intelligence" / "sdkwork-chat-pc-react" / "package.json"
        forbidden_patterns = (
            re.compile(r"\bpreviewUrl\??:\s*string\b"),
            re.compile(r"\burl\??:\s*string\b"),
            re.compile(r"\battachment\.url\b"),
            re.compile(r"\battachment\.previewUrl\b"),
        )
        violations: list[str] = []

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for line_number, line in enumerate(content.splitlines(), start=1):
            if any(pattern.search(line) for pattern in forbidden_patterns):
                violations.append(f"{relative}:{line_number}: {line.strip()}")
        package_content = package_source.read_text(encoding="utf-8", errors="ignore")
        if '"@sdkwork/appbase-pc-react": "*"' not in package_content:
            violations.append(f"{package_rel(source)}: missing @sdkwork/appbase-pc-react peer dependency")
        if '"@sdkwork/appbase-pc-react": {\n      "optional": true\n    }' not in package_content:
            violations.append(f"{package_rel(source)}: missing @sdkwork/appbase-pc-react optional peer metadata")

        self.assertEqual(
            [],
            violations,
            "Chat attachments must preserve SdkworkMediaResource objects; URL extraction belongs only at LLM/display text boundaries.",
        )

    def test_appbase_content_workspace_items_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            SDKWORK_IMAGE_PC_REACT / "src" / "image.ts": [
                'import type { SdkworkMediaResource } from "@sdkwork/image-contracts";',
                "resource: SdkworkMediaResource;",
                "resource: createGeneratedImageResource(",
            ],
            SDKWORK_AUDIO_PC_REACT / "src" / "audio.ts": [
                'import type { SdkworkMediaResource } from "@sdkwork/media-pc-react";',
                "resource: SdkworkMediaResource;",
                "resource: createGeneratedAudioResource(",
            ],
            SDKWORK_MEDIA_PC_REACT / "src" / "media.ts": [
                "export interface SdkworkMediaResource {",
                "resource: SdkworkMediaResource;",
                "resource: createGeneratedMediaResource(",
            ],
        }
        package_expectations = {
            SDKWORK_IMAGE_PC_REACT / "package.json": [
                '"@sdkwork/image-contracts": "*"',
                '"@sdkwork/image-contracts": {\n      "optional": true\n    }',
            ],
            SDKWORK_AUDIO_PC_REACT / "package.json": [
                '"@sdkwork/media-pc-react": "workspace:*"',
            ],
            SDKWORK_MEDIA_PC_REACT / "package.json": [
                '"name": "@sdkwork/media-pc-react"',
            ],
        }
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")

        for source, required_snippets in package_expectations.items():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")

        self.assertEqual(
            [],
            violations,
            "Appbase content workspace items must carry canonical SdkworkMediaResource objects from appbase, not package-local media shapes.",
        )

    def test_appbase_generation_history_uses_canonical_media_resource(self) -> None:
        source = SDKWORK_GENERATION_PC_REACT / "src" / "generation-history.ts"
        shim_source = PORTAL_ROOT / "src" / "typecheck-shims.d.ts"
        package_source = SDKWORK_GENERATION_PC_REACT / "package.json"
        relative = rel(source)
        content = source.read_text(encoding="utf-8", errors="ignore")
        shim_content = shim_source.read_text(encoding="utf-8", errors="ignore")
        package_content = package_source.read_text(encoding="utf-8", errors="ignore")
        required_snippets = [
            'import { getSdkworkMediaDeliveryUrl, type SdkworkMediaResource } from "@sdkwork/image-contracts";',
            "export type SdkworkGenerationMediaResource = SdkworkMediaResource;",
            "export type SdkworkGenerationMedia = SdkworkMediaResource;",
            "const mediaKey = getSdkworkMediaDeliveryUrl(media)",
        ]
        forbidden_patterns = (
            re.compile(r"\bexport\s+interface\s+SdkworkGenerationMediaResource\b"),
            re.compile(r"\bmedia\?\.(?:publicUrl|url)\b"),
        )
        violations: list[str] = []

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for line_number, line in enumerate(content.splitlines(), start=1):
            if any(pattern.search(line) for pattern in forbidden_patterns):
                violations.append(f"{relative}:{line_number}: {line.strip()}")
        if "import type { SdkworkMediaResource } from '@sdkwork/appbase-pc-react';" not in shim_content:
            violations.append(f"{shim_rel(source)}: missing SdkworkMediaResource shim import")
        if "export type SdkworkGenerationMediaResource = SdkworkMediaResource;" not in shim_content:
            violations.append(f"{shim_rel(source)}: missing canonical generation media alias")
        for match in re.finditer(r"\bexport\s+interface\s+SdkworkGenerationMediaResource\b", shim_content):
            line_number = shim_content.count("\n", 0, match.start()) + 1
            line = shim_content.splitlines()[line_number - 1].strip()
            violations.append(f"{shim_rel(source)}:{line_number}: {line}")
        if '"@sdkwork/image-contracts": "workspace:*"' not in package_content:
            violations.append(f"{package_rel(source)}: missing @sdkwork/image-contracts dependency")

        self.assertEqual(
            [],
            violations,
            "Generation history media must reuse canonical SdkworkMediaResource and use the shared delivery URL helper at display/dedupe boundaries.",
        )

    def test_playground_reference_inputs_preserve_media_resource_objects(self) -> None:
        type_source = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "playgroundTypes.ts"
        )
        panel_source = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "components"
            / "AssetGenerationPanel.tsx"
        )
        service_source = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "playgroundGenerationService.ts"
        )
        required_snippets = {
            type_source: [
                "ClawRouterMediaResource",
                "resource: ClawRouterMediaResource;",
            ],
            panel_source: [
                "toExternalUrlMediaResource(",
                "previewSrc",
                "resource:",
            ],
            service_source: [
                "referenceAssets: input.referenceAssets",
                "referenceImages: input.referenceImages",
            ],
        }
        forbidden_patterns = {
            type_source: [
                r"\bdataUrl\?:\s*string\b",
                r"\burl\?:\s*string\b",
                r"\bassetId\?:\s*string\b",
            ],
            panel_source: [
                r"\bdataUrl\s*:",
                r"\bmetadata:\s*\{[^}]*\burl\s*:",
            ],
        }
        violations: list[str] = []

        for source, snippets in required_snippets.items():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")

        for source, patterns in forbidden_patterns.items():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for pattern in patterns:
                for match in re.finditer(pattern, content, re.DOTALL):
                    line_number = content.count("\n", 0, match.start()) + 1
                    line = content.splitlines()[line_number - 1].strip()
                    violations.append(f"{relative}:{line_number}: {line}")

        self.assertEqual(
            [],
            violations,
            "Playground reference image/video/audio inputs must carry MediaResource objects; data/blob URL strings stay only in local preview or provider protocol boundaries.",
        )

    def test_appbase_native_user_center_avatar_preserves_media_resource_objects(self) -> None:
        source = APPBASE_USER_CENTER_TAURI_HOST / "src" / "user_center_authority.rs"
        if not source.is_file():
            self.skipTest("iam user center tauri host source is unavailable in this workspace checkout")
        relative = rel(source)
        content = source.read_text(encoding="utf-8", errors="ignore")
        required_snippets = [
            "pub struct UserCenterMediaResource",
            "avatar_resource_snapshot TEXT NULL",
            "logo_resource_snapshot TEXT NULL",
            "avatar: Option<UserCenterMediaResource>",
            "avatar: user.avatar",
            "avatar: media_resource_from_snapshot",
            "request.avatar.as_ref()",
        ]
        forbidden_patterns = (
            re.compile(r"\bpub\s+avatar_url\s*:"),
            re.compile(r"\bavatar_url\s+TEXT\s+NULL\b"),
            re.compile(r"\blogo_url\s+TEXT\s+NULL\b"),
            re.compile(r"\bavatar_url\s*=\s*excluded\.avatar_url\b"),
            re.compile(r"\bavatar_url:\s*user\.avatar_url\b"),
            re.compile(r"\bavatar_url:\s*session\.user\.avatar_url\b"),
        )
        violations: list[str] = []

        for snippet in required_snippets:
            if snippet not in content:
                violations.append(f"{relative}: missing {snippet!r}")
        for line_number, line in enumerate(content.splitlines(), start=1):
            if any(pattern.search(line) for pattern in forbidden_patterns):
                violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Appbase native user center public avatar/logo payloads and local schema must preserve media resource objects instead of URL strings.",
        )

    def test_backend_site_settings_media_fields_preserve_media_resource_objects(self) -> None:
        source_expectations = {
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "site_settings_store.rs": [
                "pub logo: Value,",
                "pub icon: Value,",
                "pub favicon: Value,",
            ],
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "site_settings.rs": [
                "logo: Option<Value>,",
                "icon: Option<Value>,",
                "favicon: Option<Value>,",
                "logo: Value,",
                "icon: Value,",
                "favicon: Value,",
            ],
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sql_site_settings.rs": [
                "pub logo: Value,",
                "pub icon: Value,",
                "pub favicon: Value,",
            ],
        }
        legacy_patterns = (
            "logo_url",
            "icon_url",
            "favicon_url",
            "logoUrl",
            "iconUrl",
            "faviconUrl",
        )
        violations: list[str] = []

        for source, required_snippets in source_expectations.items():
            if not source.exists():
                continue
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for snippet in required_snippets:
                if snippet not in content:
                    violations.append(f"{relative}: missing {snippet!r}")
            for line_number, line in enumerate(content.splitlines(), start=1):
                if any(pattern in line for pattern in legacy_patterns):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Site branding media must stay as MediaResource objects named logo/icon/favicon across backend DTOs and storage payloads.",
        )

    def test_portal_remote_list_services_fail_closed_for_malformed_list_payloads(self) -> None:
        allowed_optional_sources: set[str] = set()
        violations: list[str] = []
        list_reader = re.compile(r"\breadApiItems\s*\(")

        for source in self._portal_sources():
            relative = rel(source)
            if "sdkwork-clawroutes-pc-commons" in source.parts:
                continue
            if relative in allowed_optional_sources:
                continue
            content = source.read_text(encoding="utf-8", errors="ignore")
            if "ensurePlusApiSuccess" not in content:
                continue
            for line_number, line in enumerate(content.splitlines(), start=1):
                if list_reader.search(line):
                    violations.append(f"{relative}:{line_number}: {line.strip()}")

        self.assertEqual(
            [],
            violations,
            "Remote list services must use readRequiredApiItems after SDK success checks so malformed list payloads do not render as empty states.",
        )

    def test_portal_paginated_log_services_require_total_metadata(self) -> None:
        paginated_log_services = [
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts",
        ]
        violations: list[str] = []

        for source in paginated_log_services:
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            if "readRequiredNonNegativeNumber(data, 'total'" not in content:
                violations.append(f"{relative}: missing required pagination total reader")
            for forbidden in (
                "readNumber(data, 'total', logs.length)",
                "readNumber(data, 'total', items.length)",
                "total: logs.length",
                "total: items.length",
            ):
                if forbidden in content:
                    violations.append(f"{relative}: {forbidden}")

        self.assertEqual(
            [],
            violations,
            "Paginated log services must require backend total metadata instead of falling back to current page length.",
        )

    def test_portal_paginated_log_services_normalize_query_before_sdk_calls(self) -> None:
        usage_service_path = (
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts"
        )
        record_service_path = (
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts"
        )
        usage_service = usage_service_path.read_text(encoding="utf-8", errors="ignore")
        record_service = record_service_path.read_text(encoding="utf-8", errors="ignore")

        self.assertIn("toUsageLogQueryParams", usage_service)
        self.assertIn("const query = toUsageLogQueryParams(params)", usage_service)
        self.assertIn(".ai.usage.logs.list(query)", usage_service)
        self.assertNotIn(".ai.usage.logs.list(params)", usage_service)
        self.assertNotIn(".router.fetchLogs", usage_service)
        self.assertIn("MAX_USAGE_LOG_PAGE_SIZE", usage_service)
        self.assertIn("MAX_USAGE_LOG_QUERY_TEXT_LENGTH", usage_service)

        self.assertIn("toRecordLogQueryBody", record_service)
        self.assertIn(".system.records.list(toRecordLogQueryBody(filters))", record_service)
        self.assertNotIn(".record.fetchLogs(filters)", record_service)
        self.assertNotIn(".record.fetchLogs", record_service)
        self.assertIn("MAX_RECORD_LOG_PAGE_SIZE", record_service)
        self.assertIn("MAX_RECORD_LOG_FILTER_LENGTH", record_service)

    def test_portal_settlements_service_normalizes_year_query_before_sdk_call(self) -> None:
        settlement_service_path = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
        )
        if not settlement_service_path.exists():
            self.skipTest("console settlements package removed from claw router PC surface")
        service = settlement_service_path.read_text(encoding="utf-8", errors="ignore")

        self.assertIn("toSettlementDashboardQueryParams", service)
        self.assertIn("const query = toSettlementDashboardQueryParams(params)", service)
        self.assertIn("const SETTLEMENT_LEDGER_PAGE_SIZE = 200;", service)
        self.assertIn("const SETTLEMENT_INVOICE_PAGE_SIZE = 100;", service)
        self.assertIn("appWalletLedgerEntriesList({ page: '1', pageSize: String(SETTLEMENT_LEDGER_PAGE_SIZE) })", service)
        self.assertIn("appInvoicesList({ page: '1', pageSize: String(SETTLEMENT_INVOICE_PAGE_SIZE) })", service)
        self.assertIn("buildSettlementDashboard(query.year, ledgerEntries, invoices)", service)
        self.assertIn("readRequiredApiItems(ledgerResult, 'Settlement ledger entries are required')", service)
        self.assertIn("readRequiredApiItems(invoiceResult, 'Settlement invoice records are required')", service)
        self.assertNotIn("getClawRouterCommerceService().settlements.dashboard.list(", service)
        self.assertNotIn(".billing.settlements.dashboard.list(params)", service)
        self.assertNotIn("getClawRouterAppSdkClient().billing.settlements.dashboard.list", service)
        self.assertNotIn(".router.fetchDashboardData", service)
        self.assertIn("MIN_SETTLEMENT_DASHBOARD_YEAR", service)
        self.assertIn("MAX_SETTLEMENT_DASHBOARD_YEAR", service)

    def test_portal_console_api_key_service_fails_closed_for_remote_contract_drift(self) -> None:
        service_path = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        )
        service = service_path.read_text(encoding="utf-8", errors="ignore")

        self.assertIn("readRequiredApiItem", service)
        self.assertIn("readRequiredString", service)
        self.assertIn(
            "readRequiredApiItem(result, 'API key creation response is missing key data', ['item'])",
            service,
        )
        self.assertIn("readRequiredString(value, 'id', 'API key id is required')", service)
        self.assertIn(
            "readRequiredString(value, 'maskedKey', 'API key masked value is required')",
            service,
        )
        self.assertIn("readRequiredString(value, 'code', 'Channel group code is required')", service)
        self.assertNotIn(".filter((item): item is ApiKey => item !== null)", service)
        self.assertNotIn(".filter((item): item is ChannelGroup => item !== null)", service)
        self.assertNotIn("normalizeApiKey(data.item)", service)

    def test_portal_money_message_and_history_services_fail_closed_for_remote_contract_drift(self) -> None:
        guarded_services = {
            MODELS_CATALOG_SERVICE: [
                "return readRequiredApiItems(result, 'Failed to fetch vendors')\n      .map(normalizeVendor)",
                "const page = readModelListPage(result, 'Failed to fetch models');",
                "models: readRequiredApiItems(data, 'Failed to sync vendors and models', ['models'])\n        .map(normalizeModel)",
                "readRequiredRecord(value, 'Vendor record is required')",
                "readRequiredRecord(value, 'Model record is required')",
                "throw new Error(type ? `Unsupported model type: ${type}` : 'Model type is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-ratelimit" / "src" / "ratelimitService.ts": [
                "return readRequiredApiItems(result, 'Failed to fetch IP limits')\n      .map(normalizeIpLimit)",
                "return readRequiredApiItems(result, 'Failed to fetch token limits')\n      .map(normalizeTokenLimit)",
                "return readRequiredApiItems(result, 'Failed to fetch model limits')\n      .map(normalizeModelLimit)",
                "return readRequiredApiItems(result, 'Failed to fetch firewall rules')\n      .map(normalizeFirewall)",
                "readRequiredRecord(value, 'IP limit record is required')",
                "readRequiredRecord(value, 'Token limit record is required')",
                "readRequiredRecord(value, 'Model limit record is required')",
                "readRequiredRecord(value, 'Firewall rule record is required')",
                "readRequiredNumber(item, 'rps', 'IP limit rps is required')",
                "readRequiredNumber(item, 'rpd', 'Token limit rpd is required')",
                "readRequiredString(item, 'value', 'Firewall rule value is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-marketing" / "src" / "marketingService.ts": [
                "return readRequiredApiItems(result, 'Failed to fetch referral stats')\n      .map(normalizeReferralStat)",
                "backendPromotionOffersList",
                "backendPromotionCouponStocksList",
                "backendPromotionCodesList",
                "backendPromotionCodeRedemptionsList",
                "backendPromotionUserCouponsList",
                "backendPromotionCouponLedgerEntriesList",
                "return readRequiredPromotionItems(result, 'Promotion offer records are required')",
                "return readRequiredPromotionItems(result, 'Promotion coupon stock records are required')",
                "return readRequiredPromotionItems(result, 'Promotion code records are required')",
                "return readRequiredPromotionItems(result, 'Promotion code redemption records are required')",
                "return readRequiredPromotionItems(result, 'Promotion user coupon records are required')",
                "readRequiredString(item, 'id', 'Promotion record id is required')",
                "readRequiredRecord(value, 'Referral stat record is required')",
                "readRequiredString(item, 'id', 'Referral stat id is required')",
                "readRequiredString(item, 'inviter', 'Referral inviter is required')",
                "readRequiredNumber(item, 'total_invited', 'Referral invited total is required')",
                "readRequiredString(item, 'total_revenue', 'Referral revenue is required')",
                "readRequiredString(item, 'bonus_awarded', 'Referral bonus is required')",
                "readRequiredString(item, 'link', 'Referral link is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-channel" / "src" / "channelService.ts": [
                "return readRequiredApiItems(result, 'Failed to fetch channels')\n      .map(normalizeChannel)",
                "return readRequiredApiItems(result, 'Failed to fetch provider credentials')\n      .map(normalizeProviderSecret)",
                "readRequiredRecord(value, 'Channel record is required')",
                "readRequiredRecord(value, 'Provider credential record is required')",
                "readRequiredStringArrayField(item, 'resourceCodes', 'Channel AI resource codes are required')",
                "readRequiredStringArray(item, 'capabilities', 'Channel capabilities are required')",
                "readRequiredString(item, 'secretRef', 'Provider credential secret reference is required')",
                "throw new Error(status ? `Unsupported channel status: ${status}` : 'Channel status is required')",
                "throw new Error(status ? `Unsupported provider credential status: ${status}` : 'Provider credential status is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-user" / "src" / "userService.ts": [
                "return readRequiredApiItems(result, 'admin.user.errors.fetchUsersFallback')\n      .map(normalizeUser)",
                "readRequiredRecord(value, 'User record is required')",
                "readRequiredRecord(value, 'API key record is required')",
                "readRequiredString(item, 'email', 'User email is required')",
                "readRequiredString(item, 'key', 'API key value is required')",
                "result[userId] = value.map(normalizeApiKey)",
                "throw new Error(status ? `Unsupported user status: ${status}` : 'User status is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-finance" / "src" / "financeService.ts": [
                "backendCommerceReportsPaymentReconciliationRetrieve",
                "backendCommerceReportsOrderRevenueList",
                "backendCommerceReportsRefundsList",
                "backendAuditCommerceEventsList",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-wallet" / "src" / "walletService.ts": [
                "backendRechargesOrdersList",
                "readRequiredApiItems(result, listMessage)",
                "readRequiredString(item, 'id', 'Recharge record id is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-announcement" / "src" / "announcementService.ts": [
                "readRequiredRecord(value, 'Announcement record is required')",
                "readRequiredString(item, 'title', 'Announcement title is required')",
                "target: readAnnouncementTarget(item)",
                "throw new Error(target ? `Unsupported announcement target: ${target}` : 'Announcement target is required')",
                "throw new Error(status ? `Unsupported announcement status: ${status}` : 'Announcement status is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-group" / "src" / "groupService.ts": [
                "readRequiredRecord(value, 'Group record is required')",
                "readRequiredNestedRecord(item, 'capacity', 'Group capacity is required')",
                "readRequiredString(item, 'groupCode', 'Group code is required')",
                "readRequiredString(item, 'groupName', 'Group name is required')",
                "readRequiredNumber(item, 'rateMultiplier', 'Group rate multiplier is required')",
                "throw new Error(type ? `Unsupported group type: ${type}` : 'Group type is required')",
                "throw new Error(status ? `Unsupported group status: ${status}` : 'Group status is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-monitor" / "src" / "monitorService.ts": [
                "readRequiredRecord(value, 'System node record is required')",
                "readRequiredRecord(value, 'Alert record is required')",
                "readRequiredRecord(value, 'Performance record is required')",
                "readRequiredString(item, 'name', 'System node name is required')",
                "readRequiredNonNegativeNumber(item, 'cpu', 'System node cpu is required')",
                "readRequiredString(item, 'title', 'Alert title is required')",
                "readRequiredString(item, 'time', 'Performance time is required')",
                "throw new Error(status ? `Unsupported system node status: ${status}` : 'System node status is required')",
                "throw new Error(severity ? `Unsupported alert severity: ${severity}` : 'Alert severity is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-dashboard" / "src" / "dashboardService.ts": [
                "readRequiredRecordArray(data, 'userConsumption', 'Dashboard userConsumption is required', 'Dashboard pie chart record is required')",
                "readRequiredRecordArray(data, 'traffic', 'Dashboard traffic is required', 'Dashboard traffic record is required')",
                "readRequiredRecordArray(data, 'recentUsage', 'Dashboard recentUsage is required', 'Recent usage trace record is required')",
                "readRequiredRecord(value, 'Recent usage trace record is required')",
                "readRequiredString(item, 'name', 'Dashboard pie chart name is required')",
                "readRequiredNonNegativeNumber(item, 'value', 'Dashboard pie chart value is required')",
                "readRequiredString(item, 'time', 'Dashboard traffic time is required')",
                "readRequiredString(item, 'user', 'Recent usage trace user is required')",
                "readRequiredDecimalString(",
                "'Recent usage trace cost must be a decimal string'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts": [
                "readRequiredRecord(value, 'Usage log record is required')",
                "readRequiredString(item, 'requestId', 'Usage log request id is required')",
                "readRequiredNonNegativeNumber(item, 'inputTokens', 'Usage log input tokens are required')",
                "readRequiredDecimalString(",
                "'Usage log cost is required'",
                "'Usage log cost must be a decimal string'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-dashboard" / "src" / "dashboardService.ts": [
                "readRequiredRecordArray(record, 'chartData', 'Dashboard overview chartData is required', 'Dashboard overview chart record is required')",
                "readRequiredRecordArray(record, 'topModels', 'Dashboard overview topModels is required', 'Dashboard top model record is required')",
                "readRequiredRecordArray(record, 'announcements', 'Dashboard overview announcements is required', 'Dashboard announcement record is required')",
                "`Dashboard ${label} sparkline record is required`",
                "readRequiredRecord(value, 'Dashboard overview chart record is required')",
                "readRequiredFirstString(item, ['time', 'day', 'date', 'period'], 'Dashboard overview chart time is required')",
                "readRequiredFirstString(item, ['name', 'model'], 'Dashboard top model name is required')",
                "readRequiredFirstNumber(item, ['requests', 'requestCount', 'request_count'], 'Dashboard top model request count is required')",
                "readRequiredFirstString(item, ['text', 'title', 'summary', 'content'], 'Dashboard announcement text is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-user" / "src" / "userService.ts": [
                "name: readRequiredString(data, 'displayName', 'User profile display name is required')",
                "phone: readRequiredStringAllowEmpty(data, 'phone', 'User profile phone is required')",
                "language: readRequiredString(data, 'language', 'User profile language is required')",
                "avatar: readRequiredMediaResource(data.avatar, 'User profile avatar is required')",
                "isVerified: readRequiredBoolean(data, 'isVerified', 'User profile verification status is required')",
                "twoFactorEnabled: readRequiredBoolean(data, 'twoFactorEnabled', 'User profile two-factor status is required')",
                "thirdPartyBound: readRequiredStringAllowEmpty(data, 'thirdPartyBound', 'User profile third-party binding summary is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts": [
                "readRequiredRecord(value, 'Log record is required')",
                "readRequiredString(item, 'requestId', 'Log request id is required')",
                "readRequiredNonNegativeNumber(item, 'inputTokens', 'Log input tokens are required')",
                "readRequiredDecimalString(",
                "'Log cost is required'",
                "'Log cost must be a decimal string'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-gateway" / "src" / "gatewayService.ts": [
                "return readRequiredApiItems(result, 'console.gateway.states.loadErrorFallback').map(readGatewayTrace)",
                "readRequiredRecord(value, 'Gateway trace record is required')",
                "readRequiredString(item, 'id', 'Gateway trace id is required')",
                "method: readHttpMethod(item.method)",
                "readRequiredNumber(item, 'status', 'Gateway trace status is required')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawroutes-pc-commons" / "src" / "notificationService.ts": [
                "return readNotificationItems(result).map((item) => toSdkworkNotificationItem(readNotification(item)))",
                "throw new Error('Notification list response missing items')",
                "readRequiredString(value, 'id', 'Notification id is required')",
                "readRequiredString(value, 'desc', 'Notification description is required')",
                "readNotificationType(value.type)",
                "readNotificationRead(value.read)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "historyMapper.ts": [
                "return items.map(mapGenerationHistoryItem)",
                "readRequiredRecord(value, 'Playground history record is required')",
                "readRequiredString(item, 'id', 'Playground history id is required')",
                "readRequiredString(item, 'prompt', 'Playground history prompt is required')",
                "throw new Error('Playground history type is required')",
            ],
        }
        forbidden_fragments = {
            MODELS_CATALOG_SERVICE: [
                ".filter(isRecord)",
                "return 'Chat';",
                "models: (Array.isArray(data.models) ? data.models : [])",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-ratelimit" / "src" / "ratelimitService.ts": [
                ".filter(isRecord)",
                "rps: readNumber(item, 'rps')",
                "rpd: readNumber(item, 'rpd')",
                "value: readString(item, 'value')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-marketing" / "src" / "marketingService.ts": [
                ".filter(isRecord)",
                "data.codes.filter(isRecord)",
                "value: readString(item, 'value')",
                "code: readString(item, 'code')",
                "count: readNumber(item, 'count')",
                "total_invited: readNumber(item, 'total_invited')",
                "return 'available';",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-channel" / "src" / "channelService.ts": [
                ".filter(isRecord)",
                "models: readStringArray(item, 'models')",
                "capabilities: readStringArray(item, 'capabilities')",
                "return 'active';",
                "return readString(item, 'status') === 'disabled' ? 'disabled' : 'active';",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-user" / "src" / "userService.ts": [
                ".filter(isRecord)",
                "email: readString(item, 'email')",
                "key: readString(item, 'key')",
                "status: readString(item, 'status', 'active')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-finance" / "src" / "financeService.ts": [
                ".filter(isRecord)",
                "return 'consume';",
                "return 'success';",
                "return 'paid';",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-announcement" / "src" / "announcementService.ts": [
                ".filter(isRecord)",
                "title: readString(item, 'title')",
                "status: readString(item, 'status') === 'draft' ? 'draft' : 'published'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-group" / "src" / "groupService.ts": [
                ".filter(isRecord)",
                "name: readString(item, 'name')",
                "rateMultiplier: readNumber(item, 'rateMultiplier', 1)",
                "type: readString(item, 'type') === 'dedicated' ? 'dedicated' : 'public'",
                "status: readString(item, 'status') === 'disabled' ? 'disabled' : 'active'",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-monitor" / "src" / "monitorService.ts": [
                ".filter(isRecord)",
                "name: readString(item, 'name')",
                "cpu: readNumber(item, 'cpu')",
                "status: readString(item, 'status') === 'resolved' ? 'resolved' : 'active'",
                "return 'online';",
                "return 'info';",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-dashboard" / "src" / "dashboardService.ts": [
                ".filter(isRecord)",
                "readRecordArray(data, 'userConsumption')",
                "readRecordArray(data, 'traffic')",
                "readRecordArray(data, 'recentUsage')",
                "user: readString(item, 'user')",
                "cost: readString(item, 'cost')",
                "isApiUser: readBoolean(item, 'isApiUser')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts": [
                ".filter(isRecord)",
                "requestId: readString(item, 'requestId')",
                "inputTokens: readNumber(item, 'inputTokens')",
                "cost: readDecimalString(item, 'cost')",
                "isStream: readBoolean(item, 'isStream')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-dashboard" / "src" / "dashboardService.ts": [
                ".filter(isRecord)",
                "readRecordArray(record, 'chartData')",
                "readRecordArray(record, 'topModels')",
                "readRecordArray(record, 'announcements')",
                "readRecordArray(record, key)",
                "name: readFirstString(item, ['name', 'model'], 'unknown')",
                "supplier: readFirstString(item, ['supplier', 'vendor', 'vendorCode'], '-')",
                "normalizeAnnouncementType(readFirstString",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-user" / "src" / "userService.ts": [
                "name: readString(data, 'name')",
                "phone: readString(data, 'phone')",
                "isVerified: readBoolean(data, 'isVerified')",
                "twoFactorEnabled: readBoolean(data, 'twoFactorEnabled')",
                "thirdPartyBound: readString(data, 'thirdPartyBound')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts": [
                ".filter(isRecord)",
                "requestId: readString(item, 'requestId')",
                "inputTokens: readNumber(item, 'inputTokens')",
                "cost: readDecimalString(item, 'cost')",
                "isStream: readBoolean(item, 'isStream')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-gateway" / "src" / "gatewayService.ts": [
                ".filter(isGatewayTrace)",
                "function isGatewayTrace(",
            ],
            PORTAL_PACKAGES / "sdkwork-clawroutes-pc-commons" / "src" / "notificationService.ts": [
                ".filter(isMessage)",
                "function isMessage(",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "historyMapper.ts": [
                "items.flatMap",
                "return null",
                "mapped ? [mapped] : []",
            ],
        }

        guarded_services = {
            path: fragments
            for path, fragments in guarded_services.items()
            if path.exists()
        }
        forbidden_fragments = {
            path: fragments
            for path, fragments in forbidden_fragments.items()
            if path in guarded_services
        }

        for service_path, required_fragments in guarded_services.items():
            relative = service_rel(service_path)
            source = service_path.read_text(encoding="utf-8", errors="ignore")
            for fragment in required_fragments:
                self.assertIn(fragment, source, f"{relative}: missing {fragment}")
            for fragment in forbidden_fragments.get(service_path, []):
                self.assertNotIn(fragment, source, f"{relative}: remote contract drift must not be silently dropped by {fragment}")

    def test_portal_mutation_services_validate_sdk_path_ids(self) -> None:
        guarded_services = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-channel" / "src" / "channelService.ts": [
                "requiredSafePathSegment(id, 'channelId')",
                "requiredSafePathSegment(id, 'providerSecretId')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-announcement" / "src" / "announcementService.ts": [
                "requiredSafePathSegment(id, 'announcementId')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-group" / "src" / "groupService.ts": [
                "requiredSafePathSegment(id, 'channelGroupId')",
            ],
            MODELS_CATALOG_SERVICE: [
                "requiredSafePathSegment(id, 'modelId')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-user" / "src" / "userService.ts": [
                "requiredSafePathSegment(keyId, 'apiKeyId')",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-ratelimit" / "src" / "ratelimitService.ts": [
                "requiredSafePathSegment(id, 'firewallRuleId')",
            ],
        }
        forbidden_fragments = {
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-channel" / "src" / "channelService.ts": [
                ".channel.deleteChannel(id)",
                ".channel.test(\n      id,",
                "toUpdateChannelRequest(id, updates)",
                "toUpdateProviderSecretRequest(id, updates)",
                ".providerSecrets.deleteProviderSecret(id)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-announcement" / "src" / "announcementService.ts": [
                ".announcements.updateAnnouncement(\n      id,",
                ".announcements.deleteAnnouncement(id)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-group" / "src" / "groupService.ts": [
                ".access" + "Groups.updateGroup(\n      id,",
                ".access" + "Groups.deleteGroup(id)",
            ],
            MODELS_CATALOG_SERVICE: [
                ".model.deleteModel(id)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-user" / "src" / "userService.ts": [
                ".apikey.deleteApiKey(keyId)",
            ],
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-ratelimit" / "src" / "ratelimitService.ts": [
                ".firewall.remove(id)",
            ],
        }

        guarded_services = {
            path: fragments
            for path, fragments in guarded_services.items()
            if path.exists()
        }
        forbidden_fragments = {
            path: fragments
            for path, fragments in forbidden_fragments.items()
            if path in guarded_services
        }

        for service_path, required_fragments in guarded_services.items():
            relative = service_rel(service_path)
            source = service_path.read_text(encoding="utf-8", errors="ignore")
            self.assertTrue(imports_commons_runtime(source), relative)
            self.assertIn("requiredSafePathSegment", source, relative)
            for fragment in required_fragments:
                self.assertIn(fragment, source, f"{relative}: missing {fragment}")
            for fragment in forbidden_fragments.get(service_path, []):
                self.assertNotIn(fragment, source, f"{relative}: unsafe SDK path id pass-through remains: {fragment}")

    def test_portal_sdk_request_boundary_is_shared_not_locally_reimplemented(self) -> None:
        runtime_entrypoint = (
            PORTAL_PACKAGES
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "runtime.ts"
        )
        boundary = (
            PORTAL_PACKAGES
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-request-boundary.ts"
        )
        guarded_services = [
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts",
        ]

        self.assertTrue(boundary.exists(), "Commons must own reusable SDK request boundary primitives.")
        self.assertIn("export * from './sdk-request-boundary.ts';", runtime_entrypoint.read_text(encoding="utf-8"))

        for service_path in guarded_services:
            relative = service_rel(service_path)
            source = service_path.read_text(encoding="utf-8", errors="ignore")
            self.assertTrue(imports_commons_runtime(source), relative)
            for forbidden in (
                "function optionalBoundedPositiveInteger",
                "function optionalPositiveInteger",
                "function optionalInteger",
                "function requiredSafePathSegment",
                "function pruneUndefined",
                "SAFE_PATH_SEGMENT_PATTERN =",
                ):
                    self.assertNotIn(forbidden, source, f"{relative} must import shared SDK request boundary primitive instead of reimplementing {forbidden}")

    def test_portal_services_do_not_keep_unused_sdk_request_param_imports(self) -> None:
        violations: list[str] = []
        import_name = "createIdempotencyParams"
        import_block = re.compile(
            r"import\s*\{(?P<body>[^}]*\bcreateIdempotencyParams\b[^}]*)\}\s*from\s*['\"]sdkwork-clawroutes-pc-commons/runtime['\"]",
            re.DOTALL,
        )

        for source in self._portal_sources():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            if not import_block.search(content):
                continue
            usage_count = len(re.findall(rf"\b{import_name}\b", content))
            if usage_count <= 1:
                violations.append(f"{relative}: imports {import_name} but does not use it")

        self.assertEqual(
            [],
            violations,
            "Portal SDK services must not keep stale idempotency helper imports after generated SDK migration.",
        )

    def test_portal_and_generated_sdk_do_not_reintroduce_legacy_operation_signatures(self) -> None:
        removed_portal_tokens = [
            "AdminChannelListRequest",
            "TestChannelRequest",
            "FetchChannelsRequest",
            "FetchUsersRequest",
            "FetchApiKeysMapRequest",
            "FetchCouponsRequest",
            "FetchRedemptionRecordsRequest",
            "FetchRechargeRecordsRequest",
            "FetchModelsRequest",
            "EnableSkillPackageRequest",
            "DisableSkillPackageRequest",
            "EnableSkillRequest",
            "DisableSkillRequest",
            "PublishSkillRequest",
            "OfflineSkillRequest",
            "emptyTestChannelRequest",
            "emptyEnableSkillPackageRequest",
            "emptyDisableSkillPackageRequest",
            "emptyEnableSkillRequest",
            "emptyDisableSkillRequest",
            "emptyPublishSkillRequest",
            "emptyOfflineSkillRequest",
        ]
        portal_violations: list[str] = []

        for source in self._portal_sources():
            relative = rel(source)
            content = source.read_text(encoding="utf-8", errors="ignore")
            for token in removed_portal_tokens:
                if token in content:
                    portal_violations.append(f"{relative}: contains removed SDK surface {token}")

        self.assertEqual(
            [],
            portal_violations,
            "Portal production source must use the latest generated SDK signatures and must not carry removed empty request DTO helpers.",
        )

        stale_api_files = [
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "access-groups.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "announcements.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "coupon-batches.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "coupon-codes.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "firewall.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "rate-limits.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "users.ts",
        ]
        existing_stale_api_files = [rel(path) for path in stale_api_files if path.exists()]
        self.assertEqual(
            [],
            existing_stale_api_files,
            "Generated backend SDK must keep the current operation grouping instead of stale split API files.",
        )

        sdk_api_violations: list[str] = []
        legacy_header_signature = re.compile(
            r"\basync\s+[A-Za-z0-9_]+\([^)]*headers\?:\s*Record<string,\s*string>",
            re.DOTALL,
        )
        legacy_number_path_id = re.compile(r"\basync\s+[A-Za-z0-9_]+\([^)]*:\s*string\s*\|\s*number", re.DOTALL)

        sdk_api_dirs = {
            "clawrouter-app-sdk": ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "api",
            "clawrouter-backend-sdk": ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "src"
            / "api",
        }

        for sdk_name, api_dir in sdk_api_dirs.items():
            self.assertTrue(
                api_dir.exists(),
                f"{sdk_name} generated TypeScript API directory must exist so SDK signatures are actually scanned.",
            )
            for source in sorted(api_dir.glob("*.ts")):
                if source.name in {"base.ts", "index.ts", "paths.ts"}:
                    continue
                relative = rel(source)
                content = source.read_text(encoding="utf-8", errors="ignore")
                if legacy_header_signature.search(content):
                    sdk_api_violations.append(f"{relative}: public operation method accepts raw headers")
                if legacy_number_path_id.search(content):
                    sdk_api_violations.append(f"{relative}: public operation method accepts string | number path id")

        self.assertEqual(
            [],
            sdk_api_violations,
            "Generated SDK operation APIs must expose named idempotency parameters and string path ids, not old raw headers or string|number path ids.",
        )

    def test_portal_root_does_not_ship_ai_studio_starter_or_one_off_rewrite_scripts(self) -> None:
        forbidden_files = [
            PORTAL_ROOT / "fix_inputs.mjs",
            PORTAL_ROOT / "migrate.cjs",
            PORTAL_ROOT / "modify_admin.mjs",
            PORTAL_ROOT / "modify_console.mjs",
            PORTAL_ROOT / "package-lock.json",
            PORTAL_ROOT / "replace.mjs",
            PORTAL_ROOT / "update_files.cjs",
        ]
        existing = [rel(path) for path in forbidden_files if path.exists()]

        self.assertEqual(
            [],
            existing,
            "Portal root must not ship one-off rewrite scripts or npm lockfiles; use pnpm and keep business behavior in source, SDK, and Rust APIs.",
        )

        checked_docs = [
            PORTAL_ROOT / "README.md",
            PORTAL_ROOT / "index.html",
            PORTAL_ROOT / "vite.config.ts",
        ]
        forbidden_markers = [
            "AI Studio",
            "ai.studio",
            "GHBanner",
            "GEMINI_API_KEY",
            "Gemini-backed tools",
            "My Google AI Studio App",
        ]
        violations: list[str] = []
        for path in checked_docs:
            content = path.read_text(encoding="utf-8", errors="ignore")
            relative = rel(path)
            for marker in forbidden_markers:
                if marker in content:
                    violations.append(f"{relative}: contains {marker}")

        self.assertEqual(
            [],
            violations,
            "Portal root docs and HTML metadata must describe the Claw Router product, not starter templates.",
        )

        package_json = json.loads((PORTAL_ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual("sdkwork-clawrouter-pc", package_json.get("name"))
        self.assertNotIn("@google/genai", package_json.get("dependencies", {}))

    def test_portal_workspace_runtime_dependencies_are_root_managed(self) -> None:
        singleton_runtime_dependencies = {
            "react",
            "react-dom",
            "react-router-dom",
            "react-i18next",
            "lucide-react",
            "motion",
        }
        boundary_runtime_dependencies = {
            "@sdkwork/clawrouter-app-sdk",
            "@sdkwork/clawrouter-backend-sdk",
            "@sdkwork/clawrouter-open-sdk",
        }
        root_managed_runtime_dependencies = singleton_runtime_dependencies | boundary_runtime_dependencies
        sdk_boundary_package = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/package.json"
        root_package = json.loads((PORTAL_ROOT / "package.json").read_text(encoding="utf-8"))
        root_dependencies = root_package.get("dependencies", {})

        for dependency_name in root_managed_runtime_dependencies:
            self.assertIn(
                dependency_name,
                root_dependencies,
                f"Portal root package.json must own runtime dependency {dependency_name}.",
            )

        violations: list[str] = []
        for package_path in sorted(PORTAL_PACKAGES.glob("*/package.json")):
            package = json.loads(package_path.read_text(encoding="utf-8"))
            relative = package_rel(package_path)
            for section_name in ("dependencies", "devDependencies", "optionalDependencies"):
                dependencies = package.get(section_name, {})
                for dependency_name in sorted(singleton_runtime_dependencies & set(dependencies)):
                    violations.append(f"{relative}: {section_name}.{dependency_name}")
                if relative == sdk_boundary_package and section_name == "dependencies":
                    for dependency_name in boundary_runtime_dependencies:
                        self.assertIn(
                            dependency_name,
                            dependencies,
                            f"Portal commons runtime boundary must depend on {dependency_name}.",
                        )
                    continue
                for dependency_name in sorted(boundary_runtime_dependencies & set(dependencies)):
                    violations.append(f"{relative}: {section_name}.{dependency_name}")

        self.assertEqual(
            [],
            violations,
            "Portal workspace packages must not declare singleton runtime dependencies; only the commons runtime boundary may own generated SDK package dependencies.",
        )

    def test_portal_index_html_uses_single_vite_entry_without_runtime_dependency_scripts(self) -> None:
        html = (PORTAL_ROOT / "index.html").read_text(encoding="utf-8", errors="ignore")

        self.assertEqual(1, html.count('<script type="module" src="/src/main.tsx"></script>'))
        for forbidden in [
            "react.development.js",
            "react-dom",
            "unpkg.com",
            "esm.sh",
            "cdn.jsdelivr",
            "cdnjs.cloudflare.com",
            "runtime-env.js",
        ]:
            self.assertNotIn(forbidden, html)

    def test_portal_global_scrollbars_follow_theme_tokens(self) -> None:
        stylesheet = PORTAL_ROOT / "src" / "index.css"
        css = stylesheet.read_text(encoding="utf-8", errors="ignore")

        for selector in (
            "html",
            "body",
            ".custom-scrollbar",
            ".dark .custom-scrollbar",
        ):
            self.assertIn(selector, css, f"Portal scrollbars must define {selector}.")

        for required in (
            "scrollbar-gutter: stable",
            "--scrollbar-thumb",
            "--scrollbar-thumb-hover",
            "--scrollbar-track",
            "--color-lobster-500",
            "--color-lobster-400",
            "scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)",
            ".custom-scrollbar::-webkit-scrollbar",
        ):
            self.assertIn(required, css, f"Portal scrollbar stylesheet is missing {required}.")

        for legacy in (
            "scrollbar-color: rgba(0, 0, 0, 0.2) transparent",
            "scrollbar-color: rgba(255, 255, 255, 0.2) transparent",
            "background-color: rgba(0, 0, 0, 0.2)",
            "background-color: rgba(255, 255, 255, 0.2)",
        ):
            self.assertNotIn(legacy, css, f"Portal scrollbar styling must use theme colors, not {legacy}.")

    def _portal_sources(self) -> list[Path]:
        sources: list[Path] = []
        for directory, dirnames, filenames in os.walk(PORTAL_PACKAGES):
            dirnames[:] = [
                dirname
                for dirname in dirnames
                if dirname not in {"node_modules", "dist", ".turbo"}
            ]
            for filename in filenames:
                source = Path(directory) / filename
                if source.name.endswith((".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")):
                    continue
                if source.suffix in {".ts", ".tsx"}:
                    sources.append(source)
        return sorted(sources)


if __name__ == "__main__":
    unittest.main()
