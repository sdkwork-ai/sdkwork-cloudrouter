import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlaygroundModelPicker, createFallbackModel } from '../PlaygroundModelPicker';
import {
  findCallableChatModel,
  findChatModel,
  isCallableChatModel,
  resolveChatInputModelSelection,
  resolveChatInputSubmitBlockReason,
} from './chatModelSelection';
import type { SimpleChatInputSubmit } from './chatTypes';
import type { PlaygroundModelGroup, PlaygroundModelOption } from '../../playgroundTypes';

const FALLBACK_CHAT_MODEL = createFallbackModel('Chat model', 'Chat model catalog is being prepared', 'AI', 'llms', 'Claw Router');
const SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY = 'sdkwork-clawrouter.playground.chat.selectedModelId';
const flatComposer = 'rounded-[26px] bg-[#1c1c20]/95 p-3 backdrop-blur-xl';

interface StoredSimpleChatModelPreference {
  id: string;
  catalogKey: string;
  vendorCode: string;
  region: string;
  model: string;
  providerCodes: string[];
}

export function SimpleChatInput({
  modelGroups,
  loadingModels = false,
  modelLoadError = null,
  selectedModelId,
  setSelectedModelId,
  loadingHistory = false,
  onSubmit,
  onStop,
  submitting = false,
  onHeightChange,
}: {
  modelGroups: PlaygroundModelGroup[];
  loadingModels?: boolean;
  modelLoadError?: string | null;
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  loadingHistory?: boolean;
  onSubmit: (input: SimpleChatInputSubmit) => Promise<boolean> | boolean;
  onStop?: () => Promise<void> | void;
  submitting?: boolean;
  onHeightChange?: (heightPx: number) => void;
}) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const restoredStoredModelPreferenceRef = useRef<string | null>(null);
  const modelSelection = useMemo(
    () => resolveChatInputModelSelection(modelGroups, selectedModelId),
    [modelGroups, selectedModelId],
  );
  const displaySelectedModel = modelSelection.displayModel;
  const submitModel = modelSelection.submitModel;
  const normalizedPrompt = prompt.trim();
  const hasSubmittableModel = Boolean(submitModel);
  const submitBlockReason = resolveChatInputSubmitBlockReason({
    loadingHistory,
    loadingModels,
    modelGroups,
    modelLoadError,
    normalizedPrompt,
    selectedModelId,
    submitting,
  });
  const canSubmit = !submitBlockReason && hasSubmittableModel;
  const canStop = Boolean(submitting && onStop);
  const sendButtonTooltip = submitting
    ? t('playground.chat.input.stop')
    : submitBlockReason
      ? t(submitBlockReason)
      : t('playground.chat.input.send');

  useEffect(() => {
    if (modelGroups.length === 0) {
      return;
    }

    const storedPreference = loadStoredSimpleChatModelPreference();
    if (!storedPreference) {
      restoredStoredModelPreferenceRef.current = '';
      return;
    }

    const storedPreferenceKey = createStoredSimpleChatModelPreferenceKey(storedPreference);
    if (restoredStoredModelPreferenceRef.current === storedPreferenceKey) {
      return;
    }

    const restoredModel = findStoredCallableSimpleChatModel(modelGroups, storedPreference);
    if (!restoredModel) {
      restoredStoredModelPreferenceRef.current = '';
      removeStoredSimpleChatModelPreference();
      return;
    }

    restoredStoredModelPreferenceRef.current = storedPreferenceKey;
    saveStoredSimpleChatModelPreference(restoredModel);
    if (restoredModel.id !== selectedModelId) {
      setSelectedModelId(restoredModel.id);
    }
  }, [modelGroups, selectedModelId, setSelectedModelId]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 88), 240);
    textarea.style.height = `${nextHeight}px`;
  }, [prompt]);

  useLayoutEffect(() => {
    const element = composerRef.current;
    if (!element) {
      return;
    }
    const reportHeight = () => {
      onHeightChange?.(Math.ceil(element.getBoundingClientRect().height));
    };
    reportHeight();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      reportHeight();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [onHeightChange]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    const submitted = await onSubmit({
      prompt: normalizedPrompt,
      selectedModelId: submitModel!.id,
    });
    if (submitted) {
      setPrompt('');
    }
    textareaRef.current?.focus();
  };

  const handleSelectModel = (modelId: string) => {
    const selectedModel = findChatModel(modelGroups, modelId);
    if (selectedModel && isCallableChatModel(selectedModel)) {
      saveStoredSimpleChatModelPreference(selectedModel);
    } else {
      removeStoredSimpleChatModelPreference();
    }
    setSelectedModelId(modelId);
  };

  return (
    <div ref={composerRef} className={flatComposer}>
      <div className="rounded-[20px] bg-[#151519] px-4 py-3 transition-colors focus-within:bg-[#19191e]">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            setIsComposing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !isComposing) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          className="min-h-[88px] w-full resize-none overflow-hidden border-none bg-transparent text-[15px] leading-6 text-slate-100 outline-none placeholder:text-slate-500"
          placeholder={t('playground.chat.input.placeholder')}
        />
      </div>

      <div className="mt-2 flex flex-col gap-2 px-0.5 pb-0.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <div className="w-fit min-w-0 max-w-full flex-[0_1_auto]">
            <PlaygroundModelPicker
              bucket="llms"
              modelGroups={modelGroups}
              selectedModelId={displaySelectedModel?.id ?? ''}
              onSelectModel={handleSelectModel}
              showModelMenu={showModelMenu}
              setShowModelMenu={setShowModelMenu}
              fallback={FALLBACK_CHAT_MODEL}
              menuPlacement="top"
              compact
              variant="flat"
              disabled={submitting}
            />
          </div>

          {loadingHistory && (
            <div className="flex h-10 items-center rounded-full bg-white/5 px-3 text-[11px] text-slate-500">
              {t('playground.chat.messagesLoading')}
            </div>
          )}
          {!submitting && submitBlockReason && submitBlockReason !== 'playground.chat.input.disabled.emptyPrompt' && (
            <div
              className="min-h-10 min-w-0 rounded-full bg-amber-400/10 px-3 py-2 text-[11px] leading-4 text-amber-200"
              title={sendButtonTooltip}
            >
              <span className="line-clamp-2">{sendButtonTooltip}</span>
            </div>
          )}
        </div>

        <span className="inline-flex shrink-0" title={sendButtonTooltip}>
          <button
            type="button"
            disabled={submitting ? !canStop : !canSubmit}
            title={sendButtonTooltip}
            aria-label={sendButtonTooltip}
            onClick={() => {
              if (submitting) {
                void onStop?.();
                return;
              }
              void handleSubmit();
            }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
              submitting && canStop
                ? 'bg-rose-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.22)] hover:bg-rose-400 active:scale-95'
                : canSubmit
                  ? 'bg-white text-slate-950 shadow-[0_8px_24px_rgba(255,255,255,0.18)] hover:bg-slate-200 active:scale-95'
                  : 'cursor-not-allowed bg-white/6 text-slate-600 disabled:pointer-events-none'
            }`}
          >
            {submitting ? <Square className="h-3.5 w-3.5 fill-current" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </span>
      </div>
    </div>
  );
}

function readBrowserStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function loadStoredSimpleChatModelPreference(): StoredSimpleChatModelPreference | null {
  const store = readBrowserStorage();
  if (!store) {
    return null;
  }
  try {
    const raw = store.getItem(SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY)?.trim() ?? '';
    return parseStoredSimpleChatModelPreference(raw);
  } catch {
    return null;
  }
}

function saveStoredSimpleChatModelPreference(model: PlaygroundModelOption): void {
  const store = readBrowserStorage();
  if (!store) {
    return;
  }
  try {
    store.setItem(SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY, JSON.stringify(createStoredSimpleChatModelPreference(model)));
  } catch {
    // Ignore local storage quota or browser privacy mode failures.
  }
}

function removeStoredSimpleChatModelPreference(): void {
  const store = readBrowserStorage();
  if (!store) {
    return;
  }
  try {
    store.removeItem(SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY);
  } catch {
    // Ignore local storage quota or browser privacy mode failures.
  }
}

function createStoredSimpleChatModelPreference(model: PlaygroundModelOption): StoredSimpleChatModelPreference {
  return {
    id: model.id,
    catalogKey: model.catalogKey,
    vendorCode: model.vendorCode,
    region: readModelRegion(model),
    model: model.model,
    providerCodes: [...model.providerCodes],
  };
}

function parseStoredSimpleChatModelPreference(raw: string): StoredSimpleChatModelPreference | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'string') {
      return createLegacyStoredSimpleChatModelPreference(parsed);
    }
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const id = readStorageText(record.id);
    const catalogKey = readStorageText(record.catalogKey);
    const vendorCode = readStorageText(record.vendorCode);
    const region = readStorageText(record.region);
    const model = readStorageText(record.model);
    const providerCodes = readStorageTextArray(record.providerCodes);
    if (!id && !catalogKey && !vendorCode && !model && providerCodes.length === 0) {
      return null;
    }
    return {
      id,
      catalogKey,
      vendorCode,
      region,
      model,
      providerCodes,
    };
  } catch {
    return createLegacyStoredSimpleChatModelPreference(raw);
  }
}

function createLegacyStoredSimpleChatModelPreference(modelId: string): StoredSimpleChatModelPreference | null {
  const id = modelId.trim();
  if (!id) {
    return null;
  }
  return {
    id,
    catalogKey: '',
    vendorCode: '',
    region: '',
    model: '',
    providerCodes: [],
  };
}

function createStoredSimpleChatModelPreferenceKey(preference: StoredSimpleChatModelPreference): string {
  return [
    preference.id,
    preference.catalogKey,
    preference.vendorCode,
    preference.region,
    preference.model,
    ...preference.providerCodes,
  ].join('\n');
}

function findStoredCallableSimpleChatModel(
  groups: PlaygroundModelGroup[],
  preference: StoredSimpleChatModelPreference,
): PlaygroundModelOption | null {
  if (preference.id) {
    const model = findCallableChatModel(groups, preference.id);
    if (model) {
      return model;
    }
  }

  if (preference.catalogKey) {
    const model = findChatModelByCatalogKey(groups, preference.catalogKey);
    if (model) {
      return model;
    }
  }

  return findChatModelBySignature(groups, preference);
}

function findChatModelByCatalogKey(groups: PlaygroundModelGroup[], catalogKey: string): PlaygroundModelOption | null {
  const normalizedCatalogKey = catalogKey.trim();
  if (!normalizedCatalogKey) {
    return null;
  }
  for (const group of groups) {
    const model = group.llms.find((item) => item.catalogKey === normalizedCatalogKey && isCallableChatModel(item));
    if (model) {
      return model;
    }
  }
  return null;
}

function findChatModelBySignature(
  groups: PlaygroundModelGroup[],
  preference: StoredSimpleChatModelPreference,
): PlaygroundModelOption | null {
  if (!preference.vendorCode || !preference.model) {
    return null;
  }
  for (const group of groups) {
    const model = group.llms.find((item) => isCallableChatModel(item) && isSameStoredSimpleChatModel(item, preference));
    if (model) {
      return model;
    }
  }
  return null;
}

function isSameStoredSimpleChatModel(
  model: PlaygroundModelOption,
  preference: StoredSimpleChatModelPreference,
): boolean {
  if (model.vendorCode !== preference.vendorCode || model.model !== preference.model) {
    return false;
  }
  const region = readModelRegion(model);
  if (preference.region && region && region !== preference.region) {
    return false;
  }
  if (preference.providerCodes.length === 0 || model.providerCodes.length === 0) {
    return true;
  }
  return preference.providerCodes.some((providerCode) => model.providerCodes.includes(providerCode));
}

function readModelRegion(model: PlaygroundModelOption): string {
  const record = model as unknown as Record<string, unknown>;
  return readStorageText(record.regionCode) || readStorageText(record.region);
}

function readStorageText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStorageTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(readStorageText).filter(Boolean)
    : [];
}
