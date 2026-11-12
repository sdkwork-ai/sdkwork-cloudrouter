/**
 * Smart Hardware console catalog - English (en-US).
 *
 * Fragment path follows the repository i18n standard:
 * `<locale>/<domain>/<capability>/<fragment>.ts` → `en-US/aiot/hardware/console.ts`.
 * Composed by `src/i18n/index.ts` and then by `@sdkwork/cloudrouter-pc-i18n`.
 */

export const hardwareConsoleMessagesEn: Record<string, string> = {
  // ------------------------------------------------------------------ sidebar
  'console.menu.group.hardware': 'Smart Hardware',
  'console.menu.hardwareDevices': 'My hardware',
  'console.menu.hardwareFirmware': 'Firmware downloads',

  // ------------------------------------------------------------------- common
  'console.hardware.nav.label': 'Smart hardware sections',
  'console.hardware.common.required': 'This field is required.',
  'console.hardware.common.registered': 'Device registered.',
  'console.hardware.common.refresh': 'Refresh',
  'console.hardware.common.close': 'Close',
  'console.hardware.common.cancel': 'Cancel',
  'console.hardware.common.confirm': 'Confirm',
  'console.hardware.common.saving': 'Saving...',
  'console.hardware.common.loading': 'Loading your hardware...',
  'console.hardware.common.loadMore': 'Load more',
  'console.hardware.common.retry': 'Retry',
  'console.hardware.common.count': '{{count}} item(s)',
  'console.hardware.common.noMatches': 'Nothing matches the current search.',
  'console.hardware.common.selectPlaceholder': 'Select an option',

  // ------------------------------------------------------------------- errors
  'console.hardware.error.conflict': 'The request could not be completed.',
  'console.hardware.error.validation': 'Please review the submitted values.',
  'console.hardware.error.notFound': 'This device is no longer available.',
  'console.hardware.error.forbidden': 'Your account is missing the IoT permission for this action.',
  'console.hardware.error.unauthorized': 'Your session has expired. Sign in again.',
  'console.hardware.error.unavailable': 'The AIoT service is unavailable. Try again shortly.',

  // -------------------------------------------------------------------- health
  'console.hardware.health.healthy': 'Online',
  'console.hardware.health.warning': 'Warning',
  'console.hardware.health.critical': 'Critical',
  'console.hardware.health.offline': 'Offline',

  // -------------------------------------------------------------- device list
  'console.hardware.list.title': 'My smart hardware',
  'console.hardware.list.description':
    'Every terminal device you registered: connectivity, chip family, and the agent bound to it.',
  'console.hardware.list.register': 'Register device',
  'console.hardware.list.searchPlaceholder': 'Search device, product, chip, or agent',
  'console.hardware.list.empty': 'No device registered yet.',
  'console.hardware.list.emptyHint': 'Register your first terminal device to manage it from here.',
  'console.hardware.list.readOnlyHint':
    'Your account can view devices but cannot register them. Ask a tenant administrator for the IoT device write permission.',
  'console.hardware.list.stat.total': 'My devices',
  'console.hardware.list.stat.online': 'Online',
  'console.hardware.list.stat.attention': 'Need attention',
  'console.hardware.list.stat.bound': 'Agent bound',
  'console.hardware.list.column.chip': 'Chip',
  'console.hardware.list.column.lastSeen': 'Last seen',
  'console.hardware.list.agentBound': 'Agent: {{name}}',
  'console.hardware.list.agentEmpty': 'No agent bound',
  'console.hardware.list.open': 'Open device',
  'console.hardware.list.firmwareLink': 'Download firmware',

  // ---------------------------------------------------------- register device
  'console.hardware.register.title': 'Register a device',
  'console.hardware.register.description':
    'The device identity is the hardware serial or the provisioned id on the device label.',
  'console.hardware.register.deviceId': 'Device ID',
  'console.hardware.register.deviceIdHint': 'Hardware serial or provisioned identity; it cannot be renamed later.',
  'console.hardware.register.displayName': 'Display name',
  'console.hardware.register.product': 'Product',
  'console.hardware.register.productHint': 'The product defines the capability model and settings schema.',
  'console.hardware.register.noProducts':
    'No product is available to register against. Ask an administrator to publish a product first.',
  'console.hardware.register.clientId': 'Client ID',
  'console.hardware.register.chipFamily': 'Chip family',

  // -------------------------------------------------------------- device page
  'console.hardware.device.title': 'Device',
  'console.hardware.device.identity': 'Device identity',
  'console.hardware.device.renameLabel': 'Device name',
  'console.hardware.device.renameSave': 'Rename',
  'console.hardware.device.renamed': 'Device renamed.',
  'console.hardware.device.deviceId': 'Device ID',
  'console.hardware.device.product': 'Product',
  'console.hardware.device.lastSeen': 'Last seen',
  'console.hardware.device.agentTitle': 'Bound agent',
  'console.hardware.device.agentDescription':
    'The agent that operates this device. Ask the agent to report state, run a routine, or explain an alert.',
  'console.hardware.device.agentSelect': 'Agent',
  'console.hardware.device.agentNone': 'No agent',
  'console.hardware.device.agentSave': 'Save binding',
  'console.hardware.device.agentReadOnly':
    'Your account can view the binding but cannot change it. Ask a tenant administrator for the IoT device write permission.',
  'console.hardware.device.agentBound': 'Operated by {{name}}',
  'console.hardware.device.agentSaved': 'Agent binding saved.',
  'console.hardware.device.twinTitle': 'Device twin',
  'console.hardware.device.twinDesired': 'Desired state',
  'console.hardware.device.twinReported': 'Reported state',
  'console.hardware.device.commandTitle': 'Send a command',
  'console.hardware.device.commandDescription':
    'Commands are validated against the device capability model before delivery.',
  'console.hardware.device.commandCapability': 'Capability name',
  'console.hardware.device.commandName': 'Command name',
  'console.hardware.device.commandSend': 'Send command',
  'console.hardware.device.commandSent': 'Command queued for delivery.',
  'console.hardware.device.commandReadOnly': 'Your account is not allowed to execute device commands.',
  'console.hardware.device.eventsTitle': 'Recent device events',
  'console.hardware.device.eventsDescription': 'Layer traffic recorded for this device.',
  'console.hardware.device.eventsEmpty': 'No event recorded for this device yet.',

  // ------------------------------------------------------------ firmware page
  'console.hardware.firmware.title': 'Firmware downloads',
  'console.hardware.firmware.description':
    'Published firmware for your device products, with the checksum and target chip family of every artifact.',
  'console.hardware.firmware.searchPlaceholder': 'Search artifact, version, or chip',
  'console.hardware.firmware.empty': 'No firmware published yet.',
  'console.hardware.firmware.emptyHint': 'Firmware appears here once an administrator publishes an artifact.',
  'console.hardware.firmware.column.artifact': 'Artifact',
  'console.hardware.firmware.column.version': 'Version',
  'console.hardware.firmware.column.target': 'Target',
  'console.hardware.firmware.column.checksum': 'SHA-256',
  'console.hardware.firmware.column.status': 'Status',
  'console.hardware.firmware.column.download': 'Download',
  'console.hardware.firmware.download': 'Download',
  'console.hardware.firmware.managedOnly': 'Managed delivery',
  'console.hardware.firmware.hint':
    'Verify the checksum before flashing. Artifacts without a direct link are delivered by the device update channel.',
};
