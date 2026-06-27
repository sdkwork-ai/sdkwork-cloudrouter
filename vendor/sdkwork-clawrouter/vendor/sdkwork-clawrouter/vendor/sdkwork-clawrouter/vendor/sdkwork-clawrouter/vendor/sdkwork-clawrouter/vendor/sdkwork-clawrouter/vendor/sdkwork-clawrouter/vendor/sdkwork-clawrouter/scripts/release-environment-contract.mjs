export const RELEASE_ENVIRONMENT_CONTRACT = Object.freeze({
  version: 4,
  exampleFile: '.env.release.example',
  profileFile: '.env.release',
  /** @deprecated use profileFile */
  localFile: '.env.release',
  requiredReleaseEnv: Object.freeze([
    'SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL',
  ]),
  requiredPortalPublicEnv: Object.freeze([
    'PORTAL_PUBLIC_API_BASE_URL',
    'PORTAL_PUBLIC_APP_API_BASE_URL',
    'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
    'PORTAL_PUBLIC_TOOL_API_ENABLED',
  ]),
  optionalPortalPublicEnv: Object.freeze([
    'PORTAL_PUBLIC_SDK_BASE_URL',
    'PORTAL_PUBLIC_OPEN_API_BASE_URL',
    'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL',
  ]),
  optionalEdgePrivateEnv: Object.freeze([
    'SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC',
    'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS',
    'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
    'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL',
    'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY',
    'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE',
    'SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT',
  ]),
});
