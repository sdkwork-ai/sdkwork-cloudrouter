# GenerationModePopup 通用组件

## 📋 组件说明

`GenerationModePopup` 是一个**通用的视频生成模式选择弹窗组件**，专为 Playground 的视频生成功能设计。该组件完全参考设计稿实现了现代化的深色主题UI。

---

## ✨ 核心特性

### 1. **可折叠界面**
- 默认展开显示所有配置项
- 折叠后仅显示配置摘要 + 快捷操作
- 平滑的展开/收起动画

### 2. **完整的配置选项**

| 配置项 | 选项 | 说明 |
|--------|------|------|
| **生成模式** | 720p / 1080p (VIP) / 4K (VIP) | 视频分辨率选择 |
| **生成时长** | 3s - 15s（滑块） | 自定义滑块控制 |
| **视频比例** | 16:9 / 1:1 / 9:16 | 带图标的比例选择 |
| **生成数量** | 1 / 2 (VIP) / 3 (VIP) / 4 (VIP) | 批量生成数量 |
| **音画同步** | 开/关 | 音频视频同步开关 |

### 3. **VIP标识系统**
- VIP专属选项带金色标签
- VIP选项默认禁用（灰色）
- 清晰的视觉层级区分

### 4. **智能状态管理**
- 实时配置摘要显示
- 当前选中项高亮
- 禁用状态处理
- 生成按钮状态联动

---

## 🎨 UI设计亮点

### 视觉效果
```css
/* 主容器 */
背景：#1a1a1a 深色主题
边框：white/10 半透明边框
圆角：xl (12px)
模糊效果：backdrop-blur-sm

/* 选中态 */
背景：white/10 浅色高亮
边框：white/30 明亮边框
阴影：shadow-lg 增强投影

/* VIP标签 */
背景：yellow-500/20 金色半透明
文字：yellow-400 金色文字
边框：yellow-500/30 金色边框

/* 生成按钮 */
渐变：from-green-400 to-lime-400 绿色渐变
悬停：from-green-500 to-lime-500 加深
阴影：shadow-green-400/20 绿色光晕
```

### 交互反馈
- **滑块**：自定义样式 + 渐变填充轨道 + 白色圆形滑块
- **按钮**：hover 背景加深 + 边框变亮
- **折叠**：ChevronUp 图标旋转180°动画
- **禁用**：降低透明度 + cursor-not-allowed

---

## 🔧 使用方式

### 基础用法

```tsx
import {
  GenerationModePopup,
  DEFAULT_VIDEO_GENERATION_CONFIG,
  type VideoGenerationConfig
} from './components/GenerationModePopup';

function MyVideoGenerator() {
  const [config, setConfig] = useState<VideoGenerationConfig>({
    ...DEFAULT_VIDEO_GENERATION_CONFIG
  });

  const handleGenerate = async () => {
    console.log('生成视频:', config);
    // 调用API...
  };

  return (
    <GenerationModePopup
      config={config}
      onChangeConfig={setConfig}
      onGenerate={handleGenerate}
      isGenerating={false}
      canGenerate={true}
    />
  );
}
```

### Props接口

```typescript
interface GenerationModePopupProps {
  /** 当前配置 */
  config: VideoGenerationConfig;

  /** 配置变更回调 */
  onChangeConfig: (config: VideoGenerationConfig) => void;

  /** 点击生成按钮回调 */
  onGenerate: () => void;

  /** 是否正在生成 */
  isGenerating?: boolean;        // 默认 false

  /** 是否可以生成 */
  canGenerate?: boolean;         // 默认 true

  /** 自定义类名 */
  className?: string;            // 默认 ''
}
```

### 配置类型定义

```typescript
interface VideoGenerationConfig {
  /** 分辨率 */
  resolution: '720p' | '1080p' | '4k';

  /** 时长（秒） */
  duration: number;              // 3-15

  /** 视频比例 */
  aspectRatio: '16:9' | '1:1' | '9:16';

  /** 生成数量 */
  count: number;                 // 1-4

  /** 音画同步 */
  syncAudioVideo: boolean;
}

/** 默认配置 */
export const DEFAULT_VIDEO_GENERATION_CONFIG: VideoGenerationConfig = {
  resolution: '720p',
  duration: 5,
  aspectRatio: '16:9',
  count: 1,
  syncAudioVideo: true,
};
```

---

## 📦 集成示例

### 在Playground中使用（已完成）

**文件位置：** `packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx`

**集成逻辑：**
```tsx
// 1. 导入组件
import { GenerationModePopup, DEFAULT_VIDEO_GENERATION_CONFIG } from './GenerationModePopup';

// 2. 扩展配置类型
type AssetGenerationConfig = {
  // ...原有字段
  videoGenerationConfig?: VideoGenerationConfig;  // 新增
};

// 3. 初始化配置
const [config, setConfig] = useState<AssetGenerationConfig>({
  // ...原有字段
  videoGenerationConfig: modality === 'video'
    ? { ...DEFAULT_VIDEO_GENERATION_CONFIG }
    : undefined,
});

// 4. 在底部栏渲染
{modality === 'video' && config.videoGenerationConfig ? (
  <GenerationModePopup
    config={config.videoGenerationConfig}
    onChangeConfig={(videoConfig) =>
      onChangeConfig({ ...config, videoGenerationConfig })
    }
    onGenerate={onSubmit}
    isGenerating={submitting}
    canGenerate={canSubmit}
  />
) : (
  // 原有的图片/音频等模式UI
)}
```

---

## 🎯 使用场景

### 场景1：独立页面使用

```tsx
function VideoCreationPage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1>AI视频生成</h1>

      <textarea placeholder="输入视频描述..." />

      <GenerationModePopup
        config={videoConfig}
        onChangeConfig={setVideoConfig}
        onGenerate={handleCreateVideo}
      />
    </div>
  );
}
```

### 场景2：嵌套在其他组件中

```tsx
function ChatInterface() {
  return (
    <div className="chat-container">
      <MessageList />

      <div className="input-area">
        <input type="text" />

        {/* 展开高级设置 */}
        <details>
          <summary>高级设置</summary>
          <GenerationModePopup ... />
        </details>

        <button onClick={send}>发送</button>
      </div>
    </div>
  );
}
```

### 场景3：配合表单使用

```tsx
function VideoGenerationForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 将config提交到服务器
    api.generateVideo({
      prompt: textPrompt,
      ...videoConfig
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={prompt} onChange={...} />

      <GenerationModePopup
        config={videoConfig}
        onChangeConfig={setVideoConfig}
        onGenerate={() => handleSubmit(new Event('submit'))}
      />
    </form>
  );
}
```

---

## ⚙️ 高级定制

### 自定义选项

**修改分辨率选项：**
```tsx
// 编辑 GenerationModePopup.tsx 中的 RESOLUTION_OPTIONS
const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p', isVip: true },
  { value: '4k', label: '4K', isVip: true },
  { value: '8k', label: '8K', isVip: true },  // 新增
];
```

**修改时长范围：**
```tsx
// 在使用时通过props限制或修改组件内部常量
<input
  type="range"
  min={5}     // 最小值
  max={30}    // 最大值（原为15）
  step={1}
/>
```

### 样式覆盖

```tsx
<GenerationModePopup
  className="custom-video-popup"  // 添加自定义类名
  ...
/>

/* CSS覆盖 */
.custom-video-popup {
  border-color: rgba(59, 130, 246, 0.3);  /* 蓝色边框 */
  background: #0f172a;                      /* 更深的背景 */
}
```

### 事件拦截

```tsx
<GenerationModePopup
  onGenerate={() => {
    // 前置校验
    if (!user.isLoggedIn) {
      showLoginModal();
      return;
    }

    // 积分检查
    if (user.points < requiredPoints) {
      showInsufficientPointsDialog();
      return;
    }

    // 调用实际生成
    actualGenerate();
  }}
/>
```

---

## 🔄 状态管理示例

### 与Redux/Zustand集成

```tsx
// store.ts
interface VideoStore {
  config: VideoGenerationConfig;
  setConfig: (config: VideoGenerationConfig) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  config: DEFAULT_VIDEO_GENERATION_CONFIG,
  setConfig: (config) => set({ config }),
}));

// Component.tsx
function VideoGenerator() {
  const { config, setConfig } = useVideoStore();

  return (
    <GenerationModePopup
      config={config}
      onChangeConfig={setConfig}
      onGenerate={generateVideo}
    />
  );
}
```

### URL参数同步

```tsx
function VideoGeneratorWithUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams();

  const configFromUrl: VideoGenerationConfig = {
    resolution: (searchParams.get('res') as any) || '720p',
    duration: Number(searchParams.get('dur')) || 5,
    aspectRatio: (searchParams.get('ratio') as any) || '16:9',
    count: Number(searchParams.get('count')) || 1,
    syncAudioVideo: searchParams.get('sync') !== 'false',
  };

  const [config, setConfig] = useState(configFromUrl);

  const handleChange = (newConfig: VideoGenerationConfig) => {
    setConfig(newConfig);
    // 同步到URL
    setSearchParams({
      res: newConfig.resolution,
      dur: String(newConfig.duration),
      ratio: newConfig.aspectRatio,
      count: String(newConfig.count),
      sync: String(newConfig.syncAudioVideo),
    });
  };

  return <GenerationModePopup config={config} onChangeConfig={handleChange} ... />;
}
```

---

## 🧪 测试用例

```tsx
describe('GenerationModePopup', () => {
  it('应正确渲染所有配置选项', () => {
    render(<GenerationModePopup config={defaultConfig} onChangeConfig={jest.fn()} onGenerate={jest.fn()} />);

    expect(screen.getByText('720p')).toBeInTheDocument();
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('16:9')).toBeInTheDocument();
  });

  it('点击选项应触发onChangeConfig', () => {
    const handleChange = jest.fn();
    render(<GenerationModePopup config={defaultConfig} onChangeConfig={handleChange} ... />);

    fireEvent.click(screen.getByText('1080p'));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: '1080p' })
    );
  });

  it('VIP选项应被禁用', () => {
    render(<GenerationModePopup config={defaultConfig} ... />);

    const vipButton = screen.getAllByText('VIP')[0].closest('button');
    expect(vipButton).toBeDisabled();
  });

  it('生成按钮在canGenerate=false时应禁用', () => {
    render(<GenerationModePopup config={defaultConfig} ... canGenerate={false} />);

    expect(screen.getByText('生成')).toBeDisabled();
  });
});
```

---

## 📱 响应式适配

### 断点优化
```css
/* 移动端 (< 640px) */
@media (max-width: 640px) {
  .generation-mode-grid {
    grid-template-columns: repeat(2, 1fr);  /* 3列→2列 */
  }

  .count-options {
    grid-template-columns: repeat(2, 1fr);  /* 4列→2列 */
  }
}

/* 平板 (640px - 1024px) */
@media (min-width: 640px) and (max-width: 1024px) {
  /* 保持现有布局 */
}

/* 桌面 (> 1024px) */
@media (min-width: 1024px) {
  /* 完整3列/4列布局 */
}
```

---

## ♿ 无障碍支持

已实现的A11y特性：
- ✅ 所有按钮都有明确的 `type="button"`
- ✅ 禁用状态使用 `disabled` 属性
- ✅ 滑块有 `min/max/step` 属性
- ✅ VIP标签语义化（视觉提示）
- ✅ 键盘导航支持（Tab键切换）

待优化：
- ⏳ 添加 `aria-label` 给图标按钮
- ⏳ 添加 `aria-describedby` 说明VIP限制
- ⏳ 支持屏幕阅读器的实时区域播报

---

## 🐛 已知问题与解决方案

### 问题1：滑块样式兼容性
**现象：** Safari浏览器下滑块样式异常
**解决：** 使用 `-webkit-slider-thumb` 前缀

```css
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  /* ... */
}
```

### 问题2：折叠动画卡顿
**现象：** 大量DOM元素导致动画不流畅
**解决：** 使用CSS `will-change: height` 或 `transform: translateZ(0)`

---

## 📈 性能优化建议

1. **React.memo包装**
   ```tsx
   export const GenerationModePopup = React.memo(function GenerationModePopup({ ... }) {
     // 组件实现
   });
   ```

2. **useCallback稳定化**
   ```tsx
   const handleChange = useCallback((config) => {
     onChangeConfig(config);
   }, [onChangeConfig]);
   ```

3. **虚拟化长列表**（如果选项很多）

---

## 🚀 未来扩展方向

- [ ] 支持**自定义分辨率输入**
- [ ] 添加**预设模板**快速选择
- [ ] 集成**历史配置记忆**
- [ ] 支持**批量任务队列**
- [ ] 添加**配置导入/导出**功能
- [ ] 实现**实时预览**效果
- [ ] 支持**键盘快捷键**操作

---

## 📞 技术支持

如有问题请查看：
- [Tailwind CSS文档](https://tailwindcss.com)
- [Lucide React Icons](https://lucide.dev)
- [React官方文档](https://react.dev)

---

**最后更新**: 2026-05-19
**版本**: v1.0.0
**作者**: AI Assistant
**许可证**: SEE LICENSE IN LICENSE
