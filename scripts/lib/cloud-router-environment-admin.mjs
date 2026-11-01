import { credentialBundlePath } from '@sdkwork/iam-credential-entry/node-bootstrap';

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

/**
 * Credential bundle of one Cloud Router lifecycle.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.1 keeps the token in the
 * user-private store, so no repository env file is named here.
 * @param options - lifecycle, home directory, and deployment profile.
 * @returns the absolute bundle path.
 */
export function resolveCloudRouterBootstrapCredentialPath({
  environment,
  homeDir,
  deploymentProfile = 'standalone',
} = {}) {
  const lifecycle = normalizeCloudRouterLifecycleEnvironment(environment);
  return credentialBundlePath({
    applicationCode: 'cloudrouter',
    profileId: `${deploymentProfile}.${lifecycle}`,
    ...(homeDir ? { homeDir } : {}),
  });
}
