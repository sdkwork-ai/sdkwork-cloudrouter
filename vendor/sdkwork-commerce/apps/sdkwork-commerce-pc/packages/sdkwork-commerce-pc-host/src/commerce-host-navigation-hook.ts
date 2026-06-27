import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  resolveCommerceHostPaths,
  type SdkworkCommerceHostConfig,
  type SdkworkCommerceHostPaths,
} from "./commerce-host-config.ts";
import { createCommerceHostNavigator } from "./commerce-host-navigation.ts";

export interface SdkworkCommerceHostNavigation {
  checkoutPath: string;
  membershipsPath: string;
  onNavigate: (route: string) => void;
  paymentPath: string;
  paths: SdkworkCommerceHostPaths;
  routePrefix: string;
  walletPath: string;
}

export function useSdkworkCommerceHostNavigation(
  config?: SdkworkCommerceHostConfig,
): SdkworkCommerceHostNavigation {
  const navigate = useNavigate();
  const paths = useMemo(() => resolveCommerceHostPaths(config), [config?.routePrefix]);
  const onNavigate = useCallback(
    createCommerceHostNavigator(navigate, config),
    [config?.routePrefix, navigate],
  );

  return {
    ...paths,
    onNavigate,
    paths,
  };
}
