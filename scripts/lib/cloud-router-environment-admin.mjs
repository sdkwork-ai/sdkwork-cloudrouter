import path from 'node:path';

const SUPPORTED_ENVIRONMENTS = Object.freeze([
  'development',
  'test',
  'staging',
  'production',
]);

export const CLOUD_ROUTER_ENVIRONMENT_ADMIN_ACCOUNTS = Object.freeze({
  development: Object.freeze({
    username: 'admin-dev',
    displayName: 'Cloud Router Development Administrator',
    email: 'admin-dev@sdkwork.com',
    bootstrapAdminUsernameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_USERNAME',
    bootstrapAdminEmailEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_EMAIL',
    bootstrapAdminDisplayNameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_DISPLAY_NAME',
  }),
  test: Object.freeze({
    username: 'admin-test',
    displayName: 'Cloud Router Test Administrator',
    email: 'admin-test@sdkwork.com',
    bootstrapAdminUsernameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_USERNAME',
    bootstrapAdminEmailEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_EMAIL',
    bootstrapAdminDisplayNameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_DISPLAY_NAME',
  }),
  staging: Object.freeze({
    username: 'admin-staging',
    displayName: 'Cloud Router Staging Administrator',
    email: 'admin-staging@sdkwork.com',
    bootstrapAdminUsernameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_USERNAME',
    bootstrapAdminEmailEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_EMAIL',
    bootstrapAdminDisplayNameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_DISPLAY_NAME',
  }),
  production: Object.freeze({
    username: 'admin',
    displayName: 'Administrator',
    email: 'admin@sdkwork.com',
    bootstrapAdminUsernameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_USERNAME',
    bootstrapAdminEmailEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_EMAIL',
    bootstrapAdminDisplayNameEnv: 'SDKWORK_CLOUDROUTER_BOOTSTRAP_ADMIN_DISPLAY_NAME',
  }),
});

export function normalizeCloudRouterLifecycleEnvironment(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  const environment = normalized === 'dev'
    ? 'development'
    : normalized === 'prod'
      ? 'production'
      : normalized;
  if (!environment || !SUPPORTED_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `unsupported Cloud Router lifecycle environment "${value ?? ''}"; expected development, test, staging, or production`,
    );
  }
  return environment;
}

export function resolveCloudRouterEnvironmentAdminAccount(environment) {
  const lifecycle = normalizeCloudRouterLifecycleEnvironment(environment);
  return CLOUD_ROUTER_ENVIRONMENT_ADMIN_ACCOUNTS[lifecycle];
}

export function resolveCloudRouterBootstrapAdminEnvOverrides(environment) {
  const account = resolveCloudRouterEnvironmentAdminAccount(environment);
  return {
    [account.bootstrapAdminUsernameEnv]: account.username,
    [account.bootstrapAdminDisplayNameEnv]: account.displayName,
    [account.bootstrapAdminEmailEnv]: account.email,
    SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT: normalizeCloudRouterLifecycleEnvironment(environment),
    SDKWORK_CLOUDROUTER_ENVIRONMENT: normalizeCloudRouterLifecycleEnvironment(environment),
    SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT: normalizeCloudRouterLifecycleEnvironment(environment),
  };
}

export function resolveCloudRouterBootstrapEnvPaths({
  workspaceRoot,
  environment,
  portalRelativeDir = path.join('apps', 'sdkwork-cloudrouter-pc'),
} = {}) {
  const lifecycle = normalizeCloudRouterLifecycleEnvironment(environment);
  const configProfile = lifecycle === 'development' ? 'development' : lifecycle;
  return {
    repositoryBootstrapEnvPath: path.join(workspaceRoot, `.env.${lifecycle}.bootstrap.local`),
    portalBootstrapEnvPath: path.join(workspaceRoot, portalRelativeDir, `.env.${configProfile}.bootstrap.local`),
    sdkworkLocalEnvPath: path.join(workspaceRoot, '.sdkwork.local.env'),
  };
}
