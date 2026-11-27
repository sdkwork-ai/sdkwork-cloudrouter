import { createSdkworkMessageCatalog, useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

import type { ApplicationCatalogMessages } from "../types/application-catalog-messages";
import { en } from "./en-US/iam/application/catalog";
import { zh } from "./zh-CN/iam/application/catalog";

export type { ApplicationCatalogMessages } from "../types/application-catalog-messages";

/**
 * Copy catalog of this console's App Center lists.
 *
 * The deployment-application *detail* page is deliberately absent: it belongs to
 * `@sdkwork/cloudrouter-components-deployments-app-detail`, which owns its own
 * `cloudrouter.application.detail` namespace so any console can mount it. This
 * catalog carries only what this console's lists say, including the row-action
 * wording that navigates to that component.
 */
export const CLOUDROUTER_APPLICATION_CATALOG_I18N = createSdkworkMessageCatalog<ApplicationCatalogMessages>({
  defaultLocale: "en-US",
  locales: {
    "en-US": en,
    "zh-CN": zh,
  },
  namespace: "cloudrouter.application.catalog",
});

export function useApplicationCatalogMessages(): ApplicationCatalogMessages {
  return useSdkworkModuleMessages(CLOUDROUTER_APPLICATION_CATALOG_I18N);
}
