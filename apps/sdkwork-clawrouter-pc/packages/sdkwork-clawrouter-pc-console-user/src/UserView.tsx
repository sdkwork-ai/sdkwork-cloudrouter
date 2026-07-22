import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BusinessStatePanel, readMediaResourceUrl } from '@sdkwork/clawroutes-pc-commons';
import { UserService, UserProfile } from './userService';

import { useTranslation } from 'react-i18next';
type TranslationFunction = ReturnType<typeof useTranslation>['t'];

function getLoadErrorMessage(error: unknown, fallback: string, t: TranslationFunction): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }
  return error.message.startsWith('console.') ? t(error.message, fallback) : error.message;
}

function ProfileSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#252525]">
      <div className="border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  const displayValue = value.trim() || '—';
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{displayValue}</dd>
    </div>
  );
}

export function UserView() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await UserService.fetchCurrentUser();
      if (isActive()) {
        setProfile(data);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(getLoadErrorMessage(
          error,
          t('console.user.states.loadErrorFallback', '用户资料加载失败。'),
          t,
        ));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    void loadUserProfile(() => active);
    return () => {
      active = false;
    };
  }, [loadUserProfile]);

  if (loading) {
    return (
      <div className="min-h-full w-full max-w-none">
        <BusinessStatePanel
          kind="loading"
          title={t('console.user.states.loading', '正在加载用户资料...')}
          className="min-h-[320px]"
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-full w-full max-w-none">
        <BusinessStatePanel
          kind="error"
          title={t('console.user.states.loadErrorTitle', '用户资料加载失败')}
          description={loadError}
          onRetry={() => void loadUserProfile()}
          className="min-h-[320px]"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full w-full max-w-none">
        <BusinessStatePanel
          kind="empty"
          title={t('console.user.states.emptyTitle', '未找到账户资料')}
          description={t('console.user.states.emptyDescription', '当前会话暂时没有可展示的用户资料。')}
          onRetry={() => void loadUserProfile()}
          className="min-h-[320px]"
        />
      </div>
    );
  }

  const avatarSrc = readMediaResourceUrl(profile.avatar);
  const avatarFallback = profile.name.trim().slice(0, 1).toUpperCase() || 'U';

  return (
    <div className="min-h-full w-full max-w-none space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#252525]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
            {avatarSrc ? (
              <img alt={profile.name} className="h-full w-full object-cover" src={avatarSrc} />
            ) : avatarFallback}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{profile.name || '—'}</h2>
            <p className="text-sm text-slate-500">{profile.email || '—'}</p>
            {profile.isVerified ? (
              <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                {t('console.user.userview.text.vkfgq6', '已验证')}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <ProfileSection title={t('console.user.userview.text.1vsx6tx', '账户摘要')}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <ProfileField label={t('console.user.userview.text.1k2q0zz', '账户状态')} value={profile.status} />
          <ProfileField label={t('console.user.userview.text.jam5gz', '注册时间')} value={profile.registeredAt} />
          <ProfileField label={t('console.user.userview.text.18y22pz', '最后登录')} value={profile.lastLogin} />
        </dl>
      </ProfileSection>

      <ProfileSection title={t('console.user.userview.text.dzqq9w', '基本资料')}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileField label={t('console.user.userview.text.1c2rfxc', '昵称')} value={profile.name} />
          <ProfileField label={t('console.user.userview.text.6o7cg1', '电子邮箱')} value={profile.email} />
          <ProfileField label={t('console.user.userview.text.uy4glv', '电话号码')} value={profile.phone} />
          <ProfileField label={t('console.user.userview.text.11koehh', '首选语言')} value={profile.language} />
        </dl>
      </ProfileSection>

      <ProfileSection title={t('console.user.userview.text.17vdspk', '登录与安全')}>
        <dl className="divide-y divide-slate-100 dark:divide-white/5">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <dt className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t('console.user.userview.text.iuz08w', '登录密码')}
              </dt>
              <dd className="mt-1 text-xs text-slate-500">
                {profile.passwordLastChanged
                  ? `${t('console.user.userview.text.15lpi24', '最后修改于')}${profile.passwordLastChanged}`
                  : t('console.user.userview.text.1no3pfx', '尚未修改')}
              </dd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <dt className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t('console.user.userview.text.14ixcpb', '二步验证 (2FA)')}
              </dt>
              <dd className="mt-1 text-xs text-slate-500">
                {t('console.user.userview.text.iwvnpq', '通过身份验证器 App 保护您的账户')}
              </dd>
            </div>
            <dd className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {profile.twoFactorEnabled
                ? t('console.user.userview.text.gdd4q1', '开启状态')
                : t('console.user.userview.text.oxxuyg', '未开启')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <dt className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t('console.user.userview.text.l6f6k9', '第三方账号绑定')}
              </dt>
              <dd className="mt-1 text-xs text-slate-500">
                {profile.thirdPartyBound
                  ? `${t('console.user.userview.text.ht5wde', '已绑定')}${profile.thirdPartyBound}`
                  : t('console.user.userview.text.1ab2cd3', '未绑定')}
              </dd>
            </div>
          </div>
        </dl>
      </ProfileSection>
    </div>
  );
}
