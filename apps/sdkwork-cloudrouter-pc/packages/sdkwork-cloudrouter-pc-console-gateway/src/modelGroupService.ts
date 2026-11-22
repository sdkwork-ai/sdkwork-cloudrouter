import { getCloudRouterAppSdkClient } from '@sdkwork/cloudrouter-pc-console-core/sdk';
import type {
  AppRoutingModelGroupCatalog,
  AppRoutingModelGroupDefaultRequest,
  AppRoutingModelGroupDefaults,
  AppRoutingModelGroups,
} from '@sdkwork/cloudrouter-pc-console-core/sdk';

/** Catalog modality vocabulary (`text` covers every LLM model). */
export type ModelGroupModality = 'text' | 'image' | 'video' | 'audio' | 'music';

export interface ModelGroupCatalogQuery {
  modality?: ModelGroupModality;
  vendorCode?: string;
}

/**
 * Modality → vendor → model catalog with the caller's current defaults.
 * The page fetches one modality at a time.
 */
export async function fetchModelGroupCatalog(
  query: ModelGroupCatalogQuery = {},
): Promise<AppRoutingModelGroupCatalog> {
  const client = getCloudRouterAppSdkClient();
  return client.ai.routing.modelGroupCatalog.retrieve({
    ...(query.modality ? { modality: query.modality } : {}),
    ...(query.vendorCode ? { vendorCode: query.vendorCode } : {}),
  });
}

/** Groups that can serve one model, with the caller's effective default. */
export async function fetchModelGroups(model: string): Promise<AppRoutingModelGroups> {
  const client = getCloudRouterAppSdkClient();
  return client.ai.routing.modelGroups.retrieve({ model });
}

/** Every user rule currently stored for the caller. */
export async function fetchModelGroupDefaults(): Promise<AppRoutingModelGroupDefaults> {
  const client = getCloudRouterAppSdkClient();
  return client.ai.routing.modelGroupDefaults.retrieve();
}

/**
 * Upserts one user rule. A blank `accountGroup` clears the rule so the next
 * broader scope (vendor → modality → account default) applies again.
 */
export async function setModelGroupDefault(
  request: AppRoutingModelGroupDefaultRequest,
): Promise<void> {
  const client = getCloudRouterAppSdkClient();
  await client.ai.routing.modelGroupDefaults.update(request);
}
