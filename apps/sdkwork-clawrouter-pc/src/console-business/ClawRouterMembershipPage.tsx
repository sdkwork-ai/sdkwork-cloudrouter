import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Gift,
  Lock,
  Minus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button, StatusNotice } from '@sdkwork/ui-pc-react';
import {
  createMembershipCheckoutRouteIntent,
  createSdkworkMembershipBackdropStyle,
  createSdkworkMembershipGlassStyle,
  createSdkworkMembershipHeroStyle,
  createSdkworkMembershipHeroTextStyle,
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
  SdkworkMembershipIntlProvider,
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
  useSdkworkMembershipIntl,
  type SdkworkMembershipBenefit,
  type SdkworkMembershipLevel,
  type SdkworkMembershipPlan,
  type SdkworkMembershipPurchaseMode,
  type SdkworkMembershipSummary,
  type SdkworkMembershipVisualTone,
} from '@sdkwork/membership-pc-membership';

import { resolveConsoleMembershipLocale } from './consoleCommerceLocale.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

const SECTION_IDS = {
  benefits: 'claw-router-membership-section-benefits',
  levels: 'claw-router-membership-section-levels',
  plans: 'claw-router-membership-section-plans',
} as const;

type MembershipSectionView = 'benefits' | 'levels' | 'plans';

// 货币格式化：本地实现避免引入额外 service 依赖，与 hero 组件格式保持一致
function formatCurrencyCny(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CNY',
    currencyDisplay: 'narrowSymbol',
  }).format(value);
}

function resolveSavingsPercent(price: number, original: number | null): number | null {
  if (original === null || original <= price || original <= 0) {
    return null;
  }
  return Math.round((1 - price / original) * 100);
}

function scrollToSection(view: MembershipSectionView): void {
  const element = document.getElementById(SECTION_IDS[view]);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function ClawRouterMembershipPage() {
  const { i18n } = useTranslation();
  const locale = resolveConsoleMembershipLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <SdkworkMembershipIntlProvider locale={locale}>
      <ClawRouterMembershipPageContent />
    </SdkworkMembershipIntlProvider>
  );
}

function ClawRouterMembershipPageContent() {
  const controller = useSdkworkMembershipController();
  const state = useSdkworkMembershipControllerState(controller);
  const { checkoutPath, onNavigate } = useConsoleBusinessNavigation();
  const { copy } = useSdkworkMembershipIntl();

  const [activeSection, setActiveSection] = useState<MembershipSectionView>('plans');

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  const selectedPlan = useMemo(
    () => state.dashboard.plans.find((plan) => plan.packageId === state.selectedPlanId) ?? null,
    [state.dashboard.plans, state.selectedPlanId],
  );

  function navigateToCheckout(mode: SdkworkMembershipPurchaseMode): boolean {
    if (!selectedPlan || !onNavigate) {
      return false;
    }
    onNavigate(
      createMembershipCheckoutRouteIntent({
        basePath: checkoutPath,
        mode,
        plan: selectedPlan,
      }).route,
    );
    return true;
  }

  function handlePurchase() {
    if (navigateToCheckout('purchase')) {
      return;
    }
    void controller.purchaseSelectedPlan();
  }

  function handleRenew() {
    if (navigateToCheckout('renew')) {
      return;
    }
    void controller.renewSelectedPlan();
  }

  function handleUpgrade() {
    if (navigateToCheckout('upgrade')) {
      return;
    }
    void controller.upgradeSelectedPlan();
  }

  function handleSectionChange(view: MembershipSectionView) {
    controller.setView(view);
    setActiveSection(view);
    scrollToSection(view);
  }

  const sectionTabs: ReadonlyArray<{ view: MembershipSectionView; label: string }> = [
    { view: 'plans', label: copy.actions.plans },
    { view: 'benefits', label: copy.actions.benefits },
    { view: 'levels', label: copy.actions.levels },
  ];

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={createSdkworkMembershipBackdropStyle()}
      />

      <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="mx-auto max-w-6xl space-y-4">
          <MembershipHero
            isMutating={state.isMutating}
            onPurchase={handlePurchase}
            onRenew={handleRenew}
            onUpgrade={handleUpgrade}
            selectedPlan={selectedPlan}
            summary={state.dashboard.summary}
          />

          {state.lastError ? (
            <StatusNotice tone="danger" title={copy.page.errorTitle}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{state.lastError}</span>
                <Button
                  disabled={state.isLoading}
                  loading={state.isLoading}
                  onClick={() => void controller.refresh().catch(() => undefined)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {copy.actions.refresh}
                </Button>
              </div>
            </StatusNotice>
          ) : null}

          <SectionNav
            activeSection={activeSection}
            isRefreshing={state.isLoading}
            onRefresh={() => void controller.refresh().catch(() => undefined)}
            onSectionChange={handleSectionChange}
            tabs={sectionTabs}
          />

          {state.isLoading && !state.isBootstrapped ? (
            <MembershipSkeleton />
          ) : (
            <>
              <PlansSection
                copy={copy}
                isMutating={state.isMutating}
                onRefresh={() => void controller.refresh().catch(() => undefined)}
                onSelectPlan={(packageId) => controller.selectPlan(packageId)}
                plans={state.dashboard.plans}
                selectedPlanId={state.selectedPlanId}
              />

              <BenefitsSection benefits={state.dashboard.benefits} />

              <LevelsSection levels={state.dashboard.levels} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionNavProps {
  activeSection: MembershipSectionView;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSectionChange: (view: MembershipSectionView) => void;
  tabs: ReadonlyArray<{ view: MembershipSectionView; label: string }>;
}

function SectionNav({ activeSection, isRefreshing, onRefresh, onSectionChange, tabs }: SectionNavProps) {
  const { copy } = useSdkworkMembershipIntl();

  return (
    <nav className="sticky top-2 z-20 flex items-center gap-1 rounded-[var(--sdk-radius-pill)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)]/95 p-1 shadow-[var(--sdk-shadow-sm)] backdrop-blur-md">
      {tabs.map((tab) => (
        <button
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--sdk-radius-pill)] px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] sm:flex-none ${
            activeSection === tab.view
              ? 'bg-[var(--sdk-color-brand-primary)] text-[var(--sdk-color-text-inverse)]'
              : 'text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)] hover:text-[var(--sdk-color-text-primary)]'
          }`}
          key={tab.view}
          onClick={() => onSectionChange(tab.view)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
      <Button
        className="ml-auto"
        disabled={isRefreshing}
        loading={isRefreshing}
        onClick={onRefresh}
        size="sm"
        type="button"
        variant="ghost"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{copy.actions.refresh}</span>
      </Button>
    </nav>
  );
}

interface MembershipHeroProps {
  isMutating: boolean;
  onPurchase: () => void;
  onRenew: () => void;
  onUpgrade: () => void;
  selectedPlan?: SdkworkMembershipPlan | null;
  summary: SdkworkMembershipSummary;
}

function MembershipHero({
  isMutating,
  onPurchase,
  onRenew,
  onUpgrade,
  summary,
}: MembershipHeroProps) {
  const {
    copy,
    formatDuration,
    formatIncludedPoints,
    formatStatus,
  } = useSdkworkMembershipIntl();

  const primaryTextStyle = createSdkworkMembershipHeroTextStyle();
  const mutedTextStyle = createSdkworkMembershipHeroTextStyle('muted');
  const subtleTextStyle = createSdkworkMembershipHeroTextStyle('subtle');

  const stats: ReadonlyArray<{
    eyebrow: string;
    icon: typeof TrendingUp;
    tone: SdkworkMembershipVisualTone;
    value: string;
  }> = [
    {
      eyebrow: copy.hero.points,
      icon: TrendingUp,
      tone: 'accent',
      value: summary.pointBalance !== null ? formatIncludedPoints(summary.pointBalance) : copy.common.noValue,
    },
    {
      eyebrow: copy.hero.currentLevel,
      icon: Crown,
      tone: 'warning',
      value: summary.currentLevelName,
    },
    {
      eyebrow: copy.hero.remaining,
      icon: Clock3,
      tone: 'brand',
      value: formatDuration(summary.remainingDays),
    },
    {
      eyebrow: copy.hero.status,
      icon: ShieldCheck,
      tone: 'success',
      value: formatStatus(summary.status),
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-[1.75rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-5 py-6 text-white shadow-[var(--sdk-shadow-lg)] sm:px-7 sm:py-7"
      style={createSdkworkMembershipHeroStyle()}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
              style={{
                ...createSdkworkMembershipGlassStyle('accent', {
                  backgroundWeight: 14,
                  borderWeight: 24,
                  surfaceWeight: 80,
                }),
                ...mutedTextStyle,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.hero.eyebrow}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
              style={createSdkworkMembershipToneStyle('warning', {
                backgroundWeight: 22,
                borderWeight: 34,
              })}
            >
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.currentLevelName}
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={primaryTextStyle}>
            {copy.hero.title}
          </h1>
          <p className="mt-3 text-sm leading-7" style={mutedTextStyle}>
            {copy.hero.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={!summary.isAuthenticated || isMutating}
              loading={isMutating}
              onClick={summary.isMember ? onUpgrade : onPurchase}
              type="button"
              variant="secondary"
            >
              {summary.isMember ? copy.actions.upgrade : copy.actions.selectPlan}
            </Button>
            <Button
              disabled={!summary.isMember || isMutating}
              onClick={onRenew}
              type="button"
              variant="outline"
            >
              {copy.actions.renew}
            </Button>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                className="flex items-center gap-3 rounded-[1rem] border p-4"
                key={stat.eyebrow}
                style={createSdkworkMembershipGlassStyle(stat.tone, {
                  backgroundWeight: 12,
                  borderWeight: 22,
                  surfaceWeight: 84,
                })}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border"
                  style={createSdkworkMembershipToneStyle(stat.tone, {
                    backgroundWeight: 22,
                    borderWeight: 32,
                  })}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={subtleTextStyle}>
                    {stat.eyebrow}
                  </div>
                  <div className="mt-0.5 truncate text-base font-semibold tabular-nums" style={primaryTextStyle}>
                    {stat.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface PlansSectionProps {
  copy: ReturnType<typeof useSdkworkMembershipIntl>['copy'];
  isMutating: boolean;
  onRefresh: () => void;
  onSelectPlan: (packageId: number) => void;
  plans: SdkworkMembershipPlan[];
  selectedPlanId: number | null;
}

function PlansSection({
  copy,
  isMutating,
  onRefresh,
  onSelectPlan,
  plans,
  selectedPlanId,
}: PlansSectionProps) {
  const { locale, formatDuration, formatIncludedPoints, formatPriceWas, formatSave } = useSdkworkMembershipIntl();

  return (
    <section
      id={SECTION_IDS.plans}
      className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.plans.eyebrow}
          </div>
          <h2 className="mt-1.5 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.plans.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.plans.subtitle}
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        {plans.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]">
              <Minus className="h-5 w-5 text-[var(--sdk-color-text-muted)]" aria-hidden="true" />
            </div>
            <div className="mt-4 text-base font-semibold text-[var(--sdk-color-text-primary)]">
              {copy.plans.emptyTitle}
            </div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.plans.emptyDescription}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isSelected = plan.packageId === selectedPlanId;
              const tone: SdkworkMembershipVisualTone = isSelected ? 'accent' : plan.recommended ? 'brand' : 'neutral';
              const isAnnual = plan.durationDays !== null && plan.durationDays >= 360;
              const savingsPercent = resolveSavingsPercent(plan.priceCny, plan.originalPriceCny);
              const originalPriceLabel =
                plan.originalPriceCny !== null && plan.originalPriceCny > plan.priceCny
                  ? formatPriceWas(formatCurrencyCny(plan.originalPriceCny, locale))
                  : null;

              return (
                <article
                  className={`relative flex flex-col rounded-[1.25rem] border p-5 transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-[var(--sdk-color-brand-accent)] shadow-[var(--sdk-shadow-md)]'
                      : 'hover:shadow-[var(--sdk-shadow-sm)]'
                  }`}
                  key={plan.id}
                  style={createSdkworkMembershipPanelStyle(tone, {
                    backgroundWeight: isSelected ? 12 : 6,
                    borderWeight: isSelected ? 24 : 16,
                    surfaceColor: 'var(--sdk-color-surface-panel-muted)',
                  })}
                >
                  {plan.recommended ? (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                      style={createSdkworkMembershipToneStyle('accent', {
                        backgroundWeight: 28,
                        borderWeight: 40,
                      })}
                    >
                      {copy.plans.popular}
                    </span>
                  ) : null}

                  <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">
                    {plan.name}
                  </div>
                  {plan.description ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--sdk-color-text-secondary)]">
                      {plan.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                      {formatCurrencyCny(plan.priceCny, locale)}
                    </span>
                    {isAnnual ? (
                      <span className="text-xs text-[var(--sdk-color-text-muted)]">{copy.common.perYear}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {originalPriceLabel ? (
                      <span className="text-[var(--sdk-color-text-muted)] line-through">{originalPriceLabel}</span>
                    ) : null}
                    {savingsPercent !== null ? (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold"
                        style={createSdkworkMembershipToneStyle('success', {
                          backgroundWeight: 12,
                          borderWeight: 20,
                        })}
                      >
                        {formatSave(savingsPercent)}
                      </span>
                    ) : null}
                    {isAnnual ? (
                      <span className="text-[var(--sdk-color-text-muted)]">{copy.common.billedYearly}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2 rounded-[0.875rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)] p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--sdk-color-text-muted)]">{copy.plans.duration}</span>
                      <span className="font-medium tabular-nums text-[var(--sdk-color-text-primary)]">
                        {formatDuration(plan.durationDays)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--sdk-color-text-muted)]">{copy.plans.pointsIncluded}</span>
                      <span className="font-medium tabular-nums text-[var(--sdk-color-text-primary)]">
                        {formatIncludedPoints(plan.includedPoints)}
                      </span>
                    </div>
                  </div>

                  {plan.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.tags.map((tag) => (
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium text-[var(--sdk-color-text-secondary)]"
                          key={tag}
                          style={createSdkworkMembershipToneStyle(tone, {
                            backgroundWeight: 8,
                            borderWeight: 14,
                          })}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    className="mt-5 w-full"
                    disabled={isMutating}
                    loading={isMutating && isSelected}
                    onClick={() => onSelectPlan(plan.packageId)}
                    type="button"
                    variant={isSelected ? 'secondary' : plan.recommended ? 'primary' : 'outline'}
                  >
                    {isSelected ? copy.actions.selected : copy.actions.selectPlan}
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={onRefresh} size="sm" type="button" variant="ghost">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.actions.refresh}
          </Button>
        </div>
      </div>
    </section>
  );
}

interface BenefitsSectionProps {
  benefits: SdkworkMembershipBenefit[];
}

function resolveBenefitIcon(type: string | undefined) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('quota') || normalized.includes('credit') || normalized.includes('compute') || normalized.includes('render')) {
    return Zap;
  }
  if (normalized.includes('security') || normalized.includes('shield') || normalized.includes('protect')) {
    return Shield;
  }
  if (normalized.includes('gift') || normalized.includes('perk') || normalized.includes('reward')) {
    return Gift;
  }
  if (normalized.includes('star') || normalized.includes('premium') || normalized.includes('vip')) {
    return Star;
  }
  return Sparkles;
}

function resolveUsageTone(used: number, limit: number): SdkworkMembershipVisualTone {
  if (limit <= 0) {
    return 'success';
  }
  const ratio = used / limit;
  if (ratio >= 1) {
    return 'danger';
  }
  if (ratio >= 0.8) {
    return 'warning';
  }
  return 'success';
}

function BenefitsSection({ benefits }: BenefitsSectionProps) {
  const { copy, formatUsage } = useSdkworkMembershipIntl();

  return (
    <section
      id={SECTION_IDS.benefits}
      className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]"
    >
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
          {copy.benefits.eyebrow}
        </div>
        <h2 className="mt-1.5 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
          {copy.benefits.title}
        </h2>
      </div>

      <div className="px-5 py-5">
        {benefits.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]">
              <Gift className="h-5 w-5 text-[var(--sdk-color-text-muted)]" aria-hidden="true" />
            </div>
            <div className="mt-4 text-base font-semibold text-[var(--sdk-color-text-primary)]">
              {copy.benefits.emptyTitle}
            </div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.benefits.emptyDescription}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit) => {
              const BenefitIcon = resolveBenefitIcon(benefit.type);
              const statusTone: SdkworkMembershipVisualTone = benefit.claimed ? 'success' : 'warning';
              const usageRatio =
                benefit.usageLimit !== null && benefit.usageLimit > 0
                  ? Math.min((benefit.usedCount ?? 0) / benefit.usageLimit, 1)
                  : 0;
              const usageTone =
                benefit.usageLimit !== null
                  ? resolveUsageTone(benefit.usedCount ?? 0, benefit.usageLimit)
                  : 'success';

              return (
                <article
                  className="flex flex-col rounded-[1.25rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
                  key={benefit.id}
                  style={createSdkworkMembershipPanelStyle(statusTone, {
                    backgroundWeight: 6,
                    borderWeight: 16,
                    surfaceColor: 'var(--sdk-color-surface-panel-muted)',
                  })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">
                        {benefit.name}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--sdk-color-text-secondary)]">
                        {benefit.description || copy.benefits.descriptionFallback}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border"
                      style={createSdkworkMembershipToneStyle(statusTone, {
                        backgroundWeight: 14,
                        borderWeight: 24,
                      })}
                    >
                      <BenefitIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>

                  {benefit.usageLimit !== null ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-[var(--sdk-color-text-muted)]">
                          {formatUsage(benefit.usedCount, benefit.usageLimit)}
                        </span>
                        <span
                          className="font-semibold tabular-nums"
                          style={createSdkworkMembershipToneStyle(usageTone, {
                            backgroundWeight: 0,
                            borderWeight: 0,
                          })}
                        >
                          {Math.round(usageRatio * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--sdk-color-surface-panel)]">
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.round(usageRatio * 100)}%`,
                            ...createSdkworkMembershipToneStyle(usageTone, {
                              backgroundWeight: 60,
                              borderWeight: 0,
                            }),
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs">
                    <span className="rounded-full bg-[var(--sdk-color-surface-panel)] px-2.5 py-0.5 font-medium text-[var(--sdk-color-text-secondary)]">
                      {benefit.type || copy.benefits.typeFallback}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium"
                      style={createSdkworkMembershipToneStyle(statusTone, {
                        backgroundWeight: 12,
                        borderWeight: 20,
                      })}
                    >
                      {benefit.claimed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {copy.benefits.claimed}
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {copy.benefits.pending}
                        </>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface LevelsSectionProps {
  levels: SdkworkMembershipLevel[];
}

function LevelsSection({ levels }: LevelsSectionProps) {
  const { copy, formatIncludedPoints } = useSdkworkMembershipIntl();

  const sortedLevels = useMemo(
    () => [...levels].sort((left, right) => left.levelValue - right.levelValue),
    [levels],
  );
  const currentIndex = sortedLevels.findIndex((level) => level.isCurrent);

  return (
    <section
      id={SECTION_IDS.levels}
      className="scroll-mt-24 space-y-4"
    >
      {sortedLevels.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] px-6 py-5 shadow-[var(--sdk-shadow-sm)]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.levels.ladderEyebrow}
          </div>
          <h2 className="mt-1.5 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.levels.ladderTitle}
          </h2>

          <div className="mt-5 flex items-start gap-2 overflow-x-auto pb-2">
            {sortedLevels.map((level, index) => {
              const isPassed = currentIndex >= 0 && index < currentIndex;
              const isCurrent = level.isCurrent;
              const tone: SdkworkMembershipVisualTone = isCurrent ? 'accent' : isPassed ? 'success' : 'neutral';

              return (
                <div className="flex min-w-[7rem] flex-1 flex-col items-center text-center" key={level.id}>
                  <div className="flex w-full items-center">
                    {index === 0 ? (
                      <div className="h-0.5 flex-1 bg-transparent" />
                    ) : (
                      <div
                        className="h-0.5 flex-1"
                        style={createSdkworkMembershipToneStyle(isPassed ? 'success' : 'neutral', {
                          backgroundWeight: isPassed ? 40 : 12,
                          borderWeight: 0,
                        })}
                      />
                    )}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
                      style={createSdkworkMembershipToneStyle(tone, {
                        backgroundWeight: isCurrent ? 26 : isPassed ? 18 : 8,
                        borderWeight: isCurrent ? 48 : 32,
                      })}
                    >
                      {isCurrent ? (
                        <Crown className="h-5 w-5" aria-hidden="true" />
                      ) : isPassed ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </div>
                    {index === sortedLevels.length - 1 ? (
                      <div className="h-0.5 flex-1 bg-transparent" />
                    ) : (
                      <div
                        className="h-0.5 flex-1"
                        style={createSdkworkMembershipToneStyle(isPassed ? 'success' : 'neutral', {
                          backgroundWeight: 12,
                          borderWeight: 0,
                        })}
                      />
                    )}
                  </div>
                  <div
                    className={`mt-2.5 text-sm font-semibold ${
                      isCurrent
                        ? 'text-[var(--sdk-color-text-primary)]'
                        : index > currentIndex && currentIndex >= 0
                          ? 'text-[var(--sdk-color-text-muted)]'
                          : 'text-[var(--sdk-color-text-secondary)]'
                    }`}
                  >
                    {level.name}
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-[var(--sdk-color-text-muted)]">
                    {level.requiredPoints !== null ? formatIncludedPoints(level.requiredPoints) : copy.common.noValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.levels.eyebrow}
          </div>
          <h2 className="mt-1.5 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.levels.title}
          </h2>
        </div>

        <div className="px-5 py-5">
          {sortedLevels.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]">
                <Minus className="h-5 w-5 text-[var(--sdk-color-text-muted)]" aria-hidden="true" />
              </div>
              <div className="mt-4 text-base font-semibold text-[var(--sdk-color-text-primary)]">
                {copy.levels.emptyTitle}
              </div>
              <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                {copy.levels.emptyDescription}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {sortedLevels.map((level) => (
                <article
                  className="flex flex-col rounded-[1.25rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
                  key={level.id}
                  style={createSdkworkMembershipPanelStyle(level.isCurrent ? 'brand' : 'neutral', {
                    backgroundWeight: level.isCurrent ? 10 : 6,
                    borderWeight: level.isCurrent ? 24 : 16,
                    surfaceColor: 'var(--sdk-color-surface-panel-muted)',
                  })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">
                      {level.name}
                    </div>
                    {level.isCurrent ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                        style={createSdkworkMembershipToneStyle('success', {
                          backgroundWeight: 12,
                          borderWeight: 20,
                        })}
                      >
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        {copy.levels.currentLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--sdk-color-text-secondary)]">
                    {level.description || copy.levels.descriptionFallback}
                  </p>

                  <div className="mt-4 rounded-[0.875rem] bg-[var(--sdk-color-surface-panel)] px-3.5 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--sdk-color-text-muted)]">{copy.levels.requiredPoints}</span>
                      <span className="font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                        {level.requiredPoints !== null ? formatIncludedPoints(level.requiredPoints) : copy.common.noValue}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="mt-4 w-full"
                    disabled={!level.isCurrent}
                    type="button"
                    variant={level.isCurrent ? 'secondary' : 'ghost'}
                  >
                    {level.isCurrent ? (
                      <>
                        {copy.levels.currentLevelAction}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        {copy.levels.locked}
                      </>
                    )}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MembershipSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)] p-6">
        <div className="h-4 w-1/4 animate-pulse rounded bg-[var(--sdk-color-surface-panel-muted)]" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="h-64 animate-pulse rounded-[1.25rem] bg-[var(--sdk-color-surface-panel-muted)]" />
          <div className="h-64 animate-pulse rounded-[1.25rem] bg-[var(--sdk-color-surface-panel-muted)]" />
          <div className="h-64 animate-pulse rounded-[1.25rem] bg-[var(--sdk-color-surface-panel-muted)]" />
        </div>
      </div>
    </div>
  );
}
