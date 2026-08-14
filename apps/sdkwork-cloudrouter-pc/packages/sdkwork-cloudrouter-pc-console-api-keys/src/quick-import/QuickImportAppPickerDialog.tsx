import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Check,
  Code2,
  ExternalLink,
  Gem,
  Info,
  Loader2,
  PawPrint,
  Rocket,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  fetchGatewayModelList,
  resolveRelayHomepage,
  type CcSwitchApp,
} from './quickImport';

interface QuickImportAppPickerDialogProps {
  keyName: string;
  maskedKey: string;
  /** Plaintext key used to fetch the key-specific model list. */
  rawKey: string;
  onSelect: (app: CcSwitchApp, options: { name: string; model?: string }) => void;
  onClose: () => void;
  /** 点击遮罩（弹窗外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
  /**
   * Whether to show the app selection grid. When false the dialog only
   * configures name / default model and submits via the confirm button —
   * used for targets with unified model configuration (Birdcoder), which
   * submit with the fixed `claude` app value.
   */
  showAppSelection?: boolean;
  /** Confirm button label in configure mode (e.g. "Import to Birdcoder"). */
  confirmLabel?: string;
}

interface AppOption {
  id: CcSwitchApp;
  icon: ReactNode;
  iconClassName: string;
}

const APP_OPTIONS: AppOption[] = [
  {
    id: 'claude',
    icon: <Sparkles className="h-5 w-5" />,
    iconClassName: 'bg-orange-50 text-orange-500 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400',
  },
  {
    id: 'codex',
    icon: <Terminal className="h-5 w-5" />,
    iconClassName: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-300',
  },
  {
    id: 'gemini',
    icon: <Gem className="h-5 w-5" />,
    iconClassName: 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-500/10 dark:border-primary-500/20 dark:text-primary-400',
  },
  {
    id: 'grokbuild',
    icon: <Rocket className="h-5 w-5" />,
    iconClassName: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/20 dark:text-fuchsia-400',
  },
  {
    id: 'opencode',
    icon: <Code2 className="h-5 w-5" />,
    iconClassName: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400',
  },
  {
    id: 'openclaw',
    icon: <PawPrint className="h-5 w-5" />,
    iconClassName: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400',
  },
  {
    id: 'hermes',
    icon: <Terminal className="h-5 w-5" />,
    iconClassName: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400',
  },
];

/**
 * Import configuration dialog shared by CC Switch and Birdcoder flows.
 *
 * For CC Switch the user first picks which app the relay provider belongs to
 * (CC Switch keeps a separate provider list per app); for Birdcoder — which
 * unifies model configuration — the app grid is hidden and the dialog submits
 * directly with the fixed `claude` app value. Both flows let the user adjust
 * the imported provider name and pick the default model from the model list
 * the gateway exposes for this key (`GET /v1/models`).
 *
 * The provider being imported is the Cloud Router relay itself; its official
 * website (shown on the CC Switch provider card via the `homepage` link
 * parameter) is linked from the description.
 */
export function QuickImportAppPickerDialog({
  keyName,
  maskedKey,
  rawKey,
  onSelect,
  onClose,
  closeOnClickOutside = true,
  showAppSelection = true,
  confirmLabel,
}: QuickImportAppPickerDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(keyName || 'Cloud Router');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  // App selection is a toggle: pick an option, switch to another one, or
  // click the selected option again to clear it — import only happens on the
  // footer confirm button.
  const [selectedApp, setSelectedApp] = useState<CcSwitchApp | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchGatewayModelList(rawKey).then((items) => {
      if (!cancelled) {
        setModels(items);
        setModelsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rawKey]);

  const submit = (app: CcSwitchApp) => {
    const trimmedName = name.trim();
    const trimmedModel = model.trim();
    onSelect(app, {
      name: trimmedName || keyName || 'Cloud Router',
      ...(trimmedModel ? { model: trimmedModel } : {}),
    });
  };

  const inputClassName =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white placeholder:text-slate-400';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252525]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {showAppSelection
                ? t('console.apiKeys.quickImport.appPickerTitle', '选择要导入的应用')
                : t('console.apiKeys.quickImport.configureTitle', '配置导入')}
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {keyName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: maskedKey })}
              <span className="ml-2 font-mono">{maskedKey}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('common.actions.close', '关闭')}
            title={t('common.actions.close', '关闭')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
          {showAppSelection && (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t(
                'console.apiKeys.quickImport.appPickerDescription',
                'CC Switch manages providers separately for each app. Choose the app this Cloud Router provider should be imported into.',
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              const homepage = resolveRelayHomepage();
              if (homepage) {
                window.open(homepage, '_blank', 'noopener,noreferrer');
              }
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('console.apiKeys.quickImport.relayHomepage', '中转站官网')}
          </button>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('console.apiKeys.quickImport.importName', '导入名称')}
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={keyName || 'Cloud Router'}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('console.apiKeys.quickImport.defaultModel', '默认模型')}
              </span>
              <div className="relative">
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={modelsLoading}
                  className={`${inputClassName} appearance-none pr-8 disabled:cursor-wait disabled:opacity-60`}
                >
                  <option value="">
                    {t('console.apiKeys.quickImport.noModel', '不指定')}
                  </option>
                  {models.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {modelsLoading && (
                  <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
              {!modelsLoading && models.length === 0 && (
                <span className="mt-1 block text-[11px] text-amber-600 dark:text-amber-400">
                  {t(
                    'console.apiKeys.quickImport.modelListUnavailable',
                    '无法获取该令牌的模型列表，可稍后在应用中设置默认模型',
                  )}
                </span>
              )}
            </label>
          </div>
          {showAppSelection && (
            <>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {APP_OPTIONS.map((option) => {
                  const isSelected = selectedApp === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedApp((current) => (
                        current === option.id ? null : option.id
                      ))}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10'
                          : 'border-slate-200 bg-slate-50 hover:border-primary-300 hover:bg-primary-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${option.iconClassName}`}
                      >
                        {option.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-white">
                          {t(`console.apiKeys.quickImport.appPickerApps.${option.id}`, option.id)}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {t(
                            `console.apiKeys.quickImport.appPickerApps.${option.id}Description`,
                            '',
                          )}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-slate-300 bg-white text-transparent dark:border-white/20 dark:bg-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">
                  {t(
                    'console.apiKeys.quickImport.appPickerClaudeDesktopHint',
                    'Claude Desktop：CC Switch 暂不支持通过链接直接导入。请先导入到 Claude，然后在 CC Switch 的 Claude Desktop 面板点击「将 Claude Code 中已有的供应商导入」即可一键迁移。',
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-[#1a1a1a]">
          <button
            type="button"
            onClick={() => {
              const homepage = resolveRelayHomepage();
              if (homepage) {
                window.open(homepage, '_blank', 'noopener,noreferrer');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('console.apiKeys.quickImport.relayHomepage', '中转站官网')}
          </button>
          <div className="flex items-center gap-2">
            {showAppSelection ? (
              <button
                type="button"
                disabled={!selectedApp}
                onClick={() => {
                  if (selectedApp) {
                    submit(selectedApp);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('console.apiKeys.quickImport.confirmImport', '确认导入')}
              </button>
            ) : confirmLabel ? (
              <button
                onClick={() => submit('claude')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                {confirmLabel}
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5"
            >
              {t('common.actions.cancel', '取消')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
