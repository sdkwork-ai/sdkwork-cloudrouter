import { AssetGalleryView, type AssetType } from './AssetGalleryView';
import {
  isSdkworkGenerationImageHistoryType,
} from '@sdkwork/generations-pc-workspace/generation-history';
import { type ClawRouterMediaResource } from '@sdkwork/clawroutes-pc-commons/runtime';
import type { PlaygroundHistoryItem, PlaygroundPreviewSetter } from '../../playgroundTypes';

interface AssetViewProps {
  agentHistory: PlaygroundHistoryItem[];
  setPreviewItem: PlaygroundPreviewSetter;
}

export function AssetView({
  agentHistory,
  setPreviewItem,
}: AssetViewProps) {
  const assets = agentHistory
    .filter((item) => item.type !== 'text')
    .map((item) => {
      const asset = readAssetResource(item);
      return {
        id: item.id,
        type: getAssetType(item.type),
        thumbnail: readAssetThumbnail(item, asset),
        asset,
        duration: formatDuration(item.durationSeconds),
        title: createAssetTitle(item),
        createdAt: readAssetDate(item),
        source: 'created' as const,
      };
    });

  const handlePreview = (asset: { id: string }) => {
    const originalItem = agentHistory.find((item) => item.id === asset.id);
    if (originalItem) {
      setPreviewItem(originalItem);
    }
  };

  return (
    <div className="relative z-10 h-full w-full">
      <AssetGalleryView
        assets={assets}
        onPreview={handlePreview}
      />
    </div>
  );
}

function readAssetResource(item: PlaygroundHistoryItem): ClawRouterMediaResource | undefined {
  if (isSdkworkGenerationImageHistoryType(item.type)) {
    return item.images?.[0] ?? item.asset;
  }
  if (item.type === 'video') {
    return item.videos?.[0] ?? item.asset;
  }
  return item.asset ?? item.images?.[0] ?? item.videos?.[0];
}

function readAssetThumbnail(
  item: PlaygroundHistoryItem,
  fallback: ClawRouterMediaResource | undefined,
): ClawRouterMediaResource | undefined {
  if (isSdkworkGenerationImageHistoryType(item.type)) {
    return item.images?.[0] ?? fallback;
  }
  if (item.type === 'video') {
    const video = item.videos?.[0] ?? item.asset;
    return video?.poster ?? video?.thumbnails?.[0] ?? fallback;
  }
  return fallback;
}

function readAssetDate(item: PlaygroundHistoryItem): Date {
  const date = new Date(item.updatedAt || item.createdAt || `${item.date}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}

function createAssetTitle(item: PlaygroundHistoryItem): string {
  const title = item.prompt.trim();
  if (!title) {
    return item.id;
  }
  return title.length > 50 ? `${title.slice(0, 47).trimEnd()}...` : title;
}

function formatDuration(durationSeconds: number | undefined): string | undefined {
  if (durationSeconds === undefined) {
    return undefined;
  }
  const roundedSeconds = Math.max(0, Math.round(durationSeconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getAssetType(type?: PlaygroundHistoryItem['type']): AssetType {
  if (type && isSdkworkGenerationImageHistoryType(type)) {
    return 'image';
  }

  switch (type) {
    case 'video':
      return 'video';
    case 'music':
      return 'music';
    case 'audio':
    case 'sfx':
    default:
      return 'sound';
  }
}

export default AssetView;
