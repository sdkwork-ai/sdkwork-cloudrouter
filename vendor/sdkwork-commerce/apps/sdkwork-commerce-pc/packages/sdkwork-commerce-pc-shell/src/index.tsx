import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";
import { getSdkworkCommercePcAppRoutes, sdkworkCommercePcBrand } from "@sdkwork/commerce-pc-commons";

export interface SdkworkCommercePcShellRuntime {
  readonly config: {
    readonly appDisplayName: string;
    readonly environment: string;
    readonly version: string;
  };
  readonly routes: readonly SdkworkCommercePcRouteContribution[];
}

export interface SdkworkCommercePcShellProps {
  readonly children: ReactNode;
  readonly runtime: SdkworkCommercePcShellRuntime;
}

export function SdkworkCommercePcShell({
  children,
  runtime,
}: SdkworkCommercePcShellProps) {
  const activeAppRoutes = getSdkworkCommercePcAppRoutes(runtime.routes);
  const brandName = runtime.config.appDisplayName || sdkworkCommercePcBrand.name;

  return (
    <div className="sdkwork-commerce-pc-app">
      <aside className="sdkwork-commerce-pc-rail" aria-label="Commerce navigation">
        <div className="sdkwork-commerce-pc-brand">
          <span className="sdkwork-commerce-pc-brand-mark">{sdkworkCommercePcBrand.mark}</span>
          <span>{brandName}</span>
        </div>

        <nav className="sdkwork-commerce-pc-nav">
          {activeAppRoutes.map((route) => (
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? "sdkwork-commerce-pc-nav-link sdkwork-commerce-pc-nav-link-active"
                  : "sdkwork-commerce-pc-nav-link"}
              end
              key={route.id}
              to={route.path}
            >
              {route.title}
            </NavLink>
          ))}
        </nav>

        <div className="sdkwork-commerce-pc-runtime">
          <span>{runtime.config.environment}</span>
          <span>{runtime.config.version}</span>
        </div>
      </aside>

      <main className="sdkwork-commerce-pc-main">{children}</main>
    </div>
  );
}
