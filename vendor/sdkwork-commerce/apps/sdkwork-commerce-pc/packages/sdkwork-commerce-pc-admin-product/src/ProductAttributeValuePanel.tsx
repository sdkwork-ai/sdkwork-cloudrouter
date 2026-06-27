import React from 'react';
import { ListChecks, Tags } from 'lucide-react';
import type {
  ProductCategoryAttributeValue,
  ProductSkuAttributeValue,
} from './productAdminTypes';
import type { ProductSkuDraft } from './ProductCreatePage';

type ProductAttributeValuePanelProps = {
  categoryAttributeValues: ProductCategoryAttributeValue[];
  selectedCategoryIds: string[];
  skuAttributeValues: ProductSkuAttributeValue[];
  skuDrafts: ProductSkuDraft[];
  onCategoryAttributeValuesChange: (values: ProductCategoryAttributeValue[]) => void;
  onSkuAttributeValuesChange: (values: ProductSkuAttributeValue[]) => void;
};

export function ProductAttributeValuePanel({
  categoryAttributeValues,
  onCategoryAttributeValuesChange,
  onSkuAttributeValuesChange,
  selectedCategoryIds,
  skuAttributeValues,
  skuDrafts,
}: ProductAttributeValuePanelProps) {
  function updateCategoryAttribute(attributeId: string, patch: Partial<ProductCategoryAttributeValue>) {
    onCategoryAttributeValuesChange(categoryAttributeValues.map((attribute) => (
      attribute.id === attributeId ? { ...attribute, ...patch } : attribute
    )));
  }

  function addCategoryAttribute() {
    const index = categoryAttributeValues.length + 1;
    onCategoryAttributeValuesChange([
      ...categoryAttributeValues,
      {
        id: `category-attribute-${Date.now()}`,
        attributeId: `custom-${index}`,
        attributeNo: `ATTR-CUSTOM-${index}`,
        attributeName: `Custom attribute ${index}`,
        valueType: 'text',
        value: '',
        displayValue: '',
        required: false,
      },
    ]);
  }

  function updateSkuAttribute(attributeId: string, patch: Partial<ProductSkuAttributeValue>) {
    onSkuAttributeValuesChange(skuAttributeValues.map((attribute) => (
      attribute.id === attributeId ? { ...attribute, ...patch } : attribute
    )));
  }

  const skuTitleById = new Map(skuDrafts.map((sku) => [sku.id, sku.specPath || sku.title || sku.skuNo]));

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171717]"
      data-admin-product-attribute-value-panel
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PanelTitle
          icon={<Tags className="h-5 w-5" />}
          title="Category and SKU attributes"
          description="Maintain commercial attribute values used for filtering, detail tables, variant matching, and publish readiness."
        />
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {selectedCategoryIds.length} categories, {categoryAttributeValues.length} category attributes, {skuAttributeValues.length} SKU values
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <BlockTitle icon={<ListChecks className="h-4 w-4" />} title="Category attribute values" />
            <button
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200"
              onClick={addCategoryAttribute}
              type="button"
            >
              Add
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717]">
            <table className="w-full min-w-[700px] table-fixed text-left text-[13px]">
              <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th className="w-[180px] px-3 py-2">Attribute</th>
                  <th className="w-[130px] px-3 py-2">Type</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="w-[92px] px-3 py-2">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {categoryAttributeValues.map((attribute) => (
                  <tr key={attribute.id}>
                    <td className="px-3 py-2">
                      <InlineInput
                        value={attribute.attributeName}
                        onChange={(attributeName) => updateCategoryAttribute(attribute.id, { attributeName })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={inlineSelectClassName}
                        value={attribute.valueType}
                        onChange={(event) => updateCategoryAttribute(attribute.id, {
                          valueType: event.target.value as ProductCategoryAttributeValue['valueType'],
                        })}
                      >
                        {['text', 'number', 'boolean', 'enum', 'multi_enum', 'date', 'json'].map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <InlineInput
                        value={attribute.displayValue || attribute.value}
                        onChange={(displayValue) => updateCategoryAttribute(attribute.id, {
                          displayValue,
                          value: displayValue,
                        })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={attribute.required}
                        className="h-4 w-4 accent-lobster-600 dark:accent-lobster-400"
                        onChange={(event) => updateCategoryAttribute(attribute.id, { required: event.target.checked })}
                        type="checkbox"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <BlockTitle icon={<Tags className="h-4 w-4" />} title="SKU attribute values" />
          <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717]">
            <table className="w-full min-w-[760px] table-fixed text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#111111] dark:text-slate-400">
                <tr>
                  <th className="w-[190px] px-3 py-2">SKU</th>
                  <th className="w-[160px] px-3 py-2">Attribute</th>
                  <th className="w-[140px] px-3 py-2">Code</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="w-[92px] px-3 py-2">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {skuAttributeValues.map((attribute) => (
                  <tr key={attribute.id}>
                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                      {skuTitleById.get(attribute.skuDraftId) || attribute.specKey || attribute.skuDraftId}
                    </td>
                    <td className="px-3 py-2">
                      <InlineInput
                        value={attribute.attributeName}
                        onChange={(attributeName) => updateSkuAttribute(attribute.id, { attributeName })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <InlineInput
                        value={attribute.valueCode}
                        onChange={(valueCode) => updateSkuAttribute(attribute.id, { valueCode })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <InlineInput
                        value={attribute.displayValue || attribute.value}
                        onChange={(displayValue) => updateSkuAttribute(attribute.id, {
                          displayValue,
                          value: displayValue,
                        })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={attribute.required}
                        className="h-4 w-4 accent-lobster-600 dark:accent-lobster-400"
                        onChange={(event) => updateSkuAttribute(attribute.id, { required: event.target.checked })}
                        type="checkbox"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function BlockTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
      {icon}
      {title}
    </div>
  );
}

function InlineInput({
  onChange,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

const inlineSelectClassName = 'h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:border-lobster-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
