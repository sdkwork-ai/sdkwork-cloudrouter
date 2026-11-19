import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CommunityPage, CommunityPageHeader } from '../components/CommunityShell.tsx';
import { CommunityService, ensureCommunityPcRuntime, uploadCommunityImages } from '../runtime.ts';

function splitList(value: string): string[] {
  return value.split(/[,，]/u).map((item) => item.trim()).filter(Boolean);
}

/** Creates a circle with the same fields the mobile create page collects. */
export function CommunityCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [avatar, setAvatar] = useState('');
  const [tags, setTags] = useState('');
  const [tabs, setTabs] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('0');
  const [memberLimit, setMemberLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || submitting) {
      return;
    }
    ensureCommunityPcRuntime();
    setSubmitting(true);
    setError('');
    try {
      const created = await CommunityService.createCommunity({
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage.trim(),
        avatar: avatar.trim() || undefined,
        tags: splitList(tags),
        tabs: splitList(tabs),
        isPaid,
        price: isPaid ? Number(price) || 0 : undefined,
        memberLimit: memberLimit.trim() ? Number(memberLimit) : undefined,
        revenueTarget: undefined,
      });
      navigate(`/community/${created.id}`, { replace: true });
    } catch {
      setError(t('communityUi.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-lobster-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <CommunityPage>
      <CommunityPageHeader backTo="/community" backLabel={t('communityUi.back')} title={t('communityUi.createTitle')} />
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.name')}</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('communityUi.namePlaceholder')}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.description')}</span>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('communityUi.descriptionPlaceholder')}
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.cover')}</span>
            <input value={coverImage} onChange={(event) => setCoverImage(event.target.value)} className={inputClass} />
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadCommunityImages([file]).then(([uri]) => {
                  if (uri) setCoverImage(uri);
                });
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.avatar')}</span>
            <input value={avatar} onChange={(event) => setAvatar(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.tags')}</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t('communityUi.tagsHint')} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.tabs')}</span>
            <input value={tabs} onChange={(event) => setTabs(event.target.value)} placeholder={t('communityUi.tabsHint')} className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} className="h-4 w-4 rounded" />
            {t('communityUi.paid')}
          </label>
          {isPaid ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.price')}</span>
              <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.memberLimit')}</span>
            <input type="number" min="1" value={memberLimit} onChange={(event) => setMemberLimit(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/community')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {t('communityUi.back')}
          </button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-lobster-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60">
            {submitting ? t('communityUi.publishing') : t('communityUi.createSubmit')}
          </button>
        </div>
      </form>
    </CommunityPage>
  );
}
