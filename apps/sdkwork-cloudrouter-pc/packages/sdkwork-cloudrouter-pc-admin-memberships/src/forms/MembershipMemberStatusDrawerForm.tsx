import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MembershipFormActions,
  MembershipFormFrame,
  MembershipSelectField,
} from '../components/MembershipFormControls';
import type {
  MembershipsAdminMemberStatus,
  MembershipsAdminRecord,
} from '../membershipsService';

interface MembershipMemberStatusDrawerFormProps {
  initialValue: MembershipsAdminRecord;
  onCancel: () => void;
  onSubmit: (status: MembershipsAdminMemberStatus) => Promise<void>;
}

const statuses: MembershipsAdminMemberStatus[] = ['active', 'inactive', 'expired', 'suspended', 'cancelled'];

export function MembershipMemberStatusDrawerForm({
  initialValue,
  onCancel,
  onSubmit,
}: MembershipMemberStatusDrawerFormProps) {
  const { t } = useTranslation();
  const initialStatus = String(initialValue['status'] ?? 'active') as MembershipsAdminMemberStatus;
  const [status, setStatus] = useState<MembershipsAdminMemberStatus>(statuses.includes(initialStatus) ? initialStatus : 'active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(status);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('admin.commerce.memberships.members.statusForm.error', 'Membership status could not be updated'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MembershipFormFrame error={error}>
      <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
        <div className="text-slate-500 dark:text-slate-400">{t('admin.commerce.memberships.members.table.membership', 'Membership')}</div>
        <div className="mt-1 font-medium text-slate-900 dark:text-white">{String(initialValue['id'] ?? initialValue['membership_no'] ?? '')}</div>
      </div>
      <MembershipSelectField
        label={t('admin.commerce.memberships.members.table.status', 'Status')}
        value={status}
        options={statuses.map((item) => ({ value: item }))}
        onChange={(value) => setStatus(value as MembershipsAdminMemberStatus)}
      />
      <MembershipFormActions
        submitLabel={t('admin.commerce.memberships.members.statusForm.submit', 'Update Status')}
        isSaving={isSaving}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </MembershipFormFrame>
  );
}
