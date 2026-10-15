interface CourseEmptyStateProps {
  title: string;
}

export function CourseEmptyState({ title }: CourseEmptyStateProps) {
  return (
    <p className="px-4 py-12 text-center text-sm text-slate-400">
      {title}
    </p>
  );
}
