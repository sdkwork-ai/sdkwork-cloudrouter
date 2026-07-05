import type {
  SdkworkGenerationArtifact,
  SdkworkGenerationHistoryItem,
  SdkworkGenerationMedia,
} from '@sdkwork/generations-pc-workspace/generation-history';
import type {
  SdkworkGenerationAssetModality,
  SdkworkGenerationModelBucket,
  SdkworkGenerationSerializedAssetConfig,
} from '@sdkwork/generations-pc-workspace/generation-asset-config';
import type { ClawRouterMediaResource } from '@sdkwork/clawroutes-pc-commons/runtime';

export type PlaygroundMedia = SdkworkGenerationMedia;

export type PlaygroundModelBucket = SdkworkGenerationModelBucket;

export type PlaygroundGenerationTargetType = SdkworkGenerationAssetModality;

export type PlaygroundGenerationRunStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PlaygroundGenerationConfig = SdkworkGenerationSerializedAssetConfig;

export interface PlaygroundReferenceImageInput {
  name: string;
  mimeType?: string;
  resource: ClawRouterMediaResource;
  sizeBytes?: number;
}

export type PlaygroundReferenceAssetKind = 'image' | 'audio' | 'video';

export type PlaygroundReferenceAssetRole =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_audio'
  | 'reference_video';

export type PlaygroundReferenceAssetMode =
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'first_frame'
  | 'first_last_frame'
  | 'multi_reference'
  | 'omni_reference';

export interface PlaygroundReferenceAssetInput {
  kind: 'image' | 'audio' | 'video';
  role: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_audio' | 'reference_video';
  name: string;
  mimeType?: string;
  resource: ClawRouterMediaResource;
  sizeBytes?: number;
}

export type PlaygroundGenerationArtifact = SdkworkGenerationArtifact;

export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem;

export interface GenerationAgentRunCreateInput {
  prompt: string;
  targetType?: PlaygroundGenerationTargetType;
  selectedModel?: string;
  generationConfig?: PlaygroundGenerationConfig;
  referenceAssets?: PlaygroundReferenceAssetInput[];
  referenceImages?: PlaygroundReferenceImageInput[];
  referenceMode?: PlaygroundReferenceAssetMode;
  onDelta?: (delta: string) => void;
  onArtifact?: (artifact: PlaygroundGenerationArtifact) => void;
}

export interface PlaygroundGenerationSubmitInput {
  prompt: string;
  selectedModality: PlaygroundGenerationTargetType | 'agent';
  targetType?: PlaygroundGenerationTargetType;
  selectedModel?: string;
  generationConfig?: PlaygroundGenerationConfig;
  referenceAssets?: PlaygroundReferenceAssetInput[];
  referenceImages?: PlaygroundReferenceImageInput[];
  referenceMode?: PlaygroundReferenceAssetMode;
  onDelta?: (delta: string) => void;
  onArtifact?: (artifact: PlaygroundGenerationArtifact) => void;
}

export interface GenerationAgentSnapshot {
  id: string;
  versionId: string;
  name: string;
  model?: string;
}

export type GenerationAgentRunStatus = 'queued' | 'planning' | 'running' | 'waiting_for_tool' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationAgentRunSnapshot {
  id: string;
  requestId: string;
  source: 'generation-agent';
  status: GenerationAgentRunStatus;
}

export type GenerationAgentStepType =
  | 'input'
  | 'memory_retrieval'
  | 'model_call'
  | 'skill_call'
  | 'mcp_tool_call'
  | 'media_generation'
  | 'metering'
  | 'output';

export type GenerationAgentStepStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface GenerationAgentRunStepSnapshot {
  id: string;
  index: number;
  type: GenerationAgentStepType;
  status: GenerationAgentStepStatus;
  title: string;
}

export type GenerationAgentMeteringEventType =
  | 'token'
  | 'image'
  | 'video'
  | 'audio'
  | 'tool'
  | 'mcp'
  | 'skill'
  | 'storage'
  | 'network';

export interface GenerationAgentUsageFactMetadata {
  agentId: string;
  agentVersionId: string;
  runId: string;
  stepId: string;
  userId: string;
  skillId?: string;
  mcpServerId?: string;
  toolId?: string;
  meteringSource: 'agent-runtime';
}

export interface GenerationAgentMeteringEvent {
  type: GenerationAgentMeteringEventType;
  quantity: string;
  usageFactMetadata: GenerationAgentUsageFactMetadata;
}

export interface GenerationAgentUsageSummary {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  imageCount: number;
  videoSeconds: string;
  events: GenerationAgentMeteringEvent[];
}

export interface GenerationAgentRunCreateResult {
  agent: GenerationAgentSnapshot;
  item: PlaygroundHistoryItem;
  meteringEvents: GenerationAgentMeteringEvent[];
  run: GenerationAgentRunSnapshot;
  steps: GenerationAgentRunStepSnapshot[];
  targetType?: PlaygroundGenerationTargetType;
  status: PlaygroundGenerationRunStatus;
  usage: GenerationAgentUsageSummary;
}

export type PlaygroundPreviewSetter = (item: PlaygroundHistoryItem) => void;

export interface PlaygroundModelVendor {
  code: string;
  name: string;
}

export interface PlaygroundModelReferencePrice {
  regionCode: string;
  billingMeter: string;
  unitPrice: string;
  currency: string;
}

export interface PlaygroundModelPriceAvailability {
  status: 'reference' | 'unavailable';
  reason?: string | null;
}

export interface PlaygroundModelOption {
  id: string;
  catalogKey: string;
  model: string;
  name: string;
  displayName: string;
  desc: string;
  description?: string;
  ver: string;
  versionLabel: string;
  vendorCode: string;
  vendorName: string;
  modalities: string[];
  inputModalities: string[];
  outputModalities: string[];
  capabilities: string[];
  apiFormat?: string;
  contextTokens?: number;
  maxOutputTokens?: number;
  officialReferencePrices: PlaygroundModelReferencePrice[];
  priceAvailability: PlaygroundModelPriceAvailability;
  providerCodes: string[];
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsJsonSchema: boolean;
}

export interface PlaygroundModelGroup {
  id: string;
  vendor: PlaygroundModelVendor;
  llms: PlaygroundModelOption[];
  images: PlaygroundModelOption[];
  videos: PlaygroundModelOption[];
  audios: PlaygroundModelOption[];
  music: PlaygroundModelOption[];
  sfx: PlaygroundModelOption[];
}

export interface PlaygroundAssetViewProps {
  agentHistory: PlaygroundHistoryItem[];
  setPreviewItem: PlaygroundPreviewSetter;
  modelGroups: PlaygroundModelGroup[];
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  showModelMenu: boolean;
  setShowModelMenu: (value: boolean) => void;
  onSubmitGeneration: (input: PlaygroundGenerationSubmitInput) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}
