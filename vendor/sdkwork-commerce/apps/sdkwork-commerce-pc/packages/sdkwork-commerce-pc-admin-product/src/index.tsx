import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Layers, Package, PackageCheck, Tags } from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from './commerce-admin-primitives';
import {
  listCommerceAttributes,
  listCommerceCategories,
  listCommercePriceLists,
  listCommerceProducts,
  listCommerceSkus,
} from './catalogService';
import { AttributeManagementPage } from './AttributeManagementPage';
import { CategoryManagementPage } from './CategoryManagementPage';
import { ProductCreatePage } from './ProductCreatePage';
import { ProductListPage } from './ProductListPage';
import { SkuManagementPage } from './SkuManagementPage';

export {
  createCommerceProductAdminService,
  createCommerceProductAdminWorkspaceManifest,
} from './catalogService';
export * from './AttributeManagementPage';
export * from './CategoryManagementPage';
export * from './ProductCreatePage';
export * from './ProductListPage';
export * from './SkuManagementPage';
export * from './catalogService';
export * from './ProductAttributeValuePanel';
export * from './ProductDetailConfigPanel';
export * from './ProductPublishReadinessPanel';
export * from './ProductStoreInventoryPanel';
export * from './SkuMatrixCommercialPanel';
export * from './productAdminMapping';
export * from './productAdminReadiness';
export * from './productAdminTypes';
export * from './routes';

type CatalogAdminTab = 'categories' | 'products' | 'productCreate' | 'productEdit' | 'skus' | 'attributes' | 'prices';
type CatalogAdminGroup = string;

const DEFAULT_PAGE_PARAMS = { page: '1', pageSize: '100' };
const DEFAULT_CATALOG_SECTION_ID: CatalogAdminTab = 'products';

type CatalogAdminProps = {
  sectionId?: string;
};

function resolveCatalogSectionId(sectionId?: string): CatalogAdminTab {
  if (
    sectionId === 'categories'
    || sectionId === 'products'
    || sectionId === 'productCreate'
    || sectionId === 'productEdit'
    || sectionId === 'skus'
    || sectionId === 'attributes'
    || sectionId === 'prices'
  ) {
    return sectionId;
  }
  return DEFAULT_CATALOG_SECTION_ID;
}

function buildCatalogSections(t: ReturnType<typeof useTranslation>['t']): AdminResourceSection<CatalogAdminTab, CatalogAdminGroup>[] {
  return [
    {
      id: 'categories',
      title: t('admin.commerce.catalog.categories.title', 'Categories'),
      description: t('admin.commerce.catalog.categories.desc', 'Product category tree and storefront taxonomy.'),
      icon: <Layers className="h-4 w-4" />,
      group: t('admin.commerce.catalog.group.productCenter', 'Product Center'),
      load: () => listCommerceCategories(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'name', label: t('admin.col.name', 'Name') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'sortWeight', label: t('admin.col.sort', 'Sort'), align: 'right' },
      ],
      searchFields: ['id', 'name', 'code', 'status'],
    },
    {
      id: 'products',
      title: t('admin.commerce.catalog.products.title', 'Products'),
      description: t('admin.commerce.catalog.products.desc', 'SPU records for the shared product center.'),
      icon: <Package className="h-4 w-4" />,
      group: t('admin.commerce.catalog.group.productCenter', 'Product Center'),
      load: () => listCommerceProducts(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'name', label: t('admin.col.name', 'Name') },
        { key: 'productType', label: t('admin.col.type', 'Type') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['id', 'name', 'code', 'productType', 'status'],
    },
    {
      id: 'skus',
      title: t('admin.commerce.catalog.skus.title', 'SKUs'),
      description: t('admin.commerce.catalog.skus.desc', 'Purchasable product variants and fulfillment mode.'),
      icon: <PackageCheck className="h-4 w-4" />,
      group: t('admin.commerce.catalog.group.productCenter', 'Product Center'),
      load: () => listCommerceSkus(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'skuNo', label: t('admin.col.sku', 'SKU') },
        { key: 'productId', label: t('admin.col.product', 'Product') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['id', 'skuNo', 'productId', 'status'],
    },
    {
      id: 'attributes',
      title: t('admin.commerce.catalog.attributes.title', 'Attributes'),
      description: t('admin.commerce.catalog.attributes.desc', 'SPU and SKU structured attribute definitions.'),
      icon: <Tags className="h-4 w-4" />,
      group: t('admin.commerce.catalog.group.productCenter', 'Product Center'),
      load: () => listCommerceAttributes(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'name', label: t('admin.col.name', 'Name') },
        { key: 'scope', label: t('admin.col.scope', 'Scope') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['id', 'name', 'scope', 'status'],
    },
    {
      id: 'prices',
      title: t('admin.commerce.catalog.prices.title', 'Price Lists'),
      description: t('admin.commerce.catalog.prices.desc', 'Currency, market, channel, and segment pricing.'),
      icon: <Tags className="h-4 w-4" />,
      group: t('admin.commerce.catalog.group.productCenter', 'Product Center'),
      load: () => listCommercePriceLists(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'name', label: t('admin.col.name', 'Name') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['id', 'name', 'currencyCode', 'marketCode', 'status'],
    },
  ];
}

export function CatalogAdmin({ sectionId }: CatalogAdminProps = {}) {
  const { t } = useTranslation();
  const { productId } = useParams();
  const sections = useMemo(() => buildCatalogSections(t), [t]);
  const activeSectionId = resolveCatalogSectionId(sectionId);

  if (activeSectionId === 'products') {
    return <ProductListPage />;
  }

  if (activeSectionId === 'categories') {
    return <CategoryManagementPage />;
  }

  if (activeSectionId === 'productCreate') {
    return <ProductCreatePage mode="create" />;
  }

  if (activeSectionId === 'productEdit') {
    return <ProductCreatePage mode="edit" productId={productId} />;
  }

  if (activeSectionId === 'skus') {
    return <SkuManagementPage />;
  }

  if (activeSectionId === 'attributes') {
    return <AttributeManagementPage />;
  }

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.commerce.catalog.empty', 'No catalog records')}
      errorTitle={t('admin.commerce.catalog.error', 'Catalog data could not be loaded')}
      loadingTitle={t('admin.commerce.catalog.loading', 'Loading catalog records...')}
      sections={sections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-catalog-table-viewport"
    />
  );
}

export const CommerceProductAdmin = CatalogAdmin;
