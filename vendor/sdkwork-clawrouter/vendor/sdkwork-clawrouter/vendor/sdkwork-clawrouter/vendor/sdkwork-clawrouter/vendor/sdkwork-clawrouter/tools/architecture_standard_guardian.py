from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ArchitectureStandardGuardianResult:
    ok: bool
    messages: list[str]


@dataclass(frozen=True)
class ArchitectureDocRule:
    relative_path: str
    required_terms: tuple[str, ...]


class ArchitectureStandardGuardian:
    """Guard SDKWork workspace layout and architecture standards from recurring drift."""

    STANDARD_PROJECT_DIRECTORIES: tuple[str, ...] = (
        'apis',
        'apps',
        'crates',
        'sdks',
        'jobs',
        'tools',
        'plugins',
        'examples',
        'configs',
        'deployments',
        'scripts',
        'docs',
        'tests',
    )
    REQUIRED_STANDARD_README_SECTIONS: tuple[str, ...] = (
        'Purpose',
        'Owner',
        'Allowed Content',
        'Forbidden Content',
        'Related Specs',
        'Verification',
    )
    WORKSPACE_METADATA_PATHS: tuple[str, ...] = (
        '.sdkwork/README.md',
        '.sdkwork/.gitignore',
        '.sdkwork/skills/README.md',
        '.sdkwork/plugins/README.md',
    )
    PC_APPLICATION_ROOT = 'apps/sdkwork-clawrouter-pc'
    PC_APPLICATION_REQUIRED_PATHS: tuple[str, ...] = (
        'AGENTS.md',
        'CLAUDE.md',
        'GEMINI.md',
        'CODEX.md',
        'sdkwork.app.config.json',
        'package.json',
        '.sdkwork/README.md',
        '.sdkwork/.gitignore',
        '.sdkwork/skills/README.md',
        '.sdkwork/plugins/README.md',
        'config/README.md',
        'docs/README.md',
        'public/README.md',
        'scripts/README.md',
        'specs/README.md',
        'src/README.md',
        'packages/README.md',
        'tests/README.md',
    )
    TEMPLATE_TOKENS: tuple[str, ...] = ('$name', '$specPath')
    TEXT_SCAN_ROOTS: tuple[str, ...] = (
        '.sdkwork',
        'apis',
        'apps',
        'configs',
        'crates',
        'deployments',
        'docs',
        'examples',
        'jobs',
        'packages',
        'plugins',
        'scripts',
        'sdks',
        'services',
        'specs',
        'tests',
        'tools',
    )
    SKIP_DIRECTORIES: tuple[str, ...] = (
        '.git',
        'build',
        'dist',
        'generated',
        'node_modules',
        'target',
    )
    LEGACY_ROOT_SPECS_LINK_RE = re.compile(r'((?:\.\.[/\\])+specs[/\\](?:README|[A-Z0-9_]+_SPEC)\.md)')

    FORBIDDEN_DRIFT_TERMS: tuple[str, ...] = (
        "Spring-first",
        "Java 21",
        "Spring Boot",
        "Spring WebFlux",
        "Rust/Pingora",
        "Sidecar",
        "Caffeine",
        "Micrometer",
        "SLF4J",
        "Logback",
        "Local Spring",
    )
    DOC_RULES: tuple[ArchitectureDocRule, ...] = (
        ArchitectureDocRule(
            relative_path="docs/02-??????.md",
            required_terms=(
                "Rust-first",
                "sdkwork-clawrouter-cloud-gateway",
                "sdkwork-clawrouter-standalone-gateway",
                "sdkwork-clawrouter-app-api-server",
                "sdkwork-clawrouter-admin-api-server",
                "/app/v3/api",
                "/backend/v3/api",
                "/v1",
            ),
        ),
        ArchitectureDocRule(
            relative_path="docs/03-????.md",
            required_terms=(
                "Rust-first",
                "axum",
                "tokio",
                "sqlx",
                "tower",
                "hyper",
                "utoipa",
                "tracing",
                "moka",
                "rust_decimal",
            ),
        ),
        ArchitectureDocRule(
            relative_path="docs/07-????.md",
            required_terms=(
                "Rust-first",
                "Tokio",
                "Axum",
                "moka",
                "Redis",
                "streaming",
                "batch writer",
                "connection pool",
            ),
        ),
        ArchitectureDocRule(
            relative_path="docs/09-??????.md",
            required_terms=(
                "Rust-first",
                "Rust services",
                "desktop",
                "server",
                "docker",
                "kubernetes",
                "SDKWORK_CLAW_DEPLOYMENT_MODE",
                "SDKWORK_CLAW_GATEWAY_BIND",
                "SDKWORK_CLAW_APP_API_BIND",
                "SDKWORK_CLAW_ADMIN_API_BIND",
            ),
        ),
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    def run(self) -> ArchitectureStandardGuardianResult:
        messages: list[str] = []
        messages.extend(self._validate_workspace_metadata())
        messages.extend(self._validate_standard_project_directories())
        messages.extend(self._validate_pc_application_root())
        messages.extend(self._validate_local_dictionary_text())
        messages.extend(self._validate_component_spec_canonical_paths())
        for rule in self.DOC_RULES:
            path = self.root / rule.relative_path
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            messages.extend(self._validate_doc(rule, text))

        return ArchitectureStandardGuardianResult(ok=not messages, messages=messages)

    def _validate_workspace_metadata(self) -> list[str]:
        messages: list[str] = []
        for relative_path in self.WORKSPACE_METADATA_PATHS:
            if not (self.root / relative_path).exists():
                messages.append(f'workspace metadata must include {relative_path}')
        return messages

    def _validate_standard_project_directories(self) -> list[str]:
        messages: list[str] = []
        for directory in self.STANDARD_PROJECT_DIRECTORIES:
            readme_path = self.root / directory / 'README.md'
            if not readme_path.exists():
                messages.append(f'standard project directory {directory}/ must exist with README.md')
                continue

            text = readme_path.read_text(encoding='utf-8')
            for section in self.REQUIRED_STANDARD_README_SECTIONS:
                if not self._has_markdown_section(text, section):
                    messages.append(
                        f'standard project directory {directory}/README.md missing required section: {section}'
                    )
        return messages

    def _validate_pc_application_root(self) -> list[str]:
        messages: list[str] = []
        app_root = self.root / self.PC_APPLICATION_ROOT
        if not app_root.exists():
            return messages

        for relative_path in self.PC_APPLICATION_REQUIRED_PATHS:
            if not (app_root / relative_path).exists():
                messages.append(f'PC application root {self.PC_APPLICATION_ROOT} must include {relative_path}')
        return messages

    def _validate_local_dictionary_text(self) -> list[str]:
        messages: list[str] = []
        for path in self._iter_files(self.TEXT_SCAN_ROOTS, suffixes=('.md',)):
            relative_path = self._relative_path(path)
            text = path.read_text(encoding='utf-8', errors='replace')
            for token in self.TEMPLATE_TOKENS:
                if token in text:
                    messages.append(
                        f'local dictionary file {relative_path} contains unresolved template token: {token}'
                    )
            for match in self.LEGACY_ROOT_SPECS_LINK_RE.finditer(text):
                messages.append(
                    f'local dictionary file {relative_path} contains legacy root specs link: {match.group(1)}'
                )
        return messages

    def _validate_component_spec_canonical_paths(self) -> list[str]:
        messages: list[str] = []
        scan_roots = ('apps', 'crates', 'packages', 'sdks', 'services', 'specs')
        for path in self._iter_files(scan_roots, name='component.spec.json'):
            relative_path = self._relative_path(path)
            try:
                data = json.loads(path.read_text(encoding='utf-8'))
            except json.JSONDecodeError as error:
                messages.append(f'component spec {relative_path} is not valid JSON: {error.msg}')
                continue
            if not isinstance(data, dict):
                continue

            base_path = self._component_spec_base_path(path, data)
            canonical_specs = data.get('canonicalSpecs', [])
            if not isinstance(canonical_specs, list):
                continue
            for entry in canonical_specs:
                if not isinstance(entry, dict):
                    continue
                spec_path = entry.get('path')
                if not isinstance(spec_path, str):
                    continue
                normalized_spec_path = spec_path.replace('\\', '/')
                if 'sdkwork-specs/' not in normalized_spec_path:
                    continue
                if not (base_path / spec_path).resolve().exists():
                    messages.append(
                        f'component spec {relative_path} canonical spec path does not resolve: {spec_path}'
                    )
        return messages

    def _component_spec_base_path(self, spec_path: Path, data: dict) -> Path:
        component = data.get('component', {})
        component_root = component.get('root') if isinstance(component, dict) else None
        if not isinstance(component_root, str):
            return spec_path.parent.parent

        normalized_root = component_root.replace('\\', '/')
        if normalized_root == self.root.name:
            return self.root

        root_prefix = f'{self.root.name}/'
        if normalized_root.startswith(root_prefix):
            return self.root / normalized_root[len(root_prefix) :]

        return spec_path.parent.parent

    def _iter_files(
        self,
        roots: tuple[str, ...],
        *,
        suffixes: tuple[str, ...] | None = None,
        name: str | None = None,
    ) -> Iterator[Path]:
        for relative_root in roots:
            root = self.root / relative_root
            if not root.exists():
                continue
            for path in self._walk_files(root):
                if suffixes is not None and path.suffix not in suffixes:
                    continue
                if name is not None and path.name != name:
                    continue
                yield path

    def _walk_files(self, root: Path) -> Iterator[Path]:
        if root.name in self.SKIP_DIRECTORIES:
            return
        if root.is_file():
            yield root
            return

        for child in root.iterdir():
            if child.is_dir():
                if child.name in self.SKIP_DIRECTORIES:
                    continue
                yield from self._walk_files(child)
            elif child.is_file():
                yield child

    def _relative_path(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    def _has_markdown_section(self, text: str, section: str) -> bool:
        expected = f'## {section}'.casefold()
        for line in text.splitlines():
            normalized = line.strip().rstrip('#').strip().casefold()
            if normalized == expected:
                return True
        return False

    def _validate_doc(self, rule: ArchitectureDocRule, text: str) -> list[str]:
        messages: list[str] = []
        for term in self.FORBIDDEN_DRIFT_TERMS:
            if term in text:
                messages.append(
                    f"architecture doc {rule.relative_path} contains forbidden Spring-first drift term: {term}"
                )
        for term in rule.required_terms:
            if term not in text:
                messages.append(f"architecture doc {rule.relative_path} must mention required Rust-first term: {term}")
        return messages


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sdkwork-clawrouter SDKWork architecture and workspace standards.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    args = parser.parse_args()

    result = ArchitectureStandardGuardian(root=args.root).run()
    if result.ok:
        print("Architecture standard guardian passed")
        return 0

    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
