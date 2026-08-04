import { SdkworkProductDownloadSection } from '@sdkwork/cloudrouter-pc-downloads';
import { useTranslation } from 'react-i18next';
import { createCloudRouterDownloadCards, createCloudRouterDownloadCatalog } from '../downloads/cloudRouterDownloads';

interface DownloadPanelProps {
  className?: string;
  subtitle?: string;
  title?: string;
  variant?: 'compact' | 'hero' | 'section';
}

export function DownloadPanel({
  className,
  subtitle,
  title,
  variant = 'section',
}: DownloadPanelProps) {
  const { t } = useTranslation();
  const translateDownloadText = (
    key: string,
    fallback: string | {
      defaultValue?: string;
      [key: string]: unknown;
    },
  ): string => {
    if (typeof fallback === 'string') {
      return t(key, fallback);
    }

    return t(key, fallback);
  };

  return (
    <SdkworkProductDownloadSection
      className={className}
      catalog={{
        ...createCloudRouterDownloadCatalog(),
        cards: createCloudRouterDownloadCards(translateDownloadText),
      }}
      subtitle={subtitle}
      title={title}
      variant={variant}
    />
  );
}

export function DownloadSection() {
  const { t } = useTranslation();

  return (
    <DownloadPanel
      subtitle={t(
        'home.deploy.subtitle',
        'Choose the edition that fits your workflow. From local development to massive enterprise clusters.',
      )}
      title={t('home.deploy.title', 'Ready to deploy?')}
      variant="section"
    />
  );
}
