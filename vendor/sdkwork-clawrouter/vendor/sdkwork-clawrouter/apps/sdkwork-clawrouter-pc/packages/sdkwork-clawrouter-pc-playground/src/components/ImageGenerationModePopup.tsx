import { Home, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';
import {
  DEFAULT_SDKWORK_GENERATION_IMAGE_MODE_CONFIG,
  type SdkworkGenerationImageModeConfig,
} from '@sdkwork/image-pc-generation/react';
import { GenerationModePopupBase, type ConfigSection } from './GenerationModePopupBase';

export type ImageGenerationConfig = SdkworkGenerationImageModeConfig;

const IMAGE_SECTIONS = [
  {
    id: 'quality',
    label: '生成模式',
    type: 'select' as const,
    valueKey: 'quality',
    options: [
      { value: '1k', label: '1K标准' },
      { value: '2k', label: '2K高清', isVip: true },
    ],
  },
  {
    id: 'aspectRatio',
    label: '比例',
    type: 'select' as const,
    valueKey: 'aspectRatio',
    options: [
      { value: 'auto', label: '智能', icon: <Home className="h-4 w-4" /> },
      { value: '9:16', label: '9:16', icon: <RectangleVertical className="h-5 w-4" /> },
      { value: '2:3', label: '2:3', icon: <RectangleVertical className="h-5 w-4" /> },
      { value: '3:4', label: '3:4', icon: <RectangleVertical className="h-5 w-4" /> },
      { value: '1:1', label: '1:1', icon: <Square className="h-4 w-4" /> },
      { value: '4:3', label: '4:3', icon: <RectangleHorizontal className="h-4 w-5" /> },
      { value: '3:2', label: '3:2', icon: <RectangleHorizontal className="h-4 w-5" /> },
      { value: '16:9', label: '16:9', icon: <RectangleHorizontal className="h-4 w-6" /> },
      { value: '21:9', label: '21:9', icon: <RectangleHorizontal className="h-3 w-7" /> },
    ],
  },
  {
    id: 'count',
    label: '生成数量',
    type: 'select' as const,
    valueKey: 'count',
    options: [
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
      { value: 4, label: '4' },
      { value: 5, label: '5', isVip: true },
      { value: 6, label: '6', isVip: true },
      { value: 7, label: '7', isVip: true },
      { value: 8, label: '8', isVip: true },
      { value: 9, label: '9', isVip: true },
    ],
  },
] satisfies ConfigSection<ImageGenerationConfig>[];

interface ImageGenerationModePopupProps {
  config: ImageGenerationConfig;
  onChangeConfig: (config: ImageGenerationConfig) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
  showCost?: number;
}

export function ImageGenerationModePopup({
  canGenerate = true,
  config,
  isGenerating = false,
  onChangeConfig,
  onGenerate,
  showCost,
}: ImageGenerationModePopupProps) {
  const getSummary = (current: ImageGenerationConfig) => {
    const qualityLabel = current.quality === '2k' ? '2K高清' : '1K标准';
    return `${qualityLabel} · ${current.aspectRatio === 'auto' ? '智能' : current.aspectRatio} · ${current.count}`;
  };

  return (
    <GenerationModePopupBase
      canGenerate={canGenerate}
      config={config}
      getSummary={getSummary}
      isGenerating={isGenerating}
      onChangeConfig={onChangeConfig}
      onGenerate={onGenerate}
      sections={IMAGE_SECTIONS}
      title="图片生成设置"
      renderExtraControls={() => (
        showCost !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-orange-400">C</span>
            <span className="font-semibold text-white">{showCost}</span>
          </div>
        )
      )}
    />
  );
}

export const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  ...DEFAULT_SDKWORK_GENERATION_IMAGE_MODE_CONFIG,
};

export default ImageGenerationModePopup;
