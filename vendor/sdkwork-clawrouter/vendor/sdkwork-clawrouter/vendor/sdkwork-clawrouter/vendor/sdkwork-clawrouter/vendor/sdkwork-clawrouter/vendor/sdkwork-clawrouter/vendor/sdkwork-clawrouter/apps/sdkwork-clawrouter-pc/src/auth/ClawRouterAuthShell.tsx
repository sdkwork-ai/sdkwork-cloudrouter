import { useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun, Terminal, X } from 'lucide-react';

type AuthThemeMode = 'dark' | 'light';

function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && !!(globalThis as Record<string, unknown>).__TAURI__;
}

function usesNativeDesktopWindowControls(): boolean {
  return isDesktopRuntime();
}

export function ClawRouterAuthShell({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<AuthThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const isLightMode = themeMode === 'light';
  const shouldRenderDesktopHeader = isDesktopRuntime();
  const shouldRenderWindowControls = shouldRenderDesktopHeader && !usesNativeDesktopWindowControls();

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', isLightMode);
    document.documentElement.style.colorScheme = themeMode;
    document.documentElement.classList.add('sdkwork-clawrouter-auth-active');
    document.body.classList.add('sdkwork-clawrouter-auth-active');
    return () => {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.remove('sdkwork-clawrouter-auth-active');
      document.documentElement.style.removeProperty('color-scheme');
      document.body.classList.remove('sdkwork-clawrouter-auth-active');
    };
  }, [themeMode, isLightMode]);

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleMinimize = () => {
    window.dispatchEvent(new CustomEvent('sdkwork-clawrouter:window-control', {
      detail: { action: 'minimize' },
    }));
  };

  const handleToggleMaximize = () => {
    window.dispatchEvent(new CustomEvent('sdkwork-clawrouter:window-control', {
      detail: { action: 'toggleMaximize' },
    }));
  };

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('sdkwork-clawrouter:window-control', {
      detail: { action: 'close' },
    }));
  };

  return (
    <div className="sdkwork-clawrouter-auth-shell">
      {shouldRenderDesktopHeader ? (
        <header className="sdkwork-clawrouter-auth-header drag-region">
          <div className="sdkwork-clawrouter-auth-header-brand">
            <span className="sdkwork-clawrouter-auth-header-mark">
              <Terminal size={12} />
            </span>
            <span>Claw Router</span>
          </div>
          <div className="sdkwork-clawrouter-auth-header-center" />
          <div className="sdkwork-clawrouter-auth-header-actions no-drag">
            <button
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="sdkwork-clawrouter-auth-theme-button"
              onClick={toggleTheme}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              type="button"
            >
              {isLightMode ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            {shouldRenderWindowControls ? (
              <div className="sdkwork-clawrouter-auth-window-controls">
                <button
                  aria-label="Minimize window"
                  className="sdkwork-clawrouter-auth-window-button"
                  onClick={handleMinimize}
                  title="Minimize"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 10 10">
                    <path d="M2 7H8" stroke="currentColor" strokeLinecap="square" strokeWidth="1" />
                  </svg>
                </button>
                <button
                  aria-label="Maximize window"
                  className="sdkwork-clawrouter-auth-window-button"
                  onClick={handleToggleMaximize}
                  title="Maximize"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 10 10">
                    <path d="M2 2.5H8V8H2V2.5Z" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </button>
                <button
                  aria-label="Close window"
                  className="sdkwork-clawrouter-auth-window-button sdkwork-clawrouter-auth-window-button-danger"
                  onClick={handleClose}
                  title="Close"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}
      <main className="sdkwork-clawrouter-auth-main">{children}</main>
    </div>
  );
}
