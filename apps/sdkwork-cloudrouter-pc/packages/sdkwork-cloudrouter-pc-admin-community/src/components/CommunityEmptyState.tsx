interface CommunityEmptyStateProps {
  title: string;
}

export function CommunityEmptyState({ title }: CommunityEmptyStateProps) {
  return (
    <p className="px-4 py-12 text-center text-sm text-slate-400">
      {title}
    </p>
  );
}
