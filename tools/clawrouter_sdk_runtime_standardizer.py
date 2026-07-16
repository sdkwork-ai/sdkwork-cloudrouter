from __future__ import annotations

import argparse
import shutil
import json
import re
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - PyYAML is present in normal SDKWork tooling.
    yaml = None


SDK_DIRECTORIES = ("clawrouter-app-sdk", "clawrouter-backend-sdk", "clawrouter-open-sdk")
OFFICIAL_SDK_LANGUAGES = (
    "typescript",
    "flutter",
    "rust",
    "java",
    "csharp",
    "swift",
    "kotlin",
    "go",
    "python",
)
SDK_COMMON_VERSION = "^1.0.2"
SDK_TYPES_NODE_VERSION = "20.19.39"
SDK_TYPESCRIPT_VERSION = "5.8.3"
SDK_ROLLUP_VERSION = "4.60.1"
SDK_TYPES = {
    "clawrouter-app-sdk": "app",
    "clawrouter-backend-sdk": "backend",
    "clawrouter-open-sdk": "ai",
}
SDK_OWNER = "sdkwork-clawrouter"
SDK_API_AUTHORITIES = {
    "clawrouter-app-sdk": "sdkwork-clawrouter.app",
    "clawrouter-backend-sdk": "sdkwork-clawrouter.backend",
    "clawrouter-open-sdk": "sdkwork-clawrouter.ai",
}
SDK_TYPESCRIPT_DIRECTORIES = {
    "clawrouter-app-sdk": "clawrouter-app-sdk-typescript",
    "clawrouter-backend-sdk": "clawrouter-backend-sdk-typescript",
    "clawrouter-open-sdk": "clawrouter-open-sdk-typescript",
}
SDK_PACKAGE_NAMES = {
    "clawrouter-app-sdk": "@sdkwork/clawrouter-app-sdk",
    "clawrouter-backend-sdk": "@sdkwork/clawrouter-backend-sdk",
    "clawrouter-open-sdk": "@sdkwork/clawrouter-open-sdk",
}
SDK_DOMAIN_TRANSPORT_PACKAGE_NAMES = {
    "clawrouter-app-sdk": "sdkwork-clawrouter-app-sdk-domains-generated-typescript",
    "clawrouter-backend-sdk": "sdkwork-clawrouter-backend-sdk-domains-generated-typescript",
}
SDK_DOMAIN_TRANSPORT_DESCRIPTIONS = {
    "clawrouter-app-sdk": (
        "Generator-owned TypeScript transport for federated app domains on "
        "sdkwork-clawrouter-app-sdk."
    ),
    "clawrouter-backend-sdk": (
        "Generator-owned TypeScript transport for federated backend domains on "
        "sdkwork-clawrouter-backend-sdk."
    ),
}
SDK_DOMAIN_TRANSPORT_NAMES = {
    "clawrouter-app-sdk": "clawrouter-app-domain-transport",
    "clawrouter-backend-sdk": "clawrouter-backend-domain-transport",
}
SDK_LANGUAGE_PACKAGE_NAMES = {
    "clawrouter-app-sdk": {
        "typescript": "@sdkwork/clawrouter-app-sdk",
        "flutter": "clawrouter_app_sdk",
        "rust": "clawrouter-app-sdk",
        "java": "com.sdkwork.clawrouter:clawrouter-app-sdk",
        "csharp": "Sdkwork.ClawRouter.App.Sdk",
        "swift": "ClawRouterAppSdk",
        "kotlin": "com.sdkwork.clawrouter:clawrouter-app-sdk",
        "go": "github.com/sdkwork/clawrouter-app-sdk",
        "python": "sdkwork-clawrouter-app-sdk",
    },
    "clawrouter-backend-sdk": {
        "typescript": "@sdkwork/clawrouter-backend-sdk",
        "flutter": "clawrouter_backend_sdk",
        "rust": "clawrouter-backend-sdk",
        "java": "com.sdkwork.clawrouter:clawrouter-backend-sdk",
        "csharp": "Sdkwork.ClawRouter.Backend.Sdk",
        "swift": "ClawRouterBackendSdk",
        "kotlin": "com.sdkwork.clawrouter:clawrouter-backend-sdk",
        "go": "github.com/sdkwork/clawrouter-backend-sdk",
        "python": "sdkwork-clawrouter-backend-sdk",
    },
    "clawrouter-open-sdk": {
        "typescript": "@sdkwork/clawrouter-open-sdk",
        "flutter": "clawrouter_open_sdk",
        "rust": "clawrouter-open-sdk",
        "java": "com.sdkwork.clawrouter:clawrouter-open-sdk",
        "csharp": "Sdkwork.ClawRouter.Open.Sdk",
        "swift": "ClawRouterOpenSdk",
        "kotlin": "com.sdkwork.clawrouter:clawrouter-open-sdk",
        "go": "github.com/sdkwork/clawrouter-open-sdk",
        "python": "sdkwork-clawrouter-open-sdk",
    },
}
SDK_LANGUAGE_NAMESPACES = {
    "clawrouter-app-sdk": {
        "java": "com.sdkwork.clawrouter.app",
        "kotlin": "com.sdkwork.clawrouter.app",
        "csharp": "Sdkwork.ClawRouter.App",
    },
    "clawrouter-backend-sdk": {
        "java": "com.sdkwork.clawrouter.backend",
        "kotlin": "com.sdkwork.clawrouter.backend",
        "csharp": "Sdkwork.ClawRouter.Backend",
    },
    "clawrouter-open-sdk": {
        "java": "com.sdkwork.clawrouter.open",
        "kotlin": "com.sdkwork.clawrouter.open",
        "csharp": "Sdkwork.ClawRouter.Open",
    },
}
SDK_LANGUAGE_MANIFESTS = {
    "typescript": "package.json",
    "flutter": "pubspec.yaml",
    "rust": "Cargo.toml",
    "java": "pom.xml",
    "csharp": "Sdkwork.ClawRouter.Sdk.Generated.csproj",
    "swift": "Package.swift",
    "kotlin": "build.gradle.kts",
    "go": "go.mod",
    "python": "pyproject.toml",
}
SDK_CLIENTS = {
    "clawrouter-app-sdk": "SdkworkAppClient",
    "clawrouter-backend-sdk": "SdkworkBackendClient",
    "clawrouter-open-sdk": "SdkworkAiClient",
}
SDK_API_PREFIXES = {
    "clawrouter-app-sdk": "/app/v3/api",
    "clawrouter-backend-sdk": "/backend/v3/api",
    "clawrouter-open-sdk": "/v1",
}
SDK_DESCRIPTIONS = {
    "clawrouter-app-sdk": "SDKWork Claw Router app API SDK",
    "clawrouter-backend-sdk": "SDKWork Claw Router backend API SDK",
    "clawrouter-open-sdk": "SDKWork Claw Router OpenAI-compatible gateway SDK",
}
SDK_GENERATED_OPENAPI_PATHS = {
    "clawrouter-app-sdk": Path("generated/openapi/clawrouter-app-openapi.json"),
    "clawrouter-backend-sdk": Path("generated/openapi/clawrouter-backend-openapi.json"),
    "clawrouter-open-sdk": Path("apps/sdkwork-clawrouter-pc/public/openapi.json"),
}


def infer_external_protocol_id(route_path: str) -> str:
    normalized = str(route_path or "").replace("\\", "/")
    if normalized.startswith("/v1/"):
        return "openai-v1"
    if normalized.startswith("/anthropic/"):
        return "anthropic-messages"
    if normalized.startswith("/google/"):
        return "google-gemini-v1beta"
    if normalized.startswith("/kling/"):
        return "kling-v1"
    if normalized.startswith("/midjourney/"):
        return "midjourney-v1"
    if normalized.startswith("/nano-banana/"):
        return "nano-banana-v1"
    if normalized.startswith("/suno/"):
        return "suno-v1"
    if normalized.startswith("/vidu/"):
        return "vidu-v1"
    if normalized.startswith("/volcengine/"):
        return "volcengine-v1"
    return "clawrouter-vendor-relay"


SDK_DEPENDENCIES = {
    "clawrouter-app-sdk": [
        {
            "workspace": "sdkwork-iam-app-sdk",
            "role": "appbase-app-capability",
            "required": True,
            "dependencyMode": "consumer-sdk",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "@sdkwork/iam-app-sdk",
                "flutter": "sdkwork_iam_app_sdk",
                "rust": "sdkwork-iam-app-sdk",
                "java": "com.sdkwork:sdkwork-iam-app-sdk",
                "csharp": "SDKWork.Appbase.AppSdk",
                "swift": "sdkwork-iam-app-sdk",
                "kotlin": "com.sdkwork:sdkwork-iam-app-sdk",
                "go": "github.com/sdkwork/sdkwork-iam-app-sdk",
                "python": "sdkwork-iam-app-sdk",
            },
        },
        {
            "workspace": "clawrouter-app-wallet-capability",
            "role": "wallet-app-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-app-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-app-membership-capability",
            "role": "membership-app-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-app-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-app-promotion-capability",
            "role": "promotion-app-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-app-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "sdkwork-order-app-sdk",
            "role": "order-app-capability",
            "required": True,
            "dependencyMode": "consumer-sdk",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "@sdkwork/order-app-sdk",
            },
        },
        {
            "workspace": "clawrouter-app-payment-capability",
            "role": "payment-app-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-app-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-app-catalog-capability",
            "role": "catalog-app-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/app/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-app-domain-transport-generated-typescript",
            },
        },
    ],
    "clawrouter-backend-sdk": [
        {
            "workspace": "sdkwork-iam-backend-sdk",
            "role": "appbase-backend-management-capability",
            "required": True,
            "dependencyMode": "consumer-sdk",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "@sdkwork/iam-backend-sdk",
                "flutter": "sdkwork_iam_backend_sdk",
                "rust": "sdkwork-iam-backend-sdk",
                "java": "com.sdkwork:sdkwork-iam-backend-sdk",
                "csharp": "SDKWork.Appbase.BackendSdk",
                "swift": "sdkwork-iam-backend-sdk",
                "kotlin": "com.sdkwork:sdkwork-iam-backend-sdk",
                "go": "github.com/sdkwork/sdkwork-iam-backend-sdk",
                "python": "sdkwork-iam-backend-sdk",
            },
        },
        {
            "workspace": "clawrouter-backend-wallet-capability",
            "role": "wallet-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-membership-capability",
            "role": "membership-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-promotion-capability",
            "role": "promotion-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-catalog-capability",
            "role": "catalog-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-order-capability",
            "role": "order-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-payment-capability",
            "role": "payment-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-inventory-capability",
            "role": "inventory-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
        {
            "workspace": "clawrouter-backend-finance-capability",
            "role": "finance-backend-capability",
            "required": True,
            "dependencyMode": "internal-capability",
            "apiPrefix": "/backend/v3/api",
            "generatedTransportImportPolicy": "forbidden",
            "packageByLanguage": {
                "typescript": "clawrouter-backend-domain-transport-generated-typescript",
            },
        },
    ],
}
SDK_DEPENDENCY_OPERATION_KEY_OVERRIDES = {
    "sdkwork-iam-app-sdk": {
        "POST auth/verification_codes",
        "POST auth/verification_codes/verify",
    },
}
CLAWROUTER_APP_SDK_IAM_OWNER_OPERATION_PREFIXES = (
    "apiKeys.",
    "users.",
)
GENERATED_TEXT_FILE_EXTENSIONS = {
    ".bat",
    ".cmd",
    ".cs",
    ".dart",
    ".go",
    ".gradle",
    ".java",
    ".js",
    ".json",
    ".kt",
    ".kts",
    ".lock",
    ".md",
    ".mjs",
    ".properties",
    ".ps1",
    ".py",
    ".rs",
    ".sh",
    ".swift",
    ".toml",
    ".ts",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}
GENERATED_TEXT_FILE_NAMES = {
    ".gitattributes",
    ".gitignore",
    "Dockerfile",
    "LICENSE",
    "Makefile",
    "NOTICE",
}


def sdk_generation_input_spec(sdk_family: str) -> str:
    if sdk_family == "clawrouter-open-sdk":
        return f"openapi/{sdk_family}.sdkgen.json"
    return f"openapi/{sdk_family}.openapi.json"


def sdk_generation_input_path_symbol(sdk_family: str) -> str:
    if sdk_family == "clawrouter-open-sdk":
        return "sdkgenInputPath"
    return "authorityInputPath"


def sdk_forbidden_generation_input_path_symbol(sdk_family: str) -> str:
    if sdk_family == "clawrouter-open-sdk":
        return "authorityInputPath"
    return "sdkgenInputPath"


def sdk_derived_specs(sdk_family: str) -> dict[str, str]:
    if sdk_family == "clawrouter-open-sdk":
        return {"sdk-generator": f"openapi/{sdk_family}.sdkgen.json"}
    return {}


PROJECT_REQUIRED_TYPE_MODULES: dict[str, tuple[str, str]] = {}
UNION_ARRAY_TYPE_PATTERN = re.compile(
    r"(?P<operator>\??:\s*)"
    r"(?P<union>(?:(?:'[^'\r\n]+'|\"[^\"\r\n]+\"|\d+)\s*\|\s*)+"
    r"(?:'[^'\r\n]+'|\"[^\"\r\n]+\"|\d+))"
    r"\[\](?P<trailer>\s*[;,])"
)
EMPTY_INTERFACE_PATTERN = re.compile(
    r"(?P<prefix>^\s*export\s+)interface\s+(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\s*\{\s*\}",
    flags=re.MULTILINE,
)

BUILD_SCRIPT = r'''#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { rollup } from 'rollup';

const projectDir = process.cwd();
const srcDir = path.join(projectDir, 'src');
const distDir = path.join(projectDir, 'dist');
const tempDir = path.join(projectDir, '.sdkwork', 'build-runtime');
const tempEsmDir = path.join(tempDir, 'esm');

async function main() {
  await removeDirectory(distDir);
  await removeDirectory(tempDir);
  await fs.mkdir(distDir, { recursive: true });

  emitDeclarations();
  emitRuntimeModules();
  await removeTypeOnlyRuntimeReExports(path.join(tempEsmDir, 'index.js'));
  await bundleRuntime('es', path.join(distDir, 'index.js'));
  await bundleRuntime('cjs', path.join(distDir, 'index.cjs'));

  await removeDirectory(tempDir);
}

async function removeDirectory(target) {
  await fs.rm(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

function loadConfig(overrides) {
  const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error(`tsconfig.json not found under ${projectDir}`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(formatDiagnostics([configFile.error]));
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectDir, overrides, configPath);
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors));
  }

  return parsed;
}

function emitDeclarations() {
  const parsed = loadConfig({
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
    noEmit: false,
    noEmitOnError: true,
    outDir: distDir,
    rootDir: srcDir,
    sourceMap: false,
  });
  emitProgram(parsed);
}

function emitRuntimeModules() {
  const parsed = loadConfig({
    declaration: false,
    declarationMap: false,
    emitDeclarationOnly: false,
    module: ts.ModuleKind.ESNext,
    noEmit: false,
    noEmitOnError: true,
    outDir: tempEsmDir,
    rootDir: srcDir,
    sourceMap: false,
  });
  emitProgram(parsed);
}

function emitProgram(parsed) {
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const emitResult = program.emit();
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics));
  }
}

async function removeTypeOnlyRuntimeReExports(entryFile) {
  const source = await fs.readFile(entryFile, 'utf-8');
  const runtimeLines = source.split(/\r?\n/u).map((line) => {
    if (line.trim() === "export * from './types';") {
      return "export { DEFAULT_TIMEOUT, SUCCESS_CODES } from '@sdkwork/sdk-common';";
    }
    return line;
  });
  await fs.writeFile(entryFile, runtimeLines.join('\n'), 'utf-8');
}

async function bundleRuntime(format, file) {
  const bundle = await rollup({
    input: path.join(tempEsmDir, 'index.js'),
    external: (source) => source.startsWith('@sdkwork/'),
    plugins: [relativeExtensionResolver()],
    onwarn(warning, warn) {
      if (warning.code === 'EMPTY_BUNDLE') {
        throw new Error(warning.message);
      }
      warn(warning);
    },
  });

  try {
    await bundle.write({
      file,
      format,
      exports: 'named',
      interop: 'auto',
      sourcemap: false,
    });
  } finally {
    await bundle.close();
  }
}

function relativeExtensionResolver() {
  return {
    name: 'relative-extension-resolver',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) {
        return null;
      }

      const base = path.resolve(path.dirname(importer), source);
      for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
        try {
          const stat = await fs.stat(candidate);
          if (stat.isFile()) {
            return candidate;
          }
        } catch {
          // Try the next candidate.
        }
      }

      return null;
    },
  };
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectDir,
    getNewLine: () => '\n',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
'''


class SdkRuntimeStandardizer:
    """Apply the project SDK runtime build standard after generated SDK refreshes."""

    def __init__(
        self,
        root: Path,
        sdk_directories: tuple[str, ...] | None = None,
        api_spec_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.sdk_directories = sdk_directories or SDK_DIRECTORIES
        self.api_spec_path = Path(api_spec_path).resolve() if api_spec_path is not None else None
        invalid = sorted(set(self.sdk_directories) - set(SDK_DIRECTORIES))
        if invalid:
            raise ValueError(f"unsupported SDK directories: {', '.join(invalid)}")

    def run(self) -> list[Path]:
        updated: list[Path] = []
        for sdk_family in self.sdk_directories:
            family = self.root / "sdks" / sdk_family
            typescript_base = family / SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
            generated_base = typescript_base / "generated" / "server-openapi"
            if generated_base.is_dir():
                updated.extend(self._sync_typescript_package_root_from_generated(sdk_family, typescript_base, generated_base))
            elif not typescript_base.is_dir():
                raise FileNotFoundError(f"generated SDK directory is missing: {generated_base}")
            updated.extend(self._standardize_sdk_family(sdk_family, family, typescript_base))
            updated.extend(self._standardize_sdk(sdk_family, typescript_base))
        updated.extend(self.repair_domain_transport_package_manifests())
        return updated

    def repair_domain_transport_package_manifests(self) -> list[Path]:
        updated: list[Path] = []
        for sdk_family in self.sdk_directories:
            package_name = SDK_DOMAIN_TRANSPORT_PACKAGE_NAMES.get(sdk_family)
            if package_name is None:
                continue
            package_root = (
                self.root
                / "sdks"
                / sdk_family
                / SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
                / "generated"
                / "domains"
                / "server-openapi"
            )
            if not package_root.is_dir():
                continue
            package_path = package_root / "package.json"
            package = self._read_json_or_none(package_path)
            if package:
                continue
            self._write_json(
                package_path,
                {
                    "name": package_name,
                    "version": "0.1.0",
                    "private": True,
                    "description": SDK_DOMAIN_TRANSPORT_DESCRIPTIONS[sdk_family],
                    "author": "SDKWork Team",
                    "license": "MIT",
                    "type": "module",
                    "main": "./dist/index.cjs",
                    "module": "./dist/index.js",
                    "types": "./dist/index.d.ts",
                    "files": ["dist"],
                    "exports": {
                        ".": {
                            "types": "./dist/index.d.ts",
                            "import": "./dist/index.js",
                            "require": "./dist/index.cjs",
                        }
                    },
                    "scripts": {
                        "build": "node custom/build-runtime.mjs",
                        "dev": "node custom/build-runtime.mjs",
                        "prepublishOnly": "npm run build",
                    },
                    "dependencies": {"@sdkwork/sdk-common": SDK_COMMON_VERSION},
                    "devDependencies": {
                        "@types/node": SDK_TYPES_NODE_VERSION,
                        "typescript": SDK_TYPESCRIPT_VERSION,
                        "rollup": SDK_ROLLUP_VERSION,
                    },
                    "keywords": ["sdk", "api", SDK_TYPES[sdk_family], "sdkwork"],
                },
            )
            updated.append(package_path)
        return updated

    def sync_openapi_snapshots(self) -> list[Path]:
        updated: list[Path] = []
        for sdk_family in self.sdk_directories:
            family = self.root / "sdks" / sdk_family
            updated.extend(self._sync_sdk_family_openapi_snapshots(sdk_family, family))
        return updated

    def _standardize_sdk_family(self, sdk_family: str, family: Path, base: Path) -> list[Path]:
        updated: list[Path] = []
        family.mkdir(parents=True, exist_ok=True)
        openapi_dir = family / "openapi"
        bin_dir = family / "bin"
        tests_dir = family / "tests"
        openapi_dir.mkdir(parents=True, exist_ok=True)
        bin_dir.mkdir(parents=True, exist_ok=True)
        tests_dir.mkdir(parents=True, exist_ok=True)

        readme_path = family / "README.md"
        readme = self._render_family_readme(sdk_family)
        if not readme_path.is_file() or readme_path.read_text(encoding="utf-8") != readme:
            readme_path.write_text(readme, encoding="utf-8", newline="\n")
            updated.append(readme_path)

        updated.extend(self._sync_sdk_family_openapi_snapshots(sdk_family, family))

        manifest_path = family / "sdk-manifest.json"
        package = self._read_json_or_none(base / "package.json") or {}
        current_manifest = self._read_json_or_none(manifest_path) or {}
        manifest = {
            **current_manifest,
            **self._build_family_manifest(sdk_family, family, package),
        }
        if not manifest_path.is_file() or self._read_json_or_none(manifest_path) != manifest:
            self._write_json(manifest_path, manifest)
            updated.append(manifest_path)

        generate_script_path = bin_dir / "generate-sdk.mjs"
        generate_script = self._render_generate_script(sdk_family)
        if not generate_script_path.is_file() or generate_script_path.read_text(encoding="utf-8") != generate_script:
            generate_script_path.write_text(generate_script, encoding="utf-8", newline="\n")
            updated.append(generate_script_path)

        verify_script_path = bin_dir / "verify-sdk.mjs"
        verify_script = self._render_verify_script(sdk_family)
        if not verify_script_path.is_file() or verify_script_path.read_text(encoding="utf-8") != verify_script:
            verify_script_path.write_text(verify_script, encoding="utf-8", newline="\n")
            updated.append(verify_script_path)

        smoke_test_path = tests_dir / "sdk-family-smoke.test.mjs"
        smoke_test = self._render_family_smoke_test(sdk_family)
        if not smoke_test_path.is_file() or smoke_test_path.read_text(encoding="utf-8") != smoke_test:
            smoke_test_path.write_text(smoke_test, encoding="utf-8", newline="\n")
            updated.append(smoke_test_path)

        updated.extend(self._standardize_component_spec(sdk_family, family))
        return updated

    def _sync_sdk_family_openapi_snapshots(self, sdk_family: str, family: Path) -> list[Path]:
        updated: list[Path] = []
        family.mkdir(parents=True, exist_ok=True)
        openapi_dir = family / "openapi"
        openapi_dir.mkdir(parents=True, exist_ok=True)

        source_spec = self._resolve_source_openapi_path(sdk_family)
        openapi_path = openapi_dir / f"{sdk_family}.openapi.json"
        sdkgen_path = openapi_dir / f"{sdk_family}.sdkgen.json"
        if source_spec is not None:
            source_payload = self._read_json_or_none(source_spec)
            if source_payload is None:
                updated.extend(self._copy_spec_if_changed(source_spec, openapi_path))
                updated.extend(self._write_sdkgen_spec_if_changed(sdk_family, source_spec, sdkgen_path))
                return updated

            authority_payload = self._owner_only_openapi_payload(sdk_family, source_payload)
            updated.extend(self._write_json_if_changed(openapi_path, authority_payload))
            updated.extend(self._write_sdkgen_payload_if_changed(sdk_family, authority_payload, sdkgen_path))
            return updated

        placeholder = self._render_placeholder_openapi(sdk_family)
        for target in (openapi_path, sdkgen_path):
            if not target.is_file() or target.read_text(encoding="utf-8") != placeholder:
                target.write_text(placeholder, encoding="utf-8", newline="\n")
                updated.append(target)
        return updated

    def _resolve_source_openapi_path(self, sdk_family: str) -> Path | None:
        if self.api_spec_path is not None and len(self.sdk_directories) == 1:
            return self.api_spec_path if self.api_spec_path.is_file() else None
        candidate = self.root / SDK_GENERATED_OPENAPI_PATHS[sdk_family]
        return candidate if candidate.is_file() else None

    def _owner_only_openapi_payload(self, sdk_family: str, source_payload: dict[str, Any]) -> dict[str, Any]:
        payload = json.loads(json.dumps(source_payload))
        self._annotate_owner_metadata(payload, sdk_family)
        dependencies = SDK_DEPENDENCIES.get(sdk_family, [])
        if not dependencies:
            return payload

        excluded_by_dependency: dict[str, list[str]] = {}
        for dependency in dependencies:
            dependency_routes = self._dependency_operation_keys(dependency)
            if not dependency_routes:
                removed = []
            else:
                removed = self._remove_dependency_operations(
                    payload=payload,
                    prefix=str(dependency["apiPrefix"]),
                    dependency_operation_keys=dependency_routes,
                )
            removed.extend(self._remove_dependency_domain_operations(
                payload=payload,
                prefix=str(dependency["apiPrefix"]),
                dependency_domain=self._dependency_domain(dependency),
            ))
            if removed:
                excluded_by_dependency[str(dependency["workspace"])] = sorted(set(removed))

        if excluded_by_dependency:
            self._prune_unreachable_component_schemas(payload)
            marker = payload.setdefault("x-sdkwork-dependency-exclusions", {})
            if isinstance(marker, dict):
                marker.update(
                    {
                        "mode": "owner-only-sdk-generation",
                        "dependencies": excluded_by_dependency,
                    }
                )
            info = payload.get("info")
            if isinstance(info, dict):
                description = str(info.get("description") or "").strip()
                suffix = (
                    "Owner-only SDK authority: dependency-owned routes are consumed through "
                    "declared sdkDependencies and are not regenerated here."
                )
                if suffix not in description:
                    info["description"] = f"{description}\n{suffix}".strip()
        return payload

    def _annotate_owner_metadata(self, payload: dict[str, Any], sdk_family: str) -> None:
        authority = SDK_API_AUTHORITIES[sdk_family]
        payload["x-sdkwork-owner"] = SDK_OWNER
        payload["x-sdkwork-api-authority"] = authority
        if sdk_family == "clawrouter-open-sdk":
            info = payload.setdefault("info", {})
            if isinstance(info, dict):
                info["x-sdkwork-wire-protocol"] = "external"
                info["x-sdkwork-external-protocol-id"] = "clawrouter-vendor-gateway"
        paths = payload.get("paths")
        if not isinstance(paths, dict):
            return
        for route_path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue
            for method, operation in path_item.items():
                if not self._is_openapi_method(str(method).lower()) or not isinstance(operation, dict):
                    continue
                operation["x-sdkwork-owner"] = SDK_OWNER
                operation["x-sdkwork-api-authority"] = authority
                if sdk_family == "clawrouter-open-sdk":
                    operation["x-sdkwork-wire-protocol"] = "external"
                    operation["x-sdkwork-external-protocol-id"] = infer_external_protocol_id(str(route_path))

    def _dependency_operation_keys(self, dependency: dict[str, Any]) -> set[str]:
        workspace = str(dependency.get("workspace") or "")
        prefix = str(dependency.get("apiPrefix") or "")
        if not workspace or not prefix:
            return set()
        authority_path = self._dependency_authority_path(workspace)
        dependency_payload = self._read_mapping_or_none(authority_path)
        operation_keys = set(SDK_DEPENDENCY_OPERATION_KEY_OVERRIDES.get(workspace, set()))
        if dependency_payload is None:
            return operation_keys
        operation_keys.update(self._operation_keys(dependency_payload, prefix))
        return operation_keys

    def _dependency_authority_path(self, workspace: str) -> Path:
        iam_root = self._dependency_root("sdkwork-iam")
        commerce_app_authority = (
            self.root
            / "sdks"
            / "clawrouter-app-sdk"
            / "openapi"
            / "clawrouter-app-domain-transport.openapi.json"
        )
        commerce_backend_authority = (
            self.root
            / "sdks"
            / "clawrouter-backend-sdk"
            / "openapi"
            / "clawrouter-backend-domain-transport.openapi.json"
        )
        mapping = {
            "sdkwork-iam-app-sdk": iam_root
            / "sdks"
            / "sdkwork-iam-app-sdk"
            / "openapi"
            / "sdkwork-iam-app-api.openapi.yaml",
            "sdkwork-iam-backend-sdk": iam_root
            / "sdks"
            / "sdkwork-iam-backend-sdk"
            / "openapi"
            / "sdkwork-iam-backend-api.openapi.yaml",
            "sdkwork-order-app-sdk": self._dependency_root("sdkwork-order")
            / "sdks"
            / "sdkwork-order-app-sdk"
            / "openapi"
            / "sdkwork-order-app-api.openapi.json",
            "clawrouter-app-wallet-capability": commerce_app_authority,
            "clawrouter-app-membership-capability": commerce_app_authority,
            "clawrouter-app-promotion-capability": commerce_app_authority,
            "clawrouter-app-payment-capability": commerce_app_authority,
            "clawrouter-app-catalog-capability": commerce_app_authority,
            "clawrouter-backend-wallet-capability": commerce_backend_authority,
            "clawrouter-backend-membership-capability": commerce_backend_authority,
            "clawrouter-backend-promotion-capability": commerce_backend_authority,
            "clawrouter-backend-catalog-capability": commerce_backend_authority,
            "clawrouter-backend-order-capability": commerce_backend_authority,
            "clawrouter-backend-payment-capability": commerce_backend_authority,
            "clawrouter-backend-inventory-capability": commerce_backend_authority,
            "clawrouter-backend-finance-capability": commerce_backend_authority,
        }
        return mapping.get(
            workspace,
            self.root / ".sdkwork" / "dependencies" / workspace / "openapi.json",
        )

    def _dependency_root(self, dependency_name: str) -> Path:
        materialized_root = self.root / ".sdkwork" / "dependencies" / dependency_name
        if materialized_root.exists():
            return materialized_root

        sibling_root = self.root.parent / dependency_name
        if sibling_root.exists():
            return sibling_root

        return materialized_root

    def _operation_keys(self, payload: dict[str, Any], prefix: str) -> set[str]:
        operation_keys: set[str] = set()
        paths = payload.get("paths")
        if not isinstance(paths, dict):
            return operation_keys
        for path_key, path_item in paths.items():
            route = self._normalized_route(str(path_key), prefix)
            if route is None or not isinstance(path_item, dict):
                continue
            for method in path_item:
                normalized_method = str(method).lower()
                if self._is_openapi_method(normalized_method):
                    operation_keys.add(f"{normalized_method.upper()} {route}")
        return operation_keys

    def _remove_dependency_operations(
        self,
        *,
        payload: dict[str, Any],
        prefix: str,
        dependency_operation_keys: set[str],
    ) -> list[str]:
        paths = payload.get("paths")
        if not isinstance(paths, dict):
            return []

        removed: list[str] = []
        for path_key in list(paths.keys()):
            path_item = paths.get(path_key)
            route = self._normalized_route(str(path_key), prefix)
            if route is None or not isinstance(path_item, dict):
                continue
            for method in list(path_item.keys()):
                normalized_method = str(method).lower()
                if not self._is_openapi_method(normalized_method):
                    continue
                operation_key = f"{normalized_method.upper()} {route}"
                if operation_key not in dependency_operation_keys:
                    continue
                del path_item[method]
                removed.append(operation_key)
            if not any(self._is_openapi_method(str(item).lower()) for item in path_item):
                del paths[path_key]
        return sorted(removed)

    def _dependency_domain(self, dependency: dict[str, Any]) -> str | None:
        workspace = str(dependency.get("workspace") or "")
        if workspace.startswith("sdkwork-iam-"):
            return "iam"
        if workspace.startswith("clawrouter-") and workspace.endswith("-capability"):
            if "wallet" in workspace or "membership" in workspace or "promotion" in workspace or "order" in workspace or "payment" in workspace or "catalog" in workspace or "inventory" in workspace or "finance" in workspace:
                return workspace.replace("clawrouter-app-", "").replace("clawrouter-backend-", "").replace("-capability", "")
        return None

    def _remove_dependency_domain_operations(
        self,
        *,
        payload: dict[str, Any],
        prefix: str,
        dependency_domain: str | None,
    ) -> list[str]:
        if not dependency_domain:
            return []

        paths = payload.get("paths")
        if not isinstance(paths, dict):
            return []

        removed: list[str] = []
        for path_key in list(paths.keys()):
            path_item = paths.get(path_key)
            route = self._normalized_route(str(path_key), prefix)
            if route is None or not isinstance(path_item, dict):
                continue
            for method in list(path_item.keys()):
                normalized_method = str(method).lower()
                operation = path_item.get(method)
                if not self._is_openapi_method(normalized_method) or not isinstance(operation, dict):
                    continue
                domain = operation.get("x-sdkwork-domain") or operation.get("x-sdk-domain")
                if domain != dependency_domain:
                    continue
                operation_id = str(operation.get("operationId") or "")
                if (
                    dependency_domain == "iam"
                    and any(operation_id.startswith(prefix) for prefix in CLAWROUTER_APP_SDK_IAM_OWNER_OPERATION_PREFIXES)
                ):
                    continue
                del path_item[method]
                removed.append(f"{normalized_method.upper()} {route}")
            if not any(self._is_openapi_method(str(item).lower()) for item in path_item):
                del paths[path_key]
        return sorted(removed)

    def _normalized_route(self, path_key: str, prefix: str) -> str | None:
        if not path_key.startswith(f"{prefix}/"):
            return None
        return re.sub(r"\{[^}]+\}", "{}", path_key.removeprefix(f"{prefix}/"))

    def _is_openapi_method(self, method: str) -> bool:
        return method in {"get", "post", "put", "patch", "delete", "head", "options", "trace"}

    def _prune_unreachable_component_schemas(self, payload: dict[str, Any]) -> None:
        components = payload.get("components")
        if not isinstance(components, dict):
            return
        schemas = components.get("schemas")
        if not isinstance(schemas, dict):
            return

        reachable = self._collect_component_schema_refs(payload.get("paths"))
        queue = list(reachable)
        while queue:
            schema_name = queue.pop()
            schema = schemas.get(schema_name)
            if not isinstance(schema, (dict, list)):
                continue
            for nested_ref in self._collect_component_schema_refs(schema):
                if nested_ref in reachable:
                    continue
                reachable.add(nested_ref)
                queue.append(nested_ref)

        for schema_name in list(schemas.keys()):
            if schema_name not in reachable:
                del schemas[schema_name]

    def _collect_component_schema_refs(self, value: Any) -> set[str]:
        refs: set[str] = set()
        if isinstance(value, list):
            for item in value:
                refs.update(self._collect_component_schema_refs(item))
            return refs
        if not isinstance(value, dict):
            return refs

        raw_ref = value.get("$ref")
        if isinstance(raw_ref, str) and raw_ref.startswith("#/components/schemas/"):
            refs.add(raw_ref.rsplit("/", 1)[-1])
        for item in value.values():
            refs.update(self._collect_component_schema_refs(item))
        return refs

    def _copy_spec_if_changed(self, source: Path, target: Path) -> list[Path]:
        if target.is_file():
            try:
                if source.read_bytes() == target.read_bytes():
                    return []
            except OSError:
                pass
        shutil.copyfile(source, target)
        return [target]

    def _write_json_if_changed(self, target: Path, payload: dict[str, Any]) -> list[Path]:
        serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        if target.is_file() and target.read_text(encoding="utf-8") == serialized:
            return []
        target.write_text(serialized, encoding="utf-8", newline="\n")
        return [target]

    def _write_sdkgen_spec_if_changed(self, sdk_family: str, source: Path, target: Path) -> list[Path]:
        if sdk_family != "clawrouter-open-sdk":
            return self._copy_spec_if_changed(source, target)

        try:
            payload = json.loads(source.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self._copy_spec_if_changed(source, target)
        if not isinstance(payload, dict):
            return self._copy_spec_if_changed(source, target)

        derived = self._derive_sdkgen_openapi(payload)
        if target.is_file() and self._read_json_or_none(target) == derived:
            return []
        self._write_json(target, derived)
        return [target]

    def _write_sdkgen_payload_if_changed(self, sdk_family: str, payload: dict[str, Any], target: Path) -> list[Path]:
        derived = self._derive_sdkgen_openapi(payload) if sdk_family == "clawrouter-open-sdk" else payload
        return self._write_json_if_changed(target, derived)

    def _derive_sdkgen_openapi(self, payload: dict[str, Any]) -> dict[str, Any]:
        derived = json.loads(json.dumps(payload))
        schemas = self._openapi_component_schemas(derived)
        if schemas:
            self._break_component_schema_ref_cycles(schemas)
        derived.setdefault("x-sdkwork-derived-contract", {})
        if isinstance(derived["x-sdkwork-derived-contract"], dict):
            derived["x-sdkwork-derived-contract"].update(
                {
                    "source": "authority-openapi",
                    "purpose": "sdk-generator-input",
                    "recursiveSchemaRefs": "dynamic-json-boundary",
                }
            )
        return derived

    def _openapi_component_schemas(self, payload: dict[str, Any]) -> dict[str, Any]:
        components = payload.get("components")
        if not isinstance(components, dict):
            return {}
        schemas = components.get("schemas")
        return schemas if isinstance(schemas, dict) else {}

    def _break_component_schema_ref_cycles(self, schemas: dict[str, Any]) -> None:
        schema_names = list(schemas)
        for schema_name in schema_names:
            schemas[schema_name] = self._rewrite_recursive_schema_ref_value(
                schemas=schema_names,
                schema_map=schemas,
                value=schemas[schema_name],
                stack=(schema_name,),
            )

    def _rewrite_recursive_schema_ref_value(
        self,
        *,
        schemas: list[str],
        schema_map: dict[str, Any],
        value: Any,
        stack: tuple[str, ...],
    ) -> Any:
        if isinstance(value, list):
            return [
                self._rewrite_recursive_schema_ref_value(
                    schemas=schemas,
                    schema_map=schema_map,
                    value=item,
                    stack=stack,
                )
                for item in value
            ]
        if not isinstance(value, dict):
            return value

        ref_name = self._component_schema_ref_name(value.get("$ref"))
        if ref_name is not None:
            if ref_name in stack:
                return self._dynamic_json_boundary_schema(value, ref_name)
            if ref_name in schema_map:
                schema_map[ref_name] = self._rewrite_recursive_schema_ref_value(
                    schemas=schemas,
                    schema_map=schema_map,
                    value=schema_map[ref_name],
                    stack=(*stack, ref_name),
                )

        rewritten: dict[str, Any] = {}
        for key, item in value.items():
            if key == "$ref":
                rewritten[key] = item
                continue
            rewritten[key] = self._rewrite_recursive_schema_ref_value(
                schemas=schemas,
                schema_map=schema_map,
                value=item,
                stack=stack,
            )
        return rewritten

    def _component_schema_ref_name(self, ref: Any) -> str | None:
        if not isinstance(ref, str):
            return None
        prefix = "#/components/schemas/"
        if not ref.startswith(prefix):
            return None
        return ref.removeprefix(prefix)

    def _dynamic_json_boundary_schema(self, source: dict[str, Any], ref_name: str) -> dict[str, Any]:
        description = source.get("description")
        if not isinstance(description, str) or not description.strip():
            description = f"Recursive reference to {ref_name} represented as an unrestricted JSON value for SDK generation."
        return {
            "description": description,
            "nullable": True,
            "x-sdkwork-authority-ref": f"#/components/schemas/{ref_name}",
            "x-sdkwork-derived-recursive-boundary": True,
        }

    def _render_placeholder_openapi(self, sdk_family: str) -> str:
        payload = {
            "openapi": "3.0.3",
            "info": {
                "title": SDK_DESCRIPTIONS[sdk_family],
                "version": "0.1.0",
                "description": "Placeholder generated until the project OpenAPI source is available.",
            },
            "paths": {},
            "components": {"schemas": {}},
            "x-sdk-client": SDK_CLIENTS[sdk_family],
            "x-sdk-family": sdk_family,
            "x-api-prefix": SDK_API_PREFIXES[sdk_family],
        }
        return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def _build_family_manifest(self, sdk_family: str, family: Path, package: dict[str, Any]) -> dict[str, Any]:
        typescript_directory = SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
        typescript_generated_path = f"{typescript_directory}/generated/server-openapi"
        package_name = SDK_PACKAGE_NAMES[sdk_family]
        version = str(package.get("version") or "0.1.0")
        generated_package = self._read_json_or_none(
            family / typescript_generated_path / "package.json"
        ) or {}
        generated_package_name = str(generated_package.get("name") or package_name)
        languages: list[dict[str, Any]] = [
            {
                "language": "typescript",
                "workspace": typescript_directory,
                "generationState": "materialized",
                "releaseState": "not_published",
                "generatedPath": typescript_generated_path,
                "packagePath": typescript_directory,
                "manifestPath": f"{typescript_directory}/package.json",
                "name": package_name,
                "version": version,
                "description": SDK_DESCRIPTIONS[sdk_family],
                "entrypoints": {
                    "main": "./dist/index.cjs",
                    "module": "./dist/index.js",
                    "types": "./dist/index.d.ts",
                },
                "consumerSurface": {
                    "primaryClient": SDK_CLIENTS[sdk_family],
                    "apiPrefix": SDK_API_PREFIXES[sdk_family],
                },
                "packages": [
                    {
                        "layer": "generated-output",
                        "packagePath": typescript_generated_path,
                        "manifestPath": f"{typescript_generated_path}/package.json",
                        "name": generated_package_name,
                        "version": version,
                        "description": f"{SDK_DESCRIPTIONS[sdk_family]} generator-owned transport output",
                        "entrypoints": {
                            "main": "./dist/index.cjs",
                            "module": "./dist/index.js",
                            "types": "./dist/index.d.ts",
                        },
                    },
                    {
                        "layer": "package",
                        "packagePath": typescript_directory,
                        "manifestPath": f"{typescript_directory}/package.json",
                        "name": package_name,
                        "version": version,
                        "description": SDK_DESCRIPTIONS[sdk_family],
                        "entrypoints": {
                            "main": "./dist/index.cjs",
                            "module": "./dist/index.js",
                            "types": "./dist/index.d.ts",
                        },
                    }
                ],
            }
        ]
        for language in OFFICIAL_SDK_LANGUAGES:
            if language == "typescript":
                continue
            workspace = f"{sdk_family}-{language}"
            generated_path = f"{workspace}/generated/server-openapi"
            manifest = self._language_manifest_file(sdk_family, language)
            generated_manifest = family / generated_path / manifest
            language_package_name = SDK_LANGUAGE_PACKAGE_NAMES[sdk_family][language]
            generation_state = "materialized" if generated_manifest.is_file() else "generation_available"
            release_state = "not_published" if generated_manifest.is_file() else "reserved"
            languages.append(
                {
                    "language": language,
                    "workspace": workspace,
                    "generationState": generation_state,
                    "releaseState": release_state,
                    "generatedPath": generated_path,
                    "manifestPath": f"{generated_path}/{manifest}",
                    "name": language_package_name,
                    "version": version,
                    "description": f"{SDK_DESCRIPTIONS[sdk_family]} {language} generated transport SDK",
                    "packages": [
                        {
                            "layer": "generated",
                            "packagePath": generated_path,
                            "manifestPath": f"{generated_path}/{manifest}",
                            "name": language_package_name,
                            "version": version,
                            "description": f"{SDK_DESCRIPTIONS[sdk_family]} {language} generated transport SDK",
                        },
                        {
                            "layer": "composed",
                            "packagePath": f"{workspace}/composed",
                            "status": "reserved",
                            "name": language_package_name,
                            "version": "",
                            "description": f"Reserved composed {language} SDK boundary for {sdk_family}",
                        },
                    ],
                }
            )
        return {
            "schemaVersion": 1,
            "workspace": sdk_family,
            "sdkFamily": sdk_family,
            "sdkName": sdk_family,
            "packageName": SDK_PACKAGE_NAMES[sdk_family],
            "sdkOwner": SDK_OWNER,
            "apiAuthority": SDK_API_AUTHORITIES[sdk_family],
            "title": SDK_DESCRIPTIONS[sdk_family],
            "apiVersion": version,
            "authoritySpec": f"openapi/{sdk_family}.openapi.json",
            "generationInputSpec": sdk_generation_input_spec(sdk_family),
            "derivedSpecs": sdk_derived_specs(sdk_family),
            "discoverySurface": {
                "sdkTarget": SDK_TYPES[sdk_family],
                "apiPrefix": SDK_API_PREFIXES[sdk_family],
                "generatedProtocols": ["http"],
                "manualTransports": [],
            },
            **({"sdkDependencies": SDK_DEPENDENCIES[sdk_family]} if sdk_family in SDK_DEPENDENCIES else {}),
            "languages": languages,
        }

    def _standardize_component_spec(self, sdk_family: str, family: Path) -> list[Path]:
        component_spec_path = family / "specs" / "component.spec.json"
        if not component_spec_path.is_file():
            return []
        component_spec = self._read_json_or_none(component_spec_path)
        if component_spec is None:
            return []
        contracts = component_spec.setdefault("contracts", {})
        if not isinstance(contracts, dict):
            contracts = {}
            component_spec["contracts"] = contracts
        if sdk_family in SDK_DEPENDENCIES:
            contracts["sdkDependencies"] = SDK_DEPENDENCIES[sdk_family]
        if self._read_json_or_none(component_spec_path) == component_spec:
            return []
        self._write_json(component_spec_path, component_spec)
        return [component_spec_path]

    def _language_manifest_file(self, sdk_family: str, language: str) -> str:
        if language == "csharp":
            return f"{SDK_LANGUAGE_PACKAGE_NAMES[sdk_family][language]}.csproj"
        return SDK_LANGUAGE_MANIFESTS[language]

    def _render_family_readme(self, sdk_family: str) -> str:
        typescript_directory = SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
        package_name = SDK_PACKAGE_NAMES[sdk_family]
        language_lines = "\n".join(f"- `{language}`" for language in OFFICIAL_SDK_LANGUAGES)
        dependency_section = self._render_dependency_readme_section(sdk_family)
        generation_input = (
            f"`openapi/{sdk_family}.sdkgen.json` derived from the authority contract"
            if sdk_family == "clawrouter-open-sdk"
            else f"`openapi/{sdk_family}.openapi.json`"
        )
        derived_contract_line = (
            f"- Derived sdkgen contract: `openapi/{sdk_family}.sdkgen.json` "
            "(generator input for recursive OpenAI-compatible schemas)\n"
            if sdk_family == "clawrouter-open-sdk"
            else f"- Derived sdkgen contract: `openapi/{sdk_family}.sdkgen.json` (synchronized artifact, not a generation source)\n"
        )
        return (
            f"# {sdk_family}\n\n"
            f"{SDK_DESCRIPTIONS[sdk_family]}.\n\n"
            "This directory is the SDK family workspace for one OpenAPI surface. "
            "Language SDKs live under this family root instead of directly under `sdks/`.\n\n"
            "## Workspace Layout\n\n"
            f"- Authority contract: `openapi/{sdk_family}.openapi.json`\n"
            f"{derived_contract_line}"
            f"- SDK generation input: {generation_input}\n"
            "- Assembly snapshot: `sdk-manifest.json`\n"
            f"- TypeScript workspace: `{typescript_directory}`\n"
            f"- TypeScript generated output: `{typescript_directory}/generated/server-openapi`\n"
            "- Other generated outputs: `<family>-<language>/generated/server-openapi`\n"
            "- Family generator: `bin/generate-sdk.mjs`\n"
            "- Family verifier: `bin/verify-sdk.mjs`\n\n"
            "## Official Languages\n\n"
            f"{language_lines}\n\n"
            "## TypeScript\n\n"
            f"The materialized TypeScript package is `{package_name}` and lives under "
            f"`{typescript_directory}/generated/server-openapi`. The `{typescript_directory}` "
            "directory is the language workspace boundary.\n\n"
            "TypeScript is the workspace dependency consumed by the portal. Other languages are "
            "generated under their own language workspace and use `generated/server-openapi` as the "
            "generator-owned transport boundary.\n\n"
            f"{dependency_section}"
            "Regenerate this SDK family from the project root:\n\n"
            "```bash\n"
            f"node ./sdks/{sdk_family}/bin/generate-sdk.mjs\n"
            "```\n\n"
            "Regenerate selected languages:\n\n"
            "```bash\n"
            f"node ./sdks/{sdk_family}/bin/generate-sdk.mjs --language typescript --language flutter\n"
            "```\n\n"
            "Verify this SDK family from the project root:\n\n"
            "```bash\n"
            f"node ./sdks/{sdk_family}/bin/verify-sdk.mjs\n"
            "```\n"
        )

    def _render_dependency_readme_section(self, sdk_family: str) -> str:
        dependencies = SDK_DEPENDENCIES.get(sdk_family, [])
        if not dependencies:
            return ""
        lines = [
            "## SDK Dependency Contract",
            "",
            "This SDK family is owner-only. Dependency-owned routes are consumed through declared",
            "`sdkDependencies` and must not be regenerated into this transport SDK.",
            "",
            "| Workspace | Role | Mode | API prefix | Generated transport policy |",
            "| --- | --- | --- | --- | --- |",
        ]
        for dependency in dependencies:
            lines.append(
                f"| `{dependency['workspace']}` | `{dependency['role']}` | "
                f"`{dependency['dependencyMode']}` | `{dependency['apiPrefix']}` | "
                f"`generatedTransportImportPolicy: {dependency['generatedTransportImportPolicy']}` |"
            )
        lines.extend(["", "Package names:", ""])
        for dependency in dependencies:
            lines.append(f"- `{dependency['workspace']}`")
            package_by_language = dependency.get("packageByLanguage") or {}
            for language in OFFICIAL_SDK_LANGUAGES:
                package_name = package_by_language.get(language)
                if package_name is None:
                    continue
                lines.append(f"- `{language}`: `{package_name}`")
        lines.append("")
        return "\n".join(lines) + "\n"

    def _render_generate_script(self, sdk_family: str) -> str:
        typescript_directory = SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
        description = SDK_DESCRIPTIONS[sdk_family]
        sdk_type = SDK_TYPES[sdk_family]
        api_prefix = SDK_API_PREFIXES[sdk_family]
        base_url = {
            "clawrouter-app-sdk": "http://localhost:18082",
            "clawrouter-backend-sdk": "http://localhost:18081",
            "clawrouter-open-sdk": "https://api.sdkwork.com",
        }[sdk_family]
        package_names = SDK_LANGUAGE_PACKAGE_NAMES[sdk_family]
        namespaces = SDK_LANGUAGE_NAMESPACES.get(sdk_family, {})
        sdk_generator_input_path = sdk_generation_input_path_symbol(sdk_family)
        sdkgen_input_path_line = (
            "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n"
            if sdk_family == "clawrouter-open-sdk"
            else ""
        )
        standard_profile_line = (
            "    '--standard-profile', 'sdkwork-v3',\n"
            if sdk_family in {"clawrouter-app-sdk", "clawrouter-backend-sdk"}
            else ""
        )
        domain_transport_constants = ""
        domain_transport_after_generation = ""
        domain_transport_function = ""
        if sdk_family in SDK_DOMAIN_TRANSPORT_NAMES:
            domain_transport_constants = (
                f"const domainTransportName = '{SDK_DOMAIN_TRANSPORT_NAMES[sdk_family]}';\n"
                "const domainTransportInputPath = `sdks/${sdkFamily}/openapi/${domainTransportName}.openapi.json`;\n"
                f"const domainTransportPackageName = '{SDK_DOMAIN_TRANSPORT_PACKAGE_NAMES[sdk_family]}';\n"
                "const domainTransportOutputPath = `sdks/${sdkFamily}/${sdkFamily}-typescript/generated/domains/server-openapi`;\n"
            )
            domain_transport_after_generation = (
                "  if (language === 'typescript') {\n"
                "    runDomainTransportGeneration();\n"
                "  }\n"
            )
            domain_transport_function = (
                "function runDomainTransportGeneration() {\n"
                "  rmSync(path.join(workspaceRoot, domainTransportOutputPath), { recursive: true, force: true });\n"
                "  const result = spawnSync(command, [\n"
                "    'tools/clawrouter_strict_sdk_generate.mjs',\n"
                "    'generate',\n"
                "    '-i', domainTransportInputPath,\n"
                "    '-o', domainTransportOutputPath,\n"
                "    '-n', domainTransportName,\n"
                "    '-t', sdkType,\n"
                "    '-l', 'typescript',\n"
                "    '--base-url', baseUrl,\n"
                "    '--api-prefix', apiPrefix,\n"
                "    '--package-name', domainTransportPackageName,\n"
                "    '--description', `${description} federated domain transport`,\n"
                "    '--fixed-sdk-version', '0.1.0',\n"
                "    '--no-sync-published-version',\n"
                "    '--standard-profile', 'sdkwork-v3',\n"
                "  ], { cwd: workspaceRoot, stdio: 'inherit' });\n"
                "  if (result.error) {\n"
                "    throw result.error;\n"
                "  }\n"
                "  if ((result.status ?? 1) !== 0) {\n"
                "    process.exit(result.status ?? 1);\n"
                "  }\n"
                "  cleanGeneratedOutputAt(domainTransportOutputPath);\n"
                "}\n\n"
            )
        return (
            "#!/usr/bin/env node\n"
            "import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';\n"
            "import { spawnSync } from 'node:child_process';\n"
            "import path from 'node:path';\n"
            "import { fileURLToPath } from 'node:url';\n\n"
            "const __filename = fileURLToPath(import.meta.url);\n"
            "const workspaceRoot = path.resolve(path.dirname(__filename), '..', '..', '..');\n"
            "const command = process.platform === 'win32' ? 'node.exe' : 'node';\n"
            "const sdkGeneratorCli = path.resolve(workspaceRoot, '../sdkwork-sdk-generator/bin/sdkgen.js');\n"
            f"const sdkFamily = '{sdk_family}';\n"
            f"const sdkType = '{sdk_type}';\n"
            "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;\n"
            f"{domain_transport_constants}"
            f"{sdkgen_input_path_line}"
            f"const baseUrl = '{base_url}';\n"
            f"const apiPrefix = '{api_prefix}';\n"
            f"const description = '{description}';\n"
            "const OFFICIAL_LANGUAGES = ['typescript', 'flutter', 'rust', 'java', 'csharp', 'swift', 'kotlin', 'go', 'python'];\n"
            f"const packageNames = {json.dumps(package_names, ensure_ascii=False, sort_keys=True)};\n"
            f"const namespaces = {json.dumps(namespaces, ensure_ascii=False, sort_keys=True)};\n\n"
            "const TEXT_FILE_EXTENSIONS = new Set(['.bat', '.cmd', '.cs', '.dart', '.go', '.gradle', '.java', '.js', '.json', '.kt', '.kts', '.lock', '.md', '.mjs', '.properties', '.ps1', '.py', '.rs', '.sh', '.swift', '.toml', '.ts', '.txt', '.xml', '.yaml', '.yml']);\n"
            "const TEXT_FILE_NAMES = new Set(['.gitattributes', '.gitignore', 'Dockerfile', 'LICENSE', 'Makefile', 'NOTICE']);\n\n"
            "const languages = parseLanguages(process.argv.slice(2));\n"
            "syncFamilyOpenApiSnapshots();\n"
            "for (const language of languages) {\n"
            "  runLanguage(language);\n"
            "}\n\n"
            "function parseLanguages(argv) {\n"
            "  const selected = [];\n"
            "  for (let index = 0; index < argv.length; index += 1) {\n"
            "    const arg = argv[index];\n"
            "    if (arg === '--language' || arg === '-l') {\n"
            "      const value = argv[index + 1];\n"
            "      if (!value || value.startsWith('-')) {\n"
            "        throw new Error(`${arg} requires a language value`);\n"
            "      }\n"
            "      selected.push(...splitLanguages(value));\n"
            "      index += 1;\n"
            "      continue;\n"
            "    }\n"
            "    if (arg.startsWith('--language=')) {\n"
            "      selected.push(...splitLanguages(arg.slice('--language='.length)));\n"
            "      continue;\n"
            "    }\n"
            "    if (arg === '--all') {\n"
            "      selected.push(...OFFICIAL_LANGUAGES);\n"
            "      continue;\n"
            "    }\n"
            "    if (arg === '--help' || arg === '-h') {\n"
            "      printHelp();\n"
            "      process.exit(0);\n"
            "    }\n"
            "    throw new Error(`Unsupported SDK generation option: ${arg}`);\n"
            "  }\n"
            "  const normalized = selected.length === 0 ? ['typescript'] : selected;\n"
            "  return [...new Set(normalized.map((item) => item.toLowerCase()))].map((language) => {\n"
            "    if (!OFFICIAL_LANGUAGES.includes(language)) {\n"
            "      throw new Error(`Unsupported SDK language for ${sdkFamily}: ${language}`);\n"
            "    }\n"
            "    return language;\n"
            "  });\n"
            "}\n\n"
            "function syncFamilyOpenApiSnapshots() {\n"
            "  const python = process.env.PYTHON_BIN || 'python';\n"
            "  const result = spawnSync(python, [\n"
            "    '-B',\n"
            "    '-m',\n"
            "    'tools.clawrouter_sdk_runtime_standardizer',\n"
            "    '--root',\n"
            "    workspaceRoot,\n"
            "    '--sdk-dir',\n"
            "    sdkFamily,\n"
            "    '--openapi-only',\n"
            "  ], { cwd: workspaceRoot, stdio: 'inherit' });\n"
            "  if (result.error) {\n"
            "    throw result.error;\n"
            "  }\n"
            "  if ((result.status ?? 1) !== 0) {\n"
            "    process.exit(result.status ?? 1);\n"
            "  }\n"
            "}\n\n"
            "function splitLanguages(value) {\n"
            "  return String(value).split(',').map((item) => item.trim()).filter(Boolean);\n"
            "}\n\n"
            "function printHelp() {\n"
            "  console.log(`Usage: node ./sdks/${sdkFamily}/bin/generate-sdk.mjs [--language <language>] [--all]\n"
            "\n"
            "Options:\n"
            "  --language, -l <name>  Generate one language. May be repeated or comma-separated.\n"
            "  --all                 Generate all official SDK languages.\n"
            "  --help, -h            Show this help.\n"
            "\n"
            "Official languages: ${OFFICIAL_LANGUAGES.join(', ')}`);\n"
            "}\n\n"
            "function runLanguage(language) {\n"
            "  rmSync(path.join(workspaceRoot, generatedOutputPath(language)), { recursive: true, force: true });\n"
            "  const args = language === 'typescript'\n"
            "    ? strictTypeScriptArgs()\n"
            "    : generatorArgs(language);\n"
            "  const result = spawnSync(command, args, { cwd: workspaceRoot, stdio: 'inherit' });\n"
            "  if (result.error) {\n"
            "    throw result.error;\n"
            "  }\n"
            "  if ((result.status ?? 1) !== 0) {\n"
            "    process.exit(result.status ?? 1);\n"
            "  }\n"
            "  cleanGeneratedOutput(language);\n"
            f"{domain_transport_after_generation}"
            "}\n\n"
            f"{domain_transport_function}"
            "function strictTypeScriptArgs() {\n"
            "  return [\n"
            "    'tools/clawrouter_strict_sdk_generate.mjs',\n"
            "    'generate',\n"
            f"    '-i', {sdk_generator_input_path},\n"
            f"    '-o', 'sdks/{sdk_family}/{typescript_directory}/generated/server-openapi',\n"
            "    '-n', sdkFamily,\n"
            "    '-t', sdkType,\n"
            "    '-l', 'typescript',\n"
            "    '--base-url', baseUrl,\n"
            "    '--api-prefix', apiPrefix,\n"
            "    '--package-name', packageNames.typescript,\n"
            "    '--description', description,\n"
            "    '--fixed-sdk-version', '0.1.0',\n"
            "    '--no-sync-published-version',\n"
            f"{standard_profile_line}"
            "  ];\n"
            "}\n\n"
            "function generatorArgs(language) {\n"
            "  const args = [\n"
            "    sdkGeneratorCli,\n"
            "    'generate',\n"
            f"    '-i', {sdk_generator_input_path},\n"
            "    '-o', `sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi`,\n"
            "    '-n', sdkFamily,\n"
            "    '-t', sdkType,\n"
            "    '-l', language,\n"
            "    '--base-url', baseUrl,\n"
            "    '--api-prefix', apiPrefix,\n"
            "    '--package-name', packageNames[language],\n"
            "    '--description', `${description} ${language} generated transport SDK`,\n"
            "    '--fixed-sdk-version', '0.1.0',\n"
            "    '--sdk-root', `sdks/${sdkFamily}`,\n"
            "    '--sdk-name', sdkFamily,\n"
            "    '--npm-package-name', packageNames.typescript,\n"
            "    '--no-sync-published-version',\n"
            f"{standard_profile_line}"
            "  ];\n"
            "  if (namespaces[language]) {\n"
            "    args.push('--namespace', namespaces[language]);\n"
            "  }\n"
            "  return args;\n"
            "}\n\n"
            "function generatedOutputPath(language) {\n"
            "  if (language === 'typescript') {\n"
            f"    return 'sdks/{sdk_family}/{typescript_directory}/generated/server-openapi';\n"
            "  }\n"
            "  return `sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi`;\n"
            "}\n\n"
            "function cleanGeneratedOutput(language) {\n"
            "  cleanGeneratedOutputAt(generatedOutputPath(language));\n"
            "}\n\n"
            "function cleanGeneratedOutputAt(outputPath) {\n"
            "  const outputRoot = path.join(workspaceRoot, outputPath);\n"
            "  if (!existsSync(outputRoot)) {\n"
            "    return;\n"
            "  }\n"
            "  for (const filePath of listGeneratedFiles(outputRoot)) {\n"
            "    if (!isTextGeneratedFile(filePath)) {\n"
            "      continue;\n"
            "    }\n"
            "    const source = readFileSync(filePath, 'utf8');\n"
            "    const normalized = source.replace(/[ \\t]+(?=\\r?\\n)/g, '');\n"
            "    if (normalized !== source) {\n"
            "      writeFileSync(filePath, normalized, 'utf8');\n"
            "    }\n"
            "  }\n"
            "}\n\n"
            "function listGeneratedFiles(root) {\n"
            "  const files = [];\n"
            "  for (const entry of readdirSync(root)) {\n"
            "    const entryPath = path.join(root, entry);\n"
            "    const stats = statSync(entryPath);\n"
            "    if (stats.isDirectory()) {\n"
            "      files.push(...listGeneratedFiles(entryPath));\n"
            "    } else if (stats.isFile()) {\n"
            "      files.push(entryPath);\n"
            "    }\n"
            "  }\n"
            "  return files;\n"
            "}\n\n"
            "function isTextGeneratedFile(filePath) {\n"
            "  return TEXT_FILE_NAMES.has(path.basename(filePath)) || TEXT_FILE_EXTENSIONS.has(path.extname(filePath));\n"
            "}\n"
        )

    def _render_verify_script(self, sdk_family: str) -> str:
        typescript_directory = SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
        generation_input_spec = sdk_generation_input_spec(sdk_family)
        derived_specs = sdk_derived_specs(sdk_family)
        return (
            "#!/usr/bin/env node\n"
            "import { existsSync, readFileSync } from 'node:fs';\n"
            "import path from 'node:path';\n"
            "import { fileURLToPath } from 'node:url';\n\n"
            "const __filename = fileURLToPath(import.meta.url);\n"
            "const workspaceRoot = path.resolve(path.dirname(__filename), '..');\n"
            "const required = [\n"
            "  'sdk-manifest.json',\n"
            f"  'openapi/{sdk_family}.openapi.json',\n"
            f"  'openapi/{sdk_family}.sdkgen.json',\n"
            f"  '{typescript_directory}/generated/server-openapi/package.json',\n"
            f"  '{typescript_directory}/generated/server-openapi/sdkwork-sdk.json',\n"
            f"  '{typescript_directory}/generated/server-openapi/src/index.ts',\n"
            "];\n"
            "const missing = required.filter((entry) => !existsSync(path.join(workspaceRoot, entry)));\n"
            "if (missing.length > 0) {\n"
            f"  throw new Error('{sdk_family} SDK family is incomplete: ' + missing.join(', '));\n"
            "}\n"
            "const assembly = JSON.parse(readFileSync(path.join(workspaceRoot, 'sdk-manifest.json'), 'utf8'));\n"
            f"if (assembly.workspace !== '{sdk_family}') {{\n"
            "  throw new Error('SDK assembly workspace drifted');\n"
            "}\n"
            f"const expectedGenerationInputSpec = '{generation_input_spec}';\n"
            f"const expectedDerivedSpecs = {json.dumps(derived_specs, ensure_ascii=False, sort_keys=True, separators=(',', ':'))};\n"
            "if (Object.prototype.hasOwnProperty.call(assembly, 'derivedSpec')) {\n"
            "  throw new Error('SDK assembly must not declare legacy derivedSpec; use derivedSpecs');\n"
            "}\n"
            "if (assembly.generationInputSpec !== expectedGenerationInputSpec) {\n"
            "  throw new Error(`SDK assembly generationInputSpec must be ${expectedGenerationInputSpec}`);\n"
            "}\n"
            "if (JSON.stringify(assembly.derivedSpecs ?? null) !== JSON.stringify(expectedDerivedSpecs)) {\n"
            "  throw new Error('SDK assembly derivedSpecs drifted');\n"
            "}\n"
            "if (!Array.isArray(assembly.languages) || !assembly.languages.some((item) => item.language === 'typescript')) {\n"
            "  throw new Error('SDK assembly must include the TypeScript workspace');\n"
            "}\n"
            f"console.log('Verified {sdk_family} SDK family.');\n"
        )

    def _render_family_smoke_test(self, sdk_family: str) -> str:
        typescript_directory = SDK_TYPESCRIPT_DIRECTORIES[sdk_family]
        return (
            "import assert from 'node:assert/strict';\n"
            "import { existsSync } from 'node:fs';\n"
            "import test from 'node:test';\n"
            "import path from 'node:path';\n\n"
            "const workspaceRoot = path.resolve(import.meta.dirname, '..');\n\n"
            f"test('{sdk_family} family layout is materialized', () => {{\n"
            f"  assert.equal(existsSync(path.join(workspaceRoot, '{typescript_directory}', 'generated', 'server-openapi', 'package.json')), true);\n"
            f"  assert.equal(existsSync(path.join(workspaceRoot, 'openapi', '{sdk_family}.openapi.json')), true);\n"
            "  assert.equal(existsSync(path.join(workspaceRoot, 'sdk-manifest.json')), true);\n"
            "});\n"
        )

    def _sync_typescript_package_root_from_generated(
        self,
        sdk_family: str,
        package_root: Path,
        generated_root: Path,
    ) -> list[Path]:
        updated: list[Path] = []
        generated_manifest = self._read_json_or_none(
            generated_root / ".sdkwork" / "sdkwork-generator-manifest.json"
        )
        generated_paths = self._manifest_generated_paths(generated_manifest)
        if not generated_paths:
            return updated

        generated_paths.update(
            {
                "CHANGELOG.md",
                "LICENSE",
                "README.md",
                "tsconfig.json",
            }
        )
        for relative_path in sorted(generated_paths):
            if not self._is_typescript_package_sync_path(relative_path):
                continue
            source = generated_root / relative_path
            target = package_root / relative_path
            if not source.is_file():
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                shutil.copyfile(source, target)
                updated.append(target)

        for control_file in (
            "sdkwork-generator-changes.json",
            "sdkwork-generator-manifest.json",
            "sdkwork-generator-report.json",
        ):
            source_control = generated_root / ".sdkwork" / control_file
            target_control = package_root / ".sdkwork" / control_file
            if source_control.is_file():
                target_control.parent.mkdir(parents=True, exist_ok=True)
                if not target_control.is_file() or target_control.read_bytes() != source_control.read_bytes():
                    shutil.copyfile(source_control, target_control)
                    updated.append(target_control)

        updated.extend(self._remove_stale_typescript_package_generated_artifacts(package_root, generated_paths))
        return updated

    def _manifest_generated_paths(self, manifest: dict[str, Any] | None) -> set[str]:
        if not self._is_sdk_generator_manifest(manifest):
            return set()
        generated_files = manifest.get("generatedFiles")
        if not isinstance(generated_files, list):
            return set()
        paths: set[str] = set()
        for entry in generated_files:
            if not isinstance(entry, dict):
                continue
            raw_path = entry.get("path")
            if not isinstance(raw_path, str):
                continue
            normalized = raw_path.replace("\\", "/").lstrip("/")
            if normalized and ".." not in Path(normalized).parts:
                paths.add(normalized)
        return paths

    def _is_typescript_package_sync_path(self, relative_path: str) -> bool:
        if relative_path.startswith("src/"):
            return relative_path.endswith(".ts")
        if relative_path.startswith("bin/"):
            return Path(relative_path).suffix in {".mjs", ".ps1", ".sh", ".bat"}
        if relative_path.startswith("custom/"):
            return relative_path in {"custom/build-runtime.mjs", "custom/README.md"}
        return relative_path in {
            "CHANGELOG.md",
            "LICENSE",
            "README.md",
            "tsconfig.json",
        }

    def _remove_stale_typescript_package_generated_artifacts(
        self,
        package_root: Path,
        generated_paths: set[str],
    ) -> list[Path]:
        updated: list[Path] = []
        for directory in (package_root / "src" / "api", package_root / "src" / "types"):
            if not directory.is_dir():
                continue
            for source_path in sorted(directory.glob("*.ts")):
                relative_path = source_path.relative_to(package_root).as_posix()
                if relative_path in generated_paths:
                    continue
                source_path.unlink()
                updated.append(source_path)
                stem = source_path.stem
                dist_relative_dir = directory.relative_to(package_root)
                for stale_path in (
                    package_root / "dist" / dist_relative_dir / f"{stem}.js",
                    package_root / "dist" / dist_relative_dir / f"{stem}.cjs",
                    package_root / "dist" / dist_relative_dir / f"{stem}.d.ts",
                    package_root / "dist" / dist_relative_dir / f"{stem}.d.ts.map",
                ):
                    if stale_path.exists():
                        stale_path.unlink()
                        updated.append(stale_path)
        return updated

    def _standardize_sdk(self, sdk_family: str, base: Path) -> list[Path]:
        updated: list[Path] = []
        package_path = base / "package.json"
        package = self._read_json(package_path)
        package["name"] = SDK_PACKAGE_NAMES[sdk_family]
        package["version"] = str(package.get("version") or "0.1.0")
        package["sdkworkRole"] = "composed-facade"
        package["description"] = SDK_DESCRIPTIONS[sdk_family]
        package["author"] = "SDKWork Team"
        package["license"] = "MIT"
        package["type"] = "module"
        package["main"] = "./dist/index.cjs"
        package["module"] = "./dist/index.js"
        package["types"] = "./dist/index.d.ts"
        exports = package.setdefault("exports", {})
        if not isinstance(exports, dict):
            exports = {}
            package["exports"] = exports
        exports["."] = {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "require": "./dist/index.cjs",
        }
        domains_entry = base / "src" / "domains" / "index.ts"
        if domains_entry.is_file():
            exports["./domains"] = {
                "types": "./src/domains/index.ts",
                "import": "./src/domains/index.ts",
                "default": "./src/domains/index.ts",
            }
        else:
            exports.pop("./domains", None)
        package["publishConfig"] = {
            "access": "public",
            "registry": "https://registry.npmjs.org/",
        }

        scripts = package.setdefault("scripts", {})
        if not isinstance(scripts, dict):
            scripts = {}
            package["scripts"] = scripts
        package.pop("private", None)
        scripts["build"] = "node custom/build-runtime.mjs"
        scripts["dev"] = "node custom/build-runtime.mjs"
        scripts["prepublishOnly"] = "npm run build"

        dev_dependencies = package.setdefault("devDependencies", {})
        if not isinstance(dev_dependencies, dict):
            dev_dependencies = {}
            package["devDependencies"] = dev_dependencies
        dev_dependencies.pop("vite", None)
        dev_dependencies.pop("vite-plugin-dts", None)
        dev_dependencies["@types/node"] = SDK_TYPES_NODE_VERSION
        dev_dependencies["typescript"] = SDK_TYPESCRIPT_VERSION
        dev_dependencies["rollup"] = SDK_ROLLUP_VERSION

        dependencies = package.setdefault("dependencies", {})
        if not isinstance(dependencies, dict):
            dependencies = {}
            package["dependencies"] = dependencies
        dependencies["@sdkwork/sdk-common"] = SDK_COMMON_VERSION

        if self._read_json_or_none(package_path) != package:
            self._write_json(package_path, package)
            updated.append(package_path)

        build_script_path = base / "custom" / "build-runtime.mjs"
        build_script_path.parent.mkdir(parents=True, exist_ok=True)
        if not build_script_path.is_file() or build_script_path.read_text(encoding="utf-8") != BUILD_SCRIPT:
            build_script_path.write_text(BUILD_SCRIPT, encoding="utf-8", newline="\n")
            updated.append(build_script_path)

        custom_readme_path = base / "custom" / "README.md"
        custom_readme = (
            "# Custom SDK Extensions\n\n"
            "This directory is reserved for handwritten extensions that are not owned by the SDK generator.\n"
        )
        if not custom_readme_path.is_file() or custom_readme_path.read_text(encoding="utf-8") != custom_readme:
            custom_readme_path.write_text(custom_readme, encoding="utf-8", newline="\n")
            updated.append(custom_readme_path)

        metadata_path = base / "sdkwork-sdk.json"
        metadata = {
            "language": "typescript",
            "sdkType": SDK_TYPES[sdk_family],
            "name": sdk_family,
            "packageName": package.get("name"),
            "version": package.get("version"),
        }
        if not metadata_path.is_file() or self._read_json_or_none(metadata_path) != metadata:
            self._write_json(metadata_path, metadata)
            updated.append(metadata_path)

        manifest_path = base / ".sdkwork" / "sdkwork-generator-manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        generator_manifest = self._read_json_or_none(manifest_path)
        if not self._is_sdk_generator_manifest(generator_manifest):
            manifest = {
                "generator": "../sdkwork-sdk-generator",
                "language": "typescript",
                "sdkType": SDK_TYPES[sdk_family],
                "packageName": package.get("name"),
                "version": package.get("version"),
            }
            if generator_manifest != manifest:
                self._write_json(manifest_path, manifest)
                updated.append(manifest_path)

        http_client_path = base / "src" / "http" / "client.ts"
        if http_client_path.is_file():
            source = http_client_path.read_text(encoding="utf-8")
            normalized = self._standardize_http_client_content_type(source)
            if normalized != source:
                http_client_path.write_text(normalized, encoding="utf-8", newline="\n")
                updated.append(http_client_path)

        types_dir = base / "src" / "types"
        if types_dir.is_dir():
            generated_type_stems = self._manifest_generated_type_stems(generator_manifest)
            if generated_type_stems is not None:
                updated.extend(self._remove_unmanifested_type_artifacts(base, generated_type_stems))
            updated.extend(self._ensure_project_required_type_modules(types_dir))
            for type_path in sorted(types_dir.glob("*.ts")):
                source = type_path.read_text(encoding="utf-8")
                normalized = self._standardize_union_array_types(source)
                normalized = self._standardize_closed_empty_interfaces(normalized)
                if type_path.name == "common.ts":
                    normalized = self._standardize_common_query_list_form(normalized)
                elif sdk_family in {"clawrouter-app-sdk", "clawrouter-backend-sdk"} and self._is_request_input_type_file(type_path):
                    normalized = self._standardize_search_text_properties(normalized)
                if normalized != source:
                    type_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(type_path)
            type_index_path = types_dir / "index.ts"
            if type_index_path.is_file():
                source = type_index_path.read_text(encoding="utf-8")
                normalized = self._standardize_type_index_exports(types_dir, source, generated_type_stems)
                if normalized != source:
                    type_index_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(type_index_path)

        if sdk_family == "clawrouter-backend-sdk":
            skill_api_path = base / "src" / "api" / "skill.ts"
            if skill_api_path.is_file():
                source = skill_api_path.read_text(encoding="utf-8")
                normalized = self._standardize_backend_skill_api_method_names(source)
                if normalized != source:
                    skill_api_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(skill_api_path)
            app_api_path = base / "src" / "api" / "app.ts"
            if app_api_path.is_file():
                source = app_api_path.read_text(encoding="utf-8")
                normalized = self._standardize_backend_app_api_method_names(source)
                if normalized != source:
                    app_api_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(app_api_path)

        api_dir = base / "src" / "api"
        if api_dir.is_dir():
            api_index_path = api_dir / "index.ts"
            if api_index_path.is_file():
                source = api_index_path.read_text(encoding="utf-8")
                normalized = self._standardize_api_index_exports(source)
                if normalized != source:
                    api_index_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(api_index_path)
            for api_path in sorted(api_dir.glob("*.ts")):
                if api_path.name in {"base.ts", "index.ts", "paths.ts"}:
                    continue
                source = api_path.read_text(encoding="utf-8")
                normalized = self._standardize_search_query_parameters(source)
                if normalized != source:
                    api_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(api_path)

        if sdk_family == "clawrouter-app-sdk":
            content_api_path = base / "src" / "api" / "content.ts"
            if content_api_path.is_file():
                source = content_api_path.read_text(encoding="utf-8")
                normalized = self._standardize_app_content_multipart_request_bodies(base, sdk_family, source)
                if normalized != source:
                    content_api_path.write_text(normalized, encoding="utf-8", newline="\n")
                    updated.append(content_api_path)

        publish_core_path = base / "bin" / "publish-core.mjs"
        if publish_core_path.is_file():
            source = publish_core_path.read_text(encoding="utf-8")
            normalized = self._standardize_publish_core_install_command(source)
            if normalized != source:
                publish_core_path.write_text(normalized, encoding="utf-8", newline="\n")
                updated.append(publish_core_path)

        updated.extend(self._remove_unexported_api_artifacts(base))
        updated.extend(self._remove_trailing_whitespace(base, sdk_family))

        return updated

    def _standardize_http_client_content_type(self, source: str) -> str:
        updated = source
        if "private withContentType(" not in updated:
            marker = "  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {"
            helper = """  private withContentType(headers?: Record<string, string>, contentType?: string): Record<string, string> | undefined {
    if (!contentType) {
      return headers;
    }
    const nextHeaders = { ...(headers ?? {}) };
    nextHeaders['Content-Type'] = contentType;
    return nextHeaders;
  }

"""
            updated = updated.replace(marker, helper + marker, 1)

        updated = updated.replace(
            "async post<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {",
            "async post<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>, contentType?: string): Promise<T> {",
        )
        updated = updated.replace(
            "return this.request<T>(path, { method: 'POST', body, params, headers });",
            "return this.request<T>(path, { method: 'POST', body, params, headers: this.withContentType(headers, contentType) });",
        )
        updated = updated.replace(
            "async put<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {",
            "async put<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>, contentType?: string): Promise<T> {",
        )
        updated = updated.replace(
            "return this.request<T>(path, { method: 'PUT', body, params, headers });",
            "return this.request<T>(path, { method: 'PUT', body, params, headers: this.withContentType(headers, contentType) });",
        )
        updated = updated.replace(
            "async patch<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {",
            "async patch<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>, contentType?: string): Promise<T> {",
        )
        updated = updated.replace(
            "return this.request<T>(path, { method: 'PATCH', body, params, headers });",
            "return this.request<T>(path, { method: 'PATCH', body, params, headers: this.withContentType(headers, contentType) });",
        )
        return updated

    def _standardize_union_array_types(self, source: str) -> str:
        """Fix old generator output where union arrays miss parentheses."""

        def replace(match: re.Match[str]) -> str:
            return f"{match.group('operator')}({match.group('union')})[]{match.group('trailer')}"

        return UNION_ARRAY_TYPE_PATTERN.sub(replace, source)

    def _standardize_closed_empty_interfaces(self, source: str) -> str:
        """Represent closed empty object schemas as a restrictive TypeScript type."""

        def replace(match: re.Match[str]) -> str:
            return f"{match.group('prefix')}type {match.group('name')} = Record<string, never>;"

        return EMPTY_INTERFACE_PATTERN.sub(replace, source)

    def _standardize_common_query_list_form(self, source: str) -> str:
        return self._standardize_search_text_properties(source)

    def _standardize_search_query_parameters(self, source: str) -> str:
        updated = self._standardize_search_text_properties(source)
        updated = re.sub(
            r"\{\s*name:\s*['\"](?:search_query|keyword|search|searchQuery)['\"],\s*value:\s*params\?\.(?:searchQuery|search_query|keyword|search)",
            "{ name: 'q', value: params?.q",
            updated,
        )
        updated = re.sub(
            r"\{\s*name:\s*['\"](?:search_query|keyword|search|searchQuery)['\"],\s*value:\s*params\.(?:searchQuery|search_query|keyword|search)",
            "{ name: 'q', value: params.q",
            updated,
        )
        return updated

    def _standardize_search_text_properties(self, source: str) -> str:
        return re.sub(
            r"^(\s*)(?:searchQuery|search_query|keyword|search)(\??\s*:\s*)",
            r"\1q\2",
            source,
            flags=re.MULTILINE,
        )

    def _is_request_input_type_file(self, type_path: Path) -> bool:
        stem = type_path.stem.lower()
        return any(
            stem.endswith(suffix)
            or f"-{suffix}-" in stem
            or f"_{suffix}_" in stem
            for suffix in ("request", "form", "input", "dto", "query")
        )

    def _standardize_api_index_exports(self, source: str) -> str:
        """Export full API modules so generated parameter interfaces are public."""

        lines: list[str] = []
        changed = False
        for line in source.splitlines():
            match = re.match(r"\s*export\s+\{[^}]+\}\s+from\s+['\"]\./([^'\"]+)['\"]\s*;?\s*$", line)
            if match is None:
                lines.append(line)
                continue

            stem = match.group(1)
            if stem in {"base", "paths"}:
                lines.append(line)
                continue

            lines.append(f"export * from './{stem}';")
            changed = True

        if not changed:
            return source
        return "\n".join(lines) + "\n"

    def _standardize_type_index_exports(
        self,
        types_dir: Path,
        source: str,
        generated_type_stems: set[str] | None = None,
    ) -> str:
        declarations = self._type_file_declarations(types_dir, generated_type_stems)
        existing_stems: set[str] = set()
        changed = False
        lines: list[str] = []
        for line in source.splitlines():
            match = re.search(r"from\s+['\"]\./([^'\"]+)['\"]", line)
            if match is not None:
                stem = match.group(1)
                if generated_type_stems is not None and stem not in generated_type_stems:
                    changed = True
                    continue
                if not (types_dir / f"{stem}.ts").is_file():
                    changed = True
                    continue
                existing_stems.add(stem)
            lines.append(line)

        missing_exports = [
            (stem, symbol)
            for stem, symbol in declarations
            if stem not in existing_stems
        ]
        if not changed and not missing_exports:
            return source

        for stem, symbol in missing_exports:
            lines.append(f"export type {{ {symbol} }} from './{stem}';")
        return "\n".join(lines) + "\n"

    def _type_file_declarations(
        self,
        types_dir: Path,
        generated_type_stems: set[str] | None = None,
    ) -> list[tuple[str, str]]:
        declarations: list[tuple[str, str]] = []
        for type_path in sorted(types_dir.glob("*.ts")):
            if type_path.name == "index.ts":
                continue
            if generated_type_stems is not None and type_path.stem not in generated_type_stems:
                continue
            source = type_path.read_text(encoding="utf-8")
            match = re.search(
                r"^\s*export\s+(?:interface|type|class|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)",
                source,
                flags=re.MULTILINE,
            )
            if match is None:
                continue
            declarations.append((type_path.stem, match.group(1)))
        return declarations

    def _is_sdk_generator_manifest(self, manifest: dict[str, Any] | None) -> bool:
        return isinstance(manifest, dict) and manifest.get("generator") == "@sdkwork/sdk-generator"

    def _manifest_generated_type_stems(self, manifest: dict[str, Any] | None) -> set[str] | None:
        if not self._is_sdk_generator_manifest(manifest):
            return None
        generated_files = manifest.get("generatedFiles")
        if not isinstance(generated_files, list):
            return None
        stems: set[str] = set()
        for entry in generated_files:
            if not isinstance(entry, dict):
                continue
            raw_path = entry.get("path")
            if not isinstance(raw_path, str):
                continue
            normalized_path = raw_path.replace("\\", "/")
            if not normalized_path.startswith("src/types/") or not normalized_path.endswith(".ts"):
                continue
            stem = Path(normalized_path).stem
            if stem != "index":
                stems.add(stem)
        stems.update(PROJECT_REQUIRED_TYPE_MODULES)
        return stems

    def _remove_unmanifested_type_artifacts(self, base: Path, generated_type_stems: set[str]) -> list[Path]:
        types_dir = base / "src" / "types"
        if not types_dir.is_dir():
            return []
        updated: list[Path] = []
        for source_path in sorted(types_dir.glob("*.ts")):
            stem = source_path.stem
            if stem == "index" or stem in generated_type_stems:
                continue
            source_path.unlink()
            updated.append(source_path)
            for stale_path in (
                base / "dist" / "types" / f"{stem}.js",
                base / "dist" / "types" / f"{stem}.cjs",
                base / "dist" / "types" / f"{stem}.d.ts",
                base / "dist" / "types" / f"{stem}.d.ts.map",
            ):
                if stale_path.exists():
                    stale_path.unlink()
                    updated.append(stale_path)
        return updated

    def _ensure_project_required_type_modules(self, types_dir: Path) -> list[Path]:
        updated: list[Path] = []
        for stem, (_, content) in PROJECT_REQUIRED_TYPE_MODULES.items():
            type_path = types_dir / f"{stem}.ts"
            if type_path.is_file() and type_path.read_text(encoding="utf-8") == content:
                continue
            type_path.write_text(content, encoding="utf-8", newline="\n")
            updated.append(type_path)
        return updated

    def _standardize_backend_skill_api_method_names(self, source: str) -> str:
        """Generated TypeScript SDKs expose skill lifecycle actions as resource-tree create calls."""

        return source

    def _standardize_backend_app_api_method_names(self, source: str) -> str:
        """Keep backend app detail method aligned with the OpenAPI operationId."""

        return source.replace("async fetch(", "async fetchApp(")

    def _standardize_app_content_multipart_request_bodies(self, base: Path, sdk_family: str, source: str) -> str:
        """Keep public app SDK multipart methods on operation-specific request DTOs."""

        multipart_schemas = self._multipart_request_schema_names(
            self._sdk_openapi_spec_candidates(base, sdk_family)
        )
        if not multipart_schemas:
            return source

        updated = source
        for schema_name in multipart_schemas:
            pattern = re.compile(r"(\bbody\??\s*:\s*)FormData\b")
            normalized = pattern.sub(rf"\1{schema_name}", updated)
            if normalized != updated:
                updated = normalized
                updated = self._ensure_type_import_name(updated, "../types", schema_name)
        return updated

    def _sdk_openapi_spec_candidates(self, base: Path, sdk_family: str) -> list[Path]:
        spec_name = f"{sdk_family}.sdkgen.json"
        candidates = [
            base.parent / "openapi" / spec_name,
            base / "openapi" / spec_name,
        ]
        return list(dict.fromkeys(candidates))

    def _multipart_request_schema_names(self, spec_paths: Path | list[Path]) -> list[str]:
        names: list[str] = []
        paths_to_scan = spec_paths if isinstance(spec_paths, list) else [spec_paths]
        for spec_path in paths_to_scan:
            spec = self._read_json_or_none(spec_path)
            if not spec:
                continue
            paths = spec.get("paths")
            if not isinstance(paths, dict):
                continue

            for path_item in paths.values():
                if not isinstance(path_item, dict):
                    continue
                for operation in path_item.values():
                    if not isinstance(operation, dict):
                        continue
                    request_body = operation.get("requestBody")
                    if not isinstance(request_body, dict):
                        continue
                    content = request_body.get("content")
                    if not isinstance(content, dict):
                        continue
                    media = content.get("multipart/form-data")
                    if not isinstance(media, dict):
                        continue
                    schema_name = self._schema_component_name(media.get("schema"))
                    if schema_name and schema_name not in names:
                        names.append(schema_name)
        return names

    def _schema_component_name(self, schema: Any) -> str:
        if not isinstance(schema, dict):
            return ""
        raw_ref = schema.get("$ref")
        if isinstance(raw_ref, str) and raw_ref.startswith("#/components/schemas/"):
            return raw_ref.rsplit("/", 1)[-1]
        for key in ("allOf", "oneOf", "anyOf"):
            variants = schema.get(key)
            if not isinstance(variants, list):
                continue
            for variant in variants:
                schema_name = self._schema_component_name(variant)
                if schema_name:
                    return schema_name
        return ""

    def _ensure_type_import_name(self, source: str, import_path: str, type_name: str) -> str:
        import_pattern = re.compile(
            rf"^\s*import\s+type\s+\{{([\s\S]*?)\}}\s+from\s+['\"]{re.escape(import_path)}['\"];\s*$",
            re.M,
        )
        match = import_pattern.search(source)
        if match:
            names = [name.strip() for name in match.group(1).split(",") if name.strip()]
            if type_name in names:
                return source
            replacement = f"import type {{ {', '.join([*names, type_name])} }} from '{import_path}';"
            return source[: match.start()] + replacement + source[match.end() :]

        import_block = re.match(r"((?:import[^\n]*\n)+)", source)
        if import_block:
            insertion = f"import type {{ {type_name} }} from '{import_path}';\n"
            return source[: import_block.end()] + insertion + source[import_block.end() :]
        return f"import type {{ {type_name} }} from '{import_path}';\n{source}"

    def _remove_type_import_names(self, source: str, import_path: str, type_names: list[str]) -> str:
        removals = {name for name in type_names if name}
        if not removals:
            return source

        import_pattern = re.compile(
            rf"^\s*import\s+type\s+\{{([\s\S]*?)\}}\s+from\s+['\"]{re.escape(import_path)}['\"];\s*$",
            re.M,
        )

        def replace_import(match: re.Match[str]) -> str:
            names = [name.strip() for name in match.group(1).split(",") if name.strip()]
            kept = [
                name
                for name in names
                if re.split(r"\s+as\s+", name, maxsplit=1, flags=re.I)[0].strip() not in removals
            ]
            if not kept:
                return ""
            return f"import type {{ {', '.join(kept)} }} from '{import_path}';"

        return import_pattern.sub(replace_import, source)

    def _standardize_publish_core_install_command(self, source: str) -> str:
        """Avoid running dependency prepare scripts during SDK publish build verification."""

        updated = source
        if "function hasTypeScriptSdkDependencies(projectDir)" not in updated:
            marker = "function runTypeScript(ctx) {"
            helper = """function hasTypeScriptSdkDependencies(projectDir) {
  return existsSync(path.join(projectDir, 'node_modules', 'typescript'))
    && existsSync(path.join(projectDir, 'node_modules', 'rollup'))
    && existsSync(path.join(projectDir, 'node_modules', '@sdkwork', 'sdk-common'));
}

"""
            updated = updated.replace(marker, helper + marker, 1)

        canonical_run_typescript = """function runTypeScript(ctx) {
  const packageFile = path.join(ctx.projectDir, 'package.json');
  ensureFile(packageFile, 'package.json');
  const packageJson = loadJson(packageFile);
  const hasBuildScript = Boolean(packageJson?.scripts?.build);

  if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {
    run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });
  } else {
    log('TypeScript dependencies already installed, skipping npm install.');
  }
  if (hasBuildScript) {
    run('npm', ['run', 'build'], { cwd: ctx.projectDir });
  } else {
    log('No build script found in package.json, skipping build.');
  }

  if (ctx.action === 'check') {
    run('npm', ['pack', '--dry-run'], { cwd: ctx.projectDir });
    return;
  }

  if (ctx.action === 'build') {
    return;
  }

  const registry = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org/';
  const args = ['publish', '--access', 'public', '--registry', registry];
  if (ctx.channel === 'test') {
    args.push('--tag', 'next');
  }
  if (ctx.dryRun) {
    args.push('--dry-run');
  }
  run('npm', args, { cwd: ctx.projectDir });
}"""

        return self._replace_javascript_function(updated, "runTypeScript", canonical_run_typescript)

    def _replace_javascript_function(self, source: str, function_name: str, replacement: str) -> str:
        marker = f"function {function_name}("
        start = source.find(marker)
        if start < 0:
            return source
        open_brace = source.find("{", start)
        if open_brace < 0:
            return source

        depth = 0
        for index in range(open_brace, len(source)):
            character = source[index]
            if character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    return source[:start] + replacement + source[index + 1 :]
        return source

    def _remove_trailing_whitespace(self, base: Path, sdk_family: str) -> list[Path]:
        updated: list[Path] = []
        candidates = [base / "vite.config.ts", *sorted((base / "src").rglob("*.ts"))]
        family = self.root / "sdks" / sdk_family
        for language in OFFICIAL_SDK_LANGUAGES:
            if language == "typescript":
                continue
            generated_root = family / f"{sdk_family}-{language}" / "generated" / "server-openapi"
            if not generated_root.is_dir():
                continue
            candidates.extend(
                source_path
                for source_path in sorted(generated_root.rglob("*"))
                if source_path.is_file() and self._is_generated_text_file(source_path)
            )
        for source_path in candidates:
            if not source_path.is_file():
                continue
            try:
                source = source_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            normalized = re.sub(r"[ \t]+(?=\r?\n)", "", source)
            if normalized != source:
                source_path.write_text(normalized, encoding="utf-8", newline="\n")
                updated.append(source_path)
        return updated

    def _is_generated_text_file(self, source_path: Path) -> bool:
        return source_path.name in GENERATED_TEXT_FILE_NAMES or source_path.suffix in GENERATED_TEXT_FILE_EXTENSIONS

    def _remove_unexported_api_artifacts(self, base: Path) -> list[Path]:
        api_dir = base / "src" / "api"
        index_path = api_dir / "index.ts"
        if not index_path.is_file():
            return []

        index_source = index_path.read_text(encoding="utf-8")
        exported_stems = set(re.findall(r"from\s+['\"]\./([^'\"]+)['\"]", index_source))
        allowed_stems = {"base", "index", "paths", *exported_stems}
        updated: list[Path] = []

        for source_path in sorted(api_dir.glob("*.ts")):
            stem = source_path.stem
            if stem in allowed_stems:
                continue
            source_path.unlink()
            updated.append(source_path)
            for stale_path in (
                base / "dist" / "api" / f"{stem}.js",
                base / "dist" / "api" / f"{stem}.cjs",
                base / "dist" / "api" / f"{stem}.d.ts",
                base / "dist" / "api" / f"{stem}.d.ts.map",
            ):
                if stale_path.exists():
                    stale_path.unlink()
                    updated.append(stale_path)

        return updated

    def _read_json(self, path: Path) -> dict[str, Any]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except OSError as exc:
            raise RuntimeError(f"cannot read SDK package file {path}: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"invalid SDK package JSON {path}: {exc}") from exc
        if not isinstance(payload, dict):
            raise RuntimeError(f"SDK package JSON must contain an object: {path}")
        return payload

    def _read_json_or_none(self, path: Path) -> dict[str, Any] | None:
        try:
            return self._read_json(path)
        except RuntimeError:
            return None

    def _read_mapping_or_none(self, path: Path) -> dict[str, Any] | None:
        payload = self._read_json_or_none(path)
        if payload is not None:
            return payload

        if yaml is None:
            return None

        try:
            loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
        except (OSError, yaml.YAMLError):
            return None

        return loaded if isinstance(loaded, dict) else None

    def _write_json(self, path: Path, payload: dict[str, Any]) -> None:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply sdkwork-clawrouter generated SDK runtime build standard.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument(
        "--sdk-dir",
        action="append",
        choices=SDK_DIRECTORIES,
        help="Limit standardization to one generated SDK directory. Can be repeated.",
    )
    parser.add_argument(
        "--api-spec-path",
        type=Path,
        default=None,
        help="OpenAPI source path to snapshot into the SDK family root when one SDK is selected.",
    )
    parser.add_argument(
        "--openapi-only",
        action="store_true",
        help="Only synchronize SDK family OpenAPI snapshots; does not require materialized SDK workspaces.",
    )
    args = parser.parse_args()

    standardizer = SdkRuntimeStandardizer(
        root=args.root,
        sdk_directories=tuple(args.sdk_dir) if args.sdk_dir else None,
        api_spec_path=args.api_spec_path,
    )
    updated = standardizer.sync_openapi_snapshots() if args.openapi_only else standardizer.run()
    for path in updated:
        print(path.relative_to(Path(args.root).resolve()).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
