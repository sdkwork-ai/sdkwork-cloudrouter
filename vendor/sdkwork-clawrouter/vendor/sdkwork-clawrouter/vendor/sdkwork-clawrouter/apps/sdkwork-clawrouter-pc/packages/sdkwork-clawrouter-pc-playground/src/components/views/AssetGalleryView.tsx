import React, { useMemo, useState } from 'react';
import {
  Image,
  Video,
  Music,
  FileText,
  Mic,
  Waves,
  Search,
  Filter,
  Upload,
  Heart,
  Archive,
  Clock,
  Trash2,
  Copy,
  Download,
  Grid3X3,
  LayoutGrid,
  MoreHorizontal,
  X,
  ChevronDown,
  Play,
} from 'lucide-react';
import {
  readMediaResourceUrl,
  type ClawRouterMediaResource,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';

export type AssetType = 'image' | 'video' | 'speech' | 'sound' | 'music';

interface AssetItem {
  id: string;
  type: AssetType;
  thumbnail?: ClawRouterMediaResource;
  asset?: ClawRouterMediaResource;
  duration?: string;
  title?: string;
  createdAt: Date;
  size?: string;
  source?: 'created' | 'uploaded' | 'favorite';
}

interface AssetGalleryViewProps {
  assets: AssetItem[];
  onPreview?: (asset: AssetItem) => void;
  onDelete?: (assetIds: string[]) => void;
  onExport?: (assetIds: string[]) => void;
}

const TOP_TABS = [
  { id: 'created', label: '创作资产', icon: Archive },
  { id: 'uploaded', label: '历史上传', icon: Upload },
  { id: 'favorite', label: '我的收藏', icon: Heart },
];

const ASSET_TYPE_OPTIONS: { key: AssetType | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: '全部类型', icon: Grid3X3 },
  { key: 'image', label: '图片', icon: Image },
  { key: 'video', label: '视频', icon: Video },
  { key: 'speech', label: '语音合成', icon: Mic },
  { key: 'sound', label: '音效', icon: Waves },
  { key: 'music', label: '音乐', icon: Music },
];

const TYPE_ICON_MAP: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Video,
  speech: Mic,
  sound: Waves,
  music: Music,
};

export function AssetGalleryView({
  assets = [],
  onPreview,
  onDelete,
  onExport,
}: AssetGalleryViewProps) {
  const [activeTab, setActiveTab] = useState<'created' | 'uploaded' | 'favorite'>('created');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = assets.filter((asset) => {
    // 标签页过滤
    if (activeTab === 'created' && asset.source !== 'created') return false;
    if (activeTab === 'uploaded' && asset.source !== 'uploaded') return false;
    if (activeTab === 'favorite' && asset.source !== 'favorite') return false;

    // 类型过滤
    if (filterType !== 'all' && asset.type !== filterType) return false;

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = asset.title?.toLowerCase().includes(query);
      const typeLabel = ASSET_TYPE_OPTIONS.find(opt => opt.key === asset.type)?.label.toLowerCase() || '';
      const typeMatch = typeLabel.includes(query);
      if (!titleMatch && !typeMatch) return false;
    }

    return true;
  });

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((left, right) => {
      if (sortBy === 'date') {
        return right.createdAt.getTime() - left.createdAt.getTime()
          || left.id.localeCompare(right.id);
      }
      if (sortBy === 'name') {
        return (left.title || left.id).localeCompare(right.title || right.id)
          || left.createdAt.getTime() - right.createdAt.getTime();
      }
      return 0;
    });
  }, [filteredAssets, sortBy]);

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedAssets.size === sortedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(sortedAssets.map((a) => a.id)));
    }
  };

  const copySelectedAssets = async () => {
    const text = sortedAssets
      .filter((asset) => selectedAssets.has(asset.id))
      .map((asset) => readMediaResourceUrl(asset.asset) || readMediaResourceUrl(asset.thumbnail) || asset.title || asset.id)
      .filter(Boolean)
      .join('\n');

    if (!text) {
      return;
    }
    await copyTextToClipboard(text);
  };

  const getActiveFilterLabel = () => {
    const option = ASSET_TYPE_OPTIONS.find(opt => opt.key === filterType);
    return option?.label || '全部类型';
  };

  const getActiveFilterIcon = () => {
    const option = ASSET_TYPE_OPTIONS.find(opt => opt.key === filterType);
    return option?.icon || Filter;
  };

  const ActiveFilterIcon = getActiveFilterIcon();

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="shrink-0 border-b border-white/5 bg-[#0f0f0f]">
          {/* Tabs Row */}
          <div className="flex items-center gap-1 px-6 py-3 border-b border-white/5">
            {TOP_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedAssets(new Set());
                }}
                className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`搜索${TOP_TABS.find(t => t.id === activeTab)?.label || '资产'}...`}
                  className="w-64 pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.07] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters & Actions Row */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Type Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-white/20 transition-all"
                >
                  <ActiveFilterIcon className="w-4 h-4" />
                  {getActiveFilterLabel()}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFilters && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFilters(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 z-50 w-56 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl p-2 space-y-1">
                      {ASSET_TYPE_OPTIONS.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.key}
                            onClick={() => {
                              setFilterType(option.key);
                              setShowFilters(false);
                              setSelectedAssets(new Set());
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                              filterType === option.key
                                ? 'bg-cyan-400/10 text-cyan-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                            <span>{option.label}</span>
                            {filterType === option.key && (
                              <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Date Sort */}
              <button
                onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-white/20 transition-all"
              >
                <Clock className="w-4 h-4" />
                {sortBy === 'date' ? '按日期排序' : '按名称排序'}
              </button>

              {/* Duration Filter for video/audio */}
              {(filterType === 'video' || filterType === 'all') && (
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-white/20 transition-all">
                  时长
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Results Count */}
              <span className="text-xs text-gray-500">
                共 {sortedAssets.length} 项
              </span>

              {/* Batch Actions */}
              {selectedAssets.size > 0 && (
                <>
                  <div className="w-px h-6 bg-white/10" />
                  {onDelete && (
                    <button
                      onClick={() => onDelete(Array.from(selectedAssets))}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除 ({selectedAssets.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      void copySelectedAssets();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    复制链接
                  </button>
                  {onExport && (
                    <button
                      onClick={() => onExport(Array.from(selectedAssets))}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                  )}
                </>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/5 rounded-lg p-1 ml-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                  title="网格视图"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded ${viewMode === 'masonry' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                  title="瀑布流视图"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>

              {/* Select All Checkbox */}
              <button
                onClick={selectAll}
                disabled={sortedAssets.length === 0}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                  selectedAssets.size === sortedAssets.length && sortedAssets.length > 0
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                    : 'border-white/10 text-gray-400 hover:border-white/20 disabled:opacity-30'
                }`}
              >
                {selectedAssets.size === sortedAssets.length && sortedAssets.length > 0 ? '✓ 已选全' : '全选'}
              </button>
            </div>
          </div>
        </header>

        {/* Assets Grid/Masonry Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {sortedAssets.length === 0 ? (
            <EmptyState activeTab={activeTab} filterType={filterType} searchQuery={searchQuery} />
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {sortedAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={() => toggleAssetSelection(asset.id)}
                  onPreview={() => onPreview?.(asset)}
                />
              ))}
            </div>
          ) : (
            /* Masonry View */
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 space-y-4">
              {sortedAssets.map((asset) => (
                <div key={asset.id} className="break-inside-avoid">
                  <AssetCard
                    asset={asset}
                    isSelected={selectedAssets.has(asset.id)}
                    onSelect={() => toggleAssetSelection(asset.id)}
                    onPreview={() => onPreview?.(asset)}
                    masonry
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({
  activeTab,
  filterType,
  searchQuery
}: {
  activeTab: string;
  filterType: string;
  searchQuery: string;
}) {
  const tabLabels: Record<string, string> = {
    created: '创作资产',
    uploaded: '上传记录',
    favorite: '收藏内容',
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return {
        title: '未找到匹配结果',
        desc: `尝试调整搜索关键词或清除筛选条件`,
        action: '清除搜索',
      };
    }

    return {
      title: `暂无${tabLabels[activeTab] || '资产'}`,
      desc: activeTab === 'created'
        ? '开始使用AI工具创建您的第一个作品'
        : activeTab === 'uploaded'
          ? '您还没有上传过任何文件'
          : '收藏喜欢的作品，方便随时查看',
      action: activeTab === 'created' ? '开始创建' : '去上传',
    };
  };

  const message = getEmptyMessage();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
        {searchQuery ? (
          <Search className="w-12 h-12 text-gray-600" />
        ) : (
          <Archive className="w-12 h-12 text-gray-600" />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">{message.title}</h3>
        <p className="text-sm text-gray-500 max-w-md">{message.desc}</p>
      </div>
      <button className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg shadow-cyan-400/30">
        {activeTab === 'uploaded' ? (
          <>
            <Upload className="w-5 h-5 inline mr-2" />
            {message.action}
          </>
        ) : (
          message.action
        )}
      </button>
    </div>
  );
}

function AssetCard({
  asset,
  isSelected,
  onSelect,
  onPreview,
  masonry = false,
}: {
  asset: AssetItem;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  masonry?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const TypeIcon = TYPE_ICON_MAP[asset.type] || FileText;
  const thumbnailSource = readMediaResourceUrl(asset.thumbnail);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0a]'
          : 'hover:ring-2 hover:ring-white/20'
      } ${masonry ? '' : 'aspect-[4/3]'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          onSelect();
        } else {
          onPreview();
        }
      }}
    >
      {/* Thumbnail */}
      <div className={`relative w-full bg-gradient-to-br from-gray-800 to-gray-900 ${masonry ? '' : 'h-full'}`}>
        <img
          src={thumbnailSource}
          alt={asset.title || 'Asset'}
          className={`w-full object-cover ${masonry ? 'w-full' : 'h-full'}`}
          loading="lazy"
        />

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
            >
              {asset.type === 'video' ? (
                <Play className="w-6 h-6 text-white fill-white" />
              ) : asset.type === 'music' || asset.type === 'sound' ? (
                <Music className="w-6 h-6 text-white" />
              ) : asset.type === 'speech' ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`p-3 rounded-full backdrop-blur-sm transition-all ${
                isSelected
                  ? 'bg-cyan-400 text-black'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isSelected ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <MoreHorizontal className="w-5 h-5" />
              )}
            </button>
          </div>
        )}

        {/* Duration Badge for Video/Audio/Music */}
        {asset.duration && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-xs font-medium text-white">
            {asset.duration}
          </div>
        )}

        {/* Type Icon Badge */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <TypeIcon className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Info Footer (optional) */}
      {!masonry && asset.title && (
        <div className="p-3 bg-[#151515]">
          <p className="text-sm text-gray-300 truncate">{asset.title}</p>
          {asset.size && <p className="text-xs text-gray-500 mt-1">{asset.size}</p>}
        </div>
      )}
    </div>
  );
}

export default AssetGalleryView;
