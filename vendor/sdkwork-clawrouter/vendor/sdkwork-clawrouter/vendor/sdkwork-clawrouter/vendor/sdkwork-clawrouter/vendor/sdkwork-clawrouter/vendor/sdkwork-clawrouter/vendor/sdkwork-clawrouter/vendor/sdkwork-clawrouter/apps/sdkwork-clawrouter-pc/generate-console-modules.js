import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modules = [
  'dashboard', 'usage', 'gateway', 'routing',
  'api-keys', 'user',
  'redeem', 'recharge', 'billing', 'settlements', 'account',
  'core' // for console shell/layout
];

const packagesDir = path.join(__dirname, 'packages');

modules.forEach(mod => {
  const pkgName = `sdkwork-clawrouter-pc-console-${mod}`;
  const dirPath = path.join(packagesDir, pkgName);
  const srcPath = path.join(dirPath, 'src');

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(srcPath)) {
    fs.mkdirSync(srcPath, { recursive: true });
  }

  // Generate package.json
  const pkgJson = {
    name: pkgName,
    version: "0.0.1",
    private: true,
    main: "src/index.ts",
    dependencies: {
      "lucide-react": "^0.546.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "react-router-dom": "^7.14.0"
    }
  };
  fs.writeFileSync(path.join(dirPath, 'package.json'), JSON.stringify(pkgJson, null, 2));

  // Generate basic component
  const componentName = mod.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const componentContent = `import React from 'react';

export function ${componentName}View() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">${componentName} Module</h1>
      <div className="bg-white dark:bg-[#0d1117] rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <p className="text-slate-600 dark:text-slate-400">
          This is the ${componentName} module.
          Currently loading as an independent package: <code>${pkgName}</code>
        </p>
      </div>
    </div>
  );
}
`;

  if (mod !== 'core') {
    fs.writeFileSync(path.join(srcPath, 'index.ts'), `export * from './${componentName}View';\n`);
    fs.writeFileSync(path.join(srcPath, `${componentName}View.tsx`), componentContent);
  } else {
    // Scaffold out the shell for core
    const shellContent = `import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Server, Waypoints, Key, User, Gift, CreditCard, Receipt, FileText, Wallet, Settings, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';

const mainNavigation = [
  { name: 'Dashboard', path: '/console/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', path: '/console/api-keys', icon: Key },
  { name: 'Usage', path: '/console/usage', icon: Activity },
  { name: 'Redeem', path: '/console/redeem', icon: Gift },
  { name: 'Recharge', path: '/console/recharge', icon: CreditCard },
  { name: 'Settlements', path: '/console/settlements', icon: FileText },
  { name: 'Account', path: '/console/account', icon: Wallet },
];

export function ConsoleLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#010409] flex selection:bg-blue-500/30">

      {/* Sidebar */}
      <div className={\`\${sidebarOpen ? 'w-64' : 'w-20'} shrink-0 bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-white/10 flex flex-col transition-all duration-300 relative z-10\`}>

        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-white/10 justify-between">
          {sidebarOpen && (
            <Link to="/" className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              Console
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5 mx-auto" />}
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 custom-scrollbar">
          {mainNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all \${
                  isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                }\`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className={\`w-5 h-5 shrink-0 \${isActive ? 'text-blue-600 dark:text-blue-400' : ''}\`} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Menu Nav */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-1">
           <Link
              to="/console/user"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              title={!sidebarOpen ? "User details" : undefined}
            >
              <User className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>User details</span>}
           </Link>
           <button
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              title={!sidebarOpen ? "Settings" : undefined}
            >
              <Settings className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>Settings</span>}
           </button>
           <button
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              title={!sidebarOpen ? "Sign out" : undefined}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>Sign out</span>}
           </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto custom-scrollbar">
        {/* Placeholder Topbar if needed */}
        <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-transparent backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">
               Workspace <span className="mx-2 text-slate-300 dark:text-slate-600">/</span> Default Project
            </h2>
            {/* Topbar actions could go here */}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
`;
    fs.writeFileSync(path.join(srcPath, 'index.ts'), `export * from './ConsoleLayout';\n`);
    fs.writeFileSync(path.join(srcPath, `ConsoleLayout.tsx`), shellContent);
  }

});

// Output update strings for package.json
console.log('--- Add this to package.json dependencies ---');
modules.forEach(mod => {
  console.log(`"sdkwork-clawrouter-pc-console-${mod}": "file:./packages/sdkwork-clawrouter-pc-console-${mod}",`);
});
