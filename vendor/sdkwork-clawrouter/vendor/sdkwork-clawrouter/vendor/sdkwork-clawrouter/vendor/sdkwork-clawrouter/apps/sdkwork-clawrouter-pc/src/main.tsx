import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PortalQueryProvider, PortalErrorBoundary, clawRouterDocumentsReferenceRuntime } from '@sdkwork/clawroutes-pc-commons';
import { DocumentsReferenceRuntimeProvider } from '@sdkwork/documents-pc-commons';
import { initializeThemePreferences } from './themePreference.ts';
import './index.css';
import '@sdkwork/clawrouter-pc-i18n';

initializeThemePreferences();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalErrorBoundary>
      <PortalQueryProvider>
        <DocumentsReferenceRuntimeProvider value={clawRouterDocumentsReferenceRuntime}>
          <App />
        </DocumentsReferenceRuntimeProvider>
      </PortalQueryProvider>
    </PortalErrorBoundary>
  </StrictMode>,
);
