import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_DEV_POSTGRES_DATABASE = Object.freeze({
  host: '127.0.0.1',
  port: '5432',
  database: 'sdkwork_ai_dev',
  username: 'sdkwork_ai_dev',
  password: 'sdkworkdev123',
  sslmode: 'disable',
  maxConnections: '10',
});

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseClawRouterDevEnvFileContent(content) {
  const values = {};
  for (const [lineIndex, rawLine] of String(content ?? '').split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid dev env file line ${lineIndex + 1}: ${rawLine}`);
    }

    const name = normalizedLine.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
      throw new Error(`Invalid dev env variable name on line ${lineIndex + 1}: ${name}`);
    }

    values[name] = stripOptionalQuotes(normalizedLine.slice(separatorIndex + 1).trim());
  }
  return values;
}

function resolveEnvFilePath(envFile, workspaceRoot) {
  const normalized = normalizeText(envFile);
  if (!normalized) {
    return undefined;
  }
  return path.isAbsolute(normalized) ? normalized : path.resolve(workspaceRoot, normalized);
}

export function loadClawRouterDevEnvFile(envFile, {
  workspaceRoot = path.resolve(import.meta.dirname, '..', '..'),
} = {}) {
  const envFilePath = resolveEnvFilePath(envFile, workspaceRoot);
  if (!envFilePath) {
    return {};
  }
  if (!existsSync(envFilePath)) {
    throw new Error(`Claw Router dev env file does not exist: ${envFilePath}`);
  }
  return parseClawRouterDevEnvFileContent(readFileSync(envFilePath, 'utf8'));
}

function appendPostgresQueryParam(params, name, value) {
  const normalized = normalizeText(value);
  if (normalized) {
    params.set(name, normalized);
  }
}

function encodePostgresPath(databaseName) {
  return encodeURIComponent(databaseName).replaceAll('%2F', '/');
}

function buildPostgresDatabaseUrl({
  host,
  port,
  database,
  username,
  password,
  sslmode,
}) {
  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  const authority = `${credentials}@${host}${port ? `:${port}` : ''}`;
  const params = new URLSearchParams();
  appendPostgresQueryParam(params, 'sslmode', sslmode);
  const query = params.toString();
  return `postgresql://${authority}/${encodePostgresPath(database)}${query ? `?${query}` : ''}`;
}

export function defaultClawRouterDevPostgresDatabaseUrl() {
  return buildPostgresDatabaseUrl(DEFAULT_DEV_POSTGRES_DATABASE);
}

export function defaultClawRouterDevPostgresMaxConnections() {
  return DEFAULT_DEV_POSTGRES_DATABASE.maxConnections;
}

function postgresKindFromUrl(databaseUrl) {
  if (/^postgres(?:ql)?:\/\//iu.test(databaseUrl)) {
    return 'postgresql';
  }
  if (/^sqlite:/iu.test(databaseUrl)) {
    return 'sqlite';
  }
  return 'custom';
}

function rejectRetiredDatabaseKeys(env) {
  for (const name of Object.keys(env)) {
    const retiredScopedKey = /^SDKWORK_.+_DATABASE_/u.test(name)
      && !name.startsWith('SDKWORK_DATABASE_');
    if (retiredScopedKey) {
      throw new Error(
        `${name} is retired; use the workspace-scoped SDKWORK_DATABASE_* contract`,
      );
    }
  }

  for (const [retired, replacement] of [
    ['DATABASE_URL', 'SDKWORK_DATABASE_URL'],
    ['DATABASE_PROVIDER', 'SDKWORK_DATABASE_ENGINE'],
    ['DATABASE_SSLMODE', 'SDKWORK_DATABASE_SSL_MODE'],
    ['SDKWORK_DATABASE_PROVIDER', 'SDKWORK_DATABASE_ENGINE'],
    ['SDKWORK_DATABASE_SSLMODE', 'SDKWORK_DATABASE_SSL_MODE'], // sdkwork-retired-database-key-rejection
  ]) {
    if (!normalizeText(env[retired])) {
      continue;
    }
    throw new Error(
      `${retired} is not supported; use ${replacement}`,
    );
  }
}

function canonicalWorkspaceDatabaseProfile(database) {
  if (database === 'sdkwork_ai_dev') return 'development';
  if (database === 'sdkwork_ai_test') return 'test';
  if (database === 'sdkwork_ai_staging') return 'staging';
  if (database === 'sdkwork_ai_prod') return 'production';
  if (/^sdkwork_ai_test_[A-Za-z0-9_]+$/u.test(database)) return 'test';
  return undefined;
}

function expectedWorkspaceDatabaseUsername(database) {
  return database.startsWith('sdkwork_ai_test_') ? 'sdkwork_ai_test' : database;
}

function validateCanonicalWorkspacePostgresUrl(databaseUrl, env) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch (error) {
    throw new Error(`invalid SDKWORK PostgreSQL URL: ${error.message}`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!canonicalWorkspaceDatabaseProfile(database)) {
    throw new Error(
      `SDKWORK_DATABASE_NAME must use a canonical workspace identity, got ${database || '<empty>'}`,
    );
  }
  const schema = normalizeText(env.SDKWORK_DATABASE_SCHEMA) ?? database;
  if (schema !== database) {
    throw new Error(
      `SDKWORK_DATABASE_SCHEMA must equal workspace database ${database}, got ${schema}`,
    );
  }
  const username = decodeURIComponent(parsed.username);
  const expectedUsername = expectedWorkspaceDatabaseUsername(database);
  if (username !== expectedUsername) {
    throw new Error(
      `workspace database ${database} requires SDKWORK_DATABASE_USERNAME=${expectedUsername}, got ${username || '<empty>'}`,
    );
  }
}

function resolveStructuredDatabasePassword(env) {
  const password = normalizeText(env.SDKWORK_DATABASE_PASSWORD);
  const passwordFile = normalizeText(env.SDKWORK_DATABASE_PASSWORD_FILE);
  if (password && passwordFile) {
    throw new Error(
      'SDKWORK_DATABASE_PASSWORD and SDKWORK_DATABASE_PASSWORD_FILE are mutually exclusive',
    );
  }
  if (!passwordFile) {
    return password;
  }
  try {
    return normalizeText(readFileSync(passwordFile, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read SDKWORK_DATABASE_PASSWORD_FILE ${passwordFile}: ${error.message}`);
  }
}

function resolveDatabaseUrlFromFields(env) {

  const engine = normalizeText(env.SDKWORK_DATABASE_ENGINE);
  if (!engine) {
    return undefined;
  }
  if (/^sqlite$/iu.test(engine)) {
    const databaseFile = normalizeText(env.SDKWORK_DATABASE_FILE);
    if (!databaseFile) {
      throw new Error('SDKWORK_DATABASE_ENGINE=sqlite requires SDKWORK_DATABASE_FILE');
    }
    return `sqlite:${databaseFile}`;
  }
  if (!/^postgres(?:ql)?$/iu.test(engine)) {
    throw new Error(`unsupported SDKWORK_DATABASE_ENGINE: ${engine}`);
  }

  const host = normalizeText(env.SDKWORK_DATABASE_HOST);
  const database = normalizeText(env.SDKWORK_DATABASE_NAME);
  const username = normalizeText(env.SDKWORK_DATABASE_USERNAME);
  const password = resolveStructuredDatabasePassword(env);
  const missing = [];
  if (!host) {
    missing.push('SDKWORK_DATABASE_HOST');
  }
  if (!database) {
    missing.push('SDKWORK_DATABASE_NAME');
  }
  if (!username) {
    missing.push('SDKWORK_DATABASE_USERNAME');
  }
  if (!password) {
    missing.push('SDKWORK_DATABASE_PASSWORD[_FILE]');
  }
  if (missing.length > 0) {
    throw new Error(
      `SDKWORK_DATABASE_ENGINE=postgresql requires ${missing.join(', ')}`,
    );
  }

  const port = normalizeText(env.SDKWORK_DATABASE_PORT);
  const databaseUrl = buildPostgresDatabaseUrl({
    host,
    port,
    database,
    username,
    password,
    sslmode: env.SDKWORK_DATABASE_SSL_MODE,
  });
  validateCanonicalWorkspacePostgresUrl(databaseUrl, env);
  return databaseUrl;
}

export function hasCompleteStructuredDatabaseProfile(env) {
  if (!normalizeText(env.SDKWORK_DATABASE_ENGINE)) {
    return false;
  }
  try {
    return resolveDatabaseUrlFromFields(env) !== undefined;
  } catch {
    return false;
  }
}

export function mergeDevEnvWithDatabasePrecedence(baseEnv, fileEnv) {
  const merged = { ...baseEnv, ...fileEnv };
  if (
    fileEnv
    && hasCompleteStructuredDatabaseProfile(fileEnv)
    && !normalizeText(fileEnv.SDKWORK_DATABASE_URL)
  ) {
    delete merged.SDKWORK_DATABASE_URL;
  }
  return merged;
}

export function resolveDefaultDevEnvFilePath(workspaceRoot) {
  const localOverride = path.join(workspaceRoot, '.env.postgres');
  if (existsSync(localOverride)) {
    return localOverride;
  }
  const example = path.join(workspaceRoot, '.env.postgres.example');
  if (existsSync(example)) {
    return example;
  }
  return undefined;
}

export function resolveWorkspaceDevDatabaseEnv({
  env = process.env,
  workspaceRoot = path.resolve(import.meta.dirname, '..', '..'),
  devEnvFile,
  forwardedDatabaseUrl = false,
  defaultDatabase = 'postgresql',
} = {}) {
  const resolvedDevEnvFile = devEnvFile ?? (
    forwardedDatabaseUrl ? undefined : resolveDefaultDevEnvFilePath(workspaceRoot)
  );
  const fileEnv = resolvedDevEnvFile
    ? loadClawRouterDevEnvFile(resolvedDevEnvFile, { workspaceRoot })
    : {};
  const mergedEnv = mergeDevEnvWithDatabasePrecedence(env, fileEnv);
  const resolvedDatabase = resolveClawRouterDevDatabaseEnv({
    env: mergedEnv,
    defaultDatabase: forwardedDatabaseUrl ? 'none' : defaultDatabase,
  });
  return {
    mergedEnv,
    ...resolvedDatabase,
  };
}

export function resolveClawRouterDevDatabaseEnv({
  env = process.env,
  defaultDatabase = 'postgresql',
} = {}) {
  rejectRetiredDatabaseKeys(env);
  const databaseUrl = normalizeText(env.SDKWORK_DATABASE_URL)
    ?? resolveDatabaseUrlFromFields(env);
  if (!databaseUrl) {
    if (defaultDatabase === 'postgresql') {
      const defaultDatabaseUrl = defaultClawRouterDevPostgresDatabaseUrl();
      return {
        databaseUrl: defaultDatabaseUrl,
        env: {
          SDKWORK_DATABASE_ENGINE: 'postgresql',
          SDKWORK_DATABASE_URL: defaultDatabaseUrl,
          SDKWORK_DATABASE_MAX_CONNECTIONS:
            normalizeText(env.SDKWORK_DATABASE_MAX_CONNECTIONS)
              ?? defaultClawRouterDevPostgresMaxConnections(),
        },
        kind: 'postgresql',
      };
    }
    return {
      databaseUrl: undefined,
      env: {},
      kind: 'default',
    };
  }

  const databaseKind = postgresKindFromUrl(databaseUrl);
  if (databaseKind === 'postgresql') {
    validateCanonicalWorkspacePostgresUrl(databaseUrl, env);
  }

  const resultEnv = {
    SDKWORK_DATABASE_URL: databaseUrl,
  };
  if (['postgresql', 'sqlite'].includes(databaseKind)) {
    resultEnv.SDKWORK_DATABASE_ENGINE = databaseKind;
  }
  const maxConnections = normalizeText(env.SDKWORK_DATABASE_MAX_CONNECTIONS);
  if (maxConnections) {
    resultEnv.SDKWORK_DATABASE_MAX_CONNECTIONS = maxConnections;
  }

  return {
    databaseUrl,
    env: resultEnv,
    kind: databaseKind,
  };
}
