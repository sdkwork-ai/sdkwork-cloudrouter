import type { ReactNode } from 'react';

type MembershipIconActionTone = 'default' | 'danger';

interface MembershipTablePanelProps {
  children: ReactNode;
  className?: string;
}

export function MembershipTablePanel({ children, className }: MembershipTablePanelProps) {
  return (
    <div className={['min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function MembershipTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      {children}
    </div>
  );
}

interface MembershipIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: MembershipIconActionTone;
  disabled?: boolean;
  onClick: () => void;
}

const iconActionToneClassNames: Record<MembershipIconActionTone, string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function MembershipIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  onClick,
}: MembershipIconActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${iconActionToneClassNames[tone]}`}
    >
      {icon}
    </button>
  );
}

export function confirmMembershipAction(message: string): boolean {
  return window.confirm(message);
}
