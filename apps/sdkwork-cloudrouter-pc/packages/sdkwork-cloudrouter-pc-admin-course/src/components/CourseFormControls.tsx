import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export type CourseSelectOption<TValue extends string = string> = {
  value: TValue;
  label?: string;
  disabled?: boolean;
};

interface CourseFormFrameProps {
  error: string | null;
  children: ReactNode;
  /** Form id owned by the bottom-bar submit button (also enables form semantics). */
  formId?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export function CourseFormFrame({ error, children, formId, onSubmit }: CourseFormFrameProps) {
  const content = (
    <>
      {error ? <CourseFormError message={error} /> : null}
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

export function CourseFormError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

const fieldLabelClassName =
  'w-28 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300';

const fieldControlClassName =
  'min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white';

interface CourseTextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  step?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function CourseTextField({
  label,
  value,
  placeholder,
  hint,
  type = 'text',
  step,
  required = false,
  onChange,
}: CourseTextFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-3">
        <span className={fieldLabelClassName}>{label}</span>
        <input
          value={value}
          type={type}
          step={step}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldControlClassName}
        />
      </label>
      {hint ? (
        <p className="ml-31 mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface CourseTextAreaFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  onChange: (value: string) => void;
}

export function CourseTextAreaField({
  label,
  value,
  placeholder,
  rows = 3,
  hint,
  onChange,
}: CourseTextAreaFieldProps) {
  return (
    <div>
      <label className="flex items-start gap-3">
        <span className={`${fieldLabelClassName} pt-2`}>{label}</span>
        <textarea
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldControlClassName}
        />
      </label>
      {hint ? (
        <p className="ml-31 mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface CourseSelectFieldProps<TValue extends string> {
  label: string;
  value: TValue | '';
  options: Array<CourseSelectOption<TValue>>;
  placeholder?: string;
  onChange: (value: TValue | '') => void;
}

export function CourseSelectField<TValue extends string>({
  label,
  value,
  options,
  placeholder,
  onChange,
}: CourseSelectFieldProps<TValue>) {
  return (
    <label className="flex items-center gap-3">
      <span className={fieldLabelClassName}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TValue | '')}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
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

interface CourseCheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CourseCheckboxField({ label, checked, onChange }: CourseCheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3">
      <span className={fieldLabelClassName}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-lobster-600 focus:ring-lobster-500 dark:border-white/20 dark:bg-white/5"
      />
    </label>
  );
}

interface CourseFormActionsProps {
  submitLabel: string;
  isSaving: boolean;
  /** Form id owned by the submit button rendered in the drawer footer. */
  submitFormId: string;
  onCancel: () => void;
}

export function CourseFormActions({
  submitLabel,
  isSaving,
  submitFormId,
  onCancel,
}: CourseFormActionsProps) {
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
