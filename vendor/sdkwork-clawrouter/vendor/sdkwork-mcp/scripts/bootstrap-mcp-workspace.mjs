#!/usr/bin/env node
/**
 * One-time workspace bootstrap for sdkwork-mcp.
 * Legacy sibling repositories (sdkwork-skills, sdkwork-agents) are migration SOURCES only;
 * all materialized app packages must use application code `mcp` per NAMING_SPEC.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specsRoot = path.resolve(repoRoot, '../sdkwork-specs');
const legacySkillsSourceRoot = path.resolve(repoRoot, '../sdkwork-skills');
const legacyAgentsSourceRoot = path.resolve(repoRoot, '../sdkwork-agents');

function ensureDir(relativePath) {
  fs.mkdirSync(path.join(repoRoot, relativePath), { recursive: true });
}

function writeIfMissing(relativePath, content) {
  const absolute = path.join(repoRoot, relativePath);
  if (fs.existsSync(absolute)) {
    return false;
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return true;
}

function write(relativePath, content) {
  const absolute = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function copyDirIfMissing(source, destination) {
  const destAbs = path.join(repoRoot, destination);
  if (fs.existsSync(destAbs)) {
    return;
  }
  fs.cpSync(source, destAbs, { recursive: true });
}

function replaceInTree(rootDir, replacements) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      replaceInTree(absolutePath, replacements);
      continue;
    }
    if (!/\.(json|yaml|yml|md|mjs|ts|tsx|env|sql)$/i.test(entry.name)) {
      continue;
    }
    let content = fs.readFileSync(absolutePath, 'utf8');
    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }
    fs.writeFileSync(absolutePath, content, 'utf8');
  }
}

const requiredDirs = [
  'apis/README.md',
  'apps/README.md',
  'crates/README.md',
  'sdks/README.md',
  'jobs/README.md',
  'tools/README.md',
  'plugins/README.md',
  'examples/README.md',
  'configs/README.md',
  'deployments/README.md',
  'scripts/README.md',
  'tests/README.md',
  'tests/contract',
  'tests/static',
  'specs/README.md',
  '.sdkwork/README.md',
  '.sdkwork/skills/README.md',
  '.sdkwork/plugins/README.md',
  'configs/topology',
  'deployments/docker',
];

for (const dir of requiredDirs) {
  const absolute = path.join(repoRoot, dir);
  if (dir.endsWith('.md')) {
    writeIfMissing(dir, `# ${path.basename(path.dirname(dir)) || path.basename(dir, '.md')}\n\nSDKWork MCP workspace ${dir}.\n`);
  } else {
    ensureDir(dir);
    const readme = path.join(absolute, 'README.md');
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(readme, `# ${path.basename(dir)}\n\nSDKWork MCP ${dir}.\n`);
    }
  }
}

// Database framework template (preserve existing baseline)
const dbTemplate = path.join(specsRoot, 'templates/database');
const dbDest = path.join(repoRoot, 'database');
for (const entry of fs.readdirSync(dbTemplate, { withFileTypes: true })) {
  const name = entry.name;
  if (name === 'ddl' && fs.existsSync(path.join(dbDest, 'ddl/baseline/postgres/0001_mcp_baseline.sql'))) {
    const templateDdl = path.join(dbTemplate, 'ddl');
    for (const sub of fs.readdirSync(templateDdl, { withFileTypes: true })) {
      const subDest = path.join(dbDest, 'ddl', sub.name);
      if (!fs.existsSync(subDest)) {
        fs.cpSync(path.join(templateDdl, sub.name), subDest, { recursive: true });
      }
    }
    continue;
  }
  const destPath = path.join(dbDest, name);
  if (!fs.existsSync(destPath)) {
    fs.cpSync(path.join(dbTemplate, name), destPath, { recursive: true });
  }
}

replaceInTree(dbDest, [
  ['<module-id>', 'mcp'],
  ['<SERVICE>', 'MCP'],
  ['<Display Name>', 'SDKWork MCP Database'],
  ['<owner-team>', 'mcp-platform'],
  ['<prefix>_', 'ai_mcp_'],
  ['<prefix>', 'ai_mcp'],
]);

const manifestPath = path.join(dbDest, 'database.manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.moduleId = 'mcp';
  manifest.serviceCode = 'MCP';
  manifest.displayName = 'SDKWork MCP Database';
  manifest.owner = 'mcp-platform';
  manifest.tablePrefix = 'ai_mcp_';
  manifest.engines = ['postgres'];
  manifest.defaultEngine = 'postgres';
  manifest.contractVersion = '1.0.0';
  manifest.baselineStrategy = 'baseline-plus-migrations';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

writeIfMissing(
  'database/seeds/common/001_bootstrap.sql',
  `-- MCP bootstrap seed\nSELECT 1;\n`,
);

// Docs bootstrap
try {
  execSync(`node "${path.join(specsRoot, 'tools/bootstrap-repository-docs.mjs')}" --root "${repoRoot}" --application-code mcp --owner mcp-platform`, {
    stdio: 'inherit',
  });
} catch {
  console.warn('docs bootstrap reported issues; continuing');
}

writeIfMissing(
  'AGENTS.md',
  `# Repository Guidelines

## SDKWORK Soul

Read \`../sdkwork-specs/SOUL.md\` before executing tasks in this root.

## SDKWORK Standards

- \`../sdkwork-specs/README.md\`
- \`../sdkwork-specs/WEB_FRAMEWORK_SPEC.md\`
- \`../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md\`
- \`../sdkwork-specs/DRIVE_SPEC.md\` — all file uploads via sdkwork-drive

## Application Identity

Read \`sdkwork.app.config.json\` for MCP application behavior, runtime config, SDK wiring, release, and deployment.

## Local Dictionary

- \`AGENTS.md\`, \`sdkwork.app.config.json\`, \`specs/\`, \`apis/\`, \`apps/\`, \`crates/\`, \`sdks/\`, \`database/\`, \`deployments/\`, \`configs/\`, \`scripts/\`, \`tools/\`, \`docs/\`, \`tests/\`, \`.sdkwork/\`

## Required Specs

- Code: \`CODE_STYLE_SPEC.md\`, \`NAMING_SPEC.md\`, \`RUST_CODE_SPEC.md\` / \`TYPESCRIPT_CODE_SPEC.md\` / \`FRONTEND_CODE_SPEC.md\`
- API: \`API_SPEC.md\`, \`WEB_FRAMEWORK_SPEC.md\`, \`WEB_BACKEND_SPEC.md\`
- Database: \`DATABASE_SPEC.md\`, \`DATABASE_FRAMEWORK_SPEC.md\`
- Clients: \`APP_PC_ARCHITECTURE_SPEC.md\`, \`APP_H5_ARCHITECTURE_SPEC.md\`, \`FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md\`

## Build & Verify

\`\`\`powershell
pnpm verify
cargo test --workspace
\`\`\`

Use \`sdkwork-utils-rust\` and \`@sdkwork/utils\` for shared helpers. No \`sdkwork-discovery\` until RPC services exist.
`,
);

for (const shim of ['CLAUDE.md', 'GEMINI.md', 'CODEX.md']) {
  writeIfMissing(shim, `# ${shim.replace('.md', '')} Compatibility Shim\n\nRead \`AGENTS.md\` in this repository.\n`);
}

writeIfMissing(
  'README.md',
  `# SDKWork MCP

Model Context Protocol (MCP) connector registry, server management, tools/resources/prompts catalog, and multi-client surfaces (PC, H5, Flutter).

## Verify

\`\`\`powershell
pnpm verify
\`\`\`

## Docs

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
`,
);

writeIfMissing(
  'sdkwork.app.config.json',
  JSON.stringify(
    {
      schemaVersion: 3,
      kind: 'sdkwork.app',
      app: {
        key: 'sdkwork-mcp',
        name: 'SDKWork MCP',
        displayName: 'SDKWork MCP',
        description: 'MCP server registry, connectors, tools, resources, and prompts for SDKWork intelligence platform.',
        vendor: 'SDKWork',
        officialWebsiteUrl: 'https://sdkwork.com/apps/sdkwork-mcp',
        appType: 'APP_HTML',
        identifiers: {
          desktopAppId: 'com.sdkwork.mcp.desktop',
          containerImage: 'registry.sdkwork.com/apps/sdkwork-mcp',
        },
      },
      backend: {
        profileKey: 'backend-root-admin',
        platform: 'WEB',
        appId: 'sdkwork-mcp',
        tenantId: '100001',
        organizationId: '0',
      },
      runtime: {
        family: 'web',
        framework: 'web',
        runtimes: ['WEB', 'BROWSER', 'MOBILE'],
        defaultPlatform: 'WEB',
        supportedDeploymentProfiles: ['standalone', 'cloud'],
        defaultDeploymentProfile: 'standalone',
      },
      metadata: {
        domain: 'intelligence',
        capability: 'mcp',
        component: 'sdkwork-mcp',
      },
    },
    null,
    2,
  ) + '\n',
);

writeIfMissing(
  'specs/component.spec.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'sdkwork.component.spec',
      component: {
        name: 'sdkwork-mcp',
        displayName: 'SDKWork MCP',
        version: '0.1.0',
        type: 'application-root',
        root: 'sdkwork-mcp',
        domain: 'intelligence',
        capability: 'mcp',
        languages: ['rust', 'typescript', 'dart'],
        manifests: ['sdkwork.app.config.json', 'package.json', 'Cargo.toml'],
      },
      contracts: {
        runtimeEntrypoints: ['crates/sdkwork-mcp-api-server'],
        configKeys: ['MCP_DATABASE_URL', 'SDKWORK_MCP_DRIVE_URL', 'SDKWORK_MCP_ATTACHMENT_DRIVE_SPACE'],
      },
    },
    null,
    2,
  ) + '\n',
);

writeIfMissing(
  'specs/mcp-database.schema.yaml',
  `schemaVersion: 1
moduleId: mcp
tablePrefix: ai_mcp_
tables:
  - ai_mcp_server
  - ai_mcp_connector
  - ai_mcp_tool
  - ai_mcp_resource
  - ai_mcp_prompt
  - ai_mcp_invocation_log
`,
);

const DATABASE_CLI =
  'cargo run --manifest-path ../sdkwork-database/Cargo.toml -p sdkwork-database-cli -- --app-root .';

writeIfMissing(
  'package.json',
  JSON.stringify(
    {
      name: 'sdkwork-mcp-workspace',
      private: true,
      license: 'SEE LICENSE IN LICENSE',
      type: 'module',
      packageManager: 'pnpm@10.33.0',
      dependencies: {
        '@sdkwork/app-topology': 'file:../sdkwork-app-topology',
        '@sdkwork/utils': 'file:../sdkwork-utils/packages/sdkwork-utils-typescript',
      },
      scripts: {
        dev: 'pnpm --dir apps/sdkwork-mcp-pc dev',
        build: 'cargo build --workspace --release && pnpm --dir apps/sdkwork-mcp-pc build',
        test: 'cargo test --workspace && node --test tests/static/*.test.mjs tests/contract/*.test.mjs',
        check:
          'pnpm check:architecture-alignment && pnpm check:pnpm-script-standard && pnpm check:agent-workflow-standard && pnpm db:validate && pnpm topology:validate',
        verify: 'pnpm check && pnpm test',
        clean: 'cargo clean',
        typecheck: 'pnpm --dir apps/sdkwork-mcp-pc typecheck',
        lint: 'pnpm typecheck',
        'check:architecture-alignment': 'node tools/check_sdkwork_mcp_architecture_alignment.mjs',
        'check:pnpm-script-standard':
          'node ../sdkwork-specs/tools/check-pnpm-script-standard.mjs --root . --product-prefix mcp',
        'check:agent-workflow-standard':
          'node ../sdkwork-specs/tools/check-agent-workflow-standard.mjs --root .',
        'api:materialize': 'node tools/mcp_openapi_materialize.mjs',
        'api:check': 'node tools/mcp_openapi_materialize.mjs --check',
        'db:validate': 'node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .',
        'db:materialize:contract':
          'node ../sdkwork-specs/tools/materialize-database-contract-from-baseline.mjs --root . --baseline database/ddl/baseline/postgres/0001_mcp_baseline.sql --module-id mcp --owner mcp-platform --prefixes ai_mcp_ --engines postgres',
        'db:plan': `${DATABASE_CLI} plan`,
        'db:init': `${DATABASE_CLI} init`,
        'db:migrate': `${DATABASE_CLI} migrate`,
        'db:seed': `${DATABASE_CLI} seed`,
        'db:status': `${DATABASE_CLI} status`,
        'db:drift': `${DATABASE_CLI} drift`,
        'db:drift:check': `${DATABASE_CLI} drift-check`,
        'db:bootstrap': `${DATABASE_CLI} bootstrap`,
        'test:contract:database':
          'node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .',
        'topology:validate':
          'node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json',
        'topology:plan':
          'node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs plan --root . --spec specs/topology.spec.json',
        'gateway:package:cloud':
          'node ../sdkwork-app-topology/scripts/gateway-cloud-bundle.mjs bundle --root .',
        'gateway:validate:cloud':
          'node ../sdkwork-app-topology/scripts/gateway-cloud-bundle.mjs validate --root .',
        'gateway:assembly:materialize': 'node scripts/gateway/assembly-materialize.mjs',
        'gateway:assembly:validate': 'node scripts/gateway/assembly-validate.mjs',
        'start:pc': 'pnpm --dir apps/sdkwork-mcp-pc dev',
        'start:h5': 'pnpm --dir apps/sdkwork-mcp-h5 dev',
        'start:flutter': 'cd apps/sdkwork-mcp-flutter-mobile && flutter run',
        'workflow:build-client-surfaces':
          'pnpm --dir apps/sdkwork-mcp-pc build && pnpm --dir apps/sdkwork-mcp-h5 build',
      },
    },
    null,
    2,
  ) + '\n',
);

// Topology from skills template
if (fs.existsSync(path.join(legacySkillsSourceRoot, 'specs/topology.spec.json'))) {
  const topology = fs.readFileSync(path.join(legacySkillsSourceRoot, 'specs/topology.spec.json'), 'utf8');
  writeIfMissing(
    'specs/topology.spec.json',
    topology
      .replaceAll('sdkwork-skills', 'sdkwork-mcp')
      .replaceAll('SDKWORK_SKILLS', 'SDKWORK_MCP')
      .replaceAll('skills', 'mcp')
      .replaceAll('SKILLS', 'MCP')
      .replaceAll('18090', '18110')
      .replaceAll('18091', '18111'),
  );
}

// Topology profile env files
for (const profile of [
  'standalone.unified-process.development',
  'standalone.unified-process.production',
  'standalone.split-services.development',
  'cloud.split-services.development',
  'cloud.split-services.production',
]) {
  const src = path.join(legacySkillsSourceRoot, `configs/topology/${profile}.env`);
  if (fs.existsSync(src)) {
    writeIfMissing(
      `configs/topology/${profile}.env`,
      fs
        .readFileSync(src, 'utf8')
        .replaceAll('SDKWORK_SKILLS', 'SDKWORK_MCP')
        .replaceAll('sdkwork-skills', 'sdkwork-mcp')
        .replaceAll('18090', '18110')
        .replaceAll('18091', '18111'),
    );
  }
}

writeIfMissing(
  '.env.example',
  `# SDKWork MCP environment\nMCP_DATABASE_URL=postgres://sdkwork:sdkwork@127.0.0.1:5432/sdkwork_mcp\nSDKWORK_MCP_APP_BIND=127.0.0.1:18110\nSDKWORK_MCP_BACKEND_BIND=127.0.0.1:18111\nSDKWORK_MCP_DRIVE_URL=\nSDKWORK_MCP_WEB_FRAMEWORK=1\n`,
);

writeIfMissing(
  'pnpm-workspace.yaml',
  `packages:
  - apps/sdkwork-mcp-pc
  - apps/sdkwork-mcp-pc/packages/*
  - apps/sdkwork-mcp-h5
  - apps/sdkwork-mcp-h5/packages/*
  - ../sdkwork-utils/packages/sdkwork-utils-typescript
  - ../sdkwork-sdk-commons/sdkwork-sdk-common-typescript
  - ../sdkwork-core/sdkwork-core-pc-react
  - ../sdkwork-ui/sdkwork-ui-pc-react
  - ../sdkwork-appbase/packages/pc-react/foundation/sdkwork-appbase-pc-react
  - ../sdkwork-appbase/packages/pc-react/foundation/sdkwork-i18n-pc-react
  - ../sdkwork-appbase/packages/common/foundation/sdkwork-runtime-bootstrap
  - ../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react
  - ../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-runtime-pc-react
  - ../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-contracts
  - ../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-runtime
  - ../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi
  - ../sdkwork-drive/sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/generated/server-openapi

catalog:
  react: "^19.1.0"
  react-dom: "^19.1.0"
  typescript: "^5.9.0"
  vite: "^6.3.0"
  "@vitejs/plugin-react": "^5.0.4"
  "@types/react": "^19.1.0"
  "@types/react-dom": "^19.1.0"
`,
);

// Contract tests
copyDirIfMissing(
  path.join(specsRoot, 'templates/tests/database-framework.contract.test.mjs'),
  'tests/contract/database-framework.contract.test.mjs',
);
if (!fs.existsSync(path.join(repoRoot, 'tests/contract/database-framework.contract.test.mjs'))) {
  fs.cpSync(
    path.join(specsRoot, 'templates/tests/database-framework.contract.test.mjs'),
    path.join(repoRoot, 'tests/contract/database-framework.contract.test.mjs'),
  );
}

writeIfMissing(
  'tests/static/mcp-contract-boundary.test.mjs',
  `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('mcp contract crate exists', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'crates/sdkwork-mcp-contract/Cargo.toml')));
});

test('no sdkwork-discovery dependency', () => {
  const cargo = fs.readFileSync(path.join(repoRoot, 'Cargo.toml'), 'utf8');
  assert.equal(cargo.includes('sdkwork-discovery'), false);
});
`,
);

// Gateway scripts from skills
for (const script of ['assembly-materialize.mjs', 'assembly-validate.mjs']) {
  const src = path.join(legacySkillsSourceRoot, `scripts/gateway/${script}`);
  if (fs.existsSync(src)) {
    writeIfMissing(
      `scripts/gateway/${script}`,
      fs.readFileSync(src, 'utf8').replaceAll('skills', 'mcp').replaceAll('SKILLS', 'MCP'),
    );
  }
}

writeIfMissing(
  'tools/mcp_openapi_materialize.mjs',
  `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const manifestDir = path.join(repoRoot, 'apis/app-api/mcp');
if (!check) fs.mkdirSync(manifestDir, { recursive: true });
const marker = path.join(manifestDir, 'README.md');
if (!fs.existsSync(marker) && !check) {
  fs.writeFileSync(marker, '# MCP App API\\n\\nOpenAPI materialization placeholder; route manifests live in route crates.\\n');
}
console.log('mcp openapi materialize ok');
`,
);

writeIfMissing(
  'deployments/docker/Dockerfile',
  `FROM rust:1-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo build --release -p sdkwork-mcp-api-server

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/sdkwork-mcp-app-api /usr/local/bin/
EXPOSE 18110
CMD ["sdkwork-mcp-app-api"]
`,
);

// GitHub workflow thin entry
ensureDir('.github/workflows');
writeIfMissing(
  '.github/workflows/package.yml',
  `name: Package
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  package:
    uses: sdkwork/sdkwork-github-workflow/.github/workflows/reusable-package.yml@main
    secrets: inherit
`,
);

writeIfMissing(
  'sdkwork.workflow.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'sdkwork.workflow',
      applicationCode: 'mcp',
      repository: 'sdkwork-mcp',
      packageWorkflow: '.github/workflows/package.yml',
    },
    null,
    2,
  ) + '\n',
);

// Materialize minimal PC app from skills PC (structure only)
const pcSrc = path.join(legacySkillsSourceRoot, 'apps/sdkwork-skills-pc');
const pcDest = path.join(repoRoot, 'apps/sdkwork-mcp-pc-scratch');
if (fs.existsSync(pcSrc) && !fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-pc/package.json'))) {
  fs.cpSync(pcSrc, pcDest, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('dist'),
  });
  replaceInTree(pcDest, [
    ['sdkwork-skills', 'sdkwork-mcp'],
    ['sdkwork_skills', 'sdkwork_mcp'],
    ['@sdkwork/skills', '@sdkwork/mcp'],
    ['skills-pc', 'mcp-pc'],
    ['Skills', 'MCP'],
    ['skills', 'mcp'],
    ['SKILLS', 'MCP'],
  ]);
  fs.renameSync(pcDest, path.join(repoRoot, 'apps/sdkwork-mcp-pc'));
}

// Materialize H5 from agents
const h5Src = path.join(legacyAgentsSourceRoot, 'apps/sdkwork-agents-h5');
const h5Scratch = path.join(repoRoot, 'apps/sdkwork-mcp-h5-scratch');
if (fs.existsSync(h5Src) && !fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-h5/package.json'))) {
  fs.cpSync(h5Src, h5Scratch, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('dist'),
  });
  replaceInTree(h5Scratch, [
    ['sdkwork-agents', 'sdkwork-mcp'],
    ['sdkwork_agents', 'sdkwork_mcp'],
    ['@sdkwork/agents', '@sdkwork/mcp'],
    ['agents-h5', 'mcp-h5'],
    ['sdkwork-mcp-h5-agents', 'sdkwork-mcp-h5-mcp'],
    ['agentsAppSdkClient', 'mcpAppSdkClient'],
    ['Agents', 'MCP'],
    ['agents', 'mcp'],
    ['AGENTS', 'MCP'],
  ]);
  fs.renameSync(h5Scratch, path.join(repoRoot, 'apps/sdkwork-mcp-h5'));
}

// Materialize Flutter from agents
const flutterSrc = path.join(legacyAgentsSourceRoot, 'apps/sdkwork-agents-flutter-mobile');
const flutterScratch = path.join(repoRoot, 'apps/sdkwork-mcp-flutter-scratch');
if (
  fs.existsSync(flutterSrc) &&
  !fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-flutter-mobile/pubspec.yaml'))
) {
  fs.cpSync(flutterSrc, flutterScratch, {
    recursive: true,
    filter: (src) => !src.includes('.dart_tool') && !src.includes('build'),
  });
  replaceInTree(flutterScratch, [
    ['sdkwork-agents', 'sdkwork-mcp'],
    ['sdkwork_agents', 'sdkwork_mcp'],
    ['agents-flutter', 'mcp-flutter'],
    ['Agents', 'MCP'],
    ['agents', 'mcp'],
  ]);
  fs.renameSync(flutterScratch, path.join(repoRoot, 'apps/sdkwork-mcp-flutter-mobile'));
}

console.log('sdkwork-mcp workspace bootstrap complete');
