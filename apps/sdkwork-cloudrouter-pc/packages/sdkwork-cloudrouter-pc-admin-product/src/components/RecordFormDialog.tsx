import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Dialog,
  EntityForm,
  Notice,
  type FormFieldSpec,
  type FormValue,
  type FormValues,
} from './ui.tsx';
import { describeProductCenterError } from '../productCenterService.ts';

export interface RecordFormDialogProps {
  open: boolean;
  title: string;
  fields: readonly FormFieldSpec[];
  /** Seed values; re-applied every time the dialog opens. */
  initialValues: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  onClose: () => void;
  wide?: boolean;
}

/**
 * Reusable create/edit dialog for a Product Center record.
 *
 * The dialog owns only form state and error rendering; the page supplies the
 * fields and the submit operation, which keeps every write on the owning
 * module's SDK contract (including the `If-Match` version the page read).
 */
export function RecordFormDialog({
  open,
  title,
  fields,
  initialValues,
  onSubmit,
  onClose,
  wide = true,
}: RecordFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seeded = useMemo(() => ({ ...initialValues }), [initialValues]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues({ ...seeded });
    setError(null);
    setSubmitting(false);
  }, [open, seeded]);

  const submit = () => {
    setSubmitting(true);
    setError(null);
    onSubmit(values).then(
      () => {
        setSubmitting(false);
        onClose();
      },
      (submitError: unknown) => {
        setSubmitting(false);
        setError(describeProductCenterError(submitError).message);
      },
    );
  };

  return (
    <Dialog
      footer={
        <>
          <Button disabled={submitting} onClick={onClose} variant="secondary">
            {t('admin.productCenter.actions.cancel', 'Cancel')}
          </Button>
          <Button disabled={submitting} onClick={submit} variant="primary">
            {submitting
              ? t('admin.productCenter.actions.saving', 'Saving…')
              : t('admin.productCenter.actions.save', 'Save')}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={title}
      wide={wide}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="mt-2">
        <EntityForm
          fields={fields}
          onChange={(name: string, value: FormValue) =>
            setValues((current) => ({ ...current, [name]: value }))}
          values={values}
        />
      </div>
    </Dialog>
  );
}
