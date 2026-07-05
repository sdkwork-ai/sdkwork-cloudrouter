import { useState, useEffect, useMemo } from 'react';
import {
  Activity, Server, AlertTriangle, Cpu, Globe,
  CheckCircle2, AlertCircle, Clock, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line
} from 'recharts';
import { AdminTableShell, BottomPagination, BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import {
  MONITOR_OVERVIEW_SAMPLE_PAGE_SIZE,
  MonitorService,
  SysNode,
  Alert,
  PerformanceDatum,
} from './monitorService';

import { useTranslation } from 'react-i18next';
function NodesTab() {
  const { t } = useTranslation();
  const [overviewNodes, setOverviewNodes] = useState<SysNode[]>([]);
  const [nodes, setNodes] = useState<SysNode[]>([]);
  const [totalNodes, setTotalNodes] = useState(0);
  const [perfData, setPerfData] = useState<PerformanceDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodeSearch, setNodeSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listFilters = useMemo(() => ({
    page,
    pageSize,
    q: nodeSearch.trim() || undefined,
  }), [page, pageSize, nodeSearch]);

  const loadNodes = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [overviewNodesData, perf, nodesPage] = await Promise.all([
        MonitorService.fetchNodes({ page: 1, pageSize: MONITOR_OVERVIEW_SAMPLE_PAGE_SIZE }),
        MonitorService.fetchPerformanceData({ page: 1, pageSize: MONITOR_OVERVIEW_SAMPLE_PAGE_SIZE }),
        MonitorService.fetchNodes(listFilters),
      ]);
      setOverviewNodes(overviewNodesData.items);
      setPerfData(perf.items);
      setNodes(nodesPage.items);
      setTotalNodes(nodesPage.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNodes();
  }, [page, pageSize, nodeSearch]);

  useEffect(() => {
    setPage(1);
  }, [nodeSearch]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalNodes / pageSize));
    setPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [totalNodes, pageSize]);

  if (loading) {
    return <BusinessStatePanel kind="loading" title="Loading system metrics..." className="min-h-[420px]" />;
  }

  if (loadError) {
    return (
      <BusinessStatePanel
        kind="error"
        title="System metrics could not be loaded"
        description={loadError}
        onRetry={() => { void loadNodes(); }}
        retryLabel="Retry"
        className="min-h-[420px]"
      />
    );
  }

  const avgCpu = overviewNodes.length === 0 ? 0 : overviewNodes.reduce((sum, node) => sum + node.cpu, 0) / overviewNodes.length;
  const onlineNodes = overviewNodes.filter((node) => node.status === 'online').length;
  const healthRate = overviewNodes.length === 0 ? 0 : (onlineNodes / overviewNodes.length) * 100;
  const activeIncidents = overviewNodes.filter((node) => node.status !== 'online').length;
  const regions = new Set(overviewNodes.map((node) => node.region)).size;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      {/* Overview Cards */}
      <div className="grid shrink-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Nodes', value: String(totalNodes), desc: `Across ${regions} regions`, icon: Server, color: 'text-blue-500' },
          { title: 'System Health', value: `${healthRate.toFixed(1)}%`, desc: `${onlineNodes}/${overviewNodes.length} nodes online`, icon: Activity, color: 'text-green-500' },
          { title: 'Avg CPU Load', value: `${avgCpu.toFixed(1)}%`, desc: 'Backend reported average', icon: Cpu, color: 'text-yellow-500' },
          { title: 'Active Incidents', value: String(activeIncidents), desc: 'Warning or offline nodes', icon: AlertTriangle, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
            </div>
            <div className={`p-3 rounded-lg bg-slate-50 dark:bg-white/5 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid shrink-0 grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Cluster Resource Usage (Avg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" name="Memory (%)" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Network Traffic (Mbps)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfData}>
                <defs>
                  <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="network" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNetwork)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Node List */}
      <AdminTableShell
        data-admin-monitor-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        viewportClassName="min-h-0 flex-1"
        header={(
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-medium text-slate-900 dark:text-white">Active Nodes</h3>
          <div className="flex gap-2">
             <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nodeSearch}
                  onChange={(event) => setNodeSearch(event.target.value)}
                  placeholder="Search nodes..."
                  className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
             </div>
          </div>
        </div>
        )}
        footer={(
          <div data-admin-monitor-pagination>
            <BottomPagination
              page={page}
              pageSize={pageSize}
              itemCount={totalNodes}
              hasNextPage={page * pageSize < totalNodes}
              disabled={loading}
              showingLabel={t('admin.group.pagination.showing')}
              pageLabel={t('admin.group.pagination.page', { page })}
              pageSizeLabel={t('admin.group.pagination.pageSize')}
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
        )}
        viewportProps={{ 'data-admin-monitor-table-viewport': true }}
      >
        <div className="contents">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 text-xs text-slate-500 uppercase bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-3 font-medium">Node / IP</th>
                <th className="px-6 py-3 font-medium">Region</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">CPU</th>
                <th className="px-6 py-3 font-medium">Memory</th>
                <th className="px-6 py-3 font-medium">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-white">{node.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{node.ip}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe className="w-4 h-4" />
                      {node.region}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {node.status === 'online' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Online
                      </span>
                    )}
                    {node.status === 'warning' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        Warning
                      </span>
                    )}
                    {node.status === 'offline' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                         <div
                           className={`h-full ${node.cpu > 80 ? 'bg-red-500' : node.cpu > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                           style={{ width: `${node.cpu}%` }}
                         />
                       </div>
                       <span className="text-xs text-slate-500">{node.cpu}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                         <div
                           className={`h-full ${node.memory > 80 ? 'bg-red-500' : node.memory > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                           style={{ width: `${node.memory}%` }}
                         />
                       </div>
                       <span className="text-xs text-slate-500">{node.memory}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{node.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminTableShell>
    </div>
  );
}

function AlertsTab() {
  const { t } = useTranslation();
  const [overviewAlerts, setOverviewAlerts] = useState<Alert[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | Alert['severity']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Alert['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadAlerts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [overviewData, alertsPage] = await Promise.all([
        MonitorService.fetchAlerts({ page: 1, pageSize: MONITOR_OVERVIEW_SAMPLE_PAGE_SIZE }),
        MonitorService.fetchAlerts({ page, pageSize }),
      ]);
      setOverviewAlerts(overviewData.items);
      setAlerts(alertsPage.items);
      setTotalAlerts(alertsPage.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, [page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalAlerts / pageSize));
    setPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [totalAlerts, pageSize]);

  if (loading) {
    return <BusinessStatePanel kind="loading" title="Loading alerts..." className="min-h-[420px]" />;
  }

  if (loadError) {
    return (
      <BusinessStatePanel
        kind="error"
        title="Alerts could not be loaded"
        description={loadError}
        onRetry={() => { void loadAlerts(); }}
        retryLabel="Retry"
        className="min-h-[420px]"
      />
    );
  }

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatches = severityFilter === 'all' || alert.severity === severityFilter;
    const statusMatches = statusFilter === 'all' || alert.status === statusFilter;
    return severityMatches && statusMatches;
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      {/* Alert Stats */}
      <div className="grid shrink-0 grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-red-50 dark:bg-red-500/5 p-5 rounded-xl border border-red-100 dark:border-red-500/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-500 mt-1">{overviewAlerts.filter((alert) => alert.severity === 'critical' && alert.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-yellow-50 dark:bg-yellow-500/5 p-5 rounded-xl border border-yellow-100 dark:border-yellow-500/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Warnings</p>
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-500 mt-1">{overviewAlerts.filter((alert) => alert.severity === 'warning' && alert.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-blue-50 dark:bg-blue-500/5 p-5 rounded-xl border border-blue-100 dark:border-blue-500/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Resolved Today</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-500 mt-1">{overviewAlerts.filter((alert) => alert.status === 'resolved').length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-500 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
         </div>
      </div>

      {/* Alert List */}
      <AdminTableShell
        data-admin-monitor-alert-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        viewportClassName="min-h-0 flex-1"
        header={(
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-medium text-slate-900 dark:text-white">Recent Alerts</h3>
          <div className="flex gap-2">
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as 'all' | Alert['severity'])}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | Alert['status'])}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
        )}
        footer={(
          <div data-admin-monitor-alert-pagination>
            <BottomPagination
              page={page}
              pageSize={pageSize}
              itemCount={totalAlerts}
              hasNextPage={page * pageSize < totalAlerts}
              disabled={loading}
              showingLabel={t('admin.group.pagination.showing')}
              pageLabel={t('admin.group.pagination.page', { page })}
              pageSizeLabel={t('admin.group.pagination.pageSize')}
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
        )}
        viewportProps={{ 'data-admin-monitor-alert-table-viewport': true }}
      >

        <div className="divide-y divide-slate-200 dark:divide-white/5">
           {filteredAlerts.map(alert => (
             <div key={alert.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${alert.status === 'resolved' ? 'opacity-70' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                   <div className="flex items-start gap-4">
                      {alert.severity === 'critical' && <div className="p-2 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500 rounded-lg mt-1"><AlertTriangle className="w-5 h-5" /></div>}
                      {alert.severity === 'warning' && <div className="p-2 bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500 rounded-lg mt-1"><AlertCircle className="w-5 h-5" /></div>}
                      {alert.severity === 'info' && <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-500 rounded-lg mt-1"><Activity className="w-5 h-5" /></div>}

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">{alert.title}</h4>
                          {alert.status === 'active' ? (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-red-500 bg-red-100 dark:bg-red-500/10 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">Active</span>
                          ) : (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-green-500 bg-green-100 dark:bg-green-500/10 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-500/20">Resolved</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                           <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {alert.time}</span>
                           <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5" /> {alert.source}</span>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </AdminTableShell>
    </div>
  );
}

export function MonitorAdmin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('nodes');

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 gap-4 border-b border-slate-200 dark:border-white/10">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'nodes' ? 'border-red-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('nodes')}
        >
          {t("admin.monitor.index.text.xexwv5", "节点状态监控")}</button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'alerts' ? 'border-red-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('alerts')}
        >
          {t("admin.monitor.index.text.14p0m6f", "系统告警日志")}</button>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'nodes' && <NodesTab />}
        {activeTab === 'alerts' && <AlertsTab />}
      </div>
    </div>
  );
}
