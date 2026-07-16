import { isCatalogModelKey, providerCodeForVendor } from './channelService.ts';

export type ChannelVendorSelectionType = 'official' | 'relay';

export type DeriveChannelTargetVendorCodesInput = {
  channelType?: string;
  accountVendor: string;
  modelMappings?: readonly {
    targetVendorCode?: string;
    targetModel?: string;
  }[];
  resourceCodes?: readonly string[];
};

export type ReconcileChannelVendorSelectionInput = {
  channelType?: string;
  accountVendor: string;
  selectedVendorCodes: readonly string[];
  selectedResourceCodes?: readonly string[];
  availableResourceCodes?: readonly string[];
};

export type ReconciledChannelVendorSelection = {
  selectedVendorCodes: string[];
  selectedResourceCodes: string[];
};

export type ChannelAiResourceVisibilityInput = {
  resourceCode?: string;
  resourceType?: string;
  vendorCode?: string | null;
  modalityCode?: string | null;
  capability?: string | null;
  capabilities?: readonly string[] | null;
};

export type ChannelAiResourceGroupVisibilityInput = {
  groupCode?: string;
  groupName?: string;
  vendorCodes?: readonly string[] | null;
  capability?: string | null;
  capabilities?: readonly string[] | null;
};

const DIRECT_CHANNEL_BINDABLE_AI_RESOURCE_TYPES = new Set([
  'api_endpoint',
  'model_api',
  'bundle',
]);

export function normalizeChannelVendorCode(value: string): string {
  const normalized = value.trim();
  return normalized ? providerCodeForVendor(normalized) : '';
}

export function normalizeChannelResourceCode(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeChannelCapabilityCode(value: string): string {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'chat':
    case 'text':
      return 'llm';
    case 'speech':
      return 'audio';
    default:
      return normalized;
  }
}

export function vendorResourceCode(vendorCode: string): string {
  return `vendor.${normalizeChannelVendorCode(vendorCode)}`;
}

export function isVendorResourceCode(resourceCode: string): boolean {
  return normalizeChannelResourceCode(resourceCode).startsWith('vendor.');
}

export function isDirectChannelBindableAiResource(resource: ChannelAiResourceVisibilityInput): boolean {
  return DIRECT_CHANNEL_BINDABLE_AI_RESOURCE_TYPES.has(resource.resourceType?.trim().toLowerCase() ?? '');
}

export function isAiResourceVisibleForChannelVendorScope(
  resource: ChannelAiResourceVisibilityInput,
  selectedVendorCodes: readonly string[],
  selectedCapabilities: readonly string[] = [],
): boolean {
  if (!isDirectChannelBindableAiResource(resource)) {
    return false;
  }
  const resourceVendorCode = normalizeChannelVendorCode(resource.vendorCode ?? '');
  if (!resourceVendorCode) {
    return false;
  }
  const selectedVendorSet = new Set(
    selectedVendorCodes.map(normalizeChannelVendorCode).filter(Boolean),
  );
  if (!selectedVendorSet.has(resourceVendorCode)) {
    return false;
  }
  const selectedCapabilitySet = new Set(
    selectedCapabilities.map(normalizeChannelCapabilityCode).filter(Boolean),
  );
  if (selectedCapabilitySet.size === 0) {
    return true;
  }
  return channelAiResourceCapabilityCodes(resource)
    .some((capability) => selectedCapabilitySet.has(capability));
}

export function isAiResourceGroupVisibleForChannelVendorScope(
  group: ChannelAiResourceGroupVisibilityInput,
  selectedVendorCodes: readonly string[],
  selectedCapabilities: readonly string[] = [],
): boolean {
  const selectedVendorSet = new Set(
    selectedVendorCodes.map(normalizeChannelVendorCode).filter(Boolean),
  );
  const groupVendorCodes = channelAiResourceGroupVendorCodes(group);
  if (selectedVendorSet.size > 0 && groupVendorCodes.length > 0) {
    const isOpenAiCompatibleGroup = groupVendorCodes.includes('openai_compatible');
    const groupMatchesSelectedVendors = groupVendorCodes.every((vendorCode) =>
      selectedVendorSet.has(vendorCode)
      || (
        vendorCode === 'openai'
        && isOpenAiCompatibleGroup
        && selectedVendorSet.has('openai_compatible')
      ));
    if (!groupMatchesSelectedVendors) {
      return false;
    }
  }

  const selectedCapabilitySet = new Set(
    selectedCapabilities.map(normalizeChannelCapabilityCode).filter(Boolean),
  );
  if (selectedCapabilitySet.size === 0) {
    return true;
  }
  const groupCapabilities = channelAiResourceGroupCapabilityCodes(group);
  return groupCapabilities.length > 0
    && groupCapabilities.every((capability) => selectedCapabilitySet.has(capability));
}

export function channelAiResourceCapabilityCodes(resource: ChannelAiResourceVisibilityInput): string[] {
  const primaryCapability = normalizeChannelCapabilityCode(resource.capability ?? '');
  if (primaryCapability) {
    return [primaryCapability];
  }
  const modalityCapability = normalizeChannelCapabilityCode(resource.modalityCode ?? '');
  if (modalityCapability) {
    return [modalityCapability];
  }
  return uniqueStrings((resource.capabilities ?? [])
    .map(normalizeChannelCapabilityCode)
    .filter(Boolean));
}

export function channelAiResourceGroupCapabilityCodes(group: ChannelAiResourceGroupVisibilityInput): string[] {
  const primaryCapabilities = uniqueStrings([
    group.capability ?? '',
  ].map(normalizeChannelCapabilityCode).filter(Boolean));
  if (primaryCapabilities.length > 0) {
    return primaryCapabilities;
  }
  return uniqueStrings((group.capabilities ?? [])
    .map(normalizeChannelCapabilityCode)
    .filter(Boolean));
}

export function channelAiResourceGroupVendorCodes(group: ChannelAiResourceGroupVisibilityInput): string[] {
  return uniqueStrings((group.vendorCodes ?? [])
    .map(normalizeChannelVendorCode)
    .filter(Boolean));
}

export function deriveChannelTargetVendorCodes(
  input: DeriveChannelTargetVendorCodesInput,
): string[] {
  const accountVendorCode = normalizeChannelVendorCode(input.accountVendor);
  if (resolveSelectionType(input.channelType) === 'official') {
    return [accountVendorCode];
  }

  const vendorCodes = [
    ...(input.modelMappings ?? []).map(vendorCodeFromModelMapping).filter(isNonEmptyString),
    ...(input.resourceCodes ?? []).map(vendorCodeFromVendorResource).filter(isNonEmptyString),
  ];
  return uniqueStrings(vendorCodes.length > 0 ? vendorCodes : [accountVendorCode]);
}

export function reconcileChannelVendorSelection(
  input: ReconcileChannelVendorSelectionInput,
): ReconciledChannelVendorSelection {
  const selectionType = resolveSelectionType(input.channelType);
  const accountVendorCode = normalizeChannelVendorCode(input.accountVendor);
  const selectedVendorCodes = selectionType === 'official'
    ? [accountVendorCode]
    : uniqueStrings(input.selectedVendorCodes.map(normalizeChannelVendorCode))
      .filter(Boolean);
  const effectiveVendorCodes = selectedVendorCodes.length > 0 ? selectedVendorCodes : [accountVendorCode];
  const selectedResourceCodes = uniqueStrings((input.selectedResourceCodes ?? [])
    .map(normalizeChannelResourceCode)
    .filter(Boolean));
  const availableResourceCodes = new Set([
    ...(input.availableResourceCodes ?? []).map(normalizeChannelResourceCode).filter(Boolean),
    ...selectedResourceCodes,
  ]);
  const nonVendorResourceCodes = selectedResourceCodes.filter((code) => !isVendorResourceCode(code));
  const managedVendorResourceCodes = effectiveVendorCodes
    .map(vendorResourceCode)
    .filter((code) => availableResourceCodes.has(code));

  return {
    selectedVendorCodes: effectiveVendorCodes,
    selectedResourceCodes: uniqueStrings([...nonVendorResourceCodes, ...managedVendorResourceCodes]),
  };
}

function resolveSelectionType(value: string | undefined): ChannelVendorSelectionType {
  return value === 'relay' ? 'relay' : 'official';
}

function vendorCodeFromCatalogModel(model: string): string | undefined {
  const normalized = model.trim();
  if (!isCatalogModelKey(normalized)) {
    return undefined;
  }
  return normalizeChannelVendorCode(normalized.split('/')[0] ?? '');
}

function vendorCodeFromModelMapping(
  mapping: { targetVendorCode?: string; targetModel?: string },
): string | undefined {
  const targetVendorCode = normalizeChannelVendorCode(mapping.targetVendorCode ?? '');
  if (targetVendorCode) {
    return targetVendorCode;
  }
  return mapping.targetModel ? vendorCodeFromCatalogModel(mapping.targetModel) : undefined;
}

function vendorCodeFromVendorResource(resourceCode: string): string | undefined {
  const normalized = normalizeChannelResourceCode(resourceCode);
  if (!normalized.startsWith('vendor.')) {
    return undefined;
  }
  return normalizeChannelVendorCode(normalized.slice('vendor.'.length));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}
