import { SdkworkAppErrorBoundary } from '@sdkwork/appbase-pc-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PortalErrorBoundaryProps {
  children: ReactNode;
}

export function PortalErrorBoundary({ children }: PortalErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <SdkworkAppErrorBoundary
      labels={{
        description: t('shared.errorBoundary.description'),
        retry: t('shared.errorBoundary.retry'),
        title: t('shared.errorBoundary.title'),
      }}
      onRetry={() => window.location.reload()}
    >
      {children}
    </SdkworkAppErrorBoundary>
  );
}
