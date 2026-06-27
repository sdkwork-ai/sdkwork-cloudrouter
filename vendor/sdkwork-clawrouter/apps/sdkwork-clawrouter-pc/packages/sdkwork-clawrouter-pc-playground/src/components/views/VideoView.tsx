import { useTranslation } from 'react-i18next';
import { createFallbackModel, PlaygroundModelPicker } from '../PlaygroundModelPicker';
import { AssetGenerationPanel } from '../AssetGenerationPanel';
import { SharedHistoryView } from './SharedHistoryView';
import type { PlaygroundAssetViewProps } from '../../playgroundTypes';

export function VideoView({
  agentHistory,
  setPreviewItem,
  modelGroups,
  selectedModelId,
  setSelectedModelId,
  showModelMenu,
  setShowModelMenu,
  onSubmitGeneration,
  submitting,
  submitError,
}: PlaygroundAssetViewProps) {
  const { t } = useTranslation();
  const fallbackVideoModel = createFallbackModel('Video 1.5', t('playground.modelFallback.video'), '1.5', 'videos', t('common.status.pending'));

  return (
    <div className="relative z-10 flex h-full w-full flex-row bg-[#0a0a0a]">
      <div className="relative z-20 flex w-[450px] shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#151515] xl:w-[510px]">
        <div className="shrink-0 px-4 pt-6">
          <PlaygroundModelPicker
            bucket="videos"
            modelGroups={modelGroups}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            showModelMenu={showModelMenu}
            setShowModelMenu={setShowModelMenu}
            fallback={fallbackVideoModel}
          />
        </div>

        <AssetGenerationPanel
          modality="video"
          placeholderKey="playground.videoPromptPlaceholder"
          modelGroups={modelGroups}
          selectedModelId={selectedModelId}
          onSubmitGeneration={onSubmitGeneration}
          submitting={submitting}
          submitError={submitError}
        />
      </div>

      <SharedHistoryView agentHistory={agentHistory} setPreviewItem={setPreviewItem} modality="video" />
    </div>
  );
}
