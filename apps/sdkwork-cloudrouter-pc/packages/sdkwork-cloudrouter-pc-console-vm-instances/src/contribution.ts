import { Server } from 'lucide-react';

/**
 * Virtual Machines console contribution.
 *
 * Data-only: the console shell spreads {@link VM_INSTANCES_CONSOLE_NAV_GROUP}
 * into its sidebar directly below the Smart Hardware group, and the host route
 * table mounts {@link VM_INSTANCES_CONSOLE_PATH}. Keeping this file free of page
 * imports means the shell bundle does not pull the VM instance page chunk.
 */

/** The single console page of the group: `/console/vm-instances`. */
export const VM_INSTANCES_CONSOLE_PATH = '/console/vm-instances';

/** Sidebar insertion anchor: the group renders directly after Smart Hardware. */
export const VM_INSTANCES_CONSOLE_NAV_AFTER_GROUP_KEY = 'console.menu.group.hardware';

export const VM_INSTANCES_CONSOLE_NAV_GROUP = {
  groupKey: 'console.menu.group.vmInstances',
  fallbackLabel: 'Virtual machines',
  items: [
    {
      path: VM_INSTANCES_CONSOLE_PATH,
      labelKey: 'console.menu.vmInstances',
      fallbackLabel: 'VM instances',
      icon: Server,
    },
  ],
} as const;

export const VM_INSTANCES_CONSOLE_MODULE_ICON = Server;
