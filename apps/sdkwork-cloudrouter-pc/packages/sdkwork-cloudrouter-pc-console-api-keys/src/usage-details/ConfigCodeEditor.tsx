import { useEffect, useMemo, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import type { ApiKeyUsageToolId } from './toolProfiles';

// Monaco 主包体积较大，采用动态加载：仅在配置编辑器首次挂载时按需下载。
// worker 仅注册基础语法 tokenization 所需的 editor worker 与 JSON 校验 worker。
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

/** 各工具的配置文件语言（与 VSCode 语法高亮一致） */
const TOOL_LANGUAGE: Record<ApiKeyUsageToolId, string> = {
  codex: 'toml',
  'claude-code': 'shell',
  gemini: 'shell',
  opencode: 'json',
  openclaw: 'json',
  'hermes-agent': 'yaml',
  'mimo-code': 'json',
  rig: 'rust',
};

const LANGUAGE_LABEL: Record<string, string> = {
  toml: 'TOML',
  shell: 'SHELL',
  json: 'JSON',
  yaml: 'YAML',
  rust: 'RUST',
};

/** 单行行高与上下留白（与 options.lineHeight/padding 保持一致） */
const LINE_HEIGHT = 19;
const VERTICAL_PADDING = 24;
const MIN_HEIGHT = 152;
const MAX_HEIGHT = 440;

interface ConfigCodeEditorProps {
  toolId: ApiKeyUsageToolId;
  value: string;
}

export function ConfigCodeEditor({ toolId, value }: ConfigCodeEditorProps) {
  const [dark, setDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );
  const [monacoReady, setMonacoReady] = useState(false);

  // 首次挂载时加载本地 Monaco 实例并绑定到 @monaco-editor/react 的 loader，
  // 避免依赖 CDN（离线可用）与首屏加载大包。
  useEffect(() => {
    let disposed = false;
    void import('monaco-editor').then((monacoModule) => {
      if (disposed) {
        return;
      }
      loader.config({ monaco: monacoModule });
      setMonacoReady(true);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) {
      return;
    }
    const handleChange = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const language = TOOL_LANGUAGE[toolId] ?? 'plaintext';

  // 高度随内容行数自适应（贴近 VSCode 的观感），过长时编辑器内部滚动
  const height = useMemo(() => {
    const lineCount = value.split('\n').length;
    return Math.min(Math.max(lineCount * LINE_HEIGHT + VERTICAL_PADDING, MIN_HEIGHT), MAX_HEIGHT);
  }, [value]);

  const options = useMemo<import('monaco-editor').editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      fontSize: 12.5,
      fontLigatures: true,
      wordWrap: 'off',
      scrollBeyondLastLine: false,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        useShadows: false,
      },
      renderWhitespace: 'none',
      renderLineHighlight: 'line',
      lineHeight: LINE_HEIGHT,
      padding: { top: 12, bottom: 12 },
      contextmenu: false,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 8,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      cursorBlinking: 'solid',
      cursorStyle: 'block-outline',
      stickyScroll: { enabled: false },
      smoothScrolling: true,
      automaticLayout: true,
    }),
    [],
  );

  return (
    <div
      className="relative overflow-hidden rounded-b-lg bg-white dark:bg-[#1e1e1e]"
      style={{ height }}
      data-tool-id={toolId}
    >
      {monacoReady ? (
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={dark ? 'vs-dark' : 'vs'}
          options={options}
          loading={null}
        />
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-xs text-slate-400 dark:text-slate-500">
          Loading editor…
        </div>
      )}
      <span className="pointer-events-none absolute right-3 top-2.5 select-none rounded bg-slate-100/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-500 dark:bg-white/10 dark:text-slate-400">
        {LANGUAGE_LABEL[language] ?? language.toUpperCase()}
      </span>
    </div>
  );
}
