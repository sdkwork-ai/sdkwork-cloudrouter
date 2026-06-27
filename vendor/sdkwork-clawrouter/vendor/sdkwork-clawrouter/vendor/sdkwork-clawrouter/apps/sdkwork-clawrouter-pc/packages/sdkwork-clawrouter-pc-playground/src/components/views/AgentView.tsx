import { GenerationChatInput } from '../GenerationChatInput';
import { SharedHistoryView } from './SharedHistoryView';
import type { GenerationModality } from '../../pages/Playground';
import type {
  PlaygroundGenerationSubmitInput,
  PlaygroundHistoryItem,
  PlaygroundModelGroup,
  PlaygroundPreviewSetter,
} from '../../playgroundTypes';

export function AgentView({
  agentHistory,
  setPreviewItem,
  selectedModality,
  setSelectedModality,
  modelGroups,
  selectedModels,
  setSelectedModel,
  onSubmitGeneration,
  submitting,
  submitError,
}: {
  agentHistory: PlaygroundHistoryItem[];
  setPreviewItem: PlaygroundPreviewSetter;
  selectedModality: GenerationModality;
  setSelectedModality: (modality: GenerationModality) => void;
  modelGroups: PlaygroundModelGroup[];
  selectedModels: Record<GenerationModality, string>;
  setSelectedModel: (targetModality: GenerationModality) => (modelId: string) => void;
  onSubmitGeneration: (input: PlaygroundGenerationSubmitInput) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}) {
  return (
    <div className="relative z-10 flex h-full w-full flex-row bg-[#0a0a0a]">
      <div className="relative z-20 flex w-[450px] shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#151515] xl:w-[510px]">
        <GenerationChatInput
          selectedModality={selectedModality === 'agent' ? 'agent' : 'image'}
          setSelectedModality={setSelectedModality}
          modelGroups={modelGroups}
          selectedModels={selectedModels}
          setSelectedModel={setSelectedModel}
          onSubmit={onSubmitGeneration}
          submitting={submitting}
        />
        {submitError ? (
          <div className="px-4 pb-4 text-sm text-red-400">{submitError}</div>
        ) : null}
      </div>

      <SharedHistoryView agentHistory={agentHistory} setPreviewItem={setPreviewItem} modality="agent" />
    </div>
  );
}
