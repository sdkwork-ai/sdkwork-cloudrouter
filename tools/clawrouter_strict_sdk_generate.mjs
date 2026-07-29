#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sdkGeneratorRoot = path.resolve(projectRoot, '../sdkwork-sdk-generator/tmp-js');

const { generateSdk } = await import(pathToFileURL(path.join(sdkGeneratorRoot, 'index.js')).href);
const { loadOpenApiSpec } = await import(pathToFileURL(path.join(sdkGeneratorRoot, 'framework', 'spec-loader.js')).href);
const { syncGeneratedOutput } = await import(pathToFileURL(path.join(sdkGeneratorRoot, 'framework', 'output-sync.js')).href);
const { resolveSdkVersion } = await import(pathToFileURL(path.join(sdkGeneratorRoot, 'framework', 'versioning.js')).href);
const { persistGenerateExecutionReport } = await import(pathToFileURL(path.join(sdkGeneratorRoot, 'execution-report.js')).href);

const SDK_COMMON_VERSION = 'workspace:*';
const SDK_TYPES_NODE_VERSION = '20.19.39';
const SDK_TYPESCRIPT_VERSION = '5.8.3';
const SDK_ROLLUP_VERSION = '4.60.1';
const BUILD_RUNTIME_SCRIPT = `#!/usr/bin/env node
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
    throw new Error(\`tsconfig.json not found under \${projectDir}\`);
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
  const runtimeLines = source.split(/\\r?\\n/u).map((line) => {
    if (line.trim() === "export * from './types';") {
      return "export { DEFAULT_TIMEOUT, SUCCESS_CODES } from '@sdkwork/sdk-common';";
    }
    return line;
  });
  await fs.writeFile(entryFile, runtimeLines.join('\\n'), 'utf-8');
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
      for (const candidate of [base, \`\${base}.js\`, path.join(base, 'index.js')]) {
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
    getNewLine: () => '\\n',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
`;

async function main(argv) {
  const command = argv[2] || 'generate';
  if (command !== 'generate') {
    throw new Error(`Unsupported command: ${command}`);
  }

  const options = parseGenerateArgs(argv.slice(3));
  const execution = await runStrictGenerateCommand(options);
  writeSuccess(execution, options);
}

export async function runStrictGenerateCommand(options) {
  const input = requiredOption(options, 'input');
  const output = requiredOption(options, 'output');
  const name = requiredOption(options, 'name');
  const language = options.language || 'typescript';
  const sdkType = options.type || 'backend';
  if (language !== 'typescript') {
    throw new Error(`Strict ClawRouter SDK generation only supports TypeScript, got: ${language}`);
  }

  const authoritySpec = await loadOpenApiSpec(input);
  const spec = prepareStrictTypeScriptGenerationSpec(authoritySpec, options);
  const outputPath = path.resolve(output);
  const apiSpecPath = isRemoteInput(input) ? input : path.resolve(input);
  const resolvedVersion = await resolveSdkVersion({
    sdkRoot: options.sdkRoot,
    sdkName: options.sdkName,
    outputPath,
    language,
    sdkType,
    packageName: options.packageName,
    npmPackageName: options.npmPackageName,
    requestedVersion: options.fixedSdkVersion || options.sdkVersion,
    fixedVersion: Boolean(options.fixedSdkVersion),
    npmRegistryUrl: options.npmRegistry,
    syncPublishedVersion: options.syncPublishedVersion !== false,
  });

  const config = {
    name,
    version: resolvedVersion.version,
    description: options.description,
    author: options.author,
    license: options.license || 'MIT',
    language,
    sdkType,
    outputPath,
    apiSpecPath,
    baseUrl: options.baseUrl || spec.servers?.[0]?.url || 'http://localhost:8080',
    apiPrefix: options.apiPrefix || '',
    packageName: options.packageName,
    namespace: options.namespace,
    commonPackage: options.commonPackage,
    generateReadme: true,
    options: options.standardProfile
      ? { standardProfile: options.standardProfile }
      : undefined,
  };

  const result = await generateSdk(config, spec);
  if (result.errors.length > 0) {
    const message = result.errors.map((error) => `[${error.code}] ${error.message}`).join('\n');
    throw new Error(`Generation failed:\n${message}`);
  }
  if (result.files.length === 0) {
    throw new Error('Generation produced no files.');
  }

  const strictFiles = applyStrictTypeScriptContractFiles(result.files, spec, config.packageName);
  const strictResult = {
    ...result,
    files: strictFiles,
    warnings: [
      ...(Array.isArray(result.warnings) ? result.warnings : []),
      ...buildStrictWarnings(result.files, strictFiles),
    ],
  };
  const syncSummary = syncGeneratedOutput(outputPath, strictFiles, {
    cleanGenerated: options.clean !== false,
    dryRun: options.dryRun === true,
    expectedChangeFingerprint: options.expectedChangeFingerprint,
    sdk: {
      name: config.name,
      version: config.version,
      language: config.language,
      sdkType: config.sdkType,
      packageName: config.packageName,
    },
  });

  if (syncSummary.dryRun !== true) {
    runProjectRuntimeStandardizer(outputPath, config);
  }

  const execution = {
    config,
    spec,
    result: strictResult,
    resolvedVersion,
    syncSummary,
  };
  persistGenerateExecutionReport(execution);
  return execution;
}

function runProjectRuntimeStandardizer(outputPath, config) {
  const resolvedOutputPath = path.resolve(outputPath);
  const workspace = resolveProjectSdkWorkspace(resolvedOutputPath);
  if (!workspace) {
    return;
  }

  const python = resolvePythonCommand();
  const args = [
    '-B',
    '-m',
    'tools.clawrouter_sdk_runtime_standardizer',
    '--root',
    workspace.standardizerRoot,
    '--sdk-dir',
    workspace.sdkFamilyName,
  ];
  if (
    workspace.sdkFamilyName !== 'clawrouter-open-sdk'
    && typeof config.apiSpecPath === 'string'
    && !isRemoteInput(config.apiSpecPath)
  ) {
    args.push('--api-spec-path', config.apiSpecPath);
  }
  const result = spawnSync(
    python,
    args,
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (result.status === 0) {
    return;
  }

  const details = [result.stdout, result.stderr]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join('\n');
  throw new Error(
    `ClawRouter SDK runtime standardization failed for ${workspace.typescriptDirectory}${details ? `:\n${details}` : ''}`,
  );
}

function resolveProjectSdkWorkspace(resolvedOutputPath) {
  const normalizedOutputPath = path.normalize(resolvedOutputPath);
  const pathParts = normalizedOutputPath.split(path.sep);
  let typescriptDirectory = path.basename(normalizedOutputPath);
  let sdkFamilyRoot = path.dirname(normalizedOutputPath);
  if (
    pathParts.length >= 3
    && pathParts.at(-1) === 'server-openapi'
    && pathParts.at(-2) === 'generated'
  ) {
    const languageWorkspaceRoot = path.dirname(path.dirname(normalizedOutputPath));
    typescriptDirectory = path.basename(languageWorkspaceRoot);
    sdkFamilyRoot = path.dirname(languageWorkspaceRoot);
  }
  const sdkFamilyName = path.basename(sdkFamilyRoot);
  const sdksRoot = path.dirname(sdkFamilyRoot);
  if (path.basename(sdksRoot) !== 'sdks') {
    return null;
  }
  if (typescriptDirectory !== `${sdkFamilyName}-typescript`) {
    return null;
  }
  return {
    sdkFamilyName,
    typescriptDirectory,
    standardizerRoot: path.dirname(sdksRoot),
  };
}

function resolvePythonCommand() {
  const preferred = process.env.PYTHON_BIN;
  const candidates = preferred ? [preferred] : ['python', 'python3'];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status === 0) {
      return candidate;
    }
  }
  throw new Error('Python runtime not found. Set PYTHON_BIN or install python/python3.');
}

export function applyStrictTypeScriptContractFiles(files, spec, configuredPackageName) {
  const closedEmptySchemas = collectClosedEmptySchemaComponents(spec);
  const multipartRequestSchemas = collectMultipartRequestSchemas(spec);
  const sdkworkV3ResponseTypes = collectSdkworkV3UnwrappedResponseTypes(spec);
  const operationEnvelopeTypeNames = collectGeneratedOperationEnvelopeTypeNames(files, sdkworkV3ResponseTypes);
  const closedEmptyFiles = new Map(
    Array.from(closedEmptySchemas).map((schemaName) => [
      `src/types/${toKebabCase(schemaName)}.ts`,
      toPascalCase(schemaName),
    ]),
  );
  const typedMapSchemas = collectTypedMapSchemaComponents(spec);
  const typedMapFiles = new Map(
    Array.from(typedMapSchemas.entries()).map(([schemaName, schema]) => [
      `src/types/${toKebabCase(schemaName)}.ts`,
      { modelName: toPascalCase(schemaName), schema },
    ]),
  );
  return files
    .filter((file) => normalizeGeneratedPath(file.path) !== 'src/types/no-data.ts')
    .filter((file) => {
      const normalizedPath = normalizeGeneratedPath(file.path);
      if (!normalizedPath.startsWith('src/types/') || !normalizedPath.endsWith('.ts')) {
        return true;
      }
      return !operationEnvelopeTypeNameForPath(normalizedPath, operationEnvelopeTypeNames);
    })
    .map((file) => {
      const normalizedPath = normalizeGeneratedPath(file.path);
      let content = file.content;
      if (normalizedPath === 'src/types/common.ts') {
        content = removeForbiddenCommonTypeExports(content, ['PageResult']);
        content = standardizeCommonQueryListForm(content);
      }

      if (normalizedPath.startsWith('src/types/') && normalizedPath.endsWith('.ts')) {
        content = removeNoDataPublicTypeReferences(content);
      }

      if (normalizedPath.startsWith('src/api/') && normalizedPath.endsWith('.ts')) {
        content = standardizeMultipartMethodBodies(content, multipartRequestSchemas);
        content = standardizeSdkworkV3MethodResponseTypes(content, sdkworkV3ResponseTypes);
        content = standardizeNoDataMethodResponseTypes(content);
      }

      const typedMapModel = typedMapFiles.get(normalizedPath);
      if (typedMapModel) {
        content = renderTypedMapModelInterface(content, typedMapModel.modelName, typedMapModel.schema, spec);
      }

      const closedEmptyModelName = closedEmptyFiles.get(normalizedPath);
      if (closedEmptyModelName && closedEmptyModelName !== 'NoData') {
        content = renderClosedEmptyModelInterface(content, closedEmptyModelName);
      }

      content = standardizeProjectRuntimeGeneratedContent(
        normalizedPath,
        content,
        file,
        spec,
        configuredPackageName,
      );
      content = removeTrailingWhitespace(content);
      return content === file.content ? { ...file } : { ...file, content };
    })
    .map((file) => {
      if (normalizeGeneratedPath(file.path) !== 'src/types/index.ts') {
        return file;
      }
      return {
        ...file,
        content: removeTypeExports(file.content, new Set(['NoData', ...operationEnvelopeTypeNames]))
          .replace(/\n{3,}/g, '\n\n'),
      };
    });
}

function collectSdkworkV3UnwrappedResponseTypes(spec) {
  const result = new Map();
  const paths = spec?.paths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) {
    return result;
  }

  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isHttpOperation(method, operation)) {
        continue;
      }
      const responses = operation.responses;
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
        continue;
      }
      for (const [statusCode, response] of Object.entries(responses)) {
        if (!String(statusCode).startsWith('2')) {
          continue;
        }
        const schema = response?.content?.['application/json']?.schema;
        const sourceName = schemaComponentName(schema);
        if (!sourceName) {
          continue;
        }
        const unwrapped = sdkworkV3UnwrappedResponseSchema(spec, schema);
        const targetName = schemaComponentName(unwrapped);
        if (!targetName || targetName === sourceName) {
          continue;
        }
        result.set(sourceName, targetName);
      }
    }
  }
  return result;
}

function collectGeneratedOperationEnvelopeTypeNames(files, responseTypeMap) {
  const result = new Set();
  const mappedSourceNames = new Set(responseTypeMap.keys());
  for (const sourceName of responseTypeMap.keys()) {
    if (!isCanonicalSdkworkEnvelopeSchema(sourceName)) {
      result.add(sourceName);
    }
  }
  for (const file of files) {
    const normalizedPath = normalizeGeneratedPath(file.path);
    if (!normalizedPath.startsWith('src/types/') || !normalizedPath.endsWith('.ts')) {
      continue;
    }
    if (/^src\/types\/sdk-work-/u.test(normalizedPath) || normalizedPath === 'src/types/problem-detail.ts') {
      continue;
    }
    if (!/\bcode:\s*0;[\s\S]*\btraceId\b/u.test(file.content)) {
      continue;
    }
    const typeName = exportedTypeName(file.content);
    if (
      !mappedSourceNames.has(typeName)
      && !Array.from(mappedSourceNames).some((sourceName) => file.content.includes(sourceName))
    ) {
      continue;
    }
    if (typeName) {
      result.add(typeName);
    }
  }
  return result;
}

function operationEnvelopeTypeNameForPath(normalizedPath, operationEnvelopeTypeNames) {
  for (const typeName of operationEnvelopeTypeNames) {
    if (normalizedPath === `src/types/${toKebabCase(typeName)}.ts`) {
      return typeName;
    }
  }
  return '';
}

function exportedTypeName(content) {
  const match = content.match(/\bexport\s+(?:interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/u);
  return match?.[1] || '';
}

function standardizeSdkworkV3MethodResponseTypes(content, responseTypeMap) {
  let updated = content;
  for (const [sourceName, targetName] of responseTypeMap.entries()) {
    const before = updated;
    updated = updated.replace(new RegExp(`\\bPromise<${escapeRegExp(sourceName)}>`, 'g'), `Promise<${targetName}>`);
    updated = updated.replace(new RegExp(`<${escapeRegExp(sourceName)}>`, 'g'), `<${targetName}>`);
    if (updated !== before) {
      updated = removeTypeImportNames(updated, '../types', new Set([sourceName]));
      updated = ensureTypeImportName(updated, '../types', targetName);
    }
  }
  return updated;
}

function standardizeNoDataMethodResponseTypes(content) {
  if (!content.includes('NoData')) {
    return content;
  }
  let updated = content.replace(/\bPromise<NoData>/g, 'Promise<Record<string, never>>');
  updated = updated.replace(/<NoData>/g, '<Record<string, never>>');
  updated = removeTypeImportNames(updated, '../types', new Set(['NoData']));
  return updated;
}

function removeTypeExports(content, typeNames) {
  if (!typeNames || typeNames.size === 0) {
    return content;
  }
  let updated = content;
  for (const typeName of typeNames) {
    updated = updated.replace(
      new RegExp(
        `^\\s*export\\s+type\\s+\\{\\s*${escapeRegExp(typeName)}\\s*\\}\\s+from\\s+['"]\\./${escapeRegExp(toKebabCase(typeName))}['"];\\s*$`,
        'gm',
      ),
      '',
    );
  }
  return updated;
}

export function prepareStrictTypeScriptGenerationSpec(spec, options = {}) {
  if (options.standardProfile !== 'sdkwork-v3') {
    return spec;
  }
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return spec;
  }
  const cloned = JSON.parse(JSON.stringify(spec));
  const paths = cloned.paths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) {
    return cloned;
  }
  const sdkDomains = new Set();
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isHttpOperation(method, operation)) {
        continue;
      }
      const sdkDomain = normalizeSdkworkDomain(operation['x-sdk-domain'] || operation['x-sdkwork-domain']);
      if (!usesSdkDomainAsTypeScriptSurface(sdkDomain)) {
        continue;
      }
      operation.tags = [sdkDomain];
      operation.operationId = stripSdkDomainOperationIdPrefix(operation.operationId, sdkDomain);
      sdkDomains.add(sdkDomain);
    }
  }
  if (sdkDomains.size > 0) {
    cloned.tags = mergeSdkDomainTags(cloned.tags, sdkDomains);
  }
  return cloned;
}

function sdkworkV3UnwrappedResponseSchema(spec, schema, seenRefs = new Set()) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return null;
  }

  if (typeof schema.$ref === 'string') {
    const resolved = resolveComponentSchema(spec, schema.$ref);
    if (!resolved || seenRefs.has(schema.$ref)) {
      return null;
    }
    seenRefs.add(schema.$ref);
    const unwrapped = sdkworkV3UnwrappedResponseSchema(spec, resolved, seenRefs);
    seenRefs.delete(schema.$ref);
    return unwrapped;
  }

  if (Array.isArray(schema.allOf) && schema.allOf.some((part) => part?.$ref === '#/components/schemas/SdkWorkApiResponse')) {
    const dataSchema = sdkworkV3EnvelopeDataSchema(schema);
    return sdkworkV3RuntimePayloadSchema(spec, dataSchema);
  }

  if (hasSdkworkEnvelopeShape(schema)) {
    return sdkworkV3RuntimePayloadSchema(spec, schema.properties.data);
  }

  return null;
}

function sdkworkV3EnvelopeDataSchema(schema) {
  for (const part of schema.allOf || []) {
    if (!part || typeof part !== 'object' || Array.isArray(part) || part.$ref === '#/components/schemas/SdkWorkApiResponse') {
      continue;
    }
    const dataSchema = part.properties?.data;
    if (dataSchema) {
      return dataSchema;
    }
  }
  return null;
}

function sdkworkV3RuntimePayloadSchema(spec, dataSchema) {
  const normalized = unwrapSingleAllOfRef(dataSchema);
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return null;
  }

  if (typeof normalized.$ref === 'string') {
    const resolved = resolveComponentSchema(spec, normalized.$ref);
    if (isSingleItemPayloadSchema(resolved)) {
      return unwrapSingleAllOfRef(resolved.properties.item) || resolved.properties.item;
    }
    return { $ref: normalized.$ref };
  }

  if (isSingleItemPayloadSchema(normalized)) {
    return unwrapSingleAllOfRef(normalized.properties.item) || normalized.properties.item;
  }

  return structuredClone(normalized);
}

function isSingleItemPayloadSchema(schema) {
  if (!schema?.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
    return false;
  }
  const propertyNames = Object.keys(schema.properties);
  return propertyNames.length === 1 && propertyNames[0] === 'item';
}

function unwrapSingleAllOfRef(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema;
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length === 1 && typeof schema.allOf[0]?.$ref === 'string') {
    return { $ref: schema.allOf[0].$ref };
  }
  return schema;
}

function hasSdkworkEnvelopeShape(schema) {
  return Boolean(schema?.properties?.code && schema?.properties?.data && schema?.properties?.traceId);
}

function isCanonicalSdkworkEnvelopeSchema(name) {
  return [
    'SdkWorkApiResponse',
    'SdkWorkResourceData',
    'SdkWorkPageData',
    'SdkWorkCommandData',
    'SdkWorkResourceResponse',
    'SdkWorkListResponse',
    'SdkWorkCommandResponse',
  ].includes(name);
}

function resolveComponentSchema(spec, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/components/schemas/')) {
    return null;
  }
  const name = ref.split('/').pop();
  return spec.components?.schemas?.[name] || null;
}

function usesSdkDomainAsTypeScriptSurface(sdkDomain) {
  return sdkDomain === 'oss' || sdkDomain === 'sites';
}

function stripSdkDomainOperationIdPrefix(operationId, sdkDomain) {
  if (typeof operationId !== 'string' || !operationId.trim()) {
    return operationId;
  }
  const normalizedOperationId = operationId.trim();
  const prefix = `${sdkDomain}.`;
  if (!normalizedOperationId.startsWith(prefix)) {
    return normalizedOperationId;
  }
  const stripped = normalizedOperationId.slice(prefix.length);
  if (sdkDomain === 'sites') {
    return stripped || normalizedOperationId;
  }
  return stripped.includes('.') ? stripped : normalizedOperationId;
}

function isHttpOperation(method, value) {
  return typeof method === 'string'
    && ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'].includes(method.toLowerCase())
    && value
    && typeof value === 'object'
    && !Array.isArray(value);
}

function normalizeSdkworkDomain(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  if (!/^[a-z][A-Za-z0-9]*$/.test(normalized)) {
    return '';
  }
  return normalized;
}

function mergeSdkDomainTags(tags, sdkDomains) {
  const result = Array.isArray(tags)
    ? tags
        .filter((tag) => tag && typeof tag === 'object' && !Array.isArray(tag))
        .map((tag) => ({ ...tag }))
    : [];
  const existingNames = new Set(
    result
      .map((tag) => (typeof tag.name === 'string' ? tag.name : ''))
      .filter(Boolean),
  );
  for (const domain of Array.from(sdkDomains).sort()) {
    if (!existingNames.has(domain)) {
      result.push({ name: domain, description: `${toPascalCase(domain)} SDK domain.` });
    }
  }
  return result;
}

function standardizeProjectRuntimeGeneratedContent(
  normalizedPath,
  content,
  file,
  spec,
  configuredPackageName,
) {
  switch (normalizedPath) {
    case 'package.json':
      return standardizePackageJsonContent(content, configuredPackageName);
    case 'src/api/index.ts':
      return standardizeApiIndexExports(content);
    case 'sdkwork-sdk.json':
      return standardizeSdkMetadataContent(content, file, spec, configuredPackageName);
    case 'bin/publish-core.mjs':
      return standardizePublishCoreContent(content);
    case 'custom/build-runtime.mjs':
      return BUILD_RUNTIME_SCRIPT;
    case 'custom/README.md':
      return [
        '# Custom SDK Extensions',
        '',
        'This directory is reserved for handwritten extensions that are not owned by the SDK generator.',
        '',
      ].join('\n');
    default:
      return content;
  }
}

export function standardizeApiIndexExports(content) {
  const lines = content.split(/\r?\n/);
  let changed = false;
  const standardized = lines.map((line) => {
    const match = line.match(/^\s*export\s+\{[^}]+\}\s+from\s+['"]\.\/([^'"]+)['"]\s*;?\s*$/);
    if (!match) {
      return line;
    }
    const stem = match[1];
    if (stem === 'base' || stem === 'paths') {
      return line;
    }
    changed = true;
    return `export * from './${stem}';`;
  });

  return changed ? `${standardized.join('\n').replace(/\n*$/, '')}\n` : content;
}

export function collectMultipartRequestSchemas(spec) {
  const paths = spec?.paths;
  if (!paths || typeof paths !== 'object') {
    return new Set();
  }

  const result = new Set();
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      continue;
    }
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        continue;
      }
      const multipart = operation.requestBody?.content?.['multipart/form-data'];
      const schemaName = schemaComponentName(multipart?.schema);
      if (schemaName) {
        result.add(schemaName);
      }
    }
  }
  return result;
}

function schemaComponentName(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return '';
  }
  if (typeof schema.$ref === 'string') {
    return schema.$ref.split('/').pop() || '';
  }
  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    const variants = schema[key];
    if (!Array.isArray(variants)) {
      continue;
    }
    for (const variant of variants) {
      const name = schemaComponentName(variant);
      if (name) {
        return name;
      }
    }
  }
  return '';
}

export function standardizeMultipartMethodBodies(content, multipartRequestSchemas) {
  if (!content.includes('FormData') || !multipartRequestSchemas || multipartRequestSchemas.size !== 1) {
    return content;
  }

  const schemaName = Array.from(multipartRequestSchemas)[0];
  const updated = content.replace(/(\bbody\??\s*:\s*)FormData\b/g, `$1${schemaName}`);
  if (updated === content) {
    return content;
  }
  return ensureTypeImportName(updated, '../types', schemaName);
}
export function removeTypeImportNames(content, importPath, namesToRemove) {
  const removals = new Set(Array.from(namesToRemove || []).filter(Boolean));
  if (removals.size === 0) {
    return content;
  }

  const importPattern = new RegExp(
    `^\\s*import\\s+type\\s+\\{([^}]*)\\}\\s+from\\s+['"]${escapeRegExp(importPath)}['"];\\s*$`,
    'gm',
  );
  return content.replace(importPattern, (match, namesRaw) => {
    const names = namesRaw
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => !removals.has(name.split(/\s+as\s+/i)[0].trim()));
    if (names.length === 0) {
      return '';
    }
    return `import type { ${names.join(', ')} } from '${importPath}';`;
  });
}

function ensureTypeImportName(content, importPath, nameToAdd) {
  const importPattern = new RegExp(
    `^\\s*import\\s+type\\s+\\{([^}]*)\\}\\s+from\\s+['"]${escapeRegExp(importPath)}['"];\\s*$`,
    'm',
  );
  const match = content.match(importPattern);
  if (match) {
    const names = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.includes(nameToAdd)) {
      return content;
    }
    return content.replace(match[0], `import type { ${[...names, nameToAdd].join(', ')} } from '${importPath}';`);
  }

  const importBlockPattern = /^((?:import[^\n]*\n)+)/;
  if (importBlockPattern.test(content)) {
    return content.replace(importBlockPattern, `$1import type { ${nameToAdd} } from '${importPath}';\n`);
  }
  return `import type { ${nameToAdd} } from '${importPath}';\n${content}`;
}

function standardizePackageJsonContent(content, configuredPackageName) {
  const packageJson = JSON.parse(content);
  packageJson.name = canonicalTransportPackageName(configuredPackageName || packageJson.name);
  packageJson.private = true;
  packageJson.sdkworkRole = 'transport';
  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  scripts.build = 'node custom/build-runtime.mjs';
  scripts.dev = 'node custom/build-runtime.mjs';
  scripts.prepublishOnly = 'npm run build';
  packageJson.scripts = scripts;

  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  dependencies['@sdkwork/sdk-common'] = SDK_COMMON_VERSION;
  packageJson.dependencies = dependencies;

  const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};
  delete devDependencies.vite;
  delete devDependencies['vite-plugin-dts'];
  devDependencies['@types/node'] = SDK_TYPES_NODE_VERSION;
  devDependencies.typescript = SDK_TYPESCRIPT_VERSION;
  devDependencies.rollup = SDK_ROLLUP_VERSION;
  packageJson.devDependencies = devDependencies;

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function canonicalTransportPackageName(packageName) {
  const normalized = String(packageName || '').trim();
  const unscoped = normalized.startsWith('@sdkwork/')
    ? normalized.slice('@sdkwork/'.length)
    : normalized.replace(/^sdkwork-/, '');
  return unscoped.endsWith('-generated-typescript')
    ? unscoped
    : `${unscoped}-generated-typescript`;
}

function standardizeSdkMetadataContent(content, file, spec, configuredPackageName) {
  const metadata = JSON.parse(content);
  const sdk = file?.metadata?.sdk && isRecord(file.metadata.sdk) ? file.metadata.sdk : {};
  const sdkType = sdk.sdkType || inferSdkTypeFromSpec(spec);
  const packageName = sdk.packageName || inferPackageNameFromSpec(spec, sdkType);
  return `${JSON.stringify(
    {
      language: 'typescript',
      sdkType,
      name: metadata.name || sdk.name || (sdkType === 'app' ? 'clawrouter-app-sdk' : 'clawrouter-backend-sdk'),
      packageName: canonicalTransportPackageName(configuredPackageName || packageName || metadata.packageName),
      version: metadata.version || sdk.version || '0.1.0',
    },
    null,
    2,
  )}\n`;
}

function inferSdkTypeFromSpec(spec) {
  const paths = spec?.paths && isRecord(spec.paths) ? Object.keys(spec.paths) : [];
  return paths.some((pathName) => pathName.startsWith('/app/v3/api')) ? 'app' : 'backend';
}

function inferPackageNameFromSpec(spec, sdkType) {
  if (sdkType === 'app') {
    return '@sdkwork/clawrouter-app-sdk';
  }
  if (sdkType === 'ai') {
    return '@sdkwork/clawrouter-open-sdk';
  }
  return '@sdkwork/clawrouter-backend-sdk';
}

function standardizePublishCoreContent(content) {
  let updated = content;
  if (!updated.includes('function hasTypeScriptSdkDependencies(projectDir)')) {
    const marker = 'function runTypeScript(ctx) {';
    const helper = `function hasTypeScriptSdkDependencies(projectDir) {
  return existsSync(path.join(projectDir, 'node_modules', 'typescript'))
    && existsSync(path.join(projectDir, 'node_modules', 'rollup'))
    && existsSync(path.join(projectDir, 'node_modules', '@sdkwork', 'sdk-common'));
}

`;
    updated = updated.replace(marker, `${helper}${marker}`);
  }

  const canonicalRunTypeScript = `function runTypeScript(ctx) {
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
}`;

  return replaceJavaScriptFunction(updated, 'runTypeScript', canonicalRunTypeScript);
}

export function collectTypedMapSchemaComponents(spec) {
  const schemas = spec?.components?.schemas;
  if (!schemas || typeof schemas !== 'object') {
    return new Map();
  }

  return new Map(
    Object.entries(schemas)
      .filter(([, schema]) => isTypedMapObjectSchema(schema))
      .map(([name, schema]) => [name, schema]),
  );
}

function isTypedMapObjectSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }
  if (schema.$ref || schema.oneOf || schema.anyOf || schema.allOf || schema.enum || schema.const) {
    return false;
  }
  if (schema.type !== 'object') {
    return false;
  }
  const properties = schema.properties;
  const hasNoProperties = !properties || (typeof properties === 'object' && Object.keys(properties).length === 0);
  return hasNoProperties && schema.additionalProperties && typeof schema.additionalProperties === 'object';
}

function removeNoDataPublicTypeReferences(content) {
  return content
    .replace(/^\s*import\s+type\s+\{\s*NoData\s*\}\s+from\s+['"]\.\/no-data['"];\s*\r?\n\r?\n?/gm, '')
    .replace(/^\s*export\s+type\s+\{\s*NoData\s*\}\s+from\s+['"]\.\/no-data['"];\s*\r?\n?/gm, '')
    .replace(/(\bdata\??\s*:\s*)NoData(\s*[;,])/g, '$1never$2');
}

function removeTrailingWhitespace(content) {
  return content.replace(/[ \t]+$/gm, '');
}

function renderTypedMapModelInterface(content, modelName, schema, spec) {
  const additionalType = schemaToTypeScriptType(schema.additionalProperties, spec);
  const importBlock = collectLeadingTypeImports(content);
  return [
    importBlock,
    extractLeadingDescription(content),
    `export interface ${modelName} {`,
    `  [key: string]: ${additionalType};`,
    '}',
    '',
  ].filter((section) => section !== '').join('\n');
}

function collectLeadingTypeImports(content) {
  const imports = [];
  const importPattern = /^\s*import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\s*$/gm;
  for (const match of content.matchAll(importPattern)) {
    imports.push(match[0].trim());
  }
  return imports.length > 0 ? `${imports.join('\n')}\n` : '';
}

function extractLeadingDescription(content) {
  const match = content.match(/\/\*\*[\s\S]*?\*\/\s*(?=export\s+(?:type|interface)\s+)/);
  return match ? match[0].trim() : '';
}

function schemaToTypeScriptType(schema, spec) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return 'unknown';
  }
  if (schema.$ref) {
    return schema.$ref.split('/').pop() || 'unknown';
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length === 1) {
    return schemaToTypeScriptType(schema.allOf[0], spec);
  }
  if (schema.type === 'array') {
    return `${parenthesizeArrayItemType(schemaToTypeScriptType(schema.items, spec))}[]`;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  }
  if (schema.format === 'int64' || schema['x-sdkwork-int64-string'] === true) {
    return 'string';
  }
  if (schema.type === 'string') {
    return 'string';
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    return 'number';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  if (schema.type === 'object') {
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      return `Record<string, ${schemaToTypeScriptType(schema.additionalProperties, spec)}>`;
    }
    return 'Record<string, unknown>';
  }
  return 'unknown';
}

function parenthesizeArrayItemType(typeName) {
  return typeName.includes(' | ') ? `(${typeName})` : typeName;
}

export function collectClosedEmptySchemaComponents(spec) {
  const schemas = spec?.components?.schemas;
  if (!schemas || typeof schemas !== 'object') {
    return new Set();
  }

  return new Set(
    Object.entries(schemas)
      .filter(([, schema]) => isClosedEmptyObjectSchema(schema))
      .map(([name]) => name),
  );
}

function isClosedEmptyObjectSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }
  if (schema.$ref || schema.oneOf || schema.anyOf || schema.allOf || schema.enum || schema.const) {
    return false;
  }
  const properties = schema.properties;
  const required = schema.required;
  const hasEmptyProperties = properties && typeof properties === 'object' && Object.keys(properties).length === 0;
  const hasNoRequired = !Array.isArray(required) || required.length === 0;
  return schema.type === 'object' && schema.additionalProperties === false && hasEmptyProperties && hasNoRequired;
}

function removeForbiddenCommonTypeExports(content, forbiddenNames) {
  return content.replace(
    /export type \{([^}]+)\} from ('[^']+'|"[^"]+");/g,
    (match, namesRaw, importPath) => {
      const names = namesRaw
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .filter((name) => !forbiddenNames.includes(name));
      if (names.length === 0) {
        return '';
      }
      return `export type { ${names.join(', ')} } from ${importPath};`;
    },
  );
}

export function standardizeCommonQueryListForm(content) {
  return content.replace(/^(\s*)(?:searchQuery|search_query|keyword|search)(\??\s*:\s*)/gm, '$1q$2');
}

function renderClosedEmptyModelInterface(content, modelName) {
  const pattern = new RegExp(`export\\s+type\\s+${escapeRegExp(modelName)}\\s*=\\s*Record<string,\\s*unknown>;`);
  if (pattern.test(content)) {
    return content.replace(pattern, `export type ${modelName} = Record<string, never>;`);
  }
  const emptyInterfacePattern = new RegExp(`export\\s+interface\\s+${escapeRegExp(modelName)}\\s*\\{\\s*\\}`);
  return content.replace(emptyInterfacePattern, `export type ${modelName} = Record<string, never>;`);
}

function buildStrictWarnings(originalFiles, strictFiles) {
  const originalByPath = new Map(originalFiles.map((file) => [file.path, file.content]));
  return strictFiles
    .filter((file) => originalByPath.get(file.path) !== file.content)
    .map((file) => ({
      code: 'CLAWROUTER_STRICT_TYPESCRIPT_CONTRACT',
      message: `Applied ClawRouter strict TypeScript contract normalization to ${file.path}`,
    }));
}

function parseGenerateArgs(args) {
  const options = {
    language: 'typescript',
    type: 'backend',
    apiPrefix: '',
    npmRegistry: 'https://registry.npmjs.org',
    syncPublishedVersion: true,
    license: 'MIT',
    clean: true,
    dryRun: false,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '-i':
      case '--input':
        options.input = readValue(args, ++index, arg);
        break;
      case '-o':
      case '--output':
        options.output = readValue(args, ++index, arg);
        break;
      case '-n':
      case '--name':
        options.name = readValue(args, ++index, arg);
        break;
      case '-t':
      case '--type':
        options.type = readValue(args, ++index, arg);
        break;
      case '-l':
      case '--language':
        options.language = readValue(args, ++index, arg);
        break;
      case '--base-url':
        options.baseUrl = readValue(args, ++index, arg);
        break;
      case '--api-prefix':
        options.apiPrefix = readValue(args, ++index, arg);
        break;
      case '--package-name':
        options.packageName = readValue(args, ++index, arg);
        break;
      case '--namespace':
        options.namespace = readValue(args, ++index, arg);
        break;
      case '--common-package':
        options.commonPackage = readValue(args, ++index, arg);
        break;
      case '--standard-profile':
        options.standardProfile = readValue(args, ++index, arg);
        break;
      case '--sdk-version':
        options.sdkVersion = readValue(args, ++index, arg);
        break;
      case '--fixed-sdk-version':
        options.fixedSdkVersion = readValue(args, ++index, arg);
        break;
      case '--npm-registry':
        options.npmRegistry = readValue(args, ++index, arg);
        break;
      case '--npm-package-name':
        options.npmPackageName = readValue(args, ++index, arg);
        break;
      case '--sdk-root':
        options.sdkRoot = readValue(args, ++index, arg);
        break;
      case '--sdk-name':
        options.sdkName = readValue(args, ++index, arg);
        break;
      case '--description':
        options.description = readValue(args, ++index, arg);
        break;
      case '--author':
        options.author = readValue(args, ++index, arg);
        break;
      case '--license':
        options.license = readValue(args, ++index, arg);
        break;
      case '--expected-change-fingerprint':
        options.expectedChangeFingerprint = readValue(args, ++index, arg);
        break;
      case '--no-sync-published-version':
        options.syncPublishedVersion = false;
        break;
      case '--no-clean':
        options.clean = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--json':
        options.json = true;
        break;
      default:
        throw new Error(`Unsupported option: ${arg}`);
    }
  }

  return options;
}

function writeSuccess(execution, options) {
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: 'ok',
          mode: execution.syncSummary.dryRun ? 'dry-run' : 'apply',
          outputPath: execution.config.outputPath,
          sdk: {
            name: execution.config.name,
            version: execution.config.version,
            language: execution.config.language,
            sdkType: execution.config.sdkType,
            packageName: execution.config.packageName,
          },
          stats: execution.result.stats,
          warnings: execution.result.warnings,
          syncSummary: execution.syncSummary,
          files: execution.syncSummary.dryRun
            ? execution.result.files.map((file) => ({ path: file.path, content: file.content }))
            : undefined,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    [
      `Generated strict ${execution.config.language} SDK: ${execution.config.name}`,
      `Version: ${execution.config.version}`,
      `Output: ${execution.config.outputPath}`,
      `Mode: ${execution.syncSummary.dryRun ? 'dry-run' : 'apply'}`,
      `Written files: ${execution.syncSummary.writtenFiles}`,
      '',
    ].join('\n'),
  );
}

function readValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
}

function requiredOption(options, name) {
  const value = options[name];
  if (!value) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function isRemoteInput(input) {
  return input.startsWith('http://') || input.startsWith('https://');
}

function normalizeGeneratedPath(value) {
  return String(value).replace(/\\/g, '/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function replaceJavaScriptFunction(source, functionName, replacement) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start < 0) {
    return source;
  }

  const openBrace = source.indexOf('{', start);
  if (openBrace < 0) {
    return source;
  }

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return `${source.slice(0, start)}${replacement}${source.slice(index + 1)}`;
      }
    }
  }

  return source;
}

function toPascalCase(value) {
  return String(value)
    .replace(/[-_\s]+(.)?/g, (_, character) => (character ? character.toUpperCase() : ''))
    .replace(/^(.)/, (character) => character.toUpperCase());
}

function toKebabCase(value) {
  const normalized = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  if (normalized) {
    return normalized;
  }
  return `group-${Buffer.from(String(value || 'unnamed')).toString('hex').slice(0, 12)}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main(process.argv).catch((error) => {
    const json = process.argv.includes('--json');
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
      process.stderr.write(`${JSON.stringify({ status: 'error', message }, null, 2)}\n`);
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(1);
  });
}
