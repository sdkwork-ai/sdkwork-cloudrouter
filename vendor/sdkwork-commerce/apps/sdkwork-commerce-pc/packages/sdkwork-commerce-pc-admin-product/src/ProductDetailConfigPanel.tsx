import React from 'react';
import { FileText, ImageIcon, Search, Share2, ShieldCheck, Video } from 'lucide-react';
import type { ProductDetailConfig } from './productAdminTypes';

type ProductDetailConfigPanelProps = {
  detailConfig: ProductDetailConfig;
  onChange: (detailConfig: ProductDetailConfig) => void;
};

export function ProductDetailConfigPanel({ detailConfig, onChange }: ProductDetailConfigPanelProps) {
  function update(patch: Partial<ProductDetailConfig>) {
    onChange({ ...detailConfig, ...patch });
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171717]"
      data-admin-product-detail-config-panel
    >
      <PanelTitle
        icon={<FileText className="h-5 w-5" />}
        title="Product detail configuration"
        description="Structure media, selling points, parameters, service promise, SEO, and sharing fields before publish."
      />
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ConfigBlock icon={<ImageIcon className="h-4 w-4" />} title="Media">
          <TextField label="Main image URL" value={detailConfig.mainImageUrl} onChange={(value) => update({ mainImageUrl: value })} />
          <TextField
            label="Gallery image URLs"
            value={detailConfig.galleryImageUrls.join('\n')}
            multiline
            onChange={(value) => update({ galleryImageUrls: splitLines(value) })}
          />
          <TextField
            label="Detail image URLs"
            value={detailConfig.detailImageUrls.join('\n')}
            multiline
            onChange={(value) => update({ detailImageUrls: splitLines(value) })}
          />
          <TextField label="Video URL" value={detailConfig.videoUrl} onChange={(value) => update({ videoUrl: value })} icon={<Video className="h-3.5 w-3.5" />} />
        </ConfigBlock>

        <ConfigBlock icon={<ShieldCheck className="h-4 w-4" />} title="Selling and service">
          <TextField
            label="Selling points"
            value={detailConfig.sellingPoints.join('\n')}
            multiline
            onChange={(value) => update({ sellingPoints: splitLines(value) })}
          />
          <TextField
            label="Service promises"
            value={detailConfig.servicePromises.join('\n')}
            multiline
            onChange={(value) => update({ servicePromises: splitLines(value) })}
          />
          <TextField label="Shipping policy" value={detailConfig.shippingPolicy} onChange={(value) => update({ shippingPolicy: value })} />
          <TextField label="After-sale policy" value={detailConfig.afterSalePolicy} onChange={(value) => update({ afterSalePolicy: value })} />
        </ConfigBlock>

        <ConfigBlock icon={<Search className="h-4 w-4" />} title="Parameters and SEO">
          <TextField
            label="Parameter rows"
            value={detailConfig.parameterRows.map((row) => `${row.label}: ${row.value}`).join('\n')}
            multiline
            onChange={(value) => update({ parameterRows: parseParameterRows(value) })}
          />
          <TextField label="SEO title" value={detailConfig.seoTitle} onChange={(value) => update({ seoTitle: value })} />
          <TextField label="SEO description" value={detailConfig.seoDescription} onChange={(value) => update({ seoDescription: value })} />
          <TextField label="SEO keywords" value={detailConfig.seoKeywords.join(', ')} onChange={(value) => update({ seoKeywords: splitComma(value) })} />
        </ConfigBlock>

        <ConfigBlock icon={<Share2 className="h-4 w-4" />} title="Share card">
          <TextField label="Share title" value={detailConfig.shareTitle} onChange={(value) => update({ shareTitle: value })} />
          <TextField label="Share description" value={detailConfig.shareDescription} onChange={(value) => update({ shareDescription: value })} />
          <TextField label="Share image URL" value={detailConfig.shareImageUrl} onChange={(value) => update({ shareImageUrl: value })} />
          <TextField
            label="Custom rich sections"
            value={detailConfig.customSections.map((section) => `${section.title}: ${section.body}`).join('\n')}
            multiline
            onChange={(value) => update({ customSections: parseCustomSections(value) })}
          />
        </ConfigBlock>
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
    <div className="flex items-start gap-3">
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

function ConfigBlock({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextField({
  icon,
  label,
  multiline,
  onChange,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  multiline?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldClassName = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-900 outline-none transition-colors focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white';
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </span>
      {multiline ? (
        <textarea className={`${fieldClassName} min-h-20 resize-y leading-5`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function splitComma(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseParameterRows(value: string) {
  return splitLines(value).map((line, index) => {
    const [label, ...rest] = line.split(':');
    return {
      id: `parameter-${index}`,
      label: label.trim(),
      value: rest.join(':').trim(),
    };
  }).filter((row) => row.label || row.value);
}

function parseCustomSections(value: string) {
  return splitLines(value).map((line, index) => {
    const [title, ...rest] = line.split(':');
    return {
      id: `detail-section-${index}`,
      title: title.trim(),
      body: rest.join(':').trim(),
    };
  }).filter((section) => section.title || section.body);
}
