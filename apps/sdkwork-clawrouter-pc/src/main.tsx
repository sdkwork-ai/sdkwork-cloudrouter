import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { SdkworkI18nProvider } from '@sdkwork/i18n-pc-react';
import { agentsWorkbenchI18nCatalogs } from '@sdkwork/clawrouter-pc-playground/i18n';
import {
  clawRouterI18nCatalog,
  clawRouterI18nRuntimeConfig,
  resolveClawRouterInitialLocale,
} from '@sdkwork/clawrouter-pc-i18n';
import App from './App.tsx';
import { PortalQueryProvider, PortalErrorBoundary, clawRouterDocumentsReferenceRuntime } from '@sdkwork/clawroutes-pc-commons';
import { configureClawRouterDomainServiceProviders } from '@sdkwork/clawroutes-pc-commons/domain-service-providers';
import { DocumentsReferenceRuntimeProvider } from '@sdkwork/documents-pc-commons';
import { initializeThemePreferences } from './themePreference.ts';
import './index.css';

initializeThemePreferences();
configureClawRouterDomainServiceProviders();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalErrorBoundary>
      <PortalQueryProvider>
        <SdkworkI18nProvider
          catalogs={[clawRouterI18nCatalog, ...agentsWorkbenchI18nCatalogs]}
          config={clawRouterI18nRuntimeConfig}
          defaultVariables={{ platformName: 'Claw Router' }}
          locale={resolveClawRouterInitialLocale()}
          syncDocumentLanguage
        >
          <DocumentsReferenceRuntimeProvider value={clawRouterDocumentsReferenceRuntime}>
            <App />
          </DocumentsReferenceRuntimeProvider>
        </SdkworkI18nProvider>
      </PortalQueryProvider>
    </PortalErrorBoundary>
  </StrictMode>,
);
