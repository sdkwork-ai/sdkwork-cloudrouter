import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainField,
  DomainFormDialog,
  DomainIconButton,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainSecondaryButton,
  DomainSelect,
  DomainStateRows,
  DomainStatusPill,
  DomainTableHead,
  DomainTextInput,
  DomainTextarea,
} from './domainUi';
import { domainCenterService } from '../domainService';
import { formatDomainDateTime } from '../domainFormat';
import { translateDomainLabel, verificationFilePlatformLabel } from '../domainLabels';
import {
  DOMAIN_VERIFICATION_PLATFORMS,
  domainVerificationPlatform,
  readPickedVerificationFile,
  suggestVerificationFileName,
  verificationFilePublicUrl,
} from '../domainVerificationPlatforms';
import type {
  DomainVerificationFile,
  DomainVerificationFileCheck,
  DomainZone,
} from '../domainTypes';
import {
  hasDomainFieldErrors,
  toVerificationFileInput,
  validateVerificationFileForm,
  type DomainVerificationFileForm,
} from '../domainValidation';

const EMPTY_FORM: DomainVerificationFileForm = {
  platform: 'WECHAT_OFFICIAL_ACCOUNT',
  fileName: '',
  content: '',
};

/**
 * 归属校验文件：登记、查看会被取用的公网地址、自检、删除。
 *
 * 平台目录来自 `domainVerificationPlatforms`，与 `sdkwork-deployments` 的
 * `verification_file_catalog` 同源：选择平台后文件名按该平台签发的形态带出
 * （微信 `MP_verify_<token>.txt`、Google `<token>.html`、Apple 固定名），
 * 也可以直接选平台签发的文件，由浏览器读取原文。
 */
export function VerificationFilesDialog({
  zone,
  onClose,
}: {
  zone: DomainZone;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [files, setFiles] = useState<DomainVerificationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState<DomainVerificationFileForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Record<string, DomainVerificationFileCheck>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  const platformSpec = domainVerificationPlatform(form.platform);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    domainCenterService
      .listVerificationFiles(zone.id)
      .then((loaded) => {
        if (active) {
          setFiles(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [zone.id]);

  const pickFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    const picked = await readPickedVerificationFile(file, form.platform);
    if ('error' in picked) {
      setFormErrors((current) => ({ ...current, fileName: picked.error }));
      return;
    }
    setFormErrors({});
    setForm((current) => ({
      ...current,
      fileName: picked.fileName,
      content: picked.content,
    }));
  };

  const applySuggestedName = () => {
    // WeChat's file name and its content are the same token, so the content is
    // the best source; otherwise the operator typed a name already.
    const suggested =
      suggestVerificationFileName(form.platform, form.content) ??
      suggestVerificationFileName(form.platform, form.fileName);
    if (suggested) {
      setForm((current) => ({ ...current, fileName: suggested }));
      setFormErrors((current) => {
        const next = { ...current };
        delete next.fileName;
        return next;
      });
    }
  };

  const create = async () => {
    const nextErrors = validateVerificationFileForm(form);
    setFormErrors(nextErrors);
    if (hasDomainFieldErrors(nextErrors)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await domainCenterService.createVerificationFile(
        zone.id,
        toVerificationFileInput(form),
      );
      setFiles((current) => [created, ...current.filter((file) => file.id !== created.id)]);
      setForm(EMPTY_FORM);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (file: DomainVerificationFile) => {
    setDeletingId(file.id);
    setError(null);
    try {
      await domainCenterService.deleteVerificationFile(zone.id, file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setChecks((current) => {
        const next = { ...current };
        delete next[file.id];
        return next;
      });
    } catch (cause) {
      setError(cause);
    } finally {
      setDeletingId(null);
    }
  };

  const check = async (file: DomainVerificationFile) => {
    setCheckingId(file.id);
    setError(null);
    try {
      const result = await domainCenterService.checkVerificationFile(zone.id, file.id);
      setChecks((current) => ({ ...current, [file.id]: result }));
    } catch (cause) {
      setError(cause);
    } finally {
      setCheckingId(null);
    }
  };

  const copyUrl = async (file: DomainVerificationFile) => {
    const url = verificationFilePublicUrl(zone.apexHostname, file.fileName);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(file.id);
      window.setTimeout(() => setCopiedId((current) => (current === file.id ? null : current)), 2000);
    } catch {
      // A clipboard refusal is not worth an error banner: the URL is visible in
      // the row and can be selected by hand.
    }
  };

  return (
    <DomainFormDialog
      wide
      busy={busy}
      onClose={onClose}
      title={t('admin.domainCenter.verificationFiles.title', 'Ownership verification files')}
      description={t(
        'admin.domainCenter.verificationFiles.description',
        'Platform-issued files (WeChat, Alipay, ByteDance, Apple, Google) are served byte-for-byte from {{hostname}} so the issuing platform can verify domain control. Files are public by design and contain no secret.',
        { hostname: zone.apexHostname },
      )}
      footer={
        <DomainSecondaryButton onClick={onClose} disabled={busy}>
          {t('common.actions.close', 'Close')}
        </DomainSecondaryButton>
      }
    >
      {error ? (
        <DomainInlineNotice
          tone="danger"
          title={resolveProblemMessage(
            error,
            t,
            t('admin.domainCenter.verificationFiles.loadError', 'Verification files could not be loaded'),
          )}
        />
      ) : null}

      <div className="rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.platform', 'Platform'),
              t('admin.domainCenter.columns.fileName', 'File name'),
              t('admin.domainCenter.columns.updatedAt', 'Updated'),
              t('admin.domainCenter.verificationFiles.checkResult', 'Last check'),
              t('admin.domainCenter.columns.actions', 'Actions'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <DomainStateRows
                colSpan={5}
                kind="loading"
                title={t('admin.domainCenter.verificationFiles.loading', 'Loading files...')}
              />
            ) : files.length === 0 ? (
              <DomainStateRows
                colSpan={5}
                kind="empty"
                title={t('admin.domainCenter.verificationFiles.empty', 'No verification file registered')}
                description={t(
                  'admin.domainCenter.verificationFiles.emptyDesc',
                  'Add the file the issuing platform gave you.',
                )}
              />
            ) : (
              files.map((file) => {
                const result = checks[file.id];
                const url = verificationFilePublicUrl(zone.apexHostname, file.fileName);
                return (
                  <tr key={file.id}>
                    <td className="px-3 py-2">
                      {translateDomainLabel(t, verificationFilePlatformLabel(file.platform))}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono">{file.fileName}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate underline decoration-dotted underline-offset-2 hover:text-lobster-600"
                        >
                          {url}
                        </a>
                        <DomainIconButton
                          label={t('admin.domainCenter.verificationFiles.copyUrl', 'Copy public URL')}
                          onClick={() => void copyUrl(file)}
                        >
                          {copiedId === file.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </DomainIconButton>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {formatDomainDateTime(file.updatedAt, locale)}
                    </td>
                    <td className="px-3 py-2">
                      {result ? (
                        <DomainStatusPill
                          label={
                            result.matched
                              ? t('admin.domainCenter.verificationFiles.matched', 'Matched')
                              : result.reachable
                                ? t(
                                    'admin.domainCenter.verificationFiles.reachableMismatch',
                                    'Reachable, content mismatch',
                                  )
                                : t('admin.domainCenter.verificationFiles.unreachable', 'Not reachable')
                          }
                          tone={result.matched ? 'success' : result.reachable ? 'warning' : 'danger'}
                          title={result.detail}
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void check(file)}
                          disabled={checkingId === file.id}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          {checkingId === file.id
                            ? t('admin.domainCenter.verificationFiles.checking', 'Checking...')
                            : t('admin.domainCenter.verificationFiles.check', 'Check')}
                        </button>
                        <DomainIconButton
                          label={t('common.actions.delete', 'Delete')}
                          tone="danger"
                          disabled={deletingId === file.id}
                          onClick={() => void remove(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </DomainIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-white/15">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {t('admin.domainCenter.verificationFiles.addTitle', 'Register a verification file')}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <DomainField
            label={t('admin.domainCenter.columns.platform', 'Platform')}
            hint={platformSpec?.fileNameHint}
            error={formErrors.platform ? t(formErrors.platform, 'Invalid platform') : undefined}
          >
            <DomainSelect
              value={form.platform}
              onChange={(value) =>
                setForm((current) => ({ ...current, platform: value as DomainVerificationFileForm['platform'] }))
              }
              options={DOMAIN_VERIFICATION_PLATFORMS.map((spec) => ({
                value: spec.platform,
                label: translateDomainLabel(t, verificationFilePlatformLabel(spec.platform)),
              }))}
            />
          </DomainField>
          <DomainField
            label={t('admin.domainCenter.verificationFiles.fields.fileName', 'File name')}
            error={formErrors.fileName ? t(formErrors.fileName, 'Invalid file name') : undefined}
            hint={platformSpec?.fileNameHint}
          >
            <DomainTextInput
              mono
              value={form.fileName}
              onChange={(value) => setForm((current) => ({ ...current, fileName: value }))}
              placeholder={platformSpec?.fixedFileName ?? platformSpec?.fileNameHint ?? 'MP_verify_xxx.txt'}
            />
          </DomainField>
          <DomainField
            label={t('admin.domainCenter.verificationFiles.fields.content', 'File content')}
            error={formErrors.content ? t(formErrors.content, 'Content is required') : undefined}
          >
            <DomainTextInput
              mono
              value={form.content}
              onChange={(value) => setForm((current) => ({ ...current, content: value }))}
              placeholder="verification-token"
            />
          </DomainField>
        </div>
        {platformSpec ? (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {t(platformSpec.issuedByKey, '')}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.html,.xml,text/plain,text/html,application/xml"
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              void pickFile(picked);
              event.target.value = '';
            }}
          />
          <DomainSecondaryButton
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4" />
            {t('admin.domainCenter.verificationFiles.pickFile', 'Choose the issued file')}
          </DomainSecondaryButton>
          <DomainSecondaryButton onClick={applySuggestedName} disabled={busy}>
            {t('admin.domainCenter.verificationFiles.autoFillName', 'Derive file name')}
          </DomainSecondaryButton>
          <DomainPrimaryButton onClick={() => void create()} disabled={busy}>
            {busy
              ? t('common.actions.saving', 'Saving...')
              : t('admin.domainCenter.verificationFiles.add', 'Upload')}
          </DomainPrimaryButton>
        </div>
      </div>

      <DomainInlineNotice
        tone="info"
        title={t(
          'admin.domainCenter.verificationFiles.autoVerify',
          'Verify the WHOLE domain ownership at hostname level',
        )}
        description={t(
          'admin.domainCenter.verificationFiles.autoVerifyDesc',
          'The DNS TXT ownership proof is managed on the hostname row (apex included). Files here only satisfy platforms that require a file-based proof.',
        )}
      />
    </DomainFormDialog>
  );
}
