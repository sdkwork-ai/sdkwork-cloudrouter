import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { MarketplacePage, ServerDetailPage, ToastContainer } from '@sdkwork/mcp-h5-mcp';
import { MCP_SERVER_ROUTE_PREFIX } from '@sdkwork/mcp-h5-shell';

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-[#141414] text-gray-100">
        <ToastContainer />
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold">SDKWork MCP</h1>
            <p className="text-xs text-gray-400">Mobile MCP marketplace</p>
          </div>
        </header>
        <main className="flex min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<MarketplacePage />} />
            <Route path={`/${MCP_SERVER_ROUTE_PREFIX}/:serverKey`} element={<ServerDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
