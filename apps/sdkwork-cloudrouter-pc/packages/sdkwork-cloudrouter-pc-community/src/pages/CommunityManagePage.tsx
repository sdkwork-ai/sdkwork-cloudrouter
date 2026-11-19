import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';

import {
  CircleAvatar,
  CommunityErrorState,
  CommunityPage,
  CommunityPageHeader,
  CommunitySpinner,
  CommunityTabs,
} from '../components/CommunityShell.tsx';
import { CommunityMediaImage } from '../components/CommunityMediaImage.tsx';
import {
  CommunityService,
  ensureCommunityPcRuntime,
  uploadCommunityImages,
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type MembershipTier,
} from '../runtime.ts';

type Section = 'profile' | 'members' | 'groups' | 'tiers' | 'qr';

const PLATFORMS: CommunityGroup['platform'][] = ['wechat', 'qq', 'feishu', 'dingtalk', 'telegram', 'discord', 'whatsapp', 'other'];

/** Owner workspace for circle profile, members, groups, tiers, and invite link. */
export function CommunityManagePage() {
  const { t } = useTranslation();
  const { circleId = '' } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('profile');
  const [circle, setCircle] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const load = useCallback(async () => {
    if (!circleId) return;
    ensureCommunityPcRuntime();
    setLoading(true);
    setError(false);
    try {
      const loaded = await CommunityService.getCommunityById(circleId);
      if (!loaded) {
        setCircle(null);
        return;
      }
      setCircle(loaded);
      const [loadedMembers, loadedGroups, loadedTiers] = await Promise.all([
        CommunityService.getMembersByCommunity(circleId).catch(() => []),
        CommunityService.getGroupsByCommunity(circleId).catch(() => []),
        CommunityService.listAllMembershipTiers(circleId).catch(() => []),
      ]);
      setMembers(loadedMembers);
      setGroups(loadedGroups);
      setTiers(loadedTiers);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!circle) {
      setQrDataUrl('');
      return undefined;
    }
    let cancelled = false;
    void QRCode.toDataURL(inviteLink(circle.id), { margin: 2, width: 320 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [circle]);

  if (loading) return <CommunityPage><CommunitySpinner label={t('communityUi.loading')} /></CommunityPage>;
  if (error) return <CommunityPage><CommunityErrorState onRetry={() => void load()} /></CommunityPage>;
  if (!circle) {
    return (
      <CommunityPage>
        <CommunityEmptyStateInline title={t('communityUi.notFound')} />
      </CommunityPage>
    );
  }

  return (
    <CommunityPage>
      <CommunityPageHeader backTo={`/community/${circle.id}`} backLabel={t('communityUi.back')} title={`${circle.name} · ${t('communityUi.manageTitle')}`} />
      {notice ? <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p> : null}
      <CommunityTabs
        active={section}
        onChange={setSection}
        items={[
          { id: 'profile', label: t('communityUi.manageProfile') },
          { id: 'members', label: t('communityUi.manageMembers') },
          { id: 'groups', label: t('communityUi.manageGroups') },
          { id: 'tiers', label: t('communityUi.manageTiers') },
          { id: 'qr', label: t('communityUi.manageQr') },
        ]}
      />

      {section === 'profile' ? (
        <>
          <ProfilePanel
            circle={circle}
            onSaved={(next) => {
              setCircle(next);
              setNotice(t('communityUi.saved'));
            }}
          />
          <div className="mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/50 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">{t('communityUi.dangerZone', 'Danger zone')}</h2>
            <p className="mt-1 text-sm text-red-600/80 dark:text-red-300/80">{t('communityUi.deleteCircleHint', 'Deleting a circle removes it for every member. This cannot be undone.')}</p>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(t('communityUi.deleteConfirm', { name: circle.name }))) return;
                void CommunityService.deleteCommunity(circle.id).then(() => navigate('/community'));
              }}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              {t('communityUi.deleteCircle', 'Delete circle')}
            </button>
          </div>
        </>
      ) : null}

      {section === 'members' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-3">
                  <CircleAvatar name={member.name} src={member.avatar} className="h-9 w-9" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">{member.name}</span>
                    <span className="block text-xs text-slate-400">{member.tierName ?? ''}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    aria-label={t('communityUi.role')}
                    value={member.role}
                    onChange={(event) => {
                      void CommunityService.updateMemberRole(circle.id, member.id, event.target.value as CommunityMember['role']).then(load);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="owner">{t('communityUi.owner')}</option>
                    <option value="admin">{t('communityUi.admin')}</option>
                    <option value="member">{t('communityUi.member')}</option>
                  </select>
                  <select
                    aria-label={t('communityUi.status')}
                    value={member.status}
                    onChange={(event) => {
                      void CommunityService.updateMemberStatus(circle.id, member.id, event.target.value as CommunityMember['status']).then(load);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="active">{t('communityUi.active')}</option>
                    <option value="muted">{t('communityUi.muted')}</option>
                    <option value="banned">{t('communityUi.banned')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(t('communityUi.deleteConfirm', { name: member.name }))) return;
                      void CommunityService.removeMember(circle.id, member.id).then(load);
                    }}
                    className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {t('communityUi.remove')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {section === 'groups' ? (
        <GroupsPanel circleId={circle.id} groups={groups} onChanged={load} />
      ) : null}

      {section === 'tiers' ? (
        <TiersPanel circleId={circle.id} tiers={tiers} onChanged={load} />
      ) : null}

      {section === 'qr' ? (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('communityUi.manageQr')}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('communityUi.qrHint')}</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={t('communityUi.manageQr')} className="mx-auto mt-5 h-48 w-48 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700" />
          ) : null}
          <div className="mt-4 flex items-center gap-2">
            <input readOnly value={inviteLink(circle.id)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(inviteLink(circle.id)).then(() => setNotice(t('communityUi.copied')));
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-lobster-500 px-3 py-2 text-sm font-semibold text-white hover:bg-lobster-600"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t('communityUi.copy')}
            </button>
          </div>
        </div>
      ) : null}
    </CommunityPage>
  );
}

function ProfilePanel({ circle, onSaved }: { readonly circle: Community; readonly onSaved: (next: Community) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(circle.name);
  const [description, setDescription] = useState(circle.description);
  // Edit the stored reference, never the resolved display URL: saving a
  // short-lived download grant would corrupt the circle media.
  const [coverImage, setCoverImage] = useState(circle.rawCoverImage ?? circle.coverImage);
  const [avatar, setAvatar] = useState(circle.rawAvatar ?? circle.avatar ?? '');
  const [tags, setTags] = useState(circle.tags.join(', '));
  const [tabs, setTabs] = useState((circle.tabs ?? []).join(', '));
  const [isPaid, setIsPaid] = useState(circle.isPaid ?? false);
  const [price, setPrice] = useState(String(circle.price ?? 0));
  const [memberLimit, setMemberLimit] = useState(circle.memberLimit ? String(circle.memberLimit) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await CommunityService.updateCommunity(circle.id, {
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage.trim(),
        avatar: avatar.trim() || undefined,
        tags: splitList(tags),
        tabs: splitList(tabs),
        isPaid,
        price: isPaid ? Number(price) || 0 : undefined,
        memberLimit: memberLimit.trim() ? Number(memberLimit) : undefined,
      });
      const next = await CommunityService.getCommunityById(circle.id);
      if (next) onSaved(next);
    } catch {
      setError(t('communityUi.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
      <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.name')}</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.description')}</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.cover')}</span><input value={coverImage} onChange={(event) => setCoverImage(event.target.value)} className={inputClass} /></label>
          <input type="file" accept="image/*" aria-label={t('communityUi.addImages')} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCommunityImages([file]).then(([uri]) => { if (uri) setCoverImage(uri); }); }} />
        </div>
        <div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.avatar')}</span><input value={avatar} onChange={(event) => setAvatar(event.target.value)} className={inputClass} /></label>
          <input type="file" accept="image/*" aria-label={t('communityUi.addImages')} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCommunityImages([file]).then(([uri]) => { if (uri) setAvatar(uri); }); }} />
        </div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.tags')}</span><input value={tags} onChange={(event) => setTags(event.target.value)} className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.tabs')}</span><input value={tabs} onChange={(event) => setTabs(event.target.value)} className={inputClass} /></label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} className="h-4 w-4" />{t('communityUi.paid')}</label>
        {isPaid ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.price')}</span><input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></label> : null}
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.memberLimit')}</span><input type="number" min="1" value={memberLimit} onChange={(event) => setMemberLimit(event.target.value)} className={inputClass} /></label>
      </div>
      <button type="submit" disabled={busy} className="rounded-xl bg-lobster-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('communityUi.save')}
      </button>
    </form>
  );
}

function GroupsPanel({ circleId, groups, onChanged }: { readonly circleId: string; readonly groups: readonly CommunityGroup[]; readonly onChanged: () => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<CommunityGroup['platform']>('wechat');
  const [description, setDescription] = useState('');
  const [memberCount, setMemberCount] = useState('0');
  const [qrCodes, setQrCodes] = useState<{ url: string; description: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const uploadQrs = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await uploadCommunityImages(Array.from(files));
    setQrCodes((current) => [...current, ...urls.map((url) => ({ url, description: '' }))]);
  };

  const addQrToGroup = async (group: CommunityGroup, file: File | undefined) => {
    if (!file) return;
    const [url] = await uploadCommunityImages([file]);
    if (!url) return;
    await CommunityService.updateGroup(circleId, group.id, {
      qrCodes: [...(group.qrCodes ?? []), { url, description: '' }],
    });
    await onChanged();
  };

  const removeQrFromGroup = async (group: CommunityGroup, url: string) => {
    await CommunityService.updateGroup(circleId, group.id, {
      qrCodes: (group.qrCodes ?? []).filter((item) => item.url !== url),
    });
    await onChanged();
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await CommunityService.createGroup(circleId, {
        name: name.trim(),
        platform,
        description: description.trim() || undefined,
        memberCount: Number(memberCount) || 0,
        qrCodes,
      });
      setName('');
      setDescription('');
      setMemberCount('0');
      setQrCodes([]);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <input required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('communityUi.groupName')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <select value={platform} onChange={(event) => setPlatform(event.target.value as CommunityGroup['platform'])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
          {PLATFORMS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('communityUi.groupDescription')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input type="number" min="0" value={memberCount} onChange={(event) => setMemberCount(event.target.value)} placeholder={t('communityUi.groupMembers')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('communityUi.groupQrCodes', 'Join QR codes')}</label>
          <input type="file" accept="image/*" multiple onChange={(event) => void uploadQrs(event.target.files)} className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200" />
          {qrCodes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {qrCodes.map((qr) => (
                <span key={qr.url} className="relative inline-flex">
                  <CommunityMediaImage uri={qr.url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  <button type="button" onClick={() => setQrCodes((current) => current.filter((item) => item.url !== qr.url))} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white" aria-label={t('communityUi.delete')}>
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60 sm:col-span-2">
          <Plus className="h-4 w-4" aria-hidden="true" />{t('communityUi.addGroup')}
        </button>
      </form>
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <span><span className="block font-medium text-slate-900 dark:text-white">{group.name}</span><span className="text-xs text-slate-400">{group.platform} · {group.memberCount} {t('communityUi.members')}</span></span>
              <button type="button" onClick={() => { if (window.confirm(t('communityUi.deleteConfirm', { name: group.name }))) void CommunityService.deleteGroup(circleId, group.id).then(onChanged); }} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40" aria-label={t('communityUi.delete')}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(group.qrCodes ?? []).map((qr) => (
                <span key={qr.url} className="relative inline-flex">
                  <CommunityMediaImage uri={qr.url} alt={qr.description} className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  <button type="button" onClick={() => void removeQrFromGroup(group, qr.url)} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white" aria-label={t('communityUi.delete')}>
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('communityUi.addQrCode', 'Add QR code')}
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => { void addQrToGroup(group, event.target.files?.[0]); event.target.value = ''; }} />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TiersPanel({ circleId, tiers, onChanged }: { readonly circleId: string; readonly tiers: readonly MembershipTier[]; readonly onChanged: () => Promise<void> }) {
  const { t } = useTranslation();
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('99');
  const [lifetimePrice, setLifetimePrice] = useState('');
  const [durationDays, setDurationDays] = useState('365');
  const [benefits, setBenefits] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditingTierId(null);
    setName('');
    setPrice('99');
    setLifetimePrice('');
    setDurationDays('365');
    setBenefits('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        description: undefined,
        price: Number(price) || 0,
        durationDays: Number(durationDays) || 365,
        lifetimePrice: lifetimePrice.trim() ? Number(lifetimePrice) : undefined,
        benefits: benefits.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean),
        sortOrder: tiers.length,
      };
      if (editingTierId) {
        await CommunityService.updateMembershipTier(circleId, editingTierId, payload);
      } else {
        await CommunityService.createMembershipTier(circleId, payload);
      }
      reset();
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (tier: MembershipTier) => {
    setEditingTierId(tier.id);
    setName(tier.name);
    setPrice(String(tier.price));
    setLifetimePrice(tier.lifetimePrice ? String(tier.lifetimePrice) : '');
    setDurationDays(String(tier.durationDays));
    setBenefits(tier.benefits.join('\n'));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <input required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('communityUi.tierName')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder={t('communityUi.tierPrice')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input type="number" min="0" value={lifetimePrice} onChange={(event) => setLifetimePrice(event.target.value)} placeholder={t('communityUi.tierLifetimePrice', 'Lifetime price (optional)')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input type="number" min="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} placeholder={t('communityUi.tierDuration')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <textarea rows={2} value={benefits} onChange={(event) => setBenefits(event.target.value)} placeholder={t('communityUi.tierBenefitsHint')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60">
            <Plus className="h-4 w-4" aria-hidden="true" />{editingTierId ? t('communityUi.save') : t('communityUi.addTier')}
          </button>
          {editingTierId ? (
            <button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {t('communityUi.back')}
            </button>
          ) : null}
        </div>
      </form>
      <ul className="space-y-2">
        {tiers.map((tier) => (
          <li key={tier.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="block font-medium text-slate-900 dark:text-white">{tier.name} · ¥{tier.price}{tier.lifetimePrice ? ` / ¥${tier.lifetimePrice}` : ''}</span>
              <span className="text-xs text-slate-400">{tier.durationDays} {t('communityUi.tierDuration')} · {tier.enabled ? t('communityUi.published') : t('communityUi.draft')}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <button type="button" onClick={() => startEdit(tier)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {t('communityUi.edit', 'Edit')}
              </button>
              <button type="button" onClick={() => { void (tier.enabled ? CommunityService.unpublishMembershipTier(circleId, tier.id) : CommunityService.publishMembershipTier(circleId, tier.id)).then(onChanged); }} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {tier.enabled ? t('communityUi.unpublish') : t('communityUi.tierPublish')}
              </button>
              <button type="button" onClick={() => { if (window.confirm(t('communityUi.deleteConfirm', { name: tier.name }))) void CommunityService.deleteMembershipTier(circleId, tier.id).then(onChanged); }} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40" aria-label={t('communityUi.delete')}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommunityEmptyStateInline({ title }: { readonly title: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{title}</p>;
}

function splitList(value: string): string[] {
  return value.split(/[,，]/u).map((item) => item.trim()).filter(Boolean);
}

function inviteLink(circleId: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/community/${circleId}`;
}
