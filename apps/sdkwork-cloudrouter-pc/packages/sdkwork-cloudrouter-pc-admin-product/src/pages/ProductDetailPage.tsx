import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Film, ImagePlus, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import { DriveUploadImage } from 'sdkwork-drive-pc-upload-image';
import {
  driveUploadImageValueToCloudRouterMediaResource,
  getCloudRouterDriveImageService,
  useCloudRouterUpload,
  useResolvedMediaResourceUrl,
  type CloudRouterMediaResource,
  type CloudRouterUploadSlotCode,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

import {
  Button,
  Dialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  SelectLike,
  StatusBadge,
  formatMinorAmount,
  formatTimestamp,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { useCatalogLookups } from './catalogLookups.ts';
import type { ProductCenterPageProps } from './resourcePage.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type Attribute,
  type AttributeValue,
  type CategoryAttribute,
  type Media,
  type MediaResource,
  type Product,
  type ProductAttributeValueInput,
  type ProductCenterError,
  type ProductCenterService,
  type Sku,
} from '../productCenterService.ts';

export interface ProductDetailPageProps extends ProductCenterPageProps {
  productId: string;
  /** Host-supplied navigation back to the product list. */
  onBack?: () => void;
}

const MEDIA_ROLES = ['main_image', 'gallery_image', 'detail_image', 'sku_image', 'video'] as const;
const MEDIA_KINDS = ['image', 'video', 'document'] as const;

const FULFILLMENT_BY_PRODUCT_TYPE: Record<Product['productType'], Sku['fulfillmentType']> = {
  physical: 'physical',
  digital: 'digital',
  service: 'service',
  membership: 'membership_activation',
  points: 'points_topup',
};

/**
 * Catalog media identity for an external URL.
 *
 * `MediaResource.id` must be a positive int64 (the owning module rejects any
 * other shape: `resource.id must be a positive snowflake id`), so an external
 * asset gets a deterministic 63-bit FNV-1a digest of its URL: the same URL keeps
 * one identity instead of a fresh random value, and the digest stays inside the
 * signed 64-bit range.
 */
function externalMediaResourceId(url: string): string {
  const prime = 0x100000001b3n;
  const mask = 0x7fffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (const character of url.trim()) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = (hash * prime) & mask;
  }
  return (hash === 0n ? 1n : hash).toString();
}

function combinationKey(entries: readonly { attributeId: string; attributeValueId: string }[]): string {
  return entries
    .map((entry) => `${entry.attributeId}:${entry.attributeValueId}`)
    .sort()
    .join('|');
}

function skuSignature(sku: Sku): string {
  return combinationKey(sku.attributeValues.map((value) => ({
    attributeId: value.attributeId,
    attributeValueId: value.attributeValueId,
  })));
}

function cartesian(valuesByAttribute: readonly (readonly string[])[]): string[][] {
  let result: string[][] = [[]];
  for (const values of valuesByAttribute) {
    const next: string[][] = [];
    for (const prefix of result) {
      for (const value of values) {
        next.push([...prefix, value]);
      }
    }
    result = next;
  }
  return result;
}

interface VariantDialogProps {
  open: boolean;
  product: Product;
  service: ProductCenterService;
  keyBindings: readonly CategoryAttribute[];
  attributesById: ReadonlyMap<string, Attribute>;
  valuesByAttribute: ReadonlyMap<string, readonly AttributeValue[]>;
  existingSkus: readonly Sku[];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Key-attribute variant matrix.
 *
 * The category binding decides which attributes are `key`; each selected enum
 * value becomes one dimension of the cartesian product. A combination that an
 * existing SKU already covers is skipped, so pressing the button twice cannot
 * duplicate variants.
 */
function SkuVariantDialog({
  open,
  product,
  service,
  keyBindings,
  attributesById,
  valuesByAttribute,
  existingSkus,
  onClose,
  onCreated,
}: VariantDialogProps) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [priceMinor, setPriceMinor] = useState('');
  const [currencyCode, setCurrencyCode] = useState('CNY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelection({});
    setPriceMinor('');
    setError(null);
  }, [open]);

  const dimensions = useMemo(
    () => keyBindings.map((binding) => (valuesByAttribute.get(binding.attributeId) ?? []).map((value) => value.id)),
    [keyBindings, valuesByAttribute],
  );

  const existingKeys = useMemo(() => new Set(existingSkus.map(skuSignature)), [existingSkus]);

  const combinations = useMemo(() => {
    if (keyBindings.length === 0 || dimensions.some((values) => values.length === 0)) {
      return [];
    }
    return cartesian(dimensions);
  }, [dimensions, keyBindings.length]);

  const pendingCombinations = useMemo(
    () => combinations.filter((combo) => !existingKeys.has(combinationKey(combo.map((valueId, index) => ({
      attributeId: keyBindings[index]!.attributeId,
      attributeValueId: valueId,
    }))))),
    [combinations, existingKeys, keyBindings],
  );

  const create = () => {
    if (pendingCombinations.length === 0) {
      setError(t('admin.productCenter.variants.noneSelected', 'Select at least one value per key attribute.'));
      return;
    }
    if (!priceMinor.trim()) {
      setError(t('admin.productCenter.variants.price', 'Sale price (minor units)'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const valueById = new Map<string, AttributeValue>();
    for (const values of valuesByAttribute.values()) {
      for (const value of values) {
        valueById.set(value.id, value);
      }
    }
    let created = 0;
    const run = async () => {
      for (const combo of pendingCombinations) {
        const labels = combo.map((valueId) => valueById.get(valueId)?.displayValue ?? valueId);
        created += 1;
        await service.createSku({
          productId: product.id,
          skuNo: `${product.productNo}-${String(created).padStart(2, '0')}`,
          name: `${product.title || product.name} - ${labels.join(' / ')}`,
          title: `${product.title || product.name} - ${labels.join(' / ')}`,
          salePriceMinor: priceMinor.trim(),
          currencyCode: currencyCode.trim() || 'CNY',
          fulfillmentType: FULFILLMENT_BY_PRODUCT_TYPE[product.productType] ?? 'physical',
          inventoryTracking: product.productType === 'physical' ? 'quantity' : 'none',
          inventoryPolicy: 'deny',
          attributeValueIds: [...combo],
        });
      }
    };
    run().then(
      () => {
        setSubmitting(false);
        onCreated();
        onClose();
      },
      (submitError: unknown) => {
        setSubmitting(false);
        setError(describeProductCenterError(submitError).message);
      },
    );
  };

  return (
    <Dialog
      footer={
        <>
          <Button disabled={submitting} onClick={onClose} variant="secondary">
            {t('admin.productCenter.actions.cancel', 'Cancel')}
          </Button>
          <Button disabled={submitting || combiningDisabled(keyBindings, dimensions)} onClick={create} variant="primary">
            {submitting
              ? t('admin.productCenter.actions.saving', 'Saving…')
              : t('admin.productCenter.variants.create', 'Create SKUs')}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={t('admin.productCenter.variants.title', 'Generate SKUs')}
      wide
    >
      <div className="flex flex-col gap-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('admin.productCenter.variants.description', 'Pick one value per key attribute; each combination becomes a SKU.')}
        </p>
        {keyBindings.length === 0 ? (
          <Notice tone="info">
            {t(
              'admin.productCenter.variants.noKeyAttributes',
              'The category declares no key attribute, so variants cannot be generated. Bind a key attribute to the category first.',
            )}
          </Notice>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {keyBindings.map((binding) => {
              const attribute = attributesById.get(binding.attributeId);
              const values = valuesByAttribute.get(binding.attributeId) ?? [];
              return (
                <label className="flex flex-col gap-1 text-xs" key={binding.id}>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {attribute?.name ?? binding.attributeId}
                  </span>
                  <SelectLike
                    onChange={(value) => setSelection((current) => ({ ...current, [binding.attributeId]: value }))}
                    options={values.map((value) => ({ value: value.id, label: value.displayValue }))}
                    placeholder={t('admin.productCenter.detail.attribute.valuePlaceholder', 'Value')}
                    value={selection[binding.attributeId] ?? ''}
                  />
                </label>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('admin.productCenter.variants.price', 'Sale price (minor units)')}
            </span>
            <input
              className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              onChange={(event) => setPriceMinor(event.target.value)}
              type="number"
              value={priceMinor}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('admin.productCenter.variants.currency', 'Currency')}
            </span>
            <input
              className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              onChange={(event) => setCurrencyCode(event.target.value)}
              value={currencyCode}
            />
          </label>
        </div>
        <div className="rounded-md border border-slate-200 p-2 text-xs dark:border-white/10">
          <div className="flex gap-4">
            <span>
              {t('admin.productCenter.variants.combinations', 'Combinations')}: <strong>{combinations.length}</strong>
            </span>
            <span>
              {t('admin.productCenter.variants.existing', 'Already created')}: <strong>{existingKeys.size}</strong>
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function combiningDisabled(keyBindings: readonly CategoryAttribute[], dimensions: readonly (readonly string[])[]): boolean {
  return keyBindings.length === 0 || dimensions.some((values) => values.length === 0);
}

interface MediaFormState {
  editing: Media | null;
  open: boolean;
}

export function ProductDetailPage({ productId, service, onBack }: ProductDetailPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const lookups = useCatalogLookups(resolved);
  const [product, setProduct] = useState<Product | null>(null);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [bindings, setBindings] = useState<CategoryAttribute[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [valuesByAttribute, setValuesByAttribute] = useState<Map<string, AttributeValue[]>>(new Map());
  const [media, setMedia] = useState<Media[]>([]);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProductCenterError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [variantOpen, setVariantOpen] = useState(false);
  const [mediaForm, setMediaForm] = useState<MediaFormState>({ editing: null, open: false });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState<'image' | 'video' | 'document'>('image');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadSlot: CloudRouterUploadSlotCode = uploadKind === 'video'
    ? 'admin-product-video'
    : uploadKind === 'document'
      ? 'admin-product-document'
      : 'admin-product-media';
  const fileUpload = useCloudRouterUpload({ slot: uploadSlot });
  const [savingAttributes, setSavingAttributes] = useState(false);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    resolved.retrieveProduct(productId).then(
      async (loadedProduct) => {
        if (!active) {
          return;
        }
        setProduct(loadedProduct);
        const [bindingsResult, attributesResult, mediaResult, skusResult] = await Promise.allSettled([
          resolved.listCategoryAttributes({
            categoryId: loadedProduct.categoryId,
            status: 'active',
            page: 1,
            pageSize: 100,
          }),
          resolved.listAttributes({ page: 1, pageSize: 200 }),
          resolved.listMedia({ ownerType: 'spu', ownerId: productId, page: 1, pageSize: 100 }),
          resolved.listSkus({ productId, page: 1, pageSize: 100 }),
        ]);
        if (!active) {
          return;
        }
        const nextBindings = bindingsResult.status === 'fulfilled' ? bindingsResult.value.items : [];
        const nextAttributes = attributesResult.status === 'fulfilled' ? attributesResult.value.items : [];
        setBindings(nextBindings);
        setAttributes(nextAttributes);
        setMedia(mediaResult.status === 'fulfilled' ? mediaResult.value.items : []);
        setSkus(skusResult.status === 'fulfilled' ? skusResult.value.items : []);

        const enumAttributes = nextAttributes.filter((attribute) => attribute.valueType === 'enum');
        const valuePairs = await Promise.allSettled(
          enumAttributes.map(async (attribute) => ({
            attributeId: attribute.id,
            values: (await resolved.listAttributeValues({
              attributeId: attribute.id,
              status: 'active',
              page: 1,
              pageSize: 100,
            })).items,
          })),
        );
        if (!active) {
          return;
        }
        const valuesMap = new Map<string, AttributeValue[]>();
        for (const pair of valuePairs) {
          if (pair.status === 'fulfilled') {
            valuesMap.set(pair.value.attributeId, pair.value.values);
          }
        }
        setValuesByAttribute(valuesMap);

        const seed: Record<string, string[]> = {};
        for (const binding of nextBindings) {
          const existing = loadedProduct.attributes.filter((attribute) => attribute.attributeId === binding.attributeId);
          const attribute = nextAttributes.find((candidate) => candidate.id === binding.attributeId);
          seed[binding.attributeId] = existing.map((entry) => (
            attribute?.valueType === 'enum'
              ? (entry.attributeValueId ?? '')
              : (entry.rawValue ?? entry.displayValue ?? '')
          )).filter(Boolean);
        }
        setDraft(seed);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setProduct(null);
        setError(describeProductCenterError(loadError));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [productId, reloadToken, resolved]);

  const attributesById = useMemo(() => {
    const map = new Map<string, Attribute>();
    for (const attribute of attributes) {
      map.set(attribute.id, attribute);
    }
    return map;
  }, [attributes]);

  const keyBindings = useMemo(
    () => bindings.filter((binding) => binding.attributeRole === 'key'),
    [bindings],
  );

  const saveAttributes = () => {
    if (!product) {
      return;
    }
    const inputs: ProductAttributeValueInput[] = [];
    for (const binding of bindings) {
      const attribute = attributesById.get(binding.attributeId);
      const entries = draft[binding.attributeId] ?? [];
      for (const entry of entries) {
        if (!entry) {
          continue;
        }
        if (attribute?.valueType === 'enum') {
          const value = (valuesByAttribute.get(binding.attributeId) ?? [])
            .find((candidate) => candidate.id === entry || candidate.valueCode === entry);
          if (value) {
            inputs.push({
              attributeId: binding.attributeId,
              role: binding.attributeRole === 'key' ? 'key' : 'parameter',
              attributeValueId: value.id,
            });
          }
        } else {
          inputs.push({
            attributeId: binding.attributeId,
            role: binding.attributeRole === 'key' ? 'key' : 'parameter',
            rawValue: entry,
          });
        }
      }
    }
    setSavingAttributes(true);
    setActionError(null);
    resolved.replaceProductAttributes(product.id, product.version, inputs).then(
      () => {
        setSavingAttributes(false);
        setNotice(t('admin.productCenter.detail.attribute.saved', 'Attributes saved'));
        reload();
      },
      (saveError: unknown) => {
        setSavingAttributes(false);
        setActionError(describeProductCenterError(saveError).message);
      },
    );
  };

  const removeMedia = (entry: Media) => {
    setActionError(null);
    resolved.deleteMedia(entry.id, entry.version).then(
      () => {
        setNotice(t('admin.productCenter.toast.deleted', 'Deleted'));
        reload();
      },
      (deleteError: unknown) => setActionError(describeProductCenterError(deleteError).message),
    );
  };

  /**
   * Registers an uploaded Drive image as catalog media.
   *
   * The catalog owns the media row and accepts a full `MediaResource`; the file
   * itself stays in Drive (`source: drive`, `uri: drive://spaces/.../nodes/...`)
   * with a read-only share token, so the storefront resolves a fresh URL instead
   * of the admin persisting an expiring signed link.
   */
  const registerUploadedMedia = (media: CloudRouterMediaResource | undefined, role: Media['mediaRole']) => {
    if (!media || !product || !media.id) {
      setUploading(false);
      return;
    }
    const resource: MediaResource = {
      id: media.id,
      kind: media.kind,
      source: 'drive',
      ...(media.uri ? { uri: media.uri } : {}),
      ...(media.fileName ? { fileName: media.fileName } : {}),
      ...(media.mimeType ? { mimeType: media.mimeType } : {}),
      ...(media.sizeBytes ? { sizeBytes: media.sizeBytes } : {}),
      ...(media.metadata ? { metadata: media.metadata as Record<string, unknown> } : {}),
    };
    resolved.createMedia({
      ownerType: 'spu',
      ownerId: product.id,
      mediaRole: role,
      resource,
    }).then(
      () => {
        setUploading(false);
        setUploadOpen(false);
        fileUpload.reset();
        setNotice(t('admin.productCenter.media.uploaded', 'Uploaded'));
        reload();
      },
      (uploadCreateError: unknown) => {
        setUploading(false);
        setUploadError(describeProductCenterError(uploadCreateError).message);
      },
    );
  };

  const uploadRole: Media['mediaRole'] = uploadKind === 'video'
    ? 'video'
    : uploadKind === 'document'
      ? 'manual'
      : 'main_image';

  const mediaFields = useMemo<FormFieldSpec[]>(() => {
    const editingDriveResource = mediaForm.editing?.resourceSnapshot.source === 'drive';
    return [
      {
        name: 'url',
        label: t('admin.productCenter.media.field.url', 'Resource URL'),
        kind: 'text',
        required: !editingDriveResource,
        ...(editingDriveResource
          ? { help: t('admin.productCenter.media.field.driveKeep', 'Leave blank to keep the uploaded Drive file; enter a URL to replace it with an external link.') }
          : { placeholder: 'https://cdn.example.com/product/main.jpg' }),
      },
      {
        name: 'kind',
        label: t('admin.productCenter.media.field.kind', 'Resource kind'),
        kind: 'select',
        options: MEDIA_KINDS.map((kind) => ({ value: kind, label: t(`admin.productCenter.media.kind.${kind}`, kind) })),
      },
      {
        name: 'role',
        label: t('admin.productCenter.media.field.role', 'Media role'),
        kind: 'select',
        options: MEDIA_ROLES.map((role) => ({ value: role, label: t(`admin.productCenter.media.role.${role}`, role) })),
      },
      { name: 'alt', label: t('admin.productCenter.media.field.alt', 'Alt text'), kind: 'text' },
      { name: 'sort', label: t('admin.productCenter.media.field.sort', 'Sort order'), kind: 'number' },
    ];
  }, [mediaForm.editing?.resourceSnapshot.source, t]);

  if (loading) {
    return <LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} />;
  }

  if (error || !product) {
    return (
      <ErrorState
        code={error?.code}
        codeLabel={t('admin.productCenter.error.code', 'Error code')}
        message={error?.message ?? t('admin.productCenter.detail.notFound', 'The product does not exist or was removed.')}
        onRetry={reload}
        retryLabel={t('admin.productCenter.actions.retry', 'Retry')}
        title={t('admin.productCenter.state.error', 'The request failed')}
        traceId={error?.traceId}
        traceLabel={t('admin.productCenter.error.traceId', 'Trace id')}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <>
            {onBack ? (
              <Button onClick={onBack} variant="ghost">
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                {t('admin.productCenter.detail.back', 'Back to products')}
              </Button>
            ) : null}
            <Button onClick={reload} variant="secondary">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.refresh', 'Refresh')}
            </Button>
          </>
        }
        description={`${product.productNo} · ${t('admin.productCenter.products.type.' + product.productType, product.productType)}`}
        title={product.title || product.name}
      />

      {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
      {actionError ? <Notice onDismiss={() => setActionError(null)} tone="error">{actionError}</Notice> : null}

      <Panel title={t('admin.productCenter.detail.infoTitle', 'Product information')}>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          {[
            { key: 'category', label: t('admin.productCenter.detail.section.category', 'Category'), value: lookups.categoryName(product.categoryId) ?? product.categoryId },
            { key: 'brand', label: t('admin.productCenter.detail.section.brand', 'Brand'), value: lookups.brandName(product.brandId) ?? '—' },
            { key: 'type', label: t('admin.productCenter.detail.section.type', 'Fulfillment type'), value: t(`admin.productCenter.products.type.${product.productType}`, product.productType) },
            { key: 'updated', label: t('admin.productCenter.detail.section.updatedAt', 'Updated'), value: formatTimestamp(product.updatedAt) },
          ].map((entry) => (
            <div key={entry.key}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{entry.label}</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{entry.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.productCenter.detail.section.status', 'Status')}
            </dt>
            <dd className="mt-0.5">
              <StatusBadge label={t(`admin.productCenter.status.${product.status}`, product.status)} value={product.status} />
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel
        actions={
          <Button disabled={savingAttributes || bindings.length === 0} onClick={saveAttributes} variant="primary">
            {savingAttributes
              ? t('admin.productCenter.actions.saving', 'Saving…')
              : t('admin.productCenter.detail.attribute.save', 'Save attributes')}
          </Button>
        }
        title={t('admin.productCenter.detail.attributeTitle', 'Product attributes')}
      >
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {t('admin.productCenter.detail.attributeDescription', 'Key attributes form SKU variants; parameter attributes describe the product.')}
        </p>
        {bindings.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.detail.attribute.empty', 'This category declares no attribute yet.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {bindings.map((binding) => {
              const attribute = attributesById.get(binding.attributeId);
              const isEnum = attribute?.valueType === 'enum';
              const values = valuesByAttribute.get(binding.attributeId) ?? [];
              const selected = draft[binding.attributeId] ?? [];
              return (
                <div className="flex flex-col gap-1 text-xs" key={binding.id}>
                  <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                    {attribute?.name ?? binding.attributeId}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      {t(`admin.productCenter.attributes.role.${binding.attributeRole}`, binding.attributeRole)}
                    </span>
                  </span>
                  {isEnum ? (
                    selected.length > 1 || (attribute?.isMultiValue ?? false) ? (
                      <div className="flex flex-wrap gap-1">
                        {values.map((value) => {
                          const checked = selected.includes(value.id);
                          return (
                            <label
                              className={`inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 ${
                                checked
                                  ? 'border-lobster-400 bg-lobster-500/10 text-lobster-600 dark:text-lobster-300'
                                  : 'border-slate-300 text-slate-600 dark:border-white/15 dark:text-slate-300'
                              }`}
                              key={value.id}
                            >
                              <input
                                checked={checked}
                                className="h-3 w-3"
                                onChange={(event) => setDraft((current) => {
                                  const next = new Set(current[binding.attributeId] ?? []);
                                  if (event.target.checked) {
                                    next.add(value.id);
                                  } else {
                                    next.delete(value.id);
                                  }
                                  return { ...current, [binding.attributeId]: [...next] };
                                })}
                                type="checkbox"
                              />
                              {value.displayValue}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <select
                        className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          [binding.attributeId]: event.target.value ? [event.target.value] : [],
                        }))}
                        value={selected[0] ?? ''}
                      >
                        <option value="">{t('admin.productCenter.common.dash', '—')}</option>
                        {values.map((value) => (
                          <option key={value.id} value={value.id}>
                            {value.displayValue}
                          </option>
                        ))}
                      </select>
                    )
                  ) : (
                    <input
                      className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        [binding.attributeId]: event.target.value ? [event.target.value] : [],
                      }))}
                      placeholder={t('admin.productCenter.detail.attribute.valuePlaceholder', 'Value')}
                      value={selected[0] ?? ''}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        actions={
          <>
            <Button
              onClick={() => {
                setUploadError(null);
                setUploadOpen(true);
              }}
              variant="secondary"
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.media.upload', 'Upload image')}
            </Button>
            <Button
              onClick={() => setMediaForm({ editing: null, open: true })}
              variant="primary"
            >
              <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.media.add', 'Add media')}
            </Button>
          </>
        }
        title={t('admin.productCenter.media.title', 'Media')}
      >
        {media.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.media.empty', 'No media yet')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {media.map((entry) => (
              <figure
                className="group overflow-hidden rounded-md border border-slate-200 dark:border-white/10"
                key={entry.id}
              >
                <div className="flex h-28 items-center justify-center bg-slate-100 dark:bg-white/5">
                  <MediaThumbnail alt={entry.altText ?? ''} resource={entry.resourceSnapshot} />
                </div>
                <figcaption className="flex items-center justify-between gap-1 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">{t(`admin.productCenter.media.role.${entry.mediaRole}`, entry.mediaRole)}</span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                      onClick={() => setMediaForm({ editing: entry, open: true })}
                      type="button"
                    >
                      {t('admin.productCenter.actions.edit', 'Edit')}
                    </button>
                    <button
                      className="rounded p-0.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={() => removeMedia(entry)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        actions={
          <Button onClick={() => setVariantOpen(true)} variant="primary">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.detail.sku.generate', 'Generate variants')}
          </Button>
        }
        title={t('admin.productCenter.detail.skuTitle', 'SKUs')}
      >
        {skus.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.detail.sku.empty', 'No SKU yet')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-2 py-2">{t('admin.productCenter.skus.column.skuNo', 'SKU no.')}</th>
                  <th className="px-2 py-2">{t('admin.productCenter.skus.column.name', 'SKU')}</th>
                  <th className="px-2 py-2">{t('admin.productCenter.skus.column.price', 'Sale price')}</th>
                  <th className="px-2 py-2">{t('admin.productCenter.skus.column.inventory', 'Inventory')}</th>
                  <th className="px-2 py-2">{t('admin.productCenter.skus.column.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => (
                  <tr className="border-b border-slate-100 last:border-0 dark:border-white/5" key={sku.id}>
                    <td className="px-2 py-2 font-mono text-xs">{sku.skuNo}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{sku.title || sku.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {sku.attributeValues.map((value) => value.displayValue).join(' / ') || '—'}
                      </div>
                    </td>
                    <td className="px-2 py-2">{formatMinorAmount(sku.salePriceMinor, sku.currencyCode, sku.minorUnitExponent)}</td>
                    <td className="px-2 py-2">
                      {t(`admin.productCenter.skus.tracking.${sku.inventoryTracking}`, sku.inventoryTracking)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge label={t(`admin.productCenter.status.${sku.status}`, sku.status)} value={sku.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <SkuVariantDialog
        attributesById={attributesById}
        existingSkus={skus}
        keyBindings={keyBindings}
        onClose={() => setVariantOpen(false)}
        onCreated={() => {
          setNotice(t('admin.productCenter.variants.created', 'SKUs created'));
          reload();
        }}
        open={variantOpen}
        product={product}
        service={resolved}
        valuesByAttribute={valuesByAttribute}
      />

      <RecordFormDialog
        fields={mediaFields}
        initialValues={mediaForm.editing ? {
          url: mediaForm.editing.resourceSnapshot.url ?? mediaForm.editing.resourceSnapshot.publicUrl ?? '',
          kind: mediaForm.editing.resourceSnapshot.kind,
          role: mediaForm.editing.mediaRole,
          alt: mediaForm.editing.altText ?? '',
          sort: mediaForm.editing.sortOrder,
        } : {}}
        onClose={() => setMediaForm({ editing: null, open: false })}
        onSubmit={(values) => {
          const url = typeof values.url === 'string' ? values.url.trim() : '';
          const kind = typeof values.kind === 'string' ? values.kind : 'image';
          const role = typeof values.role === 'string' ? values.role : 'gallery_image';
          const alt = typeof values.alt === 'string' ? values.alt.trim() : '';
          const sort = typeof values.sort === 'string' ? values.sort.trim() : '';
          if (mediaForm.editing) {
            const existing = mediaForm.editing.resourceSnapshot;
            const replacesResource = url !== '' && url !== existing.url;
            return resolved.updateMedia(mediaForm.editing.id, mediaForm.editing.version, {
              mediaRole: role as Media['mediaRole'],
              ...(alt ? { altText: alt } : {}),
              ...(sort ? { sortOrder: sort } : {}),
              ...(replacesResource
                ? {
                  resource: {
                    id: externalMediaResourceId(url),
                    kind: kind as MediaResource['kind'],
                    source: 'external_url',
                    url,
                  },
                }
                : {}),
            }).then(() => {
              setNotice(t('admin.productCenter.toast.saved', 'Saved'));
              reload();
            });
          }
          return resolved.createMedia({
            ownerType: 'spu',
            ownerId: product.id,
            mediaRole: role as Media['mediaRole'],
            resource: {
              id: externalMediaResourceId(url),
              kind: kind as MediaResource['kind'],
              source: 'external_url',
              url,
            },
            ...(alt ? { altText: alt } : {}),
            ...(sort ? { sortOrder: sort } : {}),
          }).then(() => {
            setNotice(t('admin.productCenter.toast.created', 'Created'));
            reload();
          });
        }}
        open={mediaForm.open}
        title={mediaForm.editing
          ? t('admin.productCenter.media.editTitle', 'Edit media')
          : t('admin.productCenter.media.createTitle', 'Register media')}
      />

      <Dialog
        footer={
          <Button onClick={() => setUploadOpen(false)} variant="secondary">
            {t('admin.productCenter.actions.cancel', 'Cancel')}
          </Button>
        }
        onClose={() => setUploadOpen(false)}
        open={uploadOpen}
        title={t('admin.productCenter.media.uploadTitle', 'Upload product media')}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            <span>{t('admin.productCenter.media.field.kind', 'Resource kind')}</span>
            <SelectLike
              onChange={(value) => setUploadKind(
                value === 'video' ? 'video' : value === 'document' ? 'document' : 'image',
              )}
              options={[
                { value: 'image', label: t('admin.productCenter.media.kind.image', 'Image') },
                { value: 'video', label: t('admin.productCenter.media.kind.video', 'Video') },
                { value: 'document', label: t('admin.productCenter.media.kind.document', 'Document') },
              ]}
              value={uploadKind}
            />
          </label>
          {uploadError ?? fileUpload.error ? (
            <Notice
              onDismiss={() => {
                setUploadError(null);
                fileUpload.reset();
              }}
              tone="error"
            >
              {uploadError ?? fileUpload.error}
            </Notice>
          ) : null}
          {uploadKind === 'image' ? (
            <DriveUploadImage
              appResourceId={product.id}
              copy={{
                pickImage: t('admin.productCenter.media.pickImage', 'Choose image'),
                removeImage: t('admin.productCenter.media.removeImage', 'Remove image'),
                retryUpload: t('admin.productCenter.media.retryUpload', 'Retry upload'),
                uploading: t('admin.productCenter.media.uploading', 'Uploading…'),
                uploadFailed: t('admin.productCenter.media.uploadFailed', 'Upload failed'),
              }}
              maxSizeBytes={5 * 1024 * 1024}
              onChange={(next) => {
                setUploadError(null);
                if (!next) {
                  return;
                }
                setUploading(true);
                registerUploadedMedia(
                  driveUploadImageValueToCloudRouterMediaResource(next, 'image'),
                  uploadRole,
                );
              }}
              onUploadError={(error) => {
                setUploading(false);
                setUploadError(error.message);
              }}
              service={getCloudRouterDriveImageService('admin-product-media')}
              sizePx={96}
              value={null}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input
                accept={uploadKind === 'video' ? 'video/*' : '.pdf,.doc,.docx,application/pdf'}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 dark:text-slate-300 dark:file:bg-white/10 dark:file:text-slate-200"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  input.value = '';
                  if (!file) {
                    return;
                  }
                  setUploadError(null);
                  setUploading(true);
                  const uploaded = await fileUpload.upload(file);
                  if (uploaded?.media) {
                    registerUploadedMedia(uploaded.media, uploadRole);
                  } else {
                    setUploading(false);
                  }
                }}
                type="file"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {uploadKind === 'video'
                  ? t('admin.productCenter.media.uploadHintVideo', 'MP4/WebM up to 100 MB. Stored in Drive; the catalog keeps the reference.')
                  : t('admin.productCenter.media.uploadHintDocument', 'PDF/DOC/DOCX up to 20 MB. Stored in Drive; the catalog keeps the reference.')}
              </p>
            </div>
          )}
          {uploadKind === 'image' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.productCenter.media.uploadHint', 'JPG or PNG up to 5 MB. The file is stored in Drive and the catalog keeps only the reference.')}
            </p>
          ) : null}
          {uploading || fileUpload.isUploading ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.productCenter.media.uploading', 'Uploading…')}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

/**
 * Renders one catalog media resource.
 *
 * Drive-backed media has no durable URL (`uri` is a `drive://` reference), so the
 * preview resolves a short-lived download URL through the shared drive media
 * resolver. Non-image resources are represented by their kind icon instead of an
 * `<img>` tag, which would otherwise show a broken image.
 */
function MediaThumbnail({ alt, resource }: { alt: string; resource: MediaResource }) {
  const resolved = useResolvedMediaResourceUrl(resource as unknown as CloudRouterMediaResource);
  const src = resolved || resource.publicUrl || resource.url || '';
  if (resource.kind !== 'image') {
    return (
      <span className="flex flex-col items-center gap-1 text-slate-400" title={resource.fileName ?? resource.kind}>
        {resource.kind === 'video' ? (
          <Film aria-hidden="true" className="h-6 w-6" />
        ) : (
          <FileText aria-hidden="true" className="h-6 w-6" />
        )}
        <span className="text-[11px]">{resource.kind}</span>
      </span>
    );
  }
  if (!src) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return <img alt={alt} className="h-full w-full object-cover" src={src} />;
}
