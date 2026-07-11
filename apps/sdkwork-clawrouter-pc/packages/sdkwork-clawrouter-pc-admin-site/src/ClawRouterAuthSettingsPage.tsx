import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, QrCode, RefreshCw, Save, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import type {
  AdminAuthSettingsUpdateRequest,
  AdminAuthWechatMini,
  AdminAuthWechatOfficial,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import {
  fetchClawRouterAuthSettings,
  updateClawRouterAuthSettings,
} from './AuthSettingsService';

type LoginMethod = NonNullable<AdminAuthSettingsUpdateRequest['loginMethods']>[number];
type RegisterMethod = NonNullable<AdminAuthSettingsUpdateRequest['registerMethods']>[number];
type RecoveryMethod = NonNullable<AdminAuthSettingsUpdateRequest['recoveryMethods']>[number];
type LeftRailMode = NonNullable<AdminAuthSettingsUpdateRequest['leftRailMode']>;
type OAuthRegion = NonNullable<AdminAuthSettingsUpdateRequest['oauthRegion']>;
type QrLoginType = NonNullable<AdminAuthSettingsUpdateRequest['qrLoginType']>;
type WechatEnv = AdminAuthWechatMini['env'];
type WechatSettingsForm = {
  mini: AdminAuthWechatMini[];
  official: AdminAuthWechatOfficial[];
};

type AuthSettingsForm = Required<Pick<
  AdminAuthSettingsUpdateRequest,
  'leftRailMode'
  | 'loginMethods'
  | 'oauthLoginEnabled'
  | 'oauthProviders'
  | 'qrLoginEnabled'
  | 'qrLoginType'
  | 'recoveryMethods'
  | 'registerMethods'
  | 'verificationPolicy'
>> & {
  oauthRegion: OAuthRegion;
  wechat: WechatSettingsForm;
};

const LOGIN_METHOD_OPTIONS: Array<{ labelKey: string, value: LoginMethod }> = [
  { labelKey: 'admin.authSettings.options.login.password', value: 'password' },
  { labelKey: 'admin.authSettings.options.login.emailCode', value: 'emailCode' },
  { labelKey: 'admin.authSettings.options.login.phoneCode', value: 'phoneCode' },
  { labelKey: 'admin.authSettings.options.login.sessionBridge', value: 'sessionBridge' },
];

const REGISTER_METHOD_OPTIONS: Array<{ labelKey: string, value: RegisterMethod }> = [
  { labelKey: 'admin.authSettings.options.contact.email', value: 'email' },
  { labelKey: 'admin.authSettings.options.contact.phone', value: 'phone' },
];

const RECOVERY_METHOD_OPTIONS: Array<{ labelKey: string, value: RecoveryMethod }> = [
  { labelKey: 'admin.authSettings.options.contact.email', value: 'email' },
  { labelKey: 'admin.authSettings.options.contact.phone', value: 'phone' },
];

const OAUTH_PROVIDER_OPTIONS = ['wechat', 'alipay', 'douyin', 'google', 'github'] as const;
const QR_LOGIN_TYPE_OPTIONS: Array<{ labelKey: string, value: QrLoginType }> = [
  { labelKey: 'admin.authSettings.options.qrLoginType.web', value: 'web' },
  { labelKey: 'admin.authSettings.options.qrLoginType.official', value: 'official' },
  { labelKey: 'admin.authSettings.options.qrLoginType.mini', value: 'mini' },
];
const WECHAT_ENV_OPTIONS: Array<{ labelKey: string, value: WechatEnv }> = [
  { labelKey: 'admin.authSettings.options.wechatEnv.release', value: 'release' },
  { labelKey: 'admin.authSettings.options.wechatEnv.trial', value: 'trial' },
  { labelKey: 'admin.authSettings.options.wechatEnv.develop', value: 'develop' },
];

const DEFAULT_AUTH_SETTINGS_FORM: AuthSettingsForm = {
  leftRailMode: 'highlights-only',
  loginMethods: ['password'],
  oauthLoginEnabled: false,
  oauthProviders: [],
  oauthRegion: 'mainland',
  qrLoginEnabled: true,
  qrLoginType: 'web',
  recoveryMethods: ['email', 'phone'],
  registerMethods: ['email', 'phone'],
  verificationPolicy: {
    emailCodeLoginEnabled: false,
    emailRegistrationVerificationRequired: false,
    phoneCodeLoginEnabled: false,
    phoneRegistrationVerificationRequired: false,
  },
  wechat: {
    mini: [],
    official: [],
  },
};

export function ClawRouterAuthSettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<AuthSettingsForm>(DEFAULT_AUTH_SETTINGS_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const record = await fetchClawRouterAuthSettings();
      if (isActive()) {
        setForm(toAuthSettingsForm(record));
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(errorMessage(error, t('admin.authSettings.errors.loadFallback')));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadSettings(() => active);
    return () => {
      active = false;
    };
  }, [loadSettings]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const saved = await updateClawRouterAuthSettings(toAuthSettingsRequest(form));
      setForm(toAuthSettingsForm(saved));
      setSaveSuccess(t('admin.authSettings.messages.saved'));
    } catch (error) {
      setSaveError(errorMessage(error, t('admin.authSettings.errors.saveFallback')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BusinessStatePanel
        kind="loading"
        title={t('admin.authSettings.loading')}
        className="min-h-[480px]"
      />
    );
  }

  if (loadError) {
    return (
      <BusinessStatePanel
        kind="error"
        title={t('admin.authSettings.errors.loadTitle')}
        description={loadError}
        onRetry={() => void loadSettings()}
        className="min-h-[480px]"
      />
    );
  }

  return (
    <div
      aria-label={t('admin.authSettings.title')}
      className="flex h-[calc(100vh-112px)] max-h-[calc(100vh-112px)] min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden md:h-[calc(100vh-128px)] md:max-h-[calc(100vh-128px)]"
    >
      <div className="flex shrink-0 justify-end gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.actions.reload')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSettings()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.actions.save')}
          </button>
      </div>

      {saveError ? (
        <div role="alert" className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {saveError}
        </div>
      ) : null}
      {saveSuccess ? (
        <div role="status" className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {saveSuccess}
        </div>
      ) : null}

      <div
        data-admin-auth-settings-body
        className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] xl:gap-5 xl:overflow-hidden xl:pr-0"
      >
        <div
          data-admin-auth-settings-main
          className="space-y-5 xl:min-h-0 xl:overflow-y-auto xl:pr-1 custom-scrollbar"
        >
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <SectionHeader icon={<Settings2 className="h-5 w-5 text-blue-500" />} title={t('admin.authSettings.sections.runtime')} />
            <div className="mt-5 space-y-6">
              <SegmentedControl
                label={t('admin.authSettings.fields.leftRail')}
                value={form.leftRailMode}
                options={[
                  { label: t('admin.authSettings.options.leftRail.auto'), value: 'auto' },
                  { label: t('admin.authSettings.options.leftRail.highlights'), value: 'highlights-only' },
                  { label: t('admin.authSettings.options.leftRail.qrOnly'), value: 'qr-only' },
                ]}
                onChange={(leftRailMode) => setForm((current) => ({
                  ...current,
                  leftRailMode,
                  qrLoginEnabled: leftRailMode === 'qr-only' ? true : current.qrLoginEnabled,
                }))}
              />
              <CheckboxGroup
                label={t('admin.authSettings.fields.loginMethods')}
                options={LOGIN_METHOD_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                values={form.loginMethods}
                onChange={(loginMethods) => setForm((current) => withLoginMethods(current, loginMethods))}
              />
              <CheckboxGroup
                label={t('admin.authSettings.fields.registrationMethods')}
                options={REGISTER_METHOD_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                values={form.registerMethods}
                onChange={(registerMethods) => setForm((current) => ({
                  ...current,
                  registerMethods: registerMethods.length > 0 ? registerMethods : ['email'],
                }))}
              />
              <CheckboxGroup
                label={t('admin.authSettings.fields.recoveryMethods')}
                options={RECOVERY_METHOD_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                values={form.recoveryMethods}
                onChange={(recoveryMethods) => setForm((current) => ({
                  ...current,
                  recoveryMethods: recoveryMethods.length > 0 ? recoveryMethods : ['email'],
                }))}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <SectionHeader icon={<ShieldCheck className="h-5 w-5 text-amber-500" />} title={t('admin.authSettings.sections.verificationPolicy')} />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ToggleRow
                label={t('admin.authSettings.fields.emailCodeLogin')}
                checked={form.verificationPolicy.emailCodeLoginEnabled}
                onChange={() => updateVerificationPolicy('emailCodeLoginEnabled', !form.verificationPolicy.emailCodeLoginEnabled, setForm)}
              />
              <ToggleRow
                label={t('admin.authSettings.fields.phoneCodeLogin')}
                checked={form.verificationPolicy.phoneCodeLoginEnabled}
                onChange={() => updateVerificationPolicy('phoneCodeLoginEnabled', !form.verificationPolicy.phoneCodeLoginEnabled, setForm)}
              />
              <ToggleRow
                label={t('admin.authSettings.fields.emailRegistrationVerification')}
                checked={form.verificationPolicy.emailRegistrationVerificationRequired}
                onChange={() => updateVerificationPolicy(
                  'emailRegistrationVerificationRequired',
                  !form.verificationPolicy.emailRegistrationVerificationRequired,
                  setForm,
                )}
              />
              <ToggleRow
                label={t('admin.authSettings.fields.phoneRegistrationVerification')}
                checked={form.verificationPolicy.phoneRegistrationVerificationRequired}
                onChange={() => updateVerificationPolicy(
                  'phoneRegistrationVerificationRequired',
                  !form.verificationPolicy.phoneRegistrationVerificationRequired,
                  setForm,
                )}
              />
            </div>
          </section>
        </div>

        <div
          data-admin-auth-settings-right
          className="mt-5 xl:mt-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1 custom-scrollbar"
        >
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <SectionHeader icon={<QrCode className="h-5 w-5 text-emerald-500" />} title={t('admin.authSettings.sections.oauthQr')} />
            <div className="mt-5 space-y-5">
              <ToggleRow
                label={t('admin.authSettings.fields.qrLogin')}
                checked={form.qrLoginEnabled}
                onChange={() => setForm((current) => ({
                  ...current,
                  leftRailMode: current.qrLoginEnabled && current.leftRailMode === 'qr-only'
                    ? 'highlights-only'
                    : current.leftRailMode,
                  qrLoginEnabled: !current.qrLoginEnabled,
                }))}
              />
              <SegmentedControl
                label={t('admin.authSettings.fields.qrLoginType')}
                value={form.qrLoginType}
                options={QR_LOGIN_TYPE_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) }))}
                onChange={(qrLoginType) => setForm((current) => ({ ...current, qrLoginType }))}
              />
              <WechatChannelEditor
                kind="official"
                values={form.wechat.official}
                onChange={(official) => setForm((current) => ({
                  ...current,
                  wechat: { ...current.wechat, official },
                }))}
              />
              <WechatChannelEditor
                kind="mini"
                values={form.wechat.mini}
                onChange={(mini) => setForm((current) => ({
                  ...current,
                  wechat: { ...current.wechat, mini },
                }))}
              />
              <ToggleRow
                label={t('admin.authSettings.fields.oauthLogin')}
                checked={form.oauthLoginEnabled}
                onChange={() => setForm((current) => ({ ...current, oauthLoginEnabled: !current.oauthLoginEnabled }))}
              />
              <SegmentedControl
                label={t('admin.authSettings.fields.oauthRegion')}
                value={form.oauthRegion}
                options={[
                  { label: t('admin.authSettings.options.oauthRegion.mainland'), value: 'mainland' },
                  { label: t('admin.authSettings.options.oauthRegion.overseas'), value: 'overseas' },
                ]}
                onChange={(oauthRegion) => setForm((current) => ({ ...current, oauthRegion }))}
              />
              <OAuthProviderEditor
                label={t('admin.authSettings.fields.oauthProviderCodes')}
                values={form.oauthProviders}
                onChange={(oauthProviders) => setForm((current) => ({ ...current, oauthProviders }))}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
    </div>
  );
}

function ToggleRow({ checked, label, onChange }: { checked: boolean, label: string, onChange: () => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1a1a1a] ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className="sr-only">{label}</span>
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string,
  onChange: (value: T) => void,
  options: Array<{ label: string, value: T }>,
  value: T,
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${value === option.value
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/70 dark:bg-blue-500/10 dark:text-blue-300'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup<T extends string>({
  label,
  onChange,
  options,
  values,
}: {
  label: string,
  onChange: (values: T[]) => void,
  options: Array<{ label: string, value: T }>,
  values: readonly T[],
}) {
  const selected = new Set(values);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              onChange={() => {
                const next = selected.has(option.value)
                  ? values.filter((item) => item !== option.value)
                  : [...values, option.value];
                onChange(next);
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function OAuthProviderEditor({
  label,
  onChange,
  values,
}: {
  label: string,
  onChange: (values: string[]) => void,
  values: readonly string[],
}) {
  const { t } = useTranslation();
  const selected = new Set(values);
  return (
    <div>
      <label htmlFor="oauth-provider-codes" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <textarea
        id="oauth-provider-codes"
        value={formatOAuthProviders(values)}
        onChange={(event) => onChange(parseOAuthProviderText(event.target.value))}
        rows={3}
            placeholder={t('admin.authSettings.placeholders.oauthProviderCodes')}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {OAUTH_PROVIDER_OPTIONS.map((value) => {
          const active = selected.has(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                const next = active ? values.filter((item) => item !== value) : [...values, value];
                onChange(normalizeOAuthProviders(next));
              }}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${active
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/70 dark:bg-blue-500/10 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {providerLabel(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type WechatChannelEditorProps =
  | {
    kind: 'official';
    onChange: (values: AdminAuthWechatOfficial[]) => void;
    values: readonly AdminAuthWechatOfficial[];
  }
  | {
    kind: 'mini';
    onChange: (values: AdminAuthWechatMini[]) => void;
    values: readonly AdminAuthWechatMini[];
  };

function WechatChannelEditor(props: WechatChannelEditorProps) {
  const { t } = useTranslation();
  const title = props.kind === 'official'
    ? t('admin.authSettings.fields.wechatOfficial')
    : t('admin.authSettings.fields.wechatMini');
  const addLabel = props.kind === 'official'
    ? t('admin.authSettings.actions.addOfficial')
    : t('admin.authSettings.actions.addMini');

  const updateItem = (index: number, patch: Partial<AdminAuthWechatOfficial & AdminAuthWechatMini>) => {
    if (props.kind === 'official') {
      props.onChange(props.values.map((item, itemIndex) => (
        itemIndex === index ? normalizeWechatOfficialDraft({ ...item, ...patch }) : item
      )));
      return;
    }
    props.onChange(props.values.map((item, itemIndex) => (
      itemIndex === index ? normalizeWechatMiniDraft({ ...item, ...patch }) : item
    )));
  };

  const markPrimary = (index: number) => {
    if (props.kind === 'official') {
      props.onChange(props.values.map((item, itemIndex) => ({ ...item, enabled: itemIndex === index ? true : item.enabled, primary: itemIndex === index })));
      return;
    }
    props.onChange(props.values.map((item, itemIndex) => ({ ...item, enabled: itemIndex === index ? true : item.enabled, primary: itemIndex === index })));
  };

  const addItem = () => {
    if (props.kind === 'official') {
      props.onChange([...props.values, createOfficialWechatDraft(props.values.length)]);
      return;
    }
    props.onChange([...props.values, createMiniWechatDraft(props.values.length)]);
  };

  const removeItem = (index: number) => {
    if (props.kind === 'official') {
      props.onChange(ensurePrimaryWechatItems(props.values.filter((_, itemIndex) => itemIndex !== index)));
      return;
    }
    props.onChange(ensurePrimaryWechatItems(props.values.filter((_, itemIndex) => itemIndex !== index)));
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {props.values.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            {t('admin.authSettings.empty.wechat')}
          </div>
        ) : null}
        {props.values.map((item, index) => (
          <div key={`${props.kind}-${index}-${item.key}`} className="rounded-md border border-slate-200 p-3 dark:border-white/10">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label={t('admin.authSettings.fields.wechatKey')}
                value={item.key}
                onChange={(value) => updateItem(index, { key: value })}
              />
              <TextField
                label={t('admin.authSettings.fields.wechatName')}
                value={item.name}
                onChange={(value) => updateItem(index, { name: value })}
              />
              <TextField
                label={t('admin.authSettings.fields.wechatAppId')}
                value={item.appId}
                onChange={(value) => updateItem(index, { appId: value })}
              />
              <TextField
                label={t('admin.authSettings.fields.wechatSecretRef')}
                value={item.secretRef}
                onChange={(value) => updateItem(index, { secretRef: value })}
              />
              {props.kind === 'official' ? (
                <>
                  <TextField
                    label={t('admin.authSettings.fields.wechatTokenRef')}
                    value={(item as AdminAuthWechatOfficial).tokenRef}
                    onChange={(value) => updateItem(index, { tokenRef: value } as Partial<AdminAuthWechatOfficial>)}
                  />
                  <TextField
                    label={t('admin.authSettings.fields.wechatAesKeyRef')}
                    value={(item as AdminAuthWechatOfficial).aesKeyRef ?? ''}
                    onChange={(value) => updateItem(index, { aesKeyRef: value } as Partial<AdminAuthWechatOfficial>)}
                  />
                  <TextField
                    label={t('admin.authSettings.fields.wechatOriginalId')}
                    value={(item as AdminAuthWechatOfficial).originalId ?? ''}
                    onChange={(value) => updateItem(index, { originalId: value } as Partial<AdminAuthWechatOfficial>)}
                  />
                  <TextField
                    label={t('admin.authSettings.fields.wechatScene')}
                    value={(item as AdminAuthWechatOfficial).scene ?? ''}
                    onChange={(value) => updateItem(index, { scene: value } as Partial<AdminAuthWechatOfficial>)}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label={t('admin.authSettings.fields.wechatPath')}
                    value={(item as AdminAuthWechatMini).path}
                    onChange={(value) => updateItem(index, { path: value } as Partial<AdminAuthWechatMini>)}
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('admin.authSettings.fields.wechatEnv')}
                    </label>
                    <select
                      value={(item as AdminAuthWechatMini).env}
                      onChange={(event) => updateItem(index, { env: readWechatEnv(event.target.value) } as Partial<AdminAuthWechatMini>)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    >
                      {WECHAT_ENV_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <TextField
                  label={t('admin.authSettings.fields.wechatUrl')}
                  value={item.url ?? ''}
                  onChange={(value) => updateItem(index, { url: value })}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => updateItem(index, { enabled: !item.enabled })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t('admin.authSettings.fields.wechatEnabled')}
              </label>
              <button
                type="button"
                onClick={() => markPrimary(index)}
                className={`inline-flex min-h-9 items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${item.primary
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/70 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                {t('admin.authSettings.fields.wechatPrimary')}
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('common.actions.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </div>
  );
}

export function toAuthSettingsForm(record: Record<string, unknown>): AuthSettingsForm {
  return {
    leftRailMode: readLeftRailMode(record.leftRailMode),
    loginMethods: loginMethods(record.loginMethods),
    oauthLoginEnabled: readBooleanSetting(record.oauthLoginEnabled, DEFAULT_AUTH_SETTINGS_FORM.oauthLoginEnabled, 'oauthLoginEnabled'),
    oauthProviders: normalizeOAuthProviders(Array.isArray(record.oauthProviders) ? record.oauthProviders : DEFAULT_AUTH_SETTINGS_FORM.oauthProviders),
    oauthRegion: readOAuthRegion(record.oauthRegion),
    qrLoginEnabled: readBooleanSetting(record.qrLoginEnabled, DEFAULT_AUTH_SETTINGS_FORM.qrLoginEnabled, 'qrLoginEnabled'),
    qrLoginType: readQrLoginType(record.qrLoginType),
    recoveryMethods: recoveryMethods(record.recoveryMethods),
    registerMethods: registerMethods(record.registerMethods),
    verificationPolicy: readVerificationPolicy(record.verificationPolicy),
    wechat: normalizeWechatSettings(record.wechat),
  };
}

export function toAuthSettingsRequest(form: AuthSettingsForm): AdminAuthSettingsUpdateRequest {
  const qrLoginEnabled = form.leftRailMode === 'qr-only' ? true : form.qrLoginEnabled;
  const qrLoginType = readQrLoginType(form.qrLoginType);
  const oauthRegion = readRequiredOAuthRegion(form.oauthRegion);
  const wechat = normalizeWechatSettings(form.wechat);
  validateQrLoginChannelUrl(qrLoginEnabled, qrLoginType, wechat);
  return {
    leftRailMode: qrLoginEnabled ? form.leftRailMode : form.leftRailMode === 'qr-only' ? 'highlights-only' : form.leftRailMode,
    loginMethods: effectiveLoginMethods(form),
    oauthLoginEnabled: form.oauthLoginEnabled,
    oauthProviders: normalizeOAuthProviders(form.oauthProviders),
    oauthRegion,
    qrLoginEnabled,
    qrLoginType,
    recoveryMethods: [...form.recoveryMethods],
    registerMethods: [...form.registerMethods],
    verificationPolicy: { ...form.verificationPolicy },
    wechat,
  };
}

function effectiveLoginMethods(form: AuthSettingsForm): LoginMethod[] {
  const selected = new Set(form.loginMethods);
  if (form.verificationPolicy.emailCodeLoginEnabled) {
    selected.add('emailCode');
  } else {
    selected.delete('emailCode');
  }
  if (form.verificationPolicy.phoneCodeLoginEnabled) {
    selected.add('phoneCode');
  } else {
    selected.delete('phoneCode');
  }
  if (selected.size === 0) {
    selected.add('password');
  }
  return LOGIN_METHOD_OPTIONS
    .map((option) => option.value)
    .filter((value) => selected.has(value));
}

function updateVerificationPolicy(
  key: keyof AuthSettingsForm['verificationPolicy'],
  value: boolean,
  setForm: React.Dispatch<React.SetStateAction<AuthSettingsForm>>,
) {
  setForm((current) => ({
    ...current,
    loginMethods: nextLoginMethodsForVerificationPolicy(current, key, value),
    verificationPolicy: {
      ...current.verificationPolicy,
      [key]: value,
    },
  }));
}

function withLoginMethods(current: AuthSettingsForm, loginMethods: LoginMethod[]): AuthSettingsForm {
  const nextLoginMethods: LoginMethod[] = loginMethods.length > 0 ? loginMethods : ['password'];
  return {
    ...current,
    loginMethods: nextLoginMethods,
    verificationPolicy: {
      ...current.verificationPolicy,
      emailCodeLoginEnabled: nextLoginMethods.includes('emailCode'),
      phoneCodeLoginEnabled: nextLoginMethods.includes('phoneCode'),
    },
  };
}

function nextLoginMethodsForVerificationPolicy(
  current: AuthSettingsForm,
  key: keyof AuthSettingsForm['verificationPolicy'],
  value: boolean,
): LoginMethod[] {
  if (key !== 'emailCodeLoginEnabled' && key !== 'phoneCodeLoginEnabled') {
    return current.loginMethods;
  }
  const selected = new Set(current.loginMethods);
  const method = key === 'emailCodeLoginEnabled' ? 'emailCode' : 'phoneCode';
  if (value) {
    selected.add(method);
  } else {
    selected.delete(method);
  }
  if (selected.size === 0) {
    selected.add('password');
  }
  return LOGIN_METHOD_OPTIONS
    .map((option) => option.value)
    .filter((item) => selected.has(item));
}

function loginMethods(value: unknown): LoginMethod[] {
  return filteredOptions(value, LOGIN_METHOD_OPTIONS.map((option) => option.value), DEFAULT_AUTH_SETTINGS_FORM.loginMethods);
}

function registerMethods(value: unknown): RegisterMethod[] {
  return filteredOptions(value, REGISTER_METHOD_OPTIONS.map((option) => option.value), DEFAULT_AUTH_SETTINGS_FORM.registerMethods);
}

function recoveryMethods(value: unknown): RecoveryMethod[] {
  return filteredOptions(value, RECOVERY_METHOD_OPTIONS.map((option) => option.value), DEFAULT_AUTH_SETTINGS_FORM.recoveryMethods);
}

function filteredOptions<T extends string>(value: unknown, allowed: readonly T[], fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const allowedSet = new Set<string>(allowed);
  const filtered = value.filter((item): item is T => typeof item === 'string' && allowedSet.has(item));
  return filtered.length > 0 ? filtered : [...fallback];
}

export function formatOAuthProviders(values: readonly string[]): string {
  return normalizeOAuthProviders(values).join(', ');
}

export function parseOAuthProviderText(value: string): string[] {
  return normalizeOAuthProviders(value.split(/[\s,]+/u));
}

function normalizeOAuthProviders(values: readonly unknown[]): string[] {
  if (values.length > 16) {
    throw new Error('oauthProviders must include at most 16 items');
  }
  const normalized: string[] = [];
  for (const item of values) {
    if (typeof item !== 'string') {
      throw new Error('oauthProviders items must be 64 characters or fewer and use letters, digits, underscore, or hyphen');
    }
    const value = item.trim();
    if (!value) {
      continue;
    }
    if (value.length > 64 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('oauthProviders items must be 64 characters or fewer and use letters, digits, underscore, or hyphen');
    }
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized;
}

function normalizeWechatSettings(value: unknown): WechatSettingsForm {
  if (!isRecord(value)) {
    return { mini: [], official: [] };
  }
  return {
    official: normalizeWechatOfficialList(value.official),
    mini: normalizeWechatMiniList(value.mini),
  };
}

function normalizeWechatOfficialList(value: unknown): AdminAuthWechatOfficial[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length > 8) {
    throw new Error('wechat official accounts must include at most 8 items');
  }
  const items = value
    .map((item) => normalizeWechatOfficial(item))
    .filter((item): item is AdminAuthWechatOfficial => item !== null);
  return ensurePrimaryWechatItems(items) as AdminAuthWechatOfficial[];
}

function normalizeWechatMiniList(value: unknown): AdminAuthWechatMini[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length > 8) {
    throw new Error('wechat mini programs must include at most 8 items');
  }
  const items = value
    .map((item) => normalizeWechatMini(item))
    .filter((item): item is AdminAuthWechatMini => item !== null);
  return ensurePrimaryWechatItems(items) as AdminAuthWechatMini[];
}

function normalizeWechatOfficial(value: unknown): AdminAuthWechatOfficial | null {
  if (!isRecord(value)) {
    throw new Error('wechat official account must be an object');
  }
  const item = normalizeWechatOfficialDraft(value);
  if (isEmptyWechatItem(item, ['key', 'name', 'appId', 'secretRef', 'tokenRef', 'url', 'originalId', 'aesKeyRef', 'scene'])) {
    return null;
  }
  requireWechatFields(item, ['key', 'name', 'appId', 'secretRef', 'tokenRef']);
  validateSecretRef(item.secretRef);
  validateSecretRef(item.tokenRef);
  validateOptionalSecretRef(item.aesKeyRef);
  validateOptionalHttpsUrl(item.url);
  return item;
}

function normalizeWechatMini(value: unknown): AdminAuthWechatMini | null {
  if (!isRecord(value)) {
    throw new Error('wechat mini program must be an object');
  }
  const item = normalizeWechatMiniDraft(value);
  if (isEmptyWechatItem(item, ['key', 'name', 'appId', 'secretRef', 'url', 'path'])) {
    return null;
  }
  requireWechatFields(item, ['key', 'name', 'appId', 'secretRef', 'path']);
  validateSecretRef(item.secretRef);
  validateOptionalHttpsUrl(item.url);
  validateMiniProgramPath(item.path);
  return item;
}

function validateQrLoginChannelUrl(
  qrLoginEnabled: boolean,
  qrLoginType: QrLoginType,
  wechat: WechatSettingsForm,
): void {
  if (!qrLoginEnabled) {
    return;
  }
  if (qrLoginType === 'official') {
    const account = primaryEnabledWechatItem(wechat.official);
    if (account && !account.url) {
      throw new Error('wechat.official.url is required when official QR login is enabled');
    }
  }
  if (qrLoginType === 'mini') {
    const mini = primaryEnabledWechatItem(wechat.mini);
    if (mini && !mini.url) {
      throw new Error('wechat.mini.url is required when mini QR login is enabled');
    }
  }
}

function primaryEnabledWechatItem<T extends { enabled: boolean; primary: boolean }>(items: readonly T[]): T | undefined {
  return items.find((item) => item.enabled && item.primary) ?? items.find((item) => item.enabled);
}

function normalizeWechatOfficialDraft(value: unknown): AdminAuthWechatOfficial {
  const record = isRecord(value) ? value : {};
  return {
    key: readTrimmedString(record.key),
    name: readTrimmedString(record.name),
    appId: readTrimmedString(record.appId),
    originalId: optionalTrimmedString(record.originalId),
    secretRef: readTrimmedString(record.secretRef),
    tokenRef: readTrimmedString(record.tokenRef),
    aesKeyRef: optionalTrimmedString(record.aesKeyRef),
    url: optionalTrimmedString(record.url),
    enabled: record.enabled !== false,
    primary: record.primary === true,
    scene: optionalTrimmedString(record.scene),
  };
}

function normalizeWechatMiniDraft(value: unknown): AdminAuthWechatMini {
  const record = isRecord(value) ? value : {};
  return {
    key: readTrimmedString(record.key),
    name: readTrimmedString(record.name),
    appId: readTrimmedString(record.appId),
    secretRef: readTrimmedString(record.secretRef),
    url: optionalTrimmedString(record.url),
    enabled: record.enabled !== false,
    primary: record.primary === true,
    path: readTrimmedString(record.path),
    env: readWechatEnv(record.env),
  };
}

function createOfficialWechatDraft(index: number): AdminAuthWechatOfficial {
  return {
    key: `official-${index + 1}`,
    name: `official-${index + 1}`,
    appId: '',
    secretRef: '',
    tokenRef: '',
    enabled: true,
    primary: index === 0,
  };
}

function createMiniWechatDraft(index: number): AdminAuthWechatMini {
  return {
    key: `mini-${index + 1}`,
    name: `mini-${index + 1}`,
    appId: '',
    secretRef: '',
    enabled: true,
    primary: index === 0,
    path: 'pages/login/index',
    env: 'release',
  };
}

function ensurePrimaryWechatItems<T extends { enabled: boolean; primary: boolean }>(items: readonly T[]): T[] {
  let primaryAssigned = false;
  const enabledIndex = items.findIndex((item) => item.enabled);
  return items.map((item, index) => {
    const primary = item.enabled && item.primary && !primaryAssigned;
    if (primary) {
      primaryAssigned = true;
      return { ...item, primary };
    }
    if (!primaryAssigned && index === enabledIndex) {
      primaryAssigned = true;
      return { ...item, primary: true };
    }
    return { ...item, primary: false };
  });
}

function isEmptyWechatItem(item: object, keys: readonly string[]): boolean {
  const record = item as Record<string, unknown>;
  return keys.every((key) => typeof record[key] !== 'string' || !(record[key] as string).trim());
}

function requireWechatFields(item: object, keys: readonly string[]): void {
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] !== 'string' || !(record[key] as string).trim()) {
      throw new Error(`wechat ${key} is required`);
    }
  }
}

function validateSecretRef(value: string): void {
  if (!value.startsWith('secret://') && !value.startsWith('vault://')) {
    throw new Error('wechat secret refs must start with secret:// or vault://');
  }
}

function validateOptionalSecretRef(value: string | undefined): void {
  if (value) {
    validateSecretRef(value);
  }
}

function validateOptionalHttpsUrl(value: string | undefined): void {
  if (!value) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('wechat urls must be valid HTTPS URLs without fragments');
  }
  if (parsed.protocol !== 'https:' || parsed.hash) {
    throw new Error('wechat urls must be valid HTTPS URLs without fragments');
  }
}

function validateMiniProgramPath(value: string): void {
  if (value.startsWith('/') || value.includes('?') || value.includes('#')) {
    throw new Error('mini program path must not start with slash or contain query or fragment');
  }
  if (!/^[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value)) {
    throw new Error('mini program path must use URL path-safe characters');
  }
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalTrimmedString(value: unknown): string | undefined {
  const normalized = readTrimmedString(value);
  return normalized || undefined;
}

function readLeftRailMode(value: unknown): LeftRailMode {
  if (value === 'auto' || value === 'highlights-only' || value === 'qr-only') {
    return value;
  }
  throw new Error('leftRailMode must be one of auto, highlights-only, qr-only');
}

function readQrLoginType(value: unknown): QrLoginType {
  if (value === 'web' || value === 'official' || value === 'mini') {
    return value;
  }
  if (value === 'sdkwork_app' || value === 'sdkwork-app') {
    return 'web';
  }
  if (value === 'wechat_official_account' || value === 'wechat-official-account' || value === 'wechat-official') {
    return 'official';
  }
  if (value === 'wechat_mini_program' || value === 'wechat-mini-program' || value === 'miniapp') {
    return 'mini';
  }
  throw new Error('qrLoginType must be one of web, official, mini');
}

function readWechatEnv(value: unknown): WechatEnv {
  if (value === 'release' || value === 'trial' || value === 'develop') {
    return value;
  }
  return 'release';
}

function readOAuthRegion(value: unknown): OAuthRegion {
  if (value === undefined || value === null || value === '') {
    return 'mainland';
  }
  return readRequiredOAuthRegion(value);
}

function readRequiredOAuthRegion(value: unknown): OAuthRegion {
  if (value === 'mainland' || value === 'overseas') {
    return value;
  }
  throw new Error('oauthRegion must be one of mainland, overseas');
}

function readBooleanSetting(value: unknown, fallback: boolean, key: string): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error(`${key} must be a boolean`);
}

function readVerificationPolicy(value: unknown): AuthSettingsForm['verificationPolicy'] {
  if (!isRecord(value)) {
    return { ...DEFAULT_AUTH_SETTINGS_FORM.verificationPolicy };
  }
  return {
    emailCodeLoginEnabled: readBooleanSetting(value.emailCodeLoginEnabled, false, 'verificationPolicy.emailCodeLoginEnabled'),
    emailRegistrationVerificationRequired: readBooleanSetting(
      value.emailRegistrationVerificationRequired,
      false,
      'verificationPolicy.emailRegistrationVerificationRequired',
    ),
    phoneCodeLoginEnabled: readBooleanSetting(value.phoneCodeLoginEnabled, false, 'verificationPolicy.phoneCodeLoginEnabled'),
    phoneRegistrationVerificationRequired: readBooleanSetting(
      value.phoneRegistrationVerificationRequired,
      false,
      'verificationPolicy.phoneRegistrationVerificationRequired',
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function providerLabel(value: string): string {
  if (value === 'wechat') return 'WeChat';
  if (value === 'alipay') return 'Alipay';
  if (value === 'douyin') return 'Douyin';
  if (value === 'google') return 'Google';
  if (value === 'github') return 'GitHub';
  return value;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
