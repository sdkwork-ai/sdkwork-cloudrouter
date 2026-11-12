import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, KeyRound, Play, RefreshCw, WifiOff } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import {
  formatTimestamp,
  jsonText,
  parseJsonObjectInput,
  readText,
  type HardwareDevice,
  type HardwareDeviceCommand,
  type HardwareDeviceCredential,
  type HardwareDeviceSession,
  type HardwareDeviceTwin,
} from '../hardware.ts';
import { describeHardwareError, getHardwareService, type HardwareService } from '../hardwareService.ts';
import { DeviceSettingsPanel } from '../components/DeviceSettingsPanel.tsx';
import {
  Badge,
  DefinitionGrid,
  EmptyBlock,
  ErrorBlock,
  Field,
  HardwareToastProvider,
  JsonBlock,
  LinkButton,
  LoadingBlock,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SelectInput,
  Tabs,
  TextArea,
  TableCell,
  TableHeadCell,
  TableRow,
  TableShell,
  useHardwareToast,
  type BadgeTone,
} from '../components/ui.tsx';

type DeviceTab = 'overview' | 'settings' | 'capabilities' | 'sessions' | 'credentials' | 'commands' | 'twin';

const CREDENTIAL_TYPES = ['bearer_token', 'hmac', 'mtls_x509', 'hardware_attestation'] as const;

type CredentialType = (typeof CREDENTIAL_TYPES)[number];

function isCredentialType(value: string): value is CredentialType {
  return (CREDENTIAL_TYPES as readonly string[]).includes(value);
}

const HEALTH_TONE: Record<string, BadgeTone> = {
  critical: 'danger',
  healthy: 'success',
  offline: 'neutral',
  warning: 'warning',
};

export interface HardwareDeviceDetailPageProps {
  deviceId?: string;
  service?: HardwareService;
}

export function HardwareDeviceDetailPage({ deviceId: deviceIdProp, service }: HardwareDeviceDetailPageProps = {}) {
  return (
    <HardwareToastProvider>
      <HardwareDeviceDetailBody deviceId={deviceIdProp} service={service} />
    </HardwareToastProvider>
  );
}

function HardwareDeviceDetailBody({
  deviceId: deviceIdProp,
  service,
}: HardwareDeviceDetailPageProps) {
  const { t } = useTranslation();
  const { notify } = useHardwareToast();
  const params = useParams<{ deviceId?: string }>();
  const deviceId = deviceIdProp ?? params.deviceId ?? '';
  const resolvedService = useMemo(() => service ?? getHardwareService(), [service]);

  const [device, setDevice] = useState<HardwareDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [tab, setTab] = useState<DeviceTab>('overview');

  const [capabilities, setCapabilities] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<HardwareDeviceSession[]>([]);
  const [credentials, setCredentials] = useState<HardwareDeviceCredential[]>([]);
  const [commands, setCommands] = useState<HardwareDeviceCommand[]>([]);
  const [twin, setTwin] = useState<HardwareDeviceTwin | null>(null);
  const [twinDraft, setTwinDraft] = useState('{}');
  const [twinError, setTwinError] = useState<string | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [credentialType, setCredentialType] = useState<CredentialType>(CREDENTIAL_TYPES[0]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    resolvedService
      .retrieveDevice(deviceId)
      .then((next) => {
        if (!active) return;
        setDevice(next);
        if (!next) {
          setError({ detail: '', key: 'notFound' });
        }
      })
      .catch((cause) => {
        if (!active) return;
        setError(describeHardwareError(cause));
        setDevice(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deviceId, resolvedService]);

  const loadTab = useCallback(
    async (target: DeviceTab) => {
      if (target === 'overview' || target === 'settings') {
        return;
      }
      setTabLoading(true);
      setError(null);
      try {
        if (target === 'capabilities') {
          const page = await resolvedService.listCapabilities(deviceId);
          setCapabilities(page.items);
        } else if (target === 'sessions') {
          const page = await resolvedService.listDeviceSessions(deviceId, { page: 1, pageSize: 50 });
          setSessions(page.items);
        } else if (target === 'credentials') {
          const page = await resolvedService.listDeviceCredentials(deviceId, { page: 1, pageSize: 50 });
          setCredentials(page.items);
        } else if (target === 'commands') {
          const page = await resolvedService.listDeviceCommands(deviceId, { page: 1, pageSize: 50 });
          setCommands(page.items);
        } else if (target === 'twin') {
          const next = await resolvedService.getDeviceTwin(deviceId);
          setTwin(next);
          setTwinDraft(jsonText({ desired: next.desired }));
        }
      } catch (cause) {
        setError(describeHardwareError(cause));
      } finally {
        setTabLoading(false);
      }
    },
    [deviceId, resolvedService],
  );

  useEffect(() => {
    void loadTab(tab);
  }, [loadTab, tab]);

  const disconnectSession = useCallback(
    async (session: HardwareDeviceSession) => {
      setBusy(true);
      try {
        await resolvedService.disconnectDeviceSession(deviceId, session.sessionId);
        notify(t('admin.hardware.sessions.disconnected'));
        await loadTab('sessions');
      } catch (cause) {
        setError(describeHardwareError(cause));
      } finally {
        setBusy(false);
      }
    },
    [deviceId, loadTab, notify, resolvedService, t],
  );

  const revokeCredential = useCallback(
    async (credential: HardwareDeviceCredential) => {
      setBusy(true);
      try {
        await resolvedService.revokeDeviceCredential(deviceId, credential.credentialId);
        notify(t('admin.hardware.credentials.revoked'));
        await loadTab('credentials');
      } catch (cause) {
        setError(describeHardwareError(cause));
      } finally {
        setBusy(false);
      }
    },
    [deviceId, loadTab, notify, resolvedService, t],
  );

  const createCredential = useCallback(async () => {
    setBusy(true);
    try {
      const created = await resolvedService.createDeviceCredential(deviceId, { credentialType });
      notify(
        created
          ? t('admin.hardware.credentials.createdWithSecret', { id: created.credentialId })
          : t('admin.hardware.credentials.created'),
      );
      await loadTab('credentials');
    } catch (cause) {
      setError(describeHardwareError(cause));
    } finally {
      setBusy(false);
    }
  }, [credentialType, deviceId, loadTab, notify, resolvedService, t]);

  const cancelCommand = useCallback(
    async (command: HardwareDeviceCommand) => {
      setBusy(true);
      try {
        await resolvedService.cancelDeviceCommand(deviceId, command.commandId);
        notify(t('admin.hardware.commands.canceled'));
        await loadTab('commands');
      } catch (cause) {
        setError(describeHardwareError(cause));
      } finally {
        setBusy(false);
      }
    },
    [deviceId, loadTab, notify, resolvedService, t],
  );

  const saveTwin = useCallback(async () => {
    const parsed = parseJsonObjectInput(twinDraft);
    if (!parsed.ok || !parsed.value) {
      setTwinError(t('admin.hardware.common.invalidJson'));
      return;
    }
    setTwinError(null);
    setBusy(true);
    try {
      const desired = parseJsonObjectInput(jsonText(parsed.value.desired ?? {}));
      const next = await resolvedService.updateDeviceTwin(deviceId, {
        desired: desired.ok ? desired.value : {},
      });
      setTwin(next);
      setTwinDraft(jsonText({ desired: next.desired }));
      notify(t('admin.hardware.common.saved'));
    } catch (cause) {
      setError(describeHardwareError(cause));
    } finally {
      setBusy(false);
    }
  }, [deviceId, notify, resolvedService, t, twinDraft]);

  const tabItems = useMemo(
    () =>
      [
        { id: 'overview' as const, label: t('admin.hardware.detail.tab.overview') },
        { id: 'settings' as const, label: t('admin.hardware.detail.tab.settings') },
        { id: 'capabilities' as const, label: t('admin.hardware.detail.tab.capabilities'), count: capabilities.length || undefined },
        { id: 'sessions' as const, label: t('admin.hardware.detail.tab.sessions'), count: sessions.length || undefined },
        { id: 'credentials' as const, label: t('admin.hardware.detail.tab.credentials'), count: credentials.length || undefined },
        { id: 'commands' as const, label: t('admin.hardware.detail.tab.commands'), count: commands.length || undefined },
        { id: 'twin' as const, label: t('admin.hardware.detail.tab.twin') },
      ],
    [capabilities.length, commands.length, credentials.length, sessions.length, t],
  );

  return (
    <PageShell
      title={device ? device.displayName : t('admin.hardware.detail.title')}
      description={deviceId}
      actions={
        <>
          <Link to="/admin/hardware/devices">
            <SecondaryButton>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('admin.hardware.detail.back')}
            </SecondaryButton>
          </Link>
          <SecondaryButton onClick={() => void loadTab(tab)} disabled={tabLoading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.common.refresh')}
          </SecondaryButton>
        </>
      }
    >
      {loading ? (
        <LoadingBlock label={t('admin.hardware.common.loading')} />
      ) : error && !device ? (
        <ErrorBlock
          title={t(`admin.hardware.error.${error.key}`)}
          description={error.detail || undefined}
          onRetry={() => void loadTab(tab)}
          retryLabel={t('admin.hardware.common.retry')}
        />
      ) : (
        <>
          <Tabs activeId={tab} items={tabItems} label={t('admin.hardware.detail.tabsLabel')} onChange={setTab} />
          {error ? (
            <ErrorBlock
              title={t(`admin.hardware.error.${error.key}`)}
              description={error.detail || undefined}
              onRetry={() => void loadTab(tab)}
              retryLabel={t('admin.hardware.common.retry')}
            />
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {tab === 'overview' && device ? (
              <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                <div className="flex flex-col gap-4">
                  <SectionCard title={t('admin.hardware.detail.identity')}>
                    <div className="px-4 py-3">
                      <DefinitionGrid
                        entries={[
                          { label: t('admin.hardware.devices.column.deviceId'), value: <span className="font-mono">{device.deviceId}</span> },
                          { label: t('admin.hardware.devices.column.product'), value: <span className="font-mono">{device.productId || '-'}</span> },
                          { label: t('admin.hardware.devices.column.chipFamily'), value: <span className="font-mono">{device.chipFamily || '-'}</span> },
                          { label: t('admin.hardware.devices.field.clientId'), value: <span className="font-mono">{device.clientId || '-'}</span> },
                          {
                            label: t('admin.hardware.common.status'),
                            value: (
                              <Badge tone={HEALTH_TONE[device.health] ?? 'neutral'}>
                                {t(`admin.hardware.health.${device.health}`)}
                              </Badge>
                            ),
                          },
                          {
                            label: t('admin.hardware.devices.column.lastSeenAt'),
                            value: formatTimestamp(device.lastSeenAt) || '-',
                          },
                        ]}
                      />
                    </div>
                  </SectionCard>
                  <SectionCard title={t('admin.hardware.detail.quickLinks')}>
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                      <SecondaryButton onClick={() => setTab('settings')}>
                        {t('admin.hardware.detail.tab.settings')}
                      </SecondaryButton>
                      <SecondaryButton onClick={() => setTab('capabilities')}>
                        {t('admin.hardware.detail.tab.capabilities')}
                      </SecondaryButton>
                      <SecondaryButton onClick={() => setTab('twin')}>
                        {t('admin.hardware.detail.tab.twin')}
                      </SecondaryButton>
                    </div>
                  </SectionCard>
                </div>
              </div>
            ) : null}

            {tab === 'settings' ? <DeviceSettingsPanel deviceId={deviceId} service={resolvedService} /> : null}

            {tab === 'capabilities' ? (
              tabLoading ? (
                <LoadingBlock label={t('admin.hardware.common.loading')} />
              ) : capabilities.length === 0 ? (
                <EmptyBlock title={t('admin.hardware.capabilities.empty')} />
              ) : (
                <TableShell>
                  <table className="w-full min-w-max border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <TableHeadCell>{t('admin.hardware.capabilities.column.name')}</TableHeadCell>
                        <TableHeadCell>{t('admin.hardware.capabilities.column.kind')}</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {capabilities.map((capability, index) => {
                        const name =
                          readText(capability.capabilityName)
                          || readText(capability.name)
                          || readText(capability.id)
                          || `#${index + 1}`;
                        const kind = readText(capability.capabilityKind) || readText(capability.kind) || '-';
                        return (
                          <TableRow key={`${name}-${index}`}>
                            <TableCell className="font-mono text-[11px]">{name}</TableCell>
                            <TableCell>
                              <Badge tone="info">{kind}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </TableShell>
              )
            ) : null}

            {tab === 'sessions' ? (
              tabLoading ? (
                <LoadingBlock label={t('admin.hardware.common.loading')} />
              ) : sessions.length === 0 ? (
                <EmptyBlock title={t('admin.hardware.sessions.empty')} />
              ) : (
                <TableShell>
                  <table className="w-full min-w-max border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <TableHeadCell>{t('admin.hardware.sessions.column.id')}</TableHeadCell>
                        <TableHeadCell>{t('admin.hardware.sessions.column.transport')}</TableHeadCell>
                        <TableHeadCell>{t('admin.hardware.sessions.column.connectedAt')}</TableHeadCell>
                        <TableHeadCell className="text-right">{t('admin.hardware.common.actions')}</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <TableRow key={session.sessionId}>
                          <TableCell className="font-mono text-[11px]">{session.sessionId}</TableCell>
                          <TableCell>{session.transport || '-'}</TableCell>
                          <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatTimestamp(session.connectedAt) || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <LinkButton onClick={() => void disconnectSession(session)} disabled={busy}>
                              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('admin.hardware.sessions.disconnect')}
                            </LinkButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              )
            ) : null}

            {tab === 'credentials' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#171717]">
                  <div className="w-56">
                    <Field label={t('admin.hardware.credentials.credentialType')} htmlFor="credential-type">
                      <SelectInput
                        id="credential-type"
                        value={credentialType}
                        onChange={(event) => {
                          if (isCredentialType(event.target.value)) {
                            setCredentialType(event.target.value);
                          }
                        }}
                      >
                        {CREDENTIAL_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {t(`admin.hardware.credentialType.${value}`)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  <PrimaryButton onClick={() => void createCredential()} disabled={busy}>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    {t('admin.hardware.credentials.issue')}
                  </PrimaryButton>
                </div>
                {tabLoading ? (
                  <LoadingBlock label={t('admin.hardware.common.loading')} />
                ) : credentials.length === 0 ? (
                  <EmptyBlock title={t('admin.hardware.credentials.empty')} />
                ) : (
                  <TableShell>
                    <table className="w-full min-w-max border-collapse text-left">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell>{t('admin.hardware.credentials.column.id')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.credentials.credentialType')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.common.status')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.credentials.column.createdAt')}</TableHeadCell>
                          <TableHeadCell className="text-right">{t('admin.hardware.common.actions')}</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {credentials.map((credential) => (
                          <TableRow key={credential.credentialId}>
                            <TableCell className="font-mono text-[11px]">{credential.credentialId}</TableCell>
                            <TableCell>{t(`admin.hardware.credentialType.${credential.credentialType}`)}</TableCell>
                            <TableCell>
                              <Badge tone={credential.status === 'active' ? 'success' : 'neutral'}>
                                {credential.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatTimestamp(credential.createdAt) || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <LinkButton
                                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                onClick={() => void revokeCredential(credential)}
                                disabled={busy || credential.status !== 'active'}
                              >
                                {t('admin.hardware.credentials.revoke')}
                              </LinkButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                )}
              </div>
            ) : null}

            {tab === 'commands' ? (
              tabLoading ? (
                <LoadingBlock label={t('admin.hardware.common.loading')} />
              ) : commands.length === 0 ? (
                <EmptyBlock title={t('admin.hardware.commands.empty')} />
              ) : (
                <TableShell>
                  <table className="w-full min-w-max border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <TableHeadCell>{t('admin.hardware.commands.column.id')}</TableHeadCell>
                        <TableHeadCell>{t('admin.hardware.common.status')}</TableHeadCell>
                        <TableHeadCell>{t('admin.hardware.commands.column.issuedAt')}</TableHeadCell>
                        <TableHeadCell className="text-right">{t('admin.hardware.common.actions')}</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {commands.map((command) => (
                        <TableRow key={command.commandId}>
                          <TableCell className="font-mono text-[11px]">{command.commandId}</TableCell>
                          <TableCell>
                            <Badge tone="info">{command.status}</Badge>
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatTimestamp(command.issuedAt) || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <LinkButton onClick={() => void cancelCommand(command)} disabled={busy}>
                              <Play className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('admin.hardware.commands.cancel')}
                            </LinkButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              )
            ) : null}

            {tab === 'twin' ? (
              tabLoading ? (
                <LoadingBlock label={t('admin.hardware.common.loading')} />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
                  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                    <SectionCard title={t('admin.hardware.twin.desired')}>
                      <div className="px-4 py-3">
                        <Field label={t('admin.hardware.twin.desiredEditor')} error={twinError ?? undefined}>
                          <TextArea
                            value={twinDraft}
                            rows={12}
                            spellCheck={false}
                            onChange={(event) => setTwinDraft(event.target.value)}
                          />
                        </Field>
                        <div className="mt-3 flex justify-end">
                          <PrimaryButton onClick={() => void saveTwin()} disabled={busy}>
                            {busy ? t('admin.hardware.common.saving') : t('admin.hardware.common.save')}
                          </PrimaryButton>
                        </div>
                      </div>
                    </SectionCard>
                    <SectionCard title={t('admin.hardware.twin.reported')}>
                      <div className="px-4 py-3">
                        <JsonBlock
                          label={t('admin.hardware.twin.reported')}
                          value={jsonText(twin?.reported ?? {})}
                        />
                      </div>
                    </SectionCard>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </>
      )}
    </PageShell>
  );
}
