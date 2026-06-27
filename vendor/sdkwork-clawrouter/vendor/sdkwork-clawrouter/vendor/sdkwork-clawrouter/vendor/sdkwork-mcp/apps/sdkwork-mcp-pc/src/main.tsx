import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot>
        <App />
      </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  </React.StrictMode>,
);
