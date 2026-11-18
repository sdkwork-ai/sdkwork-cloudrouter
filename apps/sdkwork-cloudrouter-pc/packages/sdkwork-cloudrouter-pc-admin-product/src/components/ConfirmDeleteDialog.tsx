import { useTranslation } from 'react-i18next';

import { Button, Dialog, Notice } from './ui.tsx';

export interface ConfirmDeleteDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Dialog heading, for example `Delete SKU`. */
  title: string;
  /** Explanation of what will be removed; the dialog never deletes without it. */
  message: string;
  /** Server error rendered above the footer after a rejected delete. */
  error: string | null;
  /** Disables the footer while the request is in flight. */
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for destructive record deletes.
 *
 * Every catalog delete is guarded by an `If-Match` version, so the dialog stays
 * open after a rejected delete and shows the server's reason (for example a
 * product that still has orders) instead of closing silently.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  message,
  error,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            {t('admin.productCenter.actions.cancel', 'Cancel')}
          </Button>
          <Button disabled={submitting} onClick={onConfirm} variant="danger">
            {submitting
              ? t('admin.productCenter.state.saving', 'Saving…')
              : t('admin.productCenter.actions.delete', 'Delete')}
          </Button>
        </>
      }
      onClose={onCancel}
      open={open}
      title={title}
    >
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p>{message}</p>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </Dialog>
  );
}
