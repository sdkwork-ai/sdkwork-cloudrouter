import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSdkworkGenerationImageHistoryType } from '@sdkwork/generations-pc-workspace/generation-history';
import { ChatHistoryItem } from '../ChatHistoryItem';
import type { PlaygroundHistoryItem, PlaygroundPreviewSetter } from '../../playgroundTypes';

const tabs = [
  { id: 'all', labelKey: 'playground.history.filter.all' },
  { id: 'image', labelKey: 'playground.history.filter.images' },
  { id: 'video', labelKey: 'playground.history.filter.videos' },
  { id: 'music', labelKey: 'common.modality.music' },
  { id: 'audio', labelKey: 'common.modality.audio' },
  { id: 'sfx', labelKey: 'common.modality.sfx' },
];

export function SharedHistoryView({
  agentHistory,
  setPreviewItem,
  modality,
}: {
  agentHistory: PlaygroundHistoryItem[];
  setPreviewItem: PlaygroundPreviewSetter;
  modality: string;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    setActiveTab(modality === 'agent' ? 'all' : modality);
  }, [modality]);

  const filteredHistory = agentHistory.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'image') return isSdkworkGenerationImageHistoryType(item.type);
    return item.type === activeTab;
  });

  return (
    <div className="custom-scrollbar flex flex-1 flex-col items-center overflow-y-auto bg-[#0a0a0a] px-8 pt-0">
      <div className="sticky top-0 z-10 mb-6 flex w-full items-center justify-between border-b border-white/5 bg-[#0a0a0a] pb-4 pt-6">
        <div className="hide-scrollbar flex items-center gap-6 overflow-x-auto text-[14px] font-bold tracking-wide text-slate-400">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative whitespace-nowrap pb-1 transition-colors ${activeTab === tab.id ? 'text-white drop-shadow-sm' : 'hover:text-white'}`}
            >
              {t(tab.labelKey)}
              {activeTab === tab.id && <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-indigo-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-10 pb-20">
        {filteredHistory.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-slate-500">
            {t('playground.history.empty')}
          </div>
        ) : (
          filteredHistory.map((item, index) => {
            const isNewDate = index === 0 || filteredHistory[index - 1].date !== item.date;

            return (
              <div key={item.id} className="flex flex-col gap-4">
                {isNewDate && <h3 className="mb-2 pt-4 text-xl font-bold text-white">{item.date}</h3>}
                <ChatHistoryItem item={item} setPreviewItem={setPreviewItem} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
