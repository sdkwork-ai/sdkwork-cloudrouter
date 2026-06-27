import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
FRONTEND_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"
DOCUMENTS_PACKAGES_ROOT = (
    WORKSPACE_ROOT
    / "sdkwork-documents"
    / "apps"
    / "sdkwork-documents-pc"
    / "packages"
)
APPROVED_CLIPBOARD_UTILITY = (
    FRONTEND_ROOT
    / "sdkwork-clawroutes-pc-commons"
    / "src"
    / "clipboard.ts"
)
COPY_BUTTON_COMPONENT = (
    FRONTEND_ROOT
    / "sdkwork-clawroutes-pc-commons"
    / "src"
    / "components"
    / "CopyButton.tsx"
)


class FrontendClipboardStandardTest(unittest.TestCase):
    def test_frontend_copy_operations_use_shared_clipboard_utility(self) -> None:
        direct_clipboard_pattern = re.compile(r"navigator\.clipboard\.writeText\s*\(")
        offenders: list[str] = []

        for src_root in sorted(FRONTEND_ROOT.glob("*/src")):
            for path in src_root.rglob("*"):
                if path.suffix not in {".ts", ".tsx"}:
                    continue
                if path == APPROVED_CLIPBOARD_UTILITY:
                    continue

                source = path.read_text(encoding="utf-8")
                for match in direct_clipboard_pattern.finditer(source):
                    line = source.count("\n", 0, match.start()) + 1
                    offenders.append(f"{path.relative_to(ROOT)}:{line}: {match.group(0)}")

        self.assertEqual(
            [],
            offenders,
            "Copy actions must use sdkwork-clawroutes-pc-commons copyTextToClipboard so permission failures and unsupported browsers are handled consistently.",
        )

    def test_shared_clipboard_utility_returns_structured_result_without_throwing(self) -> None:
        source = APPROVED_CLIPBOARD_UTILITY.read_text(encoding="utf-8")

        self.assertIn("export type CopyTextResult", source)
        self.assertIn("export async function copyTextToClipboard", source)
        self.assertIn("return { ok: true", source)
        self.assertIn("return { ok: false", source)
        self.assertNotIn("throw new", source)

    def test_shared_copy_button_standardizes_feedback_and_busy_state(self) -> None:
        self.assertTrue(
            COPY_BUTTON_COMPONENT.exists(),
            "Business copy controls must use a shared CopyButton component instead of each page reimplementing copied state.",
        )

        source = COPY_BUTTON_COMPONENT.read_text(encoding="utf-8")

        self.assertIn("copyTextToClipboard", source)
        self.assertIn("type CopyButtonProps", source)
        self.assertIn("aria-live=\"polite\"", source)
        self.assertIn("role=\"status\"", source)
        self.assertIn("status === 'copying'", source)
        self.assertIn("disabled={isDisabled}", source)
        self.assertIn("result.ok", source)
        self.assertNotIn("navigator.clipboard", source)
        self.assertNotIn("window.alert", source)

    def test_high_value_copy_interactions_use_shared_copy_button(self) -> None:
        migrated_files = [
            path
            for path in [
            FRONTEND_ROOT / "sdkwork-clawrouter-pc-admin-user" / "src" / "index.tsx",
            FRONTEND_ROOT / "sdkwork-clawrouter-pc-console-api-keys" / "src" / "ApiKeysView.tsx",
            FRONTEND_ROOT / "sdkwork-clawrouter-pc-models" / "src" / "pages" / "ModelDetails.tsx",
            DOCUMENTS_PACKAGES_ROOT
            / "sdkwork-documents-pc-api-reference"
            / "src"
            / "components"
            / "ApiEndpointView.tsx",
            DOCUMENTS_PACKAGES_ROOT
            / "sdkwork-documents-pc-api-reference"
            / "src"
            / "components"
            / "ApiPlayground.tsx",
            DOCUMENTS_PACKAGES_ROOT
            / "sdkwork-documents-pc-sdk-reference"
            / "src"
            / "components"
            / "SdkEndpointView.tsx",
            DOCUMENTS_PACKAGES_ROOT
            / "sdkwork-documents-pc-sdk-reference"
            / "src"
            / "pages"
            / "SdkReference.tsx",
            ]
            if path.exists()
        ]
        offenders: list[str] = []

        for path in migrated_files:
            source = path.read_text(encoding="utf-8")
            rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path.relative_to(WORKSPACE_ROOT)
            if "CopyButton" not in source:
                offenders.append(f"{rel}: missing CopyButton")
            if "copyTextToClipboard" in source:
                offenders.append(f"{rel}: still calls copyTextToClipboard directly")
            if re.search(r"\bsetCopied\b|\bsetCopiedStates\b", source):
                offenders.append(f"{rel}: still maintains local copied state")
            if re.search(r"setTimeout\s*\(\s*\(\)\s*=>\s*setCopied", source):
                offenders.append(f"{rel}: still owns copy reset timer")

        self.assertEqual(
            [],
            offenders,
            "High-value visual copy interactions must use CopyButton for consistent success, failure, busy, and accessibility behavior.",
        )

    def test_copy_icon_is_reserved_for_shared_copy_button(self) -> None:
        guarded_files: list[Path] = []
        lucide_copy_import_pattern = re.compile(
            r"import\s*\{[^}]*\bCopy\b[^}]*\}\s*from\s*['\"]lucide-react['\"]",
            re.DOTALL,
        )
        copy_icon_usage_pattern = re.compile(r"<Copy(?:\s|>)")
        offenders: list[str] = []

        for path in guarded_files:
            source = path.read_text(encoding="utf-8")
            rel = path.relative_to(ROOT)
            if lucide_copy_import_pattern.search(source):
                offenders.append(f"{rel}: imports lucide Copy icon directly")
            if copy_icon_usage_pattern.search(source):
                offenders.append(f"{rel}: renders lucide Copy icon directly")

        self.assertEqual(
            [],
            offenders,
            "Visual copy controls must use CopyButton; clone/duplicate actions must use a distinct icon so clipboard and duplication semantics stay unambiguous.",
        )


if __name__ == "__main__":
    unittest.main()
