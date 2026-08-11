import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  MembershipFormFrame,
  MembershipSelectField,
} from '../components/MembershipFormControls';
import { membershipStatusLabel } from '../components/MembershipStatusBadge';
import type {
  MembershipsAdminMemberStatus,
  MembershipsAdminRecord,
} from '../membershipsService';

interface MembershipMemberStatusDrawerFormProps {
  initialValue: MembershipsAdminRecord;
  onSubmit: (status: MembershipsAdminMemberStatus) => Promise<void>;
}

const statuses: MembershipsAdminMemberStatus[] = ['active', 'inactive', 'expired', 'suspended', 'cancelled'];

export function MembershipMemberStatusDrawerForm({
  initialValue,
  onSubmit,
}: MembershipMemberStatusDrawerFormProps) {
  const { t } = useTranslation();
  const initialStatus = String(initialValue['status'] ?? 'active') as MembershipsAdminMemberStatus;
  const [status, setStatus] = useState<MembershipsAdminMemberStatus>(statuses.includes(initialStatus) ? initialStatus : 'active');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit(status);
    } catch (saveError) {
      setError(resolveProblemMessage(saveError, t, t('admin.commerce.memberships.members.statusForm.error', 'Membership status could not be updated')));
    }
  };

  return (
    <MembershipFormFrame
      error={error}
      formId="membership-member-status-form"
      onSubmit={handleSubmit}
    >
      <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
        <div className="text-slate-500 dark:text-slate-400">{t('admin.commerce.memberships.members.table.membership', 'Membership')}</div>
        <div className="mt-1 font-medium text-slate-900 dark:text-white">{String(initialValue['id'] ?? initialValue['membership_no'] ?? '')}</div>
      </div>
      <MembershipSelectField
        label={t('admin.commerce.memberships.members.table.status', 'Status')}
        value={status}
        options={statuses.map((item) => ({ value: item, label: membershipStatusLabel(item, t) }))}
        onChange={(value) => setStatus(value as MembershipsAdminMemberStatus)}
      />
    </MembershipFormFrame>
  );
}
