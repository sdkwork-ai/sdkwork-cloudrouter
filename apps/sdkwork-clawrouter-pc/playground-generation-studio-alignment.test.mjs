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
const CHAT_FILES = [
  './packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx',
  './packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx',
  './packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx',
  './packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageList.tsx',
  './packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatSessionList.tsx',
];
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

const playgroundPageSource = read('../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/pages/PlaygroundPage.tsx');
assert.doesNotMatch(playgroundPageSource, /shadow-xl/);
assert.match(indexCss, /--sdkwork-playground-preview-nav-shadow/);

for (const chatPath of CHAT_FILES) {
  const source = read(chatPath);
  assert.doesNotMatch(source, /bg-\[#/, `${chatPath} must not use hardcoded hex backgrounds`);
}

assert.match(read('../../../sdkwork-music/apps/sdkwork-music-pc/packages/sdkwork-music-pc-generation/src/components/MusicGenerationPanel.tsx'), /@sdkwork\/generations-pc-studio\/react/);
assert.match(read('../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/components/VideoGenerationModePopup.tsx'), /@sdkwork\/generations-pc-studio\/react/);
assert.match(read('../../../sdkwork-image/apps/sdkwork-image-pc/packages/sdkwork-image-pc-generation/src/components/ImageGenerationModePopup.tsx'), /@sdkwork\/generations-pc-studio\/react/);

for (const panelPath of MODALITY_PANELS) {
  const source = read(panelPath);
  assert.doesNotMatch(source, /bg-\[#/, `${panelPath} must not use hardcoded hex backgrounds`);
  assert.doesNotMatch(source, /text-slate-/, `${panelPath} must not use hardcoded slate text colors`);
}

console.log('playground generation studio alignment checks passed');
