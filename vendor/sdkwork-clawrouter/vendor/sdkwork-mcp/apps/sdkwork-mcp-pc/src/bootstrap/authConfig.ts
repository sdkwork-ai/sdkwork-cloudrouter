import type { SdkworkAuthRuntimeConfig } from '@sdkwork/auth-pc-react';

export interface SdkworkMCPPcAuthAppearanceConfig {
  asidePanelClassName?: string;
  bodyClassName?: string;
  contentContainerClassName?: string;
  pageClassName?: string;
  qrFrameClassName?: string;
  shellClassName?: string;
  slotProps?: {
    background?: { className?: string };
    page?: { className?: string };
    shell?: { className?: string };
  };
  theme?: Record<string, string>;
}

export type SdkworkMCPPcAuthRuntimeConfig = SdkworkAuthRuntimeConfig;

const MCP_VERIFICATION_POLICY = {
  emailCodeLoginEnabled: true,
  emailRegistrationVerificationRequired: false,
  phoneCodeLoginEnabled: true,
  phoneRegistrationVerificationRequired: false,
};

export function resolveSdkworkMCPPcAuthRuntimeConfig(): SdkworkMCPPcAuthRuntimeConfig {
  return {
    leftRailMode: 'qr-only',
    loginMethods: ['password', 'emailCode', 'phoneCode'],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: ['email', 'phone'],
    registerMethods: ['email', 'phone'],
    verificationPolicy: MCP_VERIFICATION_POLICY,
  };
}

export function resolveSdkworkMCPPcAuthAppearance(): SdkworkMCPPcAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-mcp-pc-auth-aside-panel',
    bodyClassName: 'sdkwork-mcp-pc-auth-body',
    contentContainerClassName: 'sdkwork-mcp-pc-auth-content',
    pageClassName: 'sdkwork-mcp-pc-auth-page',
    qrFrameClassName: 'sdkwork-mcp-pc-auth-qr-frame',
    shellClassName: 'sdkwork-mcp-pc-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-mcp-pc-auth-background',
      },
      page: {
        className: 'sdkwork-mcp-pc-auth-page',
      },
      shell: {
        className: 'sdkwork-mcp-pc-auth-card-shell',
      },
    },
  };
}

export function resolveSdkworkMCPPcAuthLocale(defaultLocale: string): string {
  return defaultLocale;
}
