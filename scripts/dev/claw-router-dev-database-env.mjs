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
  if (/^sqlite:\/\//iu.test(databaseUrl)) {
    return 'sqlite';
  }
  return 'custom';
}

function resolvePostgresDatabaseUrlFromFields(env) {
  if (normalizeText(env.SDKWORK_DATABASE_PROVIDER)) {
    throw new Error(
      'SDKWORK_DATABASE_PROVIDER is not supported; use SDKWORK_DATABASE_ENGINE',
    );
  }
  if (normalizeText(env.SDKWORK_DATABASE_SSLMODE)) {
    throw new Error(
      'SDKWORK_DATABASE_SSLMODE is not supported; use SDKWORK_DATABASE_SSL_MODE',
    );
  }

  const engine = normalizeText(env.SDKWORK_DATABASE_ENGINE);
  if (!engine) {
    return undefined;
  }
  if (!/^postgres(?:ql)?$/iu.test(engine)) {
    throw new Error(`unsupported SDKWORK_DATABASE_ENGINE: ${engine}`);
  }

  const host = normalizeText(env.SDKWORK_DATABASE_HOST);
  const database = normalizeText(env.SDKWORK_DATABASE_NAME);
  const username = normalizeText(env.SDKWORK_DATABASE_USERNAME);
  const password = normalizeText(env.SDKWORK_DATABASE_PASSWORD);
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
    missing.push('SDKWORK_DATABASE_PASSWORD');
  }
  if (missing.length > 0) {
    throw new Error(
      `SDKWORK_DATABASE_ENGINE=postgresql requires ${missing.join(', ')}`,
    );
  }

  const port = normalizeText(env.SDKWORK_DATABASE_PORT);
  return buildPostgresDatabaseUrl({
    host,
    port,
    database,
    username,
    password,
    sslmode: env.SDKWORK_DATABASE_SSL_MODE,
  });
}

export function hasCompletePostgresSplitProfile(env) {
  if (!normalizeText(env.SDKWORK_DATABASE_ENGINE)) {
    return false;
  }
  try {
    return resolvePostgresDatabaseUrlFromFields(env) !== undefined;
  } catch {
    return false;
  }
}

export function mergeDevEnvWithDatabasePrecedence(baseEnv, fileEnv) {
  const merged = { ...baseEnv, ...fileEnv };
  if (
    fileEnv
    && hasCompletePostgresSplitProfile(fileEnv)
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
  const databaseUrl = normalizeText(env.SDKWORK_DATABASE_URL)
    ?? resolvePostgresDatabaseUrlFromFields(env);
  if (!databaseUrl) {
    if (defaultDatabase === 'postgresql') {
      const defaultDatabaseUrl = defaultClawRouterDevPostgresDatabaseUrl();
      return {
        databaseUrl: defaultDatabaseUrl,
        env: {
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

  const resultEnv = {
    SDKWORK_DATABASE_URL: databaseUrl,
  };
  const maxConnections = normalizeText(env.SDKWORK_DATABASE_MAX_CONNECTIONS);
  if (maxConnections) {
    resultEnv.SDKWORK_DATABASE_MAX_CONNECTIONS = maxConnections;
  }

  return {
    databaseUrl,
    env: resultEnv,
    kind: postgresKindFromUrl(databaseUrl),
  };
}
