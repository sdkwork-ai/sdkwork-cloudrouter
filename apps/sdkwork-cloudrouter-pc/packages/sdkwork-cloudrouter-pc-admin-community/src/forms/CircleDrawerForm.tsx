import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommunityFormFrame,
  CommunitySelectField,
  CommunityTextAreaField,
  CommunityTextField,
} from '../components/CommunityFormControls';
import type {
  CommunityAdminCategoryCreateInput,
  CommunityAdminCategoryItem,
  CommunityAdminCircleUpdateInput,
} from '../communityService';

interface CircleDrawerFormProps {
  /** create → 基础分类表单；edit → 分类基础字段 + 圈子运营字段 */
  mode: 'create' | 'edit';
  initialValue?: CommunityAdminCategoryItem | null;
  onSubmit: (
    input: CommunityAdminCategoryCreateInput,
    circle?: CommunityAdminCircleUpdateInput,
  ) => Promise<void>;
}

function parseOptionalNonNegativeInt(value: string, fallback: number | undefined): number | undefined {
  if (value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseOptionalMoney(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : undefined;
}

function splitTags(value: string): string[] {
  return value
    .split(/[,，\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function CircleDrawerForm({ mode, initialValue, onSubmit }: CircleDrawerFormProps) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState(initialValue?.slug ?? '');
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [coverImage, setCoverImage] = useState(initialValue?.coverImage ?? '');
  const [avatar, setAvatar] = useState(initialValue?.avatar ?? '');
  const [priority, setPriority] = useState(initialValue ? String(initialValue.priority) : '0');
  const [enabled, setEnabled] = useState<'' | 'true' | 'false'>(
    initialValue == null ? 'true' : initialValue.enabled ? 'true' : 'false',
  );
  const [isPaid, setIsPaid] = useState<'' | 'true' | 'false'>(
    initialValue == null ? 'false' : initialValue.isPaid ? 'true' : 'false',
  );
  const [memberLimit, setMemberLimit] = useState(initialValue?.memberLimit ?? '');
  const [price, setPrice] = useState(initialValue?.price === undefined ? '' : String(initialValue.price));
  const [revenueTarget, setRevenueTarget] = useState(
    initialValue?.revenueTarget === undefined ? '' : String(initialValue.revenueTarget),
  );
  const [tags, setTags] = useState((initialValue?.tags ?? []).join(', '));
  const [tabs, setTabs] = useState((initialValue?.tabs ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const base: CommunityAdminCategoryCreateInput = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        priority: parseOptionalNonNegativeInt(priority, 0),
        enabled: enabled === '' ? undefined : enabled === 'true',
      };
      const circle: CommunityAdminCircleUpdateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        avatar: avatar.trim() || undefined,
        isPaid: isPaid === '' ? undefined : isPaid === 'true',
        memberLimit: parseOptionalNonNegativeInt(memberLimit, undefined),
        price: parseOptionalMoney(price),
        revenueTarget: parseOptionalMoney(revenueTarget),
        tags: splitTags(tags),
        tabs: splitTags(tabs),
      };
      await onSubmit(base, mode === 'edit' ? circle : undefined);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.community.circles.form.error', 'Circle could not be saved'),
      );
    }
  };

  return (
    <CommunityFormFrame error={error} formId="community-circle-form" onSubmit={handleSubmit}>
      <CommunityTextField
        label={t('admin.community.circles.form.title', 'Circle name')}
        value={title}
        onChange={setTitle}
        placeholder={t('admin.community.circles.form.titlePlaceholder', 'e.g. AI Developers Circle')}
      />
      <CommunityTextField
        label={t('admin.community.circles.form.slug', 'Slug')}
        value={slug}
        onChange={setSlug}
        hint={t('admin.community.circles.form.slugHint', 'Lowercase letters, numbers, and dashes')}
      />
      <CommunityTextAreaField
        label={t('admin.community.circles.form.description', 'Description')}
        value={description}
        onChange={setDescription}
        placeholder={t('admin.community.circles.form.descriptionPlaceholder', 'Circle description')}
      />
      <CommunityTextField
        label={t('admin.community.circles.form.coverImage', 'Cover image URL')}
        value={coverImage}
        onChange={setCoverImage}
        type="url"
      />
      <CommunityTextField
        label={t('admin.community.circles.form.avatar', 'Avatar URL')}
        value={avatar}
        onChange={setAvatar}
        type="url"
      />
      <div className="grid grid-cols-2 gap-4">
        <CommunityTextField
          label={t('admin.community.circles.form.priority', 'Priority')}
          value={priority}
          onChange={setPriority}
          type="number"
        />
        <CommunitySelectField
          label={t('admin.community.circles.form.enabled', 'Status')}
          value={enabled}
          onChange={setEnabled}
          options={[
            { value: 'true', label: t('admin.community.status.enabled', 'Enabled') },
            { value: 'false', label: t('admin.community.status.disabled', 'Disabled') },
          ]}
        />
      </div>
      {mode === 'edit' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <CommunitySelectField
              label={t('admin.community.circles.form.isPaid', 'Paid circle')}
              value={isPaid}
              onChange={setIsPaid}
              options={[
                { value: 'true', label: t('admin.community.circles.form.paidYes', 'Yes') },
                { value: 'false', label: t('admin.community.circles.form.paidNo', 'No') },
              ]}
            />
            <CommunityTextField
              label={t('admin.community.circles.form.memberLimit', 'Member limit')}
              value={memberLimit}
              onChange={setMemberLimit}
              type="number"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CommunityTextField
              label={t('admin.community.circles.form.price', 'Price (CNY)')}
              value={price}
              onChange={setPrice}
              type="number"
              step="0.01"
            />
            <CommunityTextField
              label={t('admin.community.circles.form.revenueTarget', 'Revenue target (CNY)')}
              value={revenueTarget}
              onChange={setRevenueTarget}
              type="number"
              step="0.01"
            />
          </div>
          <CommunityTextField
            label={t('admin.community.circles.form.tags', 'Tags')}
            value={tags}
            onChange={setTags}
            hint={t('admin.community.circles.form.tagsHint', 'Comma separated')}
          />
          <CommunityTextField
            label={t('admin.community.circles.form.tabs', 'Tabs')}
            value={tabs}
            onChange={setTabs}
            hint={t('admin.community.circles.form.tabsHint', 'Comma separated')}
          />
        </>
      ) : null}
    </CommunityFormFrame>
  );
}
