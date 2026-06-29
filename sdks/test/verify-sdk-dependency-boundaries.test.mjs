import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdksRoot = path.resolve(testDir, '..');
const appRoot = path.resolve(sdksRoot, '..');
const appsRoot = path.resolve(appRoot, '..');
const appbaseRoot = path.join(appsRoot, 'sdkwork-appbase');

const dependencyContracts = [
  {
    label: 'clawrouter app SDK',
    sdkFamily: 'clawrouter-app-sdk',
    prefix: '/app/v3/api',
    dependencyWorkspace: 'sdkwork-iam-app-sdk',
    role: 'appbase-app-capability',
    appbaseAuthority: path.join(
      appbaseRoot,
      'sdks',
      'sdkwork-iam-app-sdk',
      'openapi',
      'sdkwork-iam-app-api.openapi.yaml',
    ),
  },
  {
    label: 'clawrouter backend SDK',
    sdkFamily: 'clawrouter-backend-sdk',
    prefix: '/backend/v3/api',
    dependencyWorkspace: 'sdkwork-iam-backend-sdk',
    role: 'appbase-backend-management-capability',
    appbaseAuthority: path.join(
      appbaseRoot,
      'sdks',
      'sdkwork-iam-backend-sdk',
      'openapi',
      'sdkwork-iam-backend-api.openapi.yaml',
    ),
  },
];

const textExtensions = new Set([
  '.cs',
  '.dart',
  '.go',
  '.java',
  '.js',
  '.json',
  '.kt',
  '.kts',
  '.md',
  '.py',
  '.rs',
  '.swift',
  '.ts',
  '.toml',
  '.xml',
  '.yaml',
  '.yml',
]);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function operationKeys(document, prefix) {
  const keys = new Set();
  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathKey.startsWith(`${prefix}/`)) {
      continue;
    }
    const route = pathKey.slice(prefix.length + 1).replace(/\{[^}]+\}/g, '{}');
    for (const method of Object.keys(pathItem ?? {})) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) {
        continue;
      }
      keys.add(`${method.toUpperCase()} ${route}`);
    }
  }
  return keys;
}

function routeKeys(document, prefix) {
  const routes = new Set();
  for (const pathKey of Object.keys(document.paths ?? {})) {
    if (pathKey.startsWith(`${prefix}/`)) {
      routes.add(pathKey.slice(prefix.length + 1).replace(/\{[^}]+\}/g, '{}'));
    }
  }
  return routes;
}

function assertNoOperationOverlap(contract, localDocument, appbaseDocument) {
  const localKeys = operationKeys(localDocument, contract.prefix);
  const dependencyKeys = operationKeys(appbaseDocument, contract.prefix);
  const overlaps = [...localKeys].filter((key) => dependencyKeys.has(key)).sort();
  assert.deepEqual(
    overlaps,
    [],
    `${contract.label} authority must not regenerate ${contract.dependencyWorkspace} routes.`,
  );
}

function assertNoDependencyDomainOperations(contract, localDocument) {
  if (!contract.dependencyDomain) {
    return;
  }

  const violations = [];
  for (const [pathKey, pathItem] of Object.entries(localDocument.paths ?? {})) {
    if (!pathKey.startsWith(`${contract.prefix}/`)) {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) {
        continue;
      }
      const domain = operation?.['x-sdkwork-domain'] ?? operation?.['x-sdk-domain'];
      if (domain === contract.dependencyDomain) {
        violations.push(`${method.toUpperCase()} ${pathKey} ${operation?.operationId ?? ''}`.trim());
      }
    }
  }

  assert.deepEqual(
    violations.sort(),
    [],
    `${contract.label} authority must not retain ${contract.dependencyDomain} domain operations owned by ${contract.dependencyWorkspace}.`,
  );
}

function generatedRoutePattern(route) {
  const escaped = route
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replaceAll('\\{\\}', '[^/`\'"\\s)}]+');
  return new RegExp(`(?<![A-Za-z0-9_/-])/${escaped}(?:[?'\`")]|$)`, 'u');
}

function fullyRemovedDependencyRoutePatterns(contract, localDocument, appbaseDocument) {
  const localRoutes = routeKeys(localDocument, contract.prefix);
  return [...routeKeys(appbaseDocument, contract.prefix)]
    .filter((route) => !localRoutes.has(route))
    .map((route) => ({ route, pattern: generatedRoutePattern(route) }));
}

function collectTextFiles(rootPath) {
  if (!existsSync(rootPath)) {
    return [];
  }
  const stats = statSync(rootPath);
  if (stats.isFile()) {
    return textExtensions.has(path.extname(rootPath)) ? [rootPath] : [];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  const files = [];
  const visit = (targetPath) => {
    const targetStats = statSync(targetPath);
    if (targetStats.isDirectory()) {
      for (const entry of readdirSync(targetPath)) {
        if (['node_modules', 'dist', '.sdkwork', 'build', '.dart_tool'].includes(entry)) {
          continue;
        }
        visit(path.join(targetPath, entry));
      }
      return;
    }
    if (targetStats.isFile() && textExtensions.has(path.extname(targetPath))) {
      files.push(targetPath);
    }
  };
  visit(rootPath);
  return files.sort();
}

function assertGeneratedOutputHasNoDependencySurface(contract, localDocument, appbaseDocument) {
  const familyRoot = path.join(sdksRoot, contract.sdkFamily);
  const forbiddenRoutes = fullyRemovedDependencyRoutePatterns(contract, localDocument, appbaseDocument);
  const violations = [];
  for (const languageRoot of readdirSync(familyRoot, { withFileTypes: true })) {
    if (!languageRoot.isDirectory() || !languageRoot.name.startsWith(`${contract.sdkFamily}-`)) {
      continue;
    }
    const generatedRoot = path.join(familyRoot, languageRoot.name, 'generated', 'server-openapi');
    for (const filePath of collectTextFiles(generatedRoot)) {
      const source = readFileSync(filePath, 'utf8');
      for (const { route, pattern } of forbiddenRoutes) {
        const match = pattern.exec(source);
        if (match) {
          violations.push(`${path.relative(familyRoot, filePath).replaceAll('\\', '/')}: ${route}`);
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `${contract.label} generated output must not retain fully removed appbase-owned transport routes.`,
  );
}

function assertDependencyMetadata(contract) {
  const familyRoot = path.join(sdksRoot, contract.sdkFamily);
  const assembly = readJson(path.join(familyRoot, '.sdkwork-assembly.json'));
  const componentSpec = readJson(path.join(familyRoot, 'specs', 'component.spec.json'));
  const readme = readFileSync(path.join(familyRoot, 'README.md'), 'utf8');
  const assemblyDependency = (assembly.sdkDependencies ?? []).find(
    (dependency) => dependency.workspace === contract.dependencyWorkspace,
  );
  const componentDependency = (componentSpec.contracts?.sdkDependencies ?? []).find(
    (dependency) => dependency.workspace === contract.dependencyWorkspace,
  );

  assert.ok(assemblyDependency, `${contract.label} assembly must declare ${contract.dependencyWorkspace}.`);
  assert.deepEqual(
    componentDependency,
    assemblyDependency,
    `${contract.label} component spec dependency must match assembly dependency.`,
  );
  assert.equal(assemblyDependency.role, contract.role);
  assert.equal(assemblyDependency.required, true);
  assert.equal(assemblyDependency.dependencyMode, 'consumer-sdk');
  assert.equal(assemblyDependency.generatedTransportImportPolicy, 'forbidden');
  assert.equal(assemblyDependency.apiPrefix, contract.prefix);

  for (const marker of [
    contract.dependencyWorkspace,
    contract.role,
    'consumer-sdk',
    'generatedTransportImportPolicy',
    'forbidden',
    ...Object.values(assemblyDependency.packageByLanguage ?? {}),
  ]) {
    assert.ok(readme.includes(marker), `${contract.label} README must mention dependency marker ${marker}.`);
  }
}

for (const contract of dependencyContracts) {
  const familyRoot = path.join(sdksRoot, contract.sdkFamily);
  const authority = readJson(path.join(familyRoot, 'openapi', `${contract.sdkFamily}.openapi.json`));
  const sdkgen = readJson(path.join(familyRoot, 'openapi', `${contract.sdkFamily}.sdkgen.json`));
  const appbaseAuthority = readJson(contract.appbaseAuthority);

  assertNoOperationOverlap(contract, authority, appbaseAuthority);
  assertNoOperationOverlap(contract, sdkgen, appbaseAuthority);
  assertNoDependencyDomainOperations(contract, authority);
  assertNoDependencyDomainOperations(contract, sdkgen);
  assertDependencyMetadata(contract);
  assertGeneratedOutputHasNoDependencySurface(contract, authority, appbaseAuthority);
}

console.log('claw-router SDK dependency boundary contract passed');
