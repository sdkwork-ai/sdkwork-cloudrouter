/**
 * Virtual Machines console catalog - English (en-US).
 *
 * Fragment path follows the repository i18n standard:
 * `<locale>/<domain>/<capability>/<fragment>.ts` → `en-US/compute/vm-instances/console.ts`.
 * Composed by `src/i18n/index.ts` and then by `@sdkwork/cloudrouter-pc-i18n`.
 *
 * `sdkwork-sandbox` owns the VM instance lifecycle; this catalog only carries the
 * console copy the Cloud Router host renders for it. Every key must exist in the
 * zh-CN mirror (the host catalog merge aborts on a locale key mismatch).
 */

export const vmInstancesConsoleMessagesEn: Record<string, string> = {
  // ------------------------------------------------------------------ sidebar
  'console.menu.group.vmInstances': 'Virtual machines',
  'console.menu.vmInstances': 'VM instances',

  // --------------------------------------------------------------------- page
  'console.vmInstances.title': 'VM instances',
  'console.vmInstances.description':
    'The virtual machines you provisioned — one isolated runtime each, sized and isolated the way you declared it.',
  'console.vmInstances.ownerScope':
    'Only the VM instances you own are listed here. Another account\u2019s instances are never shown on this page.',
  'console.vmInstances.loading': 'Loading VM instances…',

  // ------------------------------------------------------------------ actions
  'console.vmInstances.actions.refresh': 'Refresh',
  'console.vmInstances.actions.create': 'Provision VM',
  'console.vmInstances.actions.edit': 'Edit',
  'console.vmInstances.actions.delete': 'Delete',
  'console.vmInstances.actions.save': 'Save changes',
  'console.vmInstances.actions.cancel': 'Cancel',
  'console.vmInstances.actions.close': 'Close',
  'console.vmInstances.actions.retry': 'Retry',

  // ------------------------------------------------------------------ columns
  'console.vmInstances.column.name': 'Name',
  'console.vmInstances.column.state': 'State',
  'console.vmInstances.column.profile': 'Profile',
  'console.vmInstances.column.resources': 'Resources',
  'console.vmInstances.column.capabilities': 'Required capabilities',
  'console.vmInstances.column.expiresAt': 'Expires',
  'console.vmInstances.column.actions': 'Actions',

  // --------------------------------------------------------------- vocabulary
  'console.vmInstances.state.requested': 'Requested',
  'console.vmInstances.state.active': 'Active',
  'console.vmInstances.state.suspended': 'Suspended',
  'console.vmInstances.state.terminated': 'Terminated',
  'console.vmInstances.state.failed': 'Failed',

  'console.vmInstances.profile.standard': 'Standard',
  'console.vmInstances.profile.memory_optimized': 'Memory optimized',
  'console.vmInstances.profile.compute_optimized': 'Compute optimized',

  'console.vmInstances.assurance.host_user': 'Host user',
  'console.vmInstances.assurance.container': 'Container',
  'console.vmInstances.assurance.user_space_kernel': 'User-space kernel',
  'console.vmInstances.assurance.micro_vm': 'Micro VM',
  'console.vmInstances.assurance.dedicated_vm': 'Dedicated VM',

  'console.vmInstances.capability.terminal': 'Terminal',
  'console.vmInstances.capability.filesystem': 'Filesystem',
  'console.vmInstances.capability.git': 'Git',
  'console.vmInstances.capability.build': 'Build',
  'console.vmInstances.capability.browser': 'Browser',
  'console.vmInstances.capability.port_forward': 'Port forward',
  'console.vmInstances.capability.mcp_transport': 'MCP transport',
  'console.vmInstances.capability.environment': 'Environment',
  'console.vmInstances.capability.none': 'Profile default',
  'console.vmInstances.capability.overflow': '+{{count}} more',

  'console.vmInstances.resources.summary': '{{vcpu}} vCPU · {{memory}} MiB · {{disk}} MiB',
  'console.vmInstances.expiresAt.never': 'Never',

  // ------------------------------------------------------------------- filter
  'console.vmInstances.filter.label': 'Filter by state',
  'console.vmInstances.filter.all': 'All states',
  'console.vmInstances.filter.clear': 'Clear filter',
  'console.vmInstances.filter.emptyTitle': 'No VM instance is in this state',
  'console.vmInstances.filter.emptyDescription': 'Clear the filter to see every VM instance you own.',

  // -------------------------------------------------------------------- empty
  'console.vmInstances.empty.title': 'No VM instances yet',
  'console.vmInstances.empty.description':
    'Provision one to give your agents an isolated runtime with the CPU, memory, and capabilities you specify.',
  'console.vmInstances.empty.action': 'Provision VM',

  // ------------------------------------------------------------------ errors
  'console.vmInstances.error.load': 'The VM instance list is unavailable.',
  'console.vmInstances.error.unavailable':
    'The request failed before the listing could be read. Retrying loads your VM instances again.',
  'console.vmInstances.error.create': 'The VM instance could not be provisioned.',
  'console.vmInstances.error.update': 'The VM instance could not be updated.',
  'console.vmInstances.error.delete': 'The VM instance could not be deleted.',

  // -------------------------------------------------------------- pagination
  'console.vmInstances.pagination.previous': 'Previous',
  'console.vmInstances.pagination.next': 'Next',
  'console.vmInstances.pagination.pageInfo': 'Page {{page}} of {{pages}} · {{total}} total',
  'console.vmInstances.pagination.pageSize': 'Rows per page',

  // ------------------------------------------------------------------ drawer
  'console.vmInstances.drawer.createTitle': 'Provision VM instance',
  'console.vmInstances.drawer.createDescription':
    'Size the runtime and declare how it must be isolated and what it must be able to do.',
  'console.vmInstances.drawer.editTitle': 'Edit VM instance',
  'console.vmInstances.drawer.editDescription': 'Editing “{{name}}”.',

  'console.vmInstances.section.shape': 'Runtime shape',
  'console.vmInstances.section.isolation': 'Isolation and capabilities',
  'console.vmInstances.section.lifecycle': 'Lifecycle',

  // ------------------------------------------------------------------- fields
  'console.vmInstances.field.optional': 'Optional',
  'console.vmInstances.field.name': 'Name',
  'console.vmInstances.field.baseImage': 'Base image',
  'console.vmInstances.field.profile': 'Profile',
  'console.vmInstances.field.vcpu': 'vCPU',
  'console.vmInstances.field.memory': 'Memory (MiB)',
  'console.vmInstances.field.disk': 'Disk (MiB)',
  'console.vmInstances.field.assurance': 'Minimum isolation assurance',
  'console.vmInstances.field.capabilities': 'Required capabilities',
  'console.vmInstances.field.autoStart': 'Start automatically',
  'console.vmInstances.field.expiresAt': 'Expires at',
  'console.vmInstances.field.workspaceId': 'Workspace ID',

  'console.vmInstances.hint.name': 'Up to {{max}} characters. Must be unique among the VM instances you own.',
  'console.vmInstances.hint.baseImage': 'The container image the runtime boots from.',
  'console.vmInstances.hint.baseImageImmutable':
    'The base image is fixed once the instance exists and is not sent on save.',
  'console.vmInstances.hint.profile': 'The envelope the shape below is validated against.',
  'console.vmInstances.hint.vcpu': '{{min}}–{{max}} vCPU for the {{profile}} profile.',
  'console.vmInstances.hint.memory': '{{min}}–{{max}} MiB for the {{profile}} profile.',
  'console.vmInstances.hint.disk': '{{min}}–{{max}} MiB for the {{profile}} profile.',
  'console.vmInstances.hint.assurance': 'A host whose isolation is weaker than this cannot run the instance.',
  'console.vmInstances.hint.capabilities':
    'Up to {{max}} entries. Leave all unchecked to request the profile default.',
  'console.vmInstances.hint.autoStart': 'Bring the runtime up as soon as provisioning completes.',
  'console.vmInstances.hint.expiresAt':
    'Leave empty for an instance that never expires. Times are entered in your local time zone and stored as UTC.',
  'console.vmInstances.hint.workspaceId': 'Optional. Attach the VM to a workspace.',

  'console.vmInstances.placeholder.name': 'agent-vm-01',
  'console.vmInstances.placeholder.baseImage': 'sdkwork/sandbox-runtime:latest',
  'console.vmInstances.placeholder.workspaceId': 'ws_…',

  // --------------------------------------------------------------- validation
  'console.vmInstances.validate.nameRequired': 'Name is required.',
  'console.vmInstances.validate.nameTooLong': 'Name must be at most {{max}} characters.',
  'console.vmInstances.validate.baseImageRequired': 'Base image is required.',
  'console.vmInstances.validate.baseImageTooLong': 'Base image must be at most {{max}} characters.',
  'console.vmInstances.validate.vcpuNotNumber': 'Enter a whole number of vCPUs.',
  'console.vmInstances.validate.vcpuOutOfProfile':
    'vCPU must be between {{min}} and {{max}} for the {{profile}} profile.',
  'console.vmInstances.validate.memoryNotNumber': 'Enter a whole number of MiB.',
  'console.vmInstances.validate.memoryOutOfProfile':
    'Memory must be between {{min}} and {{max}} MiB for the {{profile}} profile.',
  'console.vmInstances.validate.diskNotNumber': 'Enter a whole number of MiB.',
  'console.vmInstances.validate.diskOutOfProfile':
    'Disk must be between {{min}} and {{max}} MiB for the {{profile}} profile.',
  'console.vmInstances.validate.expiresAtInvalid': 'Enter a valid date and time.',

  // ------------------------------------------------------------------- delete
  'console.vmInstances.dialog.deleteTitle': 'Delete VM instance?',
  'console.vmInstances.dialog.deleteDescription':
    'Delete “{{name}}”? This removes the record and cannot be undone.',
  'console.vmInstances.dialog.deleteBlocked': 'A running instance cannot be deleted. Suspend or terminate it first.',
};
