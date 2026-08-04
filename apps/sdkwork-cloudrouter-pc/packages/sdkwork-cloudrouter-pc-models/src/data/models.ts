export type ModelPricingStatus = 'customer' | 'reference' | 'unavailable';

export type ModelReferencePrice = {
  regionCode: string;
  billingMeter: string;
  unitPrice: number;
  currency: string;
};

export type ModelPricing = {
  input: number;
  output: number;
  cachedInput?: number;
  unavailableFields?: Array<'input' | 'output' | 'cachedInput'>;
  referencePrices?: ModelReferencePrice[];
  unit: string;
  currency: string;
  status?: ModelPricingStatus;
  reason?: string;
};

export type ModelGroupKey = string;
export type ModelCategoryKey = 'Recommended' | 'Open Source' | 'Proprietary' | 'Free' | 'New';

export type Model = {
  id: string;
  modelId: string;
  vendorCode: string;
  name: string;
  provider: string;
  modality: 'Text' | 'Image' | 'Video' | 'Audio' | 'Music';
  context: string;
  groups: ModelGroupKey[];
  categories: ModelCategoryKey[];
  pricing: ModelPricing;
  description: string;
  capabilities: string[];
  capabilityIntro?: string;
  limitations?: string[];
  supportedLanguages?: string[];
  apiFormat?: string;
  parameters?: Record<string, string>;
  latency: string;
  throughput: string;
  ttft?: string;
  maxOutput?: string;
  trainingData?: string;
  useCases?: string[];
};
