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
}

export function MembershipFormFrame({ error, children }: MembershipFormFrameProps) {
  return (
    <div className="flex flex-col gap-4">
      {error ? <MembershipFormError message={error} /> : null}
      {children}
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
  type?: string;
  onChange: (value: string) => void;
}

export function MembershipTextField({
  label,
  value,
  placeholder,
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
  onCancel: () => void;
  onSubmit: () => void;
}

export function MembershipFormActions({
  submitLabel,
  isSaving,
  onCancel,
  onSubmit,
}: MembershipFormActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
      <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/5">
        {t('common.actions.cancel', 'Cancel')}
      </button>
      <button type="button" onClick={onSubmit} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}
