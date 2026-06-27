import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, Loader2, PlaySquare, Play } from 'lucide-react';
import {
  readSdkworkGenerationMediaThumb,
  readSdkworkGenerationMediaUrl,
} from '@sdkwork/generations-pc-workspace/generation-history';
import { getDeterministicWaveBarStyle } from './waveform';
import type { PlaygroundHistoryItem, PlaygroundMedia, PlaygroundPreviewSetter } from '../playgroundTypes';

const getGridColsClass = (length: number) => {
  if (length === 1) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  if (length === 2) return 'grid-cols-2 md:grid-cols-2 xl:grid-cols-3';
  if (length === 3) return 'grid-cols-3';
  if (length === 4) return 'grid-cols-2 md:grid-cols-4';
  if (length === 5 || length === 6) return 'grid-cols-3 md:grid-cols-3 xl:grid-cols-4';
  return 'grid-cols-4 md:grid-cols-4 xl:grid-cols-5';
};

export function VideoMessageItem({ item, setPreviewItem }: { item: PlaygroundHistoryItem, setPreviewItem: PlaygroundPreviewSetter }) {
  const { t } = useTranslation();
  const videos = item.videos || (item.asset?.kind === 'video' ? [item.asset] : []);
  const gridClass = getGridColsClass(videos.length);

  if (videos.length === 0) return <GenerationAssetPlaceholder item={item} />;

  return (
    <div className={`grid ${gridClass} gap-3 w-full`}>
       {videos.map((vid: PlaygroundMedia, i: number) => {
         const thumbSrc = readSdkworkGenerationMediaThumb(vid);
         return (
           <div key={i} className="relative aspect-[16/9] bg-[#1a1a1a] rounded-lg overflow-hidden border border-white/5 shadow-sm group">
             <img src={thumbSrc} alt={t('playground.generation.videoThumbnailAlt')} className="w-full h-full object-cover opacity-90 mx-auto transition-transform duration-700 group-hover:scale-105" />
             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex flex-col items-center justify-center transition-all cursor-pointer" onClick={() => setPreviewItem({ ...item, type: 'video', activeIndex: i })}>
               <PlaySquare className="w-10 h-10 text-white/90 drop-shadow-lg opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
             </div>
           </div>
         );
       })}
    </div>
  );
}

export function MusicMessageItem({ item, setPreviewItem }: { item: PlaygroundHistoryItem, setPreviewItem: PlaygroundPreviewSetter }) {
  const assetSrc = readSdkworkGenerationMediaUrl(item.asset);
  if (!assetSrc) {
    return <GenerationAssetPlaceholder item={item} />;
  }

  return (
    <div className="relative w-full h-24 bg-[#1a1a1a] rounded-lg border border-white/5 shadow-sm flex items-center px-4 cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => setPreviewItem(item)}>
       <button className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 hover:bg-indigo-600 transition-colors">
         <Play className="w-5 h-5 text-white ml-1" />
       </button>
       <div className="ml-4 flex-1 h-8 flex items-center gap-1 opacity-60">
          {[...Array(30)].map((_, i) => (
             <div key={i} className="flex-1 bg-white rounded-full" style={getDeterministicWaveBarStyle(i, 20, 80)} />
          ))}
       </div>
    </div>
  );
}

export function ImagesMessageItem({ item, setPreviewItem }: { item: PlaygroundHistoryItem, setPreviewItem: PlaygroundPreviewSetter }) {
  const { t } = useTranslation();
  const images = item.images || [];
  const gridClass = getGridColsClass(images.length);
  const aspectClass = aspectRatioClass(item.aspectRatio);

  if (images.length === 0) return <GenerationAssetPlaceholder item={item} />;

  return (
    <div className={`grid ${gridClass} gap-3 w-full`}>
       {images.map((img: PlaygroundMedia, i: number) => {
         const imageSrc = readSdkworkGenerationMediaUrl(img);
         if (!imageSrc) {
           return null;
         }
         return (
         <div key={i} className={`${aspectClass} relative rounded-xl overflow-hidden border border-white/5 shadow-sm cursor-pointer group`} onClick={() => setPreviewItem({ ...item, type: 'image', activeIndex: i })}>
            <img src={imageSrc} alt={t('playground.generation.imageAlt')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
         </div>
         );
       })}
    </div>
  );
}

export function AudioMessageItem({ item, setPreviewItem }: { item: PlaygroundHistoryItem, setPreviewItem: PlaygroundPreviewSetter }) {
  const assetSrc = readSdkworkGenerationMediaUrl(item.asset);
  if (!assetSrc) {
    return <GenerationAssetPlaceholder item={item} />;
  }

  return (
    <div className="relative w-full bg-gradient-to-tr from-[#111] to-[#1a1a24] rounded-lg border border-white/5 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => setPreviewItem(item)}>
       <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors">
         <Play className="w-4 h-4 text-white ml-0.5" />
       </button>
       <div className="flex-1">
         <div className="flex items-end gap-1 h-6">
           {[...Array(20)].map((_, i) => (
             <div key={i} className="flex-1 bg-indigo-400/80 rounded-t-sm" style={getDeterministicWaveBarStyle(i, 30, 70)} />
           ))}
         </div>
       </div>
       {item.durationSeconds !== undefined && (
         <div className="text-xs font-mono text-slate-500">{formatDuration(item.durationSeconds)}</div>
       )}
    </div>
  );
}

function aspectRatioClass(value: PlaygroundHistoryItem['aspectRatio']): string {
  switch (value) {
    case '1:1':
      return 'aspect-square';
    case '9:16':
      return 'aspect-[9/16]';
    case '16:9':
    default:
      return 'aspect-[16/9]';
  }
}

function formatDuration(value: number): string {
  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function GenerationAssetPlaceholder({ item }: { item: PlaygroundHistoryItem }) {
  const { t } = useTranslation();
  const status = (item.status || '').toLowerCase();
  const isFailed = status === 'failed' || status === 'cancelled';
  const isProcessing = status === 'processing' || status === 'running';
  const isPending = status === 'pending' || status === 'queued';
  const label = isFailed
    ? t('playground.generation.failed')
    : isProcessing
      ? t('playground.generation.processing')
      : isPending
        ? t('playground.generation.pending')
        : t('playground.generation.empty');
  const Icon = isFailed ? AlertCircle : isProcessing ? Loader2 : Clock;

  return (
    <div className="flex min-h-[112px] w-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] px-4 text-center text-sm text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <Icon className={`h-5 w-5 ${isProcessing ? 'animate-spin text-cyan-300' : isFailed ? 'text-red-300' : 'text-slate-500'}`} />
        <span>{label}</span>
      </div>
    </div>
  );
}
