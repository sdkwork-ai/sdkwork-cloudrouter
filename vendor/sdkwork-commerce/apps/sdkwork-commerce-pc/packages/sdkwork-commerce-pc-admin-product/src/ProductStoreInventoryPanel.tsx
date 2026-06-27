import React from 'react';
import { Building2, PackageCheck, ShieldAlert, Store } from 'lucide-react';
import type { ProductInventoryPolicy, ProductStoreVisibility } from './productAdminTypes';

type ProductStoreInventoryPanelProps = {
  inventoryPolicy: ProductInventoryPolicy;
  productType: string;
  storeVisibility: ProductStoreVisibility;
  onInventoryPolicyChange: (inventoryPolicy: ProductInventoryPolicy) => void;
  onStoreVisibilityChange: (storeVisibility: ProductStoreVisibility) => void;
};

export function ProductStoreInventoryPanel({
  inventoryPolicy,
  onInventoryPolicyChange,
  onStoreVisibilityChange,
  productType,
  storeVisibility,
}: ProductStoreInventoryPanelProps) {
  const physicalRequired = productType === 'physical_good';

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171717]"
      data-admin-product-store-inventory-panel
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold text-slate-950 dark:text-white">Stores, channels, and inventory source</h3>
          <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
            Store visibility and source assignment are readiness inputs for commercial publishing.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <BlockTitle icon={<Building2 className="h-4 w-4" />} title="Store visibility" />
          <Toggle
            checked={storeVisibility.visible}
            label="Visible in selected stores"
            onChange={(visible) => onStoreVisibilityChange({ ...storeVisibility, visible })}
          />
          <TextField
            label="Store IDs"
            value={storeVisibility.storeIds.join(', ')}
            onChange={(value) => onStoreVisibilityChange({
              ...storeVisibility,
              storeIds: splitValues(value),
              primaryStoreId: splitValues(value)[0] ?? storeVisibility.primaryStoreId,
            })}
          />
          <TextField
            label="Channel codes"
            value={storeVisibility.channelCodes.join(', ')}
            onChange={(value) => onStoreVisibilityChange({ ...storeVisibility, channelCodes: splitValues(value) })}
          />
          <TextField
            label="Primary store"
            value={storeVisibility.primaryStoreId}
            onChange={(primaryStoreId) => onStoreVisibilityChange({ ...storeVisibility, primaryStoreId })}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <BlockTitle icon={<PackageCheck className="h-4 w-4" />} title="Inventory policy" />
          <Toggle
            checked={inventoryPolicy.managed}
            label={physicalRequired ? 'Inventory managed by source' : 'Inventory managed for this product'}
            onChange={(managed) => onInventoryPolicyChange({ ...inventoryPolicy, managed })}
          />
          <TextField
            label="Source IDs"
            value={inventoryPolicy.sourceIds.join(', ')}
            onChange={(value) => onInventoryPolicyChange({ ...inventoryPolicy, sourceIds: splitValues(value) })}
          />
          <TextField
            label="Safety stock"
            value={String(inventoryPolicy.safetyStock)}
            onChange={(value) => onInventoryPolicyChange({ ...inventoryPolicy, safetyStock: normalizeInteger(value) })}
          />
          <Toggle
            checked={inventoryPolicy.allowBackorder}
            label="Allow backorder"
            onChange={(allowBackorder) => onInventoryPolicyChange({ ...inventoryPolicy, allowBackorder })}
          />
          {physicalRequired && inventoryPolicy.sourceIds.length === 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Physical products require at least one inventory source before publish.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function BlockTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
      {icon}
      {title}
    </div>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <input
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition-colors focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200">
      {label}
      <input
        checked={checked}
        className="h-4 w-4 accent-lobster-600 dark:accent-lobster-400"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function splitValues(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeInteger(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}
