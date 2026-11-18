import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  Barcode,
  FolderTree,
  PackageSearch,
  RefreshCw,
  Truck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

import { Button, Notice, PageHeader, Panel } from '../components/ui.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type ProductCenterOverview,
} from '../productCenterService.ts';
import type { ProductCenterPageProps } from './resourcePage.tsx';

interface ChainEntry {
  key: string;
  icon: LucideIcon;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  to: string;
}

const CHAIN: readonly ChainEntry[] = [
  {
    key: 'catalog',
    icon: PackageSearch,
    titleKey: 'admin.productCenter.overview.chain.catalog',
    titleFallback: 'Catalog',
    descriptionKey: 'admin.productCenter.overview.chain.catalogDescription',
    descriptionFallback: 'Products, SKUs, and brands carry the sellable definition.',
    to: '/admin/products/list',
  },
  {
    key: 'taxonomy',
    icon: FolderTree,
    titleKey: 'admin.productCenter.overview.chain.taxonomy',
    titleFallback: 'Taxonomy',
    descriptionKey: 'admin.productCenter.overview.chain.taxonomyDescription',
    descriptionFallback: 'Categories and category attributes decide which variants exist.',
    to: '/admin/products/categories',
  },
  {
    key: 'inventory',
    icon: Warehouse,
    titleKey: 'admin.productCenter.overview.chain.inventory',
    titleFallback: 'Inventory',
    descriptionKey: 'admin.productCenter.overview.chain.inventoryDescription',
    descriptionFallback: 'Stock levels, movements, and reservations keep sellable quantity true.',
    to: '/admin/products/inventory',
  },
  {
    key: 'fulfillment',
    icon: Truck,
    titleKey: 'admin.productCenter.overview.chain.fulfillment',
    titleFallback: 'Fulfillment',
    descriptionKey: 'admin.productCenter.overview.chain.fulfillmentDescription',
    descriptionFallback: 'Shipments and logistics tracking close the order loop.',
    to: '/admin/products/shipments',
  },
];

interface MetricEntry {
  key: keyof Pick<ProductCenterOverview, 'products' | 'categories' | 'skus' | 'stocks' | 'shipments'>;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  to: string;
}

const METRICS: readonly MetricEntry[] = [
  {
    key: 'products',
    icon: PackageSearch,
    labelKey: 'admin.productCenter.overview.metric.products',
    labelFallback: 'Products',
    to: '/admin/products/list',
  },
  {
    key: 'categories',
    icon: FolderTree,
    labelKey: 'admin.productCenter.overview.metric.categories',
    labelFallback: 'Categories',
    to: '/admin/products/categories',
  },
  {
    key: 'skus',
    icon: Barcode,
    labelKey: 'admin.productCenter.overview.metric.skus',
    labelFallback: 'SKUs',
    to: '/admin/products/skus',
  },
  {
    key: 'stocks',
    icon: Warehouse,
    labelKey: 'admin.productCenter.overview.metric.stocks',
    labelFallback: 'Stock records',
    to: '/admin/products/inventory',
  },
  {
    key: 'shipments',
    icon: Truck,
    labelKey: 'admin.productCenter.overview.metric.shipments',
    labelFallback: 'Shipments',
    to: '/admin/products/shipments',
  },
];

export function ProductCenterOverviewPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [overview, setOverview] = useState<ProductCenterOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    resolved.loadOverview().then(
      (result) => {
        if (!active) {
          return;
        }
        setOverview(result);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setOverview(null);
        setError(describeProductCenterError(loadError).message);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [reloadToken, resolved]);

  const unavailable = overview?.unavailable ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <Button onClick={reload} variant="secondary">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.refresh', 'Refresh')}
          </Button>
        }
        description={t('admin.productCenter.overview.description', '')}
        title={t('admin.productCenter.overview.title', 'Product Center')}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {unavailable.length > 0 ? (
        <Notice tone="info">
          {t('admin.productCenter.overview.metric.unavailable', 'Unavailable')}: {unavailable.join(', ')}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const value = overview?.[metric.key];
          return (
            <a
              className="group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-lobster-400 dark:border-white/10 dark:bg-[#171717]"
              href={metric.to}
              key={metric.key}
            >
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{t(metric.labelKey, metric.labelFallback)}</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '…' : value === undefined ? '—' : value}
              </div>
            </a>
          );
        })}
      </div>

      <Panel title={t('admin.productCenter.overview.chainTitle', 'Operating chain')}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {CHAIN.map((entry) => {
            const Icon = entry.icon;
            return (
              <a
                className="group flex items-start gap-3 rounded-md border border-slate-200 p-3 transition-colors hover:border-lobster-400 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                href={entry.to}
                key={entry.key}
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-lobster-500/15 text-lobster-500">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {t(entry.titleKey, entry.titleFallback)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {t(entry.descriptionKey, entry.descriptionFallback)}
                  </span>
                </span>
                <ArrowLeftRight aria-hidden="true" className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
