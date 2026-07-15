import type { PlaygroundModelOption } from '../../playgroundTypes';
import type { RuntimeUsageSnapshot } from '@sdkwork/clawroutes-pc-commons/runtime-usage';

export type ChatRole = 'user' | 'assistant';

export type ChatMessageStatus = 'sent' | 'responding' | 'complete' | 'failed';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  errorMessage?: string;
  modelName?: string;
  vendorName?: string;
}

export interface ChatSessionSummary {
  id: string;
  latestCompletionId: string;
  title: string;
  modelName?: string;
  vendorName?: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
  messageCount?: number;
}

export interface SimpleChatInputSubmit {
  prompt: string;
  selectedModelId: string;
}

export interface ChatSendInput {
  cancelledFallbackContent?: string;
  messages: ChatMessage[];
  onDelta?: (delta: string) => void;
  onRuntimeEvent?: (event: ChatRuntimeEventProgress) => void;
  onStreamStarted?: (stream: ChatStreamStarted) => void;
  prompt: string;
  selectedModel: PlaygroundModelOption;
  sessionId?: string;
}

export interface ChatRuntimeEventProgress {
  cancelled?: boolean;
  eventNo?: number;
  usage?: Partial<RuntimeUsageSnapshot> | null;
}

export interface ChatStreamStarted {
  runtimeInvocationId: string;
  session: ChatSessionSummary;
  sessionId: string;
  startedAt: string;
  turnId: string;
}

export interface ChatResumeInput extends ChatSendInput {
  initialContent?: string;
  initialUsage?: Partial<RuntimeUsageSnapshot> | null;
  lastEventNo?: number;
  runtimeInvocationId: string;
  session: ChatSessionSummary;
  sessionId: string;
  turnId: string;
}

export interface ChatSendResult {
  assistantMessage: ChatMessage;
  cancelled?: boolean;
  session: ChatSessionSummary;
}
