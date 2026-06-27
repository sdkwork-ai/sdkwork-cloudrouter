import type {
  PlaygroundGenerationTargetType,
  PlaygroundModelOption,
} from './playgroundTypes';

export interface ReferenceImageCapability {
  enabled: boolean;
  maxImages: number;
}

export function resolveReferenceImageCapability(
  modality: PlaygroundGenerationTargetType,
  model: PlaygroundModelOption | null | undefined,
): ReferenceImageCapability {
  if (modality !== 'image' || !model) {
    return { enabled: false, maxImages: 0 };
  }

  const capabilityTokens = createReferenceImageCapabilityTokenSet(model.capabilities);
  const inputTokens = createReferenceImageCapabilityTokenSet(model.inputModalities);
  const outputTokens = createReferenceImageCapabilityTokenSet(model.outputModalities);
  const descriptorTokens = createReferenceImageCapabilityTokenSet([
    model.apiFormat,
    model.catalogKey,
    model.displayName,
    model.id,
    model.model,
    model.name,
  ]);
  const allTokens = new Set([
    ...capabilityTokens,
    ...inputTokens,
    ...outputTokens,
    ...descriptorTokens,
  ]);

  const canOutputImage = outputTokens.has('image')
    || hasAnyReferenceImageToken(capabilityTokens, IMAGE_OUTPUT_CAPABILITY_TOKENS);
  const canAcceptReferenceImage = inputTokens.has('image')
    || hasAnyReferenceImageToken(capabilityTokens, SINGLE_REFERENCE_IMAGE_CAPABILITY_TOKENS);
  if (!canOutputImage || !canAcceptReferenceImage) {
    return { enabled: false, maxImages: 0 };
  }

  if (hasAnyReferenceImageToken(allTokens, MULTI_REFERENCE_IMAGE_CAPABILITY_TOKENS)
    || hasKnownMultiReferenceImageModel(descriptorTokens)) {
    return { enabled: true, maxImages: 4 };
  }

  return { enabled: true, maxImages: 1 };
}

function createReferenceImageCapabilityTokenSet(values: readonly (string | null | undefined)[]): Set<string> {
  return new Set(values.flatMap((value) => normalizeReferenceImageCapabilityTokens(value)));
}

function normalizeReferenceImageCapabilityTokens(value: string | null | undefined): string[] {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!normalized) {
    return [];
  }
  return [normalized, ...normalized.split('_').filter(Boolean)];
}

function hasAnyReferenceImageToken(tokens: ReadonlySet<string>, expectedTokens: ReadonlySet<string>): boolean {
  return Array.from(expectedTokens).some((expectedToken) => tokens.has(expectedToken));
}

function hasKnownMultiReferenceImageModel(tokens: ReadonlySet<string>): boolean {
  return Array.from(tokens).some((token) => (
    token.startsWith('gpt_image_')
    || token.startsWith('gemini_')
    || token.startsWith('doubao_seedream_')
    || token.startsWith('seedream_')
  ));
}

const IMAGE_OUTPUT_CAPABILITY_TOKENS = new Set([
  'image',
  'image_generation',
  'image_edit',
  'image_editing',
  'image_to_image',
]);

const SINGLE_REFERENCE_IMAGE_CAPABILITY_TOKENS = new Set([
  'image_edit',
  'image_editing',
  'image_reference',
  'image_to_image',
  'image_variation',
  'reference_image',
  'vision',
]);

const MULTI_REFERENCE_IMAGE_CAPABILITY_TOKENS = new Set([
  'image_edit_multi',
  'image_reference_multi',
  'multi_image',
  'multi_image_reference',
  'multi_reference_image',
  'multiple_image_reference',
]);
