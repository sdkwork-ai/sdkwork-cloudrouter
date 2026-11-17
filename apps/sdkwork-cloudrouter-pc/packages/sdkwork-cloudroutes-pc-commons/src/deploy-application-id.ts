import { readCloudRouterRuntimeEnv } from './utils/env.ts';

/**
 * Environment variable that carries the installation's deploy application id.
 *
 * Same key IAM reads (`sdkwork-iam-web-adapter`
 * `application_registry::DEPLOY_APPLICATION_ID_ENV`), so one deployment-level
 * variable anchors both sides.
 */
export const CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV = 'SDKWORK_DEPLOY_APPLICATION_ID';

/**
 * Browser projection of the anchor.
 *
 * A renderer cannot read the process-only variable, so the build projects
 * `SDKWORK_DEPLOY_APPLICATION_ID` onto this Vite key and the runtime env document
 * publishes it.
 */
export const CLOUD_ROUTER_BROWSER_DEPLOY_APPLICATION_ID_KEY =
  'VITE_SDKWORK_DEPLOY_APPLICATION_ID';

/**
 * Resolve the app identity a Cloud Router renderer presents to IAM.
 *
 * IAM makes the deploy application the identity of every access token
 * (`app_id`/`aud`), so the renderer must use the anchor. There is deliberately no
 * fallback: a bundle built without the anchor throws here, naming
 * `SDKWORK_DEPLOY_APPLICATION_ID`, instead of presenting the retired IAM runtime
 * app id that IAM suppresses.
 * @returns the trimmed deploy application id.
 */
export function resolveCloudRouterDeployApplicationId(): string {
  const value = readCloudRouterRuntimeEnv(CLOUD_ROUTER_BROWSER_DEPLOY_APPLICATION_ID_KEY)?.trim();
  if (!value) {
    throw new Error(
      `browser renderer has no deploy application identity: build with `
      + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} set so `
      + `${CLOUD_ROUTER_BROWSER_DEPLOY_APPLICATION_ID_KEY} is published in the runtime env `
      + 'document; an installation is one-to-one with a deploy application and must not present '
      + 'the retired IAM runtime app id',
    );
  }
  return value;
}
