import { useMemo } from 'react';
import { SdkworkProductDownloadSection } from '@sdkwork/cloudrouter-pc-downloads';
import { useTranslation } from 'react-i18next';
import {
  applyResolvedDownloadUrls,
  cloudRouterDownloadCatalog,
  createCloudRouterDownloadCards,
  createCloudRouterDownloadCatalog,
  dropHiddenDownloadCatalogCards,
  hasVisibleDownloadCatalogCards,
  readDownloadActionDriveRefs,
  resolvableDownloadDriveRefs,
  resolveUsableDownloadCatalog,
  type SdkworkDownloadDriveRef,
} from '../downloads/cloudRouterDownloads';
import { useDriveDownloadUrls } from '../downloads/useDriveDownloadUrls';
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

  // Cards an operator hid on `/admin/site` leave the section entirely. When everything they
  // published is hidden, the section draws nothing at all — resurrecting the bundled catalog
  // would override a deliberate operator decision.
  const visibleCatalog = publishedCatalog === undefined
    ? undefined
    : dropHiddenDownloadCatalogCards(publishedCatalog);
  const sectionVisible = visibleCatalog === undefined
    || hasVisibleDownloadCatalogCards(visibleCatalog);

  // Installers an operator uploaded land on their actions as Drive references; resolve each to a
  // fresh presigned URL before rendering so the buttons link somewhere a visitor can actually
  // follow. Installers the operator explicitly hid are excluded — their disabled state is a
  // decision, not the "href not navigable yet" state resolution exists to fix — and actions
  // whose resolution has not landed yet stay disabled rather than rendering a link that cannot
  // be followed.
  const driveRefs = useMemo(
    () => (visibleCatalog === undefined || !sectionVisible
      ? new Map<string, SdkworkDownloadDriveRef>()
      : readDownloadActionDriveRefs(visibleCatalog)),
    [visibleCatalog, sectionVisible],
  );
  const driveUrls = useDriveDownloadUrls(
    useMemo(() => resolvableDownloadDriveRefs(driveRefs), [driveRefs]),
  );

  // The early return sits below every hook, so flipping between "some card visible" and "all
  // hidden" across renders never changes the hook order.
  if (!sectionVisible) {
    return null;
  }

  const catalog = createCloudRouterDownloadCatalog(
    publishedCatalog ?? cloudRouterDownloadCatalog,
  );
  const cards = applyResolvedDownloadUrls(
    createCloudRouterDownloadCards(translateDownloadText, {
      brandVariables: home.variables,
      ...(visibleCatalog !== undefined ? { catalog: visibleCatalog } : {}),
    }),
    driveUrls,
    driveRefs,
  );

  return (
    <SdkworkProductDownloadSection
      className={className}
      catalog={{
        ...catalog,
        cards,
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
