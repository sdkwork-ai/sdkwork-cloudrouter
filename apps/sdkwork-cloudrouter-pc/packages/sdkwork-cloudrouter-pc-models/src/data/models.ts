export type ModelPricingStatus = 'customer' | 'reference' | 'unavailable';

export type ModelPricingScheduleWindow = {
  windowCode: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  endDayOffset: 0 | 1;
  holidayOnly: boolean;
};

export type ModelPricingSchedule = {
  timeZone: string;
  weeklyWindows: ModelPricingScheduleWindow[];
  includeDates: string[];
  excludeDates: string[];
  holidayDates: string[];
};

export type ModelReferencePrice = {
  regionCode: string;
  billingMeter: string;
  unitPrice: number;
  currency: string;
  /** Stable identity of the catalog rate row; absent for legacy fixtures. */
  rateHash?: string;
  rateVariant?: 'standard' | 'time_window' | 'batch';
  schedule?: ModelPricingSchedule;
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
