import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Megaphone, Clock, CheckCircle2, MoreVertical, X, Edit, Trash2, Send, Loader2, AlertCircle, BellRing, BellOff } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { AdminTableShell, BusinessStateTableRow, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { AnnouncementService, type Announcement } from './announcementService';
import {
  createAnnouncementInputFromForm,
  createAnnouncementStatusInput,
  createAnnouncementUpdateInputFromForm,
} from './announcementForm';

const DEFAULT_TARGET = 'all';
const DEFAULT_CONTENT_KEY = 'admin.announcement.content.default';

const targetOptions = [
  { value: 'all', labelKey: 'admin.announcement.targets.all' },
  { value: 'vip', labelKey: 'admin.announcement.targets.vip' },
  { value: 'free', labelKey: 'admin.announcement.targets.free' },
  { value: 'beta', labelKey: 'admin.announcement.targets.beta' },
];

export function AnnouncementAdmin() {
  const { t } = useTranslation();
  const defaultContent = t(DEFAULT_CONTENT_KEY);
  const [search, setSearch] = useState('');
  const [editorTheme, setEditorTheme] = useState('light');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [showAsPopup, setShowAsPopup] = useState(false);
  const [content, setContent] = useState(defaultContent);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const loadAnnouncements = () => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    AnnouncementService.fetchAnnouncements()
      .then(data => {
        if (!active) return;
        setAnnouncements(data);
      })
      .catch(err => {
        if (!active) return;
        setLoadError(errorMessage(err, t('admin.announcement.errors.loadFallback')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return loadAnnouncements();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncEditorTheme = () => {
      setEditorTheme(root.classList.contains('dark') ? 'vs-dark' : 'light');
    };
    syncEditorTheme();
    const observer = new MutationObserver(syncEditorTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const filteredAnnouncements = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return announcements;
    return announcements.filter(item => item.title.toLowerCase().includes(keyword));
  }, [announcements, search]);

  const previewTitle = title.trim() || t('admin.announcement.preview.emptyTitle');
  const previewContent = content.trim() || t('admin.announcement.preview.emptyContent');
  const modalDescription = editingId
    ? t('admin.announcement.modals.editDescription')
    : t('admin.announcement.modals.createDescription');

  const openModal = (ann?: Announcement) => {
    setError(null);
    if (ann) {
      setEditingId(ann.id);
      setTitle(ann.title);
      setTarget(normalizeTarget(ann.target));
      setStatus(ann.status);
      setShowAsPopup(ann.showAsPopup);
      setContent(ann.content);
    } else {
      setEditingId(null);
      setTitle('');
      setTarget(DEFAULT_TARGET);
      setStatus('published');
      setShowAsPopup(false);
      setContent(defaultContent);
    }
    setIsModalOpen(true);
    setDropdownOpen(null);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await AnnouncementService.updateAnnouncement(editingId, createAnnouncementUpdateInputFromForm({
          title,
          target,
          status,
          showAsPopup,
          content,
        }));
        if (updated) {
          setAnnouncements(items => items.map(item => item.id === editingId ? updated : item));
        }
      } else {
        const newAnnouncement = await AnnouncementService.addAnnouncement(createAnnouncementInputFromForm({
          title,
          target,
          status,
          showAsPopup,
          content,
        }));
        setAnnouncements(items => [newAnnouncement, ...items]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(errorMessage(err, t('admin.announcement.errors.saveFallback')));
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirmation = () => {
    if (pendingActionId) {
      return;
    }
    setDeleteTarget(null);
  };

  const executeDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const id = deleteTarget.id;
    setPendingActionId(id);
    setError(null);
    try {
      const success = await AnnouncementService.deleteAnnouncement(id);
      if (success) {
        setAnnouncements(items => items.filter(item => item.id !== id));
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(errorMessage(err, t('admin.announcement.errors.deleteFallback')));
    } finally {
      setPendingActionId(null);
      setDropdownOpen(null);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: Announcement['status']) => {
    setPendingActionId(id);
    setError(null);
    try {
      const updated = await AnnouncementService.updateAnnouncement(id, createAnnouncementStatusInput(nextStatus));
      if (updated) {
        setAnnouncements(items => items.map(item => item.id === id ? updated : item));
      }
    } catch (err) {
      setError(errorMessage(err, t('admin.announcement.errors.statusUpdateFallback')));
    } finally {
      setPendingActionId(null);
      setDropdownOpen(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-announcement-toolbar>
          <div className="relative w-full sm:w-72" data-admin-announcement-search>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin.announcement.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 w-full text-slate-900 dark:text-white placeholder-slate-500 transition-colors shadow-sm"
            />
          </div>
          <button data-admin-announcement-primary-action onClick={() => openModal()} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex w-full items-center justify-center gap-2 flex-shrink-0 sm:w-auto">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.actions.newAnnouncement')}</span>
          </button>
      </div>

      {error && (
        <div className="flex shrink-0 items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AdminTableShell
        data-admin-announcement-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        viewportClassName="min-h-0 flex-1"
        viewportProps={{ 'data-admin-announcement-table-viewport': true }}
      >
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{t('admin.announcement.table.title')}</th>
                <th className="px-6 py-4">{t('admin.announcement.table.audience')}</th>
                <th className="px-6 py-4">{t('admin.announcement.table.status')}</th>
                <th className="px-6 py-4">{t('admin.announcement.table.popupDisplay')}</th>
                <th className="px-6 py-4">{t('admin.announcement.table.publishedAt')}</th>
                <th className="px-6 py-4 text-right">{t('admin.announcement.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 pb-24">
              {loading ? (
                <BusinessStateTableRow colSpan={6} kind="loading" title={t('admin.announcement.state.loading')} />
              ) : loadError ? (
                <BusinessStateTableRow
                  colSpan={6}
                  kind="error"
                  title={t('admin.announcement.state.loadErrorTitle')}
                  description={loadError}
                  onRetry={() => { loadAnnouncements(); }}
                  retryLabel={t('common.actions.retry')}
                />
              ) : filteredAnnouncements.length === 0 ? (
                <BusinessStateTableRow
                  colSpan={6}
                  kind="empty"
                  title={t('admin.announcement.state.emptyTitle')}
                  description={t('admin.announcement.state.emptyDescription')}
                  action={{
                    label: t('common.actions.newAnnouncement'),
                    onClick: () => openModal(),
                  }}
                />
              ) : filteredAnnouncements.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group relative">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white max-w-sm truncate">{item.title}</td>
                  <td className="px-6 py-4"><span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">{t(targetLabelKey(item.target))}</span></td>
                  <td className="px-6 py-4">
                    {item.status === 'published' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> {t('admin.announcement.status.published')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" /> {t('admin.announcement.status.draft')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.showAsPopup ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        <BellRing className="h-3.5 w-3.5" /> {t('admin.announcement.popup.enabled')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        <BellOff className="h-3.5 w-3.5" /> {t('admin.announcement.popup.disabled')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.date || '-'}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-white/5 rounded transition-colors duration-200"
                      disabled={pendingActionId === item.id}
                    >
                      {pendingActionId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                    </button>

                    {dropdownOpen === item.id && (
                      <div className="absolute right-8 top-10 w-44 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-slate-200 dark:border-white/10 z-10 overflow-hidden text-left flex flex-col py-1">
                        {item.status === 'draft' && (
                          <button onClick={() => handleStatusChange(item.id, 'published')} className="w-full px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                            <Send className="w-4 h-4" /> {t('common.actions.publish')}
                          </button>
                        )}
                        {item.status === 'published' && (
                          <button onClick={() => handleStatusChange(item.id, 'draft')} className="w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> {t('admin.announcement.actions.moveToDraft')}
                          </button>
                        )}
                        <button onClick={() => openModal(item)} className="w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                          <Edit className="w-4 h-4" /> {t('common.actions.edit')}
                        </button>
                        <button onClick={() => { setDeleteTarget(item); setDropdownOpen(null); }} className="w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 border-t border-slate-100 dark:border-white/5">
                          <Trash2 className="w-4 h-4" /> {t('common.actions.delete')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </AdminTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm shadow-xl">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col">
            <div className="flex justify-between items-start gap-4 p-5 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" /> {editingId ? t('admin.announcement.modals.editTitle') : t('admin.announcement.modals.createTitle')}
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{modalDescription}</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" disabled={saving}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="flex flex-col flex-1 overflow-hidden">
              <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div className="flex min-w-0 flex-col space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.announcement.fields.title')}</label>
                    <input
                      required
                      maxLength={200}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      type="text"
                      placeholder={t('admin.announcement.placeholders.title')}
                      className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all shadow-sm"
                    />
                    <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('admin.announcement.help.title')}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.announcement.fields.audience')}</label>
                      <select
                        required
                        value={target}
                        onChange={e => setTarget(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all shadow-sm"
                      >
                        {targetOptions.map(option => (
                          <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('admin.announcement.help.audience')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.announcement.fields.publication')}</label>
                      <select
                        required
                        value={status}
                        onChange={e => setStatus(e.target.value as 'published' | 'draft')}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all shadow-sm"
                      >
                        <option value="published">{t('admin.announcement.publication.publishNow')}</option>
                        <option value="draft">{t('admin.announcement.publication.saveDraft')}</option>
                      </select>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('admin.announcement.help.publication')}</p>
                    </div>
                  </div>
                  <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition-colors dark:border-white/10 dark:bg-black">
                    <span className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${showAsPopup ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                        {showAsPopup ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-800 dark:text-slate-200">{t('admin.announcement.fields.popupDisplay')}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{t('admin.announcement.help.popupDisplay')}</span>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showAsPopup}
                      onChange={e => setShowAsPopup(e.target.checked)}
                      className="mt-2 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-500 dark:border-white/20 dark:bg-[#1a1a1a]"
                    />
                  </label>
                  <div className="flex min-h-[360px] flex-1 flex-col">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>{t('admin.announcement.fields.content')}</span>
                      <span className="text-xs text-slate-400 font-mono tracking-wider">{t('admin.announcement.fields.markdown')}</span>
                    </label>
                    <div className="flex-1 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-[#1e1e1e] p-1">
                      <Editor
                        height="100%"
                        defaultLanguage="markdown"
                        theme={editorTheme}
                        value={content}
                        onChange={(val) => setContent(val || '')}
                        options={{
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          fontSize: 14,
                          padding: { top: 16, bottom: 16 },
                          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace",
                          renderLineHighlight: 'all',
                          smoothScrolling: true,
                          cursorBlinking: 'smooth',
                          cursorSmoothCaretAnimation: 'on',
                          formatOnPaste: true,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <aside className="min-w-0">
                  <div className="sticky top-0 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-white/10 dark:bg-black">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.announcement.preview.title')}</h4>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${showAsPopup ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                        {showAsPopup ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                        {showAsPopup ? t('admin.announcement.popup.enabled') : t('admin.announcement.popup.disabled')}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                          {status === 'published' ? t('admin.announcement.status.published') : t('admin.announcement.status.draft')}
                        </span>
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {t(targetLabelKey(target))}
                        </span>
                      </div>
                      <h5 className="mt-4 text-base font-bold leading-6 text-slate-900 dark:text-white">{previewTitle}</h5>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('admin.announcement.preview.defaultSource')}</p>
                      <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-white/[0.03] dark:text-slate-300">
                        {previewContent}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#121212] shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a]" disabled={saving}>
                  {t('common.actions.cancel')}
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors border border-transparent flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {t('common.actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.announcement.confirm.deleteTitle')}
          description={t('admin.announcement.confirm.deleteDescription', { title: deleteTarget.title })}
          confirmLabel={t('admin.announcement.confirm.deleteConfirm')}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={pendingActionId === deleteTarget.id}
          onConfirm={() => void executeDelete()}
          onCancel={closeDeleteConfirmation}
        />
      )}
    </div>
  );
}

function targetLabelKey(value: string): string {
  const option = targetOptions.find(item => item.value === normalizeTarget(value)) ?? targetOptions[0];
  return option.labelKey;
}

function normalizeTarget(value: string): string {
  return targetOptions.some(option => option.value === value) ? value : DEFAULT_TARGET;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
