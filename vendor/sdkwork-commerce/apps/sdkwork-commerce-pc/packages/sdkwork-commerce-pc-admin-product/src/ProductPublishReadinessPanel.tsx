import { AlertTriangle, CheckCircle2, Circle, Send } from 'lucide-react';
import type React from 'react';
import type { ProductReadinessReport } from './productAdminTypes';

type ProductPublishReadinessPanelProps = {
  report: ProductReadinessReport;
};

export function ProductPublishReadinessPanel({ report }: ProductPublishReadinessPanelProps) {
  const percentage = report.total > 0 ? Math.round((report.completed / report.total) * 100) : 0;

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171717]"
      data-admin-product-publish-readiness-panel
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-lobster-600 dark:text-lobster-300" />
            <h3 className="text-[17px] font-semibold text-slate-950 dark:text-white">Publish readiness</h3>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
            Backend publish commands are still a contract gap; this panel keeps the admin workflow honest before operators submit.
          </p>
        </div>
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between text-[12px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Commercial completeness</span>
            <span>{percentage}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className={`h-full rounded-full ${report.publishable ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
            {report.completed}/{report.total} checks complete, {report.blockers.length} blockers.
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {report.issues.length === 0 ? (
          <ReadinessRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Ready to publish"
            message="Product basics, categories, detail config, SKU matrix, store visibility, pricing, and inventory readiness are complete."
            tone="complete"
          />
        ) : (
          report.issues.map((issue) => (
            <ReadinessRow
              key={issue.id}
              icon={issue.severity === 'blocker' ? <AlertTriangle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              label={issue.section}
              message={issue.message}
              tone={issue.severity}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ReadinessRow({
  icon,
  label,
  message,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  message: string;
  tone: 'blocker' | 'warning' | 'complete';
}) {
  const toneClassName = tone === 'complete'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200';
  return (
    <div className={`flex min-h-16 items-start gap-3 rounded-lg border px-3 py-2 ${toneClassName}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-wide">{label}</div>
        <div className="mt-1 text-[12px] font-medium leading-5">{message}</div>
      </div>
    </div>
  );
}
