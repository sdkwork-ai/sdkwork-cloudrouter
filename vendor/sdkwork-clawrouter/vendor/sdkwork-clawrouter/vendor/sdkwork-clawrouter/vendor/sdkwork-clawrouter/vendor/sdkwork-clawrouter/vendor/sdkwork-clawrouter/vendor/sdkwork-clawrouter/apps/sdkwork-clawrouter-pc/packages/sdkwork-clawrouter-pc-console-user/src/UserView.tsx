import { useCallback, useEffect, useState } from 'react';
import { User, Activity, Shield, CheckCircle } from 'lucide-react';
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
      <div className="min-h-[calc(100vh-72px)] w-full max-w-6xl mx-auto bg-slate-50 p-[5px] animate-in fade-in duration-500 dark:bg-[#121212]">
        <BusinessStatePanel
          kind="loading"
          title={t('console.user.states.loading', '正在加载用户资料...')}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[calc(100vh-72px)] w-full max-w-6xl mx-auto bg-slate-50 p-[5px] animate-in fade-in duration-500 dark:bg-[#121212]">
        <BusinessStatePanel
          kind="error"
          title={t('console.user.states.loadErrorTitle', '用户资料加载失败')}
          description={loadError}
          onRetry={() => void loadUserProfile()}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-72px)] w-full max-w-6xl mx-auto bg-slate-50 p-[5px] animate-in fade-in duration-500 dark:bg-[#121212]">
        <BusinessStatePanel
          kind="empty"
          title={t('console.user.states.emptyTitle', '未找到账户资料')}
          description={t('console.user.states.emptyDescription', '当前会话暂时没有可展示的用户资料。')}
          onRetry={() => void loadUserProfile()}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  const avatarSrc = readMediaResourceUrl(profile.avatar);
  const avatarFallback = profile.name.trim().slice(0, 1).toUpperCase() || 'U';

  return (
    <div className="min-h-[calc(100vh-72px)] w-full max-w-6xl mx-auto space-y-6 bg-slate-50 p-[5px] animate-in fade-in duration-500 dark:bg-[#121212]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
           <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm flex flex-col items-center text-center">
             <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white dark:border-[#1e1e1e]">
                  {avatarSrc ? (
                    <img alt={profile.name} className="h-full w-full rounded-full object-cover" src={avatarSrc} />
                  ) : avatarFallback}
                </div>
             </div>
             <h2 className="text-lg font-bold text-slate-800 dark:text-white">{profile.name}</h2>
             <p className="text-sm text-slate-500 mb-4">{profile.email}</p>
             {profile.isVerified && (
               <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max mx-auto shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" /> {t("console.user.userview.text.vkfgq6", "已验证")}</span>
             )}
           </div>

           <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 bg-slate-50 dark:bg-[#1a1a1a]">
                 <Activity className="w-4 h-4 text-slate-400" />
                 <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{t("console.user.userview.text.1vsx6tx", "账户摘要")}</h3>
              </div>
              <div className="p-4 space-y-3">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500">{t("console.user.userview.text.1k2q0zz", "账户状态")}</span>
                   <span className="text-emerald-600 font-medium">{profile.status}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500">{t("console.user.userview.text.jam5gz", "注册时间")}</span>
                   <span className="font-mono text-slate-800 dark:text-slate-300">{profile.registeredAt}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500">{t("console.user.userview.text.18y22pz", "最后登录")}</span>
                   <span className="font-mono text-slate-800 dark:text-slate-300 text-right">{profile.lastLogin}<br/><span className="text-[10px] text-slate-400">{profile.lastLoginIp}</span></span>
                 </div>
              </div>
           </div>
        </div>

        <div className="md:col-span-2 space-y-6">
           <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <User className="w-5 h-5 text-blue-500" /> {t("console.user.userview.text.dzqq9w", "基本资料")}</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{t("console.user.userview.text.1c2rfxc", "昵称")}</label>
                   <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.name}</div>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{t("console.user.userview.text.6o7cg1", "电子邮箱")}</label>
                   <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.email}</div>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{t("console.user.userview.text.uy4glv", "电话号码")}</label>
                   <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.phone}</div>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{t("console.user.userview.text.11koehh", "首选语言")}</label>
                   <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.language}</div>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <Shield className="w-5 h-5 text-indigo-500" /> {t("console.user.userview.text.17vdspk", "登录与安全")}</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                 <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">{t("console.user.userview.text.iuz08w", "登录密码")}</div>
                      <div className="text-xs text-slate-500">{t("console.user.userview.text.15lpi24", "最后修改于")}{profile.passwordLastChanged}</div>
                    </div>
                 </div>
                 <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">{t("console.user.userview.text.14ixcpb", "二步验证 (2FA)")}</div>
                      <div className="text-xs text-slate-500">{t("console.user.userview.text.iwvnpq", "通过身份验证器 App 保护您的账户")}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      {profile.twoFactorEnabled ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded">{t("console.user.userview.text.gdd4q1", "开启状态")}</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded">{t("console.user.userview.text.oxxuyg", "未开启")}</span>
                      )}
                    </div>
                 </div>
                 <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">{t("console.user.userview.text.l6f6k9", "第三方账号绑定")}</div>
                      <div className="text-xs text-slate-500">{t("console.user.userview.text.ht5wde", "已绑定")}{profile.thirdPartyBound}</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
