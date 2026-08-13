import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommunityFormFrame,
  CommunitySelectField,
  CommunityTextAreaField,
} from '../components/CommunityFormControls';
import type {
  CommunityAdminEntryItem,
  CommunityAdminModerationInput,
  CommunityAdminReviewState,
} from '../communityService';

interface ModerationDrawerFormProps {
  initialValue: CommunityAdminEntryItem;
  onSubmit: (input: CommunityAdminModerationInput) => Promise<void>;
}

export function ModerationDrawerForm({ initialValue, onSubmit }: ModerationDrawerFormProps) {
  const { t } = useTranslation();
  const [reviewState, setReviewState] = useState<CommunityAdminReviewState | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (!reviewState) {
        throw new Error(t('admin.community.moderation.form.stateRequired', 'Choose a review decision'));
      }
      await onSubmit({ reviewState, reason: reason.trim() || undefined });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.community.moderation.form.error', 'Moderation decision could not be saved'),
      );
    }
  };

  return (
    <CommunityFormFrame error={error} formId="community-moderation-form" onSubmit={handleSubmit}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('admin.community.moderation.form.subject', 'Reviewing')}: <strong>{initialValue.title}</strong>
      </p>
      <CommunitySelectField
        label={t('admin.community.moderation.form.decision', 'Decision')}
        value={reviewState}
        onChange={(value) => setReviewState(value as CommunityAdminReviewState | '')}
        placeholder={t('admin.community.moderation.form.decisionPlaceholder', 'Choose...')}
        options={[
          { value: 'approved', label: t('admin.community.reviewState.approved', 'Approve') },
          { value: 'rejected', label: t('admin.community.reviewState.rejected', 'Reject') },
          { value: 'flagged', label: t('admin.community.reviewState.flagged', 'Flag') },
          { value: 'draft', label: t('admin.community.reviewState.draft', 'Back to draft') },
        ]}
      />
      <CommunityTextAreaField
        label={t('admin.community.moderation.form.reason', 'Reason')}
        value={reason}
        onChange={setReason}
        placeholder={t('admin.community.moderation.form.reasonPlaceholder', 'Optional moderation note')}
      />
    </CommunityFormFrame>
  );
}
