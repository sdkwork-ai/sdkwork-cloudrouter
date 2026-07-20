import {
  AgentsWorkbench,
  configureAgentsWorkbenchRuntime,
} from '@sdkwork/agents-pc/workbench';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  getSdkworkPromptsAppSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';

configureAgentsWorkbenchRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
});

export function Playground() {
  return (
    <div className="theme-aware-dark-surface sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AgentsWorkbench />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
