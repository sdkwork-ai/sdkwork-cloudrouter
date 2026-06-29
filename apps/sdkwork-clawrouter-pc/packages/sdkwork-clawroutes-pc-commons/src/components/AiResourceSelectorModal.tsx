import { Search, X } from 'lucide-react';
import { useState } from 'react';

export type AiResourceSelectorSelectionMode = 'single' | 'multiple';

export interface AiResourceSelectorOption {
  id: string;
  resourceCode: string;
  displayName: string;
  resourceType: string;
  vendorCode: string | null;
  modalityCode: string | null;
  apiEndpointCode: string | null;
  catalogKey: string | null;
  model: string | null;
  providerNativeModel: string | null;
  capability?: string | null;
  capabilities?: string[];
  status: string;
}

export interface AiResourceSelectorModalLabels {
  title: string;
  searchPlaceholder: string;
  loading: string;
  empty: string;
  emptySearch: string;
  selectedCount: (count: number) => string;
  done: string;
  close: string;
  columns: {
    resource: string;
    kind: string;
    vendor: string;
    status: string;
  };
}

export interface AiResourceSelectorModalProps {
  loading: boolean;
  onChange: (codes: string[]) => void;
  onClose: () => void;
  options: AiResourceSelectorOption[];
  selectedCodes: string[];
  selectionMode?: AiResourceSelectorSelectionMode;
  labels: AiResourceSelectorModalLabels;
  searchDataAttribute?: string;
}

export function AiResourceSelectorModal({
  labels,
  loading,
  onChange,
  onClose,
  options,
  searchDataAttribute = 'data-admin-ai-resource-selector-search',
  selectedCodes,
  selectionMode = 'single',
}: AiResourceSelectorModalProps) {
  const selected = new Set(selectedCodes);
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const filteredResourceOptions = options.filter(option => matchesAiResourceSelectorSearch(resourceSearchQuery, [
    option.displayName,
    option.resourceCode,
    option.resourceType,
    option.vendorCode,
    option.modalityCode,
    option.apiEndpointCode,
    option.catalogKey,
    option.model,
    option.providerNativeModel,
    option.capability,
    option.capabilities?.join(' '),
    option.status,
  ]));
  const toggleCode = (code: string) => {
    onChange(toggleAiResourceSelectionCode(selectedCodes, code, selectionMode));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div
        className="flex h-[76vh] max-h-[76vh] w-[88vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{labels.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.close} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              {...{ [searchDataAttribute]: 'true' }}
              type="search"
              value={resourceSearchQuery}
              onChange={event => setResourceSearchQuery(event.currentTarget.value)}
              aria-label={labels.searchPlaceholder}
              placeholder={labels.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <AiResourceSelectorState text={labels.loading} />
          ) : options.length === 0 ? (
            <AiResourceSelectorState text={labels.empty} />
          ) : filteredResourceOptions.length === 0 ? (
            <AiResourceSelectorState text={labels.emptySearch} />
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-3"></th>
                  <th className="px-5 py-3">{labels.columns.resource}</th>
                  <th className="px-5 py-3">{labels.columns.kind}</th>
                  <th className="px-5 py-3">{labels.columns.vendor}</th>
                  <th className="px-5 py-3">{labels.columns.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredResourceOptions.map(option => (
                  <tr key={option.resourceCode} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3">
                      <input
                        type={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
                        checked={selected.has(option.resourceCode)}
                        onChange={() => toggleCode(option.resourceCode)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{option.displayName}</div>
                      <div className="font-mono text-xs text-slate-500">{option.resourceCode}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {((option.capabilities?.length ?? 0) > 0 ? option.capabilities ?? [] : [option.capability ?? option.resourceType])
                          .filter(Boolean)
                          .map(capability => (
                            <span key={capability} className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {capability}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">{option.vendorCode ?? '-'}</td>
                    <td className="px-5 py-3">{option.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
            {labels.selectedCount(selectedCodes.length)}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
            {labels.done}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiResourceSelectorState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

function matchesAiResourceSelectorSearch(query: string, values: Array<string | null | undefined>): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return values.some(value => (value ?? '').toLowerCase().includes(normalizedQuery));
}

function toggleAiResourceSelectionCode(
  selectedCodes: string[],
  code: string,
  selectionMode: AiResourceSelectorSelectionMode,
): string[] {
  const normalized = code.trim();
  if (!normalized) {
    return selectedCodes;
  }
  const selected = new Set(selectedCodes);
  if (selectionMode === 'single') {
    return selected.has(normalized) ? [] : [normalized];
  }
  return selected.has(normalized)
    ? selectedCodes.filter(item => item !== normalized)
    : [...selectedCodes, normalized];
}
