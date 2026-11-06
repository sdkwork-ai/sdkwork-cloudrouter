import { createSdkworkMessageCatalog, useSdkworkModuleMessages } from "@sdkwork/i18n-pc-react";

import type { ApplicationCatalogMessages } from "../types/application-catalog-messages";
import { en } from "./en-US/iam/application/catalog";
import { zh } from "./zh-CN/iam/application/catalog";

export type { ApplicationCatalogMessages } from "../types/application-catalog-messages";

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
