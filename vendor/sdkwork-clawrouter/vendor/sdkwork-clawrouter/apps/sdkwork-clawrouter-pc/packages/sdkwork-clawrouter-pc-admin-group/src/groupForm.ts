import type {
  GroupCreateInput,
  GroupPriceReferenceMode,
  GroupUpdateInput,
} from './groupService';

export function createGroupInputFromForm(formData: FormData): GroupCreateInput {
  return {
    groupName: readRequiredFormText(formData, 'groupName'),
    ...readPricingFields(formData),
    groupType: readGroupType(formData.get('groupType')),
    capacity: { total: readPositiveInteger(formData.get('capacityTotal'), 'capacityTotal') },
    status: readGroupStatus(formData.get('status')),
    ...readResourceAccessFields(formData),
  };
}

export function createGroupUpdateInputFromForm(formData: FormData): GroupUpdateInput {
  return {
    groupName: readRequiredFormText(formData, 'groupName'),
    ...readPricingFields(formData),
    groupType: readGroupType(formData.get('groupType')),
    capacity: { total: readPositiveInteger(formData.get('capacityTotal'), 'capacityTotal') },
    status: readGroupStatus(formData.get('status')),
    ...readResourceAccessFields(formData),
  };
}

export function displayGroupType(type: 'public' | 'dedicated'): string {
  return type === 'dedicated' ? 'dedicated' : 'public';
}

export function displayGroupStatus(status: 'active' | 'disabled'): string {
  return status === 'disabled' ? 'disabled' : 'active';
}

function readPricingFields(formData: FormData): Pick<
  GroupCreateInput,
  'priceReferenceMode' | 'rateMultiplier' | 'officialPriceMultiplier'
> {
  const priceReferenceMode = readPriceReferenceMode(formData.get('priceReferenceMode'));
  if (priceReferenceMode === 'official_price') {
    return {
      priceReferenceMode,
      officialPriceMultiplier: readPositiveNumber(
        formData.get('officialPriceMultiplier'),
        'officialPriceMultiplier',
      ),
    };
  }
  return {
    priceReferenceMode,
    rateMultiplier: readPositiveNumber(formData.get('rateMultiplier'), 'rateMultiplier'),
  };
}

function readFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readRequiredFormText(formData: FormData, key: string): string {
  const value = readFormText(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function readStringListFormValues(formData: FormData, key: string): string[] {
  return Array.from(new Set(
    formData
      .getAll(key)
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean),
  ));
}

function readResourceAccessFields(
  formData: FormData,
): Pick<GroupCreateInput, 'resourceGroupCodes' | 'resourceCodes'> {
  return {
    ...(formData.has('resourceGroupCodes')
      ? { resourceGroupCodes: readStringListFormValues(formData, 'resourceGroupCodes') }
      : {}),
    ...(formData.has('resourceCodes')
      ? { resourceCodes: readStringListFormValues(formData, 'resourceCodes') }
      : {}),
  };
}

function readPositiveNumber(value: FormDataEntryValue | null, fieldName: string): number {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  return parsed;
}

function readPositiveInteger(value: FormDataEntryValue | null, fieldName: string): number {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function readPriceReferenceMode(value: FormDataEntryValue | null): GroupPriceReferenceMode {
  if (typeof value !== 'string') {
    throw new Error('priceReferenceMode must be multiplier or official_price');
  }
  const normalized = value.trim();
  if (normalized === 'multiplier' || normalized === 'official_price') {
    return normalized;
  }
  throw new Error('priceReferenceMode must be multiplier or official_price');
}

function readGroupType(value: FormDataEntryValue | null): GroupCreateInput['groupType'] {
  if (typeof value !== 'string') {
    throw new Error('groupType must be public or dedicated');
  }
  const normalized = value.trim();
  if (normalized === 'public' || normalized === 'dedicated') {
    return normalized;
  }
  throw new Error('groupType must be public or dedicated');
}

function readGroupStatus(value: FormDataEntryValue | null): GroupCreateInput['status'] {
  if (typeof value !== 'string') {
    return 'active';
  }
  const normalized = value.trim();
  if (!normalized || normalized === 'active') {
    return 'active';
  }
  if (normalized === 'disabled') {
    return 'disabled';
  }
  throw new Error('status must be active or disabled');
}
