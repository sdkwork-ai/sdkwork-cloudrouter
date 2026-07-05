import {
  PlaygroundPage,
  type PlaygroundHostPort,
} from '@sdkwork/generations-pc-playground/react';
import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/runtime';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';
import { ChatPage } from '../components/chat/ChatPage';
import { PlaygroundService } from '../playgroundService';

const clawRouterPlaygroundHost: PlaygroundHostPort = {
  fetchGenerationHistory: () => PlaygroundService.fetchGenerationHistory(),
  fetchModelGroups: () => PlaygroundService.fetchModelGroups(),
  runGeneration: (input) => PlaygroundService.runGeneration(input),
  createClientOperationToken,
  copyTextToClipboard: async (text) => {
    const result = await copyTextToClipboard(text);
    return { ok: result.ok };
  },
};

export function Playground() {
  return (
    <div className="theme-aware-dark-surface sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <PlaygroundPage host={clawRouterPlaygroundHost} ChatPage={ChatPage} />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
