import type { SdkworkAuthAppearanceConfig } from '@sdkwork/auth-pc-react';

export function resolveClawRouterAuthAppearance(): SdkworkAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-clawrouter-auth-aside-panel',
    bodyClassName: 'sdkwork-clawrouter-auth-body',
    contentContainerClassName: 'sdkwork-clawrouter-auth-content',
    pageClassName: 'sdkwork-clawrouter-auth-page',
    qrFrameClassName: 'sdkwork-clawrouter-auth-qr-frame',
    shellClassName: 'sdkwork-clawrouter-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-clawrouter-auth-background',
      },
      page: {
        className: 'sdkwork-clawrouter-auth-page',
      },
      shell: {
        className: 'sdkwork-clawrouter-auth-card-shell',
      },
    },
    theme: {
      asideCardBackgroundColor: 'var(--sdkwork-clawrouter-auth-aside-card-bg)',
      asideCardBorderColor: 'var(--sdkwork-clawrouter-auth-aside-card-border)',
      asidePanelBackgroundColor: 'var(--sdkwork-clawrouter-auth-aside-bg)',
      asidePanelBorderColor: 'var(--sdkwork-clawrouter-auth-aside-border)',
      asidePanelColor: 'var(--sdkwork-clawrouter-auth-aside-text)',
      badgeBackgroundColor: 'var(--sdkwork-clawrouter-auth-aside-badge-bg)',
      badgeTextColor: 'var(--sdkwork-clawrouter-auth-aside-badge-text)',
      contentBackgroundColor: 'var(--sdkwork-clawrouter-auth-content-bg)',
      contentBorderColor: 'transparent',
      contentTextColor: 'var(--sdkwork-clawrouter-auth-content-text)',
      descriptionColor: 'var(--sdkwork-clawrouter-auth-muted-text)',
      dividerColor: 'var(--sdkwork-clawrouter-auth-divider)',
      fieldBackgroundColor: 'var(--sdkwork-clawrouter-auth-field-bg)',
      fieldBorderColor: 'transparent',
      fieldPlaceholderColor: '#9ca3af',
      fieldTextColor: 'var(--sdkwork-clawrouter-auth-content-text)',
      formMutedTextColor: 'var(--sdkwork-clawrouter-auth-muted-text)',
      iconMutedColor: 'var(--sdkwork-clawrouter-auth-muted-text)',
      labelColor: 'var(--sdkwork-clawrouter-auth-content-text)',
      pageBackgroundColor: 'var(--sdkwork-clawrouter-auth-bg)',
      qrFrameBackgroundColor: 'var(--sdkwork-clawrouter-auth-qr-bg)',
      qrFrameBorderColor: 'transparent',
      shellBackgroundColor: 'var(--sdkwork-clawrouter-auth-content-bg)',
      shellBorderColor: 'transparent',
      tabActiveBackgroundColor: 'transparent',
      tabActiveTextColor: 'var(--sdkwork-clawrouter-auth-content-text)',
      tabBackgroundColor: 'transparent',
      tabInactiveTextColor: 'var(--sdkwork-clawrouter-auth-muted-text)',
      titleColor: 'var(--sdkwork-clawrouter-auth-content-text)',
    },
  };
}
