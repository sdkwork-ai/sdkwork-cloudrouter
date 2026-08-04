import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Globe, Key, Database, X, Lock, Gauge, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { AdminTableShell, BottomPagination, BusinessStateTableRow, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { RateLimitService, FirewallRule, type ChainPolicy } from './ratelimitService';
import {
  rateLimitQueryKeys,
  useChainPolicyQuery,
  useFirewallRulesQuery,
  useIpRateLimitsQuery,
  useModelRateLimitsQuery,
  useRateLimitDashboardQuery,
  useTokenRateLimitsQuery,
  useUpdateChainPolicyMutation,
} from './ratelimitQueries';
import {
  createFirewallInputFromForm,
  createIpLimitInputFromForm,
  createModelLimitInputFromForm,
  createTokenLimitInputFromForm,
} from './ratelimitForm';

import { useTranslation } from 'react-i18next';
type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const RATELIMIT_TABS = [
  { id: 'dashboard', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.1gxbx21", "风控拦截总览"), icon: <Gauge className="w-4 h-4" /> },
  { id: 'ip', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.1dpgvei", "IP访问限流"), icon: <Globe className="w-4 h-4" /> },
  { id: 'token', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.2fpnam", "令牌限额"), icon: <Key className="w-4 h-4" /> },
  { id: 'model', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.1xzz6og", "模型频控策略"), icon: <Database className="w-4 h-4" /> },
  { id: 'firewall', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.1tmo5ay", "黑白名单(WAF)"), icon: <Lock className="w-4 h-4" /> },
  { id: 'chain', label: (t: TranslationFunction) => t("admin.ratelimit.index.text.1chain", "调用链"), icon: <Gauge className="w-4 h-4" /> },
];

function RateLimitTableShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 p-5">
      <AdminTableShell
        data-admin-ratelimit-table-card
        className="flex-1 min-h-0 rounded-lg shadow-none"
        viewportClassName="min-h-0 flex-1 relative"
        viewportProps={{ 'data-admin-ratelimit-table-viewport': true }}
        footer={footer}
      >
        {children}
      </AdminTableShell>
    </div>
  );
}

function usePaginatedListFilters(searchQuery: string, page: number, pageSize: number) {
  return useMemo(() => ({
    page,
    pageSize,
    q: searchQuery.trim() || undefined,
  }), [page, pageSize, searchQuery]);
}

function usePaginatedPageBounds(total: number, pageSize: number, setPage: React.Dispatch<React.SetStateAction<number>>) {
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    setPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [total, pageSize, setPage]);
}

function RateLimitPaginationFooter({
  page,
  pageSize,
  total,
  loading,
  setPage,
  setPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { t } = useTranslation();
  return (
    <div data-admin-ratelimit-pagination>
      <BottomPagination
        page={page}
        pageSize={pageSize}
        itemCount={total}
        hasNextPage={page * pageSize < total}
        disabled={loading}
        showingLabel={t('common.pagination.showing')}
        pageLabel={t('common.pagination.page', { page })}
        pageSizeLabel={t('common.pagination.pageSize')}
        previousLabel={t('common.actions.previousPage')}
        nextLabel={t('common.actions.nextPage')}
        pageSizeOptions={[10, 20, 50, 100]}
        onPreviousPage={() => setPage(current => Math.max(1, current - 1))}
        onNextPage={() => setPage(current => current + 1)}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />
    </div>
  );
}

export function RateLimitAdmin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('ip');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <RiskDashboardView />;
      case 'ip':
        return <IpRateLimitView />;
      case 'token':
        return <TokenRateLimitView />;
      case 'model':
        return <ModelRateLimitView />;
      case 'firewall':
        return <FirewallView />;
      case 'chain':
        return <ChainPolicyView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-sm">
      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Internal Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50 dark:bg-[#121212] shrink-0">
        <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
          {RATELIMIT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#1a1a1a]">
        {renderContent()}
      </div>
      </div>
    </div>
  );
}

// 1. 全局风控大盘
function RiskDashboardView() {
  const { t } = useTranslation();
  const { data: snapshot, error, isLoading, refetch, isFetching } = useRateLimitDashboardQuery();
  const loadError = error ? getLoadErrorMessage(error, 'Failed to load risk control dashboard.') : null;
  const loading = isLoading || isFetching;

  if (loading && !snapshot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 mb-3 animate-spin text-red-500" />
        <span className="text-sm">Loading risk control rule aggregates...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-slate-500">
        <AlertTriangle className="w-10 h-10 mb-3 text-amber-500" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t("admin.ratelimit.index.text.p7avzq", "风控规则概览加载失败")}</h3>
        <p className="text-sm max-w-lg mb-4">{loadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          {t('common.actions.retry')}
        </button>
      </div>
    );
  }

  const ipLimits = snapshot?.ipLimits ?? [];
  const tokenLimits = snapshot?.tokenLimits ?? [];
  const modelLimits = snapshot?.modelLimits ?? [];
  const firewallRules = snapshot?.firewallRules ?? [];
  const activeIpLimits = ipLimits.filter(rule => rule.status === 'active').length;
  const exhaustedTokenLimits = tokenLimits.filter(rule => rule.status === 'exhausted').length;
  const activeModelLimits = modelLimits.filter(rule => rule.status === 'active').length;
  const totalFirewallRules = snapshot?.firewallRulesTotal ?? firewallRules.length;
  const totalConfiguredRules = (snapshot?.ipLimitsTotal ?? ipLimits.length)
    + (snapshot?.tokenLimitsTotal ?? tokenLimits.length)
    + (snapshot?.modelLimitsTotal ?? modelLimits.length)
    + totalFirewallRules;

  return (
    <div className="flex-1 overflow-auto p-5 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-red-500" />
          {t("admin.ratelimit.index.text.nn87s3", "安全防护规则概览")}</h3>
        <p className="text-sm text-slate-500 mt-1">{t("admin.ratelimit.index.text.hxs399", "基于当前后端已配置的限流、限额和 WAF 规则汇总。")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: t("admin.ratelimit.index.text.1hlr3sa", "生效 IP 限流"), value: activeIpLimits, detail: t("admin.ratelimit.index.text.ipRuleCount", "{{count}} 条 IP 规则", { count: snapshot?.ipLimitsTotal ?? ipLimits.length }), icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: t("admin.ratelimit.index.text.s7fzhe", "耗尽令牌限额"), value: exhaustedTokenLimits, detail: t("admin.ratelimit.index.text.apiKeyRuleCount", "{{count}} 条令牌规则", { count: snapshot?.tokenLimitsTotal ?? tokenLimits.length }), icon: Key, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: t("admin.ratelimit.index.text.10f9m11", "强制模型频控"), value: activeModelLimits, detail: t("admin.ratelimit.index.text.modelRuleCount", "{{count}} 条模型规则", { count: snapshot?.modelLimitsTotal ?? modelLimits.length }), icon: Database, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { title: t("admin.ratelimit.index.text.z0wwym", "WAF 名单规则"), value: totalFirewallRules, detail: t("admin.ratelimit.index.text.totalRuleCount", "{{count}} 条总规则", { count: totalConfiguredRules }), icon: Lock, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map(item => (
          <div key={item.title} className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{item.title}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            </div>
            <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("admin.ratelimit.index.text.1cfu979", "最高 IP RPS 限制")}</h4>
          <div className="space-y-3">
            {[...ipLimits].sort((a, b) => b.rps - a.rps).slice(0, 5).map(rule => (
              <div key={rule.id} className="flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{rule.ruleName}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{rule.targetIp}</div>
                </div>
                <div className="font-mono text-red-600 dark:text-red-400">{rule.rps} rps</div>
              </div>
            ))}
            {ipLimits.length === 0 && <p className="text-sm text-slate-500">No IP rate limit rules configured.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("admin.ratelimit.index.text.13dckll", "模型频控覆盖")}</h4>
          <div className="space-y-3">
            {[...modelLimits].sort((a, b) => b.tpm - a.tpm).slice(0, 5).map(rule => (
              <div key={rule.id} className="flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{rule.model}</div>
                  <div className="text-xs text-slate-500 truncate">{rule.accountGroupName ?? rule.accountGroup}</div>
                </div>
                <div className="font-mono text-red-600 dark:text-red-400">{rule.tpm.toLocaleString()} tpm</div>
              </div>
            ))}
            {modelLimits.length === 0 && <p className="text-sm text-slate-500">No model rate limit rules configured.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// 2. IP访问限流
function IpRateLimitView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = usePaginatedListFilters(searchQuery, page, pageSize);
  const { data, error, isLoading, refetch, isFetching } = useIpRateLimitsQuery(filters);
  const limits = data?.items ?? [];
  const total = data?.total ?? 0;
  const loadError = error ? getLoadErrorMessage(error, 'Failed to load IP limit rules.') : null;
  const loading = isLoading || isFetching;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  usePaginatedPageBounds(total, pageSize, setPage);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await RateLimitService.addIpLimit(createIpLimitInputFromForm(formData));
    await queryClient.invalidateQueries({ queryKey: [...rateLimitQueryKeys.all, 'ip-limits'] });
    await queryClient.invalidateQueries({ queryKey: rateLimitQueryKeys.dashboard() });
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-[#121212]/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate-400" />
          {t("admin.ratelimit.index.text.3oxyjw", "IP 层面限流配置")}</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("admin.ratelimit.index.text.16hm29t", "搜索规则或IP网段...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 w-64 text-slate-900 dark:text-white" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("admin.ratelimit.index.text.50zgee", "新增IP限流规则")}</button>
        </div>
      </div>
      <RateLimitTableShell
        footer={(
          <RateLimitPaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        )}
      >
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.122k66h", "规则名")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.10tgl7u", "目标 IP/网段")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1rgib0x", "每秒请求限制 (RPS)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.guf972", "每分钟请求限制 (RPM)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.oxt1rb", "惩罚封禁时长")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.finance.index.text.1ccx4t4", "状态")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-transparent">
            {loading ? (
              <BusinessStateTableRow colSpan={6} kind="loading" title="Loading IP limit rules..." />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={6}
                kind="error"
                title="IP limit rules could not be loaded"
                description={loadError}
                onRetry={() => void refetch()}
              />
            ) : limits.length === 0 ? (
              <BusinessStateTableRow
                colSpan={6}
                kind="empty"
                title="No IP limit rules found"
                description="Create a rule to control request rates for an IP address or CIDR range."
                action={{ label: 'Add IP rule', onClick: () => setIsModalOpen(true) }}
              />
            ) : limits.map(rule => (
              <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{rule.ruleName}</td>
                <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400"><span className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">{rule.targetIp}</span></td>
                <td className="px-4 py-3 font-mono">{rule.rps} req/s</td>
                <td className="px-4 py-3 font-mono">{rule.rpm} req/m</td>
                <td className="px-4 py-3 text-red-600 dark:text-red-400 text-xs font-semibold">{rule.blockDuration}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${rule.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{rule.status === 'active' ? t("admin.ratelimit.index.text.t20ka5", "生效中") : t("admin.ratelimit.index.text.1wv0i2h", "已停用")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </RateLimitTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.6cu0iv", "配置IP限流规则")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRule} className="flex flex-col flex-1">
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1f53f3v", "规则名称")}</label>
                  <input required name="ruleName" type="text" placeholder={t("admin.ratelimit.index.text.1qd1fve", "例如: 恶意爬虫防护")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.8469k9", "目标IP网段")}</label>
                  <input required name="targetIp" type="text" placeholder={t("admin.ratelimit.index.text.1d3rjn8", "0.0.0.0/0 (代表全部)")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1ssndok", "每秒限制 (RPS)")}</label>
                    <input required name="rps" type="number" min="1" step="1" placeholder="10" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.e77907", "每分钟限制 (RPM)")}</label>
                    <input required name="rpm" type="number" min="1" step="1" placeholder="300" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.oxt1rb", "惩罚封禁时长")}</label>
                  <input required name="blockDuration" type="text" placeholder={t("admin.ratelimit.index.text.1ogoxpr", "例如: 10m, 1h, 24h")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#121212] rounded-b-2xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                  {t("common.actions.cancel")}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors">
                  {t("admin.ratelimit.index.text.1puu5bo", "确认添加")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. 令牌限流
function TokenRateLimitView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = usePaginatedListFilters(searchQuery, page, pageSize);
  const { data, error, isLoading, refetch, isFetching } = useTokenRateLimitsQuery(filters);
  const limits = data?.items ?? [];
  const total = data?.total ?? 0;
  const loadError = error ? getLoadErrorMessage(error, 'Failed to load token limit rules.') : null;
  const loading = isLoading || isFetching;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  usePaginatedPageBounds(total, pageSize, setPage);

  const handleAddTokenLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await RateLimitService.addTokenLimit(createTokenLimitInputFromForm(formData));
    await queryClient.invalidateQueries({ queryKey: [...rateLimitQueryKeys.all, 'token-limits'] });
    await queryClient.invalidateQueries({ queryKey: rateLimitQueryKeys.dashboard() });
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-[#121212]/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-slate-400" />
          {t("admin.ratelimit.index.text.w3ra7a", "令牌限速配置")}</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("admin.ratelimit.index.text.wh25hh", "搜索令牌或账户...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 w-64 text-slate-900 dark:text-white" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("admin.ratelimit.index.text.1lq4o49", "自定义限速")}</button>
        </div>
      </div>
      <RateLimitTableShell
        footer={(
          <RateLimitPaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        )}
      >
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1pwu3yg", "令牌 (前缀)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.4qn97v", "关联用户")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.16yndh7", "每秒限速 (RPS)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.qple4c", "并发缓冲 (Burst)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1b5gy7d", "每日调用上限 (RPD)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.e6b1lb", "额度状态")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-transparent">
            {loading ? (
              <BusinessStateTableRow colSpan={6} kind="loading" title="Loading token limit rules..." />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={6}
                kind="error"
                title="Token limit rules could not be loaded"
                description={loadError}
                onRetry={() => void refetch()}
              />
            ) : limits.length === 0 ? (
              <BusinessStateTableRow
                colSpan={6}
                kind="empty"
                title="No token limit rules found"
                description="Create a token rule to control per-key request rates and daily quotas."
                action={{ label: 'Add token rule', onClick: () => setIsModalOpen(true) }}
              />
            ) : limits.map(token => (
              <tr key={token.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-xs">{token.keyPrefix}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{token.user}</td>
                <td className="px-4 py-3 font-mono">{token.rps} rq/s</td>
                <td className="px-4 py-3 font-mono">{token.burst}</td>
                <td className="px-4 py-3 font-mono">{token.rpd} rq/d</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${token.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>{token.status === 'active' ? t("admin.ratelimit.index.text.1gnyoj6", "健康可用") : t("admin.ratelimit.index.text.15qtpnv", "触发熔断")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </RateLimitTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Key className="w-5 h-5 text-red-500" /> {t("admin.ratelimit.index.text.fkvknw", "添加自定义令牌限速")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTokenLimit} className="flex flex-col flex-1">
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.wsgqjy", "目标用户或邮箱")}</label>
                  <input required name="user" type="text" placeholder={t("admin.ratelimit.index.text.bziph8", "例如: bob@corp.com")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.q55c8v", "令牌 (留空影响所有此用户的令牌)")}</label>
                  <input required name="keyPrefix" type="text" placeholder="sk-proj-..." className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">RPS</label>
                    <input required name="rps" type="number" min="1" step="1" placeholder="5" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Burst</label>
                    <input required name="burst" type="number" min="1" step="1" placeholder="10" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">RPD</label>
                  <input required name="rpd" type="number" min="1" step="1" placeholder="1000" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#121212]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg">{t("common.actions.cancel")}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">{t("admin.ratelimit.index.text.r7xfzl", "确定")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. 特定模型频控 (TPM/RPM)
function ModelRateLimitView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = usePaginatedListFilters(searchQuery, page, pageSize);
  const { data, error, isLoading, refetch, isFetching } = useModelRateLimitsQuery(filters);
  const limits = data?.items ?? [];
  const total = data?.total ?? 0;
  const loadError = error ? getLoadErrorMessage(error, 'Failed to load model limit rules.') : null;
  const loading = isLoading || isFetching;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  usePaginatedPageBounds(total, pageSize, setPage);

  const handleAddModelLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await RateLimitService.addModelLimit(createModelLimitInputFromForm(formData));
    await queryClient.invalidateQueries({ queryKey: [...rateLimitQueryKeys.all, 'model-limits'] });
    await queryClient.invalidateQueries({ queryKey: rateLimitQueryKeys.dashboard() });
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-[#121212]/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-400" />
          {t("admin.ratelimit.index.text.feonss", "模型级频控与令牌速率限制")}</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("admin.ratelimit.index.text.ikz3s0", "搜索模型名称...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 w-64 text-slate-900 dark:text-white" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("admin.ratelimit.index.text.1yr25uc", "覆盖默认限速")}</button>
        </div>
      </div>
      <RateLimitTableShell
        footer={(
          <RateLimitPaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        )}
      >
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1iny067", "高净值模型")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.ev2ft0", "作用范围 (用户分组)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1fzvx0g", "分钟级请求限度 (RPM)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1k8oi88", "分钟级Token吞吐 (TPM)")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.u75v55", "控制状态")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-transparent">
             {loading ? (
               <BusinessStateTableRow colSpan={5} kind="loading" title="Loading model limit rules..." />
             ) : loadError ? (
               <BusinessStateTableRow
                 colSpan={5}
                 kind="error"
                 title="Model limit rules could not be loaded"
                 description={loadError}
                 onRetry={() => void refetch()}
               />
             ) : limits.length === 0 ? (
               <BusinessStateTableRow
                 colSpan={5}
                 kind="empty"
                 title="No model limit rules found"
                 description="Create a model rule to control RPM and TPM limits for a model and group."
                 action={{ label: 'Add model rule', onClick: () => setIsModalOpen(true) }}
               />
             ) : limits.map(m => (
               <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                 <td className="px-4 py-3 font-medium font-mono text-slate-900 dark:text-slate-200"><span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-1 rounded text-xs">{m.model}</span></td>
                 <td className="px-4 py-3">{m.accountGroupName ?? m.accountGroup}</td>
                 <td className="px-4 py-3 font-mono text-red-600 dark:text-red-400">{m.rpm} <span className="text-slate-400 text-xs font-sans">RPM</span></td>
                 <td className="px-4 py-3 font-mono text-red-600 dark:text-red-400">{m.tpm} <span className="text-slate-400 text-xs font-sans">TPM</span></td>
                 <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${m.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{m.status === 'active' ? t("admin.ratelimit.index.text.lzqs5v", "强制控制中") : t("admin.ratelimit.index.text.1hjwizc", "静默监控")}</span>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </RateLimitTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Database className="w-5 h-5 text-red-500" /> {t("admin.ratelimit.index.text.196m7ep", "新建模型限速规则")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddModelLimit} className="flex flex-col flex-1">
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.myeno6", "目标模型")}</label>
                  <input required name="model" type="text" placeholder={t("admin.ratelimit.index.text.14qa7he", "例如: gpt-4")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.ev2ft0", "作用范围 (上游账号分组)")}</label>
                  <input required name="accountGroup" type="text" placeholder={t("admin.ratelimit.index.text.144ztkk", "例如: 默认分组")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" defaultValue={t("admin.ratelimit.index.text.1krzxor", "默认分组")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1fzvx0g", "分钟级请求限度 (RPM)")}</label>
                    <input required name="rpm" type="number" min="1" step="1" placeholder="5" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1k8oi88", "分钟级Token吞吐 (TPM)")}</label>
                    <input required name="tpm" type="number" min="1" step="1" placeholder="20000" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#121212]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg">{t("common.actions.cancel")}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">{t("admin.ratelimit.index.text.r7xfzl", "确定")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. WAF
function FirewallView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = usePaginatedListFilters(searchQuery, page, pageSize);
  const { data, error, isLoading, refetch, isFetching } = useFirewallRulesQuery(filters);
  const rules = data?.items ?? [];
  const total = data?.total ?? 0;
  const loadError = error ? getLoadErrorMessage(error, 'Failed to load firewall rules.') : null;
  const loading = isLoading || isFetching;
  const [removeTarget, setRemoveTarget] = useState<FirewallRule | null>(null);
  const [removingFirewallId, setRemovingFirewallId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  usePaginatedPageBounds(total, pageSize, setPage);

  const handleAddFirewall = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await RateLimitService.addFirewall(createFirewallInputFromForm(formData));
    await queryClient.invalidateQueries({ queryKey: [...rateLimitQueryKeys.all, 'firewalls'] });
    await queryClient.invalidateQueries({ queryKey: rateLimitQueryKeys.dashboard() });
    setIsModalOpen(false);
  };

  const closeRemoveConfirmation = () => {
    if (removingFirewallId) {
      return;
    }
    setRemoveTarget(null);
  };

  const executeRemove = async () => {
    if (!removeTarget) {
      return;
    }
    const id = removeTarget.id;
    setRemovingFirewallId(id);
    try {
      const ok = await RateLimitService.removeFirewall(id);
      if (ok) {
        await queryClient.invalidateQueries({ queryKey: [...rateLimitQueryKeys.all, 'firewalls'] });
        await queryClient.invalidateQueries({ queryKey: rateLimitQueryKeys.dashboard() });
      }
      setRemoveTarget(null);
    } finally {
      setRemovingFirewallId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-[#121212]/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-400" />
          {t("admin.ratelimit.index.text.128gxt4", "系统防火墙黑白名单规则")}</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("admin.ratelimit.index.text.r2w8k5", "搜索拦截对象...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 w-64 text-slate-900 dark:text-white" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("admin.ratelimit.index.text.12fbvrj", "封禁新对象")}</button>
        </div>
      </div>
      <RateLimitTableShell
        footer={(
          <RateLimitPaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        )}
      >
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1fad1dp", "名单类型")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.nump7a", "拦截/放行对象")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.m8ph8q", "拦截原因 / 备注")}</th>
              <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t("admin.ratelimit.index.text.1czrq5x", "处置时间")}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{t("common.actions.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-transparent">
             {loading ? (
               <BusinessStateTableRow colSpan={5} kind="loading" title="Loading firewall rules..." />
             ) : loadError ? (
               <BusinessStateTableRow
                 colSpan={5}
                 kind="error"
                 title="Firewall rules could not be loaded"
                 description={loadError}
                 onRetry={() => void refetch()}
               />
             ) : rules.length === 0 ? (
               <BusinessStateTableRow
                 colSpan={5}
                 kind="empty"
                 title="No firewall rules found"
                 description="Create a firewall rule to block or allow a specific IP, range, or identity."
                 action={{ label: 'Add firewall rule', onClick: () => setIsModalOpen(true) }}
               />
             ) : rules.map(f => (
               <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                 <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{f.type}</td>
                 <td className="px-4 py-3 font-mono font-medium text-red-600 dark:text-red-400">{f.value}</td>
                 <td className="px-4 py-3 text-slate-500">{f.reason}</td>
                 <td className="px-4 py-3 text-xs text-slate-500">{f.time}</td>
                 <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setRemoveTarget(f)}
                    disabled={removingFirewallId === f.id}
                    className="text-slate-400 hover:text-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-xs border border-slate-200 dark:border-white/10 px-2 py-1 rounded"
                  >
                    {t("admin.ratelimit.index.text.1iv1xe", "解除")}</button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </RateLimitTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Lock className="w-5 h-5 text-red-500" /> {t("admin.ratelimit.index.text.1803rpl", "添加系统防火墙拦截规则")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFirewall} className="flex flex-col flex-1">
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.nump7a", "拦截/放行对象")}</label>
                  <input required name="value" type="text" placeholder={t("admin.ratelimit.index.text.17jvju1", "IP, IP段 或 邮箱后缀")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1fad1dp", "名单类型")}</label>
                  <select required name="type" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white">
                    <option value={t("admin.ratelimit.index.text.1xfvv9p", "IP 黑名单屏蔽")}>{t("admin.ratelimit.index.text.869p7l", "IP 黑名单屏蔽 (拒绝所有请求)")}</option>
                    <option value={t("admin.ratelimit.index.text.za339p", "邮箱黑名单")}>{t("admin.ratelimit.index.text.van4i7", "邮箱黑名单 (禁止注册/使用)")}</option>
                    <option value={t("admin.ratelimit.index.text.16pndqd", "IP 白名单")}>{t("admin.ratelimit.index.text.1q4bo8z", "IP 白名单 (豁免限流)")}</option>
                    <option value={t("admin.ratelimit.index.text.5qvnch", "邮箱白名单")}>{t("admin.ratelimit.index.text.150764v", "邮箱白名单 (豁免限流)")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("admin.ratelimit.index.text.1oxf3so", "处置原因")}</label>
                  <input required name="reason" type="text" placeholder={t("admin.ratelimit.index.text.1i9mrj6", "例如: 恶意撞库")} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#121212]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg">{t("common.actions.cancel")}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">{t("admin.ratelimit.index.text.sx1x37", "确定封禁")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove firewall rule?"
          description={`This removes the firewall rule for "${removeTarget.value}". Traffic matching this object will no longer use this override after confirmation.`}
          confirmLabel="Remove rule"
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={removingFirewallId === removeTarget.id}
          onConfirm={() => void executeRemove()}
          onCancel={closeRemoveConfirmation}
        />
      )}
    </div>
  );
}

// 调用链：全局并发控制 + IP 白名单/黑名单（构建块式配置）
function ChainPolicyView() {
  const { t } = useTranslation();
  const { data: policy, error, isLoading, isFetching, refetch } = useChainPolicyQuery();
  const updateMutation = useUpdateChainPolicyMutation();
  const [maxInflight, setMaxInflight] = useState('');
  const [allowlistText, setAllowlistText] = useState('');
  const [denylistText, setDenylistText] = useState('');
  const [concurrencyEnabled, setConcurrencyEnabled] = useState(true);
  const [ipAccessEnabled, setIpAccessEnabled] = useState(true);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!policy) {
      return;
    }
    setMaxInflight(policy.concurrency?.maxInflight ? String(policy.concurrency.maxInflight) : '');
    setAllowlistText((policy.ipAccess?.allowlist ?? []).join('\n'));
    setDenylistText((policy.ipAccess?.denylist ?? []).join('\n'));
    setConcurrencyEnabled(!policy.stages?.disabled?.includes('concurrency'));
    setIpAccessEnabled(!policy.stages?.disabled?.includes('ip_access'));
  }, [policy]);

  const loadError = error ? getLoadErrorMessage(error, 'Failed to load chain policy.') : null;

  if (isLoading && !policy) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 mb-3 animate-spin text-red-500" />
        <span className="text-sm">Loading call chain policy...</span>
      </div>
    );
  }

  const onSave = () => {
    const input: ChainPolicy = {
      concurrency: {
        maxInflight: maxInflight.trim() ? maxInflight.trim() : null,
      },
      ipAccess: {
        mode: 'open',
        allowlist: splitIpLines(allowlistText),
        denylist: splitIpLines(denylistText),
      },
      stages: {
        disabled: [
          ...(concurrencyEnabled ? [] : ['concurrency']),
          ...(ipAccessEnabled ? [] : ['ip_access']),
        ],
      },
    };
    updateMutation.mutate(input, {
      onSuccess: () => {
        setMessage({ kind: 'ok', text: t("admin.ratelimit.index.text.chainSaved", "调用链配置已保存") });
      },
      onError: (saveError) => {
        setMessage({
          kind: 'error',
          text: getLoadErrorMessage(saveError, 'Failed to save chain policy.'),
        });
      },
    });
  };

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="max-w-3xl space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-red-500" />
            {t("admin.ratelimit.index.text.chainTitle", "调用链配置（全局）")}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {t("admin.ratelimit.index.text.chainDesc", "配置开放 API 的调用链守卫：并发上限与 IP 白名单/黑名单。单个 API Key 可在 Console 中按 Key 覆盖。")}
          </p>
        </div>

        {loadError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 p-3">
            <span className="text-sm text-red-600 dark:text-red-400">{loadError}</span>
            <button type="button" onClick={() => void refetch()} className="text-sm font-medium text-red-600 hover:underline">
              {t('common.actions.retry')}
            </button>
          </div>
        )}

        {message && (
          <div className={`rounded-lg border p-3 text-sm ${
            message.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {t("admin.ratelimit.index.text.chainConcurrency", "并发控制")}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {t("admin.ratelimit.index.text.chainConcurrencyDesc", "全局同时处理中的请求上限（0 表示不限制）")}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={concurrencyEnabled}
                onChange={(event) => setConcurrencyEnabled(event.target.checked)}
                className="accent-red-600"
              />
              {t("admin.ratelimit.index.text.chainEnabled", "启用")}
            </label>
          </div>
          <input
            type="number"
            min={0}
            value={maxInflight}
            disabled={!concurrencyEnabled}
            onChange={(event) => setMaxInflight(event.target.value)}
            placeholder={t("admin.ratelimit.index.text.chainMaxInflight", "如 100")}
            className="w-56 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50"
          />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {t("admin.ratelimit.index.text.chainIpAccess", "IP 白名单 / 黑名单")}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {t("admin.ratelimit.index.text.chainIpAccessDesc", "黑名单恒优先拒绝；支持精确 IP 与 CIDR（IPv4/IPv6），每行一条")}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={ipAccessEnabled}
                onChange={(event) => setIpAccessEnabled(event.target.checked)}
                className="accent-red-600"
              />
              {t("admin.ratelimit.index.text.chainEnabled", "启用")}
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">{t("admin.ratelimit.index.text.chainAllowlist", "白名单（留空 = 不限制）")}</span>
              <textarea
                value={allowlistText}
                disabled={!ipAccessEnabled}
                onChange={(event) => setAllowlistText(event.target.value)}
                rows={6}
                placeholder={'192.168.1.0/24\n10.0.0.5'}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">{t("admin.ratelimit.index.text.chainDenylist", "黑名单")}</span>
              <textarea
                value={denylistText}
                disabled={!ipAccessEnabled}
                onChange={(event) => setDenylistText(event.target.value)}
                rows={6}
                placeholder={'203.0.113.7'}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50 font-mono"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('common.actions.save')}
          </button>
          {isFetching && <span className="text-xs text-slate-400">Syncing...</span>}
        </div>
      </div>
    </div>
  );
}

function splitIpLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
