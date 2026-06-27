import { NavLink, Outlet } from 'react-router-dom';

const primaryLinks = [
  { to: '/mcp-hub', label: 'Marketplace' },
  { to: '/console/mcp', label: 'Console' },
];

const adminLinks = [
  { to: '/admin/servers', label: 'Servers' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/invocations', label: 'Invocations' },
];

function navClassName({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function MCPShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">SDKWork</p>
            <h1 className="text-xl font-semibold text-slate-900">MCP Platform</h1>
            <p className="mt-1 text-xs text-slate-500">Registry · Marketplace · Admin</p>
          </div>
          <nav className="space-y-6">
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Discover</p>
              <div className="space-y-1">
                {primaryLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navClassName}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
              <div className="space-y-1">
                {adminLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navClassName}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
            <h1 className="text-lg font-semibold text-slate-900">SDKWork MCP</h1>
            <nav className="mt-3 flex flex-wrap gap-2">
              {[...primaryLinks, ...adminLinks].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
