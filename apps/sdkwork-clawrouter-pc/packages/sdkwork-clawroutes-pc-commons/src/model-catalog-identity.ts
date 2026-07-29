export interface ModelCatalogIdentity {
  vendorCode: string;
  modelId: string;
  modelParts: string[];
}

export function parseModelCatalogIdentity(value: string): ModelCatalogIdentity | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parts = normalized.split('/').map((part) => part.trim());
  if (parts.length < 2 || parts.some((part) => part.length === 0) || isModelRegionSegment(parts[1] ?? '')) {
    return null;
  }
  const vendorCode = parts[0];
  if (!vendorCode) {
    return null;
  }
  return {
    vendorCode,
    modelId: parts.slice(1).join('/'),
    modelParts: parts.slice(1),
  };
}

export function isCanonicalModelCatalogKey(value: string): boolean {
  return parseModelCatalogIdentity(value) !== null;
}

export function isRegionalModelCatalogKey(value: string): boolean {
  const parts = value.trim().split('/').map((part) => part.trim());
  return parts.length >= 3 && parts.every((part) => part.length > 0) && isModelRegionSegment(parts[1] ?? '');
}

export function isModelRegionSegment(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if ([
    'global',
    'cn',
    'china',
    'mainland',
    'overseas',
    'international',
    'intl',
    'us',
    'eu',
    'ap',
    'apac',
    'jp',
    'sg',
    'hk',
    'local',
  ].includes(normalized)) {
    return true;
  }
  if (/^(?:af|ap|ca|cn|eu|il|me|sa|us)-[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.test(normalized)) {
    return true;
  }
  if (/^cn-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return true;
  }
  return [
    'eastus',
    'eastus2',
    'westus',
    'westus2',
    'westus3',
    'centralus',
    'northcentralus',
    'southcentralus',
    'westcentralus',
    'canadaeast',
    'canadacentral',
    'brazilsouth',
    'northeurope',
    'westeurope',
    'francecentral',
    'switzerlandnorth',
    'uksouth',
    'ukwest',
    'swedencentral',
    'norwayeast',
    'germanywestcentral',
    'italynorth',
    'polandcentral',
    'israelcentral',
    'qatarcentral',
    'uaenorth',
    'southafricanorth',
    'centralindia',
    'southindia',
    'westindia',
    'japaneast',
    'japanwest',
    'koreacentral',
    'koreasouth',
    'eastasia',
    'southeastasia',
    'australiaeast',
    'australiasoutheast',
    'australiacentral',
    'newzealandnorth',
    'malaysiawest',
    'indonesiacentral',
  ].includes(normalized);
}
