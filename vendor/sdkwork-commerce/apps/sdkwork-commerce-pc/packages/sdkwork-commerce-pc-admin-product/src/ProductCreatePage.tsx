import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  FileText,
  ImageIcon,
  Info,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { readApiData, readApiItems } from './commerce-api-result';
import {
  readMediaResource,
  readMediaResourceUrl,
  toExternalUrlMediaResource,
  type ClawRouterMediaResource,
} from './commerce-media-resource';
import {
  createCommerceAttribute,
  createCommerceCategory,
  createCommerceProduct,
  createCommerceSku,
  listCommerceAttributes,
  listCommerceCategories,
  listCommerceSkus,
  retrieveCommerceProduct,
  updateCommerceProduct,
  updateCommerceSku,
} from './catalogService';
import { ProductAttributeValuePanel } from './ProductAttributeValuePanel';
import { ProductDetailConfigPanel } from './ProductDetailConfigPanel';
import { ProductPublishReadinessPanel } from './ProductPublishReadinessPanel';
import { ProductStoreInventoryPanel } from './ProductStoreInventoryPanel';
import { SkuMatrixCommercialPanel } from './SkuMatrixCommercialPanel';
import {
  buildCommercialProductMetadata,
  readCommercialProductMetadata,
} from './productAdminMapping';
import { evaluateProductReadiness } from './productAdminReadiness';
import {
  DEFAULT_INVENTORY_POLICY,
  DEFAULT_PRODUCT_DETAIL_CONFIG,
  DEFAULT_STORE_VISIBILITY,
  type ProductCategoryAttributeValue,
  type ProductDetailConfig,
  type ProductInventoryPolicy,
  type ProductSkuAttributeValue,
  type ProductStoreVisibility,
} from './productAdminTypes';

type ProductCreateStep = 'basic' | 'detail';
type ProductCreatePageMode = 'create' | 'edit';
type AssistantItemTone = 'active' | 'warning' | 'done' | 'idle';
export type ProductSubmitMode = 'draft' | 'active';

type ProductCreatePageProps = {
  mode?: ProductCreatePageMode;
  productId?: string;
};

type AssistantItem = {
  label: string;
  description: string;
  tone: AssistantItemTone;
};

type OptionCard = {
  title: string;
  description: string;
  active?: boolean;
};

type ProductCategoryNode = {
  id: string;
  label: string;
  badge?: string;
  children?: ProductCategoryNode[];
};

type ProductCategoryRecordInput = {
  [key: string]: unknown;
  id?: unknown;
  name?: unknown;
  label?: unknown;
  parentId?: unknown;
  parent_id?: unknown;
  sortOrder?: unknown;
  sort_order?: unknown;
  status?: unknown;
};

type ProductCategoryPathEntry = {
  id: string;
  path: string[];
};

export type ProductParameterDraft = {
  id: string;
  label: string;
  value: string;
};

export type ProductSpecValue = {
  id: string;
  name: string;
  code?: string;
  enabled?: boolean;
};

export type ProductSpecGroup = {
  id: string;
  name: string;
  attributeId?: string | null;
  values: ProductSpecValue[];
};

export type ProductSkuSpecSelection = {
  groupId: string;
  groupName: string;
  valueId: string;
  valueName: string;
  valueCode: string;
};

export type ProductSkuDraft = {
  id: string;
  backendSkuId?: string;
  specKey: string;
  specPath: string;
  title: string;
  skuNo: string;
  barcode: string;
  image?: ClawRouterMediaResource;
  priceAmount: string;
  currencyCode: string;
  stockQuantity: number;
  enabled: boolean;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  specSelections: ProductSkuSpecSelection[];
};

export type ProductAttributeDefinition = {
  id: string;
  attributeNo: string;
  name: string;
  scope: 'spu' | 'sku' | 'both';
  valueType: 'text' | 'number' | 'boolean' | 'enum' | 'date';
  status: 'active' | 'inactive' | 'archived';
};

export type ProductDraftState = {
  title: string;
  subtitle: string;
  description: string;
  brand: string;
  productType: 'physical_good' | 'virtual_good' | 'membership' | 'points_recharge' | 'wallet_recharge' | 'subscription' | 'service';
  spuNo: string;
  defaultPriceAmount: string;
  defaultCurrencyCode: string;
  baseSkuNo: string;
  salesUnit: string;
  taxCategory: string;
  fulfillmentType: 'physical_shipment' | 'digital_delivery' | 'entitlement_grant' | 'points_credit' | 'wallet_credit' | 'subscription_activation' | 'service_activation' | 'none';
  selectedCategoryIds: string[];
  shopCategoryIds: string[];
  parameters: ProductParameterDraft[];
  specGroups: ProductSpecGroup[];
  skuDrafts: ProductSkuDraft[];
  detailConfig: ProductDetailConfig;
  storeVisibility: ProductStoreVisibility;
  inventoryPolicy: ProductInventoryPolicy;
  categoryAttributeValues: ProductCategoryAttributeValue[];
  skuAttributeValues: ProductSkuAttributeValue[];
  metadata: Record<string, unknown>;
};

type SubmitState = {
  mode: ProductSubmitMode | null;
  status: 'idle' | 'submitting' | 'success' | 'error';
  message: string;
};

const PRODUCT_CATEGORY_TREE: ProductCategoryNode[] = [
  {
    id: 'home',
    label: '家装建材',
    children: [
      { id: 'home-tools', label: '五金工具' },
      {
        id: 'home-kitchen',
        label: '厨房卫浴',
        children: [
          { id: 'home-kitchen-sink', label: '水槽', badge: '热卖中' },
          { id: 'home-kitchen-cabinet', label: '浴室柜', badge: '热卖中' },
          { id: 'home-kitchen-tub', label: '浴缸' },
          { id: 'home-kitchen-shower', label: '淋浴桶', badge: '快增长' },
          { id: 'home-kitchen-heater', label: '浴霸' },
          { id: 'home-kitchen-room', label: '淋浴房' },
          { id: 'home-kitchen-flower', label: '淋浴花洒', badge: '快增长' },
          { id: 'home-kitchen-ceramic', label: '陶瓷件组套' },
          { id: 'home-kitchen-toilet', label: '马桶' },
        ],
      },
      { id: 'home-material', label: '基建材料' },
      { id: 'home-assist', label: '基建辅助设施' },
      { id: 'home-wall', label: '墙地面材料' },
      { id: 'home-light', label: '灯饰照明' },
      { id: 'home-electric', label: '电工电料' },
      { id: 'home-decor', label: '装饰材料' },
    ],
  },
  {
    id: 'phone',
    label: '手机通讯',
    children: [
      {
        id: 'phone-mobile',
        label: '手机',
        children: [
          {
            id: 'phone-smart',
            label: '智能手机',
            children: [
              { id: 'phone-foldable', label: '折叠屏手机', badge: '快增长' },
              { id: 'phone-camera', label: '影像旗舰' },
              { id: 'phone-rugged', label: '三防手机' },
            ],
          },
          { id: 'phone-basic', label: '功能手机' },
        ],
      },
      { id: 'phone-accessory', label: '手机配件' },
    ],
  },
  {
    id: 'digital',
    label: '数码',
    children: [
      { id: 'digital-office', label: '电脑、办公', children: [{ id: 'digital-office-laptop', label: '笔记本电脑' }] },
      { id: 'digital-audio', label: '影音娱乐', children: [{ id: 'digital-audio-headset', label: '蓝牙耳机' }] },
    ],
  },
  { id: 'apparel', label: '服饰内衣' },
  { id: 'mother-baby', label: '母婴' },
  { id: 'vehicle', label: '汽摩电动' },
  { id: 'toy', label: '玩具乐器' },
  { id: 'fresh', label: '生鲜' },
];

export const DEFAULT_SELECTED_CATEGORY_IDS = ['home-kitchen-sink', 'phone-foldable'];
const MAX_SELECTED_CATEGORY_COUNT = 3;
const STEP_ONE_ASSISTANT_ITEMS: AssistantItem[] = [
  { label: '主图', description: '建议上传 1:1 白底图，主体居中且无水印。', tone: 'active' },
  { label: '商品标题', description: '包含品牌、品类、核心卖点，避免堆砌词。', tone: 'warning' },
  { label: '商品类目', description: '选择叶子类目后会自动带出参数模板。', tone: 'idle' },
  { label: '店铺首页展示分类', description: '便于买家在店铺内按场景查找商品。', tone: 'idle' },
];

const STEP_TWO_ASSISTANT_ITEMS: AssistantItem[] = [
  { label: '基础信息', description: '标题、类目、卖点和店铺分类已填写。', tone: 'done' },
  { label: '商品参数', description: '建议补充品牌、材质、产地等关键参数。', tone: 'warning' },
  { label: '商品展示与介绍', description: '至少补齐详情图、描述和视频中的两项。', tone: 'active' },
  { label: '规格和库存价格', description: '规格名、SKU、库存和价格需要保持一致。', tone: 'warning' },
  { label: '物流配送', description: '选择发货方式、运费模板和配送承诺。', tone: 'idle' },
  { label: '售后及服务', description: '完善保障、换货和客服承诺。', tone: 'idle' },
];

const SHOP_CATEGORY_OPTIONS = ['店铺首页展示分类', '爆款推荐', '新品专区', '企业采购'];
const PARAMETER_ROWS: ProductParameterDraft[] = [
  { id: 'brand', label: '品牌', value: 'SdkWork' },
  { id: 'scenario', label: '适用场景', value: '企业协作 / AI 工具' },
  { id: 'service-cycle', label: '服务周期', value: '按月 / 按年' },
  { id: 'fulfillment', label: '交付方式', value: '在线开通' },
];
const SPEC_OPTIONS = ['颜色', '版本', '套餐', '服务周期'];
const PREVIEW_IMAGES = ['主图', '细节图', '场景图', '包装图', '资质图'];
const SHIPPING_OPTIONS: OptionCard[] = [
  { title: '现货', description: '下单后 24 小时内发货，适合常规库存商品。', active: true },
  { title: '按商品预售', description: '整件商品统一设置预售时间和发货承诺。' },
  { title: '按规格预售', description: '不同规格可设置不同发货时间，适合定制商品。' },
];

const DEFAULT_SPEC_GROUPS: ProductSpecGroup[] = [
  {
    id: 'version',
    name: '版本',
    values: [
      { id: 'basic', name: '基础版', code: 'BASIC', enabled: true },
      { id: 'pro', name: '专业版', code: 'PRO', enabled: true },
    ],
  },
  {
    id: 'cycle',
    name: '服务周期',
    values: [{ id: 'year', name: '年度', code: 'YEAR', enabled: true }],
  },
];

const DEFAULT_SKU_DRAFTS = generateSkuDraftsFromSpecGroups(DEFAULT_SPEC_GROUPS, {
  title: 'AI assistant',
  baseSkuNo: 'SKU-AI',
  defaultPriceAmount: '1999.00',
  defaultCurrencyCode: 'CNY',
});

export const DEFAULT_PRODUCT_DRAFT: ProductDraftState = {
  title: '企业版 AI 助手年度订阅服务',
  subtitle: '知识库问答、流程自动化、数据分析和多端协作',
  description: '适用于企业团队的 AI 助手服务，支持知识库问答、流程自动化、数据分析和多端协作。',
  brand: 'SdkWork',
  productType: 'subscription',
  spuNo: 'SPU-AI-ASSISTANT',
  defaultPriceAmount: '1999.00',
  defaultCurrencyCode: 'CNY',
  baseSkuNo: 'SKU-AI',
  salesUnit: '件',
  taxCategory: 'standard',
  fulfillmentType: 'subscription_activation',
  selectedCategoryIds: DEFAULT_SELECTED_CATEGORY_IDS,
  shopCategoryIds: [SHOP_CATEGORY_OPTIONS[0]],
  parameters: PARAMETER_ROWS,
  specGroups: DEFAULT_SPEC_GROUPS,
  skuDrafts: DEFAULT_SKU_DRAFTS,
  detailConfig: createDefaultDetailConfig(),
  storeVisibility: createDefaultStoreVisibility(),
  inventoryPolicy: createDefaultInventoryPolicy('subscription'),
  categoryAttributeValues: createDefaultCategoryAttributeValues(),
  skuAttributeValues: buildSkuAttributeValuesFromSkuDrafts(DEFAULT_SKU_DRAFTS),
  metadata: {},
};

export function ProductCreatePage({ mode = 'create', productId }: ProductCreatePageProps = {}) {
  const isEditMode = mode === 'edit';
  const [step, setStep] = useState<ProductCreateStep>(() => initialProductCreateStep(mode));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(DEFAULT_SELECTED_CATEGORY_IDS);
  const [categoryTree, setCategoryTree] = useState<ProductCategoryNode[]>(PRODUCT_CATEGORY_TREE);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinition[]>([]);
  const [draft, setDraft] = useState<ProductDraftState>(() => createDefaultProductDraft());
  const [submitState, setSubmitState] = useState<SubmitState>({
    mode: null,
    status: 'idle',
    message: isEditMode
      ? '商品编辑会更新 SPU，并同步更新已有 SKU 或创建新增 SKU。'
      : '商品创建会先创建 SPU，再同步 SKU 属性定义并生成多规格 SKU。',
  });

  useEffect(() => {
    let cancelled = false;

    listCommerceCategories({ page: '1', pageSize: '200', status: 'active' })
      .then((result) => {
        if (cancelled) {
          return;
        }
        const nextCategoryTree = normalizeProductCategoryTree(readCatalogRecords(result));
        if (nextCategoryTree.length > 0) {
          setCategoryTree(nextCategoryTree);
          setCategoryLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryLoadError('类目数据加载失败，当前使用本地类目模板。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    listCommerceAttributes({ page: '1', pageSize: '200', status: 'active' })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setAttributeDefinitions(normalizeProductAttributeDefinitions(readCatalogRecords(result)));
      })
      .catch(() => {
        if (!cancelled) {
          setAttributeDefinitions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    if (!productId) {
      setSubmitState({
        mode: null,
        status: 'error',
        message: '缺少商品 ID，无法加载编辑数据。',
      });
      return;
    }

    let cancelled = false;
    setSubmitState({
      mode: null,
      status: 'submitting',
      message: '正在加载商品与 SKU 信息...',
    });

    void loadProductDraftForEdit(productId)
      .then((nextDraft) => {
        if (cancelled) {
          return;
        }
        setDraft(nextDraft);
        setSelectedCategoryIds(nextDraft.selectedCategoryIds);
        setSubmitState({
          mode: null,
          status: 'idle',
          message: `已加载商品 ${nextDraft.spuNo || productId}，可编辑 SPU 与 SKU 信息。`,
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setSubmitState({
            mode: null,
            status: 'error',
            message: error instanceof Error ? error.message : '商品编辑数据加载失败。',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEditMode, productId]);

  useEffect(() => {
    setStep(initialProductCreateStep(mode));
  }, [mode, productId]);

  useEffect(() => {
    setSelectedCategoryIds((currentCategoryIds) => normalizeSelectedCategoryIds(currentCategoryIds, categoryTree));
  }, [categoryTree]);

  useEffect(() => {
    setDraft((currentDraft) => {
      if (arraysEqual(currentDraft.selectedCategoryIds, selectedCategoryIds)) {
        return currentDraft;
      }
      return { ...currentDraft, selectedCategoryIds };
    });
  }, [selectedCategoryIds]);

  function updateDraft(patch: Partial<ProductDraftState>) {
    setDraft((currentDraft) => {
      const nextDraft = { ...currentDraft, ...patch };
      if (
        patch.title !== undefined
        || patch.baseSkuNo !== undefined
        || patch.defaultPriceAmount !== undefined
        || patch.defaultCurrencyCode !== undefined
        || patch.specGroups !== undefined
      ) {
        const nextSpecGroups = patch.specGroups ? normalizeSpecGroups(patch.specGroups) : currentDraft.specGroups;
        const generatedSkuDrafts = generateSkuDraftsFromSpecGroups(nextSpecGroups, {
          title: productSkuBaseTitle(nextDraft.title),
          baseSkuNo: nextDraft.baseSkuNo,
          defaultPriceAmount: nextDraft.defaultPriceAmount,
          defaultCurrencyCode: nextDraft.defaultCurrencyCode,
        });
        nextDraft.specGroups = nextSpecGroups;
        nextDraft.skuDrafts = mergeSkuDrafts(generatedSkuDrafts, currentDraft.skuDrafts);
        nextDraft.skuAttributeValues = mergeSkuAttributeValues(
          buildSkuAttributeValuesFromSkuDrafts(nextDraft.skuDrafts),
          currentDraft.skuAttributeValues,
        );
      }
      return nextDraft;
    });
  }

  function updateSkuDrafts(skuDrafts: ProductSkuDraft[]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      skuDrafts,
      skuAttributeValues: mergeSkuAttributeValues(
        buildSkuAttributeValuesFromSkuDrafts(skuDrafts),
        currentDraft.skuAttributeValues,
      ),
    }));
  }

  async function handleCategoryCreate(input: { name: string; parentId?: string | null; categoryNo?: string }) {
    const result = await createCommerceCategory({
      categoryNo: input.categoryNo?.trim() || buildEntityNo('CAT', input.name),
      name: input.name.trim(),
      parentId: input.parentId || null,
      sortOrder: '0',
      status: 'active',
    });
    const item = readCatalogItem(result);
    if (item) {
      const nextRecords = [...flattenCategoryTreeRecords(categoryTree), item];
      setCategoryTree(normalizeProductCategoryTree(nextRecords));
    }
  }

  async function handleSyncAttributes() {
    const attributeIdByName = await ensureSkuAttributeDefinitions(draft.specGroups);
    setAttributeDefinitions((currentDefinitions) => {
      const knownNames = new Set(currentDefinitions.map((definition) => definition.name));
      const createdDefinitions = Array.from(attributeIdByName.entries())
        .filter(([name]) => !knownNames.has(name))
        .map(([name, id]) => ({
          id,
          attributeNo: buildEntityNo('ATTR', name),
          name,
          scope: 'sku' as const,
          valueType: 'enum' as const,
          status: 'active' as const,
        }));
      return [...currentDefinitions, ...createdDefinitions];
    });
  }

  async function handleSubmit(mode: ProductSubmitMode) {
    const normalizedSpecGroups = normalizeSpecGroups(draft.specGroups);
    const submitSkuDrafts = draft.skuDrafts.length
      ? draft.skuDrafts
      : generateSkuDraftsFromSpecGroups(normalizedSpecGroups, {
        title: productSkuBaseTitle(draft.title),
        baseSkuNo: draft.baseSkuNo,
        defaultPriceAmount: draft.defaultPriceAmount,
        defaultCurrencyCode: draft.defaultCurrencyCode,
      });
    const submitDraft = {
      ...draft,
      selectedCategoryIds,
      specGroups: normalizedSpecGroups,
      skuDrafts: submitSkuDrafts,
      skuAttributeValues: mergeSkuAttributeValues(
        buildSkuAttributeValuesFromSkuDrafts(submitSkuDrafts),
        draft.skuAttributeValues,
      ),
    };
    const errors = validateProductDraft(submitDraft);
    if (errors.length > 0) {
      setSubmitState({ mode, status: 'error', message: errors[0] });
      return;
    }
    const readinessReport = evaluateProductReadiness(submitDraft);
    if (mode === 'active' && !readinessReport.publishable) {
      setSubmitState({
        mode,
        status: 'error',
        message: readinessReport.blockers[0]?.message ?? 'Product is not ready to publish.',
      });
      return;
    }

    setSubmitState({
      mode,
      status: 'submitting',
      message: mode === 'active' ? '正在创建商品并上架，请稍候。' : '正在保存商品草稿，请稍候。',
    });

    try {
      const result = await submitProductDraft(
        submitDraft,
        mode,
        isEditMode && productId ? { productId } : undefined,
      );
      setSubmitState({
        mode,
        status: 'success',
        message: isEditMode
          ? `已更新商品 ${result.productId}，同步 ${result.skuCount} 个 SKU。`
          : `已创建商品 ${result.productId}，同步 ${result.skuCount} 个 SKU。库存创建接口待补齐，当前库存数量仅作为 SKU 运营草稿保留。`,
      });
    } catch (error) {
      setSubmitState({
        mode,
        status: 'error',
        message: error instanceof Error ? error.message : (isEditMode ? '商品更新失败，请稍后重试。' : '商品创建失败，请稍后重试。'),
      });
    }
  }

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 transition-colors duration-300 dark:text-slate-100"
      data-admin-product-create-page
    >
      <ProductCreateHeader mode={mode} step={step} />
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-5 pb-0">
        <CreateAssistantPanel
          items={step === 'basic' ? STEP_ONE_ASSISTANT_ITEMS : STEP_TWO_ASSISTANT_ITEMS}
          step={step}
        />
        <main className="min-h-0 flex-1 overflow-y-auto pr-1">
          {step === 'basic' ? (
            <ProductCreateStepOne
              categoryLoadError={categoryLoadError}
              categoryTree={categoryTree}
              draft={draft}
              selectedCategoryIds={selectedCategoryIds}
              onNext={() => setStep('detail')}
              onCategoryCreate={handleCategoryCreate}
              onSelectedCategoryIdsChange={setSelectedCategoryIds}
              updateDraft={updateDraft}
            />
          ) : (
            <ProductCreateStepTwo
              attributeDefinitions={attributeDefinitions}
              categoryLoadError={categoryLoadError}
              categoryTree={categoryTree}
              draft={draft}
              selectedCategoryIds={selectedCategoryIds}
              submitState={submitState}
              onBack={() => setStep('basic')}
              onPublish={() => void handleSubmit('active')}
              onSaveDraft={() => void handleSubmit('draft')}
              onSelectedCategoryIdsChange={setSelectedCategoryIds}
              onSyncAttributes={() => void handleSyncAttributes()}
              updateDraft={updateDraft}
              updateSkuDrafts={updateSkuDrafts}
            />
          )}
        </main>
      </div>
    </section>
  );
}

function initialProductCreateStep(mode: ProductCreatePageMode): ProductCreateStep {
  return mode === 'edit' ? 'detail' : 'basic';
}

function ProductCreateHeader({ mode, step }: { mode: ProductCreatePageMode; step: ProductCreateStep }) {
  return (
    <header className="flex shrink-0 items-center justify-between px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label="返回商品列表"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#171717] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
          to="/admin/commerce/products"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[18px] font-semibold text-slate-950 dark:text-white">{mode === 'edit' ? '编辑商品' : '新增商品'}</h1>
            <span className="rounded-md border border-lobster-200 bg-lobster-50 px-2 py-0.5 text-[12px] font-semibold text-lobster-600 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-300">
              {step === 'basic' ? '基础属性' : '商品信息'}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {mode === 'edit'
              ? '复用新建商品流程编辑 SPU，并在同一页面查看和维护 SKU 信息。'
              : '先确定商品基础属性，再补齐展示、规格、库存、物流和售后信息。'}
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-slate-400 lg:flex">
        <StepBadge active={step === 'basic'} index="1" label="基础信息" />
        <div className="h-px w-10 bg-slate-200 dark:bg-white/10" />
        <StepBadge active={step === 'detail'} index="2" label="商品信息" />
      </div>
    </header>
  );
}

function StepBadge({ active, index, label }: { active: boolean; index: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${active ? 'text-slate-950 dark:text-white' : ''}`}>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
          active
            ? 'bg-lobster-600 text-white shadow-sm shadow-lobster-500/20 dark:bg-lobster-500'
            : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'
        }`}
      >
        {index}
      </span>
      {label}
    </span>
  );
}

function CreateAssistantPanel({ items, step }: { items: AssistantItem[]; step: ProductCreateStep }) {
  return (
    <aside
      className="hidden w-[286px] shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-white/10 dark:bg-[#171717] xl:block"
      data-admin-product-create-assistant
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-slate-950 dark:text-white">填写助手</h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">重新上架可更新信息质量</p>
        </div>
      </div>

      {step === 'detail' ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="text-[18px] font-bold">6处待调整</div>
          <div className="mt-1 text-[12px] leading-5">优先处理参数、详情图、SKU 库存、物流和售后承诺。</div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-lobster-200 bg-lobster-50 p-4 text-lobster-700 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-200">
          <div className="text-[14px] font-semibold">基础信息会影响后续参数模板</div>
          <div className="mt-1 text-[12px] leading-5">类目越准确，商品属性、SKU 模板和审核规则越精准。</div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <AssistantItemRow item={item} key={item.label} />
        ))}
      </div>
    </aside>
  );
}

function AssistantItemRow({ item }: { item: AssistantItem }) {
  const toneClassName = {
    active: 'border-lobster-200 bg-lobster-50 text-lobster-600 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    idle: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  }[item.tone];

  return (
    <div className="rounded-lg border border-slate-200 p-3 transition-colors dark:border-white/10">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${toneClassName}`}>
          {item.tone === 'done' ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </span>
        <span className="text-[14px] font-semibold text-slate-950 dark:text-white">{item.label}</span>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
    </div>
  );
}

function ProductCreateStepOne({
  categoryLoadError,
  categoryTree,
  draft,
  onCategoryCreate,
  onNext,
  onSelectedCategoryIdsChange,
  selectedCategoryIds,
  updateDraft,
}: {
  categoryLoadError: string | null;
  categoryTree: ProductCategoryNode[];
  draft: ProductDraftState;
  selectedCategoryIds: string[];
  onCategoryCreate: (input: { name: string; parentId?: string | null; categoryNo?: string }) => Promise<void>;
  onNext: () => void;
  onSelectedCategoryIdsChange: (categoryIds: string[]) => void;
  updateDraft: (patch: Partial<ProductDraftState>) => void;
}) {
  return (
    <div className="flex min-h-full flex-col" data-admin-product-create-step-one>
      <FormPanel>
        <PanelHeader
          description="完成商品基础属性后，系统会根据类目带出商品参数、规格模板和审核规则。"
          icon={<PackageCheck className="h-5 w-5" />}
          title="基础信息"
        />
        <div className="mt-6 space-y-7">
          <FormRow help="建议上传 3-5 张高清图片，首图用于商品列表、分享卡片和搜索结果。" label="主图" required>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {PREVIEW_IMAGES.map((label, index) => (
                <UploadTile featured={index === 0} key={label} label={label} />
              ))}
            </div>
          </FormRow>

          <FormRow help="标题建议 12-30 个字，突出品牌、型号、卖点和适用场景。" label="商品标题" required>
            <div className="space-y-2">
              <TextInput
                placeholder="请输入商品标题，例如：企业版 AI 助手年度订阅服务"
                value={draft.title}
                onChange={(value) => updateDraft({ title: value })}
              />
              <div className="flex items-center gap-2 rounded-lg border border-lobster-200 bg-lobster-50 px-3 py-2 text-[12px] font-medium text-lobster-700 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-200">
                <Info className="h-3.5 w-3.5 shrink-0" />
                推荐包含核心卖点，避免使用极限词、重复符号和无关热词。
              </div>
            </div>
          </FormRow>

          <FormRow help="选择准确的叶子类目，后续参数、规格和审核校验会自动匹配。" label="商品类目" required>
            <ProductCategoryPicker
              categoryLoadError={categoryLoadError}
              categoryTree={categoryTree}
              onCategoryCreate={onCategoryCreate}
              selectedCategoryIds={selectedCategoryIds}
              onSelectedCategoryIdsChange={onSelectedCategoryIdsChange}
            />
          </FormRow>

          <FormRow help="设置后会同步到店铺首页分类导航，便于运营分组。" label="店铺首页展示分类">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {SHOP_CATEGORY_OPTIONS.map((option, index) => (
                  <SelectionPill
                    active={draft.shopCategoryIds.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => {
                      const selected = draft.shopCategoryIds.includes(option);
                      updateDraft({
                        shopCategoryIds: selected
                          ? draft.shopCategoryIds.filter((categoryId) => categoryId !== option)
                          : [...draft.shopCategoryIds, option],
                      });
                    }}
                  />
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                未设置展示分类时，商品仍可上架，但首页分区不会自动收录。
              </div>
            </div>
          </FormRow>
        </div>
      </FormPanel>

      <CreateBottomBar
        primaryLabel="下一步"
        primaryMarker="data-admin-product-create-next"
        secondaryLabel="返回列表"
        secondaryTo="/admin/commerce/products"
        onPrimaryClick={onNext}
      />
    </div>
  );
}

function ProductCreateStepTwo({
  attributeDefinitions,
  categoryLoadError,
  categoryTree,
  draft,
  onBack,
  onPublish,
  onSaveDraft,
  onSelectedCategoryIdsChange,
  onSyncAttributes,
  selectedCategoryIds,
  submitState,
  updateDraft,
  updateSkuDrafts,
}: {
  attributeDefinitions: ProductAttributeDefinition[];
  categoryLoadError: string | null;
  categoryTree: ProductCategoryNode[];
  draft: ProductDraftState;
  selectedCategoryIds: string[];
  submitState: SubmitState;
  onBack: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSelectedCategoryIdsChange: (categoryIds: string[]) => void;
  onSyncAttributes: () => void;
  updateDraft: (patch: Partial<ProductDraftState>) => void;
  updateSkuDrafts: (skuDrafts: ProductSkuDraft[]) => void;
}) {
  const readinessReport = evaluateProductReadiness(draft);

  return (
    <div className="flex min-h-full flex-col" data-admin-product-create-step-two>
      <div className="space-y-4">
        <ProductPublishReadinessPanel report={readinessReport} />
        <FormPanel>
          <PanelHeader
            description="复核基础属性，并补充商品参数和资质信息。"
            icon={<FileText className="h-5 w-5" />}
            right={<QualityBadge />}
            title="基础信息"
          />
          <div className="mt-6 space-y-6">
            <FormRow label="商品标题" required>
              <TextInput
                placeholder="请输入商品标题"
                value={draft.title}
                onChange={(value) => updateDraft({ title: value })}
              />
            </FormRow>
            <FormRow label="商品类目" required>
              <ProductCategoryPicker
                categoryLoadError={categoryLoadError}
                categoryTree={categoryTree}
                compact
                selectedCategoryIds={selectedCategoryIds}
                onSelectedCategoryIdsChange={onSelectedCategoryIdsChange}
              />
            </FormRow>
            <FormRow label="店铺首页展示分类">
              <div className="flex flex-wrap gap-2">
                {SHOP_CATEGORY_OPTIONS.slice(1).map((option) => (
                  <SelectionPill
                    active={draft.shopCategoryIds.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => {
                      const selected = draft.shopCategoryIds.includes(option);
                      updateDraft({
                        shopCategoryIds: selected
                          ? draft.shopCategoryIds.filter((categoryId) => categoryId !== option)
                          : [...draft.shopCategoryIds, option],
                      });
                    }}
                  />
                ))}
              </div>
            </FormRow>
            <FormRow help="参数会用于搜索筛选、详情页展示和商品审核。" label="商品参数">
              <div className="grid gap-3 md:grid-cols-2">
                {draft.parameters.map((parameter) => (
                  <label
                    className="flex min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[14px] shadow-sm transition-colors focus-within:border-lobster-400 focus-within:ring-2 focus-within:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e]"
                    key={parameter.id}
                  >
                    <span className="w-28 shrink-0 border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">{parameter.label}</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                      value={parameter.value}
                      onChange={(event) => updateDraft({
                        parameters: draft.parameters.map((item) => (
                          item.id === parameter.id ? { ...item, value: event.target.value } : item
                        )),
                      })}
                      type="text"
                    />
                  </label>
                ))}
              </div>
            </FormRow>
          </div>
        </FormPanel>

        <ProductDetailConfigPanel
          detailConfig={draft.detailConfig}
          onChange={(detailConfig) => updateDraft({ detailConfig })}
        />

        <SkuMatrixCommercialPanel
          currencyCode={draft.defaultCurrencyCode}
          skuAttributeValues={draft.skuAttributeValues}
          skuDrafts={draft.skuDrafts}
          specGroups={draft.specGroups}
          onSkuAttributeValuesChange={(skuAttributeValues) => updateDraft({ skuAttributeValues })}
          onSkuDraftsChange={updateSkuDrafts}
          onSpecGroupsChange={(specGroups) => updateDraft({ specGroups })}
        />

        <ProductAttributeValuePanel
          categoryAttributeValues={draft.categoryAttributeValues}
          selectedCategoryIds={selectedCategoryIds}
          skuAttributeValues={draft.skuAttributeValues}
          skuDrafts={draft.skuDrafts}
          onCategoryAttributeValuesChange={(categoryAttributeValues) => updateDraft({ categoryAttributeValues })}
          onSkuAttributeValuesChange={(skuAttributeValues) => updateDraft({ skuAttributeValues })}
        />

        <ProductStoreInventoryPanel
          inventoryPolicy={draft.inventoryPolicy}
          productType={draft.productType}
          storeVisibility={draft.storeVisibility}
          onInventoryPolicyChange={(inventoryPolicy) => updateDraft({ inventoryPolicy })}
          onStoreVisibilityChange={(storeVisibility) => updateDraft({ storeVisibility })}
        />

        <FormPanel>
          <PanelHeader
            description="参考图片 2-5 的商品信息页结构，集中处理详情图、描述、视频和卖点。"
            icon={<ImageIcon className="h-5 w-5" />}
            title="商品展示与介绍"
          />
          <div className="mt-6 space-y-6">
            <FormRow help="用于详情页图文介绍，建议不少于 3 张。" label="商品详情图">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {['详情图 1', '详情图 2', '详情图 3', '详情图 4'].map((label) => (
                  <UploadTile key={label} label={label} />
                ))}
              </div>
            </FormRow>
            <FormRow help="清晰说明商品能力、交付方式、适用对象和注意事项。" label="商品描述">
              <textarea
                className="min-h-32 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-6 text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white dark:placeholder:text-slate-500"
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
              />
            </FormRow>
            <FormRow help="上传视频可提升商品理解效率，建议 30-60 秒。" label="视频">
              <div className="flex h-24 items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 transition-colors hover:border-lobster-300 hover:bg-lobster-50/40 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-lobster-600 shadow-sm dark:bg-[#1e1e1e] dark:text-lobster-300">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-slate-950 dark:text-white">上传商品介绍视频</div>
                    <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">支持 MP4，建议横版 16:9。</div>
                  </div>
                </div>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300" type="button">
                  <Upload className="h-4 w-4" />
                  上传
                </button>
              </div>
            </FormRow>
          </div>
        </FormPanel>

        <FormPanel>
          <PanelHeader
            description="规格决定 SKU 组合，价格与库存会直接影响前台售卖。"
            icon={<Box className="h-5 w-5" />}
            title="规格和库存价格"
          />
          <div className="mt-6 space-y-6">
            <FormRow help="最多支持多组规格组合，可用于颜色、版本、套餐等场景。" label="规格">
              <SpecGroupEditor
                specGroups={draft.specGroups}
                onChange={(specGroups) => updateDraft({ specGroups })}
              />
            </FormRow>
            <FormRow help="SKU 编码、价格和库存为上架前必填项。" label="价格与库存" required>
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput
                    prefix="售价"
                    suffix={draft.defaultCurrencyCode}
                    value={draft.defaultPriceAmount}
                    onChange={(value) => updateDraft({ defaultPriceAmount: value })}
                  />
                  <TextInput
                    prefix="商家编码"
                    value={draft.baseSkuNo}
                    onChange={(value) => updateDraft({ baseSkuNo: value })}
                  />
                  <TextInput
                    prefix="销售单位"
                    value={draft.salesUnit}
                    onChange={(value) => updateDraft({ salesUnit: value })}
                  />
                </div>
                <SkuDraftTable
                  skuDrafts={draft.skuDrafts}
                  onChange={updateSkuDrafts}
                />
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  库存创建接口待补齐：当前可维护每个 SKU 的库存运营草稿，提交时会创建 SPU、SKU 和规格属性定义，库存流水需后端新增库存创建接口后落库。
                </div>
              </div>
            </FormRow>
            <FormRow help="规格属性会作为 SKU 属性定义创建或复用，属性值按 SKU 自定义值提交。" label="SKU 属性管理">
              <AttributeManager
                attributeDefinitions={attributeDefinitions}
                specGroups={draft.specGroups}
                onSyncAttributes={onSyncAttributes}
              />
            </FormRow>
            <FormRow help="不同发货模式会影响下单页承诺和库存占用规则。" label="发货方式" required>
              <div className="grid gap-3 lg:grid-cols-3">
                {SHIPPING_OPTIONS.map((option) => (
                  <OptionSelectCard key={option.title} option={option} />
                ))}
              </div>
            </FormRow>
          </div>
        </FormPanel>

        <FormPanel>
          <PanelHeader
            description="补齐开售、定制、保障、物流和售后服务，减少上架后的运营返工。"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="更多设置"
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <SettingsBlock icon={<CalendarClock className="h-5 w-5" />} title="定时开售">
              <ToggleRow description="设置未来时间自动上架，适合新品活动。" label="启用定时开售" />
            </SettingsBlock>
            <SettingsBlock icon={<BadgeCheck className="h-5 w-5" />} title="定制">
              <ToggleRow description="开启后买家需提交定制说明，商家确认后履约。" label="支持定制服务" />
            </SettingsBlock>
            <SettingsBlock icon={<ShieldCheck className="h-5 w-5" />} title="保障">
              <ToggleRow description="展示官方保障标签，增强商品信任。" label="商品质量保障" defaultChecked />
              <ToggleRow description="售后页展示换货入口。" label="支持换货" defaultChecked />
            </SettingsBlock>
            <SettingsBlock icon={<Truck className="h-5 w-5" />} title="物流配送">
              <SelectShell label="默认运费模板 / 今日发 / 全国可配送" />
            </SettingsBlock>
            <SettingsBlock icon={<FileText className="h-5 w-5" />} title="售后及服务">
              <ToggleRow description="买家可在订单内直接联系售后。" label="售后服务入口" defaultChecked />
            </SettingsBlock>
          </div>
        </FormPanel>
      </div>

      <CreateBottomBar
        onBack={onBack}
        onPrimaryClick={onPublish}
        onSecondaryClick={onSaveDraft}
        submitState={submitState}
      />
    </div>
  );
}

function FormPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-[#171717]">
      {children}
    </section>
  );
}

function PanelHeader({
  description,
  icon,
  right,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function FormRow({
  children,
  help,
  label,
  required,
}: {
  children: React.ReactNode;
  help?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[176px_minmax(0,1fr)]">
      <div className="pt-2">
        <div className="text-[14px] font-semibold text-slate-950 dark:text-white">
          {required ? <span className="mr-1 text-red-500">*</span> : null}
          {label}
        </div>
        {help ? <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{help}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ProductCategoryPicker({
  categoryLoadError,
  categoryTree,
  compact,
  onCategoryCreate,
  onSelectedCategoryIdsChange,
  selectedCategoryIds,
}: {
  categoryLoadError: string | null;
  categoryTree: ProductCategoryNode[];
  compact?: boolean;
  onCategoryCreate?: (input: { name: string; parentId?: string | null; categoryNo?: string }) => Promise<void>;
  selectedCategoryIds: string[];
  onSelectedCategoryIdsChange: (categoryIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryManageError, setCategoryManageError] = useState<string | null>(null);

  function removeSelectedCategory(categoryId: string) {
    onSelectedCategoryIdsChange(selectedCategoryIds.filter((id) => id !== categoryId));
  }

  return (
    <div className="space-y-3" data-admin-product-category-picker>
      <ProductCategoryPathList
        categoryTree={categoryTree}
        selectedCategoryIds={selectedCategoryIds}
        separator={compact ? ' / ' : '>'}
        onCategoryRemove={removeSelectedCategory}
        onOpen={() => setOpen(true)}
      />
      {categoryLoadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {categoryLoadError}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-lobster-300 bg-lobster-50 px-4 text-[14px] font-semibold text-lobster-600 transition-colors hover:bg-lobster-100 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/10 dark:border-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-300 dark:hover:bg-lobster-500/15"
          data-admin-product-category-open
          onClick={() => setOpen(true)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          选择更多分类
        </button>
        <span className="text-[12px] leading-5 text-slate-500 dark:text-slate-400">一个商品可以选择多个叶子类目，最多 3 个不同叶子类目，支持更高分类。</span>
      </div>
      {onCategoryCreate ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
          data-admin-product-category-manager
        >
          <div className="mb-2 text-[13px] font-semibold text-slate-950 dark:text-white">类目管理</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              placeholder="快速新建叶子类目，例如：企业订阅服务"
              value={categoryName}
              onChange={setCategoryName}
            />
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-lobster-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-lobster-500/20 transition-colors hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lobster-500 dark:hover:bg-lobster-400 dark:hover:text-slate-950"
              disabled={categorySaving || !categoryName.trim()}
              onClick={() => {
                setCategorySaving(true);
                setCategoryManageError(null);
                onCategoryCreate({ name: categoryName })
                  .then(() => setCategoryName(''))
                  .catch((error) => {
                    setCategoryManageError(error instanceof Error ? error.message : '类目创建失败，请稍后重试。');
                  })
                  .finally(() => setCategorySaving(false));
              }}
              type="button"
            >
              {categorySaving ? '创建中' : '新建类目'}
            </button>
          </div>
          {categoryManageError ? (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {categoryManageError}
            </div>
          ) : null}
        </div>
      ) : null}
      {open ? (
        <ProductCategoryModal
          categoryTree={categoryTree}
          selectedCategoryIds={selectedCategoryIds}
          onClose={() => setOpen(false)}
          onConfirm={(categoryIds) => {
            onSelectedCategoryIdsChange(categoryIds);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ProductCategoryPathList({
  categoryTree,
  onCategoryRemove,
  onOpen,
  selectedCategoryIds,
  separator = '>',
}: {
  categoryTree: ProductCategoryNode[];
  onCategoryRemove?: (categoryId: string) => void;
  onOpen?: () => void;
  selectedCategoryIds: string[];
  separator?: string;
}) {
  const entries = readSelectedCategoryEntries(selectedCategoryIds, categoryTree);

  return (
    <div
      className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-lobster-300 hover:bg-lobster-50/40 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10"
      data-admin-product-category-path-list
      data-admin-product-category-path-open
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">已选类目</span>
        <span className="text-[12px] font-semibold text-lobster-600 dark:text-lobster-300">点击调整</span>
      </div>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="flex min-h-9 items-center rounded-md border border-dashed border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-400 dark:border-white/15 dark:bg-[#1e1e1e] dark:text-slate-500">
            请选择一个或多个叶子类目
          </div>
        ) : (
          entries.map(({ id, path }) => (
            <span
              className="flex min-h-9 items-center justify-between gap-3 rounded-md bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm dark:bg-[#1e1e1e] dark:text-slate-200"
              key={id}
            >
              <span className="min-w-0 truncate">{formatCategoryPath(path, separator)}</span>
              {onCategoryRemove ? (
                <span
                  aria-label={`移除类目 ${formatCategoryPath(path)}`}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-white/10"
                  data-admin-product-category-path-remove
                  onClick={(event) => {
                    event.stopPropagation();
                    onCategoryRemove(id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onCategoryRemove(id);
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ProductCategoryModal({
  categoryTree,
  onClose,
  onConfirm,
  selectedCategoryIds,
}: {
  categoryTree: ProductCategoryNode[];
  selectedCategoryIds: string[];
  onClose: () => void;
  onConfirm: (categoryIds: string[]) => void;
}) {
  const initialDraftCategoryIds = normalizeSelectedCategoryIds(selectedCategoryIds, categoryTree);
  const initialPath = findCategoryPath(initialDraftCategoryIds[0] ?? DEFAULT_SELECTED_CATEGORY_IDS[0], categoryTree);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>(initialDraftCategoryIds);
  const [activePathIds, setActivePathIds] = useState<string[]>(initialPath.map((node) => node.id));
  const [categorySearchText, setCategorySearchText] = useState('');
  const activeColumns = buildCategoryColumns(activePathIds, categoryTree);
  const searchEntries = filterCategoryPathEntries(categorySearchText, categoryTree);
  const selectedCategoryEntries = readSelectedCategoryEntries(draftCategoryIds, categoryTree);
  const categoryLimitReached = draftCategoryIds.length >= MAX_SELECTED_CATEGORY_COUNT;

  useEffect(() => {
    setDraftCategoryIds((currentCategoryIds) => normalizeSelectedCategoryIds(currentCategoryIds, categoryTree));
  }, [categoryTree]);

  function addDraftCategory(categoryId: string) {
    setDraftCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current;
      }
      if (current.length >= MAX_SELECTED_CATEGORY_COUNT) {
        return current;
      }
      return [...current, categoryId];
    });
  }

  function selectNode(node: ProductCategoryNode, depth: number) {
    const nextActivePathIds = [...activePathIds.slice(0, depth), node.id];
    setActivePathIds(nextActivePathIds);
    if (!node.children?.length) {
      addDraftCategory(node.id);
    }
  }

  function removeDraftCategory(categoryId: string) {
    setDraftCategoryIds((current) => current.filter((id) => id !== categoryId));
  }

  function selectSearchEntry(entry: ProductCategoryPathEntry) {
    const nextActivePath = findCategoryPath(entry.id, categoryTree).map((node) => node.id);
    setActivePathIds(nextActivePath);
    addDraftCategory(entry.id);
    setCategorySearchText('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
      data-admin-product-category-modal
    >
      <div className="flex h-[min(1040px,96vh)] w-[min(1840px,98vw)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 transition-colors dark:border-white/10 dark:bg-[#171717]">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-6 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-[22px] font-semibold text-slate-950 dark:text-white">选择商品类目</h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">选择叶子类目后自动加入已选列表，可搜索定位或继续展开更高层级。</p>
          </div>
          <button
            aria-label="关闭类目选择"
            className="ml-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
          <div className="relative shrink-0">
            <label className="flex h-12 items-center rounded-lg border border-slate-200 bg-white px-4 text-[15px] shadow-sm transition-colors focus-within:border-lobster-400 focus-within:ring-2 focus-within:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e]">
              <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                data-admin-product-category-search
                onChange={(event) => setCategorySearchText(event.target.value)}
                placeholder="类目搜索"
                type="text"
                value={categorySearchText}
              />
            </label>

            {categorySearchText.trim() ? (
              <div
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/15 dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-black/45"
                data-admin-product-category-search-results
              >
                {searchEntries.length === 0 ? (
                  <div className="px-3 py-4 text-[13px] font-medium text-slate-400 dark:text-slate-500">未找到匹配类目</div>
                ) : (
                  searchEntries.map((entry) => {
                    const selected = draftCategoryIds.includes(entry.id);
                    const disabledByLimit = categoryLimitReached && !selected;
                    return (
                      <button
                        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-[13px] font-semibold transition-colors ${
                          selected
                            ? 'bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300'
                            : disabledByLimit
                              ? 'cursor-not-allowed text-slate-400 opacity-60 dark:text-slate-500'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-lobster-600 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-lobster-300'
                        }`}
                        aria-disabled={disabledByLimit}
                        disabled={disabledByLimit}
                        key={entry.id}
                        onClick={() => selectSearchEntry(entry)}
                        type="button"
                      >
                        <span className="min-w-0 truncate">{formatCategoryPath(entry.path)}</span>
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0" />
                        ) : disabledByLimit ? (
                          <span className="shrink-0 text-[12px] font-semibold">已达上限</span>
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="grid min-h-0 flex-1">
            <div className="grid min-h-[560px] auto-cols-[minmax(280px,1fr)] grid-flow-col overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717]">
              {activeColumns.map((column, depth) => (
                <CategoryColumn
                  activePathIds={activePathIds}
                  categoryLimitReached={categoryLimitReached}
                  depth={depth}
                  key={`${column.title}-${depth}`}
                  nodes={column.nodes}
                  selectedCategoryIds={draftCategoryIds}
                  title={column.title}
                  onSelectNode={selectNode}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="flex min-h-24 shrink-0 flex-col items-stretch justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-white/10 sm:flex-row sm:items-center">
          <div
            className="min-w-0 flex-1"
            data-admin-product-category-footer-selected
          >
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="text-slate-950 dark:text-white">已选类目</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  categoryLimitReached
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                    : 'bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300'
                }`}
                data-admin-product-category-limit
              >
                {draftCategoryIds.length}/{MAX_SELECTED_CATEGORY_COUNT}
              </span>
              <span>最多选择 3 个类目</span>
            </div>
            {selectedCategoryEntries.length === 0 ? (
              <div className="mt-2 truncate text-[13px] font-medium text-slate-400 dark:text-slate-500">
                请选择一个或多个叶子类目
              </div>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {selectedCategoryEntries.map(({ id, path }) => (
                  <button
                    className="inline-flex h-9 max-w-[360px] shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-[13px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-lobster-300 hover:bg-lobster-50/50 hover:text-lobster-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10 dark:hover:text-lobster-300"
                    key={id}
                    onClick={() => removeDraftCategory(id)}
                    title="点击移除类目"
                    type="button"
                  >
                    <span className="min-w-0 truncate">{formatCategoryPath(path)}</span>
                    <X className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3">
            <button
              className="inline-flex h-11 min-w-32 items-center justify-center rounded-lg bg-slate-100 px-6 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="inline-flex h-11 min-w-32 items-center justify-center rounded-lg bg-lobster-600 px-6 text-[15px] font-semibold text-white shadow-sm shadow-lobster-500/20 transition-colors hover:bg-lobster-700 focus:outline-none focus:ring-2 focus:ring-lobster-500/25 dark:bg-lobster-500 dark:hover:bg-lobster-400 dark:hover:text-slate-950"
              data-admin-product-category-confirm
              onClick={() => onConfirm(draftCategoryIds)}
              type="button"
            >
              确定
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CategoryColumn({
  activePathIds,
  categoryLimitReached,
  depth,
  nodes,
  onSelectNode,
  selectedCategoryIds,
  title,
}: {
  activePathIds: string[];
  categoryLimitReached: boolean;
  depth: number;
  nodes: ProductCategoryNode[];
  selectedCategoryIds: string[];
  title: string;
  onSelectNode: (node: ProductCategoryNode, depth: number) => void;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-slate-200 last:border-r-0 dark:border-white/10">
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-200 bg-slate-50 text-[15px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" data-admin-product-category-column-scroll>
        {nodes.length === 0 ? (
          <div
            className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed border-slate-200 px-4 text-center text-[13px] font-medium leading-5 text-slate-400 dark:border-white/10 dark:text-slate-500"
            data-admin-product-category-column-empty
          >
            选择左侧上级类目后继续展开
          </div>
        ) : (
          <div className="space-y-1">
            {nodes.map((node) => {
              const selected = selectedCategoryIds.includes(node.id);
              const active = activePathIds[depth] === node.id || selected;
              const leaf = !node.children?.length;
              const disabledByLimit = leaf && categoryLimitReached && !selected;
              return (
                <button
                  className={`flex min-h-12 w-full items-center justify-between rounded-md px-3 text-left text-[15px] transition-colors ${
                    active
                      ? 'bg-lobster-50 font-semibold text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300'
                      : disabledByLimit
                        ? 'cursor-not-allowed text-slate-400 opacity-60 dark:text-slate-500'
                      : 'text-slate-900 hover:bg-slate-50 hover:text-lobster-600 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-lobster-300'
                  }`}
                  aria-disabled={disabledByLimit}
                  disabled={disabledByLimit}
                  key={node.id}
                  onClick={() => onSelectNode(node, depth)}
                  type="button"
                >
                  <span className="truncate">{node.label}</span>
                  <span className="ml-3 flex shrink-0 items-center gap-2 text-[12px] font-semibold">
                    {node.badge ? <span className={active ? 'text-lobster-600 dark:text-lobster-300' : 'text-slate-500 dark:text-slate-400'}>{node.badge}</span> : null}
                    {node.children?.length ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : selected ? (
                      <Check className="h-4 w-4" />
                    ) : disabledByLimit ? (
                      <span>已达上限</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function buildCategoryColumns(activePathIds: string[], categoryTree = PRODUCT_CATEGORY_TREE) {
  const columns: Array<{ title: string; nodes: ProductCategoryNode[] }> = [];
  let nodes = categoryTree;
  const maxDepth = Math.max(4, activePathIds.length + 1);

  for (let depth = 0; depth < maxDepth; depth += 1) {
    columns.push({ title: getCategoryColumnTitle(depth), nodes });
    const activeNode = nodes.find((node) => node.id === activePathIds[depth]);
    nodes = activeNode?.children ?? [];
  }

  return columns;
}

function getCategoryColumnTitle(depth: number): string {
  const titles = ['一级类目', '二级类目', '三级类目', '四级类目'];
  return titles[depth] ?? `${depth + 1}级类目`;
}

export function formatCategoryPath(path: string[], separator = '>'): string {
  return path.join(separator);
}

export function readSelectedCategoryPaths(categoryIds: string[], categoryTree = PRODUCT_CATEGORY_TREE): string[][] {
  return readSelectedCategoryEntries(categoryIds, categoryTree).map((entry) => entry.path);
}

export function normalizeSelectedCategoryIds(categoryIds: string[], categoryTree = PRODUCT_CATEGORY_TREE): string[] {
  const normalizedCategoryIds: string[] = [];
  const seenCategoryIds = new Set<string>();

  for (const categoryId of categoryIds) {
    if (seenCategoryIds.has(categoryId)) {
      continue;
    }
    const categoryPath = findCategoryPath(categoryId, categoryTree);
    const selectedNode = categoryPath[categoryPath.length - 1];
    if (!selectedNode || selectedNode.children?.length) {
      continue;
    }
    seenCategoryIds.add(categoryId);
    normalizedCategoryIds.push(categoryId);
    if (normalizedCategoryIds.length >= MAX_SELECTED_CATEGORY_COUNT) {
      break;
    }
  }

  return normalizedCategoryIds;
}

export function filterCategoryPathEntries(searchText: string, categoryTree = PRODUCT_CATEGORY_TREE): ProductCategoryPathEntry[] {
  const keyword = searchText.trim().toLowerCase();
  if (!keyword) {
    return [];
  }

  return collectLeafCategoryEntries(categoryTree)
    .filter((entry) => {
      const pathText = entry.path.join('/').toLowerCase();
      return pathText.includes(keyword) || entry.id.toLowerCase().includes(keyword);
    })
    .slice(0, 20);
}

export function normalizeProductCategoryTree(records: ProductCategoryRecordInput[]): ProductCategoryNode[] {
  const nodeById = new Map<string, ProductCategoryNode & { sortOrder: number }>();
  const parentIdById = new Map<string, string | null>();

  records.forEach((record) => {
    const id = normalizeRecordId(record.id);
    const label = normalizeRecordLabel(record);
    if (!id || !label || record.status === 'archived') {
      return;
    }

    nodeById.set(id, {
      id,
      label,
      sortOrder: normalizeSortOrder(record),
    });
    parentIdById.set(id, normalizeRecordId(record.parentId ?? record.parent_id));
  });

  const roots: Array<ProductCategoryNode & { sortOrder: number }> = [];

  nodeById.forEach((node, id) => {
    const parentId = parentIdById.get(id);
    const parent = parentId ? nodeById.get(parentId) : undefined;
    if (parent && parent.id !== node.id) {
      parent.children = [...(parent.children ?? []), node];
      return;
    }
    roots.push(node);
  });

  sortCategoryNodes(roots);
  return roots.map(stripCategorySortOrder);
}

export function createDefaultProductDraft(): ProductDraftState {
  return {
    ...DEFAULT_PRODUCT_DRAFT,
    selectedCategoryIds: [...DEFAULT_PRODUCT_DRAFT.selectedCategoryIds],
    shopCategoryIds: [...DEFAULT_PRODUCT_DRAFT.shopCategoryIds],
    parameters: DEFAULT_PRODUCT_DRAFT.parameters.map((parameter) => ({ ...parameter })),
    specGroups: DEFAULT_PRODUCT_DRAFT.specGroups.map((group) => ({
      ...group,
      values: group.values.map((value) => ({ ...value })),
    })),
    skuDrafts: DEFAULT_PRODUCT_DRAFT.skuDrafts.map((sku) => ({
      ...sku,
      specSelections: sku.specSelections.map((selection) => ({ ...selection })),
    })),
    detailConfig: cloneDetailConfig(DEFAULT_PRODUCT_DRAFT.detailConfig),
    storeVisibility: cloneStoreVisibility(DEFAULT_PRODUCT_DRAFT.storeVisibility),
    inventoryPolicy: cloneInventoryPolicy(DEFAULT_PRODUCT_DRAFT.inventoryPolicy),
    categoryAttributeValues: DEFAULT_PRODUCT_DRAFT.categoryAttributeValues.map((attribute) => ({ ...attribute })),
    skuAttributeValues: DEFAULT_PRODUCT_DRAFT.skuAttributeValues.map((attribute) => ({ ...attribute })),
    metadata: { ...DEFAULT_PRODUCT_DRAFT.metadata },
  };
}

export function normalizeSpecGroups(specGroups: ProductSpecGroup[]): ProductSpecGroup[] {
  return specGroups
    .map((group) => ({
      ...group,
      id: group.id || buildDraftId(group.name),
      name: group.name.trim(),
      values: group.values
        .map((value) => ({
          ...value,
          id: value.id || buildDraftId(value.name),
          name: value.name.trim(),
          code: value.code || value.id || slugCode(value.name),
          enabled: value.enabled !== false,
        }))
        .filter((value) => value.name),
    }))
    .filter((group) => group.name && group.values.length > 0)
    .slice(0, 4);
}

export function generateSkuDraftsFromSpecGroups(
  specGroups: ProductSpecGroup[],
  options: {
    title: string;
    baseSkuNo: string;
    defaultPriceAmount: string;
    defaultCurrencyCode: string;
  },
): ProductSkuDraft[] {
  const normalizedGroups = normalizeSpecGroups(specGroups);
  const combinations = buildSpecCombinations(normalizedGroups);

  return combinations.map((combination, index) => {
    const specPath = combination.map((selection) => selection.valueName).join(' / ') || '默认规格';
    const skuNo = [options.baseSkuNo || 'SKU', ...combination.map((selection) => selection.valueCode || slugCode(selection.valueName))]
      .filter(Boolean)
      .join('-')
      .toUpperCase();
    const proPrice = combination.some((selection) => /pro|专业/.test(`${selection.valueCode}${selection.valueName}`.toLowerCase()))
      ? '3999.00'
      : options.defaultPriceAmount;
    return {
      id: combination.map((selection) => `${selection.groupId}:${selection.valueId}`).join('|') || `default-${index}`,
      specKey: combination.map((selection) => selection.valueId).join('|') || 'default',
      specPath,
      title: [options.title || '商品', ...combination.map((selection) => selection.valueName)].join(' '),
      skuNo,
      barcode: `BAR-${skuNo}`,
      priceAmount: proPrice,
      currencyCode: options.defaultCurrencyCode || 'CNY',
      stockQuantity: index === 0 ? 500 : 260,
      enabled: true,
      status: 'active',
      specSelections: combination,
    };
  });
}

export function validateProductDraft(draft: ProductDraftState): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) {
    errors.push('请填写商品标题。');
  }
  if (draft.selectedCategoryIds.length === 0) {
    errors.push('请选择至少一个叶子类目。');
  }
  if (!draft.spuNo.trim()) {
    errors.push('请填写 SPU 编码。');
  }
  if (draft.skuDrafts.length === 0) {
    errors.push('请至少维护一个 SKU。');
  }
  const enabledSkuDrafts = draft.skuDrafts.filter((sku) => sku.enabled);
  if (enabledSkuDrafts.some((sku) => !sku.skuNo.trim())) {
    errors.push('请补齐所有可售 SKU 编码。');
  }
  if (enabledSkuDrafts.some((sku) => !isPositiveAmount(sku.priceAmount))) {
    errors.push('请填写有效的 SKU 售价。');
  }
  return errors;
}

export function buildProductCreatePayload(draft: ProductDraftState, mode: ProductSubmitMode) {
  return {
    brand: draft.brand || null,
    categoryIds: normalizeSelectedCategoryIds(draft.selectedCategoryIds),
    description: draft.description || null,
    productType: draft.productType,
    spuNo: draft.spuNo,
    status: mode,
    subtitle: draft.subtitle || null,
    title: draft.title,
    metadata: {
      ...draft.metadata,
      ...buildCommercialProductMetadata(draft),
    },
  };
}

export function buildSkuCreatePayloads(
  draft: ProductDraftState,
  productId: string,
  mode: ProductSubmitMode,
  attributeIdByName: Map<string, string>,
) {
  return buildSkuMutationPayloads(draft, productId, mode, attributeIdByName).map((sku) => sku.body);
}

export function buildSkuMutationPayloads(
  draft: ProductDraftState,
  productId: string,
  mode: ProductSubmitMode,
  attributeIdByName: Map<string, string>,
) {
  return draft.skuDrafts
    .filter((sku) => sku.enabled || mode === 'draft' || Boolean(sku.backendSkuId))
    .map((sku) => ({
      backendSkuId: sku.backendSkuId,
      body: {
        attributes: buildSkuAttributePayloads(draft, sku, attributeIdByName),
        defaultCurrencyCode: sku.currencyCode || draft.defaultCurrencyCode,
        defaultPriceAmount: sku.priceAmount || draft.defaultPriceAmount,
        fulfillmentType: draft.fulfillmentType,
        barcode: sku.barcode || null,
        image: sku.image,
        productId,
        salesUnit: draft.salesUnit || null,
        skuNo: sku.skuNo,
        status: mode === 'draft' ? 'draft' as const : sku.status,
        taxCategory: draft.taxCategory || null,
        title: sku.title,
      },
    }));
}

function buildSkuAttributePayloads(
  draft: ProductDraftState,
  sku: ProductSkuDraft,
  attributeIdByName: Map<string, string>,
) {
  const authoredValues = draft.skuAttributeValues.filter((attribute) => (
    attribute.skuDraftId === sku.id || attribute.specKey === sku.specKey
  ));
  if (authoredValues.length > 0) {
    return authoredValues.map((attribute) => ({
      attributeId: attributeIdByName.get(attribute.attributeName) || attribute.attributeId || buildEntityNo('ATTR', attribute.attributeName),
      attributeName: attribute.attributeName,
      customValue: attribute.value,
      displayValue: attribute.displayValue || attribute.value,
      valueCode: attribute.valueCode || slugCode(attribute.displayValue || attribute.value || attribute.attributeName),
    }));
  }
  return sku.specSelections.map((selection) => ({
    attributeId: attributeIdByName.get(selection.groupName) ?? buildEntityNo('ATTR', selection.groupName),
    attributeName: selection.groupName,
    customValue: selection.valueName,
    displayValue: selection.valueName,
    valueCode: selection.valueCode,
  }));
}

export async function ensureSkuAttributeDefinitions(specGroups: ProductSpecGroup[]): Promise<Map<string, string>> {
  const attributeIdByName = new Map<string, string>();
  const listResult = await listCommerceAttributes({ page: '1', pageSize: '200', status: 'active' });
  for (const attribute of readCatalogRecords(listResult)) {
    const attributeName = readCatalogString(attribute, ['name']);
    const attributeId = readCatalogString(attribute, ['id']);
    if (attributeName && attributeId) {
      attributeIdByName.set(attributeName, attributeId);
    }
  }

  for (const group of normalizeSpecGroups(specGroups)) {
    if (attributeIdByName.has(group.name)) {
      continue;
    }
    const result = await createCommerceAttribute({
      attributeNo: buildEntityNo('ATTR', group.name),
      filterable: true,
      name: group.name,
      required: true,
      scope: 'sku',
      searchable: true,
      status: 'active',
      valueType: 'enum',
    });
    const item = readCatalogItem(result);
    if (item) {
      const attributeName = readCatalogString(item, ['name']);
      const attributeId = readCatalogString(item, ['id']);
      if (attributeName && attributeId) {
        attributeIdByName.set(attributeName, attributeId);
      }
    }
  }

  return attributeIdByName;
}

type SubmitProductDraftOptions = {
  productId?: string;
};

export async function submitProductDraft(
  draft: ProductDraftState,
  mode: ProductSubmitMode,
  options: SubmitProductDraftOptions = {},
): Promise<{ productId: string; skuCount: number }> {
  const errors = validateProductDraft(draft);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const attributeIdByName = await ensureSkuAttributeDefinitions(draft.specGroups);
  const productResult = options.productId
    ? await updateCommerceProduct(options.productId, buildProductCreatePayload(draft, mode))
    : await createCommerceProduct(buildProductCreatePayload(draft, mode));
  const productId = options.productId ?? readCatalogString(readCatalogItem(productResult) ?? {}, ['id']);
  if (!productId) {
    throw new Error('商品创建成功但未返回商品 ID。');
  }
  const skuPayloads = buildSkuMutationPayloads(draft, productId, mode, attributeIdByName);
  await Promise.all(
    skuPayloads.map((sku) => (
      sku.backendSkuId
        ? updateCommerceSku(sku.backendSkuId, sku.body)
        : createCommerceSku(sku.body)
    ))
  );
  return { productId, skuCount: skuPayloads.length };
}

function readSelectedCategoryEntries(categoryIds: string[], categoryTree = PRODUCT_CATEGORY_TREE): ProductCategoryPathEntry[] {
  return categoryIds
    .map((categoryId) => ({ id: categoryId, path: findCategoryPath(categoryId, categoryTree).map((node) => node.label) }))
    .filter((entry) => entry.path.length > 0);
}

function normalizeProductAttributeDefinitions(records: CatalogRecord[]): ProductAttributeDefinition[] {
  return records
    .map((record) => ({
      id: readCatalogString(record, ['id']),
      attributeNo: readCatalogString(record, ['attributeNo', 'attribute_no']),
      name: readCatalogString(record, ['name']),
      scope: normalizeAttributeScope(readCatalogString(record, ['scope'])),
      valueType: normalizeAttributeDefinitionValueType(readCatalogString(record, ['valueType', 'value_type'])),
      status: normalizeAttributeStatus(readCatalogString(record, ['status'])),
    }))
    .filter((record) => record.id && record.name);
}

type CatalogRecord = Record<string, unknown>;

function readCatalogRecords(result: unknown): CatalogRecord[] {
  return readApiItems(result).filter(isCatalogRecord);
}

function readCatalogItem(result: unknown): CatalogRecord | null {
  const data = readApiData(result);
  if (isCatalogRecord(data)) {
    const item = data.item;
    if (isCatalogRecord(item)) {
      return item;
    }
  }
  return isCatalogRecord(data) ? data : null;
}

export async function loadProductDraftForEdit(productId: string): Promise<ProductDraftState> {
  const product = await loadProductRecordForEdit(productId);
  const skuResult = await listCommerceSkus({ page: '1', pageSize: '200', productId });
  return createProductDraftFromCatalogRecords(product, readCatalogRecords(skuResult));
}

async function loadProductRecordForEdit(productId: string): Promise<CatalogRecord> {
  const product = readCatalogItem(await retrieveCommerceProduct(productId));
  if (product) {
    return product;
  }
  throw new Error('未找到商品，无法进入编辑。');
}

function createProductDraftFromCatalogRecords(product: CatalogRecord, skuRecords: CatalogRecord[]): ProductDraftState {
  const baseDraft = createDefaultProductDraft();
  const firstSku = skuRecords[0];
  const categoryIds = readCatalogStringArray(product, 'categoryIds');
  const skuDrafts = skuRecords.map(skuDraftFromRecord);
  const specGroups = inferSpecGroupsFromSkuRecords(skuDrafts);
  const commercialMetadata = readCommercialProductMetadata(product);
  const spuNo = readCatalogString(product, ['spuNo', 'spu_no', 'code', 'id']) || baseDraft.spuNo;
  const defaultPriceAmount = firstSku
    ? readCatalogString(firstSku, ['defaultPriceAmount', 'priceAmount', 'price_amount'])
    : readCatalogString(product, ['minPriceAmount', 'priceAmount']);
  const defaultCurrencyCode = firstSku
    ? readCatalogString(firstSku, ['defaultCurrencyCode', 'currencyCode', 'currency_code'])
    : readCatalogString(product, ['currencyCode', 'currency_code']);

  const nextSkuDrafts = skuDrafts.length ? skuDrafts : generateSkuDraftsFromSpecGroups(baseDraft.specGroups, {
    title: productSkuBaseTitle(readCatalogString(product, ['title', 'name']) || baseDraft.title),
    baseSkuNo: spuNo,
    defaultPriceAmount: defaultPriceAmount || baseDraft.defaultPriceAmount,
    defaultCurrencyCode: defaultCurrencyCode || baseDraft.defaultCurrencyCode,
  });

  return {
    ...baseDraft,
    ...commercialMetadata,
    title: readCatalogString(product, ['title', 'name']) || baseDraft.title,
    subtitle: readCatalogString(product, ['subtitle']) || '',
    description: readCatalogString(product, ['description']) || '',
    brand: readCatalogString(product, ['brand']) || '',
    productType: normalizeProductType(readCatalogString(product, ['productType', 'product_type'])),
    spuNo,
    defaultPriceAmount: defaultPriceAmount || baseDraft.defaultPriceAmount,
    defaultCurrencyCode: defaultCurrencyCode || baseDraft.defaultCurrencyCode,
    baseSkuNo: firstSku ? skuBaseNo(readCatalogString(firstSku, ['skuNo', 'sku_no'])) : spuNo,
    salesUnit: firstSku ? readCatalogString(firstSku, ['salesUnit', 'sales_unit']) || baseDraft.salesUnit : baseDraft.salesUnit,
    taxCategory: firstSku ? readCatalogString(firstSku, ['taxCategory', 'tax_category']) || baseDraft.taxCategory : baseDraft.taxCategory,
    fulfillmentType: firstSku ? normalizeFulfillmentType(readCatalogString(firstSku, ['fulfillmentType'])) : baseDraft.fulfillmentType,
    selectedCategoryIds: normalizeSelectedCategoryIds(categoryIds),
    specGroups: specGroups.length ? specGroups : baseDraft.specGroups,
    skuDrafts: nextSkuDrafts,
    skuAttributeValues: mergeSkuAttributeValues(
      mergeSkuAttributeValues(
        buildSkuAttributeValuesFromSkuDrafts(nextSkuDrafts),
        buildSkuAttributeValuesFromSkuRecords(skuRecords, nextSkuDrafts),
      ),
      commercialMetadata.skuAttributeValues ?? baseDraft.skuAttributeValues,
    ),
    metadata: readCatalogMetadata(product),
  };
}

function skuDraftFromRecord(record: CatalogRecord): ProductSkuDraft {
  const skuId = readCatalogString(record, ['id']);
  const skuNo = readCatalogString(record, ['skuNo', 'sku_no']);
  const status = normalizeSkuStatus(readCatalogString(record, ['status']));
  const specSelections = readSkuSpecSelections(record);
  const specKey = specSelections.map((selection) => selection.valueId).join('|') || skuId || skuNo || 'default';
  return {
    id: skuId || specKey,
    backendSkuId: skuId || undefined,
    specKey,
    specPath: specSelections.map((selection) => selection.valueName).join(' / ') || '默认规格',
    title: readCatalogString(record, ['title', 'name']) || skuNo || 'SKU',
    skuNo,
    barcode: readCatalogString(record, ['barcode']),
    image: readCatalogMediaResource(record, ['image']),
    priceAmount: readCatalogString(record, ['defaultPriceAmount', 'priceAmount', 'price_amount']) || '0.00',
    currencyCode: readCatalogString(record, ['defaultCurrencyCode', 'currencyCode', 'currency_code']) || 'CNY',
    stockQuantity: 0,
    enabled: status !== 'inactive' && status !== 'archived',
    status,
    specSelections,
  };
}

function readSkuSpecSelections(record: CatalogRecord): ProductSkuSpecSelection[] {
  const attributes = record.attributes;
  if (!Array.isArray(attributes)) {
    return [];
  }
  return attributes
    .filter(isCatalogRecord)
    .map((attribute) => {
      const groupName = readCatalogString(attribute, ['attributeName', 'name', 'attribute_id']) || 'SKU 属性';
      const valueName = readCatalogString(attribute, ['displayValue', 'customValue', 'valueCode', 'attributeValueId']) || '默认值';
      return {
        groupId: readCatalogString(attribute, ['attributeId', 'attribute_id']) || buildDraftId(groupName),
        groupName,
        valueId: readCatalogString(attribute, ['attributeValueId', 'attribute_value_id', 'valueCode']) || buildDraftId(valueName),
        valueName,
        valueCode: readCatalogString(attribute, ['valueCode', 'value_code']) || slugCode(valueName),
      };
    });
}

function inferSpecGroupsFromSkuRecords(skuDrafts: ProductSkuDraft[]): ProductSpecGroup[] {
  const groups = new Map<string, ProductSpecGroup>();
  for (const sku of skuDrafts) {
    for (const selection of sku.specSelections) {
      const group = groups.get(selection.groupId) ?? {
        id: selection.groupId,
        attributeId: selection.groupId,
        name: selection.groupName,
        values: [],
      };
      if (!group.values.some((value) => value.id === selection.valueId)) {
        group.values.push({
          id: selection.valueId,
          name: selection.valueName,
          code: selection.valueCode,
          enabled: true,
        });
      }
      groups.set(selection.groupId, group);
    }
  }
  return Array.from(groups.values());
}

function readCatalogString(record: CatalogRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function readCatalogStringArray(record: CatalogRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (typeof item === 'number' && Number.isFinite(item)) {
        return String(item);
      }
      return '';
    })
    .filter(Boolean);
}

function readCatalogMetadata(record: CatalogRecord): Record<string, unknown> {
  const metadata = record.metadata;
  return isCatalogRecord(metadata) ? { ...metadata } : {};
}

function normalizeAttributeScope(value: string): ProductAttributeDefinition['scope'] {
  return value === 'spu' || value === 'sku' || value === 'both' ? value : 'both';
}

function normalizeAttributeDefinitionValueType(value: string): ProductAttributeDefinition['valueType'] {
  return value === 'number' || value === 'boolean' || value === 'enum' || value === 'date' ? value : 'text';
}

function normalizeAttributeStatus(value: string): ProductAttributeDefinition['status'] {
  return value === 'inactive' || value === 'archived' ? value : 'active';
}

function readCatalogMediaResource(record: CatalogRecord, keys: string[]): ClawRouterMediaResource | undefined {
  for (const key of keys) {
    const value = record[key];
    const resource = readMediaResource(value);
    if (resource) {
      return resource;
    }
  }
  return undefined;
}

function isCatalogRecord(value: unknown): value is CatalogRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function skuBaseNo(skuNo: string): string {
  return skuNo.split('-').filter(Boolean)[0] || skuNo || 'SKU';
}

function normalizeProductType(value: string): ProductDraftState['productType'] {
  const productTypes: ProductDraftState['productType'][] = ['physical_good', 'virtual_good', 'membership', 'points_recharge', 'wallet_recharge', 'subscription', 'service'];
  return productTypes.includes(value as ProductDraftState['productType']) ? value as ProductDraftState['productType'] : 'physical_good';
}

function normalizeFulfillmentType(value: string): ProductDraftState['fulfillmentType'] {
  const fulfillmentTypes: ProductDraftState['fulfillmentType'][] = ['physical_shipment', 'digital_delivery', 'entitlement_grant', 'points_credit', 'wallet_credit', 'subscription_activation', 'service_activation', 'none'];
  return fulfillmentTypes.includes(value as ProductDraftState['fulfillmentType']) ? value as ProductDraftState['fulfillmentType'] : 'none';
}

function normalizeSkuStatus(value: string): ProductSkuDraft['status'] {
  const statuses: ProductSkuDraft['status'][] = ['draft', 'active', 'inactive', 'archived'];
  return statuses.includes(value as ProductSkuDraft['status']) ? value as ProductSkuDraft['status'] : 'draft';
}

function buildSpecCombinations(specGroups: ProductSpecGroup[]): ProductSkuSpecSelection[][] {
  if (specGroups.length === 0) {
    return [[]];
  }

  return specGroups.reduce<ProductSkuSpecSelection[][]>((combinations, group) => {
    const values = group.values.filter((value) => value.enabled !== false);
    if (values.length === 0) {
      return combinations;
    }
    return combinations.flatMap((combination) => values.map((value) => [
      ...combination,
      {
        groupId: group.id,
        groupName: group.name,
        valueId: value.id,
        valueName: value.name,
        valueCode: value.code || value.id || slugCode(value.name),
      },
    ]));
  }, [[]]);
}

function mergeSkuDrafts(generatedSkuDrafts: ProductSkuDraft[], currentSkuDrafts: ProductSkuDraft[]): ProductSkuDraft[] {
  const currentBySpecKey = new Map(currentSkuDrafts.map((sku) => [sku.specKey, sku]));
  return generatedSkuDrafts.map((generatedSku) => {
    const currentSku = currentBySpecKey.get(generatedSku.specKey);
    return currentSku
      ? {
        ...generatedSku,
        backendSkuId: currentSku.backendSkuId,
        title: currentSku.title || generatedSku.title,
        skuNo: currentSku.skuNo || generatedSku.skuNo,
        barcode: currentSku.barcode || generatedSku.barcode,
        image: currentSku.image ?? generatedSku.image,
        priceAmount: currentSku.priceAmount || generatedSku.priceAmount,
        stockQuantity: currentSku.stockQuantity,
        enabled: currentSku.enabled,
        status: currentSku.status,
      }
      : generatedSku;
  });
}

function buildSkuAttributeValuesFromSkuDrafts(skuDrafts: ProductSkuDraft[]): ProductSkuAttributeValue[] {
  return skuDrafts.flatMap((sku) => sku.specSelections.map((selection) => ({
    id: `${sku.id}:${selection.groupId}`,
    skuDraftId: sku.id,
    specKey: sku.specKey,
    attributeId: selection.groupId,
    attributeName: selection.groupName,
    valueCode: selection.valueCode,
    value: selection.valueName,
    displayValue: selection.valueName,
    required: true,
  })));
}

function buildSkuAttributeValuesFromSkuRecords(
  skuRecords: CatalogRecord[],
  skuDrafts: ProductSkuDraft[],
): ProductSkuAttributeValue[] {
  const skuDraftByBackendId = new Map(skuDrafts.map((sku) => [sku.backendSkuId, sku]));
  const skuDraftBySkuNo = new Map(skuDrafts.map((sku) => [sku.skuNo, sku]));

  return skuRecords.flatMap((record) => {
    const attributes = record.attributes;
    if (!Array.isArray(attributes)) {
      return [];
    }
    const skuDraft = skuDraftByBackendId.get(readCatalogString(record, ['id']))
      ?? skuDraftBySkuNo.get(readCatalogString(record, ['skuNo', 'sku_no']));
    if (!skuDraft) {
      return [];
    }

    return attributes
      .filter(isCatalogRecord)
      .map((attribute, index) => {
        const attributeName = readCatalogString(attribute, ['attributeName', 'name', 'attribute_id']) || 'SKU Attribute';
        const value = readCatalogString(attribute, ['value', 'customValue', 'displayValue', 'valueCode', 'attributeValueId']);
        const displayValue = readCatalogString(attribute, ['displayValue', 'value', 'customValue', 'valueCode', 'attributeValueId']);
        return {
          id: `${skuDraft.id}:${readCatalogString(attribute, ['attributeId', 'attribute_id']) || slugCode(attributeName)}:${index}`,
          skuDraftId: skuDraft.id,
          specKey: skuDraft.specKey,
          attributeId: readCatalogString(attribute, ['attributeId', 'attribute_id']) || buildEntityNo('ATTR', attributeName),
          attributeName,
          valueCode: readCatalogString(attribute, ['valueCode', 'value_code']) || slugCode(displayValue || value || attributeName),
          value,
          displayValue,
          required: true,
        };
      });
  });
}

function mergeSkuAttributeValues(
  generatedValues: ProductSkuAttributeValue[],
  currentValues: ProductSkuAttributeValue[],
): ProductSkuAttributeValue[] {
  const currentByKey = new Map(currentValues.map((value) => [skuAttributeValueKey(value), value]));
  return generatedValues.map((generatedValue) => {
    const currentValue = currentByKey.get(skuAttributeValueKey(generatedValue));
    return currentValue
      ? {
        ...generatedValue,
        value: currentValue.value || generatedValue.value,
        displayValue: currentValue.displayValue || generatedValue.displayValue,
        required: currentValue.required,
      }
      : generatedValue;
  });
}

function skuAttributeValueKey(value: ProductSkuAttributeValue): string {
  return `${value.specKey || value.skuDraftId}:${value.attributeId || value.attributeName}`;
}

function createDefaultDetailConfig(): ProductDetailConfig {
  return {
    ...DEFAULT_PRODUCT_DETAIL_CONFIG,
    mainImageUrl: 'https://assets.sdkwork.local/products/ai-assistant/main.png',
    galleryImageUrls: [
      'https://assets.sdkwork.local/products/ai-assistant/gallery-1.png',
      'https://assets.sdkwork.local/products/ai-assistant/gallery-2.png',
    ],
    detailImageUrls: [
      'https://assets.sdkwork.local/products/ai-assistant/detail-1.png',
      'https://assets.sdkwork.local/products/ai-assistant/detail-2.png',
      'https://assets.sdkwork.local/products/ai-assistant/detail-3.png',
    ],
    sellingPoints: [
      'Knowledge base question answering',
      'Workflow automation',
      'Multi-device collaboration',
    ],
    parameterRows: PARAMETER_ROWS.map((parameter) => ({
      id: parameter.id,
      label: parameter.label,
      value: parameter.value,
    })),
    servicePromises: ['Invoice support', 'Online activation', 'Enterprise after-sale support'],
    shippingPolicy: 'Online activation after payment confirmation.',
    afterSalePolicy: 'Enterprise support team handles renewal, change, and service issues.',
    seoTitle: 'Enterprise AI assistant subscription',
    seoDescription: 'AI assistant subscription for knowledge base, automation, analytics, and collaboration.',
    seoKeywords: ['AI assistant', 'subscription', 'enterprise'],
    shareTitle: 'Enterprise AI assistant',
    shareDescription: 'Knowledge, automation, analytics, and collaboration in one subscription.',
    shareImageUrl: 'https://assets.sdkwork.local/products/ai-assistant/share.png',
    customSections: [
      {
        id: 'detail-section-capability',
        title: 'Capability',
        body: 'Knowledge Q&A, workflow automation, data insight, and team collaboration.',
      },
    ],
  };
}

function createDefaultStoreVisibility(): ProductStoreVisibility {
  return {
    ...DEFAULT_STORE_VISIBILITY,
    storeIds: [...DEFAULT_STORE_VISIBILITY.storeIds],
    channelCodes: [...DEFAULT_STORE_VISIBILITY.channelCodes],
  };
}

function createDefaultInventoryPolicy(productType: string): ProductInventoryPolicy {
  if (productType !== 'physical_good') {
    return {
      ...DEFAULT_INVENTORY_POLICY,
      managed: false,
      readinessMode: 'not_required',
      sourceIds: [],
    };
  }
  return {
    ...DEFAULT_INVENTORY_POLICY,
    sourceIds: [...DEFAULT_INVENTORY_POLICY.sourceIds],
  };
}

function createDefaultCategoryAttributeValues(): ProductCategoryAttributeValue[] {
  return [
    {
      id: 'category-attribute-brand',
      attributeId: 'brand',
      attributeNo: 'ATTR-BRAND',
      attributeName: 'Brand',
      valueType: 'text',
      value: 'SdkWork',
      displayValue: 'SdkWork',
      required: true,
    },
    {
      id: 'category-attribute-scenario',
      attributeId: 'scenario',
      attributeNo: 'ATTR-SCENARIO',
      attributeName: 'Scenario',
      valueType: 'text',
      value: 'Enterprise collaboration / AI tools',
      displayValue: 'Enterprise collaboration / AI tools',
      required: true,
    },
  ];
}

function cloneDetailConfig(detailConfig: ProductDetailConfig): ProductDetailConfig {
  return {
    ...detailConfig,
    galleryImageUrls: [...detailConfig.galleryImageUrls],
    detailImageUrls: [...detailConfig.detailImageUrls],
    sellingPoints: [...detailConfig.sellingPoints],
    parameterRows: detailConfig.parameterRows.map((row) => ({ ...row })),
    servicePromises: [...detailConfig.servicePromises],
    seoKeywords: [...detailConfig.seoKeywords],
    customSections: detailConfig.customSections.map((section) => ({ ...section })),
  };
}

function cloneStoreVisibility(storeVisibility: ProductStoreVisibility): ProductStoreVisibility {
  return {
    ...storeVisibility,
    storeIds: [...storeVisibility.storeIds],
    channelCodes: [...storeVisibility.channelCodes],
  };
}

function cloneInventoryPolicy(inventoryPolicy: ProductInventoryPolicy): ProductInventoryPolicy {
  return {
    ...inventoryPolicy,
    sourceIds: [...inventoryPolicy.sourceIds],
  };
}

function productSkuBaseTitle(title: string): string {
  return title.replace(/年度订阅服务|订阅服务|服务/g, '').trim() || title.trim() || '商品';
}

function flattenCategoryTreeRecords(nodes: ProductCategoryNode[], parentId: string | null = null): ProductCategoryRecordInput[] {
  return nodes.flatMap((node, index) => [
    {
      id: node.id,
      name: node.label,
      parentId,
      sortOrder: index,
      status: 'active',
    },
    ...flattenCategoryTreeRecords(node.children ?? [], node.id),
  ]);
}

function arraysEqual(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function isPositiveAmount(value: string): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function normalizeInteger(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function buildDraftId(value: string): string {
  return `${slugCode(value).toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildEntityNo(prefix: string, value: string): string {
  return `${prefix}-${slugCode(value) || Date.now().toString(36)}`.toUpperCase();
}

function slugCode(value: string): string {
  const normalized = value
    .trim()
    .replace(/基础版/g, 'basic')
    .replace(/专业版/g, 'pro')
    .replace(/旗舰版/g, 'max')
    .replace(/年度/g, 'year')
    .replace(/月度/g, 'month')
    .replace(/季度/g, 'quarter')
    .replace(/服务周期/g, 'cycle')
    .replace(/版本/g, 'version');
  const ascii = normalized
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase();
  if (ascii) {
    return ascii;
  }
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return `V${Math.abs(hash).toString(36).toUpperCase()}`;
}

function collectLeafCategoryEntries(nodes = PRODUCT_CATEGORY_TREE, currentPath: ProductCategoryNode[] = []): ProductCategoryPathEntry[] {
  return nodes.flatMap((node) => {
    const nextPath = [...currentPath, node];
    if (!node.children?.length) {
      return [{ id: node.id, path: nextPath.map((pathNode) => pathNode.label) }];
    }
    return collectLeafCategoryEntries(node.children, nextPath);
  });
}

function findCategoryPath(categoryId: string, nodes = PRODUCT_CATEGORY_TREE, currentPath: ProductCategoryNode[] = []): ProductCategoryNode[] {
  for (const node of nodes) {
    const nextPath = [...currentPath, node];
    if (node.id === categoryId) {
      return nextPath;
    }
    if (node.children?.length) {
      const childPath = findCategoryPath(categoryId, node.children, nextPath);
      if (childPath.length > 0) {
        return childPath;
      }
    }
  }
  return [];
}

function normalizeRecordId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRecordLabel(record: ProductCategoryRecordInput): string | null {
  const value = record.name ?? record.label;
  if (!value) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeSortOrder(record: ProductCategoryRecordInput): number {
  const value = record.sortOrder ?? record.sort_order;
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function sortCategoryNodes(nodes: Array<ProductCategoryNode & { sortOrder: number }>) {
  nodes.sort((first, second) => first.sortOrder - second.sortOrder || first.label.localeCompare(second.label, 'zh-Hans-CN'));
  nodes.forEach((node) => {
    if (node.children?.length) {
      sortCategoryNodes(node.children as Array<ProductCategoryNode & { sortOrder: number }>);
    }
  });
}

function stripCategorySortOrder(node: ProductCategoryNode & { sortOrder?: number }): ProductCategoryNode {
  const { sortOrder: _sortOrder, children, ...rest } = node;
  return {
    ...rest,
    ...(children?.length ? { children: children.map((child) => stripCategorySortOrder(child as ProductCategoryNode & { sortOrder?: number })) } : {}),
  };
}

function UploadTile({ featured, label }: { featured?: boolean; label: string }) {
  return (
    <button
      className={`group flex aspect-square min-h-28 flex-col items-center justify-center rounded-lg border border-dashed text-[13px] font-semibold transition-colors ${
        featured
          ? 'border-lobster-300 bg-lobster-50 text-lobster-600 hover:bg-lobster-100 dark:border-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-300 dark:hover:bg-lobster-500/15'
          : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-lobster-300 hover:bg-lobster-50/50 hover:text-lobster-600 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10 dark:hover:text-lobster-300'
      }`}
      type="button"
    >
      {featured ? <Plus className="mb-2 h-5 w-5" /> : <Upload className="mb-2 h-5 w-5" />}
      {label}
      <span className="mt-1 text-[11px] font-medium opacity-75">{featured ? '必填' : '选填'}</span>
    </button>
  );
}

function TextInput({
  defaultValue,
  onChange,
  placeholder,
  prefix,
  suffix,
  value,
}: {
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  value?: string;
}) {
  const inputProps = value === undefined
    ? { defaultValue }
    : { value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value) };

  return (
    <label className="flex h-11 min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[14px] shadow-sm transition-colors focus-within:border-lobster-400 focus-within:ring-2 focus-within:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e]">
      {prefix ? <span className="shrink-0 border-r border-slate-200 px-3 font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">{prefix}</span> : null}
      <input
        className="min-w-0 flex-1 bg-transparent px-3 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        placeholder={placeholder}
        type="text"
        {...inputProps}
      />
      {suffix ? <span className="shrink-0 border-l border-slate-200 px-3 font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">{suffix}</span> : null}
    </label>
  );
}

function SelectionPill({ active, label, onClick }: { active?: boolean; label: string; onClick?: () => void }) {
  return (
    <button
      className={`inline-flex h-9 items-center rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
        active
          ? 'border-lobster-500 bg-lobster-50 text-lobster-600 dark:border-lobster-500/40 dark:bg-lobster-500/10 dark:text-lobster-300'
          : 'border-slate-200 bg-white text-slate-600 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SelectShell({ label }: { label: string }) {
  return (
    <button className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-[14px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-lobster-300 hover:text-lobster-600 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300" type="button">
      <span className="truncate">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
    </button>
  );
}

function QualityBadge() {
  return (
    <div className="hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-right text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:block">
      <div className="text-[15px] font-bold">6处待调整</div>
      <div className="mt-0.5 text-[11px] font-medium">完成后可上架</div>
    </div>
  );
}

function SpecGroupEditor({
  onChange,
  specGroups,
}: {
  specGroups: ProductSpecGroup[];
  onChange: (specGroups: ProductSpecGroup[]) => void;
}) {
  function updateGroup(groupId: string, patch: Partial<ProductSpecGroup>) {
    onChange(specGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  }

  function updateValue(groupId: string, valueId: string, patch: Partial<ProductSpecValue>) {
    onChange(specGroups.map((group) => (
      group.id === groupId
        ? { ...group, values: group.values.map((value) => (value.id === valueId ? { ...value, ...patch } : value)) }
        : group
    )));
  }

  function addGroup(label?: string) {
    const nextName = label || `规格${specGroups.length + 1}`;
    onChange([
      ...specGroups,
      {
        id: buildDraftId(nextName),
        name: nextName,
        values: [{ id: buildDraftId(`${nextName}-默认`), name: '默认', enabled: true }],
      },
    ]);
  }

  function addValue(group: ProductSpecGroup) {
    const nextValueName = `选项${group.values.length + 1}`;
    updateGroup(group.id, {
      values: [...group.values, { id: buildDraftId(`${group.name}-${nextValueName}`), name: nextValueName, enabled: true }],
    });
  }

  return (
    <div className="space-y-3" data-admin-product-sku-attribute-manager>
      <div className="flex flex-wrap gap-2">
        {SPEC_OPTIONS.map((option) => (
          <SelectionPill
            active={specGroups.some((group) => group.name === option)}
            key={option}
            label={option}
            onClick={() => {
              if (!specGroups.some((group) => group.name === option)) {
                addGroup(option);
              }
            }}
          />
        ))}
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-lobster-300 bg-lobster-50 px-3 text-[13px] font-semibold text-lobster-600 transition-colors hover:bg-lobster-100 dark:border-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-300 dark:hover:bg-lobster-500/15"
          onClick={() => addGroup()}
          type="button"
        >
          <CirclePlus className="h-4 w-4" />
          创建新规格
        </button>
      </div>

      <div className="space-y-3">
        {specGroups.map((group) => (
          <section
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
            data-admin-product-spec-group
            key={group.id}
          >
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
              <TextInput
                prefix="规格名"
                value={group.name}
                onChange={(value) => updateGroup(group.id, { name: value })}
              />
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <label
                    className="inline-flex h-9 min-w-28 items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] shadow-sm transition-colors focus-within:border-lobster-400 focus-within:ring-2 focus-within:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e]"
                    data-admin-product-spec-value
                    key={value.id}
                  >
                    <input
                      className="min-w-0 flex-1 bg-transparent px-3 font-semibold text-slate-800 outline-none dark:text-slate-100"
                      value={value.name}
                      onChange={(event) => updateValue(group.id, value.id, {
                        name: event.target.value,
                        code: slugCode(event.target.value),
                      })}
                    />
                    <button
                      aria-label="删除规格值"
                      className="h-full border-l border-slate-200 px-2 text-slate-400 transition-colors hover:text-red-500 dark:border-white/10"
                      onClick={() => updateGroup(group.id, { values: group.values.filter((item) => item.id !== value.id) })}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </label>
                ))}
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/15 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
                  onClick={() => addValue(group)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加规格值
                </button>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-[13px] font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                onClick={() => onChange(specGroups.filter((item) => item.id !== group.id))}
                type="button"
              >
                删除
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SkuDraftTable({
  onChange,
  skuDrafts,
}: {
  skuDrafts: ProductSkuDraft[];
  onChange: (skuDrafts: ProductSkuDraft[]) => void;
}) {
  function updateSku(skuId: string, patch: Partial<ProductSkuDraft>) {
    onChange(skuDrafts.map((sku) => (sku.id === skuId ? { ...sku, ...patch } : sku)));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-[13px]">
        <thead className="bg-slate-50 text-slate-500 dark:bg-white/[0.03] dark:text-slate-300">
          <tr className="h-10">
            <th className="w-[170px] px-3 font-semibold">规格</th>
            <th className="w-[180px] px-3 font-semibold">SKU 编码</th>
            <th className="w-[180px] px-3 font-semibold">商品条形码</th>
            <th className="w-[210px] px-3 font-semibold">SKU 配图</th>
            <th className="w-[120px] px-3 font-semibold">价格</th>
            <th className="w-[100px] px-3 font-semibold">库存</th>
            <th className="w-[100px] px-3 font-semibold">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/10 dark:bg-[#171717]">
          {skuDrafts.map((sku) => (
            <tr
              className="h-11 text-slate-700 dark:text-slate-300"
              data-admin-product-sku-draft-row
              key={sku.id}
            >
              <td className="px-3 font-semibold text-slate-950 dark:text-white">{sku.specPath}</td>
              <td className="px-3">
                <InlineTableInput value={sku.skuNo} onChange={(value) => updateSku(sku.id, { skuNo: value })} />
              </td>
              <td className="px-3">
                <InlineTableInput
                  marker="data-admin-product-sku-barcode"
                  placeholder="输入商品条形码"
                  value={sku.barcode}
                  onChange={(value) => updateSku(sku.id, { barcode: value })}
                />
              </td>
              <td className="px-3">
                <SkuImageField
                  image={sku.image}
                  onChange={(image) => updateSku(sku.id, { image })}
                />
              </td>
              <td className="px-3">
                <InlineTableInput value={sku.priceAmount} onChange={(value) => updateSku(sku.id, { priceAmount: value })} />
              </td>
              <td className="px-3">
                <InlineTableInput
                  value={String(sku.stockQuantity)}
                  onChange={(value) => updateSku(sku.id, { stockQuantity: normalizeInteger(value, sku.stockQuantity) })}
                />
              </td>
              <td className="px-3">
                <SelectionPill
                  active={sku.enabled}
                  label={sku.enabled ? '可售' : '停用'}
                  onClick={() => updateSku(sku.id, {
                    enabled: !sku.enabled,
                    status: sku.enabled ? 'inactive' : 'active',
                  })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineTableInput({
  marker,
  onChange,
  placeholder,
  value,
}: {
  marker?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const markerProps = marker ? { [marker]: true } : {};

  return (
    <input
      className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...markerProps}
    />
  );
}

function SkuImageField({
  image,
  onChange,
}: {
  image?: ClawRouterMediaResource;
  onChange: (value?: ClawRouterMediaResource) => void;
}) {
  const imageSource = readMediaResourceUrl(image);
  return (
    <div className="flex h-12 min-w-0 items-center gap-2" data-admin-product-sku-image>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/[0.04]">
        {imageSource ? (
          <img alt="SKU 配图" className="h-full w-full object-cover" src={imageSource} />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </div>
      <InlineTableInput
        placeholder="图片 URL"
        value={imageSource}
        onChange={(value) => onChange(toExternalUrlMediaResource(value, 'image'))}
      />
    </div>
  );
}

function AttributeManager({
  attributeDefinitions,
  onSyncAttributes,
  specGroups,
}: {
  attributeDefinitions: ProductAttributeDefinition[];
  specGroups: ProductSpecGroup[];
  onSyncAttributes: () => void;
}) {
  const attributeNameSet = new Set(attributeDefinitions.map((attribute) => attribute.name));

  return (
    <div
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
      data-admin-product-attribute-manager
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-slate-950 dark:text-white">类目属性 / SKU 属性定义</div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
            已加载 {attributeDefinitions.length} 个属性定义；当前规格会以 SKU 属性定义创建或复用。
          </p>
        </div>
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-lobster-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-lobster-500/20 transition-colors hover:bg-lobster-700 dark:bg-lobster-500 dark:hover:bg-lobster-400 dark:hover:text-slate-950"
          onClick={onSyncAttributes}
          type="button"
        >
          同步规格属性
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {specGroups.map((group) => {
          const known = attributeNameSet.has(group.name);
          return (
            <span
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold ${
                known
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
              }`}
              key={group.id}
            >
              {group.name} · {known ? '已存在' : '待创建'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function OptionSelectCard({ option }: { option: OptionCard }) {
  return (
    <button
      className={`min-h-28 rounded-lg border p-4 text-left transition-colors ${
        option.active
          ? 'border-lobster-500 bg-lobster-50 text-lobster-700 dark:border-lobster-500/40 dark:bg-lobster-500/10 dark:text-lobster-200'
          : 'border-slate-200 bg-white text-slate-700 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
      }`}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold">{option.title}</span>
        {option.active ? <Check className="h-4 w-4" /> : null}
      </div>
      <p className="mt-2 text-[12px] leading-5 opacity-80">{option.description}</p>
    </button>
  );
}

function SettingsBlock({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lobster-600 shadow-sm dark:bg-[#1e1e1e] dark:text-lobster-300">
          {icon}
        </span>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  defaultChecked,
  description,
  label,
}: {
  defaultChecked?: boolean;
  description: string;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-lobster-300 dark:border-white/10 dark:bg-[#1e1e1e] dark:hover:border-lobster-500/40">
      <input
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-lobster-600 dark:border-white/20 dark:accent-lobster-400"
        defaultChecked={defaultChecked}
        type="checkbox"
      />
      <span>
        <span className="block text-[13px] font-semibold text-slate-950 dark:text-white">{label}</span>
        <span className="mt-1 block text-[12px] leading-5 text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </label>
  );
}

function CreateBottomBar({
  onBack,
  onPrimaryClick,
  onSecondaryClick,
  primaryLabel = '上架',
  primaryMarker = 'data-admin-product-create-publish',
  secondaryLabel = '保存草稿',
  secondaryTo,
  submitState,
}: {
  onBack?: () => void;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  primaryLabel?: string;
  primaryMarker?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  submitState?: SubmitState;
}) {
  const primaryMarkerProps = { [primaryMarker]: true };
  const submitting = submitState?.status === 'submitting';

  return (
    <footer className="sticky bottom-0 z-20 mt-5 flex min-h-20 shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur transition-colors dark:border-white/10 dark:bg-[#171717]/95 dark:shadow-[0_-12px_30px_rgba(0,0,0,0.35)]">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
            onClick={onBack}
            type="button"
          >
            上一步
          </button>
        ) : null}
        <label className="hidden items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-slate-400 sm:inline-flex">
          <input className="h-4 w-4 rounded border-slate-300 accent-lobster-600 dark:border-white/20 dark:accent-lobster-400" type="checkbox" />
          隐藏到店铺首页
        </label>
        {submitState ? (
          <div
            className={`hidden max-w-[520px] truncate rounded-lg px-3 py-2 text-[12px] font-semibold lg:block ${
              submitState.status === 'error'
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200'
                : submitState.status === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
            }`}
            data-admin-product-create-submit-status
          >
            {submitState.message}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {secondaryTo ? (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
            to={secondaryTo}
          >
            {secondaryLabel}
          </Link>
        ) : (
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 transition-colors hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
            data-admin-product-create-save-draft
            disabled={submitting}
            onClick={onSecondaryClick}
            type="button"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg bg-lobster-600 px-6 text-[14px] font-semibold text-white shadow-sm shadow-lobster-500/20 transition-colors hover:bg-lobster-700 focus:outline-none focus:ring-2 focus:ring-lobster-500/25 dark:bg-lobster-500 dark:hover:bg-lobster-400 dark:hover:text-slate-950"
          disabled={submitting}
          onClick={onPrimaryClick}
          type="button"
          {...primaryMarkerProps}
        >
          {submitting && submitState?.mode === 'active' ? '上架中' : primaryLabel}
        </button>
      </div>
    </footer>
  );
}
