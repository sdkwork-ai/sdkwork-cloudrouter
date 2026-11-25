import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw } from 'lucide-react';
import {
  IAM_CLOUD_ACCOUNT_KNOWN_CAPABILITY_CODES,
  IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES,
  IAM_CLOUD_ACCOUNT_TYPES,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_ENVIRONMENTS,
  hasPermissionInScope,
} from '@sdkwork/iam-contracts';
import type { SdkWorkPageInfo } from '@sdkwork/iam-contracts';
import type { SdkworkIamService } from '@sdkwork/iam-service';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  ADMIN_BADGE_NEUTRAL,
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_DANGER_SOLID,
  ADMIN_BUTTON_GHOST,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CONTROL_CLASS,
  ADMIN_FIELD_LABEL_CLASS,
  ADMIN_MODAL_SURFACE_CLASS,
  ADMIN_MUTED_TEXT_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
} from '../components/adminSurface';
import { AdminModalShell } from '../components/AdminModalShell';

import {
  CLOUD_ACCOUNT_SCOPE_ORDER,
  buildCloudAccountCreateBody,
  buildCloudAccountCredentialBody,
  buildCloudAccountUpdateBody,
  cloudAccountCapabilityLabelKey,
  cloudAccountCredentialFieldLabelKey,
  cloudAccountCredentialKindFields,
  cloudAccountCredentialKindForType,
  cloudAccountCredentialKindLabelKey,
  cloudAccountCredentialStatusLabelKey,
  cloudAccountEnvironmentLabelKey,
  cloudAccountRequiredCredentialFields,
  cloudAccountScopeLabelKey,
  cloudAccountStatusLabelKey,
  cloudAccountTypeLabelKey,
  cloudAccountVendorLabelKey,
  emptyCloudAccountCredentialDraft,
  invalidCloudAccountDraftFields,
  isCloudAccountCredentialDraftComplete,
  isCloudAccountCredentialKindDraftComplete,
  isValidCloudAccountCredentialExpiry,
  missingCloudAccountDraftFields,
  parseCloudAccountCredentials,
  parseCloudAccountPage,
  readableCloudAccountScopeLevels,
  toCloudAccountRecord,
  type CloudAccountCredentialDraft,
  type CloudAccountCredentialRecord,
  type CloudAccountDraft,
  type CloudAccountRecord,
} from './cloudAccountModel';

/**
 * 云账号管理 (cloud account management) workspace.
 *
 * Lists every cloud provider account the signed-in operator can reach — the
 * platform-wide defaults, tenant and organization shared accounts, and personal
 * ones — through the platform IAM account center
 * (`/backend/v3/api/iam/provider_accounts`). IAM owns the aggregate and the
 * encrypted credential envelopes; this page only reads and commands that
 * surface through the injected `SdkworkIamService`, never a raw HTTP client.
 *
 * Which ownership levels exist is the server's decision: the listing already
 * applies the caller's visibility walk, so the page does not narrow a request to
 * "protect" the caller. The only client-side projection is which *create* levels
 * are offered, delegated to `resolveIamCloudAccountManageableScopeLevels` so the
 * admin surface and the user console cannot drift.
 */

const PERMISSION_CREATE = 'iam.provider_accounts.create';
const PERMISSION_UPDATE = 'iam.provider_accounts.update';
const PERMISSION_DELETE = 'iam.provider_accounts.delete';
const PERMISSION_CREDENTIAL_READ = 'iam.provider_credentials.read';
const PERMISSION_CREDENTIAL_WRITE = 'iam.provider_credentials.create';
const PAGE_SIZE = 20;
const MAX_CREDENTIAL_PAGE_SIZE = 200;

const DEFAULT_VENDOR = 'aliyun';
const DEFAULT_ACCOUNT_TYPE = 'long_term_key';
const DEFAULT_ENVIRONMENT = 'production';

/**
 * Host admin list surface contract (see `../components/adminSurface`).
 *
 * The page renders inside this application's admin shell, whose canonical list
 * chrome is authored once in `src/index.css` (`embedded-fill-page`,
 * `data-surface`, `admin-list-toolbar`, `admin-list-table`, `admin-list-footer`,
 * `admin-control`, `admin-button`, `admin-badge`, `admin-alert`). Those hooks
 * carry the shell's neutral surface palette, one control geometry and one accent
 * color for light and dark, so a locally authored list page matches the composed
 * admin pages mounted in the same shell instead of restating a second, bluish
 * slate theme. Page-specific styling therefore only ever composes these names —
 * the shared strings live in `../components/adminSurface` so the personnel page
 * cannot drift from this one.
 */

export interface CloudRouterIamCloudAccountsWorkspaceProps {
  service: SdkworkIamService;
  permissionScope: readonly string[];
  /** Session tenant, which is the only fact that decides the `platform` level. */
  tenantId?: string;
}

function emptyDraft(scopeType: CloudAccountDraft['scopeType']): CloudAccountDraft {
  return {
    vendorCode: DEFAULT_VENDOR,
    accountCode: '',
    displayName: '',
    scopeType,
    accountType: DEFAULT_ACCOUNT_TYPE,
    environment: DEFAULT_ENVIRONMENT,
    regionCode: '',
    externalAccountId: '',
    capabilityCodes: [],
    isDefault: false,
  };
}

function toDraft(account: CloudAccountRecord): CloudAccountDraft {
  return {
    vendorCode: account.vendorCode,
    accountCode: account.accountCode,
    displayName: account.displayName,
    scopeType: (CLOUD_ACCOUNT_SCOPE_ORDER as readonly string[]).includes(account.scopeType)
      ? (account.scopeType as CloudAccountDraft['scopeType'])
      : 'user',
    accountType: account.accountType ?? DEFAULT_ACCOUNT_TYPE,
    environment: account.environment ?? DEFAULT_ENVIRONMENT,
    regionCode: account.regionCode ?? '',
    externalAccountId: account.externalAccountId ?? '',
    capabilityCodes: account.capabilityCodes,
    isDefault: account.isDefault,
  };
}

/** Status badge tone on the host admin badge contract. */
function statusBadgeClass(status: string | undefined): string {
  if (status === 'active') {
    return 'admin-badge admin-badge--success';
  }
  if (status === 'disabled') {
    return 'admin-badge admin-badge--warning';
  }
  return ADMIN_BADGE_NEUTRAL;
}

/**
 * Ownership badge tone.
 *
 * A platform-wide account is the only level that resolves for every tenant, so
 * it is the one level that gets the accent tone; the narrower levels stay
 * neutral and are told apart by their localized label.
 */
function scopeBadgeClass(scopeType: string): string {
  return scopeType === 'platform' ? 'admin-badge admin-badge--info' : ADMIN_BADGE_NEUTRAL;
}

function credentialBadgeClass(configured: boolean): string {
  return configured ? 'admin-badge admin-badge--success' : 'admin-badge admin-badge--warning';
}

export function CloudRouterIamCloudAccountsWorkspace({
  service,
  permissionScope,
  tenantId,
}: CloudRouterIamCloudAccountsWorkspaceProps) {
  const { t, i18n } = useTranslation();
  const can = useCallback(
    (permission: string) => hasPermissionInScope(permissionScope, permission),
    [permissionScope],
  );

  const canCreate = can(PERMISSION_CREATE);
  const canUpdate = can(PERMISSION_UPDATE);
  const canDelete = can(PERMISSION_DELETE);
  const canReadCredentials = can(PERMISSION_CREDENTIAL_READ);
  const canWriteCredential = can(PERMISSION_CREDENTIAL_WRITE);

  const allowedScopes = useMemo(
    () => readableCloudAccountScopeLevels(permissionScope, tenantId),
    [permissionScope, tenantId],
  );

  const [items, setItems] = useState<CloudAccountRecord[]>([]);
  const [pageInfo, setPageInfo] = useState<SdkWorkPageInfo | undefined>();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [detailId, setDetailId] = useState('');
  const [credentials, setCredentials] = useState<CloudAccountCredentialRecord[]>([]);
  const [credentialLoading, setCredentialLoading] = useState(false);

  const [editorMode, setEditorMode] = useState<'create' | 'edit' | undefined>();
  const [editing, setEditing] = useState<CloudAccountRecord | undefined>();
  const [draft, setDraft] = useState<CloudAccountDraft>(() => emptyDraft(allowedScopes[0] ?? 'user'));
  const [writeCredential, setWriteCredential] = useState(true);
  const [createCredentialDraft, setCreateCredentialDraft] = useState<CloudAccountCredentialDraft>(
    () => emptyCloudAccountCredentialDraft(),
  );
  const [formError, setFormError] = useState('');

  const [credentialTarget, setCredentialTarget] = useState<CloudAccountRecord | undefined>();
  const [rotateDraft, setRotateDraft] = useState<CloudAccountCredentialDraft>(
    () => emptyCloudAccountCredentialDraft(),
  );
  const [credentialError, setCredentialError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CloudAccountRecord | undefined>();

  const formatTimestamp = useCallback(
    (value: string | undefined) => {
      if (!value) {
        return '—';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    },
    [i18n.language],
  );

  const labelFor = useCallback(
    (key: string, fallback: string) => t(key, { defaultValue: fallback || '—' }),
    [t],
  );

  const vendorLabel = useCallback(
    (vendorCode: string) => {
      if (!vendorCode) {
        return '—';
      }
      const key = cloudAccountVendorLabelKey(vendorCode);
      return key ? labelFor(key, vendorCode) : vendorCode;
    },
    [labelFor],
  );

  const detailAccount = useMemo(
    () => items.find((account) => account.id === detailId),
    [detailId, items],
  );

  const vendorOptions = useMemo(() => {
    const codes = new Set<string>(IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES);
    for (const account of items) {
      if (account.vendorCode) {
        codes.add(account.vendorCode);
      }
    }
    return [...codes].sort((left, right) => left.localeCompare(right));
  }, [items]);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await service.iam.providerAccounts.list({
        page,
        pageSize: PAGE_SIZE,
        ...(appliedQuery.trim().length > 0 ? { q: appliedQuery.trim() } : {}),
        ...(vendorFilter.length > 0 ? { vendorCode: vendorFilter } : {}),
        ...(scopeFilter.length > 0 ? { scopeType: scopeFilter } : {}),
        ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
        // A platform operator's global defaults are only reachable when the
        // request asks for them; the server still honours that request only for
        // a caller holding `manage_shared`.
        includePlatform: true,
      });
      const parsed = parseCloudAccountPage(payload);
      setItems(parsed.items);
      setPageInfo(parsed.pageInfo);
      setTotal(parsed.total);
    } catch (reason) {
      setItems([]);
      setPageInfo(undefined);
      setTotal(0);
      setError(
        resolveProblemMessage(reason, t, t('admin.iam.cloudAccounts.error.load', 'Failed to load cloud accounts')),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, scopeFilter, service, statusFilter, t, vendorFilter]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts, reloadToken]);

  useEffect(() => {
    if (!detailId) {
      setCredentials([]);
      return;
    }
    if (!canReadCredentials) {
      setCredentials([]);
      return;
    }
    let active = true;
    setCredentialLoading(true);
    service.iam.providerAccounts.credentials
      .list(detailId, { pageSize: MAX_CREDENTIAL_PAGE_SIZE })
      .then((payload) => {
        if (!active) {
          return;
        }
        setCredentials(parseCloudAccountCredentials(payload));
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        setCredentials([]);
        setError(
          resolveProblemMessage(
            reason,
            t,
            t('admin.iam.cloudAccounts.error.credentials', 'Failed to load credentials'),
          ),
        );
      })
      .finally(() => {
        if (active) {
          setCredentialLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [canReadCredentials, detailId, reloadToken, service, t]);

  const submitFilters = () => {
    setPage(1);
    setAppliedQuery(queryInput);
  };

  const resetFilters = () => {
    setQueryInput('');
    setAppliedQuery('');
    setVendorFilter('');
    setScopeFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const runAction = useCallback(
    async (action: () => Promise<unknown>, fallback: string, success?: string) => {
      setBusy(true);
      setError('');
      setNotice('');
      try {
        await action();
        if (success) {
          setNotice(success);
        }
        return true;
      } catch (reason) {
        setError(resolveProblemMessage(reason, t, fallback));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const promoteToDefault = async (account: CloudAccountRecord) => {
    const ok = await runAction(
      () => service.iam.providerAccounts.default(account.id, {}),
      t('admin.iam.cloudAccounts.error.action', 'Action failed'),
      t('admin.iam.cloudAccounts.notice.default', 'The account is now the default for its provider and ownership level.'),
    );
    if (ok) {
      reload();
    }
  };

  const toggleStatus = async (account: CloudAccountRecord) => {
    const nextStatus = account.status === 'disabled' ? 'active' : 'disabled';
    const ok = await runAction(
      () => service.iam.providerAccounts.update(account.id, { status: nextStatus }),
      t('admin.iam.cloudAccounts.error.action', 'Action failed'),
      nextStatus === 'active'
        ? t('admin.iam.cloudAccounts.notice.enabled', 'The account is enabled again.')
        : t('admin.iam.cloudAccounts.notice.disabled', 'The account is disabled and will not be resolved.'),
    );
    if (ok) {
      reload();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const ok = await runAction(
      () => service.iam.providerAccounts.delete(deleteTarget.id),
      t('admin.iam.cloudAccounts.error.action', 'Action failed'),
      t('admin.iam.cloudAccounts.notice.deleted', 'The cloud account was deleted.'),
    );
    if (ok) {
      setDetailId('');
      setDeleteTarget(undefined);
      reload();
    }
  };

  const openCreate = () => {
    setFormError('');
    setEditing(undefined);
    setDraft(emptyDraft(allowedScopes[0] ?? 'user'));
    setWriteCredential(true);
    setCreateCredentialDraft(
      emptyCloudAccountCredentialDraft(cloudAccountCredentialKindForType(DEFAULT_ACCOUNT_TYPE)),
    );
    setEditorMode('create');
  };

  const openEdit = (account: CloudAccountRecord) => {
    setFormError('');
    setEditing(account);
    setDraft(toDraft(account));
    setEditorMode('edit');
  };

  const closeEditor = useCallback(() => {
    if (busy) {
      return;
    }
    setEditorMode(undefined);
    setEditing(undefined);
    setFormError('');
  }, [busy]);

  const openCreateCredential = (account: CloudAccountRecord) => {
    setCredentialError('');
    setCredentialTarget(account);
    setRotateDraft(
      emptyCloudAccountCredentialDraft(cloudAccountCredentialKindForType(account.accountType ?? '')),
    );
  };

  const validateDraft = (): boolean => {
    const missing = missingCloudAccountDraftFields(draft);
    const invalid = invalidCloudAccountDraftFields(draft);
    if (missing.length > 0) {
      setFormError(t('admin.iam.cloudAccounts.form.fieldRequired', 'This field is required'));
      return false;
    }
    if (invalid.length > 0) {
      setFormError(
        t(
          'admin.iam.cloudAccounts.form.invalidCode',
          'The account code or display name does not match the required format.',
        ),
      );
      return false;
    }
    return true;
  };

  const submitDraft = async () => {
    if (!validateDraft()) {
      return;
    }
    if (editorMode === 'create' && writeCredential && createCredentialFields.length > 0) {
      if (!isCloudAccountCredentialDraftComplete(createCredentialDraft, draft.accountType)) {
        setFormError(t('admin.iam.cloudAccounts.form.fieldRequired', 'This field is required'));
        return;
      }
    }
    setBusy(true);
    setFormError('');
    setError('');
    setNotice('');
    try {
      if (editorMode === 'edit') {
        if (!editing) {
          setFormError(t('admin.iam.cloudAccounts.error.action', 'Action failed'));
          return;
        }
        await service.iam.providerAccounts.update(editing.id, buildCloudAccountUpdateBody(draft));
        setEditorMode(undefined);
        setEditing(undefined);
        setNotice(t('admin.iam.cloudAccounts.notice.updated', 'The cloud account was saved.'));
        reload();
        return;
      }

      const created = toCloudAccountRecord(await service.iam.providerAccounts.create(buildCloudAccountCreateBody(draft)));
      if (!created) {
        throw new Error('The account center returned an unreadable account record');
      }
      const credentialKind = cloudAccountCredentialKindForType(draft.accountType);
      const shouldWriteCredential =
        writeCredential
        && credentialKind !== undefined
        && isCloudAccountCredentialDraftComplete(createCredentialDraft, draft.accountType);
      if (shouldWriteCredential) {
        try {
          await service.iam.providerAccounts.credentials.create(
            created.id,
            buildCloudAccountCredentialBody({
              ...createCredentialDraft,
              credentialKind: credentialKind ?? createCredentialDraft.credentialKind,
            }),
          );
          setNotice(t('admin.iam.cloudAccounts.notice.created', 'The cloud account was created with its credential.'));
        } catch (credentialReason) {
          // The account landed but its credential did not. Closing the form is
          // what keeps a retry from creating the same account twice: the
          // remaining work is writing the credential on the row that exists.
          setEditorMode(undefined);
          setEditing(undefined);
          setPage(1);
          setNotice(
            t(
              'admin.iam.cloudAccounts.notice.createdWithoutCredential',
              'The account was created without a credential; write one from its detail before consumers use it.',
            ),
          );
          setError(
            resolveProblemMessage(
              credentialReason,
              t,
              t('admin.iam.cloudAccounts.error.action', 'Action failed'),
            ),
          );
          reload();
          return;
        }
      } else if (credentialKind === undefined) {
        setNotice(
          t(
            'admin.iam.cloudAccounts.notice.createdSecretless',
            'The cloud account was created; this identity shape keeps no secret on this platform.',
          ),
        );
      } else {
        setNotice(
          t(
            'admin.iam.cloudAccounts.notice.createdWithoutCredential',
            'The account was created without a credential; write one from its detail before consumers use it.',
          ),
        );
      }
      setEditorMode(undefined);
      setEditing(undefined);
      setPage(1);
      reload();
    } catch (reason) {
      setFormError(
        resolveProblemMessage(reason, t, t('admin.iam.cloudAccounts.error.action', 'Action failed')),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitCredential = async () => {
    if (!credentialTarget) {
      return;
    }
    if (!isCloudAccountCredentialKindDraftComplete(rotateDraft)) {
      setCredentialError(t('admin.iam.cloudAccounts.form.fieldRequired', 'This field is required'));
      return;
    }
    if (!isValidCloudAccountCredentialExpiry(rotateDraft.expiresAt)) {
      setCredentialError(
        t('admin.iam.cloudAccounts.form.invalidExpiry', 'Enter a valid expiry date, or leave it empty.'),
      );
      return;
    }
    setCredentialError('');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await service.iam.providerAccounts.credentials.create(
        credentialTarget.id,
        buildCloudAccountCredentialBody(rotateDraft),
      );
      setCredentialTarget(undefined);
      setNotice(t('admin.iam.cloudAccounts.notice.credential', 'The credential was stored and is now the active one.'));
      reload();
    } catch (reason) {
      setCredentialError(
        resolveProblemMessage(reason, t, t('admin.iam.cloudAccounts.error.action', 'Action failed')),
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleCapability = (capabilityCode: string) => {
    setDraft((current) => ({
      ...current,
      capabilityCodes: current.capabilityCodes.includes(capabilityCode)
        ? current.capabilityCodes.filter((code) => code !== capabilityCode)
        : [...current.capabilityCodes, capabilityCode],
    }));
  };

  /**
   * The credential fields the register form asks for right now.
   *
   * Read off the identity shape: the two vocabularies are separate (the shape
   * decides *which* fields exist, the credential kind decides what the single
   * blob means), so the form never guesses a kind from a field label. A shape
   * that keeps no secret here yields an empty list, and the form says why
   * instead of drawing an empty area.
   */
  const createCredentialFields = useMemo(
    () => cloudAccountRequiredCredentialFields(draft.accountType),
    [draft.accountType],
  );
  const createCredentialKind = useMemo(
    () => cloudAccountCredentialKindForType(draft.accountType),
    [draft.accountType],
  );
  const rotateCredentialFields = useMemo(
    () => cloudAccountCredentialKindFields(rotateDraft.credentialKind),
    [rotateDraft.credentialKind],
  );

  const hasNext = pageInfo?.hasMore === true || page * PAGE_SIZE < total;
  const scopeOptions = allowedScopes;
  const filterScopeOptions = CLOUD_ACCOUNT_SCOPE_ORDER;

  return (
    <section aria-busy={loading || busy} className="embedded-fill-page">
      <header className="admin-page-header">
        <div className="min-w-0">
          <h1 className="admin-page-header__title">
            {t('admin.iam.cloudAccounts.title', 'Cloud account management')}
          </h1>
          <p className="admin-page-header__description">
            {t(
              'admin.iam.cloudAccounts.description',
              'Every cloud provider account the caller can reach: platform defaults, tenant and organization shared accounts, and personal ones. Credentials are sealed by IAM; this listing exposes only masked labels and fingerprints.',
            )}
          </p>
        </div>
        <div className="admin-page-header__actions">
          <button className={ADMIN_BUTTON_SECONDARY} disabled={loading || busy} onClick={reload} type="button">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.iam.cloudAccounts.refresh', 'Refresh')}
          </button>
          {canCreate ? (
            <button className={ADMIN_BUTTON_PRIMARY} disabled={busy} onClick={openCreate} type="button">
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.iam.cloudAccounts.create', 'New account')}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="admin-alert admin-alert--success" role="status">
          {notice}
        </div>
      ) : null}

      <div className="data-surface">
        <div className="admin-list-toolbar">
          <form
            className="admin-list-toolbar__filters"
            onSubmit={(event) => {
              event.preventDefault();
              submitFilters();
            }}
          >
            <label className="admin-field admin-field--search">
              <span className={ADMIN_FIELD_LABEL_CLASS}>
                {t('admin.iam.cloudAccounts.search', 'Search')}
              </span>
              <input
                className={ADMIN_CONTROL_CLASS}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={t('admin.iam.cloudAccounts.searchPlaceholder', 'Search name or account code')}
                type="search"
                value={queryInput}
              />
            </label>

            <label className="admin-field admin-field--compact">
              <span className={ADMIN_FIELD_LABEL_CLASS}>
                {t('admin.iam.cloudAccounts.filter.vendor', 'Provider')}
              </span>
              <select
                className={ADMIN_CONTROL_CLASS}
                onChange={(event) => {
                  setVendorFilter(event.target.value);
                  setPage(1);
                }}
                value={vendorFilter}
              >
                <option value="">{t('admin.iam.cloudAccounts.filter.allVendors', 'All providers')}</option>
                {vendorOptions.map((code) => (
                  <option key={code} value={code}>
                    {vendorLabel(code)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field admin-field--compact">
              <span className={ADMIN_FIELD_LABEL_CLASS}>
                {t('admin.iam.cloudAccounts.filter.scope', 'Ownership')}
              </span>
              <select
                className={ADMIN_CONTROL_CLASS}
                onChange={(event) => {
                  setScopeFilter(event.target.value);
                  setPage(1);
                }}
                value={scopeFilter}
              >
                <option value="">{t('admin.iam.cloudAccounts.filter.allScopes', 'All levels')}</option>
                {filterScopeOptions.map((scope) => (
                  <option key={scope} value={scope}>
                    {labelFor(cloudAccountScopeLabelKey(scope), scope)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field admin-field--compact">
              <span className={ADMIN_FIELD_LABEL_CLASS}>
                {t('admin.iam.cloudAccounts.filter.status', 'Status')}
              </span>
              <select
                className={ADMIN_CONTROL_CLASS}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <option value="">{t('admin.iam.cloudAccounts.filter.allStatuses', 'All statuses')}</option>
                {['active', 'disabled'].map((status) => (
                  <option key={status} value={status}>
                    {labelFor(cloudAccountStatusLabelKey(status), status)}
                  </option>
                ))}
              </select>
            </label>

            <button className={ADMIN_BUTTON_SECONDARY} type="submit">
              {t('admin.iam.cloudAccounts.search', 'Search')}
            </button>
          </form>
          <div className="admin-list-toolbar__actions">
            <button className={ADMIN_BUTTON_GHOST} onClick={resetFilters} type="button">
              {t('admin.iam.cloudAccounts.reset', 'Reset filters')}
            </button>
          </div>
        </div>

        <div className="table-frame">
          {items.length === 0 ? (
            <div className="admin-list-state min-h-full">
              {loading ? (
                <span>{t('admin.iam.cloudAccounts.loading', 'Loading cloud accounts…')}</span>
              ) : (
                <>
                  <span className="text-sm font-semibold text-[var(--admin-surface-text)]">
                    {t('admin.iam.cloudAccounts.empty', 'No cloud accounts yet.')}
                  </span>
                  <span>
                    {t(
                      'admin.iam.cloudAccounts.emptyHint',
                      'Register a provider account first; once its credential is stored, consumers can resolve it.',
                    )}
                  </span>
                </>
              )}
            </div>
          ) : (
            <table className="admin-list-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.name', 'Name')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.vendor', 'Provider')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.scope', 'Ownership')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.accountType', 'Type')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.environment', 'Environment')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.status', 'Status')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.credential', 'Credential')}</th>
                  <th scope="col">{t('admin.iam.cloudAccounts.columns.updatedAt', 'Updated')}</th>
                  <th className="text-right" scope="col">
                    {t('admin.iam.cloudAccounts.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="admin-list-table__primary">
                        {account.displayName || '—'}
                      </span>
                      <span className="admin-list-table__secondary font-mono">
                        {account.accountCode}
                      </span>
                    </td>
                    <td>{vendorLabel(account.vendorCode)}</td>
                    <td>
                      <span className={scopeBadgeClass(account.scopeType)}>
                        {labelFor(cloudAccountScopeLabelKey(account.scopeType), account.scopeType)}
                      </span>
                    </td>
                    <td>
                      {labelFor(cloudAccountTypeLabelKey(account.accountType ?? ''), account.accountType ?? '')}
                    </td>
                    <td>
                      <span className="block">
                        {labelFor(
                          cloudAccountEnvironmentLabelKey(account.environment ?? ''),
                          account.environment ?? '',
                        )}
                      </span>
                      {account.regionCode ? (
                        <span className={`admin-list-table__secondary font-mono ${ADMIN_MUTED_TEXT_CLASS}`}>
                          {account.regionCode}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={statusBadgeClass(account.status)}>
                          {labelFor(cloudAccountStatusLabelKey(account.status ?? ''), account.status ?? '')}
                        </span>
                        {account.isDefault ? (
                          <span className="admin-badge admin-badge--info">
                            {t('admin.iam.cloudAccounts.columns.default', 'Default')}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={credentialBadgeClass(account.credentialConfigured)}>
                        {account.credentialConfigured
                          ? t('admin.iam.cloudAccounts.credentialCount', '{{count}} credentials', {
                              count: account.credentialCount,
                            })
                          : t('admin.iam.cloudAccounts.credentialMissing', 'Missing')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatTimestamp(account.updatedAt)}</td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          className={ADMIN_BUTTON_SECONDARY}
                          disabled={busy}
                          onClick={() => setDetailId(account.id)}
                          type="button"
                        >
                          {t('admin.iam.cloudAccounts.detail', 'Details')}
                        </button>
                        {canUpdate ? (
                          <button
                            className={ADMIN_BUTTON_SECONDARY}
                            disabled={busy}
                            onClick={() => openEdit(account)}
                            type="button"
                          >
                            {t('admin.iam.cloudAccounts.edit', 'Edit')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-list-footer">
          <span>
            {t('admin.iam.cloudAccounts.pageInfo', 'Page {{page}} · {{pageSize}}/page · {{total}} accounts', {
              page,
              pageSize: PAGE_SIZE,
              total,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={ADMIN_BUTTON_SECONDARY}
              disabled={page <= 1 || loading || busy}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              {t('admin.iam.cloudAccounts.prev', 'Previous')}
            </button>
            <button
              className={ADMIN_BUTTON_SECONDARY}
              disabled={!hasNext || loading || busy}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              {t('admin.iam.cloudAccounts.next', 'Next')}
            </button>
          </div>
        </div>
      </div>

      {detailAccount ? (
        <AdminModalShell
          labelledBy="cloud-account-detail-title"
          onClose={() => setDetailId('')}
          widthClass="max-w-3xl"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold" id="cloud-account-detail-title">
                {detailAccount.displayName || detailAccount.accountCode}
              </h2>
              <p className={`mt-1 text-xs ${ADMIN_MUTED_TEXT_CLASS}`}>
                {vendorLabel(detailAccount.vendorCode)}
                {' · '}
                {labelFor(cloudAccountScopeLabelKey(detailAccount.scopeType), detailAccount.scopeType)}
                {' · '}
                {labelFor(cloudAccountStatusLabelKey(detailAccount.status ?? ''), detailAccount.status ?? '')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canUpdate ? (
                <button
                  className={ADMIN_BUTTON_SECONDARY}
                  onClick={() => {
                    openEdit(detailAccount);
                    setDetailId('');
                  }}
                  type="button"
                >
                  {t('admin.iam.cloudAccounts.edit', 'Edit')}
                </button>
              ) : null}
              {canUpdate && !detailAccount.isDefault ? (
                <button
                  className={ADMIN_BUTTON_SECONDARY}
                  disabled={busy}
                  onClick={() => void promoteToDefault(detailAccount)}
                  type="button"
                >
                  {t('admin.iam.cloudAccounts.setDefault', 'Set default')}
                </button>
              ) : null}
              {canUpdate ? (
                <button
                  className={ADMIN_BUTTON_SECONDARY}
                  disabled={busy}
                  onClick={() => void toggleStatus(detailAccount)}
                  type="button"
                >
                  {detailAccount.status === 'disabled'
                    ? t('admin.iam.cloudAccounts.enable', 'Enable')
                    : t('admin.iam.cloudAccounts.disable', 'Disable')}
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className={ADMIN_BUTTON_DANGER}
                  disabled={busy}
                  onClick={() => setDeleteTarget(detailAccount)}
                  type="button"
                >
                  {t('admin.iam.cloudAccounts.delete', 'Delete')}
                </button>
              ) : null}
            </div>
          </div>

          <h3 className={`mt-5 ${ADMIN_SECTION_TITLE_CLASS}`}>
            {t('admin.iam.cloudAccounts.detail.facts', 'Account facts')}
          </h3>
          <dl className="mt-2 grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
            <Fact label={t('admin.iam.cloudAccounts.columns.accountCode', 'Account code')}>
              <span className="font-mono text-xs">{detailAccount.accountCode}</span>
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.columns.accountType', 'Type')}>
              {labelFor(cloudAccountTypeLabelKey(detailAccount.accountType ?? ''), detailAccount.accountType ?? '')}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.columns.environment', 'Environment')}>
              {labelFor(cloudAccountEnvironmentLabelKey(detailAccount.environment ?? ''), detailAccount.environment ?? '')}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.columns.region', 'Region')}>
              {detailAccount.regionCode ? <span className="font-mono text-xs">{detailAccount.regionCode}</span> : '—'}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.externalAccountId', 'Provider account ID')}>
              {detailAccount.externalAccountId ?? '—'}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.owner', 'Owner')}>
              {detailAccount.ownerUserId ?? '—'}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.organization', 'Organization ID')}>
              {detailAccount.organizationId ?? '—'}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.tenant', 'Tenant ID')}>
              {detailAccount.tenantId ?? '—'}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.capabilities', 'Capabilities')}>
              {detailAccount.capabilityCodes.length === 0 ? (
                t('admin.iam.cloudAccounts.detail.allCapabilities', 'All capabilities of the provider')
              ) : (
                <span className="flex flex-wrap gap-1">
                  {detailAccount.capabilityCodes.map((code) => (
                    <span className={ADMIN_BADGE_NEUTRAL} key={code}>
                      {labelFor(cloudAccountCapabilityLabelKey(code), code)}
                    </span>
                  ))}
                </span>
              )}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.createdAt', 'Created')}>
              {formatTimestamp(detailAccount.createdAt)}
            </Fact>
            <Fact label={t('admin.iam.cloudAccounts.detail.updatedAt', 'Updated')}>
              {formatTimestamp(detailAccount.updatedAt)}
            </Fact>
          </dl>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <h3 className={ADMIN_SECTION_TITLE_CLASS}>
              {t('admin.iam.cloudAccounts.detail.credentials', 'Credentials')}
            </h3>
            {canWriteCredential ? (
              <button
                className={ADMIN_BUTTON_SECONDARY}
                disabled={busy}
                onClick={() => {
                  openCreateCredential(detailAccount);
                  setDetailId('');
                }}
                type="button"
              >
                {t('admin.iam.cloudAccounts.rotateCredential', 'Write credential')}
              </button>
            ) : null}
          </div>
          {!canReadCredentials ? (
            <p className={`mt-2 text-xs ${ADMIN_MUTED_TEXT_CLASS}`}>
              {t(
                'admin.iam.cloudAccounts.credentials.forbidden',
                'Your role can manage the account but cannot read its credential slots.',
              )}
            </p>
          ) : credentialLoading ? (
            <p className={`mt-2 text-xs ${ADMIN_MUTED_TEXT_CLASS}`}>
              {t('admin.iam.cloudAccounts.loadingCredentials', 'Loading credentials…')}
            </p>
          ) : credentials.length === 0 ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {t(
                'admin.iam.cloudAccounts.credentialNone',
                'This account has no active credential yet, so consumers cannot resolve it.',
              )}
            </p>
          ) : (
            <div className={`mt-2 ${ADMIN_MODAL_SURFACE_CLASS}`}>
              <table className="admin-list-table">
                <thead>
                  <tr>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.kind', 'Kind')}
                    </th>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.name', 'Name')}
                    </th>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.maskedLabel', 'Masked')}
                    </th>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.fingerprint', 'Fingerprint')}
                    </th>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.status', 'Status')}
                    </th>
                    <th scope="col">
                      {t('admin.iam.cloudAccounts.credentialColumns.expiresAt', 'Expires')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((credential) => (
                    <tr key={credential.id}>
                      <td>
                        {labelFor(
                          cloudAccountCredentialKindLabelKey(credential.credentialKind ?? ''),
                          credential.credentialKind ?? '',
                        )}
                      </td>
                      <td>{credential.credentialName ?? '—'}</td>
                      <td className="font-mono text-xs">{credential.maskedLabel ?? '—'}</td>
                      <td className="font-mono text-xs">{credential.secretFingerprint ?? '—'}</td>
                      <td>
                        <span className={statusBadgeClass(credential.status)}>
                          {labelFor(
                            cloudAccountCredentialStatusLabelKey(credential.status ?? ''),
                            credential.status ?? '',
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {formatTimestamp(credential.expiresAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button className={ADMIN_BUTTON_SECONDARY} onClick={() => setDetailId('')} type="button">
              {t('admin.iam.cloudAccounts.close', 'Close')}
            </button>
          </div>
        </AdminModalShell>
      ) : null}

      {editorMode ? (
        <AdminModalShell
          labelledBy="cloud-account-editor-title"
          onClose={closeEditor}
        >
          <h2 className="text-base font-semibold" id="cloud-account-editor-title">
            {editorMode === 'edit'
              ? t('admin.iam.cloudAccounts.form.editTitle', 'Edit cloud account')
              : t('admin.iam.cloudAccounts.form.createTitle', 'New cloud account')}
            {editorMode === 'edit' && editing ? (
              <span className={`ml-2 text-xs font-normal ${ADMIN_MUTED_TEXT_CLASS}`}>
                {editing.displayName || editing.accountCode}
              </span>
            ) : null}
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitDraft();
            }}
          >
            {editorMode === 'create' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="admin-field">
                  <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.vendor', 'Provider')} *</span>
                  <select
                    autoFocus
                    className={ADMIN_CONTROL_CLASS}
                    onChange={(event) => {
                      const vendorCode = event.target.value;
                      setDraft((current) => ({ ...current, vendorCode }));
                    }}
                    value={draft.vendorCode}
                  >
                    {IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES.map((code) => (
                      <option key={code} value={code}>
                        {vendorLabel(code)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.scope', 'Ownership level')} *</span>
                  <select
                    className={ADMIN_CONTROL_CLASS}
                    onChange={(event) => {
                      const scopeType = event.target.value as CloudAccountDraft['scopeType'];
                      setDraft((current) => ({ ...current, scopeType }));
                    }}
                    value={draft.scopeType}
                  >
                    {scopeOptions.map((scope) => (
                      <option key={scope} value={scope}>
                        {labelFor(cloudAccountScopeLabelKey(scope), scope)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.accountCode', 'Account code')} *</span>
                  <input
                    className={ADMIN_CONTROL_CLASS}
                    maxLength={64}
                    onChange={(event) => {
                      const accountCode = event.target.value.toLowerCase();
                      setDraft((current) => ({ ...current, accountCode }));
                    }}
                    value={draft.accountCode}
                  />
                  <span className={`text-[11px] leading-4 ${ADMIN_MUTED_TEXT_CLASS}`}>
                    {t(
                      'admin.iam.cloudAccounts.form.accountCodeHint',
                      'Lowercase letters, digits, dot, hyphen, or underscore; 2-64 characters.',
                    )}
                  </span>
                </label>
                <label className="admin-field">
                  <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.displayName', 'Display name')} *</span>
                  <input
                    className={ADMIN_CONTROL_CLASS}
                    maxLength={128}
                    onChange={(event) => {
                      const displayName = event.target.value;
                      setDraft((current) => ({ ...current, displayName }));
                    }}
                    value={draft.displayName}
                  />
                </label>
              </div>
            ) : (
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.displayName', 'Display name')} *</span>
                <input
                  autoFocus
                  className={ADMIN_CONTROL_CLASS}
                  maxLength={128}
                  onChange={(event) => {
                    const displayName = event.target.value;
                    setDraft((current) => ({ ...current, displayName }));
                  }}
                  value={draft.displayName}
                />
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.accountType', 'Identity shape')}</span>
                <select
                  className={ADMIN_CONTROL_CLASS}
                  onChange={(event) => {
                    const accountType = event.target.value;
                    setDraft((current) => ({ ...current, accountType }));
                    if (editorMode === 'create') {
                      setCreateCredentialDraft(
                        emptyCloudAccountCredentialDraft(cloudAccountCredentialKindForType(accountType)),
                      );
                    }
                  }}
                  value={draft.accountType}
                >
                  {IAM_CLOUD_ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelFor(cloudAccountTypeLabelKey(type), type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.environment', 'Environment')}</span>
                <select
                  className={ADMIN_CONTROL_CLASS}
                  onChange={(event) => {
                    const environment = event.target.value;
                    setDraft((current) => ({ ...current, environment }));
                  }}
                  value={draft.environment}
                >
                  {IAM_CLOUD_ACCOUNT_ENVIRONMENTS.map((environment) => (
                    <option key={environment} value={environment}>
                      {labelFor(cloudAccountEnvironmentLabelKey(environment), environment)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.form.region', 'Region (optional)')}</span>
                <input
                  className={ADMIN_CONTROL_CLASS}
                  onChange={(event) => {
                    const regionCode = event.target.value;
                    setDraft((current) => ({ ...current, regionCode }));
                  }}
                  value={draft.regionCode}
                />
              </label>
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>
                  {t('admin.iam.cloudAccounts.form.externalAccountId', 'Provider account ID (optional)')}
                </span>
                <input
                  className={ADMIN_CONTROL_CLASS}
                  onChange={(event) => {
                    const externalAccountId = event.target.value;
                    setDraft((current) => ({ ...current, externalAccountId }));
                  }}
                  value={draft.externalAccountId}
                />
              </label>
            </div>

            <fieldset>
              <legend className={ADMIN_FIELD_LABEL_CLASS}>
                {t('admin.iam.cloudAccounts.form.capabilities', 'Capabilities (optional)')}
              </legend>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {IAM_CLOUD_ACCOUNT_KNOWN_CAPABILITY_CODES.map((code) => (
                  <label className="flex items-center gap-2 text-sm" key={code}>
                    <input
                      checked={draft.capabilityCodes.includes(code)}
                      onChange={() => toggleCapability(code)}
                      type="checkbox"
                    />
                    <span>{labelFor(cloudAccountCapabilityLabelKey(code), code)}</span>
                  </label>
                ))}
              </div>
              <p className={`mt-1 text-[11px] leading-4 ${ADMIN_MUTED_TEXT_CLASS}`}>
                {t(
                  'admin.iam.cloudAccounts.form.capabilitiesHint',
                  'Leave every capability unchecked to let the account serve every capability of its provider.',
                )}
              </p>
            </fieldset>

            {editorMode === 'create' ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={draft.isDefault}
                    onChange={(event) => {
                      const isDefault = event.target.checked;
                      setDraft((current) => ({ ...current, isDefault }));
                    }}
                    type="checkbox"
                  />
                  <span>{t('admin.iam.cloudAccounts.form.isDefault', 'Make it the default for this provider')}</span>
                </label>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${ADMIN_MUTED_TEXT_CLASS}`}>
                      {t('admin.iam.cloudAccounts.form.credentialSection', 'Credential')}
                    </span>
                    {createCredentialKind ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          checked={writeCredential}
                          onChange={(event) => setWriteCredential(event.target.checked)}
                          type="checkbox"
                        />
                        <span>{t('admin.iam.cloudAccounts.form.writeCredential', 'Write the credential now')}</span>
                      </label>
                    ) : null}
                  </div>
                  <p className={`mt-1 text-[11px] leading-4 ${ADMIN_MUTED_TEXT_CLASS}`}>
                    {t(
                      'admin.iam.cloudAccounts.credentialHint',
                      'IAM seals credentials with AES-256-GCM; after a write only the masked label and fingerprint are readable. Writing again rotates the credential.',
                    )}
                  </p>
                  {createCredentialFields.length === 0 ? (
                    <p className={`mt-2 text-xs ${ADMIN_MUTED_TEXT_CLASS}`}>
                      {t(
                        'admin.iam.cloudAccounts.credentialSecretless',
                        'This identity shape resolves out of band on the provider side; no secret is stored here.',
                      )}
                    </p>
                  ) : writeCredential ? (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {createCredentialFields.map((field) => (
                        <label className="admin-field" key={field}>
                          <span className={ADMIN_FIELD_LABEL_CLASS}>{labelFor(cloudAccountCredentialFieldLabelKey(field), field)} *</span>
                          <input
                            autoComplete="off"
                            className={ADMIN_CONTROL_CLASS}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCreateCredentialDraft((current) => credentialDraftWithField(current, field, value));
                            }}
                            type="password"
                            value={credentialDraftFieldValue(createCredentialDraft, field)}
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {formError ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                className={ADMIN_BUTTON_SECONDARY}
                disabled={busy}
                onClick={closeEditor}
                type="button"
              >
                {t('admin.iam.cloudAccounts.cancel', 'Cancel')}
              </button>
              <button className={ADMIN_BUTTON_PRIMARY} disabled={busy} type="submit">
                {editorMode === 'edit'
                  ? t('admin.iam.cloudAccounts.form.saveChanges', 'Save changes')
                  : t('admin.iam.cloudAccounts.create', 'New account')}
              </button>
            </div>
          </form>
        </AdminModalShell>
      ) : null}

      {credentialTarget ? (
        <AdminModalShell
          labelledBy="cloud-account-credential-title"
          onClose={() => {
            if (!busy) setCredentialTarget(undefined);
          }}
        >
          <h2 className="text-base font-semibold" id="cloud-account-credential-title">
            {t('admin.iam.cloudAccounts.credentialTitle', 'Cloud account credential')}
            {' · '}
            {credentialTarget.displayName || credentialTarget.accountCode}
          </h2>
          <p className={`mt-1 text-xs leading-5 ${ADMIN_MUTED_TEXT_CLASS}`}>
            {t(
              'admin.iam.cloudAccounts.credentialHint',
              'IAM seals credentials with AES-256-GCM; after a write only the masked label and fingerprint are readable. Writing again rotates the credential.',
            )}
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCredential();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.credentialKind', 'Credential kind')}</span>
                <select
                  autoFocus
                  className={ADMIN_CONTROL_CLASS}
                  onChange={(event) => {
                    const credentialKind = event.target.value;
                    setRotateDraft((current) => ({ ...current, credentialKind }));
                  }}
                  value={rotateDraft.credentialKind}
                >
                  {IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {labelFor(cloudAccountCredentialKindLabelKey(kind), kind)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.credentialName', 'Credential name')}</span>
                <input
                  className={ADMIN_CONTROL_CLASS}
                  maxLength={64}
                  onChange={(event) => {
                    const credentialName = event.target.value;
                    setRotateDraft((current) => ({ ...current, credentialName }));
                  }}
                  value={rotateDraft.credentialName}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {rotateCredentialFields.map((field) => (
                <label className="admin-field" key={field}>
                  <span className={ADMIN_FIELD_LABEL_CLASS}>{labelFor(cloudAccountCredentialFieldLabelKey(field), field)} *</span>
                  <input
                    autoComplete="off"
                    className={ADMIN_CONTROL_CLASS}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRotateDraft((current) => credentialDraftWithField(current, field, value));
                    }}
                    type="password"
                    value={credentialDraftFieldValue(rotateDraft, field)}
                  />
                </label>
              ))}
            </div>
            <label className="admin-field">
              <span className={ADMIN_FIELD_LABEL_CLASS}>{t('admin.iam.cloudAccounts.credentialExpiresAt', 'Expires at (optional)')}</span>
              <input
                className={ADMIN_CONTROL_CLASS}
                onChange={(event) => {
                  const expiresAt = event.target.value;
                  setRotateDraft((current) => ({ ...current, expiresAt }));
                }}
                type="datetime-local"
                value={rotateDraft.expiresAt}
              />
            </label>
            {credentialError ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {credentialError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                className={ADMIN_BUTTON_SECONDARY}
                disabled={busy}
                onClick={() => setCredentialTarget(undefined)}
                type="button"
              >
                {t('admin.iam.cloudAccounts.cancel', 'Cancel')}
              </button>
              <button className={ADMIN_BUTTON_PRIMARY} disabled={busy} type="submit">
                {t('admin.iam.cloudAccounts.credentialWrite', 'Write')}
              </button>
            </div>
          </form>
        </AdminModalShell>
      ) : null}

      {deleteTarget ? (
        <AdminModalShell
          labelledBy="cloud-account-delete-title"
          onClose={() => {
            if (!busy) setDeleteTarget(undefined);
          }}
          widthClass="max-w-md"
        >
          <h2 className="text-base font-semibold" id="cloud-account-delete-title">
            {t('admin.iam.cloudAccounts.deleteTitle', 'Delete cloud account')}
          </h2>
          <p className={`mt-2 text-sm ${ADMIN_MUTED_TEXT_CLASS}`}>
            {t(
              'admin.iam.cloudAccounts.deleteConfirm',
              'Delete "{{name}}"? It stops resolving immediately and its stored credential is retired.',
              { name: deleteTarget.displayName || deleteTarget.accountCode },
            )}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className={ADMIN_BUTTON_SECONDARY}
              disabled={busy}
              onClick={() => setDeleteTarget(undefined)}
              type="button"
            >
              {t('admin.iam.cloudAccounts.cancel', 'Cancel')}
            </button>
            <button
              className={ADMIN_BUTTON_DANGER_SOLID}
              disabled={busy}
              onClick={() => void confirmDelete()}
              type="button"
            >
              {t('admin.iam.cloudAccounts.confirm', 'Confirm')}
            </button>
          </div>
        </AdminModalShell>
      ) : null}
    </section>
  );
}

function Fact({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className={`text-[11px] uppercase tracking-wide ${ADMIN_MUTED_TEXT_CLASS}`}>{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

function credentialDraftFieldValue(
  draft: CloudAccountCredentialDraft,
  field: string,
): string {
  switch (field) {
    case 'key_id':
      return draft.accessKeyId;
    case 'key_secret':
      return draft.secretAccessKey;
    case 'secret_text':
      return draft.secretText;
    case 'session_token':
      return draft.sessionToken;
    default:
      return '';
  }
}

function credentialDraftWithField(
  draft: CloudAccountCredentialDraft,
  field: string,
  value: string,
): CloudAccountCredentialDraft {
  switch (field) {
    case 'key_id':
      return { ...draft, accessKeyId: value };
    case 'key_secret':
      return { ...draft, secretAccessKey: value };
    case 'secret_text':
      return { ...draft, secretText: value };
    case 'session_token':
      return { ...draft, sessionToken: value };
    default:
      return draft;
  }
}
