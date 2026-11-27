/**
 * Virtual Machines console catalog - Simplified Chinese (zh-CN).
 *
 * Mirror of `en-US/compute/vm-instances/console.ts`: same key set, same
 * interpolation placeholders.
 */

export const vmInstancesConsoleMessagesZh: Record<string, string> = {
  // ------------------------------------------------------------------ sidebar
  'console.menu.group.vmInstances': '虚拟机',
  'console.menu.vmInstances': 'VM 实例',

  // --------------------------------------------------------------------- page
  'console.vmInstances.title': '虚拟机实例',
  'console.vmInstances.description': '你已开通的虚拟机实例——每台虚拟机都是一套独立运行时，规格与隔离等级按你的声明创建。',
  'console.vmInstances.ownerScope': '本页只列出你拥有的虚拟机实例，其他账号的实例不会出现在这里。',
  'console.vmInstances.loading': '正在加载虚拟机实例…',

  // ------------------------------------------------------------------ actions
  'console.vmInstances.actions.refresh': '刷新',
  'console.vmInstances.actions.create': '开通虚拟机',
  'console.vmInstances.actions.edit': '编辑',
  'console.vmInstances.actions.delete': '删除',
  'console.vmInstances.actions.save': '保存更改',
  'console.vmInstances.actions.cancel': '取消',
  'console.vmInstances.actions.close': '关闭',
  'console.vmInstances.actions.retry': '重试',

  // ------------------------------------------------------------------ columns
  'console.vmInstances.column.name': '名称',
  'console.vmInstances.column.state': '状态',
  'console.vmInstances.column.runtimeKind': '运行时',
  'console.vmInstances.column.profile': '规格档',
  'console.vmInstances.column.resources': '资源',
  'console.vmInstances.column.capabilities': '所需能力',
  'console.vmInstances.column.expiresAt': '到期时间',
  'console.vmInstances.column.actions': '操作',

  // --------------------------------------------------------------- vocabulary
  'console.vmInstances.state.requested': '已申请',
  'console.vmInstances.state.active': '运行中',
  'console.vmInstances.state.suspended': '已挂起',
  'console.vmInstances.state.terminated': '已终止',
  'console.vmInstances.state.failed': '失败',

  'console.vmInstances.profile.standard': '标准型',
  'console.vmInstances.profile.memory_optimized': '内存优化型',
  'console.vmInstances.profile.compute_optimized': '计算优化型',

  'console.vmInstances.assurance.host_user': '宿主用户级',
  'console.vmInstances.assurance.container': '容器级',
  'console.vmInstances.assurance.user_space_kernel': '用户态内核级',
  'console.vmInstances.assurance.micro_vm': '微型虚拟机级',
  'console.vmInstances.assurance.dedicated_vm': '独占虚拟机级',

  'console.vmInstances.runtimeKind.sandbox': '沙箱（进程级）',
  'console.vmInstances.runtimeKind.docker': 'Docker 容器',
  'console.vmInstances.runtimeKind.gvisor': 'gVisor（用户态内核）',
  'console.vmInstances.runtimeKind.kata': 'Kata Containers',
  'console.vmInstances.runtimeKind.firecracker': 'Firecracker 微型虚拟机',
  'console.vmInstances.runtimeKind.qemu': 'QEMU 完整虚拟机',

  'console.vmInstances.capability.terminal': '终端',
  'console.vmInstances.capability.filesystem': '文件系统',
  'console.vmInstances.capability.git': 'Git',
  'console.vmInstances.capability.build': '构建',
  'console.vmInstances.capability.browser': '浏览器',
  'console.vmInstances.capability.port_forward': '端口转发',
  'console.vmInstances.capability.mcp_transport': 'MCP 传输',
  'console.vmInstances.capability.environment': '环境变量',
  'console.vmInstances.capability.none': '跟随规格档默认',
  'console.vmInstances.capability.overflow': '另 {{count}} 项',

  'console.vmInstances.resources.summary': '{{vcpu}} vCPU · {{memory}} MiB · {{disk}} MiB',
  'console.vmInstances.expiresAt.never': '永不过期',

  // ------------------------------------------------------------------- filter
  'console.vmInstances.filter.label': '按状态筛选',
  'console.vmInstances.filter.all': '全部状态',
  'console.vmInstances.filter.clear': '清除筛选',
  'console.vmInstances.filter.emptyTitle': '没有处于该状态的虚拟机实例',
  'console.vmInstances.filter.emptyDescription': '清除筛选即可查看你拥有的全部虚拟机实例。',

  // -------------------------------------------------------------------- empty
  'console.vmInstances.empty.title': '还没有虚拟机实例',
  'console.vmInstances.empty.description': '开通一台虚拟机，为你的 Agent 提供一套按需指定 CPU、内存与能力的独立运行时。',
  'console.vmInstances.empty.action': '开通虚拟机',

  // ------------------------------------------------------------------ errors
  'console.vmInstances.error.load': '虚拟机实例列表不可用。',
  'console.vmInstances.error.unavailable': '请求失败，列表未能读取。重试即可重新加载你的虚拟机实例。',
  'console.vmInstances.error.create': '虚拟机实例开通失败。',
  'console.vmInstances.error.update': '虚拟机实例更新失败。',
  'console.vmInstances.error.delete': '虚拟机实例删除失败。',

  // -------------------------------------------------------------- pagination
  'console.vmInstances.pagination.previous': '上一页',
  'console.vmInstances.pagination.next': '下一页',
  'console.vmInstances.pagination.pageInfo': '第 {{page}} / {{pages}} 页 · 共 {{total}} 条',
  'console.vmInstances.pagination.pageSize': '每页条数',

  // ------------------------------------------------------------------ drawer
  'console.vmInstances.drawer.createTitle': '开通虚拟机实例',
  'console.vmInstances.drawer.createDescription': '设定运行时规格，并声明所需的隔离等级与能力。',
  'console.vmInstances.drawer.editTitle': '编辑虚拟机实例',
  'console.vmInstances.drawer.editDescription': '正在编辑“{{name}}”。',

  'console.vmInstances.section.shape': '运行时规格',
  'console.vmInstances.section.isolation': '隔离与能力',
  'console.vmInstances.section.lifecycle': '生命周期',

  // ------------------------------------------------------------------- fields
  'console.vmInstances.field.optional': '可选',
  'console.vmInstances.field.name': '名称',
  'console.vmInstances.field.baseImage': '基础镜像',
  'console.vmInstances.field.profile': '规格档',
  'console.vmInstances.field.vcpu': 'vCPU',
  'console.vmInstances.field.memory': '内存（MiB）',
  'console.vmInstances.field.disk': '磁盘（MiB）',
  'console.vmInstances.field.assurance': '最低隔离等级',
  'console.vmInstances.field.runtimeKind': '运行时引擎',
  'console.vmInstances.field.capabilities': '所需能力',
  'console.vmInstances.field.autoStart': '自动启动',
  'console.vmInstances.field.expiresAt': '到期时间',
  'console.vmInstances.field.workspaceId': '工作区 ID',

  'console.vmInstances.hint.name': '最多 {{max}} 个字符。同一账号下的虚拟机实例名称不可重复。',
  'console.vmInstances.hint.baseImage': '运行时启动所用的容器镜像。',
  'console.vmInstances.hint.baseImageImmutable': '实例创建后基础镜像即固定，保存时不会提交该字段。',
  'console.vmInstances.hint.profile': '下方规格将按该档位信封校验。',
  'console.vmInstances.hint.vcpu': '{{profile}}型为 {{min}}–{{max}} vCPU。',
  'console.vmInstances.hint.memory': '{{profile}}型为 {{min}}–{{max}} MiB。',
  'console.vmInstances.hint.disk': '{{profile}}型为 {{min}}–{{max}} MiB。',
  'console.vmInstances.hint.assurance': '隔离等级弱于该要求的主机无法承载此实例。',
  'console.vmInstances.hint.runtimeKind': '决定实际运行方式。Docker 共享宿主内核，QEMU 为完整虚拟机；可选隔离等级随之收敛。',
  'console.vmInstances.hint.runtimeKindImmutable': '实例创建后运行时引擎即固定，保存时不会提交该字段。',
  'console.vmInstances.hint.capabilities': '最多 {{max}} 项。全部不勾选即按规格档默认。',
  'console.vmInstances.hint.autoStart': '开通完成后立即启动运行时。',
  'console.vmInstances.hint.expiresAt': '留空表示永不过期。此处按本地时区填写，存储为 UTC。',
  'console.vmInstances.hint.workspaceId': '可选。将该虚拟机关联到某个工作区。',

  'console.vmInstances.placeholder.name': 'agent-vm-01',
  'console.vmInstances.placeholder.baseImage': 'sdkwork/sandbox-runtime:latest',
  'console.vmInstances.placeholder.workspaceId': 'ws_…',

  // --------------------------------------------------------------- validation
  'console.vmInstances.validate.nameRequired': '请填写名称。',
  'console.vmInstances.validate.nameTooLong': '名称最多 {{max}} 个字符。',
  'console.vmInstances.validate.baseImageRequired': '请填写基础镜像。',
  'console.vmInstances.validate.baseImageTooLong': '基础镜像最多 {{max}} 个字符。',
  'console.vmInstances.validate.vcpuNotNumber': '请输入整数 vCPU 数量。',
  'console.vmInstances.validate.vcpuOutOfProfile': '{{profile}}型的 vCPU 需在 {{min}}–{{max}} 之间。',
  'console.vmInstances.validate.memoryNotNumber': '请输入整数 MiB 数量。',
  'console.vmInstances.validate.memoryOutOfProfile': '{{profile}}型的内存需在 {{min}}–{{max}} MiB 之间。',
  'console.vmInstances.validate.diskNotNumber': '请输入整数 MiB 数量。',
  'console.vmInstances.validate.diskOutOfProfile': '{{profile}}型的磁盘需在 {{min}}–{{max}} MiB 之间。',
  'console.vmInstances.validate.expiresAtInvalid': '请输入有效的日期与时间。',
  'console.vmInstances.validate.insufficientAssurance': '所选运行时引擎无法提供该隔离等级，请提高引擎或降低要求。',

  // ------------------------------------------------------------------- delete
  'console.vmInstances.dialog.deleteTitle': '删除虚拟机实例？',
  'console.vmInstances.dialog.deleteDescription': '确认删除“{{name}}”？删除后记录不可恢复。',
  'console.vmInstances.dialog.deleteBlocked': '运行中的实例不可删除，请先挂起或终止。',
};
