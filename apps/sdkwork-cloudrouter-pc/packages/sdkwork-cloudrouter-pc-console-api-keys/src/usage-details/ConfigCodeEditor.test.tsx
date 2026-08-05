// ConfigCodeEditor 渲染契约：只读 Monaco 编辑器按工具语言/主题渲染，并展示语言徽章
// 运行：pnpm --dir packages/sdkwork-cloudrouter-pc-console-api-keys exec vitest run src/usage-details/ConfigCodeEditor.test.tsx --environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigCodeEditor } from './ConfigCodeEditor';

// Monaco 在 jsdom 中无法真实运行：mock 编辑器组件、动态导入的 monaco 实例与本地 loader 配置
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language, theme }: { value: string; language: string; theme: string }) => (
    <div data-testid="monaco-editor" data-language={language} data-theme={theme}>
      {value}
    </div>
  ),
  loader: { config: vi.fn() },
}));
vi.mock('monaco-editor', () => ({ editor: {} }));

afterEach(() => {
  cleanup();
});

describe('ConfigCodeEditor', () => {
  it('renders the snippet with the tool-specific language and light theme', async () => {
    render(<ConfigCodeEditor toolId="codex" value="model_provider = &quot;cloudrouter&quot;" />);
    const editor = await screen.findByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('toml');
    expect(editor.getAttribute('data-theme')).toBe('vs');
    expect(editor.textContent).toContain('cloudrouter');
    expect(screen.getByText('TOML')).toBeTruthy();
  });

  it('maps each tool to its config language and label', async () => {
    const cases: Array<[Parameters<typeof ConfigCodeEditor>[0]['toolId'], string, string]> = [
      ['codex', 'toml', 'TOML'],
      ['claude-code', 'shell', 'SHELL'],
      ['gemini', 'shell', 'SHELL'],
      ['opencode', 'json', 'JSON'],
      ['openclaw', 'json', 'JSON'],
      ['hermes-agent', 'yaml', 'YAML'],
      ['mimo-code', 'json', 'JSON'],
      ['rig', 'rust', 'RUST'],
    ];
    for (const [toolId, language, label] of cases) {
      cleanup();
      render(<ConfigCodeEditor toolId={toolId} value="x" />);
      const editor = await screen.findByTestId('monaco-editor');
      expect(editor.getAttribute('data-language'), toolId).toBe(language);
      expect(screen.getByText(label), toolId).toBeTruthy();
    }
  });

  it('clamps editor height to the supported range by line count', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    // 单行内容 → 最小高度
    const { rerender, unmount } = render(
      <ConfigCodeEditor toolId="codex" value="line1" />,
      { container },
    );
    await screen.findByTestId('monaco-editor');
    expect(container.querySelector('[data-tool-id]')?.getAttribute('style')).toContain('height: 152px');
    // 30 行内容 → 封顶高度
    rerender(<ConfigCodeEditor toolId="rig" value={Array.from({ length: 30 }, (_, i) => `line${i}`).join('\n')} />);
    expect(container.querySelector('[data-tool-id]')?.getAttribute('style')).toContain('height: 440px');
    unmount();
    document.body.removeChild(container);
  });
});
