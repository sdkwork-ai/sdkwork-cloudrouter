import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ExplainUpstreamAccountGroupRouteRequest,
  UpstreamAccountGroup,
  UpstreamAccountGroupRouteExplanation,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlement,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import { errorMessageI18n, Field, InlineError, inputClass, Modal } from './components';
import {
  emptyResourceSelection,
  ResourcePicker,
  toEntitlements,
  toSelection,
  type ResourceSelection,
} from './resourcePicker';

/**
 * 账号组资源授权编辑器。
 *
 * 组授权与供应商授权取交集后才成为账号的 `apiScope`；这张表是“为什么账号
 * 配好了却路由不到”的直接输入，因此必须能从管理面查看和修复，而不是只能
 * 靠 seed/SQL。保存后后端会推进组版本并刷新路由快照。
 */
export function GroupResourcesModal({
  group,
  onSaved,
  onClose,
}: {
  group: UpstreamAccountGroup;
  onSaved: (group: UpstreamAccountGroup) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [selection, setSelection] = useState<ResourceSelection>(emptyResourceSelection());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denyCount, setDenyCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      upstreamService.fetchResourceCatalog(),
      upstreamService.accountGroups.listResources(group.id),
    ])
      .then(([nextCatalog, entitlements]: [UpstreamResourceCatalogResponse, UpstreamResourceEntitlement[]]) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        // ResourcePicker 只表达 allow；deny 条目不能被静默改写成 allow，
        // 所以存在 deny 时禁用本编辑器并提示改用支持 deny 的入口。
        setDenyCount(entitlements.filter((entry) => entry.grantType === 'deny').length);
        setSelection(toSelection(entitlements.filter((entry) => entry.grantType === 'allow')));
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [group.id, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (denyCount > 0) {
      setError(t('admin.upstream.accountGroup.resources.denyUnsupported'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accountGroups.replaceResources(group, { items: toEntitlements(selection) });
      onSaved(await upstreamService.accountGroups.retrieve(group.id));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('admin.upstream.accountGroup.resources.title')}
      busy={busy}
      submitLabel={t('admin.upstream.accountGroup.resources.save')}
      onSubmit={submit}
      onClose={onClose}
      size="xl"
    >
      <div className="grid gap-3">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('admin.upstream.accountGroup.resources.description')}
        </p>
        <InlineError message={error} />
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.common.status.loading')}</p>
        ) : denyCount > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {t('admin.upstream.accountGroup.resources.denyUnsupported')}
          </p>
        ) : catalog ? (
          <ResourcePicker
            resources={catalog.resources ?? []}
            resourceGroups={catalog.resourceGroups ?? []}
            selection={selection}
            onChange={setSelection}
            flat
            className="flex min-h-0 flex-col"
            listClassName="min-h-0 max-h-96"
          />
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * 路由解释：调用后端 `route_explain`，把一个组的选路结果按候选/阻断原因
 * 展示出来，替代“只能翻日志”的排障方式。
 */
export function GroupRouteExplainModal({
  group,
  onClose,
}: {
  group: UpstreamAccountGroup;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [apiKeyId, setApiKeyId] = useState('');
  const [model, setModel] = useState('');
  const [apiCode, setApiCode] = useState('openai.chat_completions');
  const [capability, setCapability] = useState('chat');
  const [explanation, setExplanation] = useState<UpstreamAccountGroupRouteExplanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = useMemo(
    () => (explanation?.blockedReasons ?? []).filter((issue) => issue.severity === 'blocking'),
    [explanation],
  );
  const warnings = useMemo(
    () => (explanation?.warnings ?? []).filter((issue) => issue.severity === 'warning'),
    [explanation],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const catalogKey = model.trim();
      const normalizedApiCode = apiCode.trim();
      const request: ExplainUpstreamAccountGroupRouteRequest = {
        apiKeyId: apiKeyId.trim(),
        // 后端在 apiCode 缺省时用 resourceCode 推导；这里显式给 apiCode，
        // resourceCode 只作为必填契约的占位。
        resourceCode: normalizedApiCode || catalogKey,
        apiCode: normalizedApiCode || undefined,
        catalogKey: catalogKey || undefined,
        model: catalogKey || undefined,
        capability: capability.trim() || undefined,
      };
      setExplanation(await upstreamService.accountGroups.explain(group.id, request));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
      setExplanation(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('admin.upstream.accountGroup.explain.title')}
      busy={busy}
      submitLabel={t('admin.upstream.accountGroup.explain.action')}
      onSubmit={submit}
      onClose={onClose}
      size="xl"
    >
      <div className="grid gap-4">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('admin.upstream.accountGroup.explain.description')}
        </p>
        <InlineError message={error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.upstream.accountGroup.explain.apiKeyId')} required>
            <input className={inputClass} value={apiKeyId} onChange={(event) => setApiKeyId(event.currentTarget.value)} required />
          </Field>
          <Field label={t('admin.upstream.accountGroup.explain.model')} required>
            <input className={inputClass} value={model} onChange={(event) => setModel(event.currentTarget.value)} placeholder="deepseek/deepseek-flash" required />
          </Field>
          <Field label={t('admin.upstream.accountGroup.explain.apiCode')}>
            <input className={inputClass} value={apiCode} onChange={(event) => setApiCode(event.currentTarget.value)} />
          </Field>
          <Field label={t('admin.upstream.accountGroup.explain.capability')}>
            <input className={inputClass} value={capability} onChange={(event) => setCapability(event.currentTarget.value)} />
          </Field>
        </div>
        {explanation ? (
          <div className="grid gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${explanation.ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                {explanation.ready ? t('admin.upstream.accountGroup.explain.ready') : t('admin.upstream.accountGroup.explain.notReady')}
              </span>
              <span className="text-xs text-slate-500">group={explanation.groupCode} · candidates={explanation.candidateCount} · api={explanation.apiCode}</span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{t('admin.upstream.accountGroup.explain.candidates', { count: explanation.candidateCount })}</p>
              {explanation.selectedCandidates.length === 0
                ? <p className="text-xs text-slate-500">{t('admin.upstream.accountGroup.explain.empty')}</p>
                : explanation.selectedCandidates.map((candidate) => (
                  <p key={`${candidate.accountId}-${candidate.kind}`} className="font-mono text-xs">
                    {candidate.kind} · {candidate.supplierCode} · {candidate.accountId} · {candidate.providerModel ?? '-'}
                  </p>
                ))}
            </div>
            {blocked.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-rose-600">{t('admin.upstream.accountGroup.explain.blocked')}</p>
                {blocked.map((issue) => <p key={`${issue.code}-${issue.message}`} className="text-xs text-rose-700 dark:text-rose-300">{issue.code}: {issue.message}</p>)}
              </div>
            ) : null}
            {warnings.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-amber-600">{t('admin.upstream.accountGroup.explain.warnings')}</p>
                {warnings.map((issue) => <p key={`${issue.code}-${issue.message}`} className="text-xs text-amber-700 dark:text-amber-300">{issue.code}: {issue.message}</p>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
