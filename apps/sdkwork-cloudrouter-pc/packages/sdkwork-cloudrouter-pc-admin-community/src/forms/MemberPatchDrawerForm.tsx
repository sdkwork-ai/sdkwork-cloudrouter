import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommunityFormFrame,
  CommunitySelectField,
} from '../components/CommunityFormControls';
import type {
  CommunityAdminMemberItem,
  CommunityAdminMemberPatchInput,
} from '../communityService';

interface MemberPatchDrawerFormProps {
  initialValue: CommunityAdminMemberItem;
  onSubmit: (input: CommunityAdminMemberPatchInput) => Promise<void>;
}

export function MemberPatchDrawerForm({ initialValue, onSubmit }: MemberPatchDrawerFormProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState(initialValue.role);
  const [status, setStatus] = useState(initialValue.status);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        role: role as CommunityAdminMemberPatchInput['role'],
        status: status as CommunityAdminMemberPatchInput['status'],
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.community.members.form.error', 'Member could not be updated'),
      );
    }
  };

  return (
    <CommunityFormFrame error={error} formId="community-member-form" onSubmit={handleSubmit}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('admin.community.members.form.subject', 'Adjusting')}: <strong>{initialValue.userName}</strong>
      </p>
      <CommunitySelectField
        label={t('admin.community.members.form.role', 'Role')}
        value={role}
        onChange={(value) => setRole(value as string)}
        options={[
          { value: 'owner', label: t('admin.community.role.owner', 'Owner') },
          { value: 'admin', label: t('admin.community.role.admin', 'Admin') },
          { value: 'member', label: t('admin.community.role.member', 'Member') },
        ]}
      />
      <CommunitySelectField
        label={t('admin.community.members.form.status', 'Status')}
        value={status}
        onChange={(value) => setStatus(value as string)}
        options={[
          { value: 'active', label: t('admin.community.status.active', 'Active') },
          { value: 'muted', label: t('admin.community.status.muted', 'Muted') },
          { value: 'banned', label: t('admin.community.status.banned', 'Banned') },
        ]}
      />
    </CommunityFormFrame>
  );
}
