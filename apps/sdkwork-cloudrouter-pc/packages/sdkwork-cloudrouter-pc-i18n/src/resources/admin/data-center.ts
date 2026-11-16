import type { I18nMessageBundle } from '../types';

export const adminDataCenterMessages: I18nMessageBundle = {
  en: {
    'admin.header.dataCenter': 'Data Center',

    'admin.menu.data.access': 'Data Access',
    'admin.menu.data.assets': 'Data Assets',
    'admin.menu.data.services': 'Data Services',
    'admin.menu.data.governance': 'Security & Audit',
    'admin.menu.data.overview': 'Overview',
    'admin.menu.data.sources': 'Data Sources',
    'admin.menu.data.tables': 'Data Tables',
    'admin.menu.data.exports': 'Export Center',
    'admin.menu.data.audits': 'Access Audit',

    'admin.dataCenter.loading': 'Loading…',
    'admin.dataCenter.phase.p0': 'P0',
    'admin.dataCenter.phase.p1': 'P1',
    'admin.dataCenter.phase.p2': 'P2',

    'admin.dataCenter.pending.title': 'Data center backend is not connected yet',
    'admin.dataCenter.pending.description':
      'This admin module is provisioned, but the deployment has no datacenter service bound. Lists stay empty and write actions are disabled until the backend is wired.',
    'admin.dataCenter.error.title': 'Data center request failed',
    'admin.dataCenter.error.retry': 'Retry',

    'admin.dataCenter.overview.title': 'Data Center',
    'admin.dataCenter.overview.description':
      'A standalone data platform inside the admin console: connect sources, land tables, develop and schedule SQL, check quality, and publish governed data services.',
    'admin.dataCenter.overview.kpi.section': 'Data center metrics',
    'admin.dataCenter.overview.kpi.sources': 'Data sources',
    'admin.dataCenter.overview.kpi.tables': 'Landed tables',
    'admin.dataCenter.overview.kpi.instances': 'Instances today',
    'admin.dataCenter.overview.kpi.exports': 'Pending exports',
    'admin.dataCenter.overview.capabilities.title': 'Capability map',
    'admin.dataCenter.overview.capabilities.description': 'What this module owns, and when each capability ships.',
    'admin.dataCenter.overview.capabilities.sources.name': 'Data sources',
    'admin.dataCenter.overview.capabilities.sources.description':
      'Connect platform, external databases and files with write-only credentials and mandatory connection tests.',
    'admin.dataCenter.overview.capabilities.imports.name': 'File import',
    'admin.dataCenter.overview.capabilities.imports.description':
      'Upload CSV/XLSX, map fields, validate, and land a table with an error-row report.',
    'admin.dataCenter.overview.capabilities.tables.name': 'Data tables',
    'admin.dataCenter.overview.capabilities.tables.description':
      'Landed tables in dc_data with structure, indexes, retention and row-level maintenance.',
    'admin.dataCenter.overview.capabilities.studio.name': 'SQL studio',
    'admin.dataCenter.overview.capabilities.studio.description':
      'Read-only SQL workbench with statement whitelist, timeouts and row caps.',
    'admin.dataCenter.overview.capabilities.exports.name': 'Export center',
    'admin.dataCenter.overview.capabilities.exports.description':
      'Governed delivery with field whitelist, approval, watermark and expiry.',
    'admin.dataCenter.overview.capabilities.audits.name': 'Access audit',
    'admin.dataCenter.overview.capabilities.audits.description':
      'Every data action recorded with actor, object, row count and trace id.',
    'admin.dataCenter.overview.capabilities.pipelines.name': 'Sync pipelines',
    'admin.dataCenter.overview.capabilities.pipelines.description':
      'Scheduled full and incremental sync with field mapping and reject isolation.',
    'admin.dataCenter.overview.capabilities.services.name': 'Data services',
    'admin.dataCenter.overview.capabilities.services.description':
      'Publish datasets as governed REST APIs with keys, quotas and docs.',
    'admin.dataCenter.overview.onboarding.title': 'Get to your first governed dataset',
    'admin.dataCenter.overview.onboarding.source.title': 'Connect a source',
    'admin.dataCenter.overview.onboarding.source.description':
      'Platform read-only, external database, or a file upload.',
    'admin.dataCenter.overview.onboarding.table.title': 'Land a table',
    'admin.dataCenter.overview.onboarding.table.description':
      'Sync or import into the dedicated dc_data schema.',
    'admin.dataCenter.overview.onboarding.dataset.title': 'Define a dataset',
    'admin.dataCenter.overview.onboarding.dataset.description':
      'Whitelist fields and set the row policy for business use.',
    'admin.dataCenter.overview.onboarding.service.title': 'Deliver data',
    'admin.dataCenter.overview.onboarding.service.description':
      'Export, subscribe, or publish a governed API.',
    'admin.dataCenter.overview.onboarding.note':
      'Data Center never reads or migrates pages from the other admin modules.',

    'admin.dataCenter.sources.title': 'Data Sources',
    'admin.dataCenter.sources.description':
      'Connect platform databases, external databases and uploaded files. Credentials are write-only, and every source must pass a connection test before it can be referenced.',
    'admin.dataCenter.sources.new': 'New source',
    'admin.dataCenter.sources.newReason': 'Requires the datacenter backend',
    'admin.dataCenter.sources.searchPlaceholder': 'Search sources',
    'admin.dataCenter.sources.kinds.title': 'Supported connectors',
    'admin.dataCenter.sources.columns.name': 'Source',
    'admin.dataCenter.sources.columns.kind': 'Type',
    'admin.dataCenter.sources.columns.status': 'Health',
    'admin.dataCenter.sources.columns.tables': 'Tables',
    'admin.dataCenter.sources.columns.lastTestedAt': 'Last test',
    'admin.dataCenter.sources.empty.title': 'No data sources yet',
    'admin.dataCenter.sources.empty.description':
      'Connect a source to start landing tables. Nothing is created automatically.',

    'admin.dataCenter.tables.title': 'Data Tables',
    'admin.dataCenter.tables.description':
      'Landed tables live in the dedicated dc_data schema. External tables stay read-only; only landed tables expose row-level maintenance with batch snapshots and rollback.',
    'admin.dataCenter.tables.columns.name': 'Table',
    'admin.dataCenter.tables.columns.kind': 'Type',
    'admin.dataCenter.tables.columns.rows': 'Rows',
    'admin.dataCenter.tables.columns.columns': 'Columns',
    'admin.dataCenter.tables.columns.owner': 'Owner',
    'admin.dataCenter.tables.columns.updatedAt': 'Updated',
    'admin.dataCenter.tables.kind.landed': 'Landed',
    'admin.dataCenter.tables.kind.external': 'External',
    'admin.dataCenter.tables.kind.view': 'View',
    'admin.dataCenter.tables.empty.title': 'No tables yet',
    'admin.dataCenter.tables.empty.description':
      'Run a sync pipeline or import a file to create the first landed table.',

    'admin.dataCenter.exports.title': 'Export Center',
    'admin.dataCenter.exports.description':
      'Governed data delivery: request, approve, generate, then download through a single-use signed link with a watermark and an expiry date. Every download is audited.',
    'admin.dataCenter.exports.new': 'New export',
    'admin.dataCenter.exports.newReason': 'Requires the datacenter backend',
    'admin.dataCenter.exports.columns.dataset': 'Dataset',
    'admin.dataCenter.exports.columns.status': 'Status',
    'admin.dataCenter.exports.columns.rows': 'Rows',
    'admin.dataCenter.exports.columns.requester': 'Requested by',
    'admin.dataCenter.exports.columns.expires': 'Link expires',
    'admin.dataCenter.exports.status.pending_approval': 'Pending approval',
    'admin.dataCenter.exports.status.running': 'Generating',
    'admin.dataCenter.exports.status.succeeded': 'Ready',
    'admin.dataCenter.exports.status.failed': 'Failed',
    'admin.dataCenter.exports.status.expired': 'Expired',
    'admin.dataCenter.exports.empty.title': 'No export jobs yet',
    'admin.dataCenter.exports.empty.description':
      'Exports are created from a dataset and carry a field whitelist, a purpose and an expiry.',

    'admin.dataCenter.audits.title': 'Access Audit',
    'admin.dataCenter.audits.description':
      'Every connect, query, download, DDL, DML, publish and approval lands here with actor, object, row count and trace id.',
    'admin.dataCenter.audits.columns.at': 'Time',
    'admin.dataCenter.audits.columns.actor': 'Actor',
    'admin.dataCenter.audits.columns.action': 'Action',
    'admin.dataCenter.audits.columns.object': 'Object',
    'admin.dataCenter.audits.columns.rows': 'Rows',
    'admin.dataCenter.audits.columns.result': 'Result',
    'admin.dataCenter.audits.action.connect': 'Connect',
    'admin.dataCenter.audits.action.query': 'Query',
    'admin.dataCenter.audits.action.download': 'Download',
    'admin.dataCenter.audits.action.ddl': 'DDL',
    'admin.dataCenter.audits.action.dml': 'DML',
    'admin.dataCenter.audits.action.publish': 'Publish',
    'admin.dataCenter.audits.action.approve': 'Approve',
    'admin.dataCenter.audits.action.rollback': 'Rollback',
    'admin.dataCenter.audits.result.success': 'Success',
    'admin.dataCenter.audits.result.failure': 'Failure',
    'admin.dataCenter.audits.empty.title': 'No audit events yet',
    'admin.dataCenter.audits.empty.description':
      'Audit events appear as soon as the datacenter service handles its first request.',
  },
  zh: {
    'admin.header.dataCenter': '数据中心',

    'admin.menu.data.access': '数据接入',
    'admin.menu.data.assets': '数据资产',
    'admin.menu.data.services': '数据服务',
    'admin.menu.data.governance': '安全与审计',
    'admin.menu.data.overview': '总览',
    'admin.menu.data.sources': '数据源',
    'admin.menu.data.tables': '数据表',
    'admin.menu.data.exports': '导出中心',
    'admin.menu.data.audits': '访问审计',

    'admin.dataCenter.loading': '加载中…',
    'admin.dataCenter.phase.p0': 'P0',
    'admin.dataCenter.phase.p1': 'P1',
    'admin.dataCenter.phase.p2': 'P2',

    'admin.dataCenter.pending.title': '数据中心后端尚未接入',
    'admin.dataCenter.pending.description':
      '该管理模块已注册，但当前部署尚未绑定数据中心服务。在接入后端之前，列表保持为空、写操作不可用。',
    'admin.dataCenter.error.title': '数据中心请求失败',
    'admin.dataCenter.error.retry': '重试',

    'admin.dataCenter.overview.title': '数据中心',
    'admin.dataCenter.overview.description':
      '管理后台内置的独立数据平台：接入数据源、落地数据表、编写与调度 SQL、质量校验，并发布受控的数据服务。',
    'admin.dataCenter.overview.kpi.section': '数据中心指标',
    'admin.dataCenter.overview.kpi.sources': '数据源',
    'admin.dataCenter.overview.kpi.tables': '落地表',
    'admin.dataCenter.overview.kpi.instances': '今日实例',
    'admin.dataCenter.overview.kpi.exports': '待处理导出',
    'admin.dataCenter.overview.capabilities.title': '能力地图',
    'admin.dataCenter.overview.capabilities.description': '本模块负责的能力，以及各自的上线阶段。',
    'admin.dataCenter.overview.capabilities.sources.name': '数据源',
    'admin.dataCenter.overview.capabilities.sources.description':
      '接入平台库、外部数据库与文件，凭据只写不读，必须通过连通性测试。',
    'admin.dataCenter.overview.capabilities.imports.name': '文件导入',
    'admin.dataCenter.overview.capabilities.imports.description':
      '上传 CSV/XLSX，映射字段并校验，错误行可下载，成功后落地成表。',
    'admin.dataCenter.overview.capabilities.tables.name': '数据表',
    'admin.dataCenter.overview.capabilities.tables.description':
      '表落在独立的 dc_data schema，含结构、索引、保留期与明细维护。',
    'admin.dataCenter.overview.capabilities.studio.name': 'SQL 工作台',
    'admin.dataCenter.overview.capabilities.studio.description':
      '只读查询，语句白名单、超时与行数上限。',
    'admin.dataCenter.overview.capabilities.exports.name': '导出中心',
    'admin.dataCenter.overview.capabilities.exports.description':
      '受控交付：字段白名单、审批、水印与到期失效。',
    'admin.dataCenter.overview.capabilities.audits.name': '访问审计',
    'admin.dataCenter.overview.capabilities.audits.description':
      '连接、查询、下载、DDL、DML 全部留痕，含操作人、对象、行数与 traceId。',
    'admin.dataCenter.overview.capabilities.pipelines.name': '同步管道',
    'admin.dataCenter.overview.capabilities.pipelines.description':
      '定时全量与增量同步，字段映射与脏数据隔离。',
    'admin.dataCenter.overview.capabilities.services.name': '数据服务',
    'admin.dataCenter.overview.capabilities.services.description':
      '把数据集发布为受控 REST API，含 Key、配额与在线文档。',
    'admin.dataCenter.overview.onboarding.title': '从零到第一个可用数据集',
    'admin.dataCenter.overview.onboarding.source.title': '接入数据源',
    'admin.dataCenter.overview.onboarding.source.description':
      '平台只读库、外部数据库，或上传文件。',
    'admin.dataCenter.overview.onboarding.table.title': '落地数据表',
    'admin.dataCenter.overview.onboarding.table.description':
      '通过同步或导入写入独立的 dc_data schema。',
    'admin.dataCenter.overview.onboarding.dataset.title': '定义数据集',
    'admin.dataCenter.overview.onboarding.dataset.description':
      '配置字段白名单与行级策略，供业务取数。',
    'admin.dataCenter.overview.onboarding.service.title': '交付数据',
    'admin.dataCenter.overview.onboarding.service.description':
      '导出、订阅，或发布受控 API。',
    'admin.dataCenter.overview.onboarding.note':
      '数据中心不会读取或迁移其它管理模块的页面。',

    'admin.dataCenter.sources.title': '数据源',
    'admin.dataCenter.sources.description':
      '接入平台库、外部数据库与上传文件。凭据只写不读，任何数据源必须通过连通性测试后才能被引用。',
    'admin.dataCenter.sources.new': '新建数据源',
    'admin.dataCenter.sources.newReason': '需要数据中心后端',
    'admin.dataCenter.sources.searchPlaceholder': '搜索数据源',
    'admin.dataCenter.sources.kinds.title': '支持的连接器',
    'admin.dataCenter.sources.columns.name': '数据源',
    'admin.dataCenter.sources.columns.kind': '类型',
    'admin.dataCenter.sources.columns.status': '健康状态',
    'admin.dataCenter.sources.columns.tables': '表数量',
    'admin.dataCenter.sources.columns.lastTestedAt': '最近测试',
    'admin.dataCenter.sources.empty.title': '还没有数据源',
    'admin.dataCenter.sources.empty.description':
      '接入一个数据源即可开始落地数据表，系统不会自动创建任何数据。',

    'admin.dataCenter.tables.title': '数据表',
    'admin.dataCenter.tables.description':
      '落地表存放在独立的 dc_data schema。外部表保持只读；仅落地表支持带批次快照与回滚的明细维护。',
    'admin.dataCenter.tables.columns.name': '表名',
    'admin.dataCenter.tables.columns.kind': '类型',
    'admin.dataCenter.tables.columns.rows': '行数',
    'admin.dataCenter.tables.columns.columns': '字段数',
    'admin.dataCenter.tables.columns.owner': '负责人',
    'admin.dataCenter.tables.columns.updatedAt': '更新时间',
    'admin.dataCenter.tables.kind.landed': '落地表',
    'admin.dataCenter.tables.kind.external': '外部表',
    'admin.dataCenter.tables.kind.view': '视图',
    'admin.dataCenter.tables.empty.title': '还没有数据表',
    'admin.dataCenter.tables.empty.description':
      '运行一次同步管道或导入文件，即可创建第一张落地表。',

    'admin.dataCenter.exports.title': '导出中心',
    'admin.dataCenter.exports.description':
      '受控交付：申请、审批、生成，然后通过带水印与有效期的单次签名链接下载。每次下载都会留痕。',
    'admin.dataCenter.exports.new': '新建导出',
    'admin.dataCenter.exports.newReason': '需要数据中心后端',
    'admin.dataCenter.exports.columns.dataset': '数据集',
    'admin.dataCenter.exports.columns.status': '状态',
    'admin.dataCenter.exports.columns.rows': '行数',
    'admin.dataCenter.exports.columns.requester': '申请人',
    'admin.dataCenter.exports.columns.expires': '链接到期',
    'admin.dataCenter.exports.status.pending_approval': '待审批',
    'admin.dataCenter.exports.status.running': '生成中',
    'admin.dataCenter.exports.status.succeeded': '可下载',
    'admin.dataCenter.exports.status.failed': '失败',
    'admin.dataCenter.exports.status.expired': '已过期',
    'admin.dataCenter.exports.empty.title': '还没有导出任务',
    'admin.dataCenter.exports.empty.description':
      '导出基于数据集创建，并携带字段白名单、用途与有效期。',

    'admin.dataCenter.audits.title': '访问审计',
    'admin.dataCenter.audits.description':
      '连接、查询、下载、DDL、DML、发布与审批全部在此留痕，包含操作人、对象、行数与 traceId。',
    'admin.dataCenter.audits.columns.at': '时间',
    'admin.dataCenter.audits.columns.actor': '操作人',
    'admin.dataCenter.audits.columns.action': '动作',
    'admin.dataCenter.audits.columns.object': '对象',
    'admin.dataCenter.audits.columns.rows': '行数',
    'admin.dataCenter.audits.columns.result': '结果',
    'admin.dataCenter.audits.action.connect': '连接',
    'admin.dataCenter.audits.action.query': '查询',
    'admin.dataCenter.audits.action.download': '下载',
    'admin.dataCenter.audits.action.ddl': 'DDL',
    'admin.dataCenter.audits.action.dml': 'DML',
    'admin.dataCenter.audits.action.publish': '发布',
    'admin.dataCenter.audits.action.approve': '审批',
    'admin.dataCenter.audits.action.rollback': '回滚',
    'admin.dataCenter.audits.result.success': '成功',
    'admin.dataCenter.audits.result.failure': '失败',
    'admin.dataCenter.audits.empty.title': '还没有审计事件',
    'admin.dataCenter.audits.empty.description':
      '数据中心服务处理第一个请求后，审计事件就会出现在这里。',
  },
};
