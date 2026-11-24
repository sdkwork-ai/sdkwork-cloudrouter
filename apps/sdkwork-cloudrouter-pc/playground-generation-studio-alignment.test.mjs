/**
 * Static alignment checks for Playground generation studio + chat theming.
 * Runs without models-backend-sdk or full playground-chat-runtime imports.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const GENERATIONS_STUDIO = '../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-studio/src';
const INDEX_CSS = './src/index.css';
const MODALITY_PANELS = [
  '../../../sdkwork-image/apps/sdkwork-image-pc/packages/sdkwork-image-pc-generation/src/components/ImageGenerationPanel.tsx',
  '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/components/VideoGenerationPanel.tsx',
  '../../../sdkwork-music/apps/sdkwork-music-pc/packages/sdkwork-music-pc-generation/src/components/MusicGenerationPanel.tsx',
  '../../../sdkwork-audio/apps/sdkwork-audio-pc/packages/sdkwork-audio-pc-generation/src/components/AudioGenerationPanel.tsx',
  '../../../sdkwork-audio/apps/sdkwork-audio-pc/packages/sdkwork-audio-pc-generation/src/components/SfxGenerationPanel.tsx',
];

const indexCss = read(INDEX_CSS);
assert.match(indexCss, /--sdkwork-studio-bg:/);
assert.match(indexCss, /--sdkwork-image-generation-bg: var\(--sdkwork-studio-bg\)/);
assert.match(indexCss, /\.sdkwork-playground-chat-page/);
assert.match(indexCss, /\.sdkwork-playground-chat-composer__submit/);
assert.match(indexCss, /\.sdkwork-model-picker-trigger/);

const modelPickerSource = read('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-picker/src/ModelPicker.tsx');
assert.match(modelPickerSource, /sdkwork-model-picker-trigger/);
assert.doesNotMatch(modelPickerSource, /bg-\[#202024\]/);

assert.match(read(`${GENERATIONS_STUDIO}/formatGenerationCreditPoints.ts`), /formatNumberLocale/);
assert.match(read(`${GENERATIONS_STUDIO}/SdkworkStudioGenerationBottomBar.tsx`), /formatGenerationCreditPoints/);
assert.doesNotMatch(read(`${GENERATIONS_STUDIO}/GenerationModePopupBase.tsx`), /dark:bg-\[#151515\]/);
assert.doesNotMatch(read(`${GENERATIONS_STUDIO}/GenerationModePopupBase.tsx`), /text-slate-/);
assert.match(read(`${GENERATIONS_STUDIO}/GenerationModePopupBase.tsx`), /sdkwork-generation-mode-bar-toggle/);
assert.match(read(`${GENERATIONS_STUDIO}/SdkworkStudioGenerationBottomBar.tsx`), /sdkwork-studio-generate-btn--disabled/);
assert.doesNotMatch(read(`${GENERATIONS_STUDIO}/SdkworkStudioGenerationBottomBar.tsx`), /text-slate-/);

assert.match(indexCss, /--sdkwork-playground-preview-nav-shadow/);

assert.match(read('../../../sdkwork-music/apps/sdkwork-music-pc/packages/sdkwork-music-pc-generation/src/components/MusicGenerationPanel.tsx'), /@sdkwork\/generations-pc-studio\/react/);
assert.match(read('../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/components/VideoGenerationModePopup.tsx'), /@sdkwork\/generations-pc-studio\/react/);
assert.match(read('../../../sdkwork-image/apps/sdkwork-image-pc/packages/sdkwork-image-pc-generation/src/components/ImageGenerationModePopup.tsx'), /@sdkwork\/generations-pc-studio\/react/);

for (const panelPath of MODALITY_PANELS) {
  const source = read(panelPath);
  assert.doesNotMatch(source, /bg-\[#/, `${panelPath} must not use hardcoded hex backgrounds`);
  assert.doesNotMatch(source, /text-slate-/, `${panelPath} must not use hardcoded slate text colors`);
}

// ---------------------------------------------------------------------------
// Parameter alignment: the composer may only offer what the vendor accepts.
// ---------------------------------------------------------------------------

const VIDEO_PANEL = '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/components/VideoGenerationPanel.tsx';
const VIDEO_POPUP = '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/components/VideoGenerationModePopup.tsx';
const VIDEO_CAPABILITY = '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/video-generation-capability.ts';
const VIDEO_INDEX = '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/index.ts';
const VIDEO_REACT = '../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/react.ts';

const videoPanelSource = read(VIDEO_PANEL);
const videoPopupSource = read(VIDEO_POPUP);
const videoCapabilitySource = read(VIDEO_CAPABILITY);

assert.match(videoPanelSource, /resolveVideoDurationCapability/, 'the video panel must resolve the vendor duration rule');
assert.match(videoPanelSource, /resolveVideoAspectRatioOptions/, 'the video panel must resolve the vendor aspect ratios');
assert.match(videoPanelSource, /snapVideoDuration/, 'the video panel must snap a stale duration when the model changes');
assert.match(videoPanelSource, /duration=\{resolveVideoDurationCapability\(selectedModel\)\}/);
assert.match(videoPopupSource, /createDurationSection/, 'the video popup must build its duration section from the capability');
assert.match(videoPopupSource, /createAspectRatioSection/, 'the video popup must build its aspect-ratio section from the capability');
assert.doesNotMatch(videoPopupSource, /max: 15,\s*\n\s*step: 1/, 'the popup must not hardcode the 3-15s window');

// The vendor rule mirrors `vendor.rs::video_duration_rule` in sdkwork-generations.
for (const rule of ['[4, 8, 12]', '[4, 6, 8]', 'min: 3, max: 15', 'min: 1, max: 16', 'min: 2, max: 30']) {
  assert.ok(videoCapabilitySource.includes(rule), `video capability must keep the vendor rule ${rule}`);
}

// The capability is part of the package contract, so consumers never deep-import.
assert.match(read(VIDEO_INDEX), /video-generation-capability\.ts/);
assert.match(read(VIDEO_REACT), /video-generation-capability\.ts/);

// Restored history must keep the modality instead of hardcoding a text bubble.
const generationsServiceSource = read('./packages/sdkwork-cloudrouter-pc-playground/src/playgroundGenerationsService.ts');
assert.doesNotMatch(generationsServiceSource, /type:\s*'text',/, 'history items must be typed from the run modality');
assert.match(generationsServiceSource, /mapSdkworkGenerationModalityToHistoryType/);

console.log('playground generation studio alignment checks passed');
