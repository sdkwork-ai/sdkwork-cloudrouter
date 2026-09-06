import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { loadRuntimeEnv, type RuntimeEnv } from './lib/runtime-env';
import { getToken } from './lib/auth';
import { TabBar } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { PricingPage } from './pages/PricingPage';
import { UsagePage } from './pages/UsagePage';
import { MePage } from './pages/MePage';

function RequireAuth({ env, children }: { env: RuntimeEnv; children: ReactNode }): ReactNode {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App(): ReactNode {
  const [env, setEnv] = useState<RuntimeEnv | null>(null);
  const [loggedOutView, setLoggedOutView] = useState(false);

  useEffect(() => {
    void loadRuntimeEnv().then((loaded) => {
      setEnv(loaded);
      // If a stale token exists, drop straight into the console; API 401s clear it.
      setLoggedOutView(!getToken());
    });
  }, []);

  if (!env) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
      </div>
    );
  }

  const authenticated = !loggedOutView && Boolean(getToken());

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <Routes>
        <Route
          path="/login"
          element={authenticated ? <Navigate to="/" replace /> : <LoginPage env={env} />}
        />
        <Route
          path="/"
          element={
            <RequireAuth env={env}>
              <OverviewPage env={env} />
            </RequireAuth>
          }
        />
        <Route
          path="/api-keys"
          element={
            <RequireAuth env={env}>
              <ApiKeysPage env={env} />
            </RequireAuth>
          }
        />
        <Route
          path="/pricing"
          element={
            <RequireAuth env={env}>
              <PricingPage env={env} />
            </RequireAuth>
          }
        />
        <Route
          path="/usage"
          element={
            <RequireAuth env={env}>
              <UsagePage env={env} />
            </RequireAuth>
          }
        />
        <Route
          path="/me"
          element={
            <RequireAuth env={env}>
              <MePage env={env} />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {authenticated ? <TabBar /> : null}
    </div>
  );
}
