import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveCloudRouterDeployApplicationId } from '@sdkwork/cloudroutes-pc-commons/deploy-application-id';
import { getSdkworkDeploymentsAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * WeChat channel release board.
 *
 * Reads the Deploy channel-release projection for the Cloud Router deployment
 * application. The page is read-only: releases are created and advanced by the
 * Deploy publish pipeline, and this board exists to show where each mini program
 * or official account release currently stands.
 */

const ENVIRONMENTS = ['development', 'test', 'staging', 'demo', 'production'] as const;

type Environment = (typeof ENVIRONMENTS)[number];

interface ChannelReleaseRow {
  id: string;
  environment: string;
  channel: string;
  accessMode: string;
  releaseStatus: string;
  providerVersion?: string;
  templateId?: string;
  commitId?: string;
  auditId?: string;
  grayPercentage?: number;
  errorCode?: string;
  submittedAt?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

const PAGE_SIZE = 20;

type PublishAction =
  | 'upload'
  | 'submit_audit'
  | 'release'
  | 'rollback'
  | 'gray'
  | 'modify_domains'
  | 'set_privacy';

const PUBLISH_ACTIONS: readonly PublishAction[] = [
  'upload',
  'submit_audit',
  'release',
  'rollback',
  'gray',
  'modify_domains',
  'set_privacy',
];

export function CloudRouterIamChannelReleasesPage() {
  const { t } = useTranslation();
  const [appId, setAppId] = useState(() => resolveCloudRouterDeployApplicationId());
  const [environment, setEnvironment] = useState<Environment | ''>('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<readonly ChannelReleaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<ChannelReleaseRow>();
  const [publishAction, setPublishAction] = useState<PublishAction>('upload');
  const [authorizationId, setAuthorizationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [providerVersion, setProviderVersion] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [grayPercentage, setGrayPercentage] = useState('30');
  const [itemsJson, setItemsJson] = useState('[]');
  const [domainAction, setDomainAction] = useState<'add' | 'set' | 'delete'>('add');
  const [domainsText, setDomainsText] = useState('');
  const [privacyJson, setPrivacyJson] = useState('{}');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string>();

  const runPublish = async () => {
    if (!selected) {
      return;
    }
    setPublishing(true);
    setPublishResult(undefined);
    try {
      let items: Record<string, unknown>[] | undefined;
      if (publishAction === 'submit_audit') {
        const parsed: unknown = JSON.parse(itemsJson.trim() || '[]');
        if (!Array.isArray(parsed)) {
          throw new Error(t('admin.iam.channelReleases.publish.invalidItems'));
        }
        items = parsed as Record<string, unknown>[];
      }
      let domains: string[] | undefined;
      if (publishAction === 'modify_domains') {
        domains = domainsText
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        if (domains.length === 0) {
          throw new Error(t('admin.iam.channelReleases.publish.invalidDomains'));
        }
      }
      let privacy: Record<string, unknown> | undefined;
      if (publishAction === 'set_privacy') {
        const parsed: unknown = JSON.parse(privacyJson.trim() || '{}');
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error(t('admin.iam.channelReleases.publish.invalidPrivacy'));
        }
        privacy = parsed as Record<string, unknown>;
      }
      const client = getSdkworkDeploymentsAppSdkClient();
      const updated = await client.release.channelReleases.publishCommands.create(
        appId,
        selected.id,
        {
          action: publishAction,
          authorizationId: authorizationId.trim(),
          ...(publishAction === 'upload' && templateId.trim()
            ? { templateId: templateId.trim() }
            : {}),
          ...(publishAction === 'upload' && providerVersion.trim()
            ? { providerVersion: providerVersion.trim() }
            : {}),
          ...(publishAction === 'rollback' ? { targetVersion: targetVersion.trim() } : {}),
          ...(publishAction === 'gray'
            ? { grayPercentage: Number(grayPercentage) }
            : {}),
          ...(items ? { items } : {}),
          ...(domains ? { domainAction, domains } : {}),
          ...(privacy ? { privacy } : {}),
        },
        { idempotencyKey: crypto.randomUUID() },
      );
      setPublishResult(JSON.stringify(updated, null, 2));
      setSelected(updated as ChannelReleaseRow);
      await load();
    } catch (publishError) {
      setPublishResult(
        publishError instanceof Error ? publishError.message : String(publishError),
      );
    } finally {
      setPublishing(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const client = getSdkworkDeploymentsAppSdkClient();
      const result = await client.release.channelReleases.list(appId, {
        page,
        pageSize: PAGE_SIZE,
        ...(environment ? { environment } : {}),
      });
      setRows(result.items as ChannelReleaseRow[]);
      setTotal(Number(result.pageInfo.totalItems ?? 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [appId, environment, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const availableActions =
    selected?.accessMode === 'self_managed'
      ? PUBLISH_ACTIONS.filter((action) => action === 'upload')
      : PUBLISH_ACTIONS;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">
          {t('admin.iam.channelReleases.title')}
        </h1>
        <p className="text-sm text-[var(--sdk-color-text-secondary)]">
          {t('admin.iam.channelReleases.description')}
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('admin.iam.channelReleases.appId')}</span>
          <input
            className="w-80 rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
            onChange={(event) => {
              setPage(1);
              setAppId(event.target.value.trim());
            }}
            value={appId}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('admin.iam.channelReleases.environment')}</span>
          <select
            className="rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
            onChange={(event) => {
              setPage(1);
              setEnvironment(event.target.value as Environment | '');
            }}
            value={environment}
          >
            <option value="">{t('admin.iam.channelReleases.allEnvironments')}</option>
            {ENVIRONMENTS.map((value) => (
              <option key={value} value={value}>
                {t(`admin.iam.channelReleases.environments.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm font-medium"
          disabled={loading}
          onClick={() => void load()}
          type="button"
        >
          {t('admin.iam.channelReleases.refresh')}
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {t('admin.iam.channelReleases.error')}: {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--sdk-color-text-secondary)]" role="status">
          {t('admin.iam.channelReleases.loading')}
        </p>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="text-sm text-[var(--sdk-color-text-secondary)]">
          {t('admin.iam.channelReleases.empty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-[var(--sdk-color-border)]">
          <table className="min-w-full divide-y divide-[var(--sdk-color-border)] text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.status')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.channel')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.environment')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.providerVersion')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.gray')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.iam.channelReleases.columns.updatedAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border)]">
              {rows.map((row) => (
                <tr
                  className="cursor-pointer hover:bg-[var(--sdk-color-surface-muted)]"
                  key={row.id}
                  onClick={() => {
                    setSelected(row);
                    setTemplateId(row.templateId ?? '');
                    setProviderVersion(row.providerVersion ?? '');
                    setTargetVersion(row.providerVersion ?? '');
                    if (row.accessMode === 'self_managed') {
                      setPublishAction('upload');
                    }
                  }}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.releaseStatus}</td>
                  <td className="px-3 py-2">{row.channel}</td>
                  <td className="px-3 py-2">{row.environment}</td>
                  <td className="px-3 py-2">{row.providerVersion ?? '—'}</td>
                  <td className="px-3 py-2">{row.grayPercentage ?? 0}%</td>
                  <td className="px-3 py-2">{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm">
        <button
          className="rounded-md border border-[var(--sdk-color-border)] px-3 py-1.5 disabled:opacity-50"
          disabled={!hasPrevious || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          type="button"
        >
          {t('admin.iam.channelReleases.previous')}
        </button>
        <span>
          {page} / {pageCount}
        </span>
        <button
          className="rounded-md border border-[var(--sdk-color-border)] px-3 py-1.5 disabled:opacity-50"
          disabled={!hasNext || loading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          {t('admin.iam.channelReleases.next')}
        </button>
      </div>

      {selected ? (
        <section className="space-y-2 rounded-md border border-[var(--sdk-color-border)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t('admin.iam.channelReleases.detailTitle')}</h2>
            <button
              className="rounded-md border border-[var(--sdk-color-border)] px-3 py-1 text-sm"
              onClick={() => setSelected(undefined)}
              type="button"
            >
              {t('admin.iam.channelReleases.close')}
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {(
              [
                ['releaseStatus', selected.releaseStatus],
                ['channel', selected.channel],
                ['environment', selected.environment],
                ['providerVersion', selected.providerVersion ?? '—'],
                ['templateId', selected.templateId ?? '—'],
                ['commitId', selected.commitId ?? '—'],
                ['auditId', selected.auditId ?? '—'],
                ['errorCode', selected.errorCode ?? '—'],
                ['submittedAt', selected.submittedAt ?? '—'],
                ['releasedAt', selected.releasedAt ?? '—'],
                ['version', selected.version],
                ['id', selected.id],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase text-[var(--sdk-color-text-secondary)]">{label}</dt>
                <dd className="break-all font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2 border-t border-[var(--sdk-color-border)] pt-3">
            <h3 className="font-medium">{t('admin.iam.channelReleases.publish.title')}</h3>
            {selected.accessMode === 'self_managed' ? (
              <p className="text-xs text-[var(--sdk-color-text-secondary)]">
                {t('admin.iam.channelReleases.publish.selfManagedHint')}
              </p>
            ) : null}
            <div className="grid gap-2 md:grid-cols-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  {t('admin.iam.channelReleases.publish.authorization')}
                </span>
                <input
                  className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                  onChange={(event) => setAuthorizationId(event.target.value)}
                  value={authorizationId}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  {t('admin.iam.channelReleases.publish.action')}
                </span>
                <select
                  className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                  onChange={(event) => setPublishAction(event.target.value as PublishAction)}
                  value={publishAction}
                >
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {t(`admin.iam.channelReleases.publish.actions.${action}`)}
                    </option>
                  ))}
                </select>
              </label>
              {publishAction === 'upload' ? (
                <>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">
                      {t('admin.iam.channelReleases.publish.templateId')}
                    </span>
                    <input
                      className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                      onChange={(event) => setTemplateId(event.target.value)}
                      value={templateId}
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">
                      {t('admin.iam.channelReleases.publish.providerVersion')}
                    </span>
                    <input
                      className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                      onChange={(event) => setProviderVersion(event.target.value)}
                      value={providerVersion}
                    />
                  </label>
                </>
              ) : null}
              {publishAction === 'rollback' ? (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    {t('admin.iam.channelReleases.publish.targetVersion')}
                  </span>
                  <input
                    className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                    onChange={(event) => setTargetVersion(event.target.value)}
                    value={targetVersion}
                  />
                </label>
              ) : null}
              {publishAction === 'gray' ? (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    {t('admin.iam.channelReleases.publish.grayPercentage')}
                  </span>
                  <input
                    className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                    max={100}
                    min={0}
                    onChange={(event) => setGrayPercentage(event.target.value)}
                    type="number"
                    value={grayPercentage}
                  />
                </label>
              ) : null}
            </div>
            {publishAction === 'submit_audit' ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  {t('admin.iam.channelReleases.publish.items')}
                </span>
                <textarea
                  className="min-h-[5rem] w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 font-mono text-xs"
                  onChange={(event) => setItemsJson(event.target.value)}
                  value={itemsJson}
                />
              </label>
            ) : null}
            {publishAction === 'modify_domains' ? (
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    {t('admin.iam.channelReleases.publish.domainAction')}
                  </span>
                  <select
                    className="w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 text-sm"
                    onChange={(event) =>
                      setDomainAction(event.target.value as 'add' | 'set' | 'delete')
                    }
                    value={domainAction}
                  >
                    <option value="add">{t('admin.iam.channelReleases.publish.domainAdd')}</option>
                    <option value="set">{t('admin.iam.channelReleases.publish.domainSet')}</option>
                    <option value="delete">{t('admin.iam.channelReleases.publish.domainDelete')}</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    {t('admin.iam.channelReleases.publish.domains')}
                  </span>
                  <textarea
                    className="min-h-[5rem] w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 font-mono text-xs"
                    onChange={(event) => setDomainsText(event.target.value)}
                    value={domainsText}
                  />
                </label>
              </div>
            ) : null}
            {publishAction === 'set_privacy' ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  {t('admin.iam.channelReleases.publish.privacy')}
                </span>
                <textarea
                  className="min-h-[5rem] w-full rounded-md border border-[var(--sdk-color-border)] px-3 py-2 font-mono text-xs"
                  onChange={(event) => setPrivacyJson(event.target.value)}
                  value={privacyJson}
                />
              </label>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-[var(--sdk-color-border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                disabled={publishing || !authorizationId.trim()}
                onClick={() => void runPublish()}
                type="button"
              >
                {t('admin.iam.channelReleases.publish.run')}
              </button>
              {publishing ? (
                <span className="text-xs text-[var(--sdk-color-text-secondary)]">
                  {t('admin.iam.channelReleases.publish.running')}
                </span>
              ) : null}
            </div>
            {publishResult ? (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/5 p-3 text-xs">
                {publishResult}
              </pre>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
