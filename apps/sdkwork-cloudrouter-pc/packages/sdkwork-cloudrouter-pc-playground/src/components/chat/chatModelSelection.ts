import type { PlaygroundModelGroup, PlaygroundModelOption } from '../../playgroundTypes';

export interface ChatInputModelSelection {
  displayModel: PlaygroundModelOption | null;
  selectedModel: PlaygroundModelOption | null;
  submitModel: PlaygroundModelOption | null;
}

export type ChatInputSubmitBlockReason =
  | 'playground.chat.input.disabled.emptyPrompt'
  | 'playground.chat.input.disabled.generating'
  | 'playground.chat.input.disabled.loadingHistory'
  | 'playground.chat.input.disabled.loadingModels'
  | 'playground.chat.input.disabled.modelLoadFailed'
  | 'playground.chat.input.disabled.modelNotStreaming'
  | 'playground.chat.input.disabled.modelUnavailable'
  | 'playground.chat.input.disabled.modelUnrouted'
  | 'playground.chat.input.disabled.noCallableModel';

export interface ChatInputSubmitBlockReasonInput {
  loadingHistory: boolean;
  loadingModels?: boolean;
  modelGroups: PlaygroundModelGroup[];
  modelLoadError?: string | null;
  normalizedPrompt: string;
  selectedModelId: string;
  submitting: boolean;
}

export function isCallableChatModel(model: PlaygroundModelOption): boolean {
  return model.supportsStreaming && model.providerCodes.length > 0;
}

export function findChatModel(groups: PlaygroundModelGroup[], modelId: string): PlaygroundModelOption | null {
  const normalizedModelId = modelId.trim();
  if (!normalizedModelId) {
    return null;
  }
  for (const group of groups) {
    const model = group.llms.find((item) => item.id === normalizedModelId);
    if (model) {
      return model;
    }
  }
  return null;
}

export function findCallableChatModel(groups: PlaygroundModelGroup[], modelId: string): PlaygroundModelOption | null {
  const model = findChatModel(groups, modelId);
  return model && isCallableChatModel(model) ? model : null;
}

export function firstCallableChatModel(groups: PlaygroundModelGroup[]): PlaygroundModelOption | null {
  for (const group of groups) {
    const model = group.llms.find(isCallableChatModel);
    if (model) {
      return model;
    }
  }
  return null;
}

export function resolveChatInputModelSelection(
  groups: PlaygroundModelGroup[],
  selectedModelId: string,
): ChatInputModelSelection {
  const selectedModel = findChatModel(groups, selectedModelId);
  const fallbackCallableModel = firstCallableChatModel(groups);
  const displayModel = selectedModel || fallbackCallableModel;
  let submitModel = fallbackCallableModel;
  if (selectedModel) {
    submitModel = isCallableChatModel(selectedModel) ? selectedModel : null;
  }

  return {
    displayModel,
    selectedModel,
    submitModel,
  };
}

export function resolveChatInputSubmitBlockReason(
  input: ChatInputSubmitBlockReasonInput,
): ChatInputSubmitBlockReason | null {
  if (input.submitting) {
    return 'playground.chat.input.disabled.generating';
  }
  if (input.loadingModels) {
    return 'playground.chat.input.disabled.loadingModels';
  }
  if (input.loadingHistory) {
    return 'playground.chat.input.disabled.loadingHistory';
  }
  if (input.modelLoadError) {
    return 'playground.chat.input.disabled.modelLoadFailed';
  }
  if (!input.normalizedPrompt) {
    return 'playground.chat.input.disabled.emptyPrompt';
  }

  const selection = resolveChatInputModelSelection(input.modelGroups, input.selectedModelId);
  if (selection.submitModel) {
    return null;
  }

  const selectedModel = selection.selectedModel;
  if (selectedModel) {
    if (selectedModel.providerCodes.length === 0) {
      return 'playground.chat.input.disabled.modelUnrouted';
    }
    if (!selectedModel.supportsStreaming) {
      return 'playground.chat.input.disabled.modelNotStreaming';
    }
    return 'playground.chat.input.disabled.modelUnavailable';
  }

  return 'playground.chat.input.disabled.noCallableModel';
}
