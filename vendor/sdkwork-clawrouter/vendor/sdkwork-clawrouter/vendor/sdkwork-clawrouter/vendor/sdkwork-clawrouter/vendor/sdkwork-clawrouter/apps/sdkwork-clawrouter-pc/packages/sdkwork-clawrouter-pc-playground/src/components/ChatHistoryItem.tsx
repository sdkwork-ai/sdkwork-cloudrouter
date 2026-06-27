import { useTranslation } from 'react-i18next';
import { Bot, Image as ImageIcon, Video, Music, Headphones, FileAudio } from 'lucide-react';
import { getSdkworkGenerationPreviewKind } from '@sdkwork/generations-pc-workspace/generation-history';
import { VideoMessageItem, MusicMessageItem, ImagesMessageItem, AudioMessageItem } from './MessageItems';
import { ChatMarkdownMessage } from './chat/ChatMarkdownMessage';
import type { PlaygroundHistoryItem, PlaygroundPreviewSetter } from '../playgroundTypes';

export function ChatHistoryItem({ item, setPreviewItem, isCompact = false }: { item: PlaygroundHistoryItem, setPreviewItem: PlaygroundPreviewSetter, isCompact?: boolean }) {
  const { t } = useTranslation();
  const previewKind = getSdkworkGenerationPreviewKind(item.type);
  const isText = previewKind === 'text';
  const isImage = previewKind === 'image';
  const isVideo = previewKind === 'video';
  const typeLabel = isText ? t('playground.input.type.agent') : isImage ? t('playground.input.type.image') : isVideo ? t('playground.input.type.video') : item.type === 'music' ? t('playground.input.type.music') : item.type === 'audio' ? t('playground.input.type.audio') : t('playground.input.type.sfx');
  const typeIcon = isText ? <Bot className="w-3.5 h-3.5" /> : isImage ? <ImageIcon className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : item.type === 'music' ? <Music className="w-3.5 h-3.5" /> : item.type === 'audio' ? <Headphones className="w-3.5 h-3.5" /> : <FileAudio className="w-3.5 h-3.5" />;
  const [modelName, modelConfig] = (item.modelInfo || '').split('|').map((value) => value.trim());

  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
           <div className="flex shrink-0 items-center gap-1.5 text-white font-bold text-[13px]">
             {typeIcon}
             {typeLabel}
           </div>
           <div className="w-px h-3 bg-white/20 mx-1" />
           <div className="truncate bg-[#222] border border-white/5 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium tracking-wide">
             {modelName || t('playground.history.defaultModel')}
           </div>
           <div className="truncate bg-[#222] border border-white/5 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium tracking-wide">
             {modelConfig || t('playground.history.defaultConfig')}
           </div>
        </div>
      </div>

      <p className={`${isCompact ? 'line-clamp-2' : 'line-clamp-3 hover:line-clamp-none'} text-[13px] leading-relaxed text-slate-300 transition-all cursor-pointer mt-0.5`}>
         {item.prompt}
      </p>

      {item.outputText && (
        <div className="min-w-0 max-w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-slate-200">
          <ChatMarkdownMessage content={item.outputText} tone="assistant" streaming={item.status === 'processing' || item.status === 'running'} />
        </div>
      )}

      {!(isText) && (
        <div className="mt-1">
           {item.type === 'video' && <VideoMessageItem item={item} setPreviewItem={setPreviewItem} />}
           {item.type === 'music' && <MusicMessageItem item={item} setPreviewItem={setPreviewItem} />}
           {isImage && <ImagesMessageItem item={item} setPreviewItem={setPreviewItem} />}
           {item.type === 'audio' && <AudioMessageItem item={item} setPreviewItem={setPreviewItem} />}
           {item.type === 'sfx' && <AudioMessageItem item={item} setPreviewItem={setPreviewItem} />}
        </div>
      )}
   </div>
  );
}
