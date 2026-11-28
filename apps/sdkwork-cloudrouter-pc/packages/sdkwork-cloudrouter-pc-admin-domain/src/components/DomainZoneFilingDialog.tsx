import { useId, useState } from 'react';
import { ClipboardList, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import { domainCenterService } from '../domainService';
import type { DomainZone } from '../domainTypes';
import {
  localIsoDate,
  toZoneFilingInput,
  toZonePoliceFilingInput,
  validateZoneFilingForm,
  validateZonePoliceFilingForm,
  type DomainZoneFilingForm,
  type DomainZonePoliceFilingForm,
} from '../domainValidation';
import {
  DomainField,
  DomainFormDialog,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainSecondaryButton,
  DomainStatusPill,
  DomainTextInput,
} from './domainUi';

type FilingKind = 'icp' | 'police';

export function DomainZoneFilingDialog({
  zone,
  onClose,
  onSaved,
}: {
  zone: DomainZone;
  onClose: () => void;
  onSaved: (zone: DomainZone) => void;
}) {
  const { t } = useTranslation();
  const icpSectionId = useId();
  const policeSectionId = useId();
  const [form, setForm] = useState<DomainZoneFilingForm>({
    recordNumber: zone.filing?.recordNumber ?? '',
    entityName: zone.filing?.entityName ?? '',
    websiteName: zone.filing?.websiteName ?? '',
    reviewDate: zone.filing?.reviewDate ?? '',
  });
  const [policeForm, setPoliceForm] = useState<DomainZonePoliceFilingForm>({
    recordNumber: zone.policeFiling?.recordNumber ?? '',
    recordUrl: zone.policeFiling?.recordUrl ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [policeErrors, setPoliceErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState<FilingKind | null>(null);

  const saveIcp = async () => {
    const nextErrors = validateZoneFilingForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const updated = await domainCenterService.updateZone(zone.id, { filing: toZoneFilingInput(form) });
      onSaved(updated);
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.zones.filing.errors.save', 'Filing information could not be saved')),
      );
    } finally {
      setBusy(false);
    }
  };

  const savePolice = async () => {
    const nextErrors = validateZonePoliceFilingForm(policeForm);
    setPoliceErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const updated = await domainCenterService.updateZone(zone.id, {
        policeFiling: toZonePoliceFilingInput(policeForm),
      });
      onSaved(updated);
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.zones.filing.errors.save', 'Filing information could not be saved')),
      );
    } finally {
      setBusy(false);
    }
  };

  const clear = async (kind: FilingKind) => {
    setBusy(true);
    setSubmitError(null);
    try {
      const updated = await domainCenterService.updateZone(
        zone.id,
        kind === 'icp' ? { filing: null } : { policeFiling: null },
      );
      onSaved(updated);
    } catch (cause) {
      setConfirmClear(null);
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.zones.filing.errors.clear', 'Filing information could not be cleared')),
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelLabel = t('common.actions.cancel', 'Cancel');
  const icpClearLabel = t('admin.domainCenter.zones.filing.clear', 'Clear ICP filing');
  const policeClearLabel = t(
    'admin.domainCenter.zones.filing.police.clear',
    'Clear public security filing',
  );

  return (
    <>
      <DomainFormDialog
        wide
        busy={busy}
        onClose={onClose}
        title={t('admin.domainCenter.zones.filing.title', 'Filing information')}
        description={t(
          'admin.domainCenter.zones.filing.description',
          'Maintain ICP and public security filing independently. Saving replaces only the selected filing and leaves the other one unchanged; saving an empty section also clears it.',
        )}
        footer={
          <DomainSecondaryButton onClick={onClose} disabled={busy}>
            {cancelLabel}
          </DomainSecondaryButton>
        }
      >
        {submitError ? <DomainInlineNotice tone="danger" title={submitError} /> : null}
        <DomainInlineNotice
          tone="info"
          title={zone.apexHostname}
          description={t(
            'admin.domainCenter.zones.filing.scopeHint',
            'These records belong only to this root domain. They do not publish a footer or change the site-wide filing settings.',
          )}
        />

        <section
          aria-labelledby={icpSectionId}
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-lobster-600 dark:text-lobster-400">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div>
                <h3 id={icpSectionId} className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('admin.domainCenter.zones.filing.icpTitle', 'ICP filing')}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  {t(
                    'admin.domainCenter.zones.filing.icpDescription',
                    'The filing details published for this root domain by the competent authority.',
                  )}
                </p>
              </div>
            </div>
            <DomainStatusPill
              label={zone.filing
                ? t('admin.domainCenter.zones.filing.recorded', 'Recorded')
                : t('admin.domainCenter.zones.filing.notRecorded', 'Not recorded')}
              tone={zone.filing ? 'success' : 'neutral'}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DomainField
              label={t('admin.domainCenter.zones.filing.fields.recordNumber', 'ICP record number')}
              error={errors.recordNumber ? t(errors.recordNumber) : undefined}
            >
              <DomainTextInput
                mono
                autoFocus
                max="64"
                disabled={busy}
                value={form.recordNumber}
                onChange={(value) => setForm((current) => ({ ...current, recordNumber: value }))}
                placeholder={t('admin.domainCenter.zones.filing.placeholders.recordNumber', 'e.g. 京ICP备12345678号-1')}
              />
            </DomainField>
            <DomainField
              label={t('admin.domainCenter.zones.filing.fields.reviewDate', 'Review date')}
              hint={t('admin.domainCenter.zones.filing.hints.reviewDate', 'Optional; cannot be in the future')}
              error={errors.reviewDate ? t(errors.reviewDate) : undefined}
            >
              <DomainTextInput
                type="date"
                max={localIsoDate()}
                disabled={busy}
                value={form.reviewDate}
                onChange={(value) => setForm((current) => ({ ...current, reviewDate: value }))}
              />
            </DomainField>
            <DomainField
              label={t('admin.domainCenter.zones.filing.fields.entityName', 'Filing entity')}
              error={errors.entityName ? t(errors.entityName) : undefined}
            >
              <DomainTextInput
                max="200"
                disabled={busy}
                value={form.entityName}
                onChange={(value) => setForm((current) => ({ ...current, entityName: value }))}
                placeholder={t('admin.domainCenter.zones.filing.placeholders.entityName', 'Company or individual name')}
              />
            </DomainField>
            <DomainField
              label={t('admin.domainCenter.zones.filing.fields.websiteName', 'Website name')}
              error={errors.websiteName ? t(errors.websiteName) : undefined}
            >
              <DomainTextInput
                max="200"
                disabled={busy}
                value={form.websiteName}
                onChange={(value) => setForm((current) => ({ ...current, websiteName: value }))}
                placeholder={t('admin.domainCenter.zones.filing.placeholders.websiteName', 'Website name recorded by the authority')}
              />
            </DomainField>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
            {zone.filing ? (
              <DomainSecondaryButton onClick={() => setConfirmClear('icp')} disabled={busy}>
                {icpClearLabel}
              </DomainSecondaryButton>
            ) : null}
            <DomainPrimaryButton onClick={() => void saveIcp()} disabled={busy}>
              {busy ? t('common.actions.saving', 'Saving...') : t('admin.domainCenter.zones.filing.save', 'Save ICP filing')}
            </DomainPrimaryButton>
          </div>
        </section>

        <section
          aria-labelledby={policeSectionId}
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-lobster-600 dark:text-lobster-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 id={policeSectionId} className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('admin.domainCenter.zones.filing.police.title', 'Public security filing')}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  {t(
                    'admin.domainCenter.zones.filing.police.description',
                    'The public security filing number and its official query link.',
                  )}
                </p>
              </div>
            </div>
            <DomainStatusPill
              label={zone.policeFiling
                ? t('admin.domainCenter.zones.filing.recorded', 'Recorded')
                : t('admin.domainCenter.zones.filing.notRecorded', 'Not recorded')}
              tone={zone.policeFiling ? 'success' : 'neutral'}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DomainField
              label={t('admin.domainCenter.zones.filing.police.fields.recordNumber', 'Public security filing number')}
              error={policeErrors.recordNumber ? t(policeErrors.recordNumber) : undefined}
            >
              <DomainTextInput
                mono
                max="64"
                disabled={busy}
                value={policeForm.recordNumber}
                onChange={(value) => setPoliceForm((current) => ({ ...current, recordNumber: value }))}
                placeholder={t('admin.domainCenter.zones.filing.police.placeholders.recordNumber', 'e.g. 京公网安备11010502000000号')}
              />
            </DomainField>
            <DomainField
              label={t('admin.domainCenter.zones.filing.police.fields.recordUrl', 'Public security filing URL')}
              hint={t('admin.domainCenter.zones.filing.police.hints.recordUrl', 'Absolute HTTP or HTTPS link to the official filing')}
              error={policeErrors.recordUrl ? t(policeErrors.recordUrl) : undefined}
            >
              <DomainTextInput
                type="url"
                max="2048"
                disabled={busy}
                value={policeForm.recordUrl}
                onChange={(value) => setPoliceForm((current) => ({ ...current, recordUrl: value }))}
                placeholder="https://beian.mps.gov.cn/"
              />
            </DomainField>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
            {zone.policeFiling ? (
              <DomainSecondaryButton onClick={() => setConfirmClear('police')} disabled={busy}>
                {policeClearLabel}
              </DomainSecondaryButton>
            ) : null}
            <DomainPrimaryButton onClick={() => void savePolice()} disabled={busy}>
              {busy ? t('common.actions.saving', 'Saving...') : t('admin.domainCenter.zones.filing.police.save', 'Save public security filing')}
            </DomainPrimaryButton>
          </div>
        </section>
      </DomainFormDialog>

      {confirmClear ? (
        <ConfirmDialog
          tone="danger"
          title={confirmClear === 'icp'
            ? t('admin.domainCenter.zones.filing.clearTitle', 'Clear ICP filing information')
            : t('admin.domainCenter.zones.filing.police.clearTitle', 'Clear public security filing information')}
          description={t(
            confirmClear === 'icp'
              ? 'admin.domainCenter.zones.filing.clearDescription'
              : 'admin.domainCenter.zones.filing.police.clearDescription',
            confirmClear === 'icp'
              ? 'Remove the ICP filing information stored for {{hostname}}?'
              : 'Remove the public security filing information stored for {{hostname}}?',
            { hostname: zone.apexHostname },
          )}
          confirmLabel={confirmClear === 'icp' ? icpClearLabel : policeClearLabel}
          cancelLabel={cancelLabel}
          isBusy={busy}
          onConfirm={() => void clear(confirmClear)}
          onCancel={() => setConfirmClear(null)}
        />
      ) : null}
    </>
  );
}
