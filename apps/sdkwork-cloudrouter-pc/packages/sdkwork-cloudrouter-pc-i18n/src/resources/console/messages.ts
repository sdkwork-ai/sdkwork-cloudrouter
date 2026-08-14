import type { I18nMessageBundle } from '../types';

export const consoleMessagesMessages = {
  en: {
    "console.messages.acknowledgeError": "Failed to update notification read state",
    "console.messages.states.emptyTitle": "No messages yet.",
    "console.messages.states.loadErrorFallback": "Messages could not be loaded.",
    "console.messages.states.loading": "Loading messages...",
    "console.messages.states.selectMessage": "Select a message to read details.",
  },
  zh: {
    "console.messages.acknowledgeError": "通知已读状态更新失败",
    "console.messages.states.emptyTitle": "暂无消息。",
    "console.messages.states.loadErrorFallback": "消息加载失败。",
    "console.messages.states.loading": "正在加载消息...",
    "console.messages.states.selectMessage": "选择一条消息查看详情。",
  },
} satisfies I18nMessageBundle;
