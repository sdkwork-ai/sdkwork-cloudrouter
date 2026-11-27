import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  CreateSandboxInstanceInput,
  SandboxInstance,
  SandboxIsolationAssurance,
  SandboxRuntimeKind,
  UpdateSandboxInstanceInput,
} from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';
import { SANDBOX_ISOLATION_ASSURANCES } from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';

import {
  VM_INSTANCE_CAPABILITY_ORDER,
  VM_INSTANCE_LIMITS,
  VM_INSTANCE_PROFILE_ORDER,
  VM_INSTANCE_RUNTIME_KIND_ORDER,
  createVmInstanceDraft,
  toCreateSandboxInstanceInput,
  toUpdateSandboxInstanceInput,
  toggleVmInstanceCapability,
  validateVmInstanceDraft,
  vmInstanceAssurancesForRuntimeKind,
  vmInstanceDraftFromInstance,
  vmInstanceProfileBounds,
  type VmInstanceDraft,
  type VmInstanceDraftErrors,
  type VmInstanceDraftField,
  type VmInstanceValidationCode,
} from './vmInstancesModel.ts';

/** The two commands the form can submit. */
export type VmInstanceFormSubmit =
  | { kind: 'create'; input: CreateSandboxInstanceInput }
  | { kind: 'update'; input: UpdateSandboxInstanceInput };

export interface VmInstanceFormProps {
  busy: boolean;
  /** Existing row for the edit dialog; `null` opens a fresh provisioning draft. */
  instance: SandboxInstance | null;
  onCancel: () => void;
  onSubmit: (submit: VmInstanceFormSubmit) => void;
}

/** Bare model code -> catalog key. A new server rule must be given copy here. */
const VALIDATION_MESSAGE_KEYS: Readonly<Record<VmInstanceValidationCode, string>> = {
  'baseImage.required': 'console.vmInstances.validate.baseImageRequired',
  'baseImage.tooLong': 'console.vmInstances.validate.baseImageTooLong',
  'disk.notANumber': 'console.vmInstances.validate.diskNotNumber',
  'disk.outOfProfile': 'console.vmInstances.validate.diskOutOfProfile',
  'expiresAt.invalid': 'console.vmInstances.validate.expiresAtInvalid',
  'memory.notANumber': 'console.vmInstances.validate.memoryNotNumber',
  'memory.outOfProfile': 'console.vmInstances.validate.memoryOutOfProfile',
  'name.required': 'console.vmInstances.validate.nameRequired',
  'name.tooLong': 'console.vmInstances.validate.nameTooLong',
  'runtimeKind.insufficientAssurance': 'console.vmInstances.validate.insufficientAssurance',
  'vcpu.notANumber': 'console.vmInstances.validate.vcpuNotNumber',
  'vcpu.outOfProfile': 'console.vmInstances.validate.vcpuOutOfProfile',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/5';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-300';
const HINT_CLASS = 'mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400';
const ERROR_CLASS = 'mt-1 text-xs font-medium text-red-600 dark:text-red-400';

function Field({
  children,
  error,
  hint,
  htmlFor,
  label,
  optional,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
            ({t('console.vmInstances.field.optional')})
          </span>
        ) : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className={ERROR_CLASS} id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={HINT_CLASS}>{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Provisioning / edit form for one VM instance.
 *
 * The form validates against the pure model before it builds a command, so an
 * invalid draft never reaches the transport. The server remains the authority:
 * a refusal it returns is rendered by the page's action banner, not swallowed
 * here.
 */
export function VmInstanceForm({ busy, instance, onCancel, onSubmit }: VmInstanceFormProps) {
  const { t } = useTranslation();
  const isEdit = instance !== null;
  const [draft, setDraft] = useState<VmInstanceDraft>(() =>
    instance ? vmInstanceDraftFromInstance(instance) : createVmInstanceDraft(),
  );
  const [errors, setErrors] = useState<VmInstanceDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const bounds = vmInstanceProfileBounds(draft.profile);
  const profileLabel = t(`console.vmInstances.profile.${draft.profile}`);

  function patch(update: Partial<VmInstanceDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    // A corrected field stops carrying the previous rejection: the message was
    // about the old value, and leaving it under the new one reads as a fresh
    // refusal of input the operator just fixed.
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(update)) {
        delete next[field as VmInstanceDraftField];
      }
      return next;
    });
  }

  function messageFor(code: VmInstanceValidationCode | undefined): string | undefined {
    if (!code) return undefined;
    const key = VALIDATION_MESSAGE_KEYS[code];
    switch (code) {
      case 'name.tooLong':
        return t(key, { max: VM_INSTANCE_LIMITS.nameMaxLength });
      case 'baseImage.tooLong':
        return t(key, { max: VM_INSTANCE_LIMITS.baseImageMaxLength });
      case 'vcpu.outOfProfile':
        return t(key, {
          min: VM_INSTANCE_LIMITS.vcpuMinCount,
          max: bounds.maxVcpuCount,
          profile: profileLabel,
        });
      case 'memory.outOfProfile':
        return t(key, {
          min: VM_INSTANCE_LIMITS.memoryMinMb,
          max: bounds.maxMemoryMb,
          profile: profileLabel,
        });
      case 'disk.outOfProfile':
        return t(key, {
          min: VM_INSTANCE_LIMITS.diskMinMb,
          max: bounds.maxDiskMb,
          profile: profileLabel,
        });
      default:
        return t(key);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateVmInstanceDraft(draft, { requireBaseImage: !isEdit });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    try {
      onSubmit(
        isEdit
          ? { kind: 'update', input: toUpdateSandboxInstanceInput(draft) }
          : { kind: 'create', input: toCreateSandboxInstanceInput(draft) },
      );
    } catch (cause) {
      // `toCreate…`/`toUpdate…` throw only when a draft bypassed validation. The
      // form reports it instead of letting the render tree crash.
      setFormError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {formError}
          </p>
        ) : null}

        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
            {t('console.vmInstances.section.shape')}
          </legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                error={messageFor(errors.name)}
                hint={t('console.vmInstances.hint.name', { max: VM_INSTANCE_LIMITS.nameMaxLength })}
                htmlFor="vm-instance-name"
                label={t('console.vmInstances.field.name')}
              >
                <input
                  aria-describedby={errors.name ? 'vm-instance-name-error' : undefined}
                  aria-invalid={errors.name ? true : undefined}
                  autoComplete="off"
                  className={INPUT_CLASS}
                  disabled={busy}
                  id="vm-instance-name"
                  maxLength={VM_INSTANCE_LIMITS.nameMaxLength}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder={t('console.vmInstances.placeholder.name')}
                  value={draft.name}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                error={messageFor(errors.baseImage)}
                hint={
                  isEdit
                    ? t('console.vmInstances.hint.baseImageImmutable')
                    : t('console.vmInstances.hint.baseImage')
                }
                htmlFor="vm-instance-base-image"
                label={t('console.vmInstances.field.baseImage')}
              >
                <input
                  aria-describedby={errors.baseImage ? 'vm-instance-base-image-error' : undefined}
                  aria-invalid={errors.baseImage ? true : undefined}
                  autoComplete="off"
                  className={INPUT_CLASS}
                  disabled={busy || isEdit}
                  id="vm-instance-base-image"
                  maxLength={VM_INSTANCE_LIMITS.baseImageMaxLength}
                  onChange={(event) => patch({ baseImage: event.target.value })}
                  placeholder={t('console.vmInstances.placeholder.baseImage')}
                  value={draft.baseImage}
                />
              </Field>
            </div>

            <Field
              hint={t('console.vmInstances.hint.profile')}
              htmlFor="vm-instance-profile"
              label={t('console.vmInstances.field.profile')}
            >
              <select
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-profile"
                onChange={(event) => patch({ profile: event.target.value as VmInstanceDraft['profile'] })}
                value={draft.profile}
              >
                {VM_INSTANCE_PROFILE_ORDER.map((profile) => (
                  <option key={profile} value={profile}>
                    {t(`console.vmInstances.profile.${profile}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              error={messageFor(errors.vcpuCount)}
              hint={t('console.vmInstances.hint.vcpu', {
                min: VM_INSTANCE_LIMITS.vcpuMinCount,
                max: bounds.maxVcpuCount,
                profile: profileLabel,
              })}
              htmlFor="vm-instance-vcpu"
              label={t('console.vmInstances.field.vcpu')}
            >
              <input
                aria-describedby={errors.vcpuCount ? 'vm-instance-vcpu-error' : undefined}
                aria-invalid={errors.vcpuCount ? true : undefined}
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-vcpu"
                inputMode="numeric"
                max={bounds.maxVcpuCount}
                min={VM_INSTANCE_LIMITS.vcpuMinCount}
                onChange={(event) => patch({ vcpuCount: event.target.value })}
                type="number"
                value={draft.vcpuCount}
              />
            </Field>

            <Field
              error={messageFor(errors.memoryMb)}
              hint={t('console.vmInstances.hint.memory', {
                min: VM_INSTANCE_LIMITS.memoryMinMb,
                max: bounds.maxMemoryMb,
                profile: profileLabel,
              })}
              htmlFor="vm-instance-memory"
              label={t('console.vmInstances.field.memory')}
            >
              <input
                aria-describedby={errors.memoryMb ? 'vm-instance-memory-error' : undefined}
                aria-invalid={errors.memoryMb ? true : undefined}
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-memory"
                inputMode="numeric"
                max={bounds.maxMemoryMb}
                min={VM_INSTANCE_LIMITS.memoryMinMb}
                onChange={(event) => patch({ memoryMb: event.target.value })}
                type="number"
                value={draft.memoryMb}
              />
            </Field>

            <Field
              error={messageFor(errors.diskMb)}
              hint={t('console.vmInstances.hint.disk', {
                min: VM_INSTANCE_LIMITS.diskMinMb,
                max: bounds.maxDiskMb,
                profile: profileLabel,
              })}
              htmlFor="vm-instance-disk"
              label={t('console.vmInstances.field.disk')}
            >
              <input
                aria-describedby={errors.diskMb ? 'vm-instance-disk-error' : undefined}
                aria-invalid={errors.diskMb ? true : undefined}
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-disk"
                inputMode="numeric"
                max={bounds.maxDiskMb}
                min={VM_INSTANCE_LIMITS.diskMinMb}
                onChange={(event) => patch({ diskMb: event.target.value })}
                type="number"
                value={draft.diskMb}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
            {t('console.vmInstances.section.isolation')}
          </legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field
              error={messageFor(errors.runtimeKind)}
              hint={
                isEdit
                  ? t('console.vmInstances.hint.runtimeKindImmutable')
                  : t('console.vmInstances.hint.runtimeKind')
              }
              htmlFor="vm-instance-runtime-kind"
              label={t('console.vmInstances.field.runtimeKind')}
            >
              <select
                aria-describedby={
                  errors.runtimeKind ? 'vm-instance-runtime-kind-error' : undefined
                }
                aria-invalid={errors.runtimeKind ? true : undefined}
                className={INPUT_CLASS}
                disabled={busy || isEdit}
                id="vm-instance-runtime-kind"
                onChange={(event) => {
                  const runtimeKind = event.target.value as SandboxRuntimeKind;
                  // Selecting an engine can invalidate the current assurance
                  // (e.g. `docker` cannot serve `micro_vm`). Snap the assurance
                  // down to the engine's own boundary instead of leaving the
                  // form in a state the server will reject.
                  const allowed = vmInstanceAssurancesForRuntimeKind(runtimeKind);
                  patch({
                    runtimeKind,
                    assurance: allowed.includes(draft.assurance)
                      ? draft.assurance
                      : allowed[allowed.length - 1],
                  });
                }}
                value={draft.runtimeKind}
              >
                {VM_INSTANCE_RUNTIME_KIND_ORDER.map((runtimeKind) => (
                  <option key={runtimeKind} value={runtimeKind}>
                    {t(`console.vmInstances.runtimeKind.${runtimeKind}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              error={messageFor(errors.runtimeKind)}
              hint={t('console.vmInstances.hint.assurance')}
              htmlFor="vm-instance-assurance"
              label={t('console.vmInstances.field.assurance')}
            >
              <select
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-assurance"
                onChange={(event) =>
                  patch({ assurance: event.target.value as SandboxIsolationAssurance })
                }
                value={draft.assurance}
              >
                {SANDBOX_ISOLATION_ASSURANCES.filter((assurance) =>
                  vmInstanceAssurancesForRuntimeKind(draft.runtimeKind).includes(assurance),
                ).map((assurance) => (
                  <option key={assurance} value={assurance}>
                    {t(`console.vmInstances.assurance.${assurance}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              hint={t('console.vmInstances.hint.workspaceId')}
              htmlFor="vm-instance-workspace"
              label={t('console.vmInstances.field.workspaceId')}
              optional
            >
              <input
                autoComplete="off"
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-workspace"
                onChange={(event) => patch({ workspaceId: event.target.value })}
                placeholder={t('console.vmInstances.placeholder.workspaceId')}
                value={draft.workspaceId}
              />
            </Field>
          </div>

          <div className="mt-4">
            <span className={LABEL_CLASS}>{t('console.vmInstances.field.capabilities')}</span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {VM_INSTANCE_CAPABILITY_ORDER.map((capability) => (
                <label
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:text-slate-200"
                  key={capability}
                >
                  <input
                    checked={draft.requiredCapabilities.includes(capability)}
                    className="h-3.5 w-3.5 accent-lobster-600"
                    disabled={busy}
                    onChange={() =>
                      patch({
                        requiredCapabilities: toggleVmInstanceCapability(
                          draft.requiredCapabilities,
                          capability,
                        ),
                      })
                    }
                    type="checkbox"
                  />
                  {t(`console.vmInstances.capability.${capability}`)}
                </label>
              ))}
            </div>
            <p className={HINT_CLASS}>
              {t('console.vmInstances.hint.capabilities', { max: VM_INSTANCE_LIMITS.capabilitiesMax })}
            </p>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
            {t('console.vmInstances.section.lifecycle')}
          </legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field
              error={messageFor(errors.expiresAtLocal)}
              hint={t('console.vmInstances.hint.expiresAt')}
              htmlFor="vm-instance-expires-at"
              label={t('console.vmInstances.field.expiresAt')}
              optional
            >
              <input
                aria-describedby={errors.expiresAtLocal ? 'vm-instance-expires-at-error' : undefined}
                aria-invalid={errors.expiresAtLocal ? true : undefined}
                className={INPUT_CLASS}
                disabled={busy}
                id="vm-instance-expires-at"
                onChange={(event) => patch({ expiresAtLocal: event.target.value })}
                type="datetime-local"
                value={draft.expiresAtLocal}
              />
            </Field>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  checked={draft.autoStart}
                  className="h-3.5 w-3.5 accent-lobster-600"
                  disabled={busy}
                  onChange={(event) => patch({ autoStart: event.target.checked })}
                  type="checkbox"
                />
                {t('console.vmInstances.field.autoStart')}
              </label>
              <p className={HINT_CLASS}>{t('console.vmInstances.hint.autoStart')}</p>
            </div>
          </div>
        </fieldset>
      </div>

      <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          {t('console.vmInstances.actions.cancel')}
        </button>
        <button
          aria-busy={busy}
          className="rounded-lg bg-lobster-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {isEdit
            ? t('console.vmInstances.actions.save')
            : t('console.vmInstances.actions.create')}
        </button>
      </footer>
    </form>
  );
}
