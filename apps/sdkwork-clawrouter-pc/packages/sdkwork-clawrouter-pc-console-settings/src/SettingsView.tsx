import React, { useCallback, useState, useEffect } from 'react';
import { Globe, Bell, Palette, Moon, Sun, Check, Loader2, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { ConsoleContextProps } from '@sdkwork/clawrouter-pc-console-core';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import { SettingsService, SettingsData } from './settingsService';

import { useTranslation } from 'react-i18next';
type TranslationFunction = ReturnType<typeof useTranslation>['t'];

function getSettingsErrorMessage(error: unknown, fallback: string, t: TranslationFunction): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }
  return error.message.startsWith('console.') ? t(error.message, fallback) : error.message;
}

const Toggle = ({ checked, onChange, disabled = false, label }: { checked: boolean, onChange: () => void, disabled?: boolean, label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-10 shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-lobster-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e1e1e] transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
  >
    <span className="sr-only">{label}</span>
    <span aria-hidden="true" className={`pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export function SettingsView() {
  const { t } = useTranslation();
  const { isDark, theme, setTheme, themeColor, setThemeColor } = useOutletContext<ConsoleContextProps>();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [savingNotificationKey, setSavingNotificationKey] = useState<keyof SettingsData['notifications'] | null>(null);

  const [data, setData] = useState<SettingsData>({
    language: 'zh-CN',
    timezone: 'UTC+08:00',
    webhookUrl: '',
    notifications: {
      billReminder: true,
      quotaWarning: true,
      apiMonitor: false
    }
  });

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await SettingsService.fetchSettings();
      if (isActive()) {
        setData(res);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(getSettingsErrorMessage(
          error,
          t('console.settings.states.loadErrorFallback', '控制台设置加载失败。'),
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
    void loadSettings(() => active);
    return () => {
      active = false;
    };
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await SettingsService.updateSettings(data);
      setSaveSuccess(t('console.settings.states.saved', '设置已保存。'));
    } catch (error) {
      setSaveError(getSettingsErrorMessage(
        error,
        t('console.settings.states.saveErrorFallback', '设置保存失败。'),
        t,
      ));
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof SettingsData['notifications']) => {
    const previousData = data;
    const nextData = {
      ...data,
      notifications: {
        ...data.notifications,
        [key]: !data.notifications[key],
      },
    };
    setData(nextData);
    setSavingNotificationKey(key);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await SettingsService.updateSettings(nextData);
      setSaveSuccess(t('console.settings.states.saved', '设置已保存。'));
    } catch (error) {
      setData(previousData);
      setSaveError(getSettingsErrorMessage(
        error,
        t('console.settings.states.saveErrorFallback', '设置保存失败。'),
        t,
      ));
    } finally {
      setSavingNotificationKey(null);
    }
  };

  const tabs = [
    { id: 'general', label: t("console.settings.settingsview.text.103js93", "通用设置"), icon: Globe },
    { id: 'appearance', label: t("console.settings.settingsview.text.r3vl7p", "外观偏好"), icon: Palette },
    { id: 'notifications', label: t("console.settings.settingsview.text.186jwwc", "通知与提醒"), icon: Bell },
  ];

  const themeModeOptions = [
    {
      id: 'system',
      label: t("console.settings.appearance.systemMode", "跟随系统"),
      description: t("console.settings.appearance.systemModeDescription", "自动匹配当前设备的浅色或深色外观。"),
      icon: Monitor,
    },
    {
      id: 'light',
      label: t("console.settings.settingsview.text.1h50oex", "浅色模式 (Light)"),
      description: t("console.settings.appearance.lightModeDescription", "适合日间办公和高亮环境的清爽控制台。"),
      icon: Sun,
    },
    {
      id: 'dark',
      label: t("console.settings.settingsview.text.mhupa5", "深色控制台模式 (Dark Pro)"),
      description: t("console.settings.appearance.darkModeDescription", "适合长时间监控、夜间排查和高密度数据浏览。"),
      icon: Moon,
    },
  ] as const;

  const themeColorOptions = [
    { id: 'lobster', label: t("console.settings.appearance.color.lobster", "珊瑚红"), value: '#e55039', soft: '#fbe4e2' },
    { id: 'blue', label: t("console.settings.appearance.color.blue", "深海蓝"), value: '#2563eb', soft: '#dbeafe' },
    { id: 'emerald', label: t("console.settings.appearance.color.emerald", "松石绿"), value: '#059669', soft: '#d1fae5' },
    { id: 'violet', label: t("console.settings.appearance.color.violet", "紫罗兰"), value: '#7c3aed', soft: '#ede9fe' },
    { id: 'amber', label: t("console.settings.appearance.color.amber", "琥珀金"), value: '#d97706', soft: '#fef3c7' },
  ] as const;

  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212]">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">

        {/* Left Nav */}
        <div className="w-full shrink-0 lg:min-h-0 lg:w-64">
           <nav className="custom-scrollbar flex flex-row gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:flex lg:flex-col lg:pb-0" data-console-settings-tabs>
             {tabs.map(tab => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                     isActive
                     ? 'bg-lobster-50 dark:bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 border border-lobster-200 dark:border-lobster-500/20'
                     : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                   }`}
                 >
                   <Icon className={`w-4 h-4 ${isActive ? 'text-lobster-600 dark:text-lobster-400' : 'text-slate-500'}`} />
                   {tab.label}
                 </button>
               )
             })}
           </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm" data-console-settings-content>
          <AnimatePresence mode="wait">
            {loading ? (
              <BusinessStatePanel
                kind="loading"
                title={t('console.settings.states.loading', '正在加载设置...')}
                className="flex-1 min-h-0"
              />
            ) : loadError ? (
              <BusinessStatePanel
                kind="error"
                title={t('console.settings.states.loadErrorTitle', '设置加载失败')}
                description={loadError}
                onRetry={() => void loadSettings()}
                className="flex-1 min-h-0"
              />
            ) : activeTab === 'general' ? (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{t("console.settings.settingsview.text.103js93", "通用设置")}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("console.settings.settingsview.text.7nlzoj", "管理您的语言、时区及跨区请求路由默认偏好。")}</p>

                  <div className="space-y-6 max-w-2xl">
                    {saveError ? (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        {saveError}
                      </div>
                    ) : null}
                    {saveSuccess ? (
                      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {saveSuccess}
                      </div>
                    ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("console.settings.settingsview.text.acqlsz", "系统首选语言")}</label>
                         <select
                           value={data.language}
                           onChange={e => setData({...data, language: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-lobster-500 transition-colors cursor-pointer shadow-sm">
                           <option value="zh-CN">{t("console.settings.settingsview.text.vi603f", "简体中文 (zh-CN)")}</option>
                           <option value="en-US">English (en-US)</option>
                           <option value="ja-JP">{t("console.settings.settingsview.text.17iwdgf", "日本語 (ja-JP)")}</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("console.settings.settingsview.text.1n1edp0", "默认报表时区")}</label>
                         <select
                           value={data.timezone}
                           onChange={e => setData({...data, timezone: e.target.value})}
                           className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-lobster-500 transition-colors cursor-pointer shadow-sm">
                           <option value="UTC+08:00">(UTC+08:00) Beijing, Shanghai</option>
                           <option value="UTC+00:00">(UTC+00:00) Coordinated Universal Time</option>
                           <option value="UTC-08:00">(UTC-08:00) Pacific Time (US & Canada)</option>
                         </select>
                       </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-white/5">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("console.settings.settingsview.text.2oob40", "全局默认回调 URL配置")}</label>
                      <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
                        {t("console.settings.settingsview.text.xs2e5v", "当开启异步多模态任务生成（如视频生成、大批量图像生成）时，如果未在 API 请求体内置顶 Notify URL，平台将默认采用此地址进行状态回推。")}</p>
                      <input
                        type="url"
                        value={data.webhookUrl}
                        onChange={e => setData({...data, webhookUrl: e.target.value})}
                        placeholder="https://api.yourdomain.com/webhook/callback"
                        className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-lobster-500 transition-colors font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm" />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button onClick={handleSave} disabled={saving} className="bg-lobster-600 hover:bg-lobster-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("console.settings.settingsview.text.sig5u1", "保存全部修改")}</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'appearance' ? (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-6"
              >
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{t("console.settings.settingsview.text.qwhdeg", "外观与排版体验")}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("console.settings.settingsview.text.8f9wf1", "控制台外观会影响全局导航、业务卡片、滚动条与关键操作的主色表达。")}</p>
                  </div>

                  <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("console.settings.appearance.displayMode", "显示模式")}</h3>
                        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("console.settings.appearance.displayModeDescription", "按系统、浅色或深色偏好控制控制台界面。")}</p>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        {t("console.settings.appearance.resolvedMode", "当前生效")}：{isDark ? t("console.settings.appearance.resolvedDark", "深色") : t("console.settings.appearance.resolvedLight", "浅色")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {themeModeOptions.map((option) => {
                        const Icon = option.icon;
                        const selected = theme === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setTheme(option.id)}
                            className={`relative flex min-h-[190px] flex-col gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                              selected
                                ? 'border-lobster-500 bg-lobster-50 text-lobster-700 shadow-sm dark:bg-lobster-500/10 dark:text-lobster-200'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-lobster-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/50 dark:hover:bg-white/5'
                            }`}
                          >
                            {selected ? (
                              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-lobster-500 text-white shadow-sm">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : null}

                            <div className="h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner dark:border-white/10 dark:bg-[#121212]">
                              {option.id === 'system' ? (
                                <div className="grid h-full grid-cols-2">
                                  <div className="flex items-center justify-center bg-white text-amber-500">
                                    <Sun className="h-7 w-7" />
                                  </div>
                                  <div className="flex items-center justify-center bg-slate-900 text-slate-200">
                                    <Moon className="h-7 w-7" />
                                  </div>
                                </div>
                              ) : option.id === 'light' ? (
                                <div className="flex h-full items-center justify-center bg-white text-amber-500">
                                  <Sun className="h-8 w-8" />
                                </div>
                              ) : (
                                <div className="relative flex h-full items-center justify-center overflow-hidden bg-slate-900 text-slate-200">
                                  <div className="absolute inset-0 bg-lobster-500/[0.06]" />
                                  <Moon className="relative z-10 h-8 w-8" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 pr-7">
                              <div className="flex items-center gap-2 text-sm font-bold">
                                <Icon className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                              <p className="text-[13px] leading-5 text-slate-500 dark:text-slate-400">{option.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("console.settings.appearance.themeColor", "主题颜色")}</h3>
                      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("console.settings.appearance.themeColorDescription", "用于导航高亮、按钮强调、滚动条与关键状态的全局主色。")}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {themeColorOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={themeColor === option.id}
                          onClick={() => setThemeColor(option.id)}
                          className={`flex min-h-[94px] items-center gap-3 rounded-xl border-2 bg-white p-3 text-left transition-all dark:bg-[#1e1e1e] ${
                            themeColor === option.id
                              ? 'border-lobster-500 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
                          }`}
                          style={themeColor === option.id ? { borderColor: option.value, boxShadow: `0 0 0 3px ${option.soft}` } : undefined}
                        >
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 shadow-sm"
                            style={{ backgroundColor: option.value }}
                          >
                            {themeColor === option.id ? <Check className="h-5 w-5 text-white" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className={`block truncate text-sm font-bold ${themeColor === option.id ? 'text-lobster-600 dark:text-lobster-300' : 'text-slate-700 dark:text-slate-200'}`}>
                              {option.label}
                            </span>
                            <span className="mt-1 block font-mono text-[11px] uppercase text-slate-400 dark:text-slate-500">{option.value}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : activeTab === 'notifications' ? (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{t("console.settings.settingsview.text.1f88e0w", "关键事件通知中心")}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("console.settings.settingsview.text.1xl34cr", "配置当业务数据、账单以及大模型 API 网关状态发生异动时，系统与邮件如何通知您。")}</p>

                  <div className="space-y-6 max-w-2xl">
                    {saveError ? (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        {saveError}
                      </div>
                    ) : null}
                    {saveSuccess ? (
                      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {saveSuccess}
                      </div>
                    ) : null}

                    <div className="bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm space-y-5">

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("console.settings.settingsview.text.nvk1uw", "月度账单出账提醒")}</h4>
                          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{t("console.settings.settingsview.text.13ohdai", "每月初系统完成并生成上月所有多模态大模型的并发调用清单与扣费统计后，向您发送详尽邮件提醒。")}</p>
                        </div>
                        <div className="pt-1">
                          <Toggle
                            checked={data.notifications.billReminder}
                            onChange={() => void handleNotificationToggle('billReminder')}
                            disabled={savingNotificationKey === 'billReminder'}
                            label={t('common.actions.useSetting')}
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("console.settings.settingsview.text.1wzexb9", "可用余额/额度熔断告警")}</h4>
                          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{t("console.settings.settingsview.text.1eriz46", "当您关联的结算账户预估可用余额不足 $50 或单日额度消耗大于 90% 时，立即发送系统紧急站内信与邮件熔断通知。")}</p>
                        </div>
                        <div className="pt-1">
                          <Toggle
                            checked={data.notifications.quotaWarning}
                            onChange={() => void handleNotificationToggle('quotaWarning')}
                            disabled={savingNotificationKey === 'quotaWarning'}
                            label={t('common.actions.useSetting')}
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {t("console.settings.settingsview.text.luzgc3", "网关监控异常跌落报警")}<span className="px-2 py-0.5 rounded border border-lobster-500/30 bg-lobster-50 dark:bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-[10px] uppercase font-bold tracking-wider">{t("console.settings.settingsview.text.6erjpp", "Pro级")}</span>
                          </h4>
                          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{t("console.settings.settingsview.text.1pcv9so", "当您的所有下发令牌在中继网关发生大面积无法访问（如大量出现上游 429、500/5xx 状态码）时，启用高防监控告警。")}</p>
                        </div>
                        <div className="pt-1">
                          <Toggle
                            checked={data.notifications.apiMonitor}
                            onChange={() => void handleNotificationToggle('apiMonitor')}
                            disabled={savingNotificationKey === 'apiMonitor'}
                            label={t('common.actions.useSetting')}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
