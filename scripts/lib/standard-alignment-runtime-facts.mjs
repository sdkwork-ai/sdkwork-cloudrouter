function extractDesktopCase(source) {
  return source.match(
    /case\s+['"]desktop['"]\s*:[\s\S]*?(?=\n\s*case\s+['"]|\n\s*default\s*:)/u,
  )?.[0] ?? '';
}

export function analyzeRedisHaManifest(manifest, { runtimeSources = '' } = {}) {
  const replicasMatch = manifest.match(/replicas:\s*(\d+)/u);
  const redisUrl = manifest.match(/redis-url:\s*['"]?([^'"\r\n]+)/u)?.[1]?.trim() ?? null;
  const replicas = replicasMatch ? Number.parseInt(replicasMatch[1], 10) : 0;
  const hasSentinelContainer = /name:\s*sentinel\b/u.test(manifest);
  const hasSentinelConfig = /sentinel\.conf/u.test(manifest)
    && /sentinel monitor\b/u.test(manifest);
  const hasSentinelAuthentication = /sentinel auth-pass\b/u.test(manifest);
  const hasPdb = /kind:\s*PodDisruptionBudget/u.test(manifest)
    && /minAvailable:\s*2/u.test(manifest);
  const hasAuthSecret = /kind:\s*Secret/u.test(manifest)
    && /redis-password/u.test(manifest);
  const hasPodAntiAffinity = /podAntiAffinity/u.test(manifest);
  const hasReplicaConfiguration = /(?:^|\s)(?:replicaof|slaveof)\s+\S+\s+\d+/mu.test(manifest)
    || /--replicaof\b/u.test(manifest);
  const runtimeSupportsSentinel = /\b(?:SentinelClient|redis::sentinel|sentinel::Sentinel)\b/u
    .test(runtimeSources);
  const hasOperatorManagedFailover = /kind:\s*(?:RedisFailover|RedisReplication)\b/u
    .test(manifest);
  const hasWritablePrimaryDiscovery = runtimeSupportsSentinel || hasOperatorManagedFailover;
  const redisUrlUsesTls = redisUrl?.startsWith('rediss://') ?? false;
  const hasRedisTlsListener = /(?:^|\s)(?:tls-port|--tls-port)\s+\d+/mu.test(manifest);
  const hasRedisTlsKeyPair = /(?:tls-cert-file|--tls-cert-file)\b/u.test(manifest)
    && /(?:tls-key-file|--tls-key-file)\b/u.test(manifest);
  const serverTlsEnabled = hasRedisTlsListener && hasRedisTlsKeyPair;
  const tlsTransportConsistent = redisUrl !== null && redisUrlUsesTls === serverTlsEnabled;
  const isHa = replicas >= 3
    && hasSentinelContainer
    && hasSentinelConfig
    && hasSentinelAuthentication
    && hasPdb
    && hasAuthSecret
    && hasReplicaConfiguration
    && hasWritablePrimaryDiscovery
    && tlsTransportConsistent;

  return {
    replicas,
    redisUrlScheme: redisUrl?.split(':', 1)[0] ?? null,
    hasSentinelContainer,
    hasSentinelConfig,
    hasSentinelAuthentication,
    hasPdb,
    hasAuthSecret,
    hasPodAntiAffinity,
    hasReplicaConfiguration,
    runtimeSupportsSentinel,
    hasOperatorManagedFailover,
    hasWritablePrimaryDiscovery,
    redisUrlUsesTls,
    serverTlsEnabled,
    tlsTransportConsistent,
    isHa,
  };
}

export function analyzeClientLocalSqliteRuntime({
  appConfig,
  packageJson,
  applicationLauncherSource,
  tauriConfigPaths = [],
  clientLocalSqliteAuthorityPaths = [],
  serverRuntimeSources = '',
}) {
  const desktopSqliteCommand = packageJson.scripts?.['dev:desktop:sqlite'] ?? null;
  const desktopCase = extractDesktopCase(applicationLauncherSource);
  const declaresDesktopRuntime = appConfig.runtime?.runtimes?.includes('TAURI') === true;
  const desktopSqliteCommandExists = typeof desktopSqliteCommand === 'string';
  const desktopSqliteCommandTargetsSqlite = /--(?:database|database-engine)\s+sqlite\b/u
    .test(desktopSqliteCommand ?? '');
  const desktopLaunchIsClientOnly = /clientOnly:\s*true\b/u.test(desktopCase);
  const hasNativeDesktopHost = tauriConfigPaths.length > 0;
  const hasClientLocalSqliteAuthority = clientLocalSqliteAuthorityPaths.length > 0;
  const serverRejectsSqlite = /server runtime requires PostgreSQL; SQLite is client-local only/u
    .test(serverRuntimeSources);
  const isImplemented = declaresDesktopRuntime
    && desktopSqliteCommandExists
    && desktopSqliteCommandTargetsSqlite
    && !desktopLaunchIsClientOnly
    && hasNativeDesktopHost
    && hasClientLocalSqliteAuthority
    && serverRejectsSqlite;

  return {
    declaresDesktopRuntime,
    desktopSqliteCommand,
    desktopSqliteCommandExists,
    desktopSqliteCommandTargetsSqlite,
    desktopLaunchIsClientOnly,
    tauriConfigPaths,
    hasNativeDesktopHost,
    clientLocalSqliteAuthorityPaths,
    hasClientLocalSqliteAuthority,
    serverRejectsSqlite,
    isImplemented,
  };
}
