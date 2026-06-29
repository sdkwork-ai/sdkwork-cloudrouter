import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Boxes,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Edit2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Key,
  Layers,
  Loader2,
  MessageSquare,
  Mic,
  Music,
  Network,
  Plus,
  Search,
  Server,
  Trash2,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AccountModelMappingService,
  ChannelAiResourceService,
  ChannelService,
  ProviderSecretService,
  ChannelModelCatalogService,
  type AccountModelMappingInput,
  type AiResource,
  type AiResourceGroup,
  type ChannelCredentialItem,
  type ChannelItem,
  type ChannelModelCatalogItem,
  type ChannelUpdateInput,
  type ProviderSecretItem,
  isCatalogModelKey,
  normalizeModelCatalogKey,
  providerCodeForVendor,
} from './channelService';
import { authTypesList, knownModelVendors } from './channelOptions';
import {
  createChannelCopyDraft,
  createChannelEditDraft,
  createChannelInputFromForm,
  createChannelStatusUpdateInput,
  createChannelUpdateInputFromForm,
  defaultChannelCredentialFormValue,
  resolveAuthTypeFormValue,
  resolveAuthTypeSubmitValue,
  resolveChannelSelectFormValue,
  type ChannelCredentialFormValue,
  type ChannelFormValues,
} from './channelForm';
import {
  channelAiResourceCapabilityCodes,
  deriveChannelTargetVendorCodes,
  isAiResourceGroupVisibleForChannelVendorScope,
  isAiResourceVisibleForChannelVendorScope,
  reconcileChannelVendorSelection,
} from './channelVendorSelection.ts';
import { AdminTableShell, AiResourceSelectorModal, BusinessStateTableRow, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';

type ToastState = { message: string; type: 'success' | 'info' | 'error' } | null;
type AccountDrawerMode = 'create' | 'copy' | 'edit';
type PendingChannelAction = 'test' | 'update' | 'delete';
type ChannelType = 'official' | 'relay';
type AiResourceCategory = 'model' | 'image' | 'video' | 'audio' | 'music' | 'sfx' | 'api_resource';
type AccountDrawerContentTab = 'models' | 'resources';
type ModelRouteTab = 'targetModels' | 'mappingRules';
type ResourceAssociationTab = 'groups' | 'resources';
type AccountModelMappingRow = {
  id: string;
  sourceModel: string;
  targetModel: string;
  custom: boolean;
};
type ChannelTargetModelsByVendor = Record<string, string[]>;
type AccountModelMappingsByVendor = Record<string, AccountModelMappingRow[]>;
type EditableChannelCredential = ChannelCredentialFormValue & {
  localId: string;
};
type CredentialFieldConfig = {
  name: string;
  labelKey: string;
  placeholderKey: string;
  secret?: boolean;
  textarea?: boolean;
};
type DeleteConfirmation = {
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
};

const capabilityOptions = [
  { id: 'llm', labelKey: 'common.modality.llm', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'image', labelKey: 'common.modality.image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: 'audio', labelKey: 'common.modality.audio', icon: <Mic className="w-3.5 h-3.5" /> },
  { id: 'music', labelKey: 'common.modality.music', icon: <Music className="w-3.5 h-3.5" /> },
  { id: 'sfx', labelKey: 'common.modality.sfx', icon: <Volume2 className="w-3.5 h-3.5" /> },
  { id: 'video', labelKey: 'common.modality.video', icon: <Video className="w-3.5 h-3.5" /> },
];

const channelTabs = [
  { id: 'all', labelKey: 'admin.channel.tabs.allChannels' },
  { id: 'OpenAI', label: 'OpenAI' },
  { id: 'Anthropic', label: 'Anthropic' },
  { id: 'Gemini', label: 'Gemini' },
  { id: 'DeepSeek', label: 'DeepSeek' },
  { id: 'Zhipu', label: 'Zhipu' },
  { id: 'Ollama', label: 'Ollama' },
  { id: 'OpenRouter', label: 'OpenRouter' },
];

const channelTypeOptions: Array<{
  id: ChannelType;
  titleKey: string;
  descKey: string;
}> = [
  {
    id: 'official',
    titleKey: 'admin.channel.channelType.official',
    descKey: 'admin.channel.channelType.officialDesc',
  },
  {
    id: 'relay',
    titleKey: 'admin.channel.channelType.relay',
    descKey: 'admin.channel.channelType.relayDesc',
  },
];

const credentialRotationOptions = [
  { id: 'default', labelKey: 'admin.channel.rotation.default', descKey: 'admin.channel.rotation.defaultDesc' },
  { id: 'priority', labelKey: 'admin.channel.rotation.priority', descKey: 'admin.channel.rotation.priorityDesc' },
  { id: 'round_robin', labelKey: 'admin.channel.rotation.roundRobin', descKey: 'admin.channel.rotation.roundRobinDesc' },
  { id: 'weighted_round_robin', labelKey: 'admin.channel.rotation.weightedRoundRobin', descKey: 'admin.channel.rotation.weightedRoundRobinDesc' },
  { id: 'random', labelKey: 'admin.channel.rotation.random', descKey: 'admin.channel.rotation.randomDesc' },
] as const;

const credentialFieldSets: Record<string, CredentialFieldConfig[]> = {
  'claude-code': [
    { name: 'claudeCodeToken', labelKey: 'admin.channel.credentialFields.claudeCodeToken', placeholderKey: 'admin.channel.credentialPlaceholders.claudeCodeToken', secret: true },
  ],
  google: [
    { name: 'googleApiKey', labelKey: 'admin.channel.credentialFields.googleApiKey', placeholderKey: 'admin.channel.credentialPlaceholders.googleApiKey', secret: true },
    { name: 'googleServiceAccountJson', labelKey: 'admin.channel.credentialFields.googleServiceAccountJson', placeholderKey: 'admin.channel.credentialPlaceholders.googleServiceAccountJson', textarea: true },
  ],
  'oauth-gcp': [
    { name: 'googleServiceAccountJson', labelKey: 'admin.channel.credentialFields.googleServiceAccountJson', placeholderKey: 'admin.channel.credentialPlaceholders.googleServiceAccountJson', textarea: true },
    { name: 'googleProjectId', labelKey: 'admin.channel.credentialFields.googleProjectId', placeholderKey: 'admin.channel.credentialPlaceholders.googleProjectId' },
    { name: 'googleLocation', labelKey: 'admin.channel.credentialFields.googleLocation', placeholderKey: 'admin.channel.credentialPlaceholders.googleLocation' },
  ],
  azure: [
    { name: 'azureTenantId', labelKey: 'admin.channel.credentialFields.azureTenantId', placeholderKey: 'admin.channel.credentialPlaceholders.azureTenantId' },
    { name: 'azureClientId', labelKey: 'admin.channel.credentialFields.azureClientId', placeholderKey: 'admin.channel.credentialPlaceholders.azureClientId' },
    { name: 'azureClientSecret', labelKey: 'admin.channel.credentialFields.azureClientSecret', placeholderKey: 'admin.channel.credentialPlaceholders.azureClientSecret', secret: true },
    { name: 'azureSubscriptionId', labelKey: 'admin.channel.credentialFields.azureSubscriptionId', placeholderKey: 'admin.channel.credentialPlaceholders.azureSubscriptionId' },
  ],
  'azure-ad': [
    { name: 'azureOpenAiApiKey', labelKey: 'admin.channel.credentialFields.azureOpenAiApiKey', placeholderKey: 'admin.channel.credentialPlaceholders.azureOpenAiApiKey', secret: true },
    { name: 'azureDeployment', labelKey: 'admin.channel.credentialFields.azureDeployment', placeholderKey: 'admin.channel.credentialPlaceholders.azureDeployment' },
    { name: 'azureApiVersion', labelKey: 'admin.channel.credentialFields.azureApiVersion', placeholderKey: 'admin.channel.credentialPlaceholders.azureApiVersion' },
  ],
  'aws-bedrock': [
    { name: 'awsAccessKeyId', labelKey: 'admin.channel.credentialFields.awsAccessKeyId', placeholderKey: 'admin.channel.credentialPlaceholders.awsAccessKeyId' },
    { name: 'awsSecretAccessKey', labelKey: 'admin.channel.credentialFields.awsSecretAccessKey', placeholderKey: 'admin.channel.credentialPlaceholders.awsSecretAccessKey', secret: true },
    { name: 'awsRegion', labelKey: 'admin.channel.credentialFields.awsRegion', placeholderKey: 'admin.channel.credentialPlaceholders.awsRegion' },
    { name: 'awsSessionToken', labelKey: 'admin.channel.credentialFields.awsSessionToken', placeholderKey: 'admin.channel.credentialPlaceholders.awsSessionToken', secret: true },
  ],
  aliyun: [
    { name: 'aliyunAccessKeyId', labelKey: 'admin.channel.credentialFields.aliyunAccessKeyId', placeholderKey: 'admin.channel.credentialPlaceholders.aliyunAccessKeyId' },
    { name: 'aliyunAccessKeySecret', labelKey: 'admin.channel.credentialFields.aliyunAccessKeySecret', placeholderKey: 'admin.channel.credentialPlaceholders.aliyunAccessKeySecret', secret: true },
    { name: 'aliyunRegion', labelKey: 'admin.channel.credentialFields.aliyunRegion', placeholderKey: 'admin.channel.credentialPlaceholders.aliyunRegion' },
  ],
  volcengine: [
    { name: 'volcengineAccessKeyId', labelKey: 'admin.channel.credentialFields.volcengineAccessKeyId', placeholderKey: 'admin.channel.credentialPlaceholders.volcengineAccessKeyId' },
    { name: 'volcengineSecretAccessKey', labelKey: 'admin.channel.credentialFields.volcengineSecretAccessKey', placeholderKey: 'admin.channel.credentialPlaceholders.volcengineSecretAccessKey', secret: true },
    { name: 'volcengineRegion', labelKey: 'admin.channel.credentialFields.volcengineRegion', placeholderKey: 'admin.channel.credentialPlaceholders.volcengineRegion' },
  ],
  'tencent-cloud': [
    { name: 'tencentSecretId', labelKey: 'admin.channel.credentialFields.tencentSecretId', placeholderKey: 'admin.channel.credentialPlaceholders.tencentSecretId' },
    { name: 'tencentSecretKey', labelKey: 'admin.channel.credentialFields.tencentSecretKey', placeholderKey: 'admin.channel.credentialPlaceholders.tencentSecretKey', secret: true },
    { name: 'tencentRegion', labelKey: 'admin.channel.credentialFields.tencentRegion', placeholderKey: 'admin.channel.credentialPlaceholders.tencentRegion' },
  ],
};

function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function aiResourceCategory(resource: AiResource | undefined): AiResourceCategory {
  const modalityCode = resource?.modalityCode?.trim().toLowerCase();
  if (modalityCode === 'image' || modalityCode === 'video' || modalityCode === 'audio' || modalityCode === 'music' || modalityCode === 'sfx') {
    return modalityCode;
  }
  if (modalityCode === 'network') {
    return 'api_resource';
  }
  return 'model';
}

function displayAiResourceCategory(resource: AiResource | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`admin.channel.aiResourceCategory.${aiResourceCategory(resource)}`);
}

function readPositiveIntegerFormValue(
  formData: FormData,
  key: string,
  messages: { required: string; positiveInteger: string },
): number {
  const rawValue = formData.get(key);
  const normalized = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!normalized) {
    throw new Error(messages.required);
  }
  if (!/^\d+$/.test(normalized)) {
    throw new Error(messages.positiveInteger);
  }
  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(messages.positiveInteger);
  }
  return value;
}

function toDateTimeLocalValue(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    return '';
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized.slice(0, 16);
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayChannelTime(value: string | null | undefined, fallback = ''): string {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }
  return date.toLocaleString();
}

function optionalTranslatedLabel(
  t: ReturnType<typeof useTranslation>['t'],
  item: { label?: string; name?: string; labelKey?: string; nameKey?: string },
): string {
  if (typeof item.labelKey === 'string') {
    return t(item.labelKey);
  }
  if (typeof item.nameKey === 'string') {
    return t(item.nameKey);
  }
  return item.label ?? item.name ?? '';
}

function resolveChannelType(value: string | undefined): ChannelType {
  return value === 'relay' ? 'relay' : 'official';
}

function normalizeAiResourceCode(value: string): string {
  return value.trim().toLowerCase();
}

function compareChannelBindableAiResources(left: AiResource, right: AiResource): number {
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.resourceCode.localeCompare(right.resourceCode);
}

function findAiResourceByCode(resources: readonly AiResource[], resourceCode: string): AiResource | undefined {
  const normalizedCode = normalizeAiResourceCode(resourceCode);
  return resources.find((resource) => normalizeAiResourceCode(resource.resourceCode) === normalizedCode);
}

function findAiResourceGroupByCode(groups: readonly AiResourceGroup[], groupCode: string): AiResourceGroup | undefined {
  const normalizedCode = normalizeAiResourceCode(groupCode);
  return groups.find((group) => normalizeAiResourceCode(group.groupCode) === normalizedCode);
}

function splitResourceAssociationCodes(
  resourceCodes: readonly string[],
  groups: readonly AiResourceGroup[],
): { resourceGroupCodes: string[]; resourceCodes: string[] } {
  const groupCodeSet = new Set(groups.map((group) => normalizeAiResourceCode(group.groupCode)));
  const resourceGroupCodes: string[] = [];
  const concreteResourceCodes: string[] = [];
  for (const code of resourceCodes) {
    const normalizedCode = normalizeAiResourceCode(code);
    if (!normalizedCode) {
      continue;
    }
    if (groupCodeSet.has(normalizedCode)) {
      resourceGroupCodes.push(normalizedCode);
    } else {
      concreteResourceCodes.push(normalizedCode);
    }
  }
  return {
    resourceGroupCodes: Array.from(new Set(resourceGroupCodes)),
    resourceCodes: Array.from(new Set(concreteResourceCodes)),
  };
}

function modelVendorIdForCode(vendorCode: string): string {
  const normalizedVendorCode = providerCodeForVendor(vendorCode);
  return knownModelVendors.find((vendor) => providerCodeForVendor(vendor.id) === normalizedVendorCode)?.id
    ?? normalizedVendorCode;
}

function vendorSummariesForCodes(
  vendorCodes: readonly string[],
  t: ReturnType<typeof useTranslation>['t'],
): Array<{ code: string; id: string; name: string }> {
  return Array.from(new Set(vendorCodes.map((code) => providerCodeForVendor(code)).filter(Boolean)))
    .map((code) => {
      const vendor = knownModelVendors.find((item) => providerCodeForVendor(item.id) === code);
      return {
        code,
        id: vendor?.id ?? code,
        name: vendor ? optionalTranslatedLabel(t, vendor) : code,
      };
    });
}

function catalogModelVendorCode(model: string, fallbackVendorCode: string): string {
  const normalized = model.trim();
  if (!isCatalogModelKey(normalized)) {
    return fallbackVendorCode;
  }
  return providerCodeForVendor(normalized.split('/')[0] ?? fallbackVendorCode);
}

function catalogModelRuntimeId(model: string): string {
  const normalized = model.trim();
  if (!isCatalogModelKey(normalized)) {
    return normalized;
  }
  const parts = normalized.split('/');
  return parts.slice(1).join('/');
}

function stableModelMappingRowId(vendorCode: string, sourceModel: string, targetModel: string, custom: boolean): string {
  return [
    providerCodeForVendor(vendorCode),
    sourceModel.trim().toLowerCase(),
    targetModel.trim().toLowerCase(),
    custom ? 'custom' : 'catalog',
  ].join(':');
}

function normalizeTargetModelForVendor(model: string, vendorCode: string): string {
  const normalizedModel = model.trim();
  if (!normalizedModel) {
    return '';
  }
  return isCatalogModelKey(normalizedModel)
    ? normalizedModel
    : normalizeModelCatalogKey(normalizedModel, modelVendorIdForCode(vendorCode));
}

function mergeTargetModelsFromMappingInputs(
  targetModelsByVendor: ChannelTargetModelsByVendor,
  mappings: readonly AccountModelMappingInput[],
  accountVendorCode: string,
): ChannelTargetModelsByVendor {
  const next: ChannelTargetModelsByVendor = Object.fromEntries(
    Object.entries(targetModelsByVendor).map(([vendorCode, models]) => [vendorCode, [...models]]),
  );
  for (const mapping of mappings) {
    const targetVendorCode = providerCodeForVendor(
      mapping.targetVendorCode ?? catalogModelVendorCode(mapping.targetModel, accountVendorCode),
    );
    const targetModel = normalizeTargetModelForVendor(mapping.targetModel, targetVendorCode);
    if (targetModel && !(next[targetVendorCode] ?? []).includes(targetModel)) {
      next[targetVendorCode] = [...(next[targetVendorCode] ?? []), targetModel];
    }
  }
  return next;
}

function buildModelMappingsByVendorFromInputs(
  mappings: readonly AccountModelMappingInput[],
  vendorCodes: readonly string[],
  accountVendorCode: string,
): AccountModelMappingsByVendor {
  const next: AccountModelMappingsByVendor = {};
  for (const vendorCode of vendorCodes) {
    next[vendorCode] = [];
  }
  for (const mapping of mappings) {
    const targetVendorCode = providerCodeForVendor(
      mapping.targetVendorCode ?? catalogModelVendorCode(mapping.targetModel, accountVendorCode),
    );
    const targetModel = isCatalogModelKey(mapping.targetModel)
      ? mapping.targetModel.trim()
      : normalizeModelCatalogKey(mapping.targetModel, modelVendorIdForCode(targetVendorCode));
    const sourceModel = mapping.sourceModel.trim() || catalogModelRuntimeId(targetModel);
    next[targetVendorCode] = [
      ...(next[targetVendorCode] ?? []),
      {
        id: stableModelMappingRowId(targetVendorCode, sourceModel, targetModel, true),
        sourceModel,
        targetModel,
        custom: true,
      },
    ];
  }
  return next;
}

function ensureTargetModelVendors(
  current: ChannelTargetModelsByVendor,
  vendorCodes: readonly string[],
): ChannelTargetModelsByVendor {
  const next: ChannelTargetModelsByVendor = {};
  for (const vendorCode of vendorCodes) {
    next[vendorCode] = current[vendorCode] ?? [];
  }
  return next;
}

function ensureModelMappingVendors(
  current: AccountModelMappingsByVendor,
  vendorCodes: readonly string[],
): AccountModelMappingsByVendor {
  const next: AccountModelMappingsByVendor = {};
  for (const vendorCode of vendorCodes) {
    next[vendorCode] = current[vendorCode] ?? [];
  }
  return next;
}

function flattenModelMappings(mappings: AccountModelMappingsByVendor): AccountModelMappingRow[] {
  return Object.values(mappings)
    .flat()
    .map((row) => ({
      ...row,
      sourceModel: row.sourceModel.trim(),
      targetModel: row.targetModel.trim(),
    }))
    .filter((row) => row.sourceModel && row.targetModel);
}

function flattenTargetModels(modelsByVendor: ChannelTargetModelsByVendor): string[] {
  return Array.from(new Set(
    Object.values(modelsByVendor).flat()
      .map((model) => model.trim())
      .filter(Boolean),
  ));
}

function targetModelRowsFromVendorMap(modelsByVendor: ChannelTargetModelsByVendor): AccountModelMappingRow[] {
  return Object.entries(modelsByVendor).flatMap(([vendorCode, models]) => models
    .map((model) => normalizeTargetModelForVendor(model, vendorCode))
    .filter(Boolean)
    .map((targetModel) => ({
      id: stableModelMappingRowId(vendorCode, catalogModelRuntimeId(targetModel), targetModel, false),
      sourceModel: catalogModelRuntimeId(targetModel),
      targetModel,
      custom: false,
    })));
}

function accountModelMappingInputs(
  mappings: readonly AccountModelMappingRow[],
  accountVendorCode: string,
): AccountModelMappingInput[] {
  return mappings.map((row) => ({
    sourceModel: row.sourceModel.trim(),
    targetModel: row.targetModel.trim(),
    targetVendorCode: catalogModelVendorCode(row.targetModel, accountVendorCode),
  }));
}

function validateModelMappingVendorScope(
  mappings: readonly AccountModelMappingRow[],
  channelType: ChannelType,
  accountVendorCode: string,
  selectedVendorCodes: readonly string[],
): void {
  const allowedVendorCodes = new Set(
    (channelType === 'official' ? [accountVendorCode] : selectedVendorCodes)
      .map((vendorCode) => providerCodeForVendor(vendorCode)),
  );
  for (const row of mappings) {
    const targetVendorCode = catalogModelVendorCode(row.targetModel, accountVendorCode);
    if (!allowedVendorCodes.has(targetVendorCode)) {
      throw new Error(`target model vendor ${targetVendorCode} is not enabled for this channel`);
    }
  }
}

function validateTargetModelVendorScope(
  models: readonly string[],
  channelType: ChannelType,
  accountVendorCode: string,
  selectedVendorCodes: readonly string[],
): void {
  const allowedVendorCodes = new Set(
    (channelType === 'official' ? [accountVendorCode] : selectedVendorCodes)
      .map((vendorCode) => providerCodeForVendor(vendorCode)),
  );
  for (const model of models) {
    const targetVendorCode = catalogModelVendorCode(model, accountVendorCode);
    if (!allowedVendorCodes.has(targetVendorCode)) {
      throw new Error(`target model vendor ${targetVendorCode} is not enabled for this channel`);
    }
  }
}

function validateMappingTargetsExist(
  mappings: readonly AccountModelMappingRow[],
  targetModels: readonly string[],
): void {
  const targetModelSet = new Set(targetModels.map((model) => model.trim().toLowerCase()));
  for (const row of mappings) {
    if (!targetModelSet.has(row.targetModel.trim().toLowerCase())) {
      throw new Error(`target model ${row.targetModel} must be selected before adding a mapping rule`);
    }
  }
}

function inferProtocolForVendor(vendor: string): string {
  const vendorCode = providerCodeForVendor(vendor);
  if (vendorCode === 'anthropic') {
    return 'Anthropic';
  }
  if (vendorCode === 'google') {
    return 'Gemini';
  }
  if (vendorCode === 'ollama') {
    return 'Ollama';
  }
  return 'OpenAI';
}

function isApiKeyAuthType(authType: string): boolean {
  return authType === 'api-key' || authType === 'openai';
}

function credentialSecretLabelKey(authType: string): string {
  switch (authType) {
    case 'claude-code':
      return 'admin.channel.fields.claudeCodeCredential';
    case 'google':
    case 'oauth-gcp':
      return 'admin.channel.fields.googleCredential';
    case 'azure':
    case 'azure-ad':
      return 'admin.channel.fields.azureCredential';
    case 'aws-bedrock':
      return 'admin.channel.fields.awsCredential';
    case 'aliyun':
      return 'admin.channel.fields.aliyunCredential';
    case 'volcengine':
      return 'admin.channel.fields.volcengineCredential';
    case 'tencent-cloud':
      return 'admin.channel.fields.tencentCloudCredential';
    default:
      return 'admin.channel.fields.apiKey';
  }
}

function credentialSecretPlaceholderKey(authType: string): string {
  switch (authType) {
    case 'claude-code':
      return 'admin.channel.placeholders.claudeCodeCredential';
    case 'google':
    case 'oauth-gcp':
      return 'admin.channel.placeholders.googleCredential';
    case 'azure':
    case 'azure-ad':
      return 'admin.channel.placeholders.azureCredential';
    case 'aws-bedrock':
      return 'admin.channel.placeholders.awsCredential';
    case 'aliyun':
      return 'admin.channel.placeholders.aliyunCredential';
    case 'volcengine':
      return 'admin.channel.placeholders.volcengineCredential';
    case 'tencent-cloud':
      return 'admin.channel.placeholders.tencentCloudCredential';
    default:
      return 'admin.channel.placeholders.apiKey';
  }
}

function credentialFieldsForAuthType(authType: string): CredentialFieldConfig[] {
  return credentialFieldSets[authType] ?? [];
}

function createEditableCredential(
  value: Partial<ChannelCredentialFormValue> | undefined,
  index: number,
): EditableChannelCredential {
  return {
    ...defaultChannelCredentialFormValue(),
    ...value,
    name: value?.name ?? (index === 0 ? 'Primary' : `Credential ${index + 1}`),
    localId: editableCredentialLocalId(index),
  };
}

function initialEditableCredentials(values: ChannelFormValues | null | undefined): EditableChannelCredential[] {
  const source = values?.credentials?.length ? values.credentials : [defaultChannelCredentialFormValue()];
  return source.map((credential, index) => createEditableCredential(credential, index));
}

function nextEditableCredential(index: number): EditableChannelCredential {
  return createEditableCredential({ name: `Credential ${index + 1}` }, index);
}

function editableCredentialLocalId(index: number): string {
  return `credential-${index}`;
}

function nextEditableCredentialIndex(credentials: readonly EditableChannelCredential[]): number {
  const usedIndexes = credentials
    .map((credential) => /^credential-(\d+)$/.exec(credential.localId)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => Number(value))
    .filter((value) => Number.isSafeInteger(value) && value >= 0);
  return usedIndexes.length > 0 ? Math.max(...usedIndexes) + 1 : credentials.length;
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function AddAccountDrawer({
  mode,
  initialValues,
  availableModels,
  aiResources,
  aiResourceGroups,
  modelCatalogLoading,
  modelCatalogError,
  aiResourcesLoading,
  aiResourcesError,
  aiResourceGroupsLoading,
  aiResourceGroupsError,
  isSaving,
  onClose,
  onSubmit,
}: {
  mode: AccountDrawerMode;
  initialValues?: ChannelFormValues | null;
  availableModels: ChannelModelCatalogItem[];
  aiResources: AiResource[];
  aiResourceGroups: AiResourceGroup[];
  modelCatalogLoading: boolean;
  modelCatalogError: string | null;
  aiResourcesLoading: boolean;
  aiResourcesError: string | null;
  aiResourceGroupsLoading: boolean;
  aiResourceGroupsError: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (channel: ChannelFormValues) => Promise<void>;
}) {
  const { t } = useTranslation();
  const initialResourceCodes = initialValues?.resourceCodes?.map(normalizeAiResourceCode).filter(Boolean) ?? [];
  const initialResourceAssociationCodes = splitResourceAssociationCodes(initialResourceCodes, aiResourceGroups);
  const [channelType, setChannelType] = useState<ChannelType>(resolveChannelType(initialValues?.channelType));
  const [activeAuthType, setActiveAuthType] = useState(resolveAuthTypeFormValue(initialValues?.accessType, authTypesList));
  const [modelVendor, setModelVendor] = useState(resolveChannelSelectFormValue(initialValues?.vendor, knownModelVendors, 'OpenAI'));
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [resourceGroupSelectorOpen, setResourceGroupSelectorOpen] = useState(false);
  const [resourceSelectorOpen, setResourceSelectorOpen] = useState(false);
  const [targetModelSelectorOpen, setTargetModelSelectorOpen] = useState(false);
  const [mappingRuleModalOpen, setMappingRuleModalOpen] = useState(false);
  const [editingMappingRule, setEditingMappingRule] = useState<AccountModelMappingRow | null>(null);
  const [activeAccountDrawerTab, setActiveAccountDrawerTab] = useState<AccountDrawerContentTab>('models');
  const [activeModelRouteTab, setActiveModelRouteTab] = useState<ModelRouteTab>('targetModels');
  const [activeResourceAssociationTab, setActiveResourceAssociationTab] = useState<ResourceAssociationTab>('groups');
  const [selectedResourceCodes, setSelectedResourceCodes] = useState<string[]>(
    initialResourceAssociationCodes.resourceCodes,
  );
  const [selectedResourceGroupCodes, setSelectedResourceGroupCodes] = useState<string[]>(
    initialResourceAssociationCodes.resourceGroupCodes,
  );
  const [selectedVendorCodes, setSelectedVendorCodes] = useState<string[]>(() => deriveChannelTargetVendorCodes({
    channelType: initialValues?.channelType,
    accountVendor: resolveChannelSelectFormValue(initialValues?.vendor, knownModelVendors, 'OpenAI'),
    modelMappings: initialValues?.modelMappings ?? [],
    resourceCodes: initialValues?.resourceCodes ?? [],
  }));
  const [capabilities, setCapabilities] = useState<string[]>(
    initialValues?.capabilities?.length ? initialValues.capabilities : ['llm'],
  );
  const [targetModelsByVendor, setTargetModelsByVendor] = useState<ChannelTargetModelsByVendor>(() => {
    const initialAccountVendor = resolveChannelSelectFormValue(initialValues?.vendor, knownModelVendors, 'OpenAI');
    const initialVendorCodes = deriveChannelTargetVendorCodes({
      channelType: initialValues?.channelType,
      accountVendor: initialAccountVendor,
      modelMappings: initialValues?.modelMappings ?? [],
      resourceCodes: initialValues?.resourceCodes ?? [],
    });
    const initialAccountVendorCode = providerCodeForVendor(initialAccountVendor);
    return mergeTargetModelsFromMappingInputs(
      ensureTargetModelVendors({}, initialVendorCodes),
      initialValues?.modelMappings ?? [],
      initialAccountVendorCode,
    );
  });
  const [modelMappingsByVendor, setModelMappingsByVendor] = useState<AccountModelMappingsByVendor>(() => {
    const initialAccountVendor = resolveChannelSelectFormValue(initialValues?.vendor, knownModelVendors, 'OpenAI');
    const initialVendorCodes = deriveChannelTargetVendorCodes({
      channelType: initialValues?.channelType,
      accountVendor: initialAccountVendor,
      modelMappings: initialValues?.modelMappings ?? [],
      resourceCodes: initialValues?.resourceCodes ?? [],
    });
    const initialAccountVendorCode = providerCodeForVendor(initialAccountVendor);
    return initialValues?.modelMappings?.length
      ? buildModelMappingsByVendorFromInputs(
        initialValues.modelMappings,
        initialVendorCodes,
        initialAccountVendorCode,
      )
      : ensureModelMappingVendors({}, initialVendorCodes);
  });
  const [credentialRotation, setCredentialRotation] = useState(initialValues?.credentialRotation ?? 'default');
  const [credentials, setCredentials] = useState<EditableChannelCredential[]>(() => initialEditableCredentials(initialValues));
  const [activeCredentialId, setActiveCredentialId] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  const accountVendorCode = providerCodeForVendor(modelVendor);
  const availableResourceCodes = useMemo(
    () => [
      ...aiResources
      .filter((resource) => resource.status === 'active')
      .map((resource) => normalizeAiResourceCode(resource.resourceCode)),
      ...aiResourceGroups
        .filter((group) => group.status === 'active')
        .map((group) => normalizeAiResourceCode(group.groupCode)),
    ],
    [aiResourceGroups, aiResources],
  );
  const selectedDirectResourceCodes = useMemo(
    () => selectedResourceCodes.filter((resourceCode) => {
      const resource = findAiResourceByCode(aiResources, resourceCode);
      return resource
        ? isAiResourceVisibleForChannelVendorScope(resource, selectedVendorCodes, capabilities)
        : false;
    }),
    [aiResources, capabilities, selectedResourceCodes, selectedVendorCodes],
  );
  const visibleAiResources = useMemo(
    () => aiResources
      .filter((resource) => resource.status === 'active')
      .filter((resource) => isAiResourceVisibleForChannelVendorScope(resource, selectedVendorCodes, capabilities))
      .sort(compareChannelBindableAiResources),
    [aiResources, capabilities, selectedVendorCodes],
  );
  const visibleAiResourceGroups = useMemo(
    () => aiResourceGroups
      .filter((group) => group.status === 'active')
      .filter((group) => isAiResourceGroupVisibleForChannelVendorScope(group, selectedVendorCodes, capabilities))
      .sort((left, right) => {
        const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return leftOrder === rightOrder ? left.groupCode.localeCompare(right.groupCode) : leftOrder - rightOrder;
      }),
    [aiResourceGroups, capabilities, selectedVendorCodes],
  );
  const selectedVisibleResourceGroupCodes = useMemo(() => {
    const visibleGroupCodes = new Set(visibleAiResourceGroups.map((group) => normalizeAiResourceCode(group.groupCode)));
    return selectedResourceGroupCodes.filter((groupCode) => visibleGroupCodes.has(normalizeAiResourceCode(groupCode)));
  }, [selectedResourceGroupCodes, visibleAiResourceGroups]);
  const mappingRuleRows = useMemo(
    () => flattenModelMappings(modelMappingsByVendor),
    [modelMappingsByVendor],
  );
  const targetModelRows = useMemo(
    () => targetModelRowsFromVendorMap(targetModelsByVendor),
    [targetModelsByVendor],
  );
  const submittedModelCount = targetModelRows.length;
  const mappingRuleCount = mappingRuleRows.length;
  const availableTargetModels = useMemo(
    () => availableModels.filter((model) => selectedVendorCodes.includes(providerCodeForVendor(model.vendorCode))),
    [availableModels, selectedVendorCodes],
  );
  const selectedResourceAssociationCount = selectedVisibleResourceGroupCodes.length + selectedDirectResourceCodes.length;
  const selectedVendorSummaries = useMemo(
    () => vendorSummariesForCodes(selectedVendorCodes, t),
    [selectedVendorCodes, t],
  );
  const resourceSelectorOptions = useMemo(() => visibleAiResources.map((resource) => ({
    id: resource.id,
    resourceCode: normalizeAiResourceCode(resource.resourceCode),
    displayName: resource.displayName,
    resourceType: displayAiResourceCategory(resource, t),
    vendorCode: resource.vendorCode ?? null,
    modalityCode: resource.modalityCode ?? null,
    apiEndpointCode: resource.apiEndpointCode ?? null,
    catalogKey: resource.catalogKey ?? null,
    model: resource.model ?? null,
    providerNativeModel: resource.providerNativeModel ?? null,
    capability: resource.capability ?? null,
    capabilities: channelAiResourceCapabilityCodes(resource),
    status: resource.status,
  })), [t, visibleAiResources]);
  const activeCredential = useMemo(
    () => credentials.find((credential) => credential.localId === activeCredentialId) ?? credentials[0],
    [activeCredentialId, credentials],
  );
  const activeCredentialIndex = activeCredential
    ? credentials.findIndex((credential) => credential.localId === activeCredential.localId)
    : -1;
  const activeCredentialNumber = activeCredentialIndex >= 0 ? activeCredentialIndex + 1 : 1;

  useEffect(() => {
    setTargetModelsByVendor((current) => ensureTargetModelVendors(current, selectedVendorCodes));
    setModelMappingsByVendor((current) => ensureModelMappingVendors(current, selectedVendorCodes));
  }, [selectedVendorCodes]);

  useEffect(() => {
    const reconciled = reconcileChannelVendorSelection({
      channelType,
      accountVendor: modelVendor,
      selectedVendorCodes,
      selectedResourceCodes: [...selectedResourceGroupCodes, ...selectedResourceCodes],
      availableResourceCodes,
    });
    if (!areStringArraysEqual(selectedVendorCodes, reconciled.selectedVendorCodes)) {
      setSelectedVendorCodes(reconciled.selectedVendorCodes);
    }
    const nextAssociationCodes = splitResourceAssociationCodes(reconciled.selectedResourceCodes, aiResourceGroups);
    if (!areStringArraysEqual(selectedResourceGroupCodes, nextAssociationCodes.resourceGroupCodes)) {
      setSelectedResourceGroupCodes(nextAssociationCodes.resourceGroupCodes);
    }
    if (!areStringArraysEqual(selectedResourceCodes, nextAssociationCodes.resourceCodes)) {
      setSelectedResourceCodes(nextAssociationCodes.resourceCodes);
    }
  }, [aiResourceGroups, availableResourceCodes, channelType, modelVendor, selectedResourceCodes, selectedResourceGroupCodes, selectedVendorCodes]);

  useEffect(() => {
    if (!credentials.some((credential) => credential.localId === activeCredentialId)) {
      setActiveCredentialId(credentials[0]?.localId ?? '');
    }
  }, [activeCredentialId, credentials]);

  const toggleCapability = (capability: string) => {
    setCapabilities((current) => {
      const next = current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability];
      return next.length > 0 ? next : ['llm'];
    });
  };

  const setAccountVendor = (vendor: string) => {
    setModelVendor(vendor);
    if (channelType === 'official') {
      setSelectedVendorCodes([providerCodeForVendor(vendor)]);
    }
  };

  const setAccountType = (nextChannelType: ChannelType) => {
    setChannelType(nextChannelType);
    if (nextChannelType === 'official') {
      setSelectedVendorCodes([accountVendorCode]);
    }
  };

  const toggleTargetVendor = (vendorCode: string) => {
    const normalizedVendorCode = providerCodeForVendor(vendorCode);
    if (channelType === 'official') {
      setAccountVendor(modelVendorIdForCode(normalizedVendorCode));
      setSelectedVendorCodes([normalizedVendorCode]);
      return;
    }
    setSelectedVendorCodes((current) => {
      const next = current.includes(normalizedVendorCode)
        ? current.filter((code) => code !== normalizedVendorCode)
        : [...current, normalizedVendorCode];
      return next.length > 0 ? next : [accountVendorCode];
    });
  };

  const removeAiResource = (resourceCode: string) => {
    const normalizedCode = normalizeAiResourceCode(resourceCode);
    setSelectedResourceCodes((current) => current.filter((code) => code !== normalizedCode));
  };

  const removeAiResourceGroup = (groupCode: string) => {
    const normalizedCode = normalizeAiResourceCode(groupCode);
    setSelectedResourceGroupCodes((current) => current.filter((code) => code !== normalizedCode));
  };

  const clearAiResources = () => {
    const reconciled = reconcileChannelVendorSelection({
      channelType,
      accountVendor: modelVendor,
      selectedVendorCodes,
      selectedResourceCodes: selectedResourceCodes.filter((code) => code.startsWith('vendor.')),
      availableResourceCodes,
    });
    setSelectedResourceGroupCodes([]);
    setSelectedResourceCodes(splitResourceAssociationCodes(reconciled.selectedResourceCodes, aiResourceGroups).resourceCodes);
  };

  const updateCredential = (
    localId: string,
    patch: Partial<Omit<EditableChannelCredential, 'localId'>>,
  ) => {
    setCredentials((current) => current.map((credential) => (
      credential.localId === localId ? { ...credential, ...patch } : credential
    )));
  };

  const updateCredentialField = (localId: string, field: string, value: string) => {
    setCredentials((current) => current.map((credential) => (
      credential.localId === localId
        ? {
          ...credential,
          credentialFields: {
            ...(credential.credentialFields ?? {}),
            [field]: value,
          },
        }
        : credential
    )));
  };

  const addCredential = () => {
    const nextCredential = nextEditableCredential(nextEditableCredentialIndex(credentials));
    setCredentials((current) => [...current, nextCredential]);
    setActiveCredentialId(nextCredential.localId);
  };

  const removeCredential = (localId: string) => {
    if (credentials.length <= 1) {
      return;
    }
    const credentialIndex = credentials.findIndex((credential) => credential.localId === localId);
    if (credentialIndex < 0) {
      return;
    }
    const nextCredentials = credentials.filter((credential) => credential.localId !== localId);
    setCredentials(nextCredentials);
    if ((activeCredential?.localId ?? activeCredentialId) === localId) {
      const nextActiveCredential = nextCredentials[
        Math.min(Math.max(credentialIndex, 0), nextCredentials.length - 1)
      ] ?? nextCredentials[0];
      setActiveCredentialId(nextActiveCredential?.localId ?? '');
    }
  };

  const addTargetModel = (model: ChannelModelCatalogItem) => {
    const vendorCode = providerCodeForVendor(model.vendorCode);
    setTargetModelsByVendor((current) => {
      const models = current[vendorCode] ?? [];
      if (models.includes(model.catalogKey)) {
        return current;
      }
      return {
        ...current,
        [vendorCode]: [...models, model.catalogKey],
      };
    });
  };

  const removeTargetModel = (targetModel: string) => {
    const targetVendorCode = catalogModelVendorCode(targetModel, accountVendorCode);
    setTargetModelsByVendor((current) => ({
      ...current,
      [targetVendorCode]: (current[targetVendorCode] ?? []).filter((model) => model !== targetModel),
    }));
    setModelMappingsByVendor((current) => ({
      ...current,
      [targetVendorCode]: (current[targetVendorCode] ?? []).filter((row) => row.targetModel !== targetModel),
    }));
  };

  const upsertModelMappingRule = (sourceModel: string, targetModel: string, existingRowId?: string) => {
    const normalizedSourceModel = sourceModel.trim();
    const normalizedTargetModel = targetModel.trim();
    if (!normalizedSourceModel || !normalizedTargetModel) {
      return;
    }
    const targetVendorCode = catalogModelVendorCode(normalizedTargetModel, accountVendorCode);
    setModelMappingsByVendor((current) => {
      const rows = current[targetVendorCode] ?? [];
      const nextRows = rows.filter((row) => row.id !== existingRowId);
      if (nextRows.some((row) => row.sourceModel === normalizedSourceModel && row.targetModel === normalizedTargetModel)) {
        return current;
      }
      return {
        ...current,
        [targetVendorCode]: [
          ...nextRows,
          {
            id: stableModelMappingRowId(targetVendorCode, normalizedSourceModel, normalizedTargetModel, true),
            sourceModel: normalizedSourceModel,
            targetModel: normalizedTargetModel,
            custom: true,
          },
        ],
      };
    });
  };

  const removeModelMappingRule = (row: AccountModelMappingRow) => {
    const targetVendorCode = catalogModelVendorCode(row.targetModel, accountVendorCode);
    setModelMappingsByVendor((current) => ({
      ...current,
      [targetVendorCode]: (current[targetVendorCode] ?? []).filter((item) => item.id !== row.id),
    }));
  };

  const openCreateMappingRuleModal = () => {
    setEditingMappingRule(null);
    setMappingRuleModalOpen(true);
  };

  const openEditMappingRuleModal = (row: AccountModelMappingRow) => {
    setEditingMappingRule(row);
    setMappingRuleModalOpen(true);
  };

  const generateSameNameMappings = () => {
    setModelMappingsByVendor((current) => {
      const next: AccountModelMappingsByVendor = { ...current };
      for (const row of targetModelRows) {
        const targetVendorCode = catalogModelVendorCode(row.targetModel, accountVendorCode);
        const sourceModel = catalogModelRuntimeId(row.targetModel);
        const rows = next[targetVendorCode] ?? [];
        if (rows.some((item) => item.sourceModel === sourceModel && item.targetModel === row.targetModel)) {
          continue;
        }
        next[targetVendorCode] = [
          ...rows,
          {
            id: stableModelMappingRowId(targetVendorCode, sourceModel, row.targetModel, false),
            sourceModel,
            targetModel: row.targetModel,
            custom: false,
          },
        ];
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const expiresAt = String(formData.get('expiresAt') ?? '').trim();
    const modelMappingRows = flattenModelMappings(modelMappingsByVendor);
    const models = flattenTargetModels(targetModelsByVendor);

    if (!name) {
      setLocalError(t('admin.channel.validation.channelNameRequired'));
      return;
    }
    try {
      validateTargetModelVendorScope(models, channelType, accountVendorCode, selectedVendorCodes);
      validateModelMappingVendorScope(modelMappingRows, channelType, accountVendorCode, selectedVendorCodes);
      validateMappingTargetsExist(modelMappingRows, models);
      const weight = readPositiveIntegerFormValue(formData, 'weight', {
        required: t('admin.channel.validation.weightRequired'),
        positiveInteger: t('admin.channel.validation.weightPositiveInteger'),
      });
      const circuitBreakerEnabled = formData.get('circuitBreakerEnabled') === 'on';
      await onSubmit({
        name,
        vendor: modelVendor,
        channelType,
        protocol: inferProtocolForVendor(modelVendor),
        accessType: resolveAuthTypeSubmitValue(activeAuthType, authTypesList),
        credentialRotation,
        credentials,
        expiresAt,
        capabilities,
        resourceCodes: [...selectedVisibleResourceGroupCodes, ...selectedDirectResourceCodes],
        modelMappings: accountModelMappingInputs(modelMappingRows, accountVendorCode),
        circuitBreakerEnabled,
        circuitBreakerFailureThreshold: String(formData.get('circuitBreakerFailureThreshold') ?? '').trim(),
        weight,
        status: initialValues?.status ?? 'active',
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('admin.channel.errors.channelSaveFailed'));
    }
  };

  const activeCredentialFields = credentialFieldsForAuthType(activeAuthType);
  const activeSecretLabel = t(credentialSecretLabelKey(activeAuthType));
  const activeSecretPlaceholder = t(credentialSecretPlaceholderKey(activeAuthType));

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/50 backdrop-blur-sm" data-admin-channel-account-drawer>
      <div className="absolute inset-0" onClick={isSaving ? undefined : onClose} />
      <div className="relative flex h-full w-[80vw] max-w-[80vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a] z-10">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121212] shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" />
            {isEdit
              ? t('admin.channel.modals.editChannelTitle')
              : mode === 'copy'
                ? t('admin.channel.modals.copyChannelTitle')
                : t('admin.channel.modals.addChannelTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
          {selectedResourceGroupCodes.map((code) => (
            <input key={`resource-group-code-${code}`} type="hidden" name="resourceGroupCodes" value={code} />
          ))}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-w-0 w-[40%] max-w-[40%] shrink-0 space-y-3 overflow-y-auto border-r border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#121212] custom-scrollbar" data-admin-channel-account-left-form>
              {localError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  {localError}
                </div>
              )}

              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-black" data-admin-channel-left-section="identity">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/10" data-admin-channel-left-section-title>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      <Server className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">{t('admin.channel.credentials.channelTitle')}</span>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-400">{accountVendorCode}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">{t('admin.channel.fields.channelName')}</label>
                    <input
                      required
                      name="name"
                      type="text"
                      defaultValue={initialValues?.name ?? ''}
                      placeholder={t('admin.channel.placeholders.channelName')}
                      className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="block text-sm text-slate-700 dark:text-slate-300 font-medium">{t('admin.channel.fields.channelType')}</label>
                  <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-black" data-admin-channel-account-type-segmented>
                    {channelTypeOptions.map((option) => {
                      const isSelected = channelType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAccountType(option.id)}
                          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              isSelected ? 'border-white/70 bg-white/20' : 'border-slate-300 dark:border-slate-500'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="truncate">{t(option.titleKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    data-admin-channel-account-type-vendor-picker
                    onClick={() => setVendorPickerOpen(true)}
                    className="flex w-full flex-col items-stretch gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span data-admin-channel-account-type-vendor-summary className="flex min-w-0 items-center gap-2 text-xs">
                        <Server className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
                        <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">{t('admin.channel.vendorPicker.currentVendor')}</span>
                        <span className="truncate font-semibold text-slate-950 dark:text-white">{modelVendor}</span>
                        <span className="truncate font-mono text-indigo-500 dark:text-indigo-300">{accountVendorCode}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                        <Plus className="h-3.5 w-3.5" />
                        {t('admin.channel.vendorPicker.choose')}
                      </span>
                    </span>
                    <span data-admin-channel-target-vendor-summary className="flex min-w-0 flex-col gap-1 rounded-md border border-indigo-100 bg-white/80 px-2 py-1.5 dark:border-indigo-500/20 dark:bg-black/20">
                      <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-200">
                        {t('admin.channel.vendorPicker.selectedCount', { count: selectedVendorCodes.length })}
                      </span>
                      <span className="flex min-w-0 flex-wrap gap-1.5">
                        {selectedVendorSummaries.map((vendor) => (
                          <span key={vendor.code} className="inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                            <span className="truncate">{vendor.name}</span>
                            <span className="truncate font-mono text-indigo-500 dark:text-indigo-300">{vendor.code}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-black" data-admin-channel-left-section="credentials">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/10" data-admin-channel-left-section-title>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Key className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">{t('admin.channel.credentials.editorTitle')}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {t('admin.channel.credentials.count', { count: credentials.length })}
                    </span>
                    <button
                      type="button"
                      onClick={addCredential}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('admin.channel.credentials.addCredential')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-admin-channel-credential-controls>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{t('admin.channel.fields.credentialMode')}</label>
                    <select
                      data-admin-channel-credential-mode-select
                      value={activeAuthType}
                      onChange={(event) => setActiveAuthType(event.currentTarget.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                    >
                      {authTypesList.map((type) => (
                        <option key={type.id} value={type.id}>{t(type.titleKey)}</option>
                      ))}
                      {!authTypesList.some((type) => type.id === activeAuthType) && (
                        <option key={activeAuthType} value={activeAuthType}>{activeAuthType}</option>
                      )}
                    </select>
                    {!authTypesList.some((type) => type.id === activeAuthType) && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        <Key className="h-4 w-4" />
                        <span className="font-semibold">{t('admin.channel.actions.customBackendAuthType')}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{t('admin.channel.fields.credentialRotation')}</label>
                    <select
                      data-admin-channel-credential-rotation
                      value={credentialRotation}
                      onChange={(event) => setCredentialRotation(event.currentTarget.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                    >
                      {credentialRotationOptions.map((option) => (
                        <option key={option.id} value={option.id}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </div>

              <div className="mt-3 space-y-3" data-admin-channel-credentials-editor>
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1" data-admin-channel-credential-tabs>
                  {credentials.map((credential, index) => {
                    const isActive = activeCredential?.localId === credential.localId;
                    return (
                      <div
                        key={credential.localId}
                        className={`flex min-w-[10rem] max-w-[13rem] items-stretch overflow-hidden rounded-lg border transition-colors ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 dark:bg-emerald-500/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black dark:hover:border-white/20'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveCredentialId(credential.localId)}
                          className="min-w-0 flex-1 px-3 py-2 text-left"
                        >
                          <span className={`flex items-center gap-1.5 truncate text-xs font-semibold ${isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            <Key className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{credential.name?.trim() || t('admin.channel.credentials.rowTitle', { index: index + 1 })}</span>
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                            {credential.baseUrl || t('admin.channel.credentials.baseUrlPending')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCredential(credential.localId)}
                          disabled={credentials.length <= 1}
                          className="shrink-0 border-l border-slate-200 px-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:border-white/10 dark:hover:bg-red-500/10"
                          title={t('admin.channel.credentials.removeCredential')}
                          aria-label={t('admin.channel.credentials.removeCredential')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {activeCredential && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black" data-admin-channel-active-credential-form>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Key className="h-4 w-4 text-emerald-500" />
                          {t('admin.channel.credentials.rowTitle', { index: activeCredentialNumber })}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                          {activeCredential.baseUrl || t('admin.channel.credentials.baseUrlPending')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCredential(activeCredential.localId)}
                        disabled={credentials.length <= 1}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-red-500/10"
                        title={t('admin.channel.credentials.removeCredential')}
                        aria-label={t('admin.channel.credentials.removeCredential')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.channel.fields.baseUrl')}</label>
                        <input
                          type="url"
                          value={activeCredential.baseUrl}
                          onChange={(event) => updateCredential(activeCredential.localId, { baseUrl: event.currentTarget.value })}
                          placeholder="https://api.openai.com/v1"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                        />
                      </div>
                      {isApiKeyAuthType(activeAuthType) ? (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{activeSecretLabel}</label>
                          <div className="relative" data-admin-channel-api-key-input-shell>
                            <input
                              type={apiKeyVisible ? 'text' : 'password'}
                              value={activeCredential.apiKey ?? ''}
                              onChange={(event) => updateCredential(activeCredential.localId, { apiKey: event.currentTarget.value, credentialFields: undefined })}
                              autoComplete="off"
                              placeholder={activeSecretPlaceholder}
                              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 font-mono text-xs text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                            />
                            <button
                              type="button"
                              data-admin-channel-api-key-visibility-toggle
                              onClick={() => setApiKeyVisible((current) => !current)}
                              className="pointer-events-auto absolute inset-y-0 right-2 flex items-center rounded-md px-1.5 text-slate-400 transition-colors hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-slate-500 dark:hover:text-emerald-300"
                              title={apiKeyVisible ? t('admin.channel.actions.hideApiKey') : t('admin.channel.actions.showApiKey')}
                              aria-label={apiKeyVisible ? t('admin.channel.actions.hideApiKey') : t('admin.channel.actions.showApiKey')}
                            >
                              {apiKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                          {activeCredentialFields.map((field) => (
                            <div key={field.name} className={field.textarea ? 'sm:col-span-2' : undefined}>
                              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t(field.labelKey)}</label>
                              {field.textarea ? (
                                <textarea
                                  value={activeCredential.credentialFields?.[field.name] ?? ''}
                                  onChange={(event) => updateCredentialField(activeCredential.localId, field.name, event.currentTarget.value)}
                                  autoComplete="off"
                                  rows={4}
                                  placeholder={t(field.placeholderKey)}
                                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                                />
                              ) : (
                                <input
                                  type={field.secret && !apiKeyVisible ? 'password' : 'text'}
                                  value={activeCredential.credentialFields?.[field.name] ?? ''}
                                  onChange={(event) => updateCredentialField(activeCredential.localId, field.name, event.currentTarget.value)}
                                  autoComplete="off"
                                  placeholder={t(field.placeholderKey)}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.channel.credentials.priority')}</label>
                        <input
                          type="number"
                          min="1"
                          max="1000000"
                          value={activeCredential.priority ?? ''}
                          onChange={(event) => updateCredential(activeCredential.localId, { priority: event.currentTarget.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.channel.credentials.weight')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={activeCredential.weight ?? ''}
                          onChange={(event) => updateCredential(activeCredential.localId, { weight: event.currentTarget.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-black" data-admin-channel-left-section="policy">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/10" data-admin-channel-left-section-title>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <Network className="h-3.5 w-3.5" />
                    </span>
                  <span className="min-w-0 truncate text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">{t('admin.channel.fields.routing')}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">{t('admin.channel.fields.trafficWeight')}</label>
                  <input
                    required
                    name="weight"
                    type="number"
                    min="1"
                    max="10000"
                    defaultValue={initialValues?.weight ?? 100}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">{t('admin.channel.fields.expiresAt')}</label>
                  <input
                    name="expiresAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(initialValues?.expiresAt)}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.channel.help.expiresAt')}</p>
                </div>
              </div>

              <div
                className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-[#121212] sm:flex-row sm:items-center"
                data-admin-channel-circuit-breaker-compact
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input
                    name="circuitBreakerEnabled"
                    type="checkbox"
                    defaultChecked={Boolean(initialValues?.circuitBreakerEnabled)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('admin.channel.fields.circuitBreaker')}
                </label>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t('admin.channel.fields.failureThreshold')}</label>
                  <input
                    name="circuitBreakerFailureThreshold"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={initialValues?.circuitBreakerFailureThreshold ?? 3}
                    className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
                  />
                </div>
              </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-black" data-admin-channel-left-section="capabilities">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/10" data-admin-channel-left-section-title>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      <Cpu className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">{t('admin.channel.fields.capabilities')}</span>
                  </div>
                  <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{capabilities.length}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  {capabilityOptions.map((capability) => {
                    const isChecked = capabilities.includes(capability.id);
                    return (
                      <button
                        type="button"
                        key={capability.id}
                        onClick={() => toggleCapability(capability.id)}
                        className={`flex justify-center items-center gap-1.5 p-1.5 rounded-lg border text-xs transition-all ${
                          isChecked
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        {capability.icon}
                        <span className="whitespace-nowrap">{t(capability.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="min-w-0 flex flex-1 overflow-hidden bg-slate-50 px-6 py-4 dark:bg-transparent" data-admin-channel-right-panel>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-black" data-admin-channel-right-shell>
                <div data-admin-channel-right-tabs className="flex shrink-0 items-end gap-1 border-b border-slate-200 bg-white px-4 pt-3 text-xs font-semibold dark:border-white/10 dark:bg-black">
                  {([
                    ['models', t('admin.channel.drawerTabs.models'), submittedModelCount],
                    ['resources', t('admin.channel.drawerTabs.resources'), selectedResourceAssociationCount],
                  ] as Array<[AccountDrawerContentTab, string, number]>).map(([tab, label, count]) => {
                    const isActive = activeAccountDrawerTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveAccountDrawerTab(tab)}
                        className={`inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 transition-colors ${
                          isActive
                            ? '-mb-px border-slate-200 bg-white text-emerald-700 dark:border-white/10 dark:bg-black dark:text-emerald-300'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {label}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div data-admin-channel-right-content className="min-h-0 flex-1 overflow-hidden bg-white dark:bg-black p-4">
              {activeAccountDrawerTab === 'models' && (
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden" data-admin-channel-model-routing-card>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/10">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.channel.models.routingTitle')}</h4>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>{t('admin.channel.models.selectedTargetCount', { count: submittedModelCount })}</span>
                        <span>{t('admin.channel.models.mappingCount', { count: mappingRuleCount })}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {activeModelRouteTab === 'targetModels' ? (
                        <button
                          type="button"
                          data-admin-channel-select-target-model
                          onClick={() => setTargetModelSelectorOpen(true)}
                          disabled={selectedVendorCodes.length === 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('admin.channel.models.selectTargetModel')}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-admin-channel-generate-same-name-mappings
                            onClick={generateSameNameMappings}
                            disabled={targetModelRows.length === 0}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#121212] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                          >
                            {t('admin.channel.models.generateSameNameMappings')}
                          </button>
                          <button
                            type="button"
                            data-admin-channel-add-mapping-rule
                            onClick={openCreateMappingRuleModal}
                            disabled={targetModelRows.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t('admin.channel.models.addMappingRule')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-end gap-1 border-b border-slate-200 pt-3 text-xs font-semibold dark:border-white/10" data-admin-channel-model-route-tabs>
                    {([
                      ['targetModels', t('admin.channel.models.targetModelsTab'), submittedModelCount],
                      ['mappingRules', t('admin.channel.models.mappingRulesTab'), mappingRuleCount],
                    ] as Array<[ModelRouteTab, string, number]>).map(([tab, label, count]) => {
                      const isActive = activeModelRouteTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          data-admin-channel-target-models-tab={tab === 'targetModels' ? true : undefined}
                          data-admin-channel-mapping-rules-tab={tab === 'mappingRules' ? true : undefined}
                          onClick={() => setActiveModelRouteTab(tab)}
                          className={`inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 transition-colors ${
                            isActive
                              ? '-mb-px border-slate-200 bg-white text-emerald-700 dark:border-white/10 dark:bg-black dark:text-emerald-300'
                              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {label}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden border-x border-b border-slate-200 dark:border-white/10">
                    {modelCatalogLoading ? (
                      <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('admin.channel.models.loading')}
                      </div>
                    ) : modelCatalogError ? (
                      <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-amber-700 dark:text-amber-300">{modelCatalogError}</div>
                    ) : activeModelRouteTab === 'targetModels' ? (
                      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full min-w-[680px] text-left text-xs text-slate-600 dark:text-slate-400" data-admin-channel-target-models-table>
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                            <tr>
                              <th className="px-4 py-3">{t('admin.channel.models.targetModel')}</th>
                              <th className="w-36 px-4 py-3">{t('admin.channel.models.vendor')}</th>
                              <th className="w-28 px-4 py-3">{t('admin.channel.models.runtimeModel')}</th>
                              <th className="w-20 px-4 py-3 text-right">{t('admin.channel.models.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {targetModelRows.map((row) => {
                              const vendorCode = catalogModelVendorCode(row.targetModel, accountVendorCode);
                              const catalogModel = availableModels.find((model) => model.catalogKey === row.targetModel);
                              return (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                  <td className="px-4 py-3">
                                    <div className="truncate font-medium text-slate-900 dark:text-white">{catalogModel?.displayName ?? catalogModelRuntimeId(row.targetModel)}</div>
                                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.targetModel}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">{vendorCode}</span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{catalogModelRuntimeId(row.targetModel)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeTargetModel(row.targetModel)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                      aria-label={t('common.actions.delete')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {targetModelRows.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                  {t('admin.channel.models.emptyTargetModels')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full min-w-[760px] text-left text-xs text-slate-600 dark:text-slate-400" data-admin-channel-mapping-rules-table>
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                            <tr>
                              <th className="px-4 py-3">{t('admin.channel.models.requestModel')}</th>
                              <th className="w-10 px-2 py-3"></th>
                              <th className="px-4 py-3">{t('admin.channel.models.actualTargetModel')}</th>
                              <th className="w-32 px-4 py-3">{t('admin.channel.models.vendor')}</th>
                              <th className="w-24 px-4 py-3 text-right">{t('admin.channel.models.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {mappingRuleRows.map((row) => {
                              const vendorCode = catalogModelVendorCode(row.targetModel, accountVendorCode);
                              return (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                  <td className="px-4 py-3 font-mono text-[11px] text-slate-900 dark:text-white">{row.sourceModel}</td>
                                  <td className="px-2 py-3 text-slate-400"><ChevronRight className="h-4 w-4" /></td>
                                  <td className="px-4 py-3">
                                    <div className="truncate font-mono text-[11px] text-slate-900 dark:text-white">{row.targetModel}</div>
                                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{catalogModelRuntimeId(row.targetModel)}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">{vendorCode}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openEditMappingRuleModal(row)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                                        aria-label={t('common.actions.edit')}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeModelMappingRule(row)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                        aria-label={t('common.actions.delete')}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {mappingRuleRows.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                  {t('admin.channel.models.emptyMappingRules')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeAccountDrawerTab === 'resources' && (
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden" data-admin-channel-resource-association-card>
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/10">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.channel.resourceAssociations.title')}</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.channel.help.aiResources')}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setResourceGroupSelectorOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-[#121212] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                      >
                        <Boxes className="h-3.5 w-3.5" />
                        {t('admin.channel.aiResourceGroups.actions.add')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResourceSelectorOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-[#121212] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                      >
                        <Network className="h-3.5 w-3.5" />
                        {t('admin.channel.aiResources.actions.addResource')}
                      </button>
                      <button
                        type="button"
                        onClick={clearAiResources}
                        disabled={selectedResourceAssociationCount === 0}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
                      >
                        {t('common.actions.clearAll')}
                      </button>
                    </div>
                  </div>
                  {(aiResourcesLoading || aiResourceGroupsLoading) ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('admin.channel.aiResources.loading')}
                    </div>
                  ) : (aiResourcesError || aiResourceGroupsError) ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      {aiResourceGroupsError ?? aiResourcesError}
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4" data-admin-channel-resource-association-body>
                      <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold dark:border-white/10 dark:bg-[#121212]" data-admin-channel-resource-tabs>
                        <button
                          type="button"
                          data-admin-channel-resource-group-list-tab
                          onClick={() => setActiveResourceAssociationTab('groups')}
                          className={`rounded-md px-3 py-1.5 transition-colors ${
                            activeResourceAssociationTab === 'groups'
                              ? 'bg-white text-emerald-700 shadow-sm dark:bg-black dark:text-emerald-300'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {t('admin.channel.resourceAssociations.tabs.groups', { count: selectedVisibleResourceGroupCodes.length })}
                        </button>
                        <button
                          type="button"
                          data-admin-channel-resource-list-tab
                          onClick={() => setActiveResourceAssociationTab('resources')}
                          className={`rounded-md px-3 py-1.5 transition-colors ${
                            activeResourceAssociationTab === 'resources'
                              ? 'bg-white text-emerald-700 shadow-sm dark:bg-black dark:text-emerald-300'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {t('admin.channel.resourceAssociations.tabs.resources', { count: selectedDirectResourceCodes.length })}
                        </button>
                      </div>

                      {activeResourceAssociationTab === 'groups' && (
                        <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1 custom-scrollbar" data-admin-channel-selected-resource-groups-list>
                          {selectedVisibleResourceGroupCodes.map((groupCode) => {
                            const group = findAiResourceGroupByCode(aiResourceGroups, groupCode);
                            return (
                              <div key={groupCode} className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{group?.groupName ?? groupCode}</span>
                                    <span className="mt-1 block truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{group?.groupCode ?? groupCode}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAiResourceGroup(groupCode)}
                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-500 dark:hover:bg-white/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                {group && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">{t('admin.channel.aiResourceGroups.title')}</span>
                                    <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">{t('admin.channel.aiResourceGroups.resourceCount', { count: group.resourceCount })}</span>
                                    <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-400">{group.selectionMode}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {selectedVisibleResourceGroupCodes.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                              {t('admin.channel.aiResources.noneSelected')}
                            </div>
                          )}
                        </div>
                      )}

                      {activeResourceAssociationTab === 'resources' && (
                        <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1 custom-scrollbar" data-admin-channel-selected-resources-list>
                          {selectedDirectResourceCodes.map((resourceCode) => {
                            const resource = findAiResourceByCode(aiResources, resourceCode);
                            return (
                              <div key={resourceCode} className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{resource?.displayName ?? resourceCode}</span>
                                    <span className="mt-1 block truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{resource?.resourceCode ?? resourceCode}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAiResource(resourceCode)}
                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-500 dark:hover:bg-white/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                {resource && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">{displayAiResourceCategory(resource, t)}</span>
                                    {resource.vendorCode && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{resource.vendorCode}</span>}
                                    {resource.modalityCode && <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{resource.modalityCode}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {selectedDirectResourceCodes.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                              {t('admin.channel.aiResources.noneSelected')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
                </div>
            </div>
          </div>
          </div>
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-white/10 bg-slate-50 dark:bg-[#121212] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? t('common.actions.saveChanges') : t('common.actions.createChannel')}
            </button>
          </div>
        </form>
        {vendorPickerOpen && (
          <ChannelVendorPickerModal
            channelType={channelType}
            modelVendor={modelVendor}
            selectedVendorCodes={selectedVendorCodes}
            onAccountVendorChange={setAccountVendor}
            onTargetVendorToggle={toggleTargetVendor}
            onClose={() => setVendorPickerOpen(false)}
          />
        )}
        {resourceGroupSelectorOpen && (
          <AiResourceGroupSelectorModal
            groups={visibleAiResourceGroups}
            selectedCodes={selectedVisibleResourceGroupCodes}
            loading={aiResourceGroupsLoading}
            onChange={setSelectedResourceGroupCodes}
            onClose={() => setResourceGroupSelectorOpen(false)}
          />
        )}
        {resourceSelectorOpen && (
          <div data-admin-channel-resource-selector-modal>
            <AiResourceSelectorModal
              loading={aiResourcesLoading}
              onChange={(codes) => setSelectedResourceCodes(codes)}
              onClose={() => setResourceSelectorOpen(false)}
              options={resourceSelectorOptions}
              selectedCodes={selectedDirectResourceCodes}
              selectionMode="multiple"
              searchDataAttribute="data-admin-channel-resource-selector-search"
              labels={{
                title: t('admin.channel.aiResources.actions.addResource'),
                searchPlaceholder: t('admin.channel.aiResources.searchPlaceholder'),
                loading: t('admin.channel.aiResources.loading'),
                empty: t('admin.channel.aiResources.empty'),
                emptySearch: t('admin.channel.aiResources.emptySearchDescription'),
                selectedCount: count => t('admin.channel.aiResources.selectedCount', { count }),
                done: t('common.actions.done'),
                close: t('common.actions.close'),
                columns: {
                  resource: t('admin.channel.aiResources.table.resource'),
                  kind: t('admin.channel.aiResources.table.kind'),
                  vendor: t('admin.channel.aiResources.table.vendor'),
                  status: t('admin.channel.aiResources.table.status'),
                },
              }}
            />
          </div>
        )}
        {targetModelSelectorOpen && (
          <ChannelTargetModelSelectorModal
            availableModels={availableTargetModels}
            selectedTargetModels={targetModelRows.map((row) => row.targetModel)}
            loading={modelCatalogLoading}
            error={modelCatalogError}
            onAdd={addTargetModel}
            onRemove={removeTargetModel}
            onClose={() => setTargetModelSelectorOpen(false)}
          />
        )}
        {mappingRuleModalOpen && (
          <ChannelMappingRuleModal
            targetModelRows={targetModelRows}
            initialRule={editingMappingRule}
            onSubmit={(sourceModel, targetModel) => {
              upsertModelMappingRule(sourceModel, targetModel, editingMappingRule?.id);
              setMappingRuleModalOpen(false);
              setEditingMappingRule(null);
            }}
            onClose={() => {
              setMappingRuleModalOpen(false);
              setEditingMappingRule(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ChannelVendorPickerModal({
  channelType,
  modelVendor,
  selectedVendorCodes,
  onAccountVendorChange,
  onTargetVendorToggle,
  onClose,
}: {
  channelType: ChannelType;
  modelVendor: string;
  selectedVendorCodes: string[];
  onAccountVendorChange: (vendor: string) => void;
  onTargetVendorToggle: (vendorCode: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const selectedVendorSummaries = useMemo(
    () => vendorSummariesForCodes(selectedVendorCodes, t),
    [selectedVendorCodes, t],
  );
  const filteredVendors = knownModelVendors.filter((vendor) => {
    const keyword = vendorSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    const vendorCode = providerCodeForVendor(vendor.id);
    return [vendor.id, vendor.name, vendorCode].filter(Boolean).join(' ').toLowerCase().includes(keyword);
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" data-admin-channel-vendor-picker-modal>
      <div className="flex h-[72vh] max-h-[72vh] w-[82vw] max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.channel.vendorPicker.title')}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {channelType === 'official'
                ? t('admin.channel.vendorPicker.officialHint')
                : t('admin.channel.vendorPicker.relayHint')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={vendorSearchQuery}
              onChange={(event) => setVendorSearchQuery(event.currentTarget.value)}
              placeholder={t('admin.channel.vendorPicker.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-indigo-400"
            />
          </div>
          <div data-admin-channel-vendor-picker-selected-summary className="mt-3 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t('admin.channel.vendorPicker.selectedCount', { count: selectedVendorCodes.length })}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {channelType === 'official'
                  ? t('admin.channel.vendorPicker.officialHint')
                  : t('admin.channel.vendorPicker.relayHint')}
              </span>
            </div>
            <div data-admin-channel-vendor-picker-selected-list className="flex min-w-0 flex-wrap gap-1.5">
              {selectedVendorSummaries.map((vendor) => (
                <span key={vendor.code} className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-black/30 dark:text-indigo-200 dark:ring-indigo-500/20">
                  <span className="truncate">{vendor.name}</span>
                  <span className="truncate font-mono text-indigo-500 dark:text-indigo-300">{vendor.code}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredVendors.map((vendor) => {
              const vendorCode = providerCodeForVendor(vendor.id);
              const isAccountVendor = vendor.id === modelVendor;
              const isSelected = selectedVendorCodes.includes(vendorCode);
              return (
                <div key={vendor.id} className={`rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                    : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#121212]'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{optionalTranslatedLabel(t, vendor)}</span>
                      <span className="block truncate font-mono text-[11px] text-slate-400">{vendorCode}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onAccountVendorChange(vendor.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                        isAccountVendor
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-white text-slate-500 hover:text-emerald-700 dark:bg-black dark:text-slate-400 dark:hover:text-emerald-300'
                      }`}
                    >
                      {t('admin.channel.vendorPicker.accountVendor')}
                    </button>
                  </div>
                  <button
                    type="button"
                    data-admin-channel-vendor-target-toggle
                    onClick={() => onTargetVendorToggle(vendorCode)}
                    className={`mt-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-black dark:text-slate-400 dark:hover:border-white/20'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-white bg-white/20' : 'border-slate-300 dark:border-slate-500'}`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {t('admin.channel.vendorPicker.targetVendors')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.channel.vendorPicker.selectedCount', { count: selectedVendorCodes.length })}
          </span>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
            {t('common.actions.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelTargetModelSelectorModal({
  availableModels,
  selectedTargetModels,
  loading,
  error,
  onAdd,
  onRemove,
  onClose,
}: {
  availableModels: ChannelModelCatalogItem[];
  selectedTargetModels: string[];
  loading: boolean;
  error: string | null;
  onAdd: (model: ChannelModelCatalogItem) => void;
  onRemove: (targetModel: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const selectedTargetSet = useMemo(
    () => new Set(selectedTargetModels.map((model) => model.trim().toLowerCase())),
    [selectedTargetModels],
  );
  const filteredModels = availableModels.filter((model) => {
    const keyword = modelSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [model.displayName, model.model, model.catalogKey, model.vendorCode, model.regionCode]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
  const toggleModel = (model: ChannelModelCatalogItem) => {
    if (selectedTargetSet.has(model.catalogKey.toLowerCase())) {
      onRemove(model.catalogKey);
      return;
    }
    onAdd(model);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" data-admin-channel-target-model-selector-modal>
      <div className="flex h-[76vh] max-h-[76vh] w-[88vw] max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.channel.models.targetModelSelectorTitle')}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={modelSearchQuery}
              onChange={(event) => setModelSearchQuery(event.currentTarget.value)}
              placeholder={t('admin.channel.models.targetModelSearchPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 px-6 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('admin.channel.models.loading')}
            </div>
          ) : error ? (
            <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-amber-700 dark:text-amber-300">{error}</div>
          ) : availableModels.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.channel.models.emptyForVendor')}</div>
          ) : filteredModels.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.channel.models.emptySearch')}</div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 dark:text-slate-400" data-admin-channel-target-model-selector-table>
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-3"></th>
                  <th className="px-5 py-3">{t('admin.channel.models.targetModel')}</th>
                  <th className="px-5 py-3">{t('admin.channel.models.vendor')}</th>
                  <th className="px-5 py-3">{t('admin.channel.models.runtimeModel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredModels.map((model) => {
                  const isSelected = selectedTargetSet.has(model.catalogKey.toLowerCase());
                  return (
                    <tr key={model.catalogKey} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => toggleModel(model)}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            event.stopPropagation();
                            toggleModel(model);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{model.displayName || model.model}</div>
                        <div className="font-mono text-xs text-slate-500">{model.catalogKey}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{model.vendorCode}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{model.model}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.channel.models.selectedTargetCount', { count: selectedTargetModels.length })}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
            {t('common.actions.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelMappingRuleModal({
  targetModelRows,
  initialRule,
  onSubmit,
  onClose,
}: {
  targetModelRows: AccountModelMappingRow[];
  initialRule: AccountModelMappingRow | null;
  onSubmit: (sourceModel: string, targetModel: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [sourceModel, setSourceModel] = useState(initialRule?.sourceModel ?? '');
  const [targetModel, setTargetModel] = useState(initialRule?.targetModel ?? targetModelRows[0]?.targetModel ?? '');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const filteredTargets = targetModelRows.filter((row) => {
    const keyword = targetSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [row.targetModel, catalogModelRuntimeId(row.targetModel), catalogModelVendorCode(row.targetModel, '')]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSourceModel = sourceModel.trim();
    const normalizedTargetModel = targetModel.trim();
    if (!normalizedSourceModel) {
      setLocalError(t('admin.channel.validation.mappingSourceRequired'));
      return;
    }
    if (!normalizedTargetModel) {
      setLocalError(t('admin.channel.validation.mappingTargetRequired'));
      return;
    }
    onSubmit(normalizedSourceModel, normalizedTargetModel);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" data-admin-channel-mapping-rule-modal>
      <div className="flex max-h-[82vh] w-[86vw] max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initialRule ? t('admin.channel.models.mappingRuleEditTitle') : t('admin.channel.models.mappingRuleCreateTitle')}
          </h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {localError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {localError}
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.channel.models.requestModel')}</span>
                <input
                  value={sourceModel}
                  onChange={(event) => setSourceModel(event.currentTarget.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 dark:border-white/10 dark:bg-black dark:text-white"
                  placeholder={t('admin.channel.models.requestModelPlaceholder')}
                />
              </label>
              <div className="min-w-0">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.channel.models.actualTargetModel')}</span>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={targetSearchQuery}
                    onChange={(event) => setTargetSearchQuery(event.currentTarget.value)}
                    placeholder={t('admin.channel.models.mappingTargetSearchPlaceholder')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-black dark:text-white"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10">
                  {filteredTargets.map((row) => {
                    const isSelected = row.targetModel === targetModel;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setTargetModel(row.targetModel)}
                        className={`flex w-full items-center gap-3 border-b border-slate-200 px-3 py-2 text-left text-xs last:border-b-0 dark:border-white/5 ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-black dark:text-slate-300 dark:hover:bg-white/5'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono">{row.targetModel}</span>
                          <span className="mt-0.5 block truncate text-[11px] opacity-70">{catalogModelRuntimeId(row.targetModel)}</span>
                        </span>
                      </button>
                    );
                  })}
                  {filteredTargets.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t('admin.channel.models.emptyTargetModels')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
              {t('common.actions.cancel')}
            </button>
            <button type="submit" disabled={targetModelRows.length === 0} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {t('common.actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AiResourceGroupSelectorModal({
  groups,
  selectedCodes,
  loading,
  onChange,
  onClose,
}: {
  groups: AiResourceGroup[];
  selectedCodes: string[];
  loading: boolean;
  onChange: (codes: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [resourceGroupSearchQuery, setResourceGroupSearchQuery] = useState('');
  const selected = new Set(selectedCodes);
  const filteredGroups = groups.filter((group) => {
    const keyword = resourceGroupSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [
      group.groupName,
      group.groupCode,
      group.groupType,
      group.selectionMode,
      group.status,
      group.capability,
      group.capabilities.join(' '),
      group.vendorCodes.join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
  const toggleGroupCode = (groupCode: string) => {
    const normalizedCode = normalizeAiResourceCode(groupCode);
    onChange(selected.has(normalizedCode)
      ? selectedCodes.filter((code) => code !== normalizedCode)
      : [...selectedCodes, normalizedCode]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" data-admin-channel-resource-group-selector-modal>
      <div className="flex h-[76vh] max-h-[76vh] w-[88vw] max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.channel.aiResourceGroups.title')}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={resourceGroupSearchQuery}
              onChange={(event) => setResourceGroupSearchQuery(event.currentTarget.value)}
              placeholder={t('admin.channel.aiResourceGroups.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.channel.aiResourceGroups.loading')}</div>
          ) : groups.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.channel.aiResourceGroups.empty')}</div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.channel.aiResourceGroups.emptySearchDescription')}</div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-3"></th>
                  <th className="px-5 py-3">{t('admin.channel.aiResourceGroups.table.group')}</th>
                  <th className="px-5 py-3">{t('admin.channel.aiResourceGroups.table.selectionMode')}</th>
                  <th className="px-5 py-3">{t('admin.channel.aiResourceGroups.table.resources')}</th>
                  <th className="px-5 py-3">{t('admin.channel.aiResourceGroups.table.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredGroups.map((group) => {
                  const groupCode = normalizeAiResourceCode(group.groupCode);
                  return (
                    <tr key={group.groupCode} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(groupCode)}
                          onChange={() => toggleGroupCode(group.groupCode)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{group.groupName}</div>
                        <div className="font-mono text-xs text-slate-500">{group.groupCode}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(group.capabilities.length > 0 ? group.capabilities : [group.capability])
                            .filter(Boolean)
                            .map((capability) => (
                              <span key={capability} className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                {capability}
                              </span>
                            ))}
                          {group.vendorCodes.map((vendorCode) => (
                            <span key={vendorCode} className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              {vendorCode}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">{group.selectionMode}</td>
                      <td className="px-5 py-3">{group.resourceCount}</td>
                      <td className="px-5 py-3">{group.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.channel.aiResourceGroups.selectedCount', { count: selectedCodes.length })}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
            {t('common.actions.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function findProviderSecretForCredential(credential: ChannelCredentialItem, providerSecrets: ProviderSecretItem[]): ProviderSecretItem | null {
  const secretRef = credential.secretRef?.trim();
  if (!secretRef) {
    return null;
  }
  return (
    providerSecrets.find((secret) => secret.secretRef === secretRef) ??
    null
  );
}

function CredentialDetailsModal({
  channel,
  providerSecrets,
  isLoading,
  loadError,
  onRetry,
  onCopyCredentialApiKey,
  onClose,
}: {
  channel: ChannelItem;
  providerSecrets: ProviderSecretItem[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onCopyCredentialApiKey: (credential: ChannelCredentialItem) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Key className="h-5 w-5 text-emerald-500" />
            {t('admin.channel.credentials.modalTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.actions.close')}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#121212]">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Network className="h-4 w-4 text-slate-400" />
              {t('admin.channel.credentials.channelTitle')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CredentialDetailField label={t('admin.channel.fields.channelName')} value={channel.name} />
              <CredentialDetailField label={t('admin.channel.fields.vendor')} value={channel.vendor} />
              <CredentialDetailField label={t('admin.channel.fields.channelType')} value={t(`admin.channel.channelType.${channel.channelType}`)} />
              <CredentialDetailField label={t('admin.channel.fields.authType')} value={channel.accessType} />
              <CredentialDetailField label={t('admin.channel.fields.createdAt')} value={displayChannelTime(channel.createdAt)} />
              <CredentialDetailField
                label={t('admin.channel.fields.expiresAt')}
                value={displayChannelTime(channel.expiresAt, t('admin.channel.expiration.never'))}
              />
              <CredentialDetailField
                label={t('admin.channel.fields.credentialRotation')}
                value={t(`admin.channel.rotation.${credentialRotationLabelKey(channel.credentialRotation)}`)}
              />
              <CredentialDetailField
                label={t('admin.channel.fields.credentials')}
                value={t('admin.channel.credentials.count', { count: channel.credentials.length })}
                wide
              />
            </div>
          </section>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-black dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              {t('admin.channel.credentials.loadingDetails')}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t('admin.channel.credentials.loadErrorTitle')}</div>
                  <div className="mt-1 break-words">{loadError}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {t('common.actions.retry')}
              </button>
            </div>
          ) : channel.credentials.length > 0 ? (
            <section className="space-y-3">
              {channel.credentials.map((credential, index) => {
                const linkedSecret = findProviderSecretForCredential(credential, providerSecrets);
                const hasApiKey = Boolean(credential.apiKey?.trim());
                const apiKeyDisplayValue = apiKeyVisible
                  ? credential.apiKey ?? ''
                  : maskApiKeyForDisplay(credential.apiKey);
                return (
                  <div key={credential.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#121212]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <Key className="h-4 w-4 text-emerald-500" />
                          {t('admin.channel.credentials.rowTitle', { index: index + 1 })}
                        </h4>
                        <p className="mt-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{credential.baseUrl}</p>
                      </div>
                      <CredentialStatusBadge status={credential.status} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <CredentialDetailField label={t('admin.channel.fields.credentialName')} value={credential.name} />
                      <CredentialDetailField label={t('admin.channel.fields.baseUrl')} value={credential.baseUrl} monospace />
                      <CredentialDetailField label={t('admin.channel.fields.secretReference')} value={credential.secretRef} monospace wide />
                      <CredentialDetailField label={t('admin.channel.fields.maskedLabel')} value={credential.maskedLabel} monospace />
                      <CredentialDetailField label={t('admin.channel.credentials.priority')} value={String(credential.priority)} />
                      <CredentialDetailField label={t('admin.channel.credentials.weight')} value={String(credential.weight)} />
                      <CredentialDetailField
                        label={t('admin.channel.fields.apiKey')}
                        value={apiKeyDisplayValue}
                        emptyValue={t('admin.channel.credentials.apiKeyUnavailable')}
                        monospace={hasApiKey}
                        wide
                        onToggleVisibility={() => setApiKeyVisible((current) => !current)}
                        visibilityLabel={apiKeyVisible ? t('admin.channel.actions.hideApiKey') : t('admin.channel.actions.showApiKey')}
                        isSecretVisible={apiKeyVisible}
                        onCopy={() => onCopyCredentialApiKey(credential)}
                        copyLabel={t('common.actions.copyApiKey')}
                        copyDisabled={!hasApiKey}
                      />
                    </div>
                    {linkedSecret && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t('admin.channel.credentials.linkedTitle')}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <CredentialDetailField label={t('admin.channel.fields.providerCode')} value={linkedSecret.providerCode} monospace />
                          <CredentialDetailField label={t('admin.channel.fields.accountCode')} value={linkedSecret.accountCode} monospace />
                          <CredentialDetailField label={t('admin.channel.fields.authType')} value={linkedSecret.authType} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <h4 className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4" />
                {t('admin.channel.credentials.noReferenceTitle')}
              </h4>
              <p className="mt-2 leading-6">
                {t('admin.channel.credentials.noReferenceDescription')}
              </p>
            </section>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#121212]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t('common.actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function maskApiKeyForDisplay(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
  }
  return `${normalized.slice(0, 6)}****${normalized.slice(-4)}`;
}

function credentialRotationLabelKey(value: ChannelItem['credentialRotation']): string {
  switch (value) {
    case 'priority':
      return 'priority';
    case 'round_robin':
      return 'roundRobin';
    case 'weighted_round_robin':
      return 'weightedRoundRobin';
    case 'random':
      return 'random';
    default:
      return 'default';
  }
}

function CredentialDetailField({
  label,
  value,
  emptyValue,
  monospace = false,
  wide = false,
  onToggleVisibility,
  visibilityLabel,
  isSecretVisible = false,
  onCopy,
  copyLabel,
  copyDisabled = false,
}: {
  label: string;
  value: string | undefined;
  emptyValue?: string;
  monospace?: boolean;
  wide?: boolean;
  onToggleVisibility?: () => void;
  visibilityLabel?: string;
  isSecretVisible?: boolean;
  onCopy?: () => void;
  copyLabel?: string;
  copyDisabled?: boolean;
}) {
  const displayValue = value?.trim() ? value : emptyValue ?? '';
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={`flex items-center gap-2 break-words rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-white/10 dark:bg-black dark:text-slate-200 ${
          monospace ? 'font-mono text-xs' : ''
        }`}
      >
        <span className="min-w-0 flex-1 break-words">{displayValue}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            disabled={copyDisabled}
            title={copyLabel}
            aria-label={copyLabel}
            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            title={visibilityLabel}
            aria-label={visibilityLabel}
            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            {isSecretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function ChannelAdmin() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<AccountDrawerMode | null>(null);
  const [editingChannel, setEditingChannel] = useState<ChannelItem | null>(null);
  const [channelFormDraft, setChannelFormDraft] = useState<ChannelFormValues | null>(null);
  const [viewingCredentialChannel, setViewingCredentialChannel] = useState<ChannelItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [providerSecretLoading, setProviderSecretLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [pendingChannelAction, setPendingChannelAction] = useState<PendingChannelAction | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [confirmDeleteBusy, setConfirmDeleteBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [providerSecretLoadError, setProviderSecretLoadError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [providerSecrets, setProviderSecrets] = useState<ProviderSecretItem[]>([]);
  const [modelCatalog, setModelCatalog] = useState<ChannelModelCatalogItem[]>([]);
  const [aiResources, setAiResources] = useState<AiResource[]>([]);
  const [aiResourceGroups, setAiResourceGroups] = useState<AiResourceGroup[]>([]);
  const [modelCatalogLoading, setModelCatalogLoading] = useState(true);
  const [modelCatalogError, setModelCatalogError] = useState<string | null>(null);
  const [aiResourcesLoading, setAiResourcesLoading] = useState(true);
  const [aiResourcesError, setAiResourcesError] = useState<string | null>(null);
  const [aiResourceGroupsLoading, setAiResourceGroupsLoading] = useState(true);
  const [aiResourceGroupsError, setAiResourceGroupsError] = useState<string | null>(null);
  const pageSize = 8;

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCopyCredentialApiKey = useCallback(async (credential: ChannelCredentialItem) => {
    const apiKey = credential.apiKey?.trim();
    if (!apiKey) {
      showToast(t('admin.channel.credentials.apiKeyUnavailable'), 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(apiKey);
      showToast(t('common.actions.copiedApiKey'));
    } catch {
      showToast(t('common.actions.copyFailed'), 'error');
    }
  }, [showToast, t]);

  const loadChannels = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const channelData = await ChannelService.fetchChannels();
      if (isActive()) {
        setChannels(channelData);
      }
    } catch (err) {
      if (isActive()) {
        setLoadError(getLoadErrorMessage(err, t('admin.channel.errors.channelsLoadFallback')));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [t]);

  const loadProviderSecrets = useCallback(async (isActive: () => boolean = () => true) => {
    setProviderSecretLoading(true);
    setProviderSecretLoadError(null);
    try {
      const secretData = await ProviderSecretService.fetchProviderSecrets();
      if (isActive()) {
        setProviderSecrets(secretData);
      }
    } catch (err) {
      if (isActive()) {
        setProviderSecretLoadError(getLoadErrorMessage(err, t('admin.channel.errors.credentialsLoadFallback')));
      }
    } finally {
      if (isActive()) {
        setProviderSecretLoading(false);
      }
    }
  }, [t]);

  const loadModelCatalog = useCallback(async (isActive: () => boolean = () => true) => {
    setModelCatalogLoading(true);
    setModelCatalogError(null);
    try {
      const models = await ChannelModelCatalogService.fetchModels();
      if (isActive()) {
        setModelCatalog(models);
      }
    } catch (err) {
      if (isActive()) {
        setModelCatalogError(getLoadErrorMessage(err, t('admin.channel.models.loadError')));
      }
    } finally {
      if (isActive()) {
        setModelCatalogLoading(false);
      }
    }
  }, [t]);

  const loadAiResources = useCallback(async (isActive: () => boolean = () => true) => {
    setAiResourcesLoading(true);
    setAiResourcesError(null);
    try {
      const resources = await ChannelAiResourceService.fetchAiResources();
      if (isActive()) {
        setAiResources(resources);
      }
    } catch (err) {
      if (isActive()) {
        setAiResourcesError(getLoadErrorMessage(err, t('admin.channel.aiResources.loadError')));
      }
    } finally {
      if (isActive()) {
        setAiResourcesLoading(false);
      }
    }
  }, [t]);

  const loadAiResourceGroups = useCallback(async (isActive: () => boolean = () => true) => {
    setAiResourceGroupsLoading(true);
    setAiResourceGroupsError(null);
    try {
      const groups = await ChannelAiResourceService.fetchAiResourceGroups();
      if (isActive()) {
        setAiResourceGroups(groups);
      }
    } catch (err) {
      if (isActive()) {
        setAiResourceGroupsError(getLoadErrorMessage(err, t('admin.channel.aiResourceGroups.loadError')));
      }
    } finally {
      if (isActive()) {
        setAiResourceGroupsLoading(false);
      }
    }
  }, [t]);

  const loadData = useCallback(async (isActive: () => boolean = () => true) => {
    await Promise.all([
      loadChannels(isActive),
      loadProviderSecrets(isActive),
      loadModelCatalog(isActive),
      loadAiResources(isActive),
      loadAiResourceGroups(isActive),
    ]);
  }, [loadAiResourceGroups, loadAiResources, loadChannels, loadModelCatalog, loadProviderSecrets]);

  useEffect(() => {
    let active = true;
    void loadData(() => active);
    return () => {
      active = false;
    };
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  const filteredChannels = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return channels.filter((channel) => {
      const matchesTab = activeTab === 'all' || channel.vendor === activeTab;
      const searchable = [
        channel.name,
        channel.vendor,
        channel.accessType,
        channel.channelType,
        ...channel.capabilities,
        ...channel.resourceCodes,
      ].join(' ').toLowerCase();
      return matchesTab && (!keyword || searchable.includes(keyword));
    });
  }, [activeTab, channels, search]);

  const totalItems = filteredChannels.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedChannels = filteredChannels.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openCreateModal = () => {
    setEditingChannel(null);
    setChannelFormDraft(null);
    setModalMode('create');
  };

  const openEditModal = (channel: ChannelItem) => {
    setEditingChannel(channel);
    setChannelFormDraft(createChannelEditDraft(channel));
    setModalMode('edit');
    void draftWithAccountModelMappings(channel, createChannelEditDraft(channel));
  };

  const openCopyCreateModal = (channel: ChannelItem) => {
    setEditingChannel(null);
    setChannelFormDraft(createChannelCopyDraft(channel));
    setModalMode('copy');
    void draftWithAccountModelMappings(channel, createChannelCopyDraft(channel));
  };

  const draftWithAccountModelMappings = async (channel: ChannelItem, draft: ChannelFormValues) => {
    try {
      const modelMappings = await AccountModelMappingService.fetchAccountMappings(channel.channelId);
      setChannelFormDraft({ ...draft, modelMappings });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.channel.errors.channelSaveFailed'), 'error');
    }
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setModalMode(null);
    setEditingChannel(null);
    setChannelFormDraft(null);
  };

  const closeDeleteConfirmation = () => {
    if (confirmDeleteBusy) {
      return;
    }
    setDeleteConfirmation(null);
  };

  const openDeleteChannelConfirmation = (channel: ChannelItem) => {
    setDeleteConfirmation({
      id: channel.id,
      title: t('admin.channel.confirm.deleteChannelTitle'),
      description: t('admin.channel.confirm.deleteChannelDescription', { name: channel.name }),
      confirmLabel: t('admin.channel.actions.deleteChannel'),
    });
  };

  const handleSubmitChannel = async (channel: ChannelFormValues) => {
    setSaving(true);
    try {
      if (modalMode === 'edit' && editingChannel) {
        const updated = await ChannelService.updateChannel(editingChannel.id, createChannelUpdateInputFromForm(channel));
        await AccountModelMappingService.replaceAccountMappings({
          channelId: updated.channelId,
          channelName: updated.name,
          accountVendorCode: providerCodeForVendor(channel.vendor),
          mappings: channel.modelMappings ?? [],
        });
        if (updated) {
          setChannels((current) => current.map((item) => (item.id === editingChannel.id ? updated : item)));
        }
        setLoadError(null);
        showToast(t('admin.channel.messages.channelUpdated'));
      } else {
        const added = await ChannelService.addChannel(createChannelInputFromForm(channel));
        await AccountModelMappingService.replaceAccountMappings({
          channelId: added.channelId,
          channelName: added.name,
          accountVendorCode: providerCodeForVendor(channel.vendor),
          mappings: channel.modelMappings ?? [],
        });
        setChannels((current) => [added, ...current]);
        setLoadError(null);
        showToast(t('admin.channel.messages.channelCreated'));
      }
      setModalMode(null);
      setEditingChannel(null);
      setChannelFormDraft(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.channel.errors.channelSaveFailed');
      showToast(message, 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChannel = async (id: string, updates: ChannelUpdateInput, successMessage: string) => {
    setPendingChannelId(id);
    setPendingChannelAction('update');
    try {
      const updated = await ChannelService.updateChannel(id, updates);
      if (updated) {
        setChannels((current) => current.map((item) => (item.id === id ? updated : item)));
      }
      setLoadError(null);
      showToast(successMessage, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.channel.errors.channelUpdateFailed'), 'error');
    } finally {
      setPendingChannelId(null);
      setPendingChannelAction(null);
    }
  };

  const handleTestChannel = async (id: string) => {
    setPendingChannelId(id);
    setPendingChannelAction('test');
    try {
      const result = await ChannelService.testChannel(id);
      setChannels((current) => current.map((item) => (item.id === id ? result.item : item)));
      showToast(
        result.success
          ? t('admin.channel.messages.channelTestPassed', { latency: result.latency })
          : t('admin.channel.messages.channelTestFailed', { latency: result.latency }),
        result.success ? 'success' : 'error',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.channel.errors.channelTestFailed'), 'error');
    } finally {
      setPendingChannelId(null);
      setPendingChannelAction(null);
    }
  };

  const deleteChannelById = async (id: string) => {
    setPendingChannelId(id);
    setPendingChannelAction('delete');
    try {
      const success = await ChannelService.deleteChannel(id);
      if (success) {
        setChannels((current) => current.filter((item) => item.id !== id));
      }
      setLoadError(null);
      showToast(t('admin.channel.messages.channelDeleted'), 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.channel.errors.channelDeleteFailed'), 'error');
    } finally {
      setPendingChannelId(null);
      setPendingChannelAction(null);
    }
  };

  const executeConfirmedDelete = async () => {
    if (!deleteConfirmation || confirmDeleteBusy) {
      return;
    }
    const confirmation = deleteConfirmation;
    setConfirmDeleteBusy(true);
    try {
      await deleteChannelById(confirmation.id);
      setDeleteConfirmation(null);
    } finally {
      setConfirmDeleteBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-40 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-channel-toolbar>
          <div className="relative w-full sm:w-72" data-admin-channel-search>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin.channel.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full text-slate-900 dark:text-white placeholder-slate-500 transition-colors shadow-sm"
            />
          </div>
          <button
            data-admin-channel-primary-action
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex w-full items-center justify-center gap-2 flex-shrink-0 shadow-lg shadow-emerald-500/20 sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.actions.addChannel')}</span>
          </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto hide-scrollbar">
        {channelTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {optionalTranslatedLabel(t, tab)}
          </button>
        ))}
      </div>

      <AdminTableShell
        data-admin-channel-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        viewportClassName="min-h-0 flex-1"
        viewportProps={{ 'data-admin-channel-table-viewport': true }}
        footer={(
          <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121212] flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('admin.channel.pagination.total', { count: totalItems })}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {t('admin.channel.pagination.page', { page: currentPage, totalPages })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:text-slate-400 dark:hover:text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                  title={t('common.actions.previousPage')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:text-slate-400 dark:hover:text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                  title={t('common.actions.nextPage')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      >
        <div className="contents">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{t('admin.channel.table.channel')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.provider')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.credentials')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.weight')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.status')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.createdAt')}</th>
                <th className="px-6 py-4">{t('admin.channel.table.expiresAt')}</th>
                <th className="px-6 py-4 text-right">{t('admin.channel.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {loading ? (
                <BusinessStateTableRow colSpan={8} kind="loading" title={t('admin.channel.states.loadingChannels')} />
              ) : loadError ? (
                <BusinessStateTableRow
                  colSpan={8}
                  kind="error"
                  title={t('admin.channel.states.channelsLoadErrorTitle')}
                  description={loadError}
                  onRetry={() => void loadChannels()}
                />
              ) : paginatedChannels.length === 0 ? (
                <BusinessStateTableRow
                  colSpan={8}
                  kind="empty"
                  title={t('admin.channel.states.emptyChannelsTitle')}
                  description={
                    channels.length === 0
                      ? t('admin.channel.states.emptyChannelsDescription')
                      : t('admin.channel.states.emptySearchDescription')
                  }
                  action={channels.length === 0 ? { label: t('common.actions.addChannel'), onClick: openCreateModal } : undefined}
                />
              ) : (
                paginatedChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 align-top max-w-[14rem]">
                      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                        <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900 dark:text-white">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              channel.status === 'active'
                                ? 'bg-emerald-500'
                                : channel.status === 'disabled'
                                  ? 'bg-slate-400'
                                  : 'bg-red-500'
                            }`}
                          />
                          <span className="min-w-0 truncate">{channel.name}</span>
                        </span>
                        <CapabilityBadges capabilities={channel.capabilities} />
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top max-w-[12rem]">
                      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                          <Cpu className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="min-w-0 truncate">{channel.vendor}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 whitespace-nowrap">
                          <Key className="w-3.5 h-3.5 shrink-0" />
                          <span className="min-w-0 truncate">{channel.accessType}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 whitespace-nowrap">
                          <Boxes className="w-3.5 h-3.5 shrink-0" />
                          <span className="min-w-0 truncate">{t(`admin.channel.channelType.${channel.channelType}`)}</span>
                        </span>
                        {channel.resourceCodes.length > 0 && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 whitespace-nowrap">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="min-w-0 truncate">
                              {t('admin.channel.aiResources.selectedCount', {
                                count: channel.resourceCodes.length,
                              })}
                            </span>
                          </span>
                        )}
                        {channel.circuitBreakerPolicy && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 whitespace-nowrap">
                            <Network className="w-3.5 h-3.5 shrink-0" />
                            <span className="min-w-0 truncate">
                              {t('admin.channel.table.circuitBreakerCount', {
                                count: channel.circuitBreakerPolicy.failureThreshold,
                              })}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <CredentialSummaryCell channel={channel} />
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300 align-top">{channel.weight}</td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge channel={channel} />
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                      {displayChannelTime(channel.createdAt)}
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                      {displayChannelTime(channel.expiresAt, t('admin.channel.expiration.never'))}
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          title={t('admin.channel.actions.viewCredential')}
                          onClick={() => setViewingCredentialChannel(channel)}
                          disabled={pendingChannelId === channel.id}
                        >
                          <Key className="w-4 h-4" />
                        </IconButton>
                        <IconButton title={t('admin.channel.actions.editChannel')} onClick={() => openEditModal(channel)} disabled={pendingChannelId === channel.id}>
                          <Edit2 className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          title={t('admin.channel.actions.copyCreateChannel')}
                          onClick={() => openCopyCreateModal(channel)}
                          disabled={pendingChannelId === channel.id}
                        >
                          <Copy className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          title={t('admin.channel.actions.testChannel')}
                          onClick={() => void handleTestChannel(channel.id)}
                          disabled={pendingChannelId === channel.id}
                        >
                          {pendingChannelId === channel.id && pendingChannelAction === 'test' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Network className="w-4 h-4" />
                          )}
                        </IconButton>
                        <IconButton
                          title={channel.status === 'active'
                            ? t('admin.channel.actions.disableChannel')
                            : t('admin.channel.actions.enableChannel')}
                          onClick={() =>
                            void handleUpdateChannel(
                              channel.id,
                              createChannelStatusUpdateInput(channel.status === 'active' ? 'disabled' : 'active'),
                              channel.status === 'active'
                                ? t('admin.channel.messages.channelDisabled')
                                : t('admin.channel.messages.channelEnabled'),
                            )
                          }
                          disabled={pendingChannelId === channel.id}
                          tone="warning"
                        >
                          {pendingChannelId === channel.id && pendingChannelAction === 'update' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : channel.status === 'active' ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </IconButton>
                        <IconButton
                          title={t('admin.channel.actions.deleteChannel')}
                          onClick={() => openDeleteChannelConfirmation(channel)}
                          disabled={pendingChannelId === channel.id}
                          tone="danger"
                        >
                          {pendingChannelId === channel.id && pendingChannelAction === 'delete' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </AdminTableShell>

      {modalMode && (
        <AddAccountDrawer
          mode={modalMode}
          initialValues={channelFormDraft}
          availableModels={modelCatalog}
          aiResources={aiResources}
          aiResourceGroups={aiResourceGroups}
          modelCatalogLoading={modelCatalogLoading}
          modelCatalogError={modelCatalogError}
          aiResourcesLoading={aiResourcesLoading}
          aiResourcesError={aiResourcesError}
          aiResourceGroupsLoading={aiResourceGroupsLoading}
          aiResourceGroupsError={aiResourceGroupsError}
          isSaving={saving}
          onClose={closeModal}
          onSubmit={handleSubmitChannel}
        />
      )}
      {viewingCredentialChannel && (
        <CredentialDetailsModal
          channel={viewingCredentialChannel}
          providerSecrets={providerSecrets}
          isLoading={providerSecretLoading}
          loadError={providerSecretLoadError}
          onRetry={() => void loadProviderSecrets()}
          onCopyCredentialApiKey={handleCopyCredentialApiKey}
          onClose={() => setViewingCredentialChannel(null)}
        />
      )}
      {deleteConfirmation && (
        <ConfirmDialog
          title={deleteConfirmation.title}
          description={deleteConfirmation.description}
          confirmLabel={deleteConfirmation.confirmLabel}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={Boolean(confirmDeleteBusy)}
          onConfirm={() => void executeConfirmedDelete()}
          onCancel={closeDeleteConfirmation}
        />
      )}
    </div>
  );
}

function CapabilityBadges({ capabilities }: { capabilities: string[] }) {
  const { t } = useTranslation();
  const mapping: Record<string, { labelKey: string; icon: React.ReactNode; color: string }> = {
    llm: { labelKey: 'common.modality.llm', icon: <MessageSquare className="w-3 h-3" />, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    image: { labelKey: 'common.modality.image', icon: <ImageIcon className="w-3 h-3" />, color: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400' },
    audio: { labelKey: 'common.modality.audio', icon: <Mic className="w-3 h-3" />, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    music: { labelKey: 'common.modality.music', icon: <Music className="w-3 h-3" />, color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    sfx: { labelKey: 'common.modality.sfx', icon: <Volume2 className="w-3 h-3" />, color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400' },
    video: { labelKey: 'common.modality.video', icon: <Video className="w-3 h-3" />, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
  };

  return (
    <div className="flex max-w-[7rem] shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap">
      {capabilities.map((capability) => {
        const info = mapping[capability];
        if (!info) {
          return null;
        }
        return (
          <span key={capability} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${info.color}`}>
            {info.icon}
            {t(info.labelKey)}
          </span>
        );
      })}
    </div>
  );
}

function CredentialSummaryCell({ channel }: { channel: ChannelItem }) {
  const { t } = useTranslation();
  const primaryCredential = channel.credentials[0];

  return (
    <div className="min-w-[12rem] max-w-[16rem]">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
        <Key className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span>{t('admin.channel.credentials.count', { count: channel.credentials.length })}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          {t(`admin.channel.rotation.${credentialRotationLabelKey(channel.credentialRotation)}`)}
        </span>
      </div>
      {primaryCredential ? (
        <div className="mt-1 min-w-0 space-y-0.5">
          <div className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-300" title={primaryCredential.baseUrl}>
            {primaryCredential.baseUrl}
          </div>
          <div className="truncate font-mono text-[11px] text-slate-400" title={primaryCredential.maskedLabel}>
            {primaryCredential.maskedLabel}
          </div>
        </div>
      ) : (
        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('admin.channel.credentials.emptyTitle')}</div>
      )}
    </div>
  );
}

function CredentialStatusBadge({ status }: { status: ChannelCredentialItem['status'] }) {
  const { t } = useTranslation();
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-3.5 w-3.5" />
        {t('admin.channel.status.active')}
      </span>
    );
  }
  if (status === 'disabled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Ban className="h-3.5 w-3.5" />
        {t('admin.channel.status.disabled')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <AlertCircle className="h-3.5 w-3.5" />
      {t('admin.channel.status.errors', { count: 1 })}
    </span>
  );
}

function StatusBadge({ channel }: { channel: ChannelItem }) {
  const { t } = useTranslation();
  if (channel.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5" />
        {t('admin.channel.status.active')}
      </span>
    );
  }
  if (channel.status === 'disabled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
        <Ban className="w-3.5 h-3.5" />
        {t('admin.channel.status.disabled')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-medium">
      <AlertCircle className="w-3.5 h-3.5" />
      {t('admin.channel.status.errors', { count: channel.errors })}
    </span>
  );
}

function IconButton({
  title,
  children,
  disabled,
  tone = 'default',
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
      : tone === 'warning'
        ? 'text-amber-600 hover:text-amber-700 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
        : 'text-blue-600 hover:text-blue-700 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10';
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
