import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import type { PlaygroundModelBucket, PlaygroundModelGroup, PlaygroundModelOption } from '../playgroundTypes';
import { usePopoverDismiss } from './usePopoverDismiss';

export function PlaygroundModelPicker({
  bucket,
  modelGroups,
  selectedModelId,
  onSelectModel,
  showModelMenu,
  setShowModelMenu,
  fallback,
  menuPlacement = 'bottom',
  compact = false,
  variant = 'default',
  disabled = false,
}: {
  bucket: PlaygroundModelBucket;
  modelGroups: PlaygroundModelGroup[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  showModelMenu: boolean;
  setShowModelMenu: (value: boolean) => void;
  fallback: PlaygroundModelOption;
  menuPlacement?: 'top' | 'bottom';
  compact?: boolean;
  variant?: 'default' | 'flat';
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const groupsWithModels = useMemo(() => modelGroups.filter((group) => group[bucket].length > 0), [bucket, modelGroups]);
  const selectedGroup = findModelGroup(groupsWithModels, bucket, selectedModelId) || groupsWithModels[0];
  const selectedModel = findModel(groupsWithModels, bucket, selectedModelId) || firstModel(selectedGroup, bucket) || fallback;
  const selectedModelLabel = selectedModel.displayName || selectedModel.name || selectedModel.model;
  const [activeVendorCode, setActiveVendorCode] = useState(() => selectedGroup?.vendor.code || selectedModel.vendorCode);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeGroup = groupsWithModels.find((group) => group.vendor.code === activeVendorCode) || selectedGroup;
  const activeVendorModels = activeGroup ? activeGroup[bucket] : [];

  useEffect(() => {
    const nextVendorCode = selectedGroup?.vendor.code || selectedModel.vendorCode;
    setActiveVendorCode((current) => (current === nextVendorCode ? current : nextVendorCode));
  }, [selectedGroup?.vendor.code, selectedModel.vendorCode]);

  usePopoverDismiss(containerRef, showModelMenu, () => setShowModelMenu(false));

  const isFlat = variant === 'flat';
  const triggerClassName = isFlat
    ? `flex w-full items-center justify-between rounded-xl bg-[#202024]/70 text-left transition-colors hover:bg-[#24242a] disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? 'min-h-[38px] gap-2 px-3 py-2' : 'p-3'
      }`
    : `flex w-full items-center justify-between rounded-xl border border-white/5 bg-[#1a1a1a] text-left shadow-sm transition-colors hover:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? 'min-h-[42px] gap-2 px-3 py-2' : 'p-3'
      }`;
  const versionBadgeClassName = isFlat
    ? `${compact ? 'h-5 w-6 rounded-md text-[8px]' : 'h-8 w-8 rounded-lg text-[9px]'} shrink-0 bg-[#2a2a30] font-mono font-bold text-slate-300`
    : `${compact ? 'h-6 w-7 rounded-md' : 'h-8 w-8 rounded-lg'} shrink-0 bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_15px_rgba(99,102,241,0.2)]`;
  const menuClassName = isFlat
    ? `absolute left-0 z-50 grid max-h-[420px] w-[392px] max-w-[calc(100vw-32px)] grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-[#242428] shadow-2xl ${
        menuPlacement === 'top'
          ? 'bottom-[calc(100%+8px)] origin-bottom'
          : 'top-[calc(100%+8px)] origin-top'
      }`
    : `absolute left-0 right-0 z-50 grid max-h-[460px] grid-cols-[150px_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-[#252528] shadow-2xl ${
        menuPlacement === 'top'
          ? 'bottom-[calc(100%+8px)] origin-bottom'
          : 'top-[calc(100%+8px)] origin-top'
      }`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setShowModelMenu(!showModelMenu);
          }
        }}
        className={triggerClassName}
        title={selectedModelLabel}
        aria-label={selectedModelLabel}
      >
        <div className={`flex min-w-0 flex-1 items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <div className={versionBadgeClassName}>
            <div className={`flex h-full w-full items-center justify-center px-1 ${isFlat ? '' : `bg-[#1a1a1a] text-white ${compact ? 'rounded-[4px]' : 'rounded-[6px]'}`}`}>
              {selectedModel.versionLabel || selectedModel.ver}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className={`${compact ? 'whitespace-normal break-words text-xs leading-4' : 'mb-0.5 truncate text-[13px]'} font-bold tracking-wide text-slate-200`}>
              {selectedModelLabel}
            </div>
            {!compact && (
              <div className="line-clamp-1 text-[10px] tracking-wide text-slate-500">
                {selectedModel.vendorName} | {selectedModel.desc}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`} />
      </button>

      {showModelMenu && (
        <div className={menuClassName}>
          <div className={`custom-scrollbar max-h-[420px] overflow-y-auto ${isFlat ? 'bg-black/10 p-1.5' : 'border-r border-white/5 bg-black/10 p-1.5'}`}>
            {groupsWithModels.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">{t('playground.modelPicker.noVendors')}</div>
            ) : (
              groupsWithModels.map((group) => {
                const isActive = group.vendor.code === activeVendorCode;
                return (
                  <button
                    key={group.vendor.code}
                    type="button"
                    onClick={() => setActiveVendorCode(group.vendor.code)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{group.vendor.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] opacity-60">{group[bucket].length}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="custom-scrollbar max-h-[420px] min-w-0 overflow-y-auto py-1.5">
            {activeVendorModels.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">{t('playground.modelPicker.noVendorModels')}</div>
            ) : (
              activeVendorModels.map((model) => {
                const isActive = model.id === selectedModel.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(model.id);
                      setShowModelMenu(false);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-white/5 p-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-black/20 px-1 font-mono text-[9px] font-semibold text-slate-400">
                        {model.versionLabel}
                      </div>
                      <div className="min-w-0">
                        <div className={`truncate text-sm font-bold tracking-wide ${isActive ? 'text-indigo-400' : 'text-slate-300'}`}>{model.name}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{model.desc}</div>
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-cyan-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function createFallbackModel(name: string, desc: string, versionLabel: string, bucket: string, vendorName: string): PlaygroundModelOption {
  const outputModality = bucket === 'llms' ? 'text' : bucket === 'audios' ? 'audio' : bucket.replace(/s$/, '');
  return {
    id: `fallback/${bucket}/${name}`,
    catalogKey: `fallback/${bucket}/${name}`,
    model: name,
    name,
    displayName: name,
    desc,
    description: desc,
    ver: versionLabel,
    versionLabel,
    vendorCode: 'pending',
    vendorName,
    modalities: [bucket],
    inputModalities: [],
    outputModalities: [outputModality],
    capabilities: [],
    officialReferencePrices: [],
    priceAvailability: { status: 'unavailable' },
    providerCodes: [],
    supportsStreaming: false,
    supportsTools: false,
    supportsJsonSchema: false,
  };
}

function findModelGroup(groups: PlaygroundModelGroup[], bucket: PlaygroundModelBucket, modelId: string): PlaygroundModelGroup | undefined {
  return groups.find((group) => group[bucket].some((model) => model.id === modelId));
}

function findModel(groups: PlaygroundModelGroup[], bucket: PlaygroundModelBucket, modelId: string): PlaygroundModelOption | undefined {
  for (const group of groups) {
    const model = group[bucket].find((item) => item.id === modelId);
    if (model) {
      return model;
    }
  }
  return undefined;
}

function firstModel(group: PlaygroundModelGroup | undefined, bucket: PlaygroundModelBucket): PlaygroundModelOption | undefined {
  return group ? group[bucket][0] : undefined;
}
