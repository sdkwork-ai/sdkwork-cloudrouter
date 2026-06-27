import { lazy, type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SdkworkIamAuthRoutes } from "@sdkwork/auth-pc-react";

import {
  resolveSdkworkCommercePcAuthAppearance,
  resolveSdkworkCommercePcAuthLocale,
  resolveSdkworkCommercePcAuthRuntimeConfig,
} from "./bootstrap/authConfig";
import type { SdkworkCommercePcRuntime } from "./bootstrap/runtime";
import {
  hasSdkworkCommercePcAuthenticatedSession,
  resolveSdkworkCommercePcAuthGateDecision,
} from "./authGateLogic";

export interface AuthGateProps {
  children: ReactNode;
  runtime: SdkworkCommercePcRuntime;
}

export function AuthGate({ children, runtime }: AuthGateProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => runtime.session.getSnapshot());

  useEffect(() => runtime.session.subscribe(setSnapshot), [runtime.session]);

  const decision = useMemo(
    () =>
      resolveSdkworkCommercePcAuthGateDecision({
        hasSession: hasSdkworkCommercePcAuthenticatedSession(snapshot),
        homePath: "/app/commerce",
        location,
      }),
    [location, snapshot],
  );

  useEffect(() => {
    if (decision.kind !== "redirect") {
      return;
    }
    navigate(decision.to, { replace: true });
  }, [decision, navigate]);

  if (decision.kind === "redirect") {
    return null;
  }

  if (decision.kind === "auth-route") {
    const authProps = {
      appearance: resolveSdkworkCommercePcAuthAppearance(),
      basePath: "/auth",
      getRuntime: () => runtime.iamRuntime,
      homePath: "/app/commerce",
      locale: resolveSdkworkCommercePcAuthLocale(runtime.config.i18n.defaultLocale),
      runtimeConfig: resolveSdkworkCommercePcAuthRuntimeConfig(),
      viewportMode: "flow" as const,
    };

    return <SdkworkIamAuthRoutes {...(authProps as unknown as Parameters<typeof SdkworkIamAuthRoutes>[0])} />;
  }

  return <>{children}</>;
}
