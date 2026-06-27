import { useEffect, useRef, useState } from 'react';
import { FileAudio, FileVideo, Gauge, Image as ImageIcon, Images, Loader2, Mic2, Music, Repeat, SlidersHorizontal, Sparkles, Timer, Upload, Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createDefaultSdkworkGenerationAssetConfig,
  estimateSdkworkGenerationCredits,
  findFirstSdkworkGenerationModelForModality,
  findSdkworkGenerationModelById,
  getSdkworkGenerationDurationOptions,
  reconcileSdkworkGenerationAssetConfig,
  serializeSdkworkGenerationAssetConfig,
  updateSdkworkGenerationImageModeConfig,
  updateSdkworkGenerationSfxModeConfig,
  updateSdkworkGenerationSpeechModeConfig,
  updateSdkworkGenerationVideoModeConfig,
  type SdkworkGenerationAssetConfig,
  type SdkworkGenerationCreditEstimate,
  type SdkworkGenerationSfxModeConfig,
  type SdkworkGenerationSpeechModeConfig,
} from '@sdkwork/generations-pc-workspace/generation-asset-config';
import { toExternalUrlMediaResource, type ClawRouterMediaResource } from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  PlaygroundGenerationSubmitInput,
  PlaygroundGenerationTargetType,
  PlaygroundModelGroup,
  PlaygroundReferenceAssetInput,
  PlaygroundReferenceAssetKind,
  PlaygroundReferenceAssetRole,
  PlaygroundReferenceImageInput,
} from '../playgroundTypes';
import {
  resolveReferenceImageCapability,
  type ReferenceImageCapability,
} from '../referenceImageCapability';
import {
  resolveVideoReferenceCapability,
  resolveVideoReferenceAssetRole,
  resolveVideoReferenceKindLimit,
  resolveVideoReferenceModeUpload,
  VIDEO_REFERENCE_MODE_ORDER,
  type VideoReferenceCapability,
  type VideoReferenceMode,
  type VideoReferenceModeUpload,
} from '../videoReferenceCapability';
import { ImageGenerationModePopup } from './ImageGenerationModePopup';
import { VideoGenerationModePopup } from './VideoGenerationModePopup';

type AssetGenerationConfig = SdkworkGenerationAssetConfig;

interface ReferenceImagePreview {
  id: string;
  metadata: PlaygroundReferenceImageInput;
  previewSrc: string;
}

interface ReferenceAssetPreview {
  id: string;
  metadata: PlaygroundReferenceAssetInput;
  previewSrc: string;
}

export function AssetGenerationPanel({
  modality,
  placeholderKey,
  modelGroups,
  selectedModelId,
  onSubmitGeneration,
  submitting,
  submitError,
}: {
  modality: PlaygroundGenerationTargetType;
  placeholderKey: string;
  modelGroups: PlaygroundModelGroup[];
  selectedModelId: string;
  onSubmitGeneration: (input: PlaygroundGenerationSubmitInput) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const referenceImageUrlsRef = useRef<string[]>([]);
  const referenceAssetUrlsRef = useRef<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImagePreview[]>([]);
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAssetPreview[]>([]);
  const [videoReferenceMode, setVideoReferenceMode] = useState<VideoReferenceMode>('text_to_video');
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null);
  const [referenceAssetUploadError, setReferenceAssetUploadError] = useState<string | null>(null);
  const [config, setConfig] = useState<AssetGenerationConfig>(() => createPlaygroundAssetConfig(modality));

  const selectedModel = findSdkworkGenerationModelById(modelGroups, selectedModelId)
    ?? findFirstSdkworkGenerationModelForModality(modelGroups, modality);
  const referenceImageCapacity = resolveReferenceImageCapability(modality, selectedModel);
  const videoReferenceCapability = resolveVideoReferenceCapability(modality, selectedModel);
  const activeVideoReferenceMode = videoReferenceCapability.supportedModes.includes(videoReferenceMode)
    ? videoReferenceMode
    : videoReferenceCapability.supportedModes[0] ?? 'text_to_video';
  const activeVideoReferenceUpload = resolveVideoReferenceModeUpload(videoReferenceCapability, activeVideoReferenceMode);
  const normalizedPrompt = prompt.trim();
  const canSubmit = normalizedPrompt.length > 0 && !submitting && Boolean(selectedModel);
  const creditEstimate = estimateSdkworkGenerationCredits({
    config,
    modality,
    model: selectedModel,
    unavailableDetail: 'playground.generationCost.settlement',
  });

  useEffect(() => {
    setConfig((current) => reconcileSdkworkGenerationAssetConfig(current, modality));
  }, [modality]);

  useEffect(() => () => {
    referenceImageUrlsRef.current.forEach((referenceImageUrl) => URL.revokeObjectURL(referenceImageUrl));
    referenceAssetUrlsRef.current.forEach((referenceAssetUrl) => URL.revokeObjectURL(referenceAssetUrl));
    referenceImageUrlsRef.current = [];
    referenceAssetUrlsRef.current = [];
  }, []);

  useEffect(() => {
    setReferenceImages((current) => {
      const next = current.slice(0, referenceImageCapacity.maxImages);
      if (next.length === current.length) {
        return current;
      }
      revokeRemovedReferenceImageUrls(current, next);
      referenceImageUrlsRef.current = next.map((referenceImage) => referenceImage.previewSrc);
      return next;
    });
    setReferenceUploadError(null);
  }, [referenceImageCapacity.maxImages]);

  useEffect(() => {
    if (!videoReferenceCapability.supportedModes.includes(videoReferenceMode)) {
      setVideoReferenceMode(videoReferenceCapability.supportedModes[0] ?? 'text_to_video');
    }
  }, [videoReferenceCapability.supportedModes, videoReferenceMode]);

  useEffect(() => {
    setReferenceAssets((current) => {
      const next = normalizeReferenceAssetsForMode(current, activeVideoReferenceMode, videoReferenceCapability);
      if (next === current) {
        return current;
      }
      revokeRemovedReferenceAssetUrls(current, next);
      referenceAssetUrlsRef.current = next.map((referenceAsset) => referenceAsset.previewSrc);
      return next;
    });
    setReferenceAssetUploadError(null);
  }, [
    activeVideoReferenceMode,
    activeVideoReferenceUpload.maxFiles,
    videoReferenceCapability.maxAudio,
    videoReferenceCapability.maxImages,
    videoReferenceCapability.maxVideos,
  ]);

  const replaceReferenceImages = (updater: (current: ReferenceImagePreview[]) => ReferenceImagePreview[]) => {
    setReferenceImages((current) => {
      const next = updater(current);
      revokeRemovedReferenceImageUrls(current, next);
      referenceImageUrlsRef.current = next.map((referenceImage) => referenceImage.previewSrc);
      return next;
    });
  };

  const replaceReferenceAssets = (updater: (current: ReferenceAssetPreview[]) => ReferenceAssetPreview[]) => {
    setReferenceAssets((current) => {
      const next = updater(current);
      revokeRemovedReferenceAssetUrls(current, next);
      referenceAssetUrlsRef.current = next.map((referenceAsset) => referenceAsset.previewSrc);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    await onSubmitGeneration({
      prompt: normalizedPrompt,
      selectedModality: modality,
      targetType: modality,
      selectedModel: selectedModel?.id || undefined,
      generationConfig: serializeSdkworkGenerationAssetConfig(config, modality),
      referenceAssets: referenceAssets.map((referenceAsset) => referenceAsset.metadata),
      referenceImages: referenceImages.map((referenceImage) => referenceImage.metadata),
      referenceMode: modality === 'video' ? activeVideoReferenceMode : undefined,
    });

    setPrompt('');
    setReferenceUploadError(null);
    setReferenceAssetUploadError(null);
    replaceReferenceImages(() => []);
    replaceReferenceAssets(() => []);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6">
        <div className="flex flex-col gap-4">
          {submitError && (
            <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {submitError}
            </div>
          )}

          {modality === 'image' && (
            <ReferenceImageUploader
              onAddReferenceImages={(nextReferenceImages) => {
                replaceReferenceImages((current) => [
                  ...current,
                  ...nextReferenceImages,
                ].slice(0, referenceImageCapacity.maxImages));
              }}
              onRemoveReferenceImage={(referenceImageId) => {
                replaceReferenceImages((current) => current.filter((referenceImage) => referenceImage.id !== referenceImageId));
              }}
              onUploadError={setReferenceUploadError}
              referenceImageCapacity={referenceImageCapacity}
              referenceImages={referenceImages}
              uploadError={referenceUploadError}
            />
          )}

          {modality === 'video' && (
            <VideoReferenceAssetUploader
              mode={activeVideoReferenceMode}
              modeUpload={activeVideoReferenceUpload}
              onAddReferenceAssets={(nextReferenceAssets) => {
                replaceReferenceAssets((current) => normalizeReferenceAssetsForMode(
                  [
                    ...current,
                    ...nextReferenceAssets,
                  ],
                  activeVideoReferenceMode,
                  videoReferenceCapability,
                ));
              }}
              onChangeMode={(nextMode) => {
                setVideoReferenceMode(nextMode);
                setReferenceAssetUploadError(null);
              }}
              onRemoveReferenceAsset={(referenceAssetId) => {
                replaceReferenceAssets((current) => current.filter((referenceAsset) => referenceAsset.id !== referenceAssetId));
              }}
              onUploadError={setReferenceAssetUploadError}
              referenceAssets={referenceAssets}
              uploadError={referenceAssetUploadError}
              videoReferenceCapability={videoReferenceCapability}
            />
          )}

          <div className="flex flex-col overflow-hidden rounded-lg border border-white/5 bg-[#1a1a1a] shadow-sm transition-colors focus-within:border-indigo-500/50">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              className="custom-scrollbar min-h-[180px] w-full resize-none bg-transparent p-4 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder={t(placeholderKey)}
            />
          </div>

          <GenerationConfigControls
            config={config}
            modality={modality}
            onChange={setConfig}
          />
        </div>
      </div>

      <GenerationBottomActionBar
        canSubmit={canSubmit}
        config={config}
        creditEstimate={creditEstimate}
        modality={modality}
        onChangeConfig={setConfig}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}

function GenerationBottomActionBar({
  canSubmit,
  config,
  creditEstimate,
  modality,
  onChangeConfig,
  onSubmit,
  submitting,
}: {
  canSubmit: boolean;
  config: AssetGenerationConfig;
  creditEstimate: SdkworkGenerationCreditEstimate;
  modality: PlaygroundGenerationTargetType;
  onChangeConfig: (config: AssetGenerationConfig) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const estimateDetail = creditEstimate.detail.startsWith('playground.')
    ? t(creditEstimate.detail)
    : creditEstimate.detail;
  const costLabel = creditEstimate.points === null
    ? t('playground.generationCost.unavailable')
    : t('playground.generationCost.points', { points: formatPoints(creditEstimate.points) });
  const outputLabel = generationOutputLabel(modality, config, t);

  return (
    <div className="z-30 shrink-0" title={estimateDetail}>
      {modality === 'video' && config.videoMode ? (
        <VideoGenerationModePopup
          canGenerate={canSubmit}
          config={config.videoMode}
          isGenerating={submitting}
          onChangeConfig={(videoConfig) => onChangeConfig(updateSdkworkGenerationVideoModeConfig(config, videoConfig))}
          onGenerate={onSubmit}
        />
      ) : modality === 'image' && config.imageMode ? (
        <ImageGenerationModePopup
          canGenerate={canSubmit}
          config={config.imageMode}
          isGenerating={submitting}
          onChangeConfig={(imageConfig) => onChangeConfig(updateSdkworkGenerationImageModeConfig(config, imageConfig))}
          onGenerate={onSubmit}
          showCost={creditEstimate.points ?? undefined}
        />
      ) : (
        <div className="flex h-[64px] items-center gap-2 border-t border-white/10 bg-[#151515]/95 px-4 shadow-[0_-10px_20px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="min-w-0 flex-1" />

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
            {creditEstimate.reference && (
              <span className="shrink-0 whitespace-nowrap rounded bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                {t('playground.generationCost.reference')}
              </span>
            )}
            <GenerationSubmitButton
              canSubmit={canSubmit}
              costLabel={costLabel}
              onSubmit={onSubmit}
              outputLabel={outputLabel}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GenerationSubmitButton({
  canSubmit,
  costLabel,
  onSubmit,
  outputLabel,
  submitting,
}: {
  canSubmit: boolean;
  costLabel: string;
  onSubmit: () => Promise<void>;
  outputLabel: string;
  submitting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={!canSubmit}
      onClick={() => {
        void onSubmit();
      }}
      className={`flex h-9 w-[214px] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-all ${
        canSubmit
          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 shadow-lg shadow-cyan-400/30'
          : 'cursor-not-allowed bg-gray-700 text-gray-500'
      }`}
    >
      {submitting ? (
        <span className="flex w-full items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : (
        <>
          <span className="shrink-0">{t('playground.generate')}</span>
          <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold opacity-75">{outputLabel}</span>
          <span className="shrink-0 text-xs font-bold">{costLabel}</span>
        </>
      )}
    </button>
  );
}

function ReferenceImageUploader({
  referenceImages,
  referenceImageCapacity,
  uploadError,
  onAddReferenceImages,
  onRemoveReferenceImage,
  onUploadError,
}: {
  referenceImages: ReferenceImagePreview[];
  referenceImageCapacity: ReferenceImageCapability;
  uploadError: string | null;
  onAddReferenceImages: (referenceImages: ReferenceImagePreview[]) => void;
  onRemoveReferenceImage: (referenceImageId: string) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();
  const remainingSlots = Math.max(0, referenceImageCapacity.maxImages - referenceImages.length);
  const canUpload = referenceImageCapacity.enabled && remainingSlots > 0;

  return (
    <div className="rounded-lg border border-white/5 bg-[#1a1a1a] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-300">
            {t('playground.referenceAssets')}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {referenceImageCapacity.enabled
              ? t('playground.referenceImage.capacity', { count: referenceImages.length, max: referenceImageCapacity.maxImages })
              : t('playground.referenceImage.unsupported')}
          </div>
        </div>
        <ReferenceImageUploadButton
          canUpload={canUpload}
          onAddReferenceImages={onAddReferenceImages}
          onUploadError={onUploadError}
          referenceImageCapacity={referenceImageCapacity}
          remainingSlots={remainingSlots}
        />
      </div>

      {referenceImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {referenceImages.map((referenceImage) => (
            <div key={referenceImage.id} className="group relative aspect-square overflow-hidden rounded-lg border border-white/5 bg-[#202020]">
              <img
                src={referenceImage.previewSrc}
                alt={referenceImage.metadata.name || t('playground.referenceAssets')}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-slate-200">
                <div className="truncate">{referenceImage.metadata.name || t('playground.referenceAssets')}</div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveReferenceImage(referenceImage.id)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-slate-200 opacity-0 transition-opacity hover:bg-red-500/80 group-hover:opacity-100"
                title={t('playground.referenceImage.remove')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {canUpload && (
            <ReferenceImageUploadTile
              onAddReferenceImages={onAddReferenceImages}
              onUploadError={onUploadError}
              referenceImageCapacity={referenceImageCapacity}
              remainingSlots={remainingSlots}
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#202020] text-center text-xs text-slate-500">
          {referenceImageCapacity.enabled ? (
            <ReferenceImageInlineUpload
              onAddReferenceImages={onAddReferenceImages}
              onUploadError={onUploadError}
              referenceImageCapacity={referenceImageCapacity}
              remainingSlots={remainingSlots}
            />
          ) : (
            <span>{t('playground.referenceImage.unsupported')}</span>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-2 text-xs text-red-300">{uploadError}</div>
      )}
    </div>
  );
}

function ReferenceImageUploadButton({
  canUpload,
  referenceImageCapacity,
  remainingSlots,
  onAddReferenceImages,
  onUploadError,
}: {
  canUpload: boolean;
  referenceImageCapacity: ReferenceImageCapability;
  remainingSlots: number;
  onAddReferenceImages: (referenceImages: ReferenceImagePreview[]) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <label
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-white/5 px-2.5 text-xs font-semibold transition-colors ${
        canUpload
          ? 'cursor-pointer bg-[#222] text-slate-300 hover:border-white/10 hover:text-white'
          : 'cursor-not-allowed bg-[#202020] text-slate-600'
      }`}
    >
      <Upload className="h-3.5 w-3.5" />
      <span className="whitespace-nowrap">{t('playground.referenceImage.upload')}</span>
      <ReferenceImageFileInput
        disabled={!canUpload}
        onAddReferenceImages={onAddReferenceImages}
        onUploadError={onUploadError}
        referenceImageCapacity={referenceImageCapacity}
        remainingSlots={remainingSlots}
      />
    </label>
  );
}

function ReferenceImageUploadTile({
  referenceImageCapacity,
  remainingSlots,
  onAddReferenceImages,
  onUploadError,
}: {
  referenceImageCapacity: ReferenceImageCapability;
  remainingSlots: number;
  onAddReferenceImages: (referenceImages: ReferenceImagePreview[]) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#202020] p-3 text-center text-xs font-semibold text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200">
      <ImageIcon className="h-5 w-5" />
      <span>{t('playground.referenceImage.upload')}</span>
      <ReferenceImageFileInput
        onAddReferenceImages={onAddReferenceImages}
        onUploadError={onUploadError}
        referenceImageCapacity={referenceImageCapacity}
        remainingSlots={remainingSlots}
      />
    </label>
  );
}

function ReferenceImageInlineUpload({
  referenceImageCapacity,
  remainingSlots,
  onAddReferenceImages,
  onUploadError,
}: {
  referenceImageCapacity: ReferenceImageCapability;
  remainingSlots: number;
  onAddReferenceImages: (referenceImages: ReferenceImagePreview[]) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 font-semibold text-slate-400 transition-colors hover:text-cyan-200">
      <ImageIcon className="h-4 w-4" />
      <span>{t('playground.referenceImage.upload')}</span>
      <ReferenceImageFileInput
        onAddReferenceImages={onAddReferenceImages}
        onUploadError={onUploadError}
        referenceImageCapacity={referenceImageCapacity}
        remainingSlots={remainingSlots}
      />
    </label>
  );
}

function ReferenceImageFileInput({
  disabled = false,
  referenceImageCapacity,
  remainingSlots,
  onAddReferenceImages,
  onUploadError,
}: {
  disabled?: boolean;
  referenceImageCapacity: ReferenceImageCapability;
  remainingSlots: number;
  onAddReferenceImages: (referenceImages: ReferenceImagePreview[]) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <input
      type="file"
      accept="image/*"
      multiple={referenceImageCapacity.maxImages > 1}
      disabled={disabled}
      className="sr-only"
      onChange={(event) => {
        const selectedFiles = Array.from(event.currentTarget.files ?? []);
        const files = selectedFiles.slice(0, remainingSlots);
        if (selectedFiles.length > remainingSlots) {
          onUploadError(t('playground.referenceImage.tooMany', { max: referenceImageCapacity.maxImages }));
        } else {
          onUploadError(null);
        }
        if (files.length > 0) {
          void Promise.all(files.map(async (file, index): Promise<ReferenceImagePreview> => {
            const referenceImageDataUrl = await readReferenceImageDataUrl(file);
            return {
              id: createReferenceImagePreviewId(file, index),
              metadata: {
                name: file.name,
                mimeType: file.type,
                resource: createUploadedReferenceMediaResource(referenceImageDataUrl, 'image', file.name, file.type, file.size),
                sizeBytes: file.size,
              },
              previewSrc: URL.createObjectURL(file),
            };
          }))
            .then(onAddReferenceImages)
            .catch((error) => {
              const message = error instanceof Error && error.message !== 'playground.referenceImage.readFailed'
                ? error.message
                : t('playground.referenceImage.readFailed');
              onUploadError(message);
            });
        }
        event.currentTarget.value = '';
      }}
    />
  );
}

function VideoReferenceAssetUploader({
  mode,
  modeUpload,
  referenceAssets,
  uploadError,
  videoReferenceCapability,
  onAddReferenceAssets,
  onChangeMode,
  onRemoveReferenceAsset,
  onUploadError,
}: {
  mode: VideoReferenceMode;
  modeUpload: VideoReferenceModeUpload;
  referenceAssets: ReferenceAssetPreview[];
  uploadError: string | null;
  videoReferenceCapability: VideoReferenceCapability;
  onAddReferenceAssets: (referenceAssets: ReferenceAssetPreview[]) => void;
  onChangeMode: (mode: VideoReferenceMode) => void;
  onRemoveReferenceAsset: (referenceAssetId: string) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();
  const remainingSlots = Math.max(0, modeUpload.maxFiles - referenceAssets.length);
  const canUpload = modeUpload.maxFiles > 0 && remainingSlots > 0 && modeUpload.accept.length > 0;

  return (
    <div className="rounded-lg border border-white/5 bg-[#1a1a1a] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-300">
            {t('playground.referenceAssets')}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {videoReferenceCapability.enabled
              ? t('playground.referenceAsset.capacity', { count: referenceAssets.length, max: modeUpload.maxFiles })
              : t('playground.referenceAsset.unsupported')}
          </div>
        </div>
        <label
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-white/5 px-2.5 text-xs font-semibold transition-colors ${
            canUpload
              ? 'cursor-pointer bg-[#222] text-slate-300 hover:border-white/10 hover:text-white'
              : 'cursor-not-allowed bg-[#202020] text-slate-600'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">{t('playground.referenceAsset.upload')}</span>
          <VideoReferenceAssetFileInput
            disabled={!canUpload}
            mode={mode}
            modeUpload={modeUpload}
            onAddReferenceAssets={onAddReferenceAssets}
            onUploadError={onUploadError}
            referenceAssets={referenceAssets}
            remainingSlots={remainingSlots}
            videoReferenceCapability={videoReferenceCapability}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        {VIDEO_REFERENCE_MODE_ORDER.map((item) => {
          const enabled = videoReferenceCapability.supportedModes.includes(item);
          const selected = item === mode;
          const Icon = VIDEO_REFERENCE_MODE_ICONS[item];
          return (
            <button
              key={item}
              type="button"
              disabled={!enabled}
              onClick={() => onChangeMode(item)}
              className={`flex min-h-[74px] flex-col items-start justify-between rounded-lg border p-2 text-left transition-colors ${
                selected
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
                  : enabled
                    ? 'border-white/5 bg-[#202020] text-slate-300 hover:border-white/10 hover:text-white'
                    : 'cursor-not-allowed border-white/5 bg-[#181818] text-slate-600'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="mt-2 text-xs font-semibold leading-tight">{t(VIDEO_REFERENCE_MODE_LABEL_KEYS[item])}</span>
              <span className="mt-1 line-clamp-2 text-[10px] leading-snug opacity-70">{t(VIDEO_REFERENCE_MODE_DESCRIPTION_KEYS[item])}</span>
            </button>
          );
        })}
      </div>

      {modeUpload.maxFiles > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {referenceAssets.map((referenceAsset) => (
            <VideoReferenceAssetTile
              key={referenceAsset.id}
              onRemove={() => onRemoveReferenceAsset(referenceAsset.id)}
              referenceAsset={referenceAsset}
            />
          ))}
          {canUpload && (
            <label className="flex aspect-square min-h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#202020] p-3 text-center text-xs font-semibold text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200">
              <Upload className="h-5 w-5" />
              <span>{t('playground.referenceAsset.upload')}</span>
              <VideoReferenceAssetFileInput
                mode={mode}
                modeUpload={modeUpload}
                onAddReferenceAssets={onAddReferenceAssets}
                onUploadError={onUploadError}
                referenceAssets={referenceAssets}
                remainingSlots={remainingSlots}
                videoReferenceCapability={videoReferenceCapability}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#202020] px-3 text-center text-xs text-slate-500">
          {t(mode === 'text_to_video' ? 'playground.referenceAsset.textOnly' : 'playground.referenceAsset.unsupported')}
        </div>
      )}

      {uploadError && (
        <div className="mt-2 text-xs text-red-300">{uploadError}</div>
      )}
    </div>
  );
}

function VideoReferenceAssetTile({
  referenceAsset,
  onRemove,
}: {
  referenceAsset: ReferenceAssetPreview;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const Icon = referenceAsset.metadata.kind === 'audio'
    ? FileAudio
    : referenceAsset.metadata.kind === 'video'
      ? FileVideo
      : ImageIcon;
  return (
    <div className="group relative aspect-square min-h-[104px] overflow-hidden rounded-lg border border-white/5 bg-[#202020]">
      {referenceAsset.metadata.kind === 'image' ? (
        <img
          src={referenceAsset.previewSrc}
          alt={referenceAsset.metadata.name || t('playground.referenceAssets')}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-slate-400">
          <Icon className="h-8 w-8" />
          <span className="max-w-full truncate text-xs font-semibold">{referenceAsset.metadata.name}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[10px] text-slate-200">
        <div className="truncate">{t(VIDEO_REFERENCE_ROLE_LABEL_KEYS[referenceAsset.metadata.role])}</div>
        <div className="truncate text-slate-400">{referenceAsset.metadata.name || t('playground.referenceAssets')}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-slate-200 opacity-0 transition-opacity hover:bg-red-500/80 group-hover:opacity-100"
        title={t('playground.referenceImage.remove')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function VideoReferenceAssetFileInput({
  disabled = false,
  mode,
  modeUpload,
  referenceAssets,
  remainingSlots,
  videoReferenceCapability,
  onAddReferenceAssets,
  onUploadError,
}: {
  disabled?: boolean;
  mode: VideoReferenceMode;
  modeUpload: VideoReferenceModeUpload;
  referenceAssets: ReferenceAssetPreview[];
  remainingSlots: number;
  videoReferenceCapability: VideoReferenceCapability;
  onAddReferenceAssets: (referenceAssets: ReferenceAssetPreview[]) => void;
  onUploadError: (message: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <input
      type="file"
      accept={modeUpload.accept}
      multiple={modeUpload.maxFiles > 1}
      disabled={disabled}
      className="sr-only"
      onChange={(event) => {
        const selectedFiles = Array.from(event.currentTarget.files ?? []);
        const kindCounts = countReferenceAssetsByKind(referenceAssets);
        const acceptedFiles: Array<{
          file: File;
          kind: PlaygroundReferenceAssetKind;
          kindIndex: number;
        }> = [];
        let skippedByKind = false;
        let skippedByTotal = false;

        selectedFiles.forEach((file) => {
          if (acceptedFiles.length >= remainingSlots) {
            skippedByTotal = true;
            return;
          }

          const kind = readReferenceAssetKind(file);
          if (!kind) {
            skippedByKind = true;
            return;
          }

          const kindLimit = resolveVideoReferenceKindLimit(videoReferenceCapability, mode, kind);
          if (kindLimit <= 0 || kindCounts[kind] >= kindLimit) {
            skippedByKind = true;
            return;
          }

          acceptedFiles.push({
            file,
            kind,
            kindIndex: kindCounts[kind],
          });
          kindCounts[kind] += 1;
        });

        if (skippedByTotal) {
          onUploadError(t('playground.referenceAsset.tooMany', { max: modeUpload.maxFiles }));
        } else if (skippedByKind) {
          onUploadError(t('playground.referenceAsset.filteredByMode'));
        } else {
          onUploadError(null);
        }
        if (acceptedFiles.length > 0) {
          void Promise.all(acceptedFiles.map(async ({ file, kind, kindIndex }, index): Promise<ReferenceAssetPreview> => {
            const encodedReference = await readReferenceAssetDataUrl(file);
            return {
              id: createReferenceAssetPreviewId(file, index),
              metadata: {
                kind,
                role: resolveVideoReferenceAssetRole(mode, kind, kindIndex),
                name: file.name,
                mimeType: file.type,
                resource: createUploadedReferenceMediaResource(encodedReference, kind, file.name, file.type, file.size),
                sizeBytes: file.size,
              },
              previewSrc: URL.createObjectURL(file),
            };
          }))
            .then(onAddReferenceAssets)
            .catch((error) => {
              const message = error instanceof Error && error.message !== 'playground.referenceAsset.readFailed'
                ? error.message
                : t('playground.referenceAsset.readFailed');
              onUploadError(message);
            });
        }
        event.currentTarget.value = '';
      }}
    />
  );
}

function GenerationConfigControls({
  modality,
  config,
  onChange,
}: {
  modality: PlaygroundGenerationTargetType;
  config: AssetGenerationConfig;
  onChange: (config: AssetGenerationConfig) => void;
}) {
  const { t } = useTranslation();
  const showDuration = modality !== 'image' && modality !== 'video';
  if (!showDuration) {
    return null;
  }

  const durationOptions = getSdkworkGenerationDurationOptions(modality);

  return (
    <div className="grid gap-3">
      {modality === 'audio' && config.speechMode && (
        <SpeechGenerationControls
          config={config.speechMode}
          onChangeConfig={(speechMode) => onChange(updateSdkworkGenerationSpeechModeConfig(config, speechMode))}
        />
      )}

      {modality === 'sfx' && config.sfxMode && (
        <SfxGenerationControls
          config={config.sfxMode}
          onChangeConfig={(sfxMode) => onChange(updateSdkworkGenerationSfxModeConfig(config, sfxMode))}
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-400">{t('playground.duration')}</span>
          <span className="font-mono text-slate-500">{config.durationSeconds}s</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {durationOptions.map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => onChange({ ...config, durationSeconds: duration })}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                config.durationSeconds === duration
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/5 bg-[#1f1f1f] text-slate-400 hover:border-white/10 hover:text-slate-200'
              }`}
            >
              {modality === 'music' ? <Music className="h-3.5 w-3.5" /> : modality === 'audio' || modality === 'sfx' ? <Volume2 className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
              {duration}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SfxGenerationControls({
  config,
  onChangeConfig,
}: {
  config: SdkworkGenerationSfxModeConfig;
  onChangeConfig: (config: SdkworkGenerationSfxModeConfig) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 rounded-lg border border-white/5 bg-[#1a1a1a] p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Volume2 className="h-3.5 w-3.5" />
            {t('playground.sfx.format')}
          </span>
          <select
            value={config.responseFormat ?? 'mp3'}
            onChange={(event) => onChangeConfig({
              ...config,
              responseFormat: event.target.value as SdkworkGenerationSfxModeConfig['responseFormat'],
            })}
            className="h-9 rounded-md border border-white/5 bg-[#222] px-2 text-xs font-semibold text-slate-200 outline-none transition-colors hover:border-white/10 focus:border-cyan-400/40"
          >
            {SFX_RESPONSE_FORMAT_OPTIONS.map((format) => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-white/5 bg-[#222] px-3 py-2 transition-colors hover:border-white/10">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Repeat className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('playground.sfx.loop')}</span>
          </span>
          <input
            type="checkbox"
            checked={config.loop}
            onChange={(event) => onChangeConfig({
              ...config,
              loop: event.target.checked,
            })}
            className="h-4 w-4 shrink-0 accent-cyan-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('playground.sfx.promptInfluence')}
          </span>
          <span className="font-mono text-slate-500">{Math.round((config.promptInfluence ?? 0.3) * 100)}%</span>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.promptInfluence ?? 0.3}
          onChange={(event) => onChangeConfig({
            ...config,
            promptInfluence: Number(event.target.value),
          })}
          className="h-2 w-full accent-cyan-400"
        />
      </label>
    </div>
  );
}

function SpeechGenerationControls({
  config,
  onChangeConfig,
}: {
  config: SdkworkGenerationSpeechModeConfig;
  onChangeConfig: (config: SdkworkGenerationSpeechModeConfig) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 rounded-lg border border-white/5 bg-[#1a1a1a] p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Mic2 className="h-3.5 w-3.5" />
            {t('playground.speech.voice')}
          </span>
          <select
            value={config.voice ?? ''}
            onChange={(event) => onChangeConfig({
              ...config,
              voice: event.target.value || undefined,
            })}
            className="h-9 rounded-md border border-white/5 bg-[#222] px-2 text-xs font-semibold text-slate-200 outline-none transition-colors hover:border-white/10 focus:border-cyan-400/40"
          >
            <option value="">{t('playground.speech.voiceAuto')}</option>
            {SPEECH_VOICE_OPTIONS.map((voice) => (
              <option key={voice} value={voice}>{voice}</option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Volume2 className="h-3.5 w-3.5" />
            {t('playground.speech.format')}
          </span>
          <select
            value={config.responseFormat ?? 'mp3'}
            onChange={(event) => onChangeConfig({
              ...config,
              responseFormat: event.target.value as SdkworkGenerationSpeechModeConfig['responseFormat'],
            })}
            className="h-9 rounded-md border border-white/5 bg-[#222] px-2 text-xs font-semibold text-slate-200 outline-none transition-colors hover:border-white/10 focus:border-cyan-400/40"
          >
            {SPEECH_RESPONSE_FORMAT_OPTIONS.map((format) => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-slate-400">
            <Gauge className="h-3.5 w-3.5" />
            {t('playground.speech.speed')}
          </span>
          <span className="font-mono text-slate-500">{(config.speed ?? 1).toFixed(2)}x</span>
        </span>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.05"
          value={config.speed ?? 1}
          onChange={(event) => onChangeConfig({
            ...config,
            speed: Number(event.target.value),
          })}
          className="h-2 w-full accent-cyan-400"
        />
      </label>
    </div>
  );
}

function createPlaygroundAssetConfig(modality: PlaygroundGenerationTargetType): AssetGenerationConfig {
  return createDefaultSdkworkGenerationAssetConfig(modality);
}

function revokeRemovedReferenceImageUrls(
  previous: readonly ReferenceImagePreview[],
  next: readonly ReferenceImagePreview[],
): void {
  const nextUrls = new Set(next.map((referenceImage) => referenceImage.previewSrc));
  previous.forEach((referenceImage) => {
    if (!nextUrls.has(referenceImage.previewSrc)) {
      URL.revokeObjectURL(referenceImage.previewSrc);
    }
  });
}

function revokeRemovedReferenceAssetUrls(
  previous: readonly ReferenceAssetPreview[],
  next: readonly ReferenceAssetPreview[],
): void {
  const nextUrls = new Set(next.map((referenceAsset) => referenceAsset.previewSrc));
  previous.forEach((referenceAsset) => {
    if (!nextUrls.has(referenceAsset.previewSrc)) {
      URL.revokeObjectURL(referenceAsset.previewSrc);
    }
  });
}

function createUploadedReferenceMediaResource(
  encodedReference: string,
  kind: PlaygroundReferenceAssetKind,
  fileName: string,
  mimeType: string,
  sizeBytes: number,
): ClawRouterMediaResource {
  const resource = toExternalUrlMediaResource(encodedReference, kind);
  if (!resource) {
    throw new Error('playground.referenceAsset.readFailed');
  }
  return {
    ...resource,
    fileName,
    mimeType: mimeType || undefined,
    sizeBytes: String(sizeBytes),
    title: fileName,
  };
}

function normalizeReferenceAssetsForMode(
  assets: ReferenceAssetPreview[],
  mode: VideoReferenceMode,
  capability: VideoReferenceCapability,
): ReferenceAssetPreview[] {
  const modeUpload = resolveVideoReferenceModeUpload(capability, mode);
  const kindCounts = createEmptyReferenceAssetKindCounts();
  const next: ReferenceAssetPreview[] = [];
  let changed = false;

  assets.forEach((asset) => {
    if (next.length >= modeUpload.maxFiles) {
      changed = true;
      return;
    }

    const kindLimit = resolveVideoReferenceKindLimit(capability, mode, asset.metadata.kind);
    if (kindLimit <= 0 || kindCounts[asset.metadata.kind] >= kindLimit) {
      changed = true;
      return;
    }

    const nextRole = resolveVideoReferenceAssetRole(mode, asset.metadata.kind, kindCounts[asset.metadata.kind]);
    kindCounts[asset.metadata.kind] += 1;

    if (asset.metadata.role !== nextRole) {
      changed = true;
      next.push({
        ...asset,
        metadata: {
          ...asset.metadata,
          role: nextRole,
        },
      });
      return;
    }

    next.push(asset);
  });

  return changed ? next : assets;
}

function countReferenceAssetsByKind(assets: readonly ReferenceAssetPreview[]): Record<PlaygroundReferenceAssetKind, number> {
  const counts = createEmptyReferenceAssetKindCounts();
  assets.forEach((asset) => {
    counts[asset.metadata.kind] += 1;
  });
  return counts;
}

function createEmptyReferenceAssetKindCounts(): Record<PlaygroundReferenceAssetKind, number> {
  return {
    audio: 0,
    image: 0,
    video: 0,
  };
}

function createReferenceImagePreviewId(file: File, index: number): string {
  const safeName = file.name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'reference-image';
  return [
    safeName,
    file.size,
    file.lastModified,
    index,
    Math.random().toString(36).slice(2, 8),
  ].join('-');
}

function createReferenceAssetPreviewId(file: File, index: number): string {
  const safeName = file.name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'reference-asset';
  return [
    safeName,
    file.size,
    file.lastModified,
    index,
    Math.random().toString(36).slice(2, 8),
  ].join('-');
}

function readReferenceAssetKind(file: File): PlaygroundReferenceAssetKind | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return null;
}

function generationOutputLabel(
  modality: PlaygroundGenerationTargetType,
  config: AssetGenerationConfig,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (modality === 'image') {
    return t('playground.generationOutput.images', { count: config.imageCount });
  }
  return t('playground.generationOutput.items', { count: 1 });
}

function readReferenceImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('playground.referenceImage.readFailed'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('playground.referenceImage.readFailed'));
    };
    reader.readAsDataURL(file);
  });
}

function readReferenceAssetDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('playground.referenceAsset.readFailed'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('playground.referenceAsset.readFailed'));
    };
    reader.readAsDataURL(file);
  });
}

function formatPoints(value: number): string {
  return value.toLocaleString('en-US');
}

const SPEECH_VOICE_OPTIONS = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'Kore',
  'Puck',
  'Charon',
  'Fenrir',
  'Aoede',
] as const;

const SPEECH_RESPONSE_FORMAT_OPTIONS: NonNullable<SdkworkGenerationSpeechModeConfig['responseFormat']>[] = [
  'mp3',
  'wav',
  'aac',
  'flac',
  'opus',
  'pcm',
];

const SFX_RESPONSE_FORMAT_OPTIONS: NonNullable<SdkworkGenerationSfxModeConfig['responseFormat']>[] = [
  'mp3',
  'wav',
];

const VIDEO_REFERENCE_MODE_ICONS = {
  text_to_video: Sparkles,
  first_frame: ImageIcon,
  first_last_frame: Timer,
  multi_reference: Images,
  omni_reference: SlidersHorizontal,
} satisfies Record<VideoReferenceMode, typeof Sparkles>;

const VIDEO_REFERENCE_MODE_LABEL_KEYS = {
  text_to_video: 'playground.videoReference.mode.textToVideo',
  first_frame: 'playground.videoReference.mode.firstFrame',
  first_last_frame: 'playground.videoReference.mode.firstLastFrame',
  multi_reference: 'playground.videoReference.mode.multiReference',
  omni_reference: 'playground.videoReference.mode.omniReference',
} satisfies Record<VideoReferenceMode, string>;

const VIDEO_REFERENCE_MODE_DESCRIPTION_KEYS = {
  text_to_video: 'playground.videoReference.mode.textToVideo.desc',
  first_frame: 'playground.videoReference.mode.firstFrame.desc',
  first_last_frame: 'playground.videoReference.mode.firstLastFrame.desc',
  multi_reference: 'playground.videoReference.mode.multiReference.desc',
  omni_reference: 'playground.videoReference.mode.omniReference.desc',
} satisfies Record<VideoReferenceMode, string>;

const VIDEO_REFERENCE_ROLE_LABEL_KEYS = {
  first_frame: 'playground.videoReference.role.firstFrame',
  last_frame: 'playground.videoReference.role.lastFrame',
  reference_image: 'playground.videoReference.role.referenceImage',
  reference_audio: 'playground.videoReference.role.referenceAudio',
  reference_video: 'playground.videoReference.role.referenceVideo',
} satisfies Record<PlaygroundReferenceAssetRole, string>;
