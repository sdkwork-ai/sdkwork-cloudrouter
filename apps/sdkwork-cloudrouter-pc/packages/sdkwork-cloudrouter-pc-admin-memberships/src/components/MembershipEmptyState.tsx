interface MembershipEmptyStateProps {
  title: string;
}

export function MembershipEmptyState({ title }: MembershipEmptyStateProps) {
  return (
    <p className="px-4 py-12 text-center text-sm text-slate-400">
      {title}
    </p>
  );
}
