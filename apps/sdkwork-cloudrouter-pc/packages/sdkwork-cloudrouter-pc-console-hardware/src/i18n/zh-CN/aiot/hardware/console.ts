/**
 * Smart Hardware console catalog - Simplified Chinese (zh-CN).
 *
 * Mirror of `en-US/aiot/hardware/console.ts`: same key set, same interpolation
 * placeholders.
 */

export const hardwareConsoleMessagesZh: Record<string, string> = {
  // ------------------------------------------------------------------ sidebar
  'console.menu.group.hardware': '智能硬件',
  'console.menu.hardwareDevices': '我的硬件',
  'console.menu.hardwareFirmware': '固件下载',

  // ------------------------------------------------------------------- common
  'console.hardware.nav.label': '智能硬件分区',
  'console.hardware.common.required': '该项为必填。',
  'console.hardware.common.registered': '设备已注册。',
  'console.hardware.common.refresh': '刷新',
  'console.hardware.common.close': '关闭',
  'console.hardware.common.cancel': '取消',
  'console.hardware.common.confirm': '确认',
  'console.hardware.common.saving': '保存中...',
  'console.hardware.common.loading': '正在加载你的硬件...',
  'console.hardware.common.loadMore': '加载更多',
  'console.hardware.common.retry': '重试',
  'console.hardware.common.count': '{{count}} 项',
  'console.hardware.common.noMatches': '当前检索条件下没有匹配项。',
  'console.hardware.common.selectPlaceholder': '请选择',

  // ------------------------------------------------------------------- errors
  'console.hardware.error.conflict': '请求未能完成。',
  'console.hardware.error.validation': '请检查提交的内容。',
  'console.hardware.error.notFound': '该设备已不可用。',
  'console.hardware.error.forbidden': '当前账号缺少执行该操作所需的 IoT 权限。',
  'console.hardware.error.unauthorized': '登录状态已失效，请重新登录。',
  'console.hardware.error.unavailable': 'AIoT 服务暂不可用，请稍后重试。',

  // -------------------------------------------------------------------- health
  'console.hardware.health.healthy': '在线',
  'console.hardware.health.warning': '告警',
  'console.hardware.health.critical': '严重',
  'console.hardware.health.offline': '离线',

  // -------------------------------------------------------------- device list
  'console.hardware.list.title': '我的智能硬件',
  'console.hardware.list.description': '你注册的每一台终端设备：连接状态、芯片家族，以及关联的智能体。',
  'console.hardware.list.register': '注册设备',
  'console.hardware.list.searchPlaceholder': '搜索设备、产品、芯片或智能体',
  'console.hardware.list.empty': '尚未注册设备。',
  'console.hardware.list.emptyHint': '注册第一台终端设备后即可在此管理。',
  'console.hardware.list.readOnlyHint': '当前账号仅可查看设备，无法注册设备。请联系租户管理员授予 IoT 设备写权限。',
  'console.hardware.list.stat.total': '我的设备',
  'console.hardware.list.stat.online': '在线',
  'console.hardware.list.stat.attention': '需关注',
  'console.hardware.list.stat.bound': '已关联智能体',
  'console.hardware.list.column.chip': '芯片',
  'console.hardware.list.column.lastSeen': '最后在线',
  'console.hardware.list.agentBound': '智能体：{{name}}',
  'console.hardware.list.agentEmpty': '未关联智能体',
  'console.hardware.list.open': '打开设备',
  'console.hardware.list.firmwareLink': '下载固件',

  // ---------------------------------------------------------- register device
  'console.hardware.register.title': '注册设备',
  'console.hardware.register.description': '设备标识使用设备标签上的硬件序列号或预置 ID。',
  'console.hardware.register.deviceId': '设备 ID',
  'console.hardware.register.deviceIdHint': '硬件序列号或预置标识，注册后不可修改。',
  'console.hardware.register.displayName': '展示名称',
  'console.hardware.register.product': '所属产品',
  'console.hardware.register.productHint': '产品决定了能力模型与配置 Schema。',
  'console.hardware.register.noProducts': '暂无可注册的产品，请联系管理员先发布产品。',
  'console.hardware.register.clientId': '客户端 ID',
  'console.hardware.register.chipFamily': '芯片家族',

  // -------------------------------------------------------------- device page
  'console.hardware.device.title': '设备',
  'console.hardware.device.identity': '设备信息',
  'console.hardware.device.renameLabel': '设备名称',
  'console.hardware.device.renameSave': '重命名',
  'console.hardware.device.renamed': '设备已重命名。',
  'console.hardware.device.deviceId': '设备 ID',
  'console.hardware.device.product': '所属产品',
  'console.hardware.device.lastSeen': '最后在线',
  'console.hardware.device.agentTitle': '关联智能体',
  'console.hardware.device.agentDescription': '操作该设备的智能体。可让智能体上报状态、执行例行任务或解释告警。',
  'console.hardware.device.agentSelect': '智能体',
  'console.hardware.device.agentNone': '不关联',
  'console.hardware.device.agentSave': '保存关联',
  'console.hardware.device.agentReadOnly': '当前账号仅可查看关联关系，无法修改。请联系租户管理员授予 IoT 设备写权限。',
  'console.hardware.device.agentBound': '由 {{name}} 操作',
  'console.hardware.device.agentSaved': '智能体关联已保存。',
  'console.hardware.device.twinTitle': '设备孪生',
  'console.hardware.device.twinDesired': '期望状态',
  'console.hardware.device.twinReported': '上报状态',
  'console.hardware.device.commandTitle': '下发命令',
  'console.hardware.device.commandDescription': '命令会先按设备能力模型校验，再下发到设备。',
  'console.hardware.device.commandCapability': '能力名称',
  'console.hardware.device.commandName': '命令名称',
  'console.hardware.device.commandSend': '下发命令',
  'console.hardware.device.commandSent': '命令已进入下发队列。',
  'console.hardware.device.commandReadOnly': '当前账号无设备命令执行权限。',
  'console.hardware.device.eventsTitle': '最近设备事件',
  'console.hardware.device.eventsDescription': '该设备记录在协议层的流量。',
  'console.hardware.device.eventsEmpty': '该设备暂无事件记录。',

  // ------------------------------------------------------------ firmware page
  'console.hardware.firmware.title': '固件下载',
  'console.hardware.firmware.description': '面向你设备产品的已发布固件，包含每个固件的校验值与目标芯片家族。',
  'console.hardware.firmware.searchPlaceholder': '搜索固件、版本或芯片',
  'console.hardware.firmware.empty': '尚未发布固件。',
  'console.hardware.firmware.emptyHint': '管理员发布固件资产后，将在此显示。',
  'console.hardware.firmware.column.artifact': '固件',
  'console.hardware.firmware.column.version': '版本',
  'console.hardware.firmware.column.target': '目标',
  'console.hardware.firmware.column.checksum': 'SHA-256',
  'console.hardware.firmware.column.status': '状态',
  'console.hardware.firmware.column.download': '下载',
  'console.hardware.firmware.download': '下载',
  'console.hardware.firmware.managedOnly': '受管下发',
  'console.hardware.firmware.hint': '刷写前请校验摘要。没有直链的固件将通过设备升级通道下发。',
};
