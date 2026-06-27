import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Image as ImageIcon, Video, Music, Plus, ArrowUp, ChevronDown, Activity, Package, Smile, Loader2 } from 'lucide-react';
import {
  createDefaultSdkworkGenerationAssetConfig,
  getSdkworkGenerationModelBucket,
  serializeSdkworkGenerationAssetConfig,
} from '@sdkwork/generations-pc-workspace/generation-asset-config';
import { PlaygroundModelPicker, createFallbackModel } from './PlaygroundModelPicker';
import type { GenerationModality, Modality } from '../pages/Playground';
import type {
  PlaygroundGenerationSubmitInput,
  PlaygroundGenerationTargetType,
  PlaygroundModelBucket,
  PlaygroundModelGroup,
} from '../playgroundTypes';

export function GenerationChatInput({
  selectedModality,
  setSelectedModality,
  modelGroups,
  selectedModels,
  setSelectedModel,
  onSubmit,
  submitting = false,
}: {
  selectedModality: GenerationModality,
  setSelectedModality: (m: GenerationModality) => void,
  modelGroups: PlaygroundModelGroup[],
  selectedModels: Record<GenerationModality, string>,
  setSelectedModel: (targetModality: GenerationModality) => (modelId: string) => void,
  onSubmit?: (input: PlaygroundGenerationSubmitInput) => Promise<void> | void,
  submitting?: boolean,
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showModalityMenu, setShowModalityMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowModalityMenu(false);
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModalityIcon = (m: GenerationModality) => {
    switch(m) {
      case 'agent': return <Bot className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Smile className="w-4 h-4" />;
      case 'music': return <Music className="w-4 h-4" />;
      case 'sfx': return <Activity className="w-4 h-4" />;
      case 'package': return <Package className="w-4 h-4" />;
    }
  };

  const modalityLabels: Record<GenerationModality, string> = {
    agent: t('playground.input.type.agent'),
    image: t('playground.input.type.image'),
    video: t('playground.input.type.video'),
    audio: t('playground.input.type.audio'),
    music: t('playground.input.type.music'),
    sfx: t('playground.input.type.sfx'),
    package: t('playground.input.type.package')
  };

  const currentPlaceholder = selectedModality === 'agent' ? t('playground.input.placeholder.agent') : t('playground.input.placeholder.generic');
  const selectedBucket = toModelBucket(selectedModality);
  const modelPickerFallback = useMemo(() => {
    if (!selectedBucket) {
      return null;
    }
    return createFallbackModel(
      t('playground.input.menu.model'),
      t('playground.modelPicker.noModels'),
      'AI',
      selectedBucket,
      t('common.status.pending'),
    );
  }, [selectedBucket, t]);
  const normalizedPrompt = prompt.trim();
  const canSubmit = Boolean(onSubmit && normalizedPrompt && !submitting);

  const handleSubmit = async () => {
    if (!canSubmit || !onSubmit) {
      return;
    }
    if (selectedModality === 'package') {
      return;
    }
    const generationConfig = isPlaygroundGenerationTargetType(selectedModality)
      ? serializeSdkworkGenerationAssetConfig(
        createDefaultSdkworkGenerationAssetConfig(selectedModality),
        selectedModality,
      )
      : undefined;
    try {
      await onSubmit({
        generationConfig,
        prompt: normalizedPrompt,
        selectedModality,
        selectedModel: selectedModels[selectedModality] || undefined,
      });
      setPrompt('');
      setIsFocused(true);
    } catch {
      setIsFocused(true);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-[1280px] relative">
      <div
        className={`w-full bg-[#1c1c1e] border border-white/10 transition-colors duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${
          isFocused
            ? 'rounded-2xl border-white/15 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.58)]'
            : 'rounded-full p-2 cursor-text hover:border-white/20'
        }`}
        onClick={() => { if (!isFocused) setIsFocused(true); }}
      >

        {/* Unfocused Content Overlay */}
        {!isFocused && (
          <div className="flex items-center animate-in fade-in duration-200">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsFocused(true);
              }}
              title={t('playground.referenceAssets')}
              aria-label={t('playground.referenceAssets')}
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-white/5 text-white ml-1 hover:bg-white/10"
            >
               <Plus className="w-4 h-4" />
            </button>
            <div className="flex-1 px-3 text-[15px] text-slate-400 truncate select-none">
              {currentPlaceholder}
            </div>
            <button
              type="button"
              disabled
              title={t('playground.input.submit')}
              aria-label={t('playground.input.submit')}
              className="w-8 h-8 shrink-0 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mr-1 cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Focused Content */}
        {isFocused && (
          <div className="flex flex-col animate-in fade-in duration-300">
            <div className="flex gap-4">
              {/* Right Textarea */}
              <div className="flex-1 relative">
                 <textarea
                   autoFocus
                   value={prompt}
                   onChange={e => setPrompt(e.target.value)}
                   onKeyDown={(event) => {
                     if (event.key === 'Enter' && !event.shiftKey) {
                       event.preventDefault();
                       void handleSubmit();
                     }
                   }}
                   className="custom-scrollbar min-h-[112px] max-h-[160px] w-full resize-none overflow-y-auto border-none bg-transparent text-[15px] leading-6 text-white outline-none placeholder:text-slate-500"
                   placeholder={currentPlaceholder}
                 />
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                 {/* Modality Switcher Dropdown */}
                 <div className="relative">
                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); setShowModalityMenu(!showModalityMenu); setShowModelMenu(false); }}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border border-transparent border-white/5 ${showModalityMenu ? 'bg-[#2a2a2d] text-white' : 'bg-[#252528] hover:bg-[#2a2a2d] text-slate-300'}`}
                   >
                     {getModalityIcon(selectedModality)}
                     <span>{modalityLabels[selectedModality]}</span>
                     <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-80" />
                   </button>

                   {/* Modality Menu Popup */}
                    {showModalityMenu && (
                      <div className="absolute bottom-[calc(100%+8px)] left-0 w-48 bg-[#252528] rounded-xl border border-white/10 shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 origin-bottom-left z-50">
                        <div className="px-3 py-2 text-[11px] text-slate-500 tracking-wider">{t("playground.input.menu.type")}</div>
                        {(Object.keys(modalityLabels) as GenerationModality[]).filter(t => t !== 'package').map(type => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => { setSelectedModality(type); setShowModalityMenu(false); setShowModelMenu(false); }}
                            className="w-full px-3 py-2 text-left flex items-center justify-between text-sm text-slate-200 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                               {getModalityIcon(type)}
                               <span>{modalityLabels[type]}</span>
                            </div>
                            {selectedModality === type && <div className="w-4 h-4 flex items-center justify-center shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                          </button>
                        ))}
                      </div>
                   )}
                 </div>

                 {selectedBucket && modelPickerFallback ? (
                   <div className="w-full max-w-[220px] shrink-0">
                     <PlaygroundModelPicker
                       bucket={selectedBucket}
                       modelGroups={modelGroups}
                       selectedModelId={selectedModels[selectedModality] || ''}
                       onSelectModel={setSelectedModel(selectedModality)}
                       showModelMenu={showModelMenu}
                       setShowModelMenu={setShowModelMenu}
                       fallback={modelPickerFallback}
                       menuPlacement="top"
                       compact
                       variant="flat"
                     />
                   </div>
                 ) : (
                   <div className="flex h-[38px] w-full max-w-[220px] shrink-0 items-center rounded-xl bg-[#202024]/70 px-3 text-sm text-slate-500">
                     {modalityLabels[selectedModality]}
                   </div>
                 )}

              </div>

              <div className="flex items-center gap-3">
                 <button
                   type="button"
                   disabled={!canSubmit}
                   title={t('playground.input.submit')}
                   aria-label={t('playground.input.submit')}
                   onClick={() => { void handleSubmit(); }}
                   className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                     canSubmit
                       ? 'bg-white text-black hover:bg-slate-200'
                       : 'bg-white/5 text-slate-600 cursor-not-allowed'
                   }`}
                 >
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function toModelBucket(value: GenerationModality): PlaygroundModelBucket | null {
  if (value === 'agent') {
    return 'llms';
  }
  if (value === 'package') {
    return null;
  }
  return getSdkworkGenerationModelBucket(value);
}

function isPlaygroundGenerationTargetType(value: GenerationModality): value is PlaygroundGenerationTargetType {
  return value === 'image'
    || value === 'video'
    || value === 'music'
    || value === 'audio'
    || value === 'sfx';
}
