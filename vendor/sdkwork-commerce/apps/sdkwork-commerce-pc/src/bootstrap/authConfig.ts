import type { SdkworkAuthRuntimeConfig } from "@sdkwork/auth-pc-react";

export interface SdkworkCommercePcAuthAppearanceConfig {
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

export type SdkworkCommercePcAuthRuntimeConfig = SdkworkAuthRuntimeConfig;
const COMMERCE_VERIFICATION_POLICY = {
  emailCodeLoginEnabled: true,
  emailRegistrationVerificationRequired: false,
  phoneCodeLoginEnabled: true,
  phoneRegistrationVerificationRequired: false,
};

export function resolveSdkworkCommercePcAuthRuntimeConfig(): SdkworkCommercePcAuthRuntimeConfig {
  return {
    leftRailMode: "qr-only",
    loginMethods: ["password", "emailCode", "phoneCode"],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: ["email", "phone"],
    registerMethods: ["email", "phone"],
    verificationPolicy: COMMERCE_VERIFICATION_POLICY,
  };
}

export function resolveSdkworkCommercePcAuthAppearance(): SdkworkCommercePcAuthAppearanceConfig {
  return {
    asidePanelClassName: "sdkwork-commerce-pc-auth-aside-panel",
    bodyClassName: "sdkwork-commerce-pc-auth-body",
    contentContainerClassName: "sdkwork-commerce-pc-auth-content",
    pageClassName: "sdkwork-commerce-pc-auth-page",
    qrFrameClassName: "sdkwork-commerce-pc-auth-qr-frame",
    shellClassName: "sdkwork-commerce-pc-auth-card-shell",
    slotProps: {
      background: {
        className: "sdkwork-commerce-pc-auth-background",
      },
      page: {
        className: "sdkwork-commerce-pc-auth-page",
      },
      shell: {
        className: "sdkwork-commerce-pc-auth-card-shell",
      },
    },
  };
}

export function resolveSdkworkCommercePcAuthLocale(defaultLocale: string): string {
  return defaultLocale;
}
