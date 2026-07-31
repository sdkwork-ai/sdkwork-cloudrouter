#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRuntimeConfigTemplate } from './build-claw-router-install-package.mjs';
import { ensureClawRouterEnvForLifecycle } from './dev/claw-router-application-env.mjs';
import { productionGatewayBinaryPath } from './claw-router-production-artifacts.mjs';
import {
  mergePortalPublicRuntimeEnv,
  portalPublicRuntimeEnvLineValue,
} from './portal-public-runtime-env.mjs';
import {
  CLAW_ROUTER_EDGE_ENV_KEYS,
  buildRuntimeEdgePrivateEnv,
  resolveEdgeEnvValue,
} from './lib/claw-router-edge-env-contract.mjs';
import {
  LINUX_SERVICE_CONFIG_ROOT,
  LINUX_SERVICE_DATA_ROOT,
  redisPolicyFor,
} from './plan-claw-router-install-packages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const portalDist = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'dist');
const SERVER_DEFAULT_POSTGRES_HOST = 'db.example.com';
const SERVER_DEFAULT_POSTGRES_PORT = 5432;
const SERVER_DEFAULT_POSTGRES_DATABASE = 'sdkwork_ai_prod';
const SERVER_DEFAULT_POSTGRES_USERNAME = 'sdkwork_ai_prod';
const SERVER_DEFAULT_POSTGRES_PASSWORD = 'change-me';
const SERVER_DEFAULT_POSTGRES_SSL_MODE = 'require';
const SERVER_DEFAULT_POSTGRES_URL = `postgresql://${encodeURIComponent(SERVER_DEFAULT_POSTGRES_USERNAME)}:${SERVER_DEFAULT_POSTGRES_PASSWORD}@${SERVER_DEFAULT_POSTGRES_HOST}:${SERVER_DEFAULT_POSTGRES_PORT}/${SERVER_DEFAULT_POSTGRES_DATABASE}?sslmode=${SERVER_DEFAULT_POSTGRES_SSL_MODE}`;
const EXAMPLE_POSTGRES_URL = `postgresql://${encodeURIComponent(SERVER_DEFAULT_POSTGRES_USERNAME)}:<password>@db.example.com:5432/${SERVER_DEFAULT_POSTGRES_DATABASE}`;

function cargoCommand(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function buildStartProductionHelpText() {
  return `Usage: node scripts/start-claw-router-production.mjs [options]

Start the production portal through the Rust edge server.

Options:
  --server-bind <bind>
                  Rust edge server HOST:PORT override (default 0.0.0.0:3900).
  --gateway-forward-url <url>
                  Rust edge server target origin for /v1 and /openapi.json.
  --backend-api-forward-url <url>
                  Rust edge server target origin for /backend/v3/api.
  --app-api-forward-url <url>
                  Rust edge server target origin for /app/v3/api.
  --forwarding-mode
                  Start the edge server in forwarding mode instead of the default all-in-one API runtime.
  --distributed  Deprecated alias for --forwarding-mode.
  --deployment-mode <mode>
                  Runtime config profile: server or desktop (default server).
  --config-file <path>
                  Runtime TOML config path. Defaults to the OS-standard location.
  --database-url <url>
                  PostgreSQL or SQLite URL used when initializing a missing config file.
  --database-max-connections <n>
                  Database pool size used when initializing a missing config file.
  --init-config-only
                  Initialize the runtime config file and print startup help without launching.
  --external-scheme <scheme>
                  External request scheme reported upstream: http or https.
  --trust-forwarded-headers
                  Trust inbound x-forwarded-host/proto/for from a controlled proxy.
  --dry-run       Print the production access matrix without starting Cargo.
  -h, --help      Show this help.

Runtime config initialization:
  Missing runtime TOML files are created automatically before startup.
  Server deployments use external PostgreSQL by default.
  Configure PostgreSQL in clawrouter.toml with host, database, username,
  and password_file or protected password.
  Desktop deployments default to SQLite and can start from the generated config.

Common initialization commands:
  pnpm start -- --init-config-only --deployment-mode server
  pnpm start -- --init-config-only --deployment-mode desktop

Production PostgreSQL configuration:
  SDKWORK_DATABASE_URL="${EXAMPLE_POSTGRES_URL}" pnpm start -- --deployment-mode server
  pnpm start -- --deployment-mode server --database-url "${EXAMPLE_POSTGRES_URL}"
  Or edit [database] in the generated runtime TOML.

Default runtime config paths:
  Linux server: /etc/sdkwork/router/clawrouter.toml
  Linux desktop: ~/.sdkwork/router/config/clawrouter.toml
  Windows server: %ProgramData%/sdkwork/router/clawrouter.toml
  Windows desktop: %USERPROFILE%/.sdkwork/router/config/clawrouter.toml
  macOS server: /Library/Application Support/sdkwork/router/clawrouter.toml
  macOS desktop: ~/.sdkwork/router/config/clawrouter.toml
`;
}

function printHelp() {
  console.log(buildStartProductionHelpText());
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function splitBind(bind, flagName) {
  const match = String(bind ?? '').trim().match(/^(.*):(\d+)$/u);
  if (!match) {
    throw new Error(`${flagName} must be a host:port value`);
  }

  const host = match[1];
  const port = Number.parseInt(match[2], 10);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${flagName} must be a host:port value`);
  }

  return { host, port: String(port) };
}

function originUrl(value, flagName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin without path, query, or hash`);
  }

  return parsed.origin;
}

function normalizeExternalScheme(value, flagName) {
  const scheme = String(value ?? '').trim().toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') {
    throw new Error(`${flagName} must be http or https`);
  }
  return scheme;
}

function appendPath(origin, pathSuffix) {
  return `${String(origin).replace(/\/+$/u, '')}${pathSuffix}`;
}

function normalizePlatform(platform = process.platform) {
  if (platform === 'win32' || platform === 'windows') {
    return 'windows';
  }
  if (platform === 'darwin' || platform === 'macos' || platform === 'mac') {
    return 'macos';
  }
  return 'linux';
}

function toPortablePath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function parseStartProductionArgs(argv) {
  const settings = {
    help: false,
    dryRun: false,
    initConfigOnly: false,
    forwardingMode: false,
    deploymentMode: null,
    configFile: null,
    databaseUrl: null,
    databaseMaxConnections: null,
    serverBind: null,
    gatewayForwardUrl: null,
    backendApiForwardUrl: null,
    appApiForwardUrl: null,
    externalScheme: null,
    trustForwardedHeaders: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--init-config-only':
        settings.initConfigOnly = true;
        break;
      case '--forwarding-mode':
      case '--distributed':
        settings.forwardingMode = true;
        break;
      case '--deployment-mode':
        settings.deploymentMode = normalizeDeploymentMode(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--config-file':
        settings.configFile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--database-url':
        settings.databaseUrl = originDatabaseUrl(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--database-max-connections':
        settings.databaseMaxConnections = normalizePositiveIntegerValue(
          requireValue(argv, index, arg),
          arg,
        );
        index += 1;
        break;
      case '--server-bind':
        settings.serverBind = requireValue(argv, index, arg);
        splitBind(settings.serverBind, arg);
        index += 1;
        break;
      case '--gateway-forward-url':
        settings.gatewayForwardUrl = originUrl(requireValue(argv, index, arg), arg);
        settings.forwardingMode = true;
        index += 1;
        break;
      case '--backend-api-forward-url':
        settings.backendApiForwardUrl = originUrl(requireValue(argv, index, arg), arg);
        settings.forwardingMode = true;
        index += 1;
        break;
      case '--app-api-forward-url':
        settings.appApiForwardUrl = originUrl(requireValue(argv, index, arg), arg);
        settings.forwardingMode = true;
        index += 1;
        break;
      case '--external-scheme':
        settings.externalScheme = normalizeExternalScheme(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--trust-forwarded-headers':
        settings.trustForwardedHeaders = true;
        break;
      default:
        throw new Error(`Unsupported production start option: ${arg}`);
    }
  }

  return settings;
}

function normalizeDeploymentMode(value, flagName = 'deployment mode') {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode !== 'server' && mode !== 'desktop') {
    throw new Error(`${flagName} must be server or desktop`);
  }
  return mode;
}

function normalizePositiveIntegerValue(value, flagName) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/u.test(normalized)) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return normalized;
}

function originDatabaseUrl(value, flagName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${flagName} must be a PostgreSQL or SQLite connection string`);
  }
  if (
    normalized.startsWith('sqlite:')
    || normalized.startsWith('postgres://')
    || normalized.startsWith('postgresql://')
  ) {
    return normalized;
  }
  throw new Error(`${flagName} must be a PostgreSQL or SQLite connection string`);
}

function runtimeConfigLocationForPlatform(
  platform,
  deploymentMode,
  env = process.env,
) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedDeploymentMode = normalizeDeploymentMode(deploymentMode);
  const getEnv = (key) => String(env?.[key] ?? '').trim();
  if (normalizedPlatform === 'windows') {
    if (normalizedDeploymentMode === 'server') {
      const programData = getEnv('ProgramData') || getEnv('PROGRAMDATA') || 'C:/ProgramData';
      const root = joinRuntimePath(programData, 'sdkwork/router');
      return {
        configFile: joinRuntimePath(root, 'clawrouter.toml'),
        dataDirectory: joinRuntimePath(root, 'Data'),
        sqlitePath: joinRuntimePath(root, 'Data/clawrouter.sqlite'),
      };
    }
    const userProfile = getEnv('USERPROFILE')
      || `${getEnv('HOMEDRIVE')}${getEnv('HOMEPATH')}`.trim()
      || 'C:/Users/Default';
    const root = joinRuntimePath(userProfile, '.sdkwork/router');
    const dataDirectory = joinRuntimePath(root, 'data');
    return {
      configFile: joinRuntimePath(root, 'config/clawrouter.toml'),
      dataDirectory,
      sqlitePath: joinRuntimePath(dataDirectory, 'clawrouter.sqlite'),
    };
  }
  if (normalizedPlatform === 'macos') {
    if (normalizedDeploymentMode === 'server') {
      const root = '/Library/Application Support/sdkwork/router';
      return {
        configFile: joinRuntimePath(root, 'clawrouter.toml'),
        dataDirectory: joinRuntimePath(root, 'Data'),
        sqlitePath: joinRuntimePath(root, 'Data/clawrouter.sqlite'),
      };
    }
    const home = getEnv('HOME') || '~';
    const root = joinRuntimePath(home, '.sdkwork/router');
    const dataDirectory = joinRuntimePath(root, 'data');
    return {
      configFile: joinRuntimePath(root, 'config/clawrouter.toml'),
      dataDirectory,
      sqlitePath: joinRuntimePath(dataDirectory, 'clawrouter.sqlite'),
    };
  }

  if (normalizedDeploymentMode === 'server') {
    return {
      configFile: `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
      dataDirectory: LINUX_SERVICE_DATA_ROOT,
      sqlitePath: `${LINUX_SERVICE_DATA_ROOT}/clawrouter.sqlite`,
    };
  }
  const home = getEnv('HOME') || '~';
  const root = joinRuntimePath(home, '.sdkwork/router');
  const dataDirectory = joinRuntimePath(root, 'data');
  return {
    configFile: joinRuntimePath(root, 'config/clawrouter.toml'),
    dataDirectory,
    sqlitePath: joinRuntimePath(dataDirectory, 'clawrouter.sqlite'),
  };
}

function runtimeConfigLocationWithExplicitConfigFile(defaults, configFile) {
  const normalizedConfigFile = String(configFile ?? '').trim();
  if (!normalizedConfigFile || normalizedConfigFile === defaults.configFile) {
    return {
      ...defaults,
      configFile: normalizedConfigFile || defaults.configFile,
    };
  }
  const configParent = path.dirname(normalizedConfigFile).replaceAll('\\', '/');
  const dataDirectory = configParent && configParent !== '.'
    ? joinRuntimePath(configParent, 'Data')
    : defaults.dataDirectory;
  return {
    configFile: normalizedConfigFile,
    dataDirectory,
    sqlitePath: joinRuntimePath(dataDirectory, 'clawrouter.sqlite'),
  };
}

function joinRuntimePath(base, child) {
  const normalizedBase = String(base ?? '').trim().replaceAll('\\', '/').replace(/\/+$/u, '');
  const normalizedChild = String(child ?? '').trim().replaceAll('\\', '/').replace(/^\/+/u, '');
  if (!normalizedBase) {
    return normalizedChild;
  }
  if (!normalizedChild) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedChild}`;
}

function runtimeConfigEngineForMode(deploymentMode) {
  return normalizeDeploymentMode(deploymentMode) === 'desktop' ? 'sqlite' : 'postgresql';
}

function runtimeConfigSqliteUrl(sqlitePath) {
  const normalizedPath = String(sqlitePath ?? '').trim();
  if (!normalizedPath) {
    throw new Error('desktop runtime config requires a SQLite path');
  }
  const portablePath = path.isAbsolute(normalizedPath)
    || normalizedPath.startsWith('~')
    || normalizedPath.startsWith('$')
    || normalizedPath.startsWith('%')
    ? toPortablePath(normalizedPath)
    : toPortablePath(path.resolve(normalizedPath));
  return `sqlite://${portablePath}`;
}

function runtimeConfigDefaultUrlForMode(deploymentMode, sqlitePath = null) {
  if (normalizeDeploymentMode(deploymentMode) === 'desktop') {
    return runtimeConfigSqliteUrl(sqlitePath);
  }
  return SERVER_DEFAULT_POSTGRES_URL;
}

function runtimeConfigDefaultMaxConnectionsForMode(deploymentMode) {
  return normalizeDeploymentMode(deploymentMode) === 'desktop' ? 1 : 16;
}

function runtimeConfigRedactedUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) {
    return '(missing)';
  }
  if (trimmed.startsWith('sqlite:')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const username = parsed.username ? `${parsed.username}:***@` : '';
    parsed.username = '';
    parsed.password = '';
    return `${parsed.protocol}//${username}${parsed.host}${parsed.pathname}`;
  } catch {
    return trimmed.replace(/:\/\/([^@/]+)@/u, '://***@');
  }
}

function runtimeConfigTemplateContent({
  deploymentMode,
  configFile,
  dataDirectory,
  databaseUrl,
  databaseEngine,
  maxConnections,
  sqlitePath,
}) {
  const normalizedDeploymentMode = normalizeDeploymentMode(deploymentMode);
  const runtimeProfile = normalizedDeploymentMode === 'desktop' ? 'desktop' : 'server';
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  return createRuntimeConfigTemplate({
    runtimeProfile: deploymentMode,
    deploymentMode: normalizedDeploymentMode,
    platform,
    databasePolicy: {
      defaultEngine: databaseEngine,
      defaultUrl: databaseUrl,
      ...(databaseEngine === 'postgresql'
        ? {
          defaultHost: SERVER_DEFAULT_POSTGRES_HOST,
          defaultPort: SERVER_DEFAULT_POSTGRES_PORT,
          defaultDatabase: SERVER_DEFAULT_POSTGRES_DATABASE,
          defaultUsername: SERVER_DEFAULT_POSTGRES_USERNAME,
          passwordFile: {
            path: runtimeConfigPasswordFileForMode(deploymentMode, configFile, dataDirectory),
            required: true,
          },
        }
        : {}),
      defaultSqlitePath: sqlitePath,
      defaultSqliteUrl: sqlitePath ? runtimeConfigSqliteUrl(sqlitePath) : null,
      productionDatabaseUrlExample: EXAMPLE_POSTGRES_URL,
      maxConnections,
      configFile: {
        path: configFile,
      },
      dataDirectory: {
        path: dataDirectory,
      },
    },
    redisPolicy: redisPolicyFor({
      platform,
      runtimeProfile,
      deploymentMode: normalizedDeploymentMode,
    }),
  });
}

function runtimeConfigPasswordFileForMode(deploymentMode, configFile, dataDirectory) {
  if (normalizeDeploymentMode(deploymentMode) === 'desktop') {
    return null;
  }
  const normalizedConfigFile = toPortablePath(configFile);
  if (normalizedConfigFile === `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`) {
    return `${LINUX_SERVICE_CONFIG_ROOT}/database.secret`;
  }
  const normalizedDataDirectory = toPortablePath(dataDirectory);
  if (normalizedConfigFile.endsWith('/clawrouter.toml')) {
    return `${normalizedConfigFile.slice(0, -'/clawrouter.toml'.length)}/database.secret`;
  }
  return joinRuntimePath(normalizedDataDirectory, 'database.secret');
}

function readRuntimeConfigSnapshot(configFile, env = process.env) {
  if (!configFile || !existsSync(configFile)) {
    return {
      exists: false,
      content: null,
      databaseUrl: null,
      databaseEngine: null,
      maxConnections: null,
      host: null,
      port: null,
      database: null,
      username: null,
      password: null,
      passwordFile: null,
      passwordFileValue: null,
      passwordFileError: null,
      sslMode: null,
    };
  }
  const content = readFileSync(configFile, 'utf8');
  return runtimeConfigSnapshotFromContent(content, configFile, env);
}

function runtimeConfigSnapshotFromContent(content, configFile = null, env = process.env) {
  const databaseSection = runtimeConfigSection(content, 'database');
  const databaseUrl = matchConfigValue(databaseSection, 'url');
  const databaseEngine = matchConfigValue(databaseSection, 'engine');
  const maxConnections = matchConfigNumber(databaseSection, 'max_connections');
  const host = matchConfigValue(databaseSection, 'host');
  const port = matchConfigNumber(databaseSection, 'port');
  const database = matchConfigValue(databaseSection, 'database');
  const username = matchConfigValue(databaseSection, 'username');
  const password = matchConfigValue(databaseSection, 'password');
  const passwordFile = matchConfigValue(databaseSection, 'password_file');
  const sslMode = matchConfigValue(databaseSection, 'ssl_mode');
  const passwordFileSnapshot = readRuntimeConfigPasswordFile(passwordFile, configFile, env);
  return {
    exists: true,
    content,
    databaseUrl: databaseUrl ?? runtimeConfigPostgresUrlFromStructuredFields({
      host,
      port,
      database,
      username,
      password,
      passwordFile,
      passwordFileValue: passwordFileSnapshot.value,
      sslMode,
    }),
    databaseEngine,
    maxConnections,
    host,
    port,
    database,
    username,
    password,
    passwordFile: passwordFileSnapshot.path ?? passwordFile,
    passwordFileValue: passwordFileSnapshot.value,
    passwordFileError: passwordFileSnapshot.error,
    sslMode,
  };
}

function runtimeConfigSection(content, sectionName) {
  const lines = String(content ?? '').split(/\r?\n/u);
  const sectionHeader = `[${sectionName}]`;
  const collected = [];
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[[^\]]+\]\s*$/u.test(trimmed)) {
      if (trimmed === sectionHeader) {
        inSection = true;
        continue;
      }
      if (inSection) {
        break;
      }
    }
    if (inSection) {
      collected.push(line);
    }
  }
  return collected.join('\n');
}

function runtimeConfigPostgresUrlFromStructuredFields({
  host,
  port,
  database,
  username,
  password,
  passwordFile,
  passwordFileValue,
  sslMode,
}) {
  if (!host || !database || !username) {
    return null;
  }
  const passwordValue = password
    ?? passwordFileValue
    ?? (!passwordFile ? SERVER_DEFAULT_POSTGRES_PASSWORD : '');
  const credentials = passwordValue
    ? `${encodeURIComponent(username)}:${encodeURIComponent(passwordValue)}@`
    : `${encodeURIComponent(username)}@`;
  const authority = `${credentials}${host}${port ? `:${port}` : `:${SERVER_DEFAULT_POSTGRES_PORT}`}`;
  const params = new URLSearchParams();
  if (password) {
    // Password already folded into credentials above.
  } else if (passwordFileValue) {
    // Password already folded into credentials above.
  } else if (!passwordFile) {
    // Placeholder password already folded into credentials above.
  }
  if (sslMode) {
    params.set('sslmode', sslMode);
  }
  const query = params.toString();
  return `postgresql://${authority}/${encodeURIComponent(database).replaceAll('%2F', '/')}${query ? `?${query}` : ''}`;
}

function readRuntimeConfigPasswordFile(passwordFile, configFile, env = process.env) {
  const normalizedPasswordFile = String(passwordFile ?? '').trim();
  if (!normalizedPasswordFile) {
    return { path: null, value: null, error: null };
  }
  const resolvedPath = resolveRuntimeConfigPasswordFilePath(
    normalizedPasswordFile,
    configFile,
    env,
  );
  if (!resolvedPath) {
    return { path: normalizedPasswordFile, value: null, error: null };
  }
  try {
    const value = readFileSync(resolvedPath, 'utf8').trim();
    if (!value) {
      return {
        path: toPortablePath(resolvedPath),
        value: null,
        error: `runtime config [database].password_file ${toPortablePath(resolvedPath)} must not be blank`,
      };
    }
    return { path: toPortablePath(resolvedPath), value, error: null };
  } catch (error) {
    return {
      path: toPortablePath(resolvedPath),
      value: null,
      error: `runtime config [database].password_file ${toPortablePath(resolvedPath)} cannot be read: ${error.message}`,
    };
  }
}

function resolveRuntimeConfigPasswordFilePath(passwordFile, configFile, env = process.env) {
  const expanded = expandRuntimePathVariables(passwordFile, env);
  const normalized = expanded.replaceAll('\\', '/');
  if (/^[A-Za-z]:\//u.test(normalized) || path.isAbsolute(expanded)) {
    return expanded;
  }
  const configDirectory = configFile ? path.dirname(configFile) : process.cwd();
  return path.resolve(configDirectory, expanded);
}

function expandRuntimePathVariables(value, env = process.env) {
  let expanded = String(value ?? '');
  expanded = expanded.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu, (match, name) =>
    env?.[name] ? String(env[name]) : match
  );
  expanded = expanded.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/gu, (match, name) =>
    env?.[name] ? String(env[name]) : match
  );
  expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/gu, (match, name) =>
    env?.[name] ? String(env[name]) : match
  );
  if (expanded === '~' || expanded.startsWith('~/') || expanded.startsWith('~\\')) {
    const home = env?.HOME || env?.USERPROFILE;
    if (home) {
      return expanded === '~' ? String(home) : path.join(String(home), expanded.slice(2));
    }
  }
  return expanded;
}

function matchConfigValue(content, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']\\s*$`, 'm');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function matchConfigNumber(content, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(\\d+)\\s*$`, 'm');
  const match = content.match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildRuntimeConfigHelpLines(result) {
  if (!result.blockingIssue) {
    return [];
  }

  const lines = [
    '[start-production] Runtime configuration help',
    `[start-production]   ${result.blockingIssue.message}`,
    `[start-production]   Config file: ${result.configFile}`,
    `[start-production]   Data directory: ${result.dataDirectory}`,
    `[start-production]   Engine: ${result.databaseEngine}`,
  ];

  if (result.deploymentMode === 'server') {
    lines.push(
      `[start-production]   Server deployments use PostgreSQL configured in ${result.configFile}`,
      '[start-production]   Set [database].host, [database].database, [database].username, and [database].password_file',
      '[start-production]   Use [database].password directly only when the runtime TOML is protected as a secret-bearing file',
      `[start-production]   Example: SDKWORK_DATABASE_URL="${EXAMPLE_POSTGRES_URL}" pnpm start -- --deployment-mode server`,
      `[start-production]   CLI override: pnpm start -- --deployment-mode server --database-url "${EXAMPLE_POSTGRES_URL}"`,
      '[start-production]   Initialize only: pnpm start -- --init-config-only --deployment-mode server',
      '[start-production]   Desktop initialize: pnpm start -- --init-config-only --deployment-mode desktop',
    );
  } else {
    lines.push(
      '[start-production]   Desktop runtime defaults to SQLite and creates its config automatically',
      `[start-production]   SQLite file: ${result.sqlitePath}`,
      '[start-production]   Initialize only: pnpm start -- --init-config-only --deployment-mode desktop',
    );
  }

  return lines;
}

function buildRuntimeConfigStatusLines(result) {
  const lines = [
    '[start-production] Runtime Configuration',
    `[start-production]   Deployment mode: ${result.deploymentMode}`,
    `[start-production]   Config file: ${result.configFile}`,
    `[start-production]   Data directory: ${result.dataDirectory}`,
    `[start-production]   Status: ${result.action === 'existing' ? 'reused existing runtime config' : result.action === 'planned' ? 'planned runtime config' : 'created runtime config'}`,
    `[start-production]   Database engine: ${result.databaseEngine}`,
    `[start-production]   Database URL: ${runtimeConfigRedactedUrl(result.databaseUrl)}`,
  ];
  if (result.databaseEngine === 'sqlite' && result.sqlitePath) {
    lines.push(`[start-production]   SQLite file: ${result.sqlitePath}`);
  }
  return lines;
}

function prepareStartProductionRuntimeConfig({
  baseEnv = process.env,
  settings = parseStartProductionArgs([]),
  platform = process.platform,
  write = true,
} = {}) {
  const deploymentMode = normalizeDeploymentMode(
    settings.deploymentMode ?? baseEnv.SDKWORK_CLAW_DEPLOYMENT_MODE ?? 'server',
  );
  const defaults = runtimeConfigLocationForPlatform(platform, deploymentMode, baseEnv);
  const requestedConfigFile = String(
    settings.configFile ?? baseEnv.SDKWORK_CLAW_CONFIG_FILE ?? defaults.configFile,
  ).trim();
  const location = runtimeConfigLocationWithExplicitConfigFile(defaults, requestedConfigFile);
  const configFile = location.configFile;
  const dataDirectory = location.dataDirectory;
  const sqlitePath = location.sqlitePath;
  const explicitDatabaseUrl = String(settings.databaseUrl ?? baseEnv.SDKWORK_DATABASE_URL ?? '').trim();
  const defaultDatabaseUrl = runtimeConfigDefaultUrlForMode(
    deploymentMode,
    sqlitePath,
  );
  const databaseUrl = explicitDatabaseUrl || defaultDatabaseUrl;
  const databaseEngine = runtimeConfigEngineForUrl(databaseUrl)
    || runtimeConfigEngineForMode(deploymentMode);
  const databaseMaxConnections = String(
    settings.databaseMaxConnections
      ?? baseEnv.SDKWORK_DATABASE_MAX_CONNECTIONS
      ?? runtimeConfigDefaultMaxConnectionsForMode(deploymentMode),
  ).trim();
  const configSnapshot = readRuntimeConfigSnapshot(configFile, baseEnv);
  const desiredTemplate = runtimeConfigTemplateContent({
    deploymentMode,
    configFile,
    dataDirectory,
    databaseUrl,
    databaseEngine,
    maxConnections: databaseMaxConnections,
    sqlitePath,
  });
  let action = configSnapshot.exists ? 'existing' : 'planned';

  if (write && !configSnapshot.exists) {
    mkdirSync(path.dirname(configFile), { recursive: true });
    writeFileSync(configFile, desiredTemplate, 'utf8');
    action = 'created';
  }

  const finalConfigSnapshot = configSnapshot.exists
    ? configSnapshot
    : runtimeConfigSnapshotFromContent(desiredTemplate, configFile, baseEnv);
  const normalizedDatabaseUrl = explicitDatabaseUrl
    || finalConfigSnapshot.databaseUrl
    || databaseUrl;
  const normalizedDatabaseEngine = runtimeConfigEngineForUrl(normalizedDatabaseUrl)
    || finalConfigSnapshot.databaseEngine
    || databaseEngine;
  const blockingIssue = determineRuntimeConfigBlockingIssue({
    deploymentMode,
    configFile,
    databaseEngine: normalizedDatabaseEngine,
    databaseUrl: normalizedDatabaseUrl,
    configSnapshot: finalConfigSnapshot,
    explicitDatabaseUrl,
  });
  const result = {
    action,
    deploymentMode,
    configFile,
    dataDirectory,
    sqlitePath,
    databaseEngine: normalizedDatabaseEngine,
    databaseUrl: normalizedDatabaseUrl,
    databaseMaxConnections: finalConfigSnapshot.maxConnections ?? Number.parseInt(databaseMaxConnections, 10),
    env: {
      SDKWORK_CLAW_CONFIG_FILE: configFile,
      SDKWORK_CLAW_DEPLOYMENT_MODE: deploymentMode,
      ...(explicitDatabaseUrl ? { SDKWORK_DATABASE_URL: explicitDatabaseUrl } : {}),
      ...(settings.databaseMaxConnections
        ? { SDKWORK_DATABASE_MAX_CONNECTIONS: String(settings.databaseMaxConnections) }
        : {}),
    },
    helpLines: [],
    blockingIssue,
  };
  result.helpLines = buildRuntimeConfigHelpLines(result);
  return result;
}

function determineRuntimeConfigBlockingIssue({
  deploymentMode,
  configFile,
  databaseEngine,
  databaseUrl,
  configSnapshot,
  explicitDatabaseUrl,
}) {
  if (deploymentMode !== 'server') {
    return null;
  }
  if (databaseEngine !== 'postgresql') {
    return {
      code: 'database_configuration_required',
      message: `server runtime config ${configFile} requires PostgreSQL; SQLite is client-local only`,
    };
  }
  if (configSnapshot?.password && configSnapshot?.passwordFile) {
    return {
      code: 'database_configuration_required',
      message: `runtime config ${configFile} must use only one of [database].password or [database].password_file`,
    };
  }
  if (explicitDatabaseUrl) {
    const explicitEngine = runtimeConfigEngineForUrl(explicitDatabaseUrl);
    if (explicitEngine === 'postgresql' && !runtimeConfigPostgresUrlUsesPlaceholder(explicitDatabaseUrl)) {
      return null;
    }
    return {
      code: 'database_configuration_required',
      message: `server runtime database override for ${configFile} must be a non-placeholder PostgreSQL URL`,
    };
  }
  if (databaseEngine === 'postgresql' && runtimeConfigPostgresUrlUsesPlaceholder(databaseUrl)) {
    return {
      code: 'database_configuration_required',
      message: `runtime config ${configFile} still contains the default placeholder PostgreSQL host or password`,
    };
  }
  if (databaseEngine === 'postgresql' && configSnapshot?.passwordFileError) {
    return {
      code: 'database_configuration_required',
      message: configSnapshot.passwordFileError,
    };
  }
  return null;
}

function runtimeConfigPostgresUrlUsesPlaceholder(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return false;
  }
  const legacyDefault = 'postgresql://sdkwork_claw_router:change-me@localhost:5432/sdkwork_claw_router';
  const legacyWrongUsername =
    'postgresql://sdkwork_ai_prod:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require';
  const legacyWrongDatabase =
    'postgresql://sdkwork:change-me@db.example.com:5432/sdkwork?sslmode=require';
  if (
    normalized === SERVER_DEFAULT_POSTGRES_URL
    || normalized === legacyDefault
    || normalized === legacyWrongUsername
    || normalized === legacyWrongDatabase
  ) {
    return true;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.username === 'sdkworkprod@2026++') {
      return true;
    }
    return parsed.hostname === SERVER_DEFAULT_POSTGRES_HOST
      || parsed.password === SERVER_DEFAULT_POSTGRES_PASSWORD;
  } catch {
    return false;
  }
}

function runtimeConfigEngineForUrl(value) {
  const url = String(value ?? '').trim();
  if (url.startsWith('sqlite:')) {
    return 'sqlite';
  }
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgresql';
  }
  return null;
}

function mergeRuntimeConfigEnv(baseEnv, runtimeConfig) {
  return {
    ...baseEnv,
    ...runtimeConfig.env,
  };
}

function resolveStartProductionEnv(
  baseEnv = process.env,
  distRoot = portalDist,
  settings = parseStartProductionArgs([]),
) {
  const defaultSdkArchiveRoot = path.join(distRoot, 'sdk-archives');
  const serverBind = settings.serverBind ?? baseEnv.SDKWORK_CLAW_SERVER_BIND ?? '0.0.0.0:3900';
  const edgeBaseUrl = edgeAccessBaseUrl({ SDKWORK_CLAW_SERVER_BIND: serverBind });
  const allInOne = !settings.forwardingMode;
  return {
    ...mergePortalPublicRuntimeEnv(baseEnv),
    SDKWORK_CLAW_EDGE_SERVER: '1',
    SDKWORK_CLAW_ALL_IN_ONE_RUNTIME: allInOne ? '1' : '0',
    SDKWORK_CLAW_ROUTER_PORTAL_STATIC_DIST: distRoot,
    SDKWORK_CLAW_SERVER_BIND: serverBind,
    SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL:
      settings.gatewayForwardUrl
      ?? baseEnv.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL
      ?? (allInOne ? edgeBaseUrl : 'http://127.0.0.1:18080'),
    SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL:
      settings.backendApiForwardUrl
      ?? baseEnv.SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL
      ?? (allInOne ? edgeBaseUrl : 'http://127.0.0.1:18081'),
    SDKWORK_CLAW_EDGE_APP_API_BASE_URL:
      settings.appApiForwardUrl
      ?? baseEnv.SDKWORK_CLAW_EDGE_APP_API_BASE_URL
      ?? (allInOne ? edgeBaseUrl : 'http://127.0.0.1:18082'),
    ...(
      baseEnv.SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL || allInOne
        ? {
          SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL:
            baseEnv.SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL ?? edgeBaseUrl,
        }
        : {}
    ),
    SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME:
      settings.externalScheme ?? baseEnv.SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME ?? 'http',
    SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS:
      settings.trustForwardedHeaders
        ? '1'
        : baseEnv.SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS ?? '0',
    ...buildRuntimeEdgePrivateEnv(baseEnv, {
      [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]:
        resolveEdgeEnvValue(
          baseEnv,
          CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot,
          defaultSdkArchiveRoot,
        ),
    }),
  };
}

function edgeAccessBaseUrl(env) {
  const bind = env.SDKWORK_CLAW_SERVER_BIND ?? '0.0.0.0:3900';
  const parts = bind.split(':');
  const port = parts.at(-1) || '3900';
  const bindHost = parts.length > 1 ? parts.slice(0, -1).join(':') : '127.0.0.1';
  const host = bindHost === '0.0.0.0' || bindHost === '' ? '127.0.0.1' : bindHost;
  return `http://${host}:${port}`;
}

function buildStartProductionAccessLines(env) {
  const baseUrl = edgeAccessBaseUrl(env);
  const gatewayTarget = env.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL ?? 'http://127.0.0.1:18080';
  const backendTarget = env.SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL ?? 'http://127.0.0.1:18081';
  const appTarget = env.SDKWORK_CLAW_EDGE_APP_API_BASE_URL ?? 'http://127.0.0.1:18082';
  const allInOne = env.SDKWORK_CLAW_ALL_IN_ONE_RUNTIME !== '0';
  const lines = [
    `[start-production] Runtime Mode: ${allInOne ? 'all-in-one' : 'forwarding'}`,
    '[start-production] Edge Server Access',
    `[start-production]   Portal: ${baseUrl}/`,
    `[start-production]   Gateway API: ${baseUrl}/v1`,
    `[start-production]   Backend/Admin API: ${baseUrl}/backend/v3/api`,
    `[start-production]   App API: ${baseUrl}/app/v3/api`,
    `[start-production]   Gateway OpenAPI: ${baseUrl}/openapi.json`,
    `[start-production]   Admin API OpenAPI: ${baseUrl}/backend/v3/api/openapi.json`,
    `[start-production]   App API OpenAPI: ${baseUrl}/app/v3/api/openapi.json`,
    `[start-production]   Edge Server Health: ${baseUrl}/healthz`,
    `[start-production]   Edge Server Ready: ${baseUrl}/readyz`,
  ];
  if (!allInOne) {
    lines.push(
    '[start-production] Edge Forwarding Targets',
    `[start-production]   Gateway Target: ${gatewayTarget}`,
    `[start-production]   Backend/Admin Target: ${backendTarget}`,
    `[start-production]   App Target: ${appTarget}`,
    '[start-production] Direct Service Access',
    `[start-production]   Gateway OpenAPI: ${appendPath(gatewayTarget, '/openapi.json')}`,
    `[start-production]   Admin API OpenAPI: ${appendPath(backendTarget, '/backend/v3/api/openapi.json')}`,
    `[start-production]   App API OpenAPI: ${appendPath(appTarget, '/app/v3/api/openapi.json')}`,
    `[start-production]   OpenAI-compatible Gateway API: ${appendPath(gatewayTarget, '/v1')}`,
    `[start-production]   Backend/Admin API: ${appendPath(backendTarget, '/backend/v3/api')}`,
    `[start-production]   App API: ${appendPath(appTarget, '/app/v3/api')}`,
    );
  }
  lines.push(
    `[start-production]   PORTAL_PUBLIC_SDK_BASE_URL=${env.PORTAL_PUBLIC_SDK_BASE_URL || '(not configured)'}`,
    `[start-production]   PORTAL_PUBLIC_API_BASE_URL=${portalPublicRuntimeEnvLineValue(env, 'PORTAL_PUBLIC_API_BASE_URL')}`,
    `[start-production]   PORTAL_PUBLIC_OPEN_API_BASE_URL=${portalPublicRuntimeEnvLineValue(env, 'PORTAL_PUBLIC_OPEN_API_BASE_URL')}`,
    `[start-production]   PORTAL_PUBLIC_BACKEND_API_BASE_URL=${portalPublicRuntimeEnvLineValue(env, 'PORTAL_PUBLIC_BACKEND_API_BASE_URL')}`,
    `[start-production]   PORTAL_PUBLIC_APP_API_BASE_URL=${portalPublicRuntimeEnvLineValue(env, 'PORTAL_PUBLIC_APP_API_BASE_URL')}`,
    `[start-production]   PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=${env.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL || '(not configured)'}`,
    `[start-production]   PORTAL_PUBLIC_TOOL_API_ENABLED=${env.PORTAL_PUBLIC_TOOL_API_ENABLED}`,
    `[start-production]   ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests}=${env[CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]}`,
    `[start-production]   ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds}=${env[CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]}`,
    `[start-production]   ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot}=${env[CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot] || '(not configured)'}`,
    `[start-production]   SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME=${env.SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME}`,
    `[start-production]   SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS=${env.SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS}`,
  );
  return lines;
}

function assertPortalDistReadyForStart(dryRun, distRoot = portalDist) {
  if (dryRun) {
    return;
  }
  if (!existsSync(path.join(distRoot, 'index.html'))) {
    throw new Error(
      'portal production dist is missing. Run `pnpm build` before `pnpm start`.',
    );
  }
}

function resolveStartProductionCommand(
  env = process.env,
  platform = process.platform,
  root = workspaceRoot,
) {
  const configuredGatewayBinary = env.SDKWORK_CLAW_GATEWAY_BIN?.trim();
  if (configuredGatewayBinary) {
    return {
      command: configuredGatewayBinary,
      args: [],
      source: 'env',
    };
  }

  const releaseGatewayBinary = productionGatewayBinaryPath({
    env,
    platform,
    workspaceRoot: root,
  });
  if (existsSync(releaseGatewayBinary)) {
    return {
      command: releaseGatewayBinary,
      args: [],
      source: 'release',
    };
  }

  return {
    command: cargoCommand(platform),
    args: ['run', '-p', 'sdkwork-api-clawrouter-standalone-gateway'],
    source: 'cargo',
  };
}

function main(argv = process.argv.slice(2)) {
  const settings = parseStartProductionArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }

  const runtimeConfig = prepareStartProductionRuntimeConfig({
    baseEnv: process.env,
    settings,
    platform: process.platform,
    write: !settings.dryRun,
  });
  for (const line of buildRuntimeConfigStatusLines(runtimeConfig)) {
    console.log(line);
  }
  for (const line of runtimeConfig.helpLines) {
    console.log(line);
  }

  if (settings.initConfigOnly) {
    return;
  }

  if (runtimeConfig.blockingIssue && !settings.dryRun) {
    throw new Error(runtimeConfig.blockingIssue.message);
  }

  assertPortalDistReadyForStart(settings.dryRun, portalDist);
  const ensuredApplicationEnv = ensureClawRouterEnvForLifecycle('start', {
    workspaceRoot,
    env: process.env,
    deploymentProfile: 'standalone',
    runtimeTarget: settings.deploymentMode === 'desktop' ? 'desktop' : 'server',
    dryRun: settings.dryRun,
  });
  const releaseApplicationEnv = ensuredApplicationEnv.release;
  const env = mergeRuntimeConfigEnv(
    {
      ...resolveStartProductionEnv(process.env, portalDist, settings),
      ...releaseApplicationEnv.mergedEnv,
      ...ensuredApplicationEnv.production.mergedEnv,
    },
    runtimeConfig,
  );
  for (const line of buildStartProductionAccessLines(env)) {
    console.log(line);
  }
  const startCommand = resolveStartProductionCommand(env, process.platform, workspaceRoot);
  if (settings.dryRun) {
    console.log(
      `[start-production] start command (${startCommand.source}): ${startCommand.command} ${startCommand.args.join(' ')}`.trimEnd(),
    );
    return;
  }

  const child = spawn(startCommand.command, startCommand.args, {
    cwd: workspaceRoot,
    env,
    stdio: 'inherit',
    windowsHide: process.platform === 'win32',
  });

  child.on('error', (error) => {
    console.error(`[start-production] failed: ${error.message}`);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  try {
    main();
  } catch (error) {
    console.error(`[start-production] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export {
  assertPortalDistReadyForStart,
  buildStartProductionAccessLines,
  buildStartProductionHelpText,
  cargoCommand,
  edgeAccessBaseUrl,
  main,
  mergeRuntimeConfigEnv,
  parseStartProductionArgs,
  resolveStartProductionCommand,
  resolveStartProductionEnv,
  runtimeConfigDefaultMaxConnectionsForMode,
  runtimeConfigDefaultUrlForMode,
  runtimeConfigEngineForMode,
  runtimeConfigLocationForPlatform,
  runtimeConfigLocationWithExplicitConfigFile,
  runtimeConfigRedactedUrl,
  runtimeConfigTemplateContent,
  prepareStartProductionRuntimeConfig,
  splitBind,
};
