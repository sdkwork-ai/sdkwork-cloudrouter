import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Zap, Search, Cpu, Info, User } from 'lucide-react';
import { AdminTableShell, BusinessStateTableRow } from '@sdkwork/clawroutes-pc-commons';
import { formatDecimalAmount, formatUserAgentDeviceLabel } from '@sdkwork/clawroutes-pc-commons/runtime';
import { RecordService, LogRecord } from './recordService';

import { useTranslation } from 'react-i18next';
export function RecordAdmin() {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [userFilter, setUserFilter] = useState('');
  const [tokenFilter, setTokenFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  const loadRecords = async (filters: { user?: string; token?: string; model?: string } = {}) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await RecordService.fetchLogs({ ...filters, page, pageSize });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load request records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords({ user: userFilter, token: tokenFilter, model: modelFilter });
  }, [page, pageSize]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    void loadRecords({ user: userFilter, token: tokenFilter, model: modelFilter });
  };

  const handleReset = () => {
    setUserFilter('');
    setTokenFilter('');
    setModelFilter('');
    if (page !== 1) {
      setPage(1);
      return;
    }
    void loadRecords();
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = logs.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastRow = logs.length > 0 ? (page - 1) * pageSize + logs.length : 0;
  const pageCost = logs.reduce((sum, log) => sum + Number(log.cost), 0);
  const streamCount = logs.filter((log) => log.isStream).length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 justify-end">
        <div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 shadow-sm text-sm shrink-0">
          <div className="px-3 py-1 flex items-center gap-1.5 border-r border-slate-200 dark:border-white/10">
            <span className="text-slate-500">{t("admin.record.index.text.pdja6l", "当前页消耗:")}</span>
            <span className="font-bold text-rose-500 flex items-center"><Zap className="w-3.5 h-3.5 mr-0.5" /> {formatDecimalAmount(String(pageCost), 6)}</span>
          </div>
          <div className="px-3 py-1 flex items-center gap-1.5 border-r border-slate-200 dark:border-white/10">
            <span className="text-slate-500">{t("admin.record.index.text.14mbkqd", "当前页请求:")}</span>
            <span className="font-bold text-slate-800 dark:text-white">{logs.length}</span>
          </div>
          <div className="px-3 py-1 flex items-center gap-1.5">
            <span className="text-slate-500">{t("admin.record.index.text.1r8sgzd", "流式:")}</span>
            <span className="font-bold text-slate-800 dark:text-white">{streamCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm flex flex-col md:flex-row flex-wrap items-center gap-3">
        {/* User Search */}
        <div className="relative w-full md:w-auto flex-1 min-w-[150px]">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t("admin.record.index.text.p00dgp", "搜索用户邮箱/ID...")}
            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        {/* Token/Key Search */}
        <div className="relative w-full md:w-auto flex-1 min-w-[150px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={tokenFilter}
            onChange={(e) => setTokenFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t("admin.record.index.text.19xt4kq", "搜索令牌/请求ID...")}
            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        {/* Model Search */}
        <div className="relative w-full md:w-auto flex-1 min-w-[120px]">
          <Cpu className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t("admin.record.index.text.229pmj", "搜索模型...")}
            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={handleSearch} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            {t("admin.record.index.text.16mfmhy", "查询")}</button>
          <button onClick={handleReset} className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-white/10 shadow-sm md:shadow-none">
            {t("admin.record.index.text.1wq9feq", "重置")}</button>
        </div>
      </div>

      {/* Main Data Table */}
      <AdminTableShell
        data-admin-record-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        viewportClassName="min-h-0 flex-1 relative"
        viewportProps={{ 'data-admin-record-table-viewport': true }}
        footer={(
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs mt-auto bg-slate-50 dark:bg-[#121212]">
            <div className="text-slate-500">
              {t('admin.record.index.text.1v5bfx3', 'Showing ')}
              {firstRow}
              {' '}
              {t('admin.record.index.text.z5dszr', 'to ')}
              {lastRow}
              {' '}
              {t('admin.record.index.text.1b7ol37', 'of ')}
              {total}
              {' '}
              {t('admin.record.index.text.1rfm5gs', 'rows')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 mr-2">{t("admin.record.index.text.wtrnlj", "Total pages:")}{totalPages}</span>
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span className="min-w-7 h-7 px-2 flex items-center justify-center rounded bg-indigo-600 text-white font-medium">{page}</span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="ml-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
              >
                <option value={10}>{t("admin.record.index.text.9gtzua", "姣忛〉: 10")}</option>
                <option value={20}>{t("admin.record.index.text.7st86h", "姣忛〉: 20")}</option>
                <option value={50}>{t("admin.record.index.text.79bzw6", "姣忛〉: 50")}</option>
              </select>
            </div>
          </div>
        )}
      >
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1860px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 select-none text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5 pl-6 font-medium">{t("admin.col.created", "时间")}</th>
                <th className="px-4 py-3.5 font-medium">{t("admin.record.index.text.1in002o", "用户")}</th>
                <th className="px-4 py-3.5 font-medium">{t("admin.record.index.text.16rfi2", "令牌 / 分组")}</th>
                <th className="px-4 py-3.5 font-medium">{t('admin.record.table.status', 'Status')}</th>
                <th className="px-4 py-3.5 font-medium">{t('admin.record.table.type', 'Type')}</th>
                <th className="px-4 py-3.5 font-medium">{t("admin.record.index.text.1ow6qt", "模型")}</th>
                <th className="px-4 py-3.5 font-medium">{t('admin.record.table.requestUrl', 'Request URL')}</th>
                <th className="px-4 py-3.5 font-medium text-center">{t("admin.record.index.text.12nip4l", "用时 / 首字")}</th>
                <th className="px-4 py-3.5 font-medium text-right relative">
                  {t("admin.record.index.text.1qtojr9", "输入")}<Info className="w-3.5 h-3.5 inline-block ml-1 opacity-50 cursor-pointer" />
                </th>
                <th className="px-4 py-3.5 font-medium text-right">{t("admin.record.index.text.w0yvd4", "输出")}</th>
                <th className="px-4 py-3.5 font-medium text-right">{t("admin.record.index.text.1rex4lo", "实际扣费")}</th>
                <th className="px-4 py-3.5 font-medium text-center relative">
                  IP
                  <Info className="w-3.5 h-3.5 inline-block ml-1 opacity-50 cursor-pointer" />
                </th>
                <th className="px-4 py-3.5 font-medium text-center">{t('admin.record.table.userAgent', 'User Agent')}</th>
                <th className="px-4 py-3.5 font-medium">{t("admin.record.index.text.xc5h04", "详情")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 relative text-xs">
              {loading ? (
                <BusinessStateTableRow colSpan={14} kind="loading" title="Loading request records..." />
              ) : loadError ? (
                <BusinessStateTableRow
                  colSpan={14}
                  kind="error"
                  title="Request records could not be loaded"
                  description={loadError}
                  onRetry={() => { void loadRecords({ user: userFilter, token: tokenFilter, model: modelFilter }); }}
                  retryLabel="Retry"
                />
              ) : logs.length === 0 ? (
                <BusinessStateTableRow
                  colSpan={14}
                  kind="empty"
                  title="No request records found"
                  description="Adjust the filters or wait for gateway usage logs to be recorded."
                />
              ) : logs.map((log) => {
                const expanded = expandedIds.includes(log.id);
                const displayModel = log.providerNativeModel || log.model;
                const modelTooltip = log.requestedModelCatalogKey || displayModel;
                const requestUrlSignature = `${log.httpMethod} ${log.path}`;
                return (
                  <React.Fragment key={log.id}>
                    {/* Main Row */}
                    <tr
                      onClick={(e) => toggleExpand(log.id, e)}
                      className={`group cursor-pointer transition-colors ${
                        expanded
                          ? 'bg-indigo-50 dark:bg-indigo-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-4 py-3.5 pl-6 font-mono text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <span className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                          {expanded ? <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </span>
                        {log.time}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-800 dark:text-slate-200 font-medium font-mono">
                        {log.user}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded">
                            {log.tokenName}
                          </span>
                          <span className="text-[10px] px-2 py-px rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {log.group}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                            log.status === 'error'
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {log.status === 'error' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'error' ? t('admin.record.status.error', 'Error') : t('admin.record.status.success', 'Success')}
                          {log.httpStatus > 0 && <span className="font-mono">{log.httpStatus}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {log.type}
                        </span>
                      </td>
                      <td
                        title={modelTooltip}
                        className="px-4 py-3.5 font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pt-[1.125rem]"
                      >
                        <Cpu className="w-3.5 h-3.5 opacity-70" />
                        <span className="inline-block max-w-[220px] truncate">{displayModel}</span>
                      </td>
                      <td className="px-4 py-3.5 align-top pt-4">
                        <span title={requestUrlSignature} className="inline-block max-w-[270px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {requestUrlSignature}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-100 dark:border-transparent">{log.totalTime}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-transparent">{log.ttft}</span>
                          {log.isStream && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-transparent">{t("admin.record.index.text.1ijcr7w", "流")}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right flex flex-col items-end justify-center h-full min-h-[48px]">
                        <span className="font-mono text-slate-800 dark:text-slate-200">{log.inputTokens}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {t("admin.record.index.text.1a1rmgf", "缓存读")}{log.cacheReadTokens}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200 align-top pt-4">
                        {log.outputTokens}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-rose-600 dark:text-rose-500 flex items-center justify-end gap-1 min-h-[48px] align-top pt-4 justify-self-end w-full text-xs">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {formatDecimalAmount(log.cost, 6)}
                      </td>
                      <td className="px-4 py-3.5 text-center align-top pt-4">
                        <span className="font-mono text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer border-b border-dashed border-slate-300 dark:border-white/20">
                          {log.ip.substring(0, 7)}...
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center align-top pt-4">
                        <span
                          title={log.userAgent}
                          className="inline-block max-w-[160px] truncate text-xs text-slate-500 border-b border-dashed border-slate-300 dark:border-white/20"
                        >
                          {formatUserAgentDeviceLabel(log.userAgent)}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top pt-3 text-[11px] leading-relaxed">
                        <div className="text-slate-500 dark:text-slate-400">
                          {t("admin.record.index.text.1rb6v97", "分组倍率")}<span className="text-slate-800 dark:text-slate-300 font-mono">{formatDecimalAmount(log.multiplier, 6)}x</span>
                        </div>
                        <div className="flex items-center gap-1 whitespace-nowrap text-slate-500">
                          {t("admin.record.index.text.1qtojr9", "输入")}<Zap className="w-3 h-3 text-rose-500/70" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M
                        </div>
                        <div className="flex items-center gap-1 whitespace-nowrap text-slate-500">
                          {t("admin.record.index.text.1a1rmgf", "缓存读")}<Zap className="w-3 h-3 text-rose-500/70" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {expanded && (
                      <tr className="bg-slate-50 dark:bg-[#121212]">
                        <td colSpan={14} className="p-0 border-t border-b border-slate-200 dark:border-white/5">
                          <div className="py-5 pl-6 pr-6 flex gap-6 text-xs">

                            {/* Left Property Labels */}
                            <div className="flex flex-col gap-3 text-slate-500 text-right font-medium min-w-[100px] shrink-0">
                              <div>Request ID</div>
                              <div>{t("admin.record.index.text.1pgfexw", "缓存 Tokens")}</div>
                              <div>{t("admin.record.index.text.nk1cis", "日志详情")}</div>
                              <div className="mt-7">{t("admin.record.index.text.1d7p7jd", "计费过程")}</div>
                              <div className="mt-[72px]">Reasoning</div>
                              <div>{t('admin.record.detail.requestUrl', 'Request URL')}</div>
                              {log.status === 'error' && <div>{t('admin.record.detail.error', 'Error')}</div>}
                              <div>{t("admin.record.index.text.d22rf5", "来源 IP")}</div>
                            </div>

                            {/* Right Values */}
                            <div className="flex flex-col gap-3 text-slate-700 dark:text-slate-300">
                              <div className="font-mono text-[11px] py-0.5 text-slate-500 dark:text-slate-400">{log.requestId}</div>
                              <div className="font-mono text-[11px] py-0.5 text-slate-500 dark:text-slate-400">{log.cacheReadTokens}</div>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 px-3 bg-white dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 w-fit shadow-sm dark:shadow-none">
                                <span>{t("admin.record.index.text.tcl9fi", "输入价格")}<Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M tokens,</span>
                                <span>{t("admin.record.index.text.1m2duf7", "输出价格")}<Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.baseOutputPrice, 6)} / 1M tokens,</span>
                                <span>{t("admin.record.index.text.1llhgaw", "缓存读取价格")}<Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M tokens,</span>
                                <span>{t("admin.record.index.text.1rb6v97", "分组倍率")}{formatDecimalAmount(log.multiplier, 6)}x</span>
                              </div>

                              <div className="mt-1 flex flex-col gap-1.5 p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-white/5 font-mono text-[11px] shadow-sm dark:shadow-none">
                                <div className="text-slate-500 dark:text-slate-400">{t("admin.record.index.text.k5zbm4", "输入价格:")}<Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M tokens</div>
                                <div className="text-slate-500 dark:text-slate-400">{t("admin.record.index.text.1t3kubf", "输出价格:")}<Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.baseOutputPrice, 6)} / 1M tokens</div>
                                <div className="text-slate-500 dark:text-slate-400 mb-1">{t("admin.record.index.text.1fjtnna", "缓存读取价格:")}<Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M tokens</div>
                                <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2 rounded">
                                  {t(
                                    "admin.record.index.text.costFormula",
                                    "(输入 {{inputBillable}} / 1M * {{inputPrice}} + 缓存 {{cacheTokens}} / 1M * {{cachePrice}} + 输出 {{outputTokens}} / 1M * {{outputPrice}}) * 倍率 {{multiplier}} = ",
                                    {
                                      inputBillable: log.inputTokens - log.cacheReadTokens,
                                      inputPrice: formatDecimalAmount(log.baseInputPrice, 6),
                                      cacheTokens: log.cacheReadTokens,
                                      cachePrice: formatDecimalAmount(log.cacheReadPrice, 6),
                                      outputTokens: log.outputTokens,
                                      outputPrice: formatDecimalAmount(log.baseOutputPrice, 6),
                                      multiplier: formatDecimalAmount(log.multiplier, 6),
                                    },
                                  )}
                                  <Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" />
                                  <span className="font-bold text-rose-600 dark:text-rose-500 ml-1">{formatDecimalAmount(log.cost, 6)}</span>
                                </div>
                                <div className="text-slate-400 dark:text-slate-500 mt-1 italic">{t("admin.record.index.text.1mdzhzs", "仅供参考，以实际扣费为准")}</div>
                              </div>

                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{log.reasoningEffort}</div>
                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{requestUrlSignature}</div>
                              {log.status === 'error' && (
                                <div className="max-w-[760px] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                  <div className="font-mono text-[11px]">
                                    {[log.errorType, log.errorCode, log.httpStatus > 0 ? `HTTP ${log.httpStatus}` : ''].filter(Boolean).join(' / ') || t('admin.record.status.error', 'Error')}
                                  </div>
                                  {log.errorMessage && (
                                    <div className="mt-1 whitespace-normal break-words leading-relaxed">{log.errorMessage}</div>
                                  )}
                                </div>
                              )}
                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{log.ip}</div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
      </AdminTableShell>
    </div>
  );
}
