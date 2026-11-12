/**
 * Admin module registry shared by the admin shell and `/admin/site`.
 *
 * The shell owns how a module renders (icon, menu, guarded routes); this table owns the
 * **stable identity, order and operator-facing copy** of every module the host can show in
 * its header. Keeping it data-only means the site-settings package can render the module
 * manager without importing the shell's React tree, and the runtime can normalize a stored
 * document before either surface reads it.
 *
 * Adding a module is intentionally a three-step change:
 *   1. add the entry here (the default header position is array order),
 *   2. add its menu/route contribution to the admin shell,
 *   3. add the `admin.siteSettings.adminModules.items.<id>.*` copy to both locales.
 *
 * A stored document that predates the new entry is upgraded in place by
 * `normalizeAdminModuleSettings`: the missing module is appended, enabled and visible, so
 * an operator who never opened this page sees the module exactly as a fresh deployment does.
 */

export const ADMIN_MODULE_SETTINGS_VERSION = 1;

export const ADMIN_MODULE_CATALOG = [
  {
    id: 'home',
    labelKey: 'admin.siteSettings.adminModules.items.home.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.home.description',
  },
  {
    id: 'iam',
    labelKey: 'admin.siteSettings.adminModules.items.iam.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.iam.description',
  },
  {
    id: 'rtc',
    labelKey: 'admin.siteSettings.adminModules.items.rtc.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.rtc.description',
  },
  {
    id: 'tradeCenter',
    labelKey: 'admin.siteSettings.adminModules.items.tradeCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.tradeCenter.description',
  },
  {
    id: 'notifyCenter',
    labelKey: 'admin.siteSettings.adminModules.items.notifyCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.notifyCenter.description',
  },
  {
    id: 'membershipCenter',
    labelKey: 'admin.siteSettings.adminModules.items.membershipCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.membershipCenter.description',
  },
  {
    id: 'communityCenter',
    labelKey: 'admin.siteSettings.adminModules.items.communityCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.communityCenter.description',
  },
  {
    id: 'courseCenter',
    labelKey: 'admin.siteSettings.adminModules.items.courseCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.courseCenter.description',
  },
  {
    id: 'rechargeCenter',
    labelKey: 'admin.siteSettings.adminModules.items.rechargeCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.rechargeCenter.description',
  },
  {
    id: 'marketingCenter',
    labelKey: 'admin.siteSettings.adminModules.items.marketingCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.marketingCenter.description',
  },
  {
    id: 'partnerCenter',
    labelKey: 'admin.siteSettings.adminModules.items.partnerCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.partnerCenter.description',
  },
  {
    id: 'paymentCenter',
    labelKey: 'admin.siteSettings.adminModules.items.paymentCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.paymentCenter.description',
  },
  {
    id: 'storageCenter',
    labelKey: 'admin.siteSettings.adminModules.items.storageCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.storageCenter.description',
  },
  {
    id: 'documentCenter',
    labelKey: 'admin.siteSettings.adminModules.items.documentCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.documentCenter.description',
  },
  {
    id: 'hardwareCenter',
    labelKey: 'admin.siteSettings.adminModules.items.hardwareCenter.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.hardwareCenter.description',
  },
  {
    id: 'operations',
    labelKey: 'admin.siteSettings.adminModules.items.operations.label',
    descriptionKey: 'admin.siteSettings.adminModules.items.operations.description',
  },
] as const;

export type AdminModuleCatalogEntry = (typeof ADMIN_MODULE_CATALOG)[number];
export type AdminModuleId = AdminModuleCatalogEntry['id'];

export const ADMIN_MODULE_IDS: readonly AdminModuleId[] = ADMIN_MODULE_CATALOG.map((entry) => entry.id);

/**
 * The module that hosts `/admin/site` itself. It can be hidden from the header, but it
 * cannot be disabled: doing so would remove the only navigation entry that can turn any
 * other module back on.
 */
export const REQUIRED_ADMIN_MODULE_ID: AdminModuleId = 'operations';

export interface AdminModuleSetting {
  id: AdminModuleId;
  /** Provisioned in this deployment. A disabled module is hidden and its routes are blocked. */
  enabled: boolean;
  /** Shown in the admin header. Only meaningful while the module is enabled. */
  visible: boolean;
}

export interface AdminModuleSettings {
  version: typeof ADMIN_MODULE_SETTINGS_VERSION;
  /** Header order, shared by every module the operator may have disabled. */
  modules: AdminModuleSetting[];
}

export type AdminModuleValidationIssue =
  | 'noEnabledModules'
  | 'noVisibleModules'
  | 'requiredModuleDisabled';

const ADMIN_MODULE_ID_SET = new Set<string>(ADMIN_MODULE_IDS);
const REQUIRED_ADMIN_MODULE_ID_SET = new Set<string>([REQUIRED_ADMIN_MODULE_ID]);

export function isAdminModuleId(value: unknown): value is AdminModuleId {
  return typeof value === 'string' && ADMIN_MODULE_ID_SET.has(value);
}

export function adminModuleCatalogEntry(id: AdminModuleId): AdminModuleCatalogEntry {
  const entry = ADMIN_MODULE_CATALOG.find((candidate) => candidate.id === id);
  // The id type is derived from the catalog, so this is unreachable for well-typed callers.
  // Keep the explicit throw so a runtime value read from JSON cannot silently produce `undefined`.
  if (!entry) {
    throw new Error(`Unknown admin module id: ${id}`);
  }
  return entry;
}

/** A fresh document with every module enabled, visible, in catalog order. */
export function createDefaultAdminModuleSettings(): AdminModuleSettings {
  return {
    version: ADMIN_MODULE_SETTINGS_VERSION,
    modules: ADMIN_MODULE_IDS.map((id) => ({ id, enabled: true, visible: true })),
  };
}

/**
 * Coerces a stored or wire value into the current document shape.
 *
 * Missing fields are upgraded to the safe default, duplicate ids keep their first position,
 * unknown ids are dropped (an older portal cannot render a module it does not know), and
 * entries the catalog added after the payload was written are appended enabled + visible.
 * The result always contains every catalog id, so callers never have to special-case a gap.
 */
export function normalizeAdminModuleSettings(value: unknown): AdminModuleSettings {
  if (!isRecord(value) || !Array.isArray(value.modules)) {
    return createDefaultAdminModuleSettings();
  }
  if (value.version !== undefined && value.version !== ADMIN_MODULE_SETTINGS_VERSION) {
    // A document from a future schema is not safe to reinterpret field-by-field.
    return createDefaultAdminModuleSettings();
  }

  const modules: AdminModuleSetting[] = [];
  const seen = new Set<AdminModuleId>();
  for (const candidate of value.modules) {
    if (!isRecord(candidate) || !isAdminModuleId(candidate.id) || seen.has(candidate.id)) {
      continue;
    }
    seen.add(candidate.id);
    modules.push({
      id: candidate.id,
      enabled: readBoolean(candidate.enabled, true),
      visible: readBoolean(candidate.visible, true),
    });
  }

  if (modules.length === 0) {
    return createDefaultAdminModuleSettings();
  }

  // New modules land at the end rather than at their catalog position: appending is the only
  // choice that cannot silently move an order the operator already arranged.
  for (const id of ADMIN_MODULE_IDS) {
    if (!seen.has(id)) {
      modules.push({ id, enabled: true, visible: true });
    }
  }

  return { version: ADMIN_MODULE_SETTINGS_VERSION, modules };
}

/**
 * The document the admin shell renders from.
 *
 * Unlike `normalizeAdminModuleSettings`, this applies two safety nets that keep a corrupt or
 * hand-edited payload from bricking the backend:
 *   - the required `operations` module is always enabled;
 *   - if no module is both enabled and visible, `operations` is shown, so there is always a
 *     way back to `/admin/site`.
 *
 * The editor keeps using the raw normalized document so it can surface the invalid state and
 * ask the operator to fix it; only the navigation uses this resolved view.
 */
export function resolveAdminModuleSettings(value: unknown): AdminModuleSettings {
  const normalized = normalizeAdminModuleSettings(value);
  const modules = normalized.modules.map((entry) => ({ ...entry }));

  const required = modules.find((entry) => REQUIRED_ADMIN_MODULE_ID_SET.has(entry.id));
  if (required) {
    required.enabled = true;
    if (!modules.some((entry) => entry.enabled && entry.visible)) {
      required.visible = true;
    }
  }

  return { version: ADMIN_MODULE_SETTINGS_VERSION, modules };
}

/** Counts what the operator will actually see: visible only means something while enabled. */
export function countAdminModuleSettings(settings: AdminModuleSettings): {
  enabled: number;
  visible: number;
  hidden: number;
  disabled: number;
} {
  let enabled = 0;
  let visible = 0;
  for (const module of settings.modules) {
    if (module.enabled) {
      enabled += 1;
    }
    if (module.enabled && module.visible) {
      visible += 1;
    }
  }
  return {
    enabled,
    visible,
    hidden: enabled - visible,
    disabled: settings.modules.length - enabled,
  };
}

/**
 * Returns every blocking problem with a document.
 *
 * The editor disables the save button while this is non-empty; the same rules are therefore
 * also what the operator reads in the inline explanation. They are deliberately about the
 * document as a whole, not about one switch, because hiding the last visible module is only
 * wrong in combination with the rest of the list.
 */
export function validateAdminModuleSettings(settings: AdminModuleSettings): AdminModuleValidationIssue[] {
  const issues: AdminModuleValidationIssue[] = [];
  const required = settings.modules.find((entry) => entry.id === REQUIRED_ADMIN_MODULE_ID);
  if (!required || !required.enabled) {
    issues.push('requiredModuleDisabled');
  }
  if (!settings.modules.some((entry) => entry.enabled)) {
    issues.push('noEnabledModules');
  }
  if (!settings.modules.some((entry) => entry.enabled && entry.visible)) {
    issues.push('noVisibleModules');
  }
  return issues;
}

export function isAdminModuleEnabled(settings: AdminModuleSettings, id: AdminModuleId): boolean {
  return resolveAdminModuleSettings(settings).modules
    .some((entry) => entry.id === id && entry.enabled);
}

export function isAdminModuleVisible(settings: AdminModuleSettings, id: AdminModuleId): boolean {
  return resolveAdminModuleSettings(settings).modules
    .some((entry) => entry.id === id && entry.enabled && entry.visible);
}

/** Header ids in configured order, resolved with the lockout safety net. */
export function getAdminModuleHeaderIds(value: unknown): AdminModuleId[] {
  return resolveAdminModuleSettings(value).modules
    .filter((entry) => entry.enabled && entry.visible)
    .map((entry) => entry.id);
}

/** The module a stale/deep link falls back to when its own module was disabled. */
export function getFirstAvailableAdminModuleId(value: unknown): AdminModuleId {
  return getAdminModuleHeaderIds(value)[0] ?? REQUIRED_ADMIN_MODULE_ID;
}

/** Replaces one module without mutating the document. */
export function updateAdminModuleSetting(
  settings: AdminModuleSettings,
  id: AdminModuleId,
  patch: Partial<Pick<AdminModuleSetting, 'enabled' | 'visible'>>,
): AdminModuleSettings {
  return {
    ...settings,
    modules: settings.modules.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  };
}

/** Moves a module one slot up or down, clamping at the ends. */
export function moveAdminModuleSetting(
  settings: AdminModuleSettings,
  id: AdminModuleId,
  direction: 'up' | 'down',
): AdminModuleSettings {
  const normalized = normalizeAdminModuleSettings(settings);
  const index = normalized.modules.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return normalized;
  }
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= normalized.modules.length) {
    return normalized;
  }
  const modules = [...normalized.modules];
  const [moved] = modules.splice(index, 1);
  if (!moved) {
    return normalized;
  }
  modules.splice(target, 0, moved);
  return { ...normalized, modules };
}

/** Drag-and-drop reorder: the dragged module takes the target's slot and everything shifts. */
export function reorderAdminModuleSetting(
  settings: AdminModuleSettings,
  draggedId: AdminModuleId,
  targetId: AdminModuleId,
): AdminModuleSettings {
  const normalized = normalizeAdminModuleSettings(settings);
  const from = normalized.modules.findIndex((entry) => entry.id === draggedId);
  const to = normalized.modules.findIndex((entry) => entry.id === targetId);
  if (from === -1 || to === -1 || from === to) {
    return normalized;
  }
  const modules = [...normalized.modules];
  const [moved] = modules.splice(from, 1);
  if (!moved) {
    return normalized;
  }
  modules.splice(to, 0, moved);
  return { ...normalized, modules };
}

/**
 * The wire document. `version` is always current and missing catalog entries are appended, so
 * a portal upgrade followed by an unrelated save cannot silently drop a newly added module.
 */
export function toAdminModuleSettingsPayload(settings: AdminModuleSettings): AdminModuleSettings {
  return normalizeAdminModuleSettings(settings);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
