import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.architecture_standard_guardian import ArchitectureStandardGuardian


class ArchitectureStandardGuardianTest(unittest.TestCase):
    STANDARD_DIRS = (
        "apis",
        "apps",
        "crates",
        "sdks",
        "jobs",
        "tools",
        "plugins",
        "examples",
        "configs",
        "deployments",
        "scripts",
        "docs",
        "tests",
    )

    def write_doc(self, root: Path, relative_path: str, content: str) -> Path:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_standard_readme(self, root: Path, relative_path: str) -> None:
        self.write_doc(
            root,
            relative_path,
            """
            # Standard Directory

            ## Purpose
            Documents the standard SDKWork directory capability.

            ## Owner
            sdkwork-clawrouter maintainers.

            ## Allowed Content
            Source-controlled files for this directory capability.

            ## Forbidden Content
            Secrets, runtime state, caches, logs, and generated SDK transport output.

            ## Related Specs
            - `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`

            ## Verification
            - `python -B -m unittest tests.test_architecture_standard_guardian`
            """,
        )

    def write_standard_workspace(self, root: Path) -> None:
        self.write_doc(root, "README.md", """# Test Root

        Follows SDKWORK_WORKSPACE_SPEC.md and the standard directory dictionary.
        """)
        self.write_doc(root, "AGENTS.md", """# Repository Guidelines

        ## SDKWORK Soul
        ## SDKWORK Standards
        ## Application Identity
        ## Local Dictionary Structure
        ## Spec Resolution Order
        ## Required Specs By Task Type
        ## Code Style Rules
        ## Build, Test, and Verification
        ## Agent Execution Rules
        ## Human Review Rules
        """)
        self.write_doc(root, "CLAUDE.md", """# Claude Code Entry

        Read `AGENTS.md` and `../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "GEMINI.md", """# Gemini CLI Entry

        Read `AGENTS.md` and `../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "CODEX.md", """# Codex Entry

        Read `AGENTS.md` and `../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, ".sdkwork/README.md", """# SDKWork Workspace

        Governed by `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`.
        """)
        self.write_doc(root, ".sdkwork/.gitignore", """local/
        tmp/
        cache/
        secrets/
        """)
        self.write_doc(root, ".sdkwork/skills/README.md", """# Skills

        Repository skills use `SKILL.md`.
        """)
        self.write_doc(root, ".sdkwork/plugins/README.md", """# Plugins

        Installable plugins use `.codex-plugin/plugin.json`.
        """)
        for directory in self.STANDARD_DIRS:
            self.write_standard_readme(root, f"{directory}/README.md")
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/AGENTS.md", """# Repository Guidelines

        Read `../../../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/CLAUDE.md", """# Claude Code Entry

        Read `AGENTS.md` and `../../../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/GEMINI.md", """# Gemini CLI Entry

        Read `AGENTS.md` and `../../../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/CODEX.md", """# Codex Entry

        Read `AGENTS.md` and `../../../sdkwork-specs/README.md`.
        """)
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/sdkwork.app.config.json", '{"kind":"sdkwork.app"}')
        self.write_doc(root, "apps/sdkwork-clawrouter-pc/package.json", '{"name":"sdkwork-clawrouter-pc"}')
        for relative in (
            ".sdkwork/README.md",
            ".sdkwork/.gitignore",
            ".sdkwork/skills/README.md",
            ".sdkwork/plugins/README.md",
            "config/README.md",
            "docs/README.md",
            "public/README.md",
            "scripts/README.md",
            "specs/README.md",
            "src/README.md",
            "packages/README.md",
            "tests/README.md",
        ):
            self.write_doc(root, f"apps/sdkwork-clawrouter-pc/{relative}", "# App Root Entry\n")

    def test_accepts_rust_first_architecture_docs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_standard_workspace(root)
            self.write_doc(
                root,
                "docs/02-技术架构设计.md",
                """
                # 技术架构设计
                Rust-first runtime with sdkwork-clawrouter-cloud-gateway, sdkwork-clawrouter-app-api-server,
                sdkwork-clawrouter-admin-api-server, /app/v3/api, /backend/v3/api and /v1.
                """,
            )
            self.write_doc(
                root,
                "docs/03-技术选型.md",
                """
                # 技术选型
                Rust-first choices: axum, tokio, sqlx, tower, hyper, utoipa,
                tracing, moka, rust_decimal.
                """,
            )
            self.write_doc(
                root,
                "docs/07-性能设计.md",
                """
                # 性能设计
                Rust-first performance uses Tokio, Axum, moka, Redis, streaming,
                batch writer and connection pool.
                """,
            )
            self.write_doc(
                root,
                "docs/09-部署架构设计.md",
                """
                # 部署架构设计
                Rust-first Rust services support desktop, server, docker,
                kubernetes, SDKWORK_CLAW_DEPLOYMENT_MODE, SDKWORK_CLAW_GATEWAY_BIND,
                SDKWORK_CLAW_APP_API_BIND and SDKWORK_CLAW_ADMIN_API_BIND.
                """,
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_missing_standard_project_root_dictionary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_doc(root, "README.md", "# Test Root")
            self.write_doc(root, "AGENTS.md", "# Repository Guidelines")

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("standard project directory jobs/ must exist with README.md", result.messages)
            self.assertIn("standard project directory configs/ must exist with README.md", result.messages)
            self.assertIn("workspace metadata must include .sdkwork/README.md", result.messages)

    def test_rejects_standard_directory_readme_without_required_sections(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_standard_workspace(root)
            self.write_doc(root, "apis/README.md", "# APIs\n\nNo dictionary sections yet.")

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("standard project directory apis/README.md missing required section: Purpose", result.messages)
            self.assertIn(
                "standard project directory apis/README.md missing required section: Forbidden Content",
                result.messages,
            )

    def test_rejects_pc_application_root_without_standard_local_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_standard_workspace(root)
            (root / "apps" / "sdkwork-clawrouter-pc" / "config" / "README.md").unlink()

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "PC application root apps/sdkwork-clawrouter-pc must include config/README.md",
                result.messages,
            )

    def test_rejects_unresolved_component_spec_canonical_sdkwork_spec_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            root = workspace / 'sdkwork-clawrouter'
            root.mkdir()
            self.write_standard_workspace(root)
            self.write_doc(workspace, 'sdkwork-specs/README.md', '# SDKWork Specs')
            component_spec_path = 'apps/sdkwork-clawrouter-pc/packages/bad-package/specs/component.spec.json'
            self.write_doc(
                root,
                component_spec_path,
                json.dumps(
                    {
                        'kind': 'sdkwork.component.spec',
                        'component': {
                            'name': 'bad-package',
                            'root': 'sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/bad-package',
                        },
                        'canonicalSpecs': [
                            {'file': 'README.md', 'path': '../../../../../../sdkwork-specs/README.md'}
                        ],
                    },
                    indent=2,
                ),
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                'component spec apps/sdkwork-clawrouter-pc/packages/bad-package/specs/component.spec.json '
                'canonical spec path does not resolve: ../../../../../../sdkwork-specs/README.md',
                result.messages,
            )

    def test_rejects_template_tokens_and_legacy_root_specs_links(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_standard_workspace(root)
            self.write_doc(root, '.sdkwork/skills/README.md', '# Skills\n\nUse $name and $specPath.')
            self.write_doc(
                root,
                'apis/README.md',
                '# APIs\n\n'
                '## Purpose\nDocuments the standard SDKWork directory capability.\n\n'
                '## Owner\nsdkwork-clawrouter maintainers.\n\n'
                '## Allowed Content\nAuthored API contracts.\n\n'
                '## Forbidden Content\nGenerated SDK transport output.\n\n'
                '## Related Specs\n- `../../../../../specs/README.md`\n\n'
                '## Verification\n- `python -B tools/architecture_standard_guardian.py`',
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                'local dictionary file .sdkwork/skills/README.md contains unresolved template token: $name',
                result.messages,
            )
            self.assertIn(
                'local dictionary file .sdkwork/skills/README.md contains unresolved template token: $specPath',
                result.messages,
            )
            self.assertIn(
                'local dictionary file apis/README.md contains legacy root specs link: ../../../../../specs/README.md',
                result.messages,
            )

    def test_ignores_generated_dictionary_tokens_and_specs_links(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_standard_workspace(root)
            self.write_doc(
                root,
                'sdks/example/generated/README.md',
                '# Generated SDK\n\n$name\n\n../../../../../specs/README.md',
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_rejects_spring_first_and_sidecar_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_doc(
                root,
                "docs/02-技术架构设计.md",
                """
                # 技术架构设计
                第一阶段采用 Spring-first 一体化平台，后续引入 Rust/Pingora 网关热路径 Sidecar。
                """,
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "architecture doc docs/02-技术架构设计.md contains forbidden Spring-first drift term: Spring-first",
                result.messages,
            )
            self.assertIn(
                "architecture doc docs/02-技术架构设计.md contains forbidden Spring-first drift term: Rust/Pingora",
                result.messages,
            )

    def test_rejects_missing_required_rust_first_terms(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_doc(
                root,
                "docs/03-技术选型.md",
                """
                # 技术选型
                Rust-first choices: axum and tokio.
                """,
            )

            result = ArchitectureStandardGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "architecture doc docs/03-技术选型.md must mention required Rust-first term: sqlx",
                result.messages,
            )
            self.assertIn(
                "architecture doc docs/03-技术选型.md must mention required Rust-first term: rust_decimal",
                result.messages,
            )
            self.assertIn(
                "architecture doc docs/03-技术选型.md must mention required Rust-first term: hyper",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
