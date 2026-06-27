import type { ReactElement, ReactNode } from 'react';

export interface SdkworkAuthRuntimeConfig {
  leftRailMode?: string;
  loginMethods?: string[];
  oauthLoginEnabled?: boolean;
  oauthProviders?: unknown[];
  qrLoginEnabled?: boolean;
  recoveryMethods?: string[];
  registerMethods?: string[];
  verificationPolicy?: Record<string, boolean>;
}

export interface SdkworkIamAuthRoutesProps {
  appearance?: Record<string, unknown>;
  basePath?: string;
  getRuntime: () => unknown;
  homePath?: string;
  locale?: string;
  runtimeConfig?: SdkworkAuthRuntimeConfig;
  viewportMode?: 'fixed' | 'flow' | 'page';
}

export function SdkworkIamAuthRoutes(props: SdkworkIamAuthRoutesProps): ReactElement | null;

export interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate(props: AuthGateProps): ReactElement | null;
