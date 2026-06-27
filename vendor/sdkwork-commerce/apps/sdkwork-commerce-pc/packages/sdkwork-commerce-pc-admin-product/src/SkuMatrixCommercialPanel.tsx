import React from 'react';
import { Box, CirclePlus, ImageIcon, Layers, Plus, X } from 'lucide-react';
import { readMediaResourceUrl, toExternalUrlMediaResource } from './commerce-media-resource';
import type {
  ProductSkuDraft,
  ProductSkuSpecSelection,
  ProductSpecGroup,
  ProductSpecValue,
} from './ProductCreatePage';
import type { ProductSkuAttributeValue } from './productAdminTypes';

type SkuMatrixCommercialPanelProps = {
  currencyCode: string;
  skuAttributeValues: ProductSkuAttributeValue[];
  skuDrafts: ProductSkuDraft[];
  specGroups: ProductSpecGroup[];
  onSkuAttributeValuesChange: (values: ProductSkuAttributeValue[]) => void;
  onSkuDraftsChange: (skuDrafts: ProductSkuDraft[]) => void;
  onSpecGroupsChange: (specGroups: ProductSpecGroup[]) => void;
};

export function SkuMatrixCommercialPanel({
  currencyCode,
  onSkuAttributeValuesChange,
  onSkuDraftsChange,
  onSpecGroupsChange,
  skuAttributeValues,
  skuDrafts,
  specGroups,
}: SkuMatrixCommercialPanelProps) {
  function updateGroup(groupId: string, patch: Partial<ProductSpecGroup>) {
    onSpecGroupsChange(specGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  }

  function updateValue(groupId: string, valueId: string, patch: Partial<ProductSpecValue>) {
    onSpecGroupsChange(specGroups.map((group) => (
      group.id === groupId
        ? { ...group, values: group.values.map((value) => (value.id === valueId ? { ...value, ...patch } : value)) }
        : group
    )));
  }

  function addGroup() {
    const groupName = `Option ${specGroups.length + 1}`;
    onSpecGroupsChange([
      ...specGroups,
      {
        id: buildLocalId(groupName),
        name: groupName,
        values: [{ id: buildLocalId(`${groupName}-Default`), name: 'Default', code: 'DEFAULT', enabled: true }],
      },
    ]);
  }

  function addValue(group: ProductSpecGroup) {
    const valueName = `Value ${group.values.length + 1}`;
    updateGroup(group.id, {
      values: [
        ...group.values,
        { id: buildLocalId(`${group.name}-${valueName}`), name: valueName, code: slugCode(valueName), enabled: true },
      ],
    });
  }

  function updateSku(skuId: string, patch: Partial<ProductSkuDraft>) {
    onSkuDraftsChange(skuDrafts.map((sku) => (sku.id === skuId ? { ...sku, ...patch } : sku)));
  }

  function updateSkuAttribute(attributeId: string, patch: Partial<ProductSkuAttributeValue>) {
    onSkuAttributeValuesChange(skuAttributeValues.map((attribute) => (
      attribute.id === attributeId ? { ...attribute, ...patch } : attribute
    )));
  }

  const sellableSkuCount = skuDrafts.filter((sku) => sku.enabled && sku.status !== 'archived').length;

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171717]"
      data-admin-product-sku-matrix-commercial-panel
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PanelTitle
          icon={<Box className="h-5 w-5" />}
          title="Variant matrix and SKU operations"
          description="Configure option groups, generated variants, sellable SKU state, SKU images, pricing, and attribute values in one dense workflow."
        />
        <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-semibold">
          <Metric label="Options" value={String(specGroups.length)} />
          <Metric label="SKUs" value={String(skuDrafts.length)} />
          <Metric label="Sellable" value={String(sellableSkuCount)} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <BlockTitle icon={<Layers className="h-4 w-4" />} title="Option groups" />
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-lobster-300 bg-lobster-50 px-3 text-[12px] font-semibold text-lobster-600 transition-colors hover:bg-lobster-100 dark:border-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-300"
              onClick={addGroup}
              type="button"
            >
              <CirclePlus className="h-3.5 w-3.5" />
              Add group
            </button>
          </div>
          <div className="space-y-3">
            {specGroups.map((group) => (
              <div
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#171717] lg:grid-cols-[220px_minmax(0,1fr)_80px]"
                key={group.id}
              >
                <InlineInput value={group.name} onChange={(name) => updateGroup(group.id, { name })} />
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <label
                      className="inline-flex h-8 min-w-28 items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-[12px] shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                      key={value.id}
                    >
                      <input
                        className="min-w-0 flex-1 bg-transparent px-2 font-semibold text-slate-800 outline-none dark:text-slate-100"
                        value={value.name}
                        onChange={(event) => updateValue(group.id, value.id, {
                          name: event.target.value,
                          code: slugCode(event.target.value),
                        })}
                      />
                      <button
                        aria-label="Remove option value"
                        className="h-full border-l border-slate-200 px-2 text-slate-400 transition-colors hover:text-red-500 dark:border-white/10"
                        onClick={() => updateGroup(group.id, { values: group.values.filter((item) => item.id !== value.id) })}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </label>
                  ))}
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/15 dark:bg-[#1e1e1e] dark:text-slate-300"
                    onClick={() => addValue(group)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Value
                  </button>
                </div>
                <button
                  className="h-8 rounded-md text-[12px] font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  onClick={() => onSpecGroupsChange(specGroups.filter((item) => item.id !== group.id))}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[1180px] table-fixed text-left text-[13px]">
            <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
              <tr>
                <th className="w-[180px] px-3 py-2">Variant</th>
                <th className="w-[190px] px-3 py-2">SKU no</th>
                <th className="w-[190px] px-3 py-2">Barcode</th>
                <th className="w-[220px] px-3 py-2">Image URL</th>
                <th className="w-[130px] px-3 py-2 text-right">Price</th>
                <th className="w-[110px] px-3 py-2 text-right">Stock</th>
                <th className="w-[110px] px-3 py-2">State</th>
                <th className="px-3 py-2">Attributes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/10 dark:bg-[#171717]">
              {skuDrafts.map((sku) => (
                <tr className="align-top" key={sku.id}>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-950 dark:text-white">{sku.specPath}</div>
                    <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{formatSpecSelections(sku.specSelections)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <InlineInput value={sku.skuNo} onChange={(skuNo) => updateSku(sku.id, { skuNo })} />
                  </td>
                  <td className="px-3 py-3">
                    <InlineInput value={sku.barcode} onChange={(barcode) => updateSku(sku.id, { barcode })} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/[0.04]">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <InlineInput
                        value={readSkuImageUrl(sku)}
                        onChange={(value) => updateSku(sku.id, { image: toExternalUrlMediaResource(value, 'image') })}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <InlineInput
                      align="right"
                      value={sku.priceAmount}
                      onChange={(priceAmount) => updateSku(sku.id, { priceAmount, currencyCode: sku.currencyCode || currencyCode })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <InlineInput
                      align="right"
                      value={String(sku.stockQuantity)}
                      onChange={(stockQuantity) => updateSku(sku.id, { stockQuantity: normalizeStock(stockQuantity, sku.stockQuantity) })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className={`h-8 rounded-md border px-2 text-[12px] font-semibold ${
                        sku.enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                      }`}
                      onClick={() => updateSku(sku.id, {
                        enabled: !sku.enabled,
                        status: sku.enabled ? 'inactive' : 'active',
                      })}
                      type="button"
                    >
                      {sku.enabled ? 'Sellable' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="grid gap-2">
                      {skuAttributeValues
                        .filter((attribute) => attribute.skuDraftId === sku.id || attribute.specKey === sku.specKey)
                        .map((attribute) => (
                          <label className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2" key={attribute.id}>
                            <span className="truncate text-[12px] font-semibold text-slate-500 dark:text-slate-400">{attribute.attributeName}</span>
                            <InlineInput
                              value={attribute.displayValue || attribute.value}
                              onChange={(displayValue) => updateSkuAttribute(attribute.id, {
                                displayValue,
                                value: displayValue,
                              })}
                            />
                          </label>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PanelTitle({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-[17px] font-semibold text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[16px] font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function BlockTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
      {icon}
      {title}
    </div>
  );
}

function InlineInput({
  align,
  onChange,
  value,
}: {
  align?: 'right';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className={`h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 ${align === 'right' ? 'text-right tabular-nums' : ''}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function formatSpecSelections(specSelections: ProductSkuSpecSelection[]): string {
  return specSelections.map((selection) => `${selection.groupName}: ${selection.valueName}`).join(', ') || 'Default';
}

function readSkuImageUrl(sku: ProductSkuDraft): string {
  return readMediaResourceUrl(sku.image);
}

function normalizeStock(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function buildLocalId(value: string): string {
  return `${slugCode(value).toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugCode(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase();
  return ascii || `V${Math.abs(hashString(value)).toString(36).toUpperCase()}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return hash;
}
