import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import {
  CommunityFormFrame,
  CommunitySelectField,
  CommunityTextAreaField,
  CommunityTextField,
} from '../components/CommunityFormControls';
import type {
  CommunityAdminGroupItem,
  CommunityAdminGroupMutationInput,
  CommunityAdminGroupQrInput,
} from '../communityService';

interface GroupDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: CommunityAdminGroupItem | null;
  onSubmit: (input: CommunityAdminGroupMutationInput) => Promise<void>;
}

const GROUP_PLATFORMS = ['wechat', 'qq', 'dingtalk', 'feishu', 'telegram', 'discord', 'slack', 'other'];

function parseOptionalMemberCount(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function GroupDrawerForm({ initialValue, onSubmit }: GroupDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [platform, setPlatform] = useState(initialValue?.platform ?? 'wechat');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [memberCount, setMemberCount] = useState(initialValue?.memberCount ?? '');
  const [qrCodes, setQrCodes] = useState<CommunityAdminGroupQrInput[]>(
    initialValue?.qrCodes ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        platform,
        description: description.trim() || undefined,
        memberCount: parseOptionalMemberCount(memberCount),
        qrCodes: qrCodes.filter((entry) => entry.url.trim().length > 0),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.community.groups.form.error', 'Group could not be saved'),
      );
    }
  };

  return (
    <CommunityFormFrame error={error} formId="community-group-form" onSubmit={handleSubmit}>
      <CommunityTextField
        label={t('admin.community.groups.form.name', 'Group name')}
        value={name}
        onChange={setName}
      />
      <CommunitySelectField
        label={t('admin.community.groups.form.platform', 'Platform')}
        value={platform}
        onChange={setPlatform}
        options={GROUP_PLATFORMS.map((entry) => ({
          value: entry,
          label: t(`admin.community.groups.platform.${entry}`, entry),
        }))}
      />
      <CommunityTextAreaField
        label={t('admin.community.groups.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
      <CommunityTextField
        label={t('admin.community.groups.form.memberCount', 'Member count')}
        value={memberCount}
        onChange={setMemberCount}
        type="number"
      />
      <div className="flex items-start gap-3">
        <span className="w-28 shrink-0 pt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('admin.community.groups.form.qrCodes', 'QR codes')}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {qrCodes.map((entry, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <input
                  value={entry.url}
                  onChange={(event) => {
                    const next = [...qrCodes];
                    next[index] = { ...next[index]!, url: event.target.value };
                    setQrCodes(next);
                  }}
                  placeholder={t('admin.community.groups.form.qrUrlPlaceholder', 'QR code image URL')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white"
                />
                <input
                  value={entry.description ?? ''}
                  onChange={(event) => {
                    const next = [...qrCodes];
                    next[index] = { ...next[index]!, description: event.target.value };
                    setQrCodes(next);
                  }}
                  placeholder={t('admin.community.groups.form.qrDescriptionPlaceholder', 'Description (optional)')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white"
                />
              </div>
              <button
                type="button"
                aria-label={t('common.actions.remove', 'Remove')}
                onClick={() => setQrCodes(qrCodes.filter((_, itemIndex) => itemIndex !== index))}
                className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setQrCodes([...qrCodes, { url: '' }])}
            className="inline-flex items-center gap-1 self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-white/20 dark:text-slate-400"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.community.groups.form.addQrCode', 'Add QR code')}
          </button>
        </div>
      </div>
    </CommunityFormFrame>
  );
}
