import os
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
PORTAL_PACKAGES = PORTAL_ROOT / "packages"


def first_existing_path(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


THEME_AWARE_TOKEN_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|group-hover:|focus:|focus-within:)?"
        r"bg-\[#[0-9a-fA-F]+\](?:/[0-9]+)?"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|group-hover:|focus:|focus-within:)?"
        r"bg-white(?:/[0-9]+|/\[[^\]]+\])"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|group-hover:|focus:|focus-within:)?"
        r"bg-black(?:/[0-9]+|/\[[^\]]+\])?"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|group-hover:|focus:|focus-within:)?"
        r"(?:border|ring|divide)-white(?:/[0-9]+|/\[[^\]]+\])?"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|group-hover:)?"
        r"(?:text-white(?:/[0-9]+|/\[[^\]]+\])?|text-slate-[2-6]00)"
    ),
    re.compile(r"(?<![A-Za-z0-9_:-])placeholder:text-slate-[0-9]+"),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:from|via|to)-\[[#][0-9a-fA-F]+\](?:/[0-9]+)?"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:from|via|to)-(?:white|black)"
        r"(?:/[0-9]+|/\[[^\]]+\])?"
    ),
]


def iter_tsx_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            dirname
            for dirname in dirnames
            if dirname not in {"node_modules", "dist", "build"}
            and not dirname.startswith(".")
        ]
        for filename in filenames:
            if filename.endswith(".tsx"):
                yield Path(dirpath) / filename


def extract_theme_aware_tokens(source: str) -> set[str]:
    tokens: set[str] = set()
    for pattern in THEME_AWARE_TOKEN_PATTERNS:
        tokens.update(match.group(0) for match in pattern.finditer(source))
    return tokens


UNSCOPED_DARK_SURFACE_TOKEN_PATTERNS = [
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:hover:|focus:|group-hover:)?"
        r"bg-\[#(?:010409|050505|0a0a0a|0d1117|111|111111|111827|121212|151515|"
        r"161b22|1a1a1a|1c1c1e|1e1e1e|1f1f1f|1f2937|222|242424|252525|252528|"
        r"2a2a2a|2a2a2d|30363d)\](?:/[0-9]+)?"
    ),
    re.compile(
        r"(?<![A-Za-z0-9_:-])(?:from|via|to)-"
        r"\[#(?:010409|050505|0a0a0a|0d1117|111|111111|111827|121212|151515|"
        r"161b22|1a1a1a|1c1c1e|1e1e1e|1f1f1f|1f2937|222|242424|252525|252528|"
        r"2a2a2a|2a2a2d|30363d)\](?:/[0-9]+)?"
    ),
]


def extract_unscoped_dark_surface_tokens(source: str) -> set[str]:
    tokens: set[str] = set()
    for pattern in UNSCOPED_DARK_SURFACE_TOKEN_PATTERNS:
        tokens.update(match.group(0) for match in pattern.finditer(source))
    return tokens


class FrontendThemeStandardTest(unittest.TestCase):
    def test_portal_theme_is_persisted_and_applied_by_the_root_app(self) -> None:
        app_source = (PORTAL_ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        theme_source_path = PORTAL_ROOT / "src" / "themePreference.ts"

        self.assertTrue(
            theme_source_path.exists(),
            "Portal theme preference must live in a small reusable root module.",
        )
        theme_source = theme_source_path.read_text(encoding="utf-8")

        self.assertIn("CLAW_ROUTER_THEME_STORAGE_KEY", theme_source)
        self.assertIn("resolveInitialThemePreference", theme_source)
        self.assertIn("persistThemePreference", theme_source)
        self.assertIn("prefers-color-scheme: dark", theme_source)
        self.assertIn("localStorage", theme_source)

        self.assertIn("resolveInitialThemePreference", app_source)
        self.assertIn("applyThemePreference(theme)", app_source)
        self.assertIn("persistThemePreference(theme)", app_source)
        self.assertIn("document.documentElement.dataset.theme = theme", theme_source)
        self.assertIn("document.documentElement.style.colorScheme = resolvedTheme", theme_source)
        self.assertNotIn("useState(true)", app_source)
        self.assertNotIn("setIsDark(!isDark)", app_source)

    def test_console_appearance_uses_explicit_theme_setter(self) -> None:
        console_layout = first_existing_path(
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-shell" / "src" / "ConsoleLayout.tsx",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-core" / "src" / "ConsoleLayout.tsx",
        )
        settings_view_path = (
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "SettingsView.tsx"
        )
        if not console_layout.exists() or not settings_view_path.exists():
            self.skipTest("console shell/settings packages are not available in this claw router surface")

        console_core = console_layout.read_text(encoding="utf-8")
        settings_view = settings_view_path.read_text(encoding="utf-8")

        self.assertIn("setTheme: (theme: ConsoleThemePreference) => void", console_core)
        self.assertIn(
            "Outlet context={{ isDark, toggleTheme, theme, setTheme, themeColor, setThemeColor }}",
            console_core,
        )
        self.assertIn(
            "const { isDark, theme, setTheme, themeColor, setThemeColor } = useOutletContext<ConsoleContextProps>()",
            settings_view,
        )
        self.assertIn("setTheme(option.id)", settings_view)

    def test_dark_designed_pages_are_scoped_for_light_theme_overrides(self) -> None:
        adaptive_pages = [
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-rankings" / "src" / "Rankings.tsx",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src" / "pages" / "Playground.tsx",
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-console-settlements" / "src" / "SettlementsView.tsx",
        ]
        css_source = (PORTAL_ROOT / "src" / "index.css").read_text(encoding="utf-8")

        self.assertIn("html:not(.dark) .theme-aware-dark-surface", css_source)
        self.assertIn("--theme-aware-surface", css_source)
        self.assertIn("--theme-aware-text", css_source)
        self.assertIn('[class*="bg-indigo-"][class~="text-white"]', css_source)
        self.assertIn('[class*="bg-indigo-"] [class~="text-white"]', css_source)
        self.assertIn('[class*="from-emerald-"][class~="text-white"]', css_source)
        self.assertIn('[class~="bg-black/60"] [class~="text-white"]', css_source)
        self.assertIn("--sdkwork-playground-rail-bg", css_source)
        self.assertIn("--sdkwork-playground-rail-bg", css_source)
        self.assertIn("--sdkwork-playground-chat-sidebar-bg", css_source)
        self.assertIn("--sdkwork-model-picker-menu-bg", css_source)

        for source_path in adaptive_pages:
            if not source_path.exists():
                continue
            source = source_path.read_text(encoding="utf-8")
            relative = source_path.relative_to(ROOT).as_posix()
            self.assertIn(
                "theme-aware-dark-surface",
                source,
                f"{relative} must opt into scoped light-theme overrides instead of forcing dark UI.",
            )
            self.assertIn(
                "dark:bg-",
                source,
                f"{relative} root surface must expose a dark variant so the global theme controls it.",
            )

    def test_playground_dark_tokens_have_light_theme_overrides(self) -> None:
        playground_root = (
            PORTAL_PACKAGES / "sdkwork-clawrouter-pc-playground" / "src"
        )
        playground_source = "\n".join(
            source_path.read_text(encoding="utf-8")
            for source_path in playground_root.rglob("*.tsx")
        )
        css_source = (PORTAL_ROOT / "src" / "index.css").read_text(encoding="utf-8")

        expected_mapped_tokens = [
            "bg-[#0a0a0a]",
            "bg-[#111]",
            "bg-[#111111]",
            "bg-[#121216]",
            "bg-[#151515]",
            "bg-[#151519]",
            "bg-[#19191e]",
            "bg-[#1a1a1a]",
            "bg-[#1c1c1e]",
            "bg-[#1c1c20]/95",
            "bg-[#1f1f1f]",
            "bg-[#222]",
            "bg-[#242424]",
            "bg-[#252525]",
            "bg-[#252528]",
            "bg-[#2a2a2a]",
            "bg-[#2a2a2d]",
            "bg-white/6",
            "from-[#111]",
            "via-[#111]/80",
            "to-[#1a1a24]",
            "placeholder:text-slate-500",
        ]

        for token in expected_mapped_tokens:
            if token not in playground_source:
                continue
            css_selector_token = token.replace("\\", "\\\\")
            self.assertIn(
                f'[class~="{css_selector_token}"]',
                css_source,
                f"Playground token {token} must have a scoped light-theme override.",
            )

    def test_theme_aware_modules_cover_all_dark_surface_tokens(self) -> None:
        css_source = (PORTAL_ROOT / "src" / "index.css").read_text(encoding="utf-8")
        adaptive_package_roots: set[Path] = set()

        for source_path in iter_tsx_files(PORTAL_PACKAGES):
            source = source_path.read_text(encoding="utf-8")
            if "theme-aware-dark-surface" not in source:
                continue

            relative = source_path.relative_to(PORTAL_PACKAGES)
            adaptive_package_roots.add(PORTAL_PACKAGES / relative.parts[0] / "src")

        self.assertGreater(
            len(adaptive_package_roots),
            0,
            "At least one package should opt into scoped dark-surface theme adaptation.",
        )

        missing_overrides: list[str] = []
        for source_path in iter_tsx_files(PORTAL_PACKAGES):
            source = source_path.read_text(encoding="utf-8")
            if "theme-aware-dark-surface" not in source:
                continue

            for token in sorted(extract_theme_aware_tokens(source)):
                selector = f'[class~="{token}"]'
                if selector not in css_source:
                    relative = source_path.relative_to(ROOT).as_posix()
                    missing_overrides.append(f"{relative}: {token}")

        self.assertEqual(
            [],
            missing_overrides,
            "Every theme-aware dark surface token must have a scoped light-theme override.",
        )

    def test_modules_do_not_force_dark_surfaces_without_theme_scope(self) -> None:
        adaptive_package_names: set[str] = set()
        for source_path in iter_tsx_files(PORTAL_PACKAGES):
            source = source_path.read_text(encoding="utf-8")
            if "theme-aware-dark-surface" in source:
                adaptive_package_names.add(source_path.relative_to(PORTAL_PACKAGES).parts[0])

        forced_dark_tokens: list[str] = []
        for source_path in iter_tsx_files(PORTAL_PACKAGES):
            package_name = source_path.relative_to(PORTAL_PACKAGES).parts[0]
            if package_name in adaptive_package_names:
                continue

            source = source_path.read_text(encoding="utf-8")
            for token in sorted(extract_unscoped_dark_surface_tokens(source)):
                forced_dark_tokens.append(
                    f"{source_path.relative_to(ROOT).as_posix()}: {token}"
                )

        self.assertEqual(
            [],
            forced_dark_tokens,
            "Non theme-aware modules must use explicit light/dark variants instead of unconditional dark surfaces.",
        )


if __name__ == "__main__":
    unittest.main()
