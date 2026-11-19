/**
 * Cloud Router user-console Virtual Machines group.
 *
 * The VM instance capability itself — the `sandbox_instance` registry, its
 * lifecycle, and its app-api face — is owned by sdkwork-sandbox. This package
 * contributes:
 *
 * - the console sidebar group + route constant (`./contribution`),
 * - the Cloud Router session-bound sandbox client adapter (the transport lives in
 *   `@sdkwork/cloudroutes-pc-commons/sandbox-instances-client`),
 * - the localized copy the console renders (`./i18n`),
 * - the `VmInstancesConsoleView` host element mounted at
 *   `/console/vm-instances`.
 */

export {
  VmInstancesConsoleView,
  type VmInstancesConsoleViewProps,
} from './VmInstancesConsoleView.tsx';
export {
  VM_INSTANCES_CONSOLE_MODULE_ICON,
  VM_INSTANCES_CONSOLE_NAV_AFTER_GROUP_KEY,
  VM_INSTANCES_CONSOLE_NAV_GROUP,
  VM_INSTANCES_CONSOLE_PATH,
} from './contribution.ts';
