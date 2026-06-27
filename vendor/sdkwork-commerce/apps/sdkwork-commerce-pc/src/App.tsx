import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';
import { SdkworkCommercePcShell } from "@sdkwork/commerce-pc-shell";

import { AppRoutes } from "./AppRoutes";
import { AuthGate } from "./AuthGate";
import { CommerceErrorBoundary } from "./CommerceErrorBoundary";
import { createSdkworkCommercePcRuntime } from "./bootstrap/runtime";

const runtime = createSdkworkCommercePcRuntime();

export function App() {
  return (
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot>
      <Routes>
        <Route
          element={(
            <AuthGate runtime={runtime}>
              <SdkworkCommercePcShell runtime={runtime}>
                <CommerceErrorBoundary>
                  <AppRoutes runtime={runtime} />
                </CommerceErrorBoundary>
              </SdkworkCommercePcShell>
            </AuthGate>
          )}
          path="/*"
        />
      </Routes>
          </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}
