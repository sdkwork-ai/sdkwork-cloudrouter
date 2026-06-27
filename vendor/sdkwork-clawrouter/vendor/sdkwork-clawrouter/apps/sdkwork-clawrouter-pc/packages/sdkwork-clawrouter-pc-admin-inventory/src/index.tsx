import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, Warehouse } from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  listInventoryLedgerEntries,
  listInventoryReservations,
  listInventoryStocks,
} from './inventoryService';

type InventoryAdminTab = 'stocks' | 'reservations' | 'ledger';
type InventoryAdminGroup = string;

const DEFAULT_PAGE_PARAMS = { page: 1, pageSize: 100 };
const DEFAULT_INT64_PAGE_PARAMS = { page: '1', pageSize: '100' };
const DEFAULT_INVENTORY_SECTION_ID: InventoryAdminTab = 'stocks';

type InventoryAdminProps = {
  sectionId?: string;
};

function resolveInventorySectionId(sectionId?: string): InventoryAdminTab {
  if (sectionId === 'stocks' || sectionId === 'reservations' || sectionId === 'ledger') {
    return sectionId;
  }
  return DEFAULT_INVENTORY_SECTION_ID;
}

function buildInventorySections(t: ReturnType<typeof useTranslation>['t']): AdminResourceSection<InventoryAdminTab, InventoryAdminGroup>[] {
  return [
    {
      id: 'stocks',
      title: t('admin.commerce.inventory.stocks.title', 'Stock'),
      description: t('admin.commerce.inventory.stocks.desc', 'Inventory stock by SKU and warehouse.'),
      icon: <Warehouse className="h-4 w-4" />,
      group: t('admin.commerce.inventory.group.inventory', 'Inventory'),
      load: () => listInventoryStocks(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'skuId', label: t('admin.col.sku', 'SKU') },
        { key: 'warehouseId', label: t('admin.col.warehouse', 'Warehouse') },
        { key: 'availableQuantity', label: t('admin.col.available', 'Available'), align: 'right' },
      ],
      searchFields: ['id', 'skuId', 'warehouseId', 'status'],
    },
    {
      id: 'reservations',
      title: t('admin.commerce.inventory.reservations.title', 'Reservations'),
      description: t('admin.commerce.inventory.reservations.desc', 'Checkout and order inventory reservations.'),
      icon: <Boxes className="h-4 w-4" />,
      group: t('admin.commerce.inventory.group.inventory', 'Inventory'),
      load: () => listInventoryReservations(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'skuId', label: t('admin.col.sku', 'SKU') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['id', 'skuId', 'orderId', 'checkoutSessionId', 'status'],
    },
    {
      id: 'ledger',
      title: t('admin.commerce.inventory.ledger.title', 'Inventory Ledger'),
      description: t('admin.commerce.inventory.ledger.desc', 'Immutable stock movement audit entries.'),
      icon: <Boxes className="h-4 w-4" />,
      group: t('admin.commerce.inventory.group.inventory', 'Inventory'),
      load: () => listInventoryLedgerEntries(DEFAULT_INT64_PAGE_PARAMS),
      columns: [
        { key: 'id', label: t('admin.col.id', 'ID') },
        { key: 'skuId', label: t('admin.col.sku', 'SKU') },
        { key: 'sourceType', label: t('admin.col.source', 'Source') },
        { key: 'quantityDelta', label: t('admin.col.delta', 'Delta'), align: 'right' },
      ],
      searchFields: ['id', 'skuId', 'warehouseId', 'sourceType', 'sourceId'],
    },
  ];
}

export function InventoryAdmin({ sectionId }: InventoryAdminProps = {}) {
  const { t } = useTranslation();
  const sections = useMemo(() => buildInventorySections(t), [t]);
  const activeSectionId = resolveInventorySectionId(sectionId);

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.commerce.inventory.empty', 'No inventory records')}
      errorTitle={t('admin.commerce.inventory.error', 'Inventory data could not be loaded')}
      loadingTitle={t('admin.commerce.inventory.loading', 'Loading inventory records...')}
      sections={sections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-inventory-table-viewport"
    />
  );
}
