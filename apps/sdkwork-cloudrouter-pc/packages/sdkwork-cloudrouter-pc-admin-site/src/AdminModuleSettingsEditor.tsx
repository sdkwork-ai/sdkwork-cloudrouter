import { useId, useMemo, useState, type DragEvent } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CloudCog,
  Compass,
  CircuitBoard,
  CreditCard,
  Crown,
  GraduationCap,
  GripVertical,
  Home,
  Network,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Video,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  REQUIRED_ADMIN_MODULE_ID,
  adminModuleCatalogEntry,
  countAdminModuleSettings,
  createDefaultAdminModuleSettings,
  moveAdminModuleSetting,
  reorderAdminModuleSetting,
  updateAdminModuleSetting,
  validateAdminModuleSettings,
  type AdminModuleId,
  type AdminModuleSetting,
  type AdminModuleSettings,
  type AdminModuleValidationIssue,
} from '@sdkwork/cloudroutes-pc-commons/admin-modules';
import { SectionDivider, ToggleSwitch } from './SiteSettingsControls';

/**
 * Icons are presentation-only and deliberately live next to the editor rather than in the
 * shared catalog: the catalog must stay data-only so the runtime/header path does not drag a
 * React icon table into the public site-branding bundle.
 */
const MODULE_ICONS: Record<AdminModuleId, LucideIcon> = {
  home: Home,
  iam: ShieldCheck,
  rtc: Video,
  tradeCenter: ShoppingBag,
  notifyCenter: Bell,
  membershipCenter: Crown,
  communityCenter: Compass,
  courseCenter: GraduationCap,
  rechargeCenter: WalletCards,
  marketingCenter: BadgePercent,
  partnerCenter: Network,
  paymentCenter: CreditCard,
  storageCenter: CloudCog,
  documentCenter: BookOpen,
  hardwareCenter: CircuitBoard,
  operations: Wrench,
};

/**
 * The operator-facing admin-module manager rendered under `/admin/site`.
 *
 * Three ideas drive the layout:
 *   - **Enabled** is provisioning; **visible** is navigation. They are separate on purpose,
 *     so a module can stay configured-but-hidden without losing its route or settings.
 *   - **Order** always covers every module, including disabled ones. Hiding a module must not
 *     silently move the ones the operator already arranged.
 *   - **Validation is document-wide.** Disabling one module is fine; disabling or hiding the
 *     last usable one is not, because the shell would have no way back to this page.
 */
export function AdminModuleSettingsEditor({
  value,
  onChange,
}: {
  value: AdminModuleSettings;
  onChange: (next: AdminModuleSettings) => void;
}) {
  const { t } = useTranslation();
  const orderHintId = useId();
  const [draggedId, setDraggedId] = useState<AdminModuleId | null>(null);
  const [dragOverId, setDragOverId] = useState<AdminModuleId | null>(null);
  const issues = useMemo(() => validateAdminModuleSettings(value), [value]);
  const counts = useMemo(() => countAdminModuleSettings(value), [value]);
  const visibleModules = value.modules.filter((module) => module.enabled && module.visible);

  const handleDragStart = (event: DragEvent<HTMLSpanElement>, id: AdminModuleId) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, id: AdminModuleId) => {
    if (!draggedId || draggedId === id) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, id: AdminModuleId) => {
    event.preventDefault();
    if (draggedId && draggedId !== id) {
      onChange(reorderAdminModuleSetting(value, draggedId, id));
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5" data-admin-site-admin-modules-editor>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.adminModules.intro')}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('admin.siteSettings.adminModules.summary.title')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.siteSettings.adminModules.summary.counts', {
              enabled: counts.enabled,
              total: value.modules.length,
              visible: counts.visible,
            })}
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={() => onChange(createDefaultAdminModuleSettings())}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.siteSettings.adminModules.actions.reset')}
        </button>
      </div>

      {issues.length > 0 ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
          role="alert"
        >
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
            {t('admin.siteSettings.adminModules.errors.title')}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-6 text-xs">
            {issues.map((issue) => (
              <li key={issue}>
                <AdminModuleIssueMessage issue={issue} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SectionDivider title={t('admin.siteSettings.adminModules.orderTitle')} />
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400" id={orderHintId}>
        {t('admin.siteSettings.adminModules.orderHint')}
      </p>

      <ol aria-describedby={orderHintId} aria-label={t('admin.siteSettings.adminModules.listLabel')} className="grid grid-cols-1 gap-3">
        {value.modules.map((module, index) => (
          <AdminModuleRow
            dragOver={dragOverId === module.id}
            index={index}
            key={module.id}
            module={module}
            onDragEnd={handleDragEnd}
            onDragOver={(event) => handleDragOver(event, module.id)}
            onDragStart={(event) => handleDragStart(event, module.id)}
            onDrop={(event) => handleDrop(event, module.id)}
            onMoveDown={() => onChange(moveAdminModuleSetting(value, module.id, 'down'))}
            onMoveUp={() => onChange(moveAdminModuleSetting(value, module.id, 'up'))}
            onToggleEnabled={(enabled) => onChange(updateAdminModuleSetting(value, module.id, { enabled }))}
            onToggleVisible={(visible) => onChange(updateAdminModuleSetting(value, module.id, { visible }))}
            total={value.modules.length}
          />
        ))}
      </ol>

      <SectionDivider title={t('admin.siteSettings.adminModules.preview.title')} />
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.adminModules.preview.hint')}
      </p>
      <div className="flex flex-wrap items-center gap-2" data-admin-site-admin-modules-preview>
        {visibleModules.length > 0 ? visibleModules.map((module) => {
          const definition = adminModuleCatalogEntry(module.id);
          const Icon = MODULE_ICONS[module.id];
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              data-admin-site-admin-module-preview={module.id}
              key={module.id}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              {t(definition.labelKey)}
            </span>
          );
        }) : (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {t('admin.siteSettings.adminModules.preview.empty')}
          </span>
        )}
      </div>
    </div>
  );
}

function AdminModuleRow({
  dragOver,
  index,
  module,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onToggleEnabled,
  onToggleVisible,
  total,
}: {
  dragOver: boolean;
  index: number;
  module: AdminModuleSetting;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDragStart: (event: DragEvent<HTMLSpanElement>) => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleVisible: (visible: boolean) => void;
  total: number;
}) {
  const { t } = useTranslation();
  const definition = adminModuleCatalogEntry(module.id);
  const Icon = MODULE_ICONS[module.id];
  const label = t(definition.labelKey);
  const isRequired = module.id === REQUIRED_ADMIN_MODULE_ID;

  return (
    <li
      className={`rounded-lg border bg-slate-50 p-4 transition-colors dark:bg-white/5 ${
        dragOver
          ? 'border-lobster-400 ring-2 ring-lobster-500/20 dark:border-lobster-400'
          : 'border-slate-200 dark:border-white/10'
      } ${module.enabled ? '' : 'opacity-80'}`}
      data-admin-site-admin-module={module.id}
      data-admin-site-admin-module-enabled={module.enabled ? 'true' : 'false'}
      data-admin-site-admin-module-visible={module.enabled && module.visible ? 'true' : 'false'}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-9 w-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-200 active:cursor-grabbing dark:hover:bg-white/10"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          title={t('admin.siteSettings.adminModules.actions.drag')}
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white/10">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
              <AdminModuleStatusPill enabled={module.enabled} visible={module.visible} />
              {isRequired ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {t('admin.siteSettings.adminModules.badges.required')}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t(definition.descriptionKey)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:ml-auto">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin.siteSettings.adminModules.fields.enabled')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isRequired
                  ? t('admin.siteSettings.adminModules.hints.required')
                  : t('admin.siteSettings.adminModules.hints.enabled')}
              </p>
            </div>
            <ToggleSwitch
              checked={module.enabled}
              disabled={isRequired && module.enabled}
              label={`${label} — ${t('admin.siteSettings.adminModules.fields.enabled')}`}
              onChange={onToggleEnabled}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin.siteSettings.adminModules.fields.visible')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {module.enabled
                  ? t('admin.siteSettings.adminModules.hints.visible')
                  : t('admin.siteSettings.adminModules.hints.visibilityPaused')}
              </p>
            </div>
            <ToggleSwitch
              checked={module.visible}
              disabled={!module.enabled}
              label={`${label} — ${t('admin.siteSettings.adminModules.fields.visible')}`}
              onChange={onToggleVisible}
            />
          </div>

          <div className="flex items-center gap-1" role="group" aria-label={t('admin.siteSettings.adminModules.actions.reorder')}>
            <button
              aria-label={t('admin.siteSettings.adminModules.actions.moveUp', { name: label })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              disabled={index === 0}
              onClick={onMoveUp}
              type="button"
            >
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label={t('admin.siteSettings.adminModules.actions.moveDown', { name: label })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              disabled={index === total - 1}
              onClick={onMoveDown}
              type="button"
            >
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function AdminModuleStatusPill({ enabled, visible }: { enabled: boolean; visible: boolean }) {
  const { t } = useTranslation();
  const className = !enabled
    ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
    : visible
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {!enabled
        ? t('admin.siteSettings.adminModules.status.disabled')
        : visible
          ? t('admin.siteSettings.adminModules.status.visible')
          : t('admin.siteSettings.adminModules.status.hidden')}
    </span>
  );
}

function AdminModuleIssueMessage({ issue }: { issue: AdminModuleValidationIssue }) {
  const { t } = useTranslation();
  switch (issue) {
    case 'requiredModuleDisabled':
      return <>{t('admin.siteSettings.adminModules.errors.requiredModuleDisabled')}</>;
    case 'noEnabledModules':
      return <>{t('admin.siteSettings.adminModules.errors.noEnabledModules')}</>;
    case 'noVisibleModules':
      return <>{t('admin.siteSettings.adminModules.errors.noVisibleModules')}</>;
    default:
      return null;
  }
}
