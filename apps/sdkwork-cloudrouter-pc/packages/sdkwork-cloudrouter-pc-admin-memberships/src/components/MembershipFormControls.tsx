import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export type MembershipSelectOption<TValue extends string = string> = {
  value: TValue;
  label?: string;
  disabled?: boolean;
};

interface MembershipFormFrameProps {
  error: string | null;
  children: ReactNode;
  /** 关联底部栏提交按钮的 form id（同时启用 <form> 语义与 onSubmit） */
  formId?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export function MembershipFormFrame({
  error,
  children,
  formId,
  onSubmit,
}: MembershipFormFrameProps) {
  const content = (
    <>
      {error ? <MembershipFormError message={error} /> : null}
      {children}
    </>
  );
  if (formId) {
    return (
      <form id={formId} onSubmit={onSubmit} className="flex h-full flex-col gap-4">
        {content}
      </form>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {content}
    </div>
  );
}

export function MembershipFormError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

interface MembershipTextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  onChange: (value: string) => void;
}

export function MembershipTextField({
  label,
  value,
  placeholder,
  hint,
  type = 'text',
  onChange,
}: MembershipTextFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white"
      />
      {hint ? (
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

interface MembershipSelectFieldProps<TValue extends string> {
  label: string;
  value: TValue | '';
  options: Array<MembershipSelectOption<TValue>>;
  placeholder?: string;
  onChange: (value: TValue | '') => void;
}

export function MembershipSelectField<TValue extends string>({
  label,
  value,
  options,
  placeholder,
  onChange,
}: MembershipSelectFieldProps<TValue>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TValue | '')}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    </label>
  );
}

interface MembershipFormActionsProps {
  submitLabel: string;
  isSaving: boolean;
  /** 提交按钮关联的表单 id（按钮位于 drawer/dialog 底部栏，表单在内容区） */
  submitFormId: string;
  onCancel: () => void;
}

export function MembershipFormActions({
  submitLabel,
  isSaving,
  submitFormId,
  onCancel,
}: MembershipFormActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        {t('common.actions.cancel', 'Cancel')}
      </button>
      <button
        type="submit"
        form={submitFormId}
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSaving ? t('common.actions.saving', 'Saving...') : submitLabel}
      </button>
    </div>
  );
}
