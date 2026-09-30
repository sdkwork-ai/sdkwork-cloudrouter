import { SdkworkProductDownloadSection } from '@sdkwork/cloudrouter-pc-downloads';
import { useTranslation } from 'react-i18next';
import {
  cloudRouterDownloadCatalog,
  createCloudRouterDownloadCards,
  createCloudRouterDownloadCatalog,
  resolveUsableDownloadCatalog,
} from '../downloads/cloudRouterDownloads';
import { useHomeContent } from '../content/useHomeContent';

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
  const home = useHomeContent();
  const translateDownloadText = (
    key: string,
    fallback: string | {
      defaultValue?: string;
      [key: string]: unknown;
    },
  ): string => {
    // The two branches exist because i18next overloads `t` on the fallback's shape; collapsing
    // them into one call makes the compiler unable to pick an overload.
    if (typeof fallback === 'string') {
      return t(key, fallback);
    }

    return t(key, fallback);
  };

  // `undefined` means the console published nothing usable, which is the signal to keep rendering
  // the catalog checked into the repository — the same no-op guarantee the footer switches have.
  const publishedCatalog = resolveUsableDownloadCatalog(home.downloadCatalog);
  const catalog = createCloudRouterDownloadCatalog(
    publishedCatalog ?? cloudRouterDownloadCatalog,
  );

  return (
    <SdkworkProductDownloadSection
      className={className}
      catalog={{
        ...catalog,
        cards: createCloudRouterDownloadCards(translateDownloadText, {
          brandVariables: home.variables,
          ...(publishedCatalog !== undefined ? { catalog: publishedCatalog } : {}),
        }),
      }}
      subtitle={subtitle}
      title={title}
      variant={variant}
    />
  );
}

export function DownloadSection() {
  const { t } = useTranslation();
  const home = useHomeContent();

  return (
    <DownloadPanel
      subtitle={home.text(
        home.content.download?.subtitle,
        t(
          'home.deploy.subtitle',
          'Choose the edition that fits your workflow. From local development to massive enterprise clusters.',
        ),
      )}
      title={home.text(
        home.content.download?.title,
        t('home.deploy.title', 'Ready to deploy?'),
      )}
      variant="section"
    />
  );
}
