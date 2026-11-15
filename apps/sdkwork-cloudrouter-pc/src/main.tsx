import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { SdkworkI18nProvider } from '@sdkwork/i18n-pc-react';
import { agentsWorkbenchI18nCatalogs } from '@sdkwork/cloudrouter-pc-playground/i18n';
import { SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG } from '@sdkwork/iam-pc-official-accounts';
import {
  cloudRouterI18nCatalog,
  cloudRouterI18nRuntimeConfig,
  resolveCloudRouterInitialLocale,
} from '@sdkwork/cloudrouter-pc-i18n';
import App from './App.tsx';
import { PortalQueryProvider, PortalErrorBoundary, cloudRouterDocumentsReferenceRuntime } from '@sdkwork/cloudroutes-pc-commons';
import { configureCloudRouterDomainServiceProviders } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import { configureCloudRouterLogBackendSdkClient } from './admin/logSdkHostWiring.ts';
import { configureCloudRouterOrderBackendSdkClient } from './admin/orderSdkHostWiring.ts';
import { configureCloudRouterPartnerBackendSdkClient } from './admin/partnerSdkHostWiring.ts';
import { configureCloudRouterMessagingBackendSdkClient } from './admin/messagingSdkHostWiring.ts';
import { configureCloudRouterHardwareBackendSdkClient } from './admin/hardwareSdkHostWiring.ts';
import { DocumentsReferenceRuntimeProvider } from '@sdkwork/documents-pc-commons';
import '@sdkwork/documents-pc-admin-documents/styles.css';
import '@sdkwork/documents-pc-public-documents/styles.css';
import { initializeThemePreferences } from './themePreference.ts';
import './index.css';

initializeThemePreferences();
configureCloudRouterDomainServiceProviders();
configureCloudRouterLogBackendSdkClient();
configureCloudRouterOrderBackendSdkClient();
configureCloudRouterPartnerBackendSdkClient();
configureCloudRouterMessagingBackendSdkClient();
configureCloudRouterHardwareBackendSdkClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalQueryProvider>
      <SdkworkI18nProvider
        catalogs={[
          cloudRouterI18nCatalog,
          ...agentsWorkbenchI18nCatalogs,
          // The shared official-account panel resolves its own namespace; without
          // this entry it would fall back to the catalog's default locale instead
          // of the console's active one.
          SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
        ]}
        config={cloudRouterI18nRuntimeConfig}
        defaultVariables={{ platformName: 'Cloud Router' }}
        locale={resolveCloudRouterInitialLocale()}
        syncDocumentLanguage
      >
        <DocumentsReferenceRuntimeProvider value={cloudRouterDocumentsReferenceRuntime}>
          {/* The error boundary must live inside the i18n provider so its
              labels resolve through the provider's i18next instance. */}
          <PortalErrorBoundary>
            <App />
          </PortalErrorBoundary>
        </DocumentsReferenceRuntimeProvider>
      </SdkworkI18nProvider>
    </PortalQueryProvider>
  </StrictMode>,
);
