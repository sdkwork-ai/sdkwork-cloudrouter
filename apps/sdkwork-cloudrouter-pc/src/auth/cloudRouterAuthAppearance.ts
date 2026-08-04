import type { SdkworkAuthAppearanceConfig } from '@sdkwork/auth-pc-react';

export function resolveCloudRouterAuthAppearance(): SdkworkAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-cloudrouter-auth-aside-panel',
    bodyClassName: 'sdkwork-cloudrouter-auth-body',
    contentContainerClassName: 'sdkwork-cloudrouter-auth-content',
    pageClassName: 'sdkwork-cloudrouter-auth-page',
    qrFrameClassName: 'sdkwork-cloudrouter-auth-qr-frame',
    shellClassName: 'sdkwork-cloudrouter-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-cloudrouter-auth-background',
      },
      page: {
        className: 'sdkwork-cloudrouter-auth-page',
      },
      shell: {
        className: 'sdkwork-cloudrouter-auth-card-shell',
      },
    },
    theme: {
      asideCardBackgroundColor: 'var(--sdkwork-cloudrouter-auth-aside-card-bg)',
      asideCardBorderColor: 'var(--sdkwork-cloudrouter-auth-aside-card-border)',
      asidePanelBackgroundColor: 'var(--sdkwork-cloudrouter-auth-aside-bg)',
      asidePanelBorderColor: 'var(--sdkwork-cloudrouter-auth-aside-border)',
      asidePanelColor: 'var(--sdkwork-cloudrouter-auth-aside-text)',
      badgeBackgroundColor: 'var(--sdkwork-cloudrouter-auth-aside-badge-bg)',
      badgeTextColor: 'var(--sdkwork-cloudrouter-auth-aside-badge-text)',
      contentBackgroundColor: 'var(--sdkwork-cloudrouter-auth-content-bg)',
      contentBorderColor: 'transparent',
      contentTextColor: 'var(--sdkwork-cloudrouter-auth-content-text)',
      descriptionColor: 'var(--sdkwork-cloudrouter-auth-muted-text)',
      dividerColor: 'var(--sdkwork-cloudrouter-auth-divider)',
      fieldBackgroundColor: 'var(--sdkwork-cloudrouter-auth-field-bg)',
      fieldBorderColor: 'transparent',
      fieldPlaceholderColor: '#9ca3af',
      fieldTextColor: 'var(--sdkwork-cloudrouter-auth-content-text)',
      formMutedTextColor: 'var(--sdkwork-cloudrouter-auth-muted-text)',
      iconMutedColor: 'var(--sdkwork-cloudrouter-auth-muted-text)',
      labelColor: 'var(--sdkwork-cloudrouter-auth-content-text)',
      pageBackgroundColor: 'var(--sdkwork-cloudrouter-auth-bg)',
      qrFrameBackgroundColor: 'var(--sdkwork-cloudrouter-auth-qr-bg)',
      qrFrameBorderColor: 'transparent',
      shellBackgroundColor: 'var(--sdkwork-cloudrouter-auth-content-bg)',
      shellBorderColor: 'transparent',
      tabActiveBackgroundColor: 'transparent',
      tabActiveTextColor: 'var(--sdkwork-cloudrouter-auth-content-text)',
      tabBackgroundColor: 'transparent',
      tabInactiveTextColor: 'var(--sdkwork-cloudrouter-auth-muted-text)',
      titleColor: 'var(--sdkwork-cloudrouter-auth-content-text)',
    },
  };
}
