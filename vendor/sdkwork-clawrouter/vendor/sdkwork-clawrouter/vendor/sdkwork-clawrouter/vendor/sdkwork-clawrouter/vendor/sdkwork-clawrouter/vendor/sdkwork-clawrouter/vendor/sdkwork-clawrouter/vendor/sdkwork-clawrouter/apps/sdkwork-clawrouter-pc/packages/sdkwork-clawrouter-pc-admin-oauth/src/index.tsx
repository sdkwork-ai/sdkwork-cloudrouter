import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  KeyRound,
  MessageCircle,
  Save,
  Smartphone,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  DEFAULT_OAUTH_PAGE_PARAMS,
  OAUTH_SDK_RESOURCE_UNAVAILABLE_ERROR,
  createOAuthResourceAccount,
  listOAuthResourceAccounts,
  type OAuthListParams,
  type OAuthResourceRecord,
} from './oauthAdminService';

export type OAuthAdminSectionId = 'oauthLoginPlatforms' | 'officialAccounts' | 'miniPrograms';

type OAuthAdminRouteProps = {
  sectionId?: string;
};

type OAuthResourceAccountKind = 'open_app' | 'official_account' | 'mini_program';

type OAuthAccountSection = {
  id: OAuthAdminSectionId;
  route: string;
  resourceAccountKind: OAuthResourceAccountKind;
  defaultProviderCode: string;
  icon: LucideIcon;
  iconColor: string;
  titleKey: string;
  titleFallback: string;
};

type OAuthAccountFormState = {
  providerCode: string;
  accountName: string;
  appId: string;
  appSecret: string;
  secretRef: string;
  callbackUrl: string;
  originalId: string;
  platformAccountId: string;
};

type OAuthFeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const OAUTH_ACCOUNT_SECTIONS: OAuthAccountSection[] = [
  {
    defaultProviderCode: 'oauth',
    icon: KeyRound,
    iconColor: 'text-indigo-500',
    id: 'oauthLoginPlatforms',
    resourceAccountKind: 'open_app',
    route: '/admin/oauth/login-platforms',
    titleFallback: 'OAuth Login Platform Accounts',
    titleKey: 'admin.oauth.sections.oauthLoginPlatforms',
  },
  {
    defaultProviderCode: 'wechat_official_account',
    icon: MessageCircle,
    iconColor: 'text-emerald-500',
    id: 'officialAccounts',
    resourceAccountKind: 'official_account',
    route: '/admin/oauth/official-accounts',
    titleFallback: 'Official Accounts',
    titleKey: 'admin.oauth.sections.officialAccounts',
  },
  {
    defaultProviderCode: 'wechat_mini_program',
    icon: Smartphone,
    iconColor: 'text-cyan-500',
    id: 'miniPrograms',
    resourceAccountKind: 'mini_program',
    route: '/admin/oauth/mini-programs',
    titleFallback: 'Mini Programs',
    titleKey: 'admin.oauth.sections.miniPrograms',
  },
];

const DEFAULT_SECTION_ID: OAuthAdminSectionId = 'oauthLoginPlatforms';

export function OAuthAdmin({ sectionId }: OAuthAdminRouteProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const activeSection = resolveOAuthAccountSection(sectionId);
  const [formState, setFormState] = useState<OAuthAccountFormState>(() => createInitialFormState(activeSection));
  const [feedback, setFeedback] = useState<OAuthFeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const resourceSections = useMemo(() => createOAuthResourceSections(t), [t]);
  const ActiveIcon = activeSection.icon;

  useEffect(() => {
    setFormState(createInitialFormState(activeSection));
    setFeedback(null);
  }, [activeSection]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await createOAuthResourceAccount(buildOAuthResourceAccountPayload(activeSection, formState));
      setFeedback({ kind: 'success', message: t('admin.oauth.form.saved', 'Saved') });
      setFormState(createInitialFormState(activeSection));
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFeedback({ kind: 'error', message: translateOAuthError(t, error, 'admin.oauth.form.error') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden"
      data-admin-oauth
      data-admin-oauth-route={location.pathname}
      data-admin-oauth-section={activeSection.id}
    >
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161616] md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 ${activeSection.iconColor}`}>
            <ActiveIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {t(activeSection.titleKey, activeSection.titleFallback)}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{activeSection.route}</div>
          </div>
        </div>
        <nav className="flex shrink-0 flex-wrap gap-2" aria-label={t('admin.oauth.nav.accountCategories', 'OAuth account categories')}>
          {OAUTH_ACCOUNT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeSection.id;
            return (
              <Link
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
                key={section.id}
                to={section.route}
              >
                <Icon className={`h-4 w-4 ${section.iconColor}`} />
                {t(section.titleKey, section.titleFallback)}
              </Link>
            );
          })}
        </nav>
      </header>

      <form
        className="grid shrink-0 gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#161616] lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
        data-admin-oauth-account-form
        onSubmit={handleSubmit}
      >
        <OAuthTextInput
          label={t('admin.oauth.form.providerCode', 'Provider')}
          name="providerCode"
          onChange={(value) => setFormValue(setFormState, 'providerCode', value)}
          required
          value={formState.providerCode}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.accountName', 'Account Name')}
          name="accountName"
          onChange={(value) => setFormValue(setFormState, 'accountName', value)}
          required
          value={formState.accountName}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.appId', 'App ID')}
          name="appId"
          onChange={(value) => setFormValue(setFormState, 'appId', value)}
          required
          value={formState.appId}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.secretRef', 'Secret Ref')}
          name="secretRef"
          onChange={(value) => setFormValue(setFormState, 'secretRef', value)}
          value={formState.secretRef}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.appSecret', 'App Secret')}
          name="appSecret"
          onChange={(value) => setFormValue(setFormState, 'appSecret', value)}
          type="password"
          value={formState.appSecret}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.callbackUrl', 'Callback URL')}
          name="callbackUrl"
          onChange={(value) => setFormValue(setFormState, 'callbackUrl', value)}
          value={formState.callbackUrl}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.originalId', 'Original ID')}
          name="originalId"
          onChange={(value) => setFormValue(setFormState, 'originalId', value)}
          value={formState.originalId}
        />
        <OAuthTextInput
          label={t('admin.oauth.form.platformAccountId', 'Platform Account ID')}
          name="platformAccountId"
          onChange={(value) => setFormValue(setFormState, 'platformAccountId', value)}
          value={formState.platformAccountId}
        />
        <div className="flex min-w-[152px] flex-col justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            <Save className="h-4 w-4" />
            {isSaving ? t('admin.oauth.form.saving', 'Saving...') : t('admin.oauth.form.submit', 'Save')}
          </button>
          {feedback ? (
            <div
              className={`flex items-center gap-1.5 text-xs ${feedback.kind === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              role="status"
            >
              {feedback.kind === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span className="truncate">{feedback.message}</span>
            </div>
          ) : null}
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AdminResourceCenter
          activeSectionId={activeSection.id}
          emptyDescription={t('admin.oauth.resourceCenter.emptyDescription', 'No records returned by the appbase IAM OAuth backend resource.')}
          emptyTitle={t('admin.oauth.resourceCenter.emptyTitle', 'No OAuth records')}
          errorTitle={t('admin.oauth.resourceCenter.errorTitle', 'OAuth resource could not be loaded')}
          loadingTitle={t('admin.oauth.resourceCenter.loadingTitle', 'Loading OAuth resource...')}
          paginationPageLabel={t('admin.oauth.resourceCenter.paginationPage', 'Page')}
          paginationPageSizeLabel={t('admin.oauth.resourceCenter.paginationRows', 'Rows')}
          paginationShowingLabel={t('admin.oauth.resourceCenter.paginationShowing', 'Showing')}
          refreshKey={refreshKey}
          reloadLabel={t('admin.common.reload', 'Reload')}
          searchPlaceholder={t('admin.oauth.resourceCenter.searchPlaceholder', 'Search OAuth records')}
          sections={resourceSections}
          showSectionNavigation={false}
          tableViewportDataAttribute="admin-oauth-account-table"
        />
      </div>
    </section>
  );
}

export default OAuthAdmin;

function createOAuthResourceSections(
  t: ReturnType<typeof useTranslation>['t'],
): AdminResourceSection<OAuthAdminSectionId, string>[] {
  return OAUTH_ACCOUNT_SECTIONS.map((section) => ({
    columns: resourceAccountColumns(t),
    description: t(section.titleKey, section.titleFallback),
    group: t('admin.oauth.nav.accountCategories', 'OAuth account categories'),
    icon: React.createElement(section.icon, { className: `h-4 w-4 ${section.iconColor}` }),
    id: section.id,
    load: (params) => loadOAuthResource(t, listOAuthResourceAccounts, {
      ...toOAuthListParams(params),
      resourceAccountKind: section.resourceAccountKind,
    }),
    pagination: {
      initialPageSize: 100,
      pageSizeOptions: [50, 100, 200],
    },
    searchFields: ['id', 'resourceAccountId', 'providerCode', 'accountName', 'displayName', 'appId', 'providerAccountId', 'status'],
    title: t(section.titleKey, section.titleFallback),
  }));
}

function resourceAccountColumns(t: ReturnType<typeof useTranslation>['t']) {
  return [
    column('providerCode', t('admin.oauth.columns.providerCode', 'Provider')),
    column('accountName', t('admin.oauth.columns.accountName', 'Account Name'), (_value, record) =>
      formatRecordValue(record.accountName ?? record.displayName, t)),
    column('appId', t('admin.oauth.columns.appId', 'App ID'), (_value, record) =>
      formatRecordValue(record.appId ?? record.providerAccountId, t)),
    column('resourceAccountKind', t('admin.oauth.columns.resourceAccountKind', 'Kind'), enumFormatter('resourceAccountKind', t)),
    column('status', t('admin.oauth.columns.status', 'Status'), enumFormatter('status', t)),
  ];
}

function column(
  key: string,
  label: string,
  format?: (value: unknown, record: OAuthResourceRecord) => string,
) {
  return { key, label, format };
}

function createInitialFormState(section: OAuthAccountSection): OAuthAccountFormState {
  return {
    accountName: '',
    appId: '',
    appSecret: '',
    callbackUrl: '',
    originalId: '',
    platformAccountId: '',
    providerCode: section.defaultProviderCode,
    secretRef: '',
  };
}

function buildOAuthResourceAccountPayload(
  section: OAuthAccountSection,
  formState: OAuthAccountFormState,
): OAuthResourceRecord {
  const providerAccountId = cleanText(formState.appId) || cleanText(formState.platformAccountId);
  const providerConfigJson = pruneEmptyRecord({
    callbackUrl: cleanText(formState.callbackUrl),
    platformAccountId: cleanText(formState.platformAccountId),
    secretRef: cleanText(formState.secretRef),
    sourceSection: section.id,
  });
  return pruneEmptyRecord({
    accessMode: 'self_managed_account',
    accountName: cleanText(formState.accountName),
    appId: cleanText(formState.appId),
    appSecret: cleanText(formState.appSecret),
    displayName: cleanText(formState.accountName),
    enabled: true,
    ownerMode: 'self_managed',
    providerAccountId,
    providerAccountOriginalId: cleanText(formState.originalId),
    providerCode: cleanText(formState.providerCode),
    providerConfigJson,
    resourceAccountKind: section.resourceAccountKind,
    secretRef: cleanText(formState.secretRef),
    status: 'active',
  });
}

function resolveOAuthAccountSection(sectionId: string | undefined): OAuthAccountSection {
  return OAUTH_ACCOUNT_SECTIONS.find((section) => section.id === sectionId)
    ?? OAUTH_ACCOUNT_SECTIONS.find((section) => section.id === DEFAULT_SECTION_ID)
    ?? OAUTH_ACCOUNT_SECTIONS[0];
}

function setFormValue(
  setFormState: React.Dispatch<React.SetStateAction<OAuthAccountFormState>>,
  key: keyof OAuthAccountFormState,
  value: string,
) {
  setFormState((current) => ({
    ...current,
    [key]: value,
  }));
}

function toOAuthListParams(params: { page: number; pageSize: number } | undefined): OAuthListParams {
  return {
    ...DEFAULT_OAUTH_PAGE_PARAMS,
    ...(params ? { page: String(params.page), pageSize: String(params.pageSize) } : {}),
  };
}

async function loadOAuthResource(
  t: ReturnType<typeof useTranslation>['t'],
  load: (params?: OAuthListParams) => Promise<unknown>,
  params?: OAuthListParams,
): Promise<unknown> {
  try {
    return await load(params);
  } catch (error) {
    throw new Error(translateOAuthError(t, error, 'admin.oauth.errors.resourceLoad'));
  }
}

function translateOAuthError(
  t: ReturnType<typeof useTranslation>['t'],
  error: unknown,
  fallbackKey: string,
): string {
  if (isOAuthSdkResourceUnavailableError(error)) {
    return t('admin.oauth.errors.sdkResourceUnavailable', 'OAuth SDK resource is not available.');
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t(fallbackKey, 'OAuth resource could not be loaded.');
}

function isOAuthSdkResourceUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(OAUTH_SDK_RESOURCE_UNAVAILABLE_ERROR);
}

function OAuthTextInput({
  label,
  name,
  onChange,
  required = false,
  type = 'text',
  value,
}: {
  label: string;
  name: keyof OAuthAccountFormState;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'password' | 'text';
  value: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className="truncate">{label}</span>
      <input
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function enumFormatter(namespace: string, t: ReturnType<typeof useTranslation>['t']) {
  return (value: unknown): string => formatEnumValue(namespace, value, t);
}

function formatEnumValue(namespace: string, value: unknown, t: ReturnType<typeof useTranslation>['t']): string {
  if (typeof value !== 'string') {
    return formatRecordValue(value, t);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return t('admin.oauth.values.empty', '-');
  }
  const normalized = normalizeEnumValueKey(trimmed);
  const key = ['admin', 'oauth', 'values', namespace, normalized].join('.');
  return t(key, humanizeEnumValue(trimmed));
}

function normalizeEnumValueKey(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)).join('');
}

function humanizeEnumValue(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRecordValue(value: unknown, t: ReturnType<typeof useTranslation>['t']): string {
  if (value === null || value === undefined || value === '') {
    return t('admin.oauth.values.empty', '-');
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function cleanText(value: string): string {
  return value.trim();
}

function pruneEmptyRecord(record: OAuthResourceRecord): OAuthResourceRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === null || value === undefined || value === '') {
        return false;
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).length > 0;
      }
      return true;
    }),
  );
}
