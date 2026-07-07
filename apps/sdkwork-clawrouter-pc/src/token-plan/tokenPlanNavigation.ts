import { buildPortalAuthLoginRedirect, hasPortalIamSession } from "@sdkwork/clawroutes-pc-commons/runtime";

export function navigateTokenPlanProtectedRoute(
  route: string,
  navigate: (route: string) => void,
): void {
  const url = new URL(route, "https://sdkwork.local");

  if (!hasPortalIamSession()) {
    navigate(
      buildPortalAuthLoginRedirect({
        hash: url.hash,
        pathname: url.pathname,
        search: url.search,
      }),
    );
    return;
  }

  navigate(route);
}
