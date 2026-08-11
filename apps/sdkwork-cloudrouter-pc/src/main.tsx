import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { SdkworkI18nProvider } from '@sdkwork/i18n-pc-react';
import { agentsWorkbenchI18nCatalogs } from '@sdkwork/cloudrouter-pc-playground/i18n';
import {
  cloudRouterI18nCatalog,
  cloudRouterI18nRuntimeConfig,
  resolveCloudRouterInitialLocale,
} from '@sdkwork/cloudrouter-pc-i18n';
import App from './App.tsx';
import { PortalQueryProvider, PortalErrorBoundary, cloudRouterDocumentsReferenceRuntime } from '@sdkwork/cloudroutes-pc-commons';
import { configureCloudRouterDomainServiceProviders } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import { configureCloudRouterLogBackendSdkClient } from './admin/logSdkHostWiring.ts';
import { configureCloudRouterPartnerBackendSdkClient } from './admin/partnerSdkHostWiring.ts';
import { DocumentsReferenceRuntimeProvider } from '@sdkwork/documents-pc-commons';
import { initializeThemePreferences } from './themePreference.ts';
import './index.css';

initializeThemePreferences();
configureCloudRouterDomainServiceProviders();
configureCloudRouterLogBackendSdkClient();
configureCloudRouterPartnerBackendSdkClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalErrorBoundary>
      <PortalQueryProvider>
        <SdkworkI18nProvider
          catalogs={[cloudRouterI18nCatalog, ...agentsWorkbenchI18nCatalogs]}
          config={cloudRouterI18nRuntimeConfig}
          defaultVariables={{ platformName: 'Cloud Router' }}
          locale={resolveCloudRouterInitialLocale()}
          syncDocumentLanguage
        >
          <DocumentsReferenceRuntimeProvider value={cloudRouterDocumentsReferenceRuntime}>
            <App />
          </DocumentsReferenceRuntimeProvider>
        </SdkworkI18nProvider>
      </PortalQueryProvider>
    </PortalErrorBoundary>
  </StrictMode>,
);
