import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export type AdminResourceHelpContent = {
  title: string;
  description?: string;
  steps: string[];
  notes?: string[];
};

export interface AdminResourceHelpButtonProps {
  closeLabel?: string;
  content: AdminResourceHelpContent;
  label: string;
  notesLabel?: string;
}

/** Header link-style button that opens the section usage help dialog. */
export function AdminResourceHelpButton({ closeLabel = 'Close', content, label, notesLabel = 'Notes' }: AdminResourceHelpButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <HelpCircle className="h-4 w-4" />
        {label}
      </button>
      {open ? (
        <AdminResourceHelpDialog
          closeLabel={closeLabel}
          content={content}
          notesLabel={notesLabel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export interface AdminResourceHelpDialogProps {
  closeLabel?: string;
  content: AdminResourceHelpContent;
  notesLabel?: string;
  onClose(): void;
}

export function AdminResourceHelpDialog({ closeLabel = 'Close', content, notesLabel = 'Notes', onClose }: AdminResourceHelpDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="admin-resource-help-title"
        aria-modal="true"
        className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="admin-resource-help-title">
            {content.title}
          </h2>
          <button
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {content.description ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{content.description}</p>
          ) : null}
          {content.steps.length > 0 ? (
            <ol className="mt-4 space-y-2.5">
              {content.steps.map((step, index) => (
                <li className="flex gap-3 text-sm text-slate-700 dark:text-slate-200" key={index}>
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lobster-500 text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {content.notes && content.notes.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">{notesLabel}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-amber-800 dark:text-amber-200">
                {content.notes.map((note, index) => <li key={index}>{note}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
