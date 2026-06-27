import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"


class FrontendNativeDialogStandardTest(unittest.TestCase):
    def test_frontend_runtime_code_does_not_use_native_browser_dialogs(self) -> None:
        native_dialog_pattern = re.compile(
            r"(?<![A-Za-z0-9_$])(window\.)?(alert|prompt|confirm)\s*\("
        )
        offenders: list[str] = []

        for src_root in sorted(FRONTEND_ROOT.glob("*/src")):
            for path in src_root.rglob("*"):
                if path.suffix not in {".ts", ".tsx"}:
                    continue
                source = path.read_text(encoding="utf-8")
                for match in native_dialog_pattern.finditer(source):
                    line = source.count("\n", 0, match.start()) + 1
                    offenders.append(f"{path.relative_to(ROOT)}:{line}: {match.group(0)}")

        self.assertEqual(
            [],
            offenders,
            "Native browser dialogs block the UI thread and bypass shared business-state, accessibility, and audit standards.",
        )


if __name__ == "__main__":
    unittest.main()
