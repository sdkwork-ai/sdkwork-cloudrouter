#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { RELEASE_ENVIRONMENT_CONTRACT } from './release-environment-contract.mjs';

const execFileAsync = promisify(execFile);

const SDKWORK_RELEASE_SKIP_VERIFY = 'SDKWORK_RELEASE_SKIP_VERIFY';
const RELEASE_RECORDS_DIR = 'docs/release';
const VERIFY_SKIP_PHRASES = ['skipped', 'not run', 'not executed', 'verify skipped', 'verify was not'];
const VERIFY_EVIDENCE_PHRASES = ['pnpm verify', 'pnpm.cmd verify', 'verify (passed)', 'verify: passed'];

const REQUIRED_RELEASE_ENV = RELEASE_ENVIRONMENT_CONTRACT.requiredReleaseEnv;
const REQUIRED_PORTAL_PUBLIC_ENV = RELEASE_ENVIRONMENT_CONTRACT.requiredPortalPublicEnv;
const PORTAL_PUBLIC_SURFACE_BASE_URL_ENV = [
  'PORTAL_PUBLIC_API_BASE_URL',
  'PORTAL_PUBLIC_APP_API_BASE_URL',
  'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
];

const REQUIRED_COMMANDS = [
  ['git', 'git', ['--version']],
  ['node', 'node', ['--version']],
  ['pnpm', null, ['--version']],
  ['cargo', 'cargo', ['--version']],
  ['python', 'python', ['--version']],
];

const CODEX_SESSION_WARN_BYTES = 1_000 * 1024 * 1024;
const CODEX_SESSION_WARN_COUNT = 12;
const GIT_LOOSE_OBJECT_WARN_COUNT = 1_000;
const LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1';
const RUNTIME_SKILL_SEED_FILES = [
  'data/skills/install-manifest.json',
  'data/skills/categories.json',
  'data/skills/packages.json',
  'data/skills/skills.json',
  'data/skills/artifacts.json',
  'data/skills/assets.json',
];

function printHelp() {
  console.log(`Usage: node scripts/release-preflight.mjs [options]

Run a lightweight release readiness preflight before the full commercial gate.

Options:
  --strict             Fail when release/staging environment variables are missing.
  --check              Alias for --strict; also enforces pnpm verify evidence.
  --strict-root-clean  Fail when the repository root has unrelated dirty files.
  --env-file <path>    Merge release environment values from a dotenv file.
  --json               Print machine-readable JSON.
  --dry-run            Print the check plan without running local probes.
  -h, --help           Show this help.
`);
}

function parseArgs(argv) {
  const settings = {
    strict: false,
    json: false,
    dryRun: false,
    strictRootClean: false,
    envFile: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--strict':
      case '--check':
        settings.strict = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--strict-root-clean':
        settings.strictRootClean = true;
        break;
      case '--env-file':
        index += 1;
        if (!argv[index]) {
          throw new Error('--env-file requires a path');
        }
        settings.envFile = argv[index];
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported release preflight option: ${arg}`);
    }
  }

  return settings;
}

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function createCheck(id, title, status, details, recommendation = '') {
  return {
    id,
    title,
    status,
    details,
    recommendation,
  };
}

function commandLine(command, args = []) {
  return [command, ...args].join(' ');
}

function missingEnv(env, names) {
  return names.filter((name) => !String(env[name] ?? '').trim());
}

function releaseEnvironmentIssues(env) {
  const issues = [];
  const missingContractEnv = missingEnv(env, [
    ...REQUIRED_RELEASE_ENV,
    ...REQUIRED_PORTAL_PUBLIC_ENV,
  ]);
  for (const name of missingContractEnv) {
    issues.push(`${name} is missing`);
  }

  const postgresUrl = String(env.SDKWORK_DATABASE_URL ?? '').trim();
  if (postgresUrl && !isPostgresDatabaseUrl(postgresUrl)) {
    issues.push('SDKWORK_DATABASE_URL must be a postgres:// or postgresql:// URL');
  }

  const sdkBaseUrl = String(env.PORTAL_PUBLIC_SDK_BASE_URL ?? '').trim();
  const missingSurfaceBaseUrls = missingEnv(env, PORTAL_PUBLIC_SURFACE_BASE_URL_ENV);
  if (!sdkBaseUrl && missingSurfaceBaseUrls.length > 0) {
    issues.push(
      'PORTAL_PUBLIC_SDK_BASE_URL is missing; set it once as the common public SDK root, '
      + `or configure surface overrides: ${missingSurfaceBaseUrls.join(', ')}`,
    );
  }

  for (const name of [
    'PORTAL_PUBLIC_SDK_BASE_URL',
    'PORTAL_PUBLIC_API_BASE_URL',
    'PORTAL_PUBLIC_OPEN_API_BASE_URL',
    'PORTAL_PUBLIC_APP_API_BASE_URL',
    'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
    'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL',
  ]) {
    const value = String(env[name] ?? '').trim();
    if (value && !isHttpOrRootRelativeRuntimePath(value)) {
      issues.push(`${name} must be an HTTP/HTTPS URL or root-relative path without query, fragment, or control characters`);
    }
  }

  const toolApiEnabled = String(env.PORTAL_PUBLIC_TOOL_API_ENABLED ?? '').trim();
  if (toolApiEnabled && toolApiEnabled !== 'true' && toolApiEnabled !== 'false') {
    issues.push('PORTAL_PUBLIC_TOOL_API_ENABLED must be true or false');
  }

  for (const name of [
    'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS',
    'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
  ]) {
    const value = String(env[name] ?? '').trim();
    if (value && !/^[1-9]\d*$/u.test(value)) {
      issues.push(`${name} must be a positive integer`);
    }
  }

  const generatorBaseUrl = String(env.SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL ?? '').trim();
  if (generatorBaseUrl) {
    try {
      const parsed = new URL(generatorBaseUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        issues.push('SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL must be an HTTP or HTTPS URL');
      }
    } catch {
      issues.push('SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL must be an HTTP or HTTPS URL');
    }
  }

  return issues;
}

function isPostgresDatabaseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function isHttpOrRootRelativeRuntimePath(value) {
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes('?') || value.includes('#')) {
    return false;
  }
  if (value.startsWith('//')) {
    return false;
  }
  if (value.startsWith('/')) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}

function parseEnvFileContent(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }
    const name = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      continue;
    }
    values[name] = unquoteEnvFileValue(rawValue);
  }
  return values;
}

function unquoteEnvFileValue(rawValue) {
  const quote = rawValue[0];
  if ((quote === '"' || quote === "'") && rawValue.endsWith(quote)) {
    const inner = rawValue.slice(1, -1);
    if (quote === "'") {
      return inner;
    }
    return inner
      .replaceAll('\\n', '\n')
      .replaceAll('\\r', '\r')
      .replaceAll('\\t', '\t')
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
  }
  const commentIndex = rawValue.search(/\s#/);
  return (commentIndex === -1 ? rawValue : rawValue.slice(0, commentIndex)).trim();
}

function mergeEnvWithEnvFile(env, envFileContent = '') {
  return {
    ...env,
    ...parseEnvFileContent(envFileContent),
  };
}

async function readReleaseEnvFile(envFile, workspaceRoot) {
  if (!envFile) {
    return '';
  }
  const resolvedPath = path.isAbsolute(envFile) ? envFile : path.resolve(workspaceRoot, envFile);
  return readFile(resolvedPath, 'utf8');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 bytes';
  }
  const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  if (unitIndex === 0) {
    return `${bytes} bytes`;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function parseMainOriginCounts(raw) {
  const [aheadText = '', behindText = ''] = raw.trim().split(/\s+/);
  return {
    ahead: Number.parseInt(aheadText, 10) || 0,
    behind: Number.parseInt(behindText, 10) || 0,
  };
}

function parseGitObjectHealth(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }
  return {
    count: Number.parseInt(values.count ?? '0', 10) || 0,
    size: values['size-human'] ?? values.size ?? 'unknown',
    inPack: Number.parseInt(values['in-pack'] ?? '0', 10) || 0,
    sizePack: values['size-pack'] ?? values['size-pack-human'] ?? 'unknown',
  };
}

async function collectRuntimeSkillSeedStatus(workspaceRoot) {
  const files = [];
  for (const relativePath of RUNTIME_SKILL_SEED_FILES) {
    try {
      const content = await readFile(path.join(workspaceRoot, relativePath), 'utf8');
      const pointer = content.startsWith(LFS_POINTER_PREFIX);
      let validJson = false;
      if (!pointer) {
        JSON.parse(content);
        validJson = true;
      }
      files.push({
        path: relativePath,
        pointer,
        validJson,
      });
    } catch (error) {
      files.push({
        path: relativePath,
        pointer: false,
        validJson: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return files;
}

function isChildProcessPermissionError(error) {
  return error?.code === 'EPERM' || String(error?.message ?? error).includes('spawn EPERM');
}

function childProcessBlockedDetails(error) {
  const original = error instanceof Error ? error.message : String(error);
  return `child process execution is not available in this environment: ${original}`;
}

function isBlockedProbeResult(value) {
  return Boolean(value && typeof value === 'object' && value.blocked === true);
}

function probeResultDetails(value) {
  if (isBlockedProbeResult(value)) {
    return String(value.details ?? 'child process execution is blocked');
  }
  return String(value ?? '').trim();
}

/**
 * Reads the latest release record from docs/release and checks whether
 * `pnpm verify` was recorded as run (or explicitly skipped).
 *
 * Returns an object describing the verify evidence found in the latest record.
 */
async function collectLatestReleaseVerifyEvidence(workspaceRoot) {
  const releasesDir = path.join(workspaceRoot, RELEASE_RECORDS_DIR);
  let entries = [];
  try {
    entries = await readdir(releasesDir);
  } catch {
    return { found: false, path: '', verifyEvidence: false, skipped: false, raw: '' };
  }

  const datedRecords = entries
    .filter((name) => /^\d{4}-\d{2}-\d{2}-v[\d.]+\.md$/u.test(name))
    .sort();

  if (datedRecords.length === 0) {
    return { found: false, path: '', verifyEvidence: false, skipped: false, raw: '' };
  }

  const latestName = datedRecords[datedRecords.length - 1];
  const latestPath = path.join(releasesDir, latestName);
  let raw = '';
  try {
    raw = await readFile(latestPath, 'utf8');
  } catch {
    return { found: false, path: latestName, verifyEvidence: false, skipped: false, raw: '' };
  }

  const lower = raw.toLowerCase();
  const verifyEvidence = VERIFY_EVIDENCE_PHRASES.some((phrase) => lower.includes(phrase));
  const skipped = VERIFY_SKIP_PHRASES.some((phrase) => lower.includes(phrase));

  return { found: true, path: latestName, verifyEvidence, skipped, raw };
}

async function runCommand(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd,
      shell: options.shell ?? false,
      windowsHide: true,
      timeout: options.timeout ?? 15_000,
      env: options.env ?? process.env,
      maxBuffer: options.maxBuffer ?? 1024 * 1024 * 8,
    });
    return `${result.stdout}${result.stderr}`.trim();
  } catch (error) {
    if (isChildProcessPermissionError(error)) {
      return { blocked: true, details: childProcessBlockedDetails(error) };
    }
    return '';
  }
}

async function collectCodexSessionStats(sessionRoot = path.join(os.homedir(), '.codex', 'sessions')) {
  const totals = {
    count: 0,
    totalBytes: 0,
  };

  async function walk(directory) {
    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
        continue;
      }
      try {
        const fileStat = await stat(absolutePath);
        totals.count += 1;
        totals.totalBytes += fileStat.size;
      } catch {
        // Ignore files that disappear while the preflight is scanning.
      }
    }
  }

  await walk(sessionRoot);
  return totals;
}

async function collectReleasePreflightProbes({
  workspaceRoot = path.resolve(import.meta.dirname, '..'),
  platform = process.platform,
  env = process.env,
  dryRun = false,
} = {}) {
  const pnpm = pnpmCommand(platform);
  const commandVersions = Object.fromEntries(REQUIRED_COMMANDS.map(([id]) => [id, '']));
  let childProcessProbe = {
    status: 'PASS',
    details: 'child process execution is available',
  };

  if (dryRun) {
    return buildDryRunProbes(platform);
  }

  const branch = await runCommand('git', ['branch', '--show-current'], { cwd: workspaceRoot });
  if (branch?.blocked) {
    childProcessProbe = {
      status: 'BLOCKED',
      details: branch.details,
    };
    return {
      childProcessProbe,
      branch: '',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions,
      codexSessionStats: await collectCodexSessionStats(),
      gitObjectHealth: { count: 0, size: 'unknown', inPack: 0, sizePack: 'unknown' },
      gitLfsVersion: '',
      runtimeSkillSeedFiles: [],
      releaseVerifyEvidence: { found: false, path: '', verifyEvidence: false, skipped: false, raw: '' },
    };
  }
  const mainOriginRaw = await runCommand('git', ['rev-list', '--left-right', '--count', 'main...origin/main'], {
    cwd: workspaceRoot,
  });
  const appStatusRaw = await runCommand('git', ['status', '--short', '--', '.'], { cwd: workspaceRoot });
  const rootStatusRaw = await runCommand('git', ['status', '--short'], { cwd: workspaceRoot });
  const gitObjectRaw = await runCommand('git', ['count-objects', '-vH'], { cwd: workspaceRoot });
  const gitLfsVersion = await runCommand('git', ['lfs', 'version'], { cwd: workspaceRoot });

  for (const [id, configuredCommand, args] of REQUIRED_COMMANDS) {
    const command = configuredCommand ?? pnpm;
    commandVersions[id] = await runCommand(command, args, {
      cwd: workspaceRoot,
      shell: platform === 'win32' && command.endsWith('.cmd'),
      env,
    });
  }

  return {
    childProcessProbe,
    branch,
    mainOriginCounts: parseMainOriginCounts(mainOriginRaw),
    appStatusLines: appStatusRaw ? appStatusRaw.split(/\r?\n/).filter(Boolean) : [],
    rootStatusLines: rootStatusRaw ? rootStatusRaw.split(/\r?\n/).filter(Boolean) : [],
    commandVersions,
    codexSessionStats: await collectCodexSessionStats(),
    gitObjectHealth: parseGitObjectHealth(gitObjectRaw),
    gitLfsVersion,
    runtimeSkillSeedFiles: await collectRuntimeSkillSeedStatus(workspaceRoot),
    releaseVerifyEvidence: await collectLatestReleaseVerifyEvidence(workspaceRoot),
  };
}

function buildReleasePreflightReport({
  settings = parseArgs([]),
  platform = process.platform,
  env = process.env,
  probes = {},
} = {}) {
  const checks = [];
  const pnpm = pnpmCommand(platform);
  const childProcessProbe = probes.childProcessProbe ?? {
    status: 'PASS',
    details: 'child process execution is available',
  };
  const dryRun = settings.dryRun === true;
  const commandVersions = probes.commandVersions ?? {};
  const blockedProbeDetails = [
    childProcessProbe.status === 'BLOCKED' ? childProcessProbe.details : '',
    ...Object.values(commandVersions).filter(isBlockedProbeResult).map((value) => value.details),
  ].map((details) => String(details ?? '').trim()).filter(Boolean);
  const childProcessBlocked = blockedProbeDetails.length > 0;
  const localProbeSkipped = dryRun || childProcessBlocked;
  const childProcessDetails = blockedProbeDetails[0] ?? childProcessProbe.details;

  checks.push(createCheck(
    'runtime.childProcess',
    'Node child process execution',
    childProcessBlocked ? 'FAIL' : dryRun ? 'WARN' : 'PASS',
    childProcessBlocked
      ? childProcessDetails ?? 'child process execution is blocked'
      : dryRun
        ? 'dry-run: child process execution was not probed; non-dry release preflight uses Node child_process probes'
        : childProcessProbe.details ?? 'child process execution is available',
    'Run release preflight from a local shell or CI runner that permits Node child_process probes.',
  ));

  const branch = String(probes.branch ?? '').trim();
  checks.push(createCheck(
    'git.branch',
    'Git branch',
    localProbeSkipped ? 'WARN' : branch === 'main' ? 'PASS' : 'FAIL',
    childProcessBlocked
      ? 'current branch was not probed because child process execution is blocked'
      : dryRun
        ? 'dry-run: current branch was not probed'
      : branch ? `current branch: ${branch}` : 'current branch could not be detected',
    'Switch to main before cutting a release.',
  ));

  const mainOriginCounts = probes.mainOriginCounts ?? { behind: 0, ahead: 0 };
  checks.push(createCheck(
    'git.sync',
    'Main/origin sync',
    localProbeSkipped
      ? 'WARN'
      : mainOriginCounts.behind === 0 && mainOriginCounts.ahead === 0 ? 'PASS' : 'FAIL',
    childProcessBlocked
      ? 'main...origin/main was not probed because child process execution is blocked'
      : dryRun
        ? 'dry-run: main...origin/main sync was not probed'
      : `main...origin/main behind=${mainOriginCounts.behind} ahead=${mainOriginCounts.ahead}`,
    'Pull/rebase or push until main and origin/main are identical.',
  ));

  const appStatusLines = probes.appStatusLines ?? [];
  checks.push(createCheck(
    'git.appClean',
    'Application worktree',
    localProbeSkipped ? 'WARN' : appStatusLines.length === 0 ? 'PASS' : 'FAIL',
    childProcessBlocked
      ? 'application worktree was not probed because child process execution is blocked'
      : dryRun
        ? 'dry-run: application worktree was not probed'
      : appStatusLines.length === 0 ? 'sdkwork-clawrouter has no uncommitted files' : appStatusLines.join('; '),
    'Commit or intentionally shelve sdkwork-clawrouter changes before release packaging.',
  ));

  const rootStatusLines = probes.rootStatusLines ?? [];
  checks.push(createCheck(
    'git.rootClean',
    'Repository root worktree',
    localProbeSkipped
      ? 'WARN'
      : rootStatusLines.length === 0 ? 'PASS' : settings.strictRootClean ? 'FAIL' : 'WARN',
    childProcessBlocked
      ? 'repository root worktree was not probed because child process execution is blocked'
      : dryRun
        ? 'dry-run: repository root worktree was not probed'
      : rootStatusLines.length === 0 ? 'repository root has no uncommitted files' : `${rootStatusLines.length} root-level dirty entries`,
    'Review unrelated root changes before tagging or creating a release bundle.',
  ));

  for (const [id, configuredCommand] of REQUIRED_COMMANDS) {
    const command = configuredCommand ?? pnpm;
    const rawVersion = commandVersions[id];
    const versionBlocked = isBlockedProbeResult(rawVersion);
    const version = probeResultDetails(rawVersion);
    checks.push(createCheck(
      `tools.${id}`,
      `${command} availability`,
      localProbeSkipped ? 'WARN' : version ? 'PASS' : 'FAIL',
      childProcessBlocked && versionBlocked
        ? `${command} was not probed because child process execution is blocked: ${version}`
        : childProcessBlocked
        ? `${command} was not probed because child process execution is blocked`
        : dryRun
          ? version || `dry-run: would run ${command} --version`
        : version || `${command} is not available from this shell`,
      childProcessBlocked
        ? 'Run release preflight from a local shell or CI runner that permits Node child_process probes.'
        : `Install ${command} or fix PATH before running release verification.`,
    ));
  }

  const postgresUrl = String(env.SDKWORK_DATABASE_URL ?? '').trim();
  const envFileLabel = settings.envFile || RELEASE_ENVIRONMENT_CONTRACT.profileFile;
  const contractIssues = releaseEnvironmentIssues(env);
  checks.push(createCheck(
    'env.releaseContract',
    'Release environment contract',
    contractIssues.length === 0 ? 'PASS' : settings.strict ? 'FAIL' : 'WARN',
    contractIssues.length === 0
      ? `release environment contract v${RELEASE_ENVIRONMENT_CONTRACT.version} is satisfied; env file: ${envFileLabel}`
      : `${contractIssues.join('; ')}; use ${RELEASE_ENVIRONMENT_CONTRACT.exampleFile} as the reference template and run pnpm.cmd release:env:write from release host process environment`,
    `Run pnpm.cmd release:env:write -- --check, then pnpm.cmd release:env:write, then release preflight with --env-file ${RELEASE_ENVIRONMENT_CONTRACT.profileFile}.`,
  ));

  checks.push(createCheck(
    'env.postgres',
    'Postgres runtime configuration',
    'PASS',
    postgresUrl
      ? 'SDKWORK_DATABASE_URL process override is configured'
      : 'SDKWORK_DATABASE_URL is not set; structured runtime TOML remains authoritative',
    'Use structured runtime TOML for release hosts; set SDKWORK_DATABASE_URL only as an explicit process override.',
  ));

  const missingPortalRequiredEnv = missingEnv(env, REQUIRED_PORTAL_PUBLIC_ENV);
  const portalSdkBaseUrl = String(env.PORTAL_PUBLIC_SDK_BASE_URL ?? '').trim();
  const missingPortalSurfaceBaseUrls = missingEnv(env, PORTAL_PUBLIC_SURFACE_BASE_URL_ENV);
  const portalPublicIssues = [
    ...missingPortalRequiredEnv,
    ...(!portalSdkBaseUrl && missingPortalSurfaceBaseUrls.length > 0
      ? [`missing common SDK root or surface overrides: ${missingPortalSurfaceBaseUrls.join(', ')}`]
      : []),
  ];
  checks.push(createCheck(
    'env.portalPublic',
    'Portal public runtime environment',
    portalPublicIssues.length === 0 ? 'PASS' : settings.strict ? 'FAIL' : 'WARN',
    portalPublicIssues.length === 0
      ? portalSdkBaseUrl
        ? 'common public SDK base URL and portal public flags are configured'
        : 'public SDK surface override base URLs and portal public flags are configured'
      : `missing: ${portalPublicIssues.join('; ')}`,
    'Set PORTAL_PUBLIC_SDK_BASE_URL as the common SDK root, or set the per-surface public API base URL overrides.',
  ));

  const codexSessionStats = probes.codexSessionStats ?? { count: 0, totalBytes: 0 };
  const codexStatus = dryRun
    ? 'WARN'
    : codexSessionStats.count > CODEX_SESSION_WARN_COUNT
    || codexSessionStats.totalBytes > CODEX_SESSION_WARN_BYTES
    ? 'WARN'
    : 'PASS';
  checks.push(createCheck(
    'io.codexSessions',
    'Codex session IO footprint',
    codexStatus,
    dryRun
      ? 'dry-run: Codex session IO footprint was not probed'
      : `${codexSessionStats.count} session files, ${formatBytes(codexSessionStats.totalBytes)}`,
    'Archive old Codex session jsonl files outside the active Codex sessions directory when command input becomes sluggish.',
  ));

  const gitObjectHealth = probes.gitObjectHealth ?? { count: 0, size: 'unknown', inPack: 0, sizePack: 'unknown' };
  checks.push(createCheck(
    'io.gitObjects',
    'Git object IO footprint',
    localProbeSkipped || gitObjectHealth.count > GIT_LOOSE_OBJECT_WARN_COUNT ? 'WARN' : 'PASS',
    childProcessBlocked
      ? 'Git object IO footprint was not probed because child process execution is blocked'
      : dryRun
      ? 'dry-run: Git object IO footprint was not probed'
      : `loose objects=${gitObjectHealth.count}, loose size=${gitObjectHealth.size}, packed=${gitObjectHealth.inPack}, pack size=${gitObjectHealth.sizePack}`,
    'Ask before running destructive git cleanup; git prune/gc should not be run implicitly.',
  ));

  const gitLfsVersion = probes.gitLfsVersion;
  const gitLfsVersionBlocked = isBlockedProbeResult(gitLfsVersion);
  const gitLfsVersionDetails = probeResultDetails(gitLfsVersion);
  checks.push(createCheck(
    'tools.gitLfs',
    'Git LFS availability',
    localProbeSkipped ? 'WARN' : gitLfsVersionDetails ? 'PASS' : 'WARN',
    childProcessBlocked && gitLfsVersionBlocked
      ? `git lfs was not probed because child process execution is blocked: ${gitLfsVersionDetails}`
      : childProcessBlocked
      ? 'git lfs was not probed because child process execution is blocked'
      : dryRun
        ? gitLfsVersionDetails || 'dry-run: would run git lfs version'
      : gitLfsVersionDetails || 'git lfs is not available from this shell; release packaging no longer requires LFS hydration',
    'Git LFS is only needed when refreshing large ClawHub mirror snapshots, not for release package builds.',
  ));

  const runtimeSkillSeedFiles = probes.runtimeSkillSeedFiles ?? [];
  const blockedRuntimeSkillSeedProbe = localProbeSkipped || runtimeSkillSeedFiles.length === 0;
  const invalidRuntimeSkillSeedFiles = runtimeSkillSeedFiles.filter((file) =>
    file.validJson !== true || file.pointer === true
  );
  checks.push(createCheck(
    'data.runtimeSkillSeeds',
    'Runtime skill seed JSON',
    blockedRuntimeSkillSeedProbe ? 'WARN' : invalidRuntimeSkillSeedFiles.length === 0 ? 'PASS' : 'FAIL',
    childProcessBlocked
      ? 'runtime skill seed files were not probed because child process execution is blocked'
      : dryRun
      ? 'dry-run: runtime skill seed JSON was not probed'
      : blockedRuntimeSkillSeedProbe
      ? 'runtime skill seed JSON was not probed'
      : invalidRuntimeSkillSeedFiles.length === 0
      ? `${runtimeSkillSeedFiles.length} runtime skill seed JSON files are readable and not Git LFS pointers`
      : `invalid runtime skill seed JSON files: ${invalidRuntimeSkillSeedFiles.map((file) => file.path).join(', ')}`,
    'Regenerate the curated runtime skill seed JSON; do not commit LFS pointers for files compiled with Rust include_str!.',
  ));

  const releaseVerifyEvidence = probes.releaseVerifyEvidence
    ?? { found: false, path: '', verifyEvidence: false, skipped: false, raw: '' };
  const skipVerifyFlag = String(env[SDKWORK_RELEASE_SKIP_VERIFY] ?? '').trim() === '1';
  let verifyStatus = 'PASS';
  let verifyDetails = '';
  let verifyRecommendation = '';
  if (skipVerifyFlag) {
    verifyStatus = settings.strict ? 'FAIL' : 'WARN';
    verifyDetails = `${SDKWORK_RELEASE_SKIP_VERIFY}=1 is set; full pnpm verify is being skipped. This is only allowed for emergency hotfixes and must be documented in the release record.`;
    verifyRecommendation = `Unset ${SDKWORK_RELEASE_SKIP_VERIFY} and run \`pnpm verify\` before the next release.`;
  } else if (releaseVerifyEvidence.skipped) {
    verifyStatus = settings.strict ? 'FAIL' : 'WARN';
    verifyDetails = `latest release record (${releaseVerifyEvidence.path || 'none'}) contains skip language; full pnpm verify was not run or was recorded as skipped.`;
    verifyRecommendation = 'Run `pnpm verify` and record the result in the release record before publishing.';
  } else if (!releaseVerifyEvidence.verifyEvidence) {
    verifyStatus = settings.strict ? 'FAIL' : 'WARN';
    verifyDetails = releaseVerifyEvidence.found
      ? `latest release record (${releaseVerifyEvidence.path}) does not record \`pnpm verify\` as run.`
      : 'no dated release record was found under docs/release; verify evidence is missing.';
    verifyRecommendation = 'Run `pnpm verify` before tagging the release and record it under the Verification section.';
  } else {
    verifyDetails = releaseVerifyEvidence.found
      ? `latest release record (${releaseVerifyEvidence.path}) records pnpm verify evidence.`
      : 'pnpm verify evidence will be required in the release record.';
  }
  checks.push(createCheck(
    'release.verify',
    'Full pnpm verify before release',
    verifyStatus,
    verifyDetails,
    verifyRecommendation,
  ));

  const recommendedCommands = [
    commandLine(pnpm, ['models:check']),
    commandLine(pnpm, ['verify']),
    commandLine(pnpm, ['test:postgres:required']),
    commandLine(pnpm, ['topology:plan:server']),
    commandLine(pnpm, ['clean:fast', '--', '--dry-run']),
  ];

  const summary = {
    pass: checks.filter((check) => check.status === 'PASS').length,
    warn: checks.filter((check) => check.status === 'WARN').length,
    fail: checks.filter((check) => check.status === 'FAIL').length,
  };

  return {
    generatedAt: new Date().toISOString(),
    settings,
    summary,
    checks,
    recommendedCommands,
    exitCode: summary.fail > 0 ? 1 : 0,
  };
}

function formatTextReport(report) {
  const lines = [
    'sdkwork-clawrouter release preflight',
    `Summary: PASS=${report.summary.pass} WARN=${report.summary.warn} FAIL=${report.summary.fail}`,
    '',
    'Checks:',
  ];

  const maxTitleLength = Math.max(...report.checks.map((check) => check.title.length));
  for (const check of report.checks) {
    lines.push(`  ${check.status.padEnd(4)} ${check.title.padEnd(maxTitleLength)} ${check.details}`);
    if (check.status !== 'PASS' && check.recommendation) {
      lines.push(`       recommendation: ${check.recommendation}`);
    }
  }

  lines.push('', 'Recommended next commands:');
  for (const command of report.recommendedCommands) {
    lines.push(`  ${command}`);
  }

  return lines.join('\n');
}

function formatReport(report, { json = false } = {}) {
  if (json) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  return `${formatTextReport(report)}\n`;
}

function buildDryRunProbes(platform = process.platform) {
  return {
    childProcessProbe: {
      status: 'DRY_RUN',
      details: 'dry-run: child process execution was not probed',
    },
    branch: 'main',
    mainOriginCounts: { behind: 0, ahead: 0 },
    appStatusLines: [],
    rootStatusLines: [],
    commandVersions: Object.fromEntries(
      REQUIRED_COMMANDS.map(([id, configuredCommand, args]) => [
        id,
        `dry-run: would run ${commandLine(configuredCommand ?? pnpmCommand(platform), args)}`,
      ]),
    ),
    codexSessionStats: { count: 0, totalBytes: 0 },
    gitObjectHealth: { count: 0, size: '0 bytes', inPack: 0, sizePack: '0 bytes' },
    gitLfsVersion: 'dry-run: would run git lfs version',
    runtimeSkillSeedFiles: [],
    releaseVerifyEvidence: { found: false, path: '', verifyEvidence: false, skipped: false, raw: '' },
  };
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const workspaceRoot = path.resolve(import.meta.dirname, '..');
  let env = process.env;
  if (settings.envFile) {
    const envFileContent = await readReleaseEnvFile(settings.envFile, workspaceRoot);
    env = mergeEnvWithEnvFile(process.env, envFileContent);
  }

  const probes = settings.dryRun
    ? buildDryRunProbes()
    : await collectReleasePreflightProbes({
      workspaceRoot,
      platform: process.platform,
      env,
    });

  const report = buildReleasePreflightReport({
    settings,
    platform: process.platform,
    env,
    probes,
  });
  process.stdout.write(formatReport(report, { json: settings.json }));
  process.exitCode = report.exitCode;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[release-preflight] ${error.message}`);
    process.exit(1);
  });
}

export {
  RELEASE_ENVIRONMENT_CONTRACT,
  buildDryRunProbes,
  buildReleasePreflightReport,
  collectCodexSessionStats,
  collectLatestReleaseVerifyEvidence,
  collectRuntimeSkillSeedStatus,
  collectReleasePreflightProbes,
  formatBytes,
  formatReport,
  isHttpOrRootRelativeRuntimePath,
  isPostgresDatabaseUrl,
  mergeEnvWithEnvFile,
  parseArgs,
  parseEnvFileContent,
  parseGitObjectHealth,
  parseMainOriginCounts,
  pnpmCommand,
  releaseEnvironmentIssues,
};
