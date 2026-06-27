import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/runtime';
import type { ChatMessage } from './chatTypes';

export function createChatUserMessage(prompt: string, createdAt = new Date(), id = createChatMessageId('user')): ChatMessage {
  return {
    id,
    role: 'user',
    content: prompt,
    createdAt: createdAt.toISOString(),
    status: 'sent',
  };
}

export function createPendingAssistantMessage(createdAt = new Date()): ChatMessage {
  return {
    id: createChatMessageId('assistant'),
    role: 'assistant',
    content: '',
    createdAt: createdAt.toISOString(),
    status: 'responding',
  };
}

export function createFailedAssistantMessage(content: string, createdAt = new Date()): ChatMessage {
  return {
    id: createChatMessageId('assistant'),
    role: 'assistant',
    content,
    createdAt: createdAt.toISOString(),
    status: 'failed',
  };
}

export function createChatAssistantMessage({
  content,
  modelName,
  vendorName,
  createdAt = new Date(),
}: {
  content: string;
  modelName?: string;
  vendorName?: string;
  createdAt?: Date;
}): ChatMessage {
  return {
    id: createChatMessageId('assistant'),
    role: 'assistant',
    content,
    createdAt: createdAt.toISOString(),
    status: 'complete',
    modelName,
    vendorName,
  };
}

export function createChatMessageId(prefix: string): string {
  return createClientOperationToken(prefix);
}
