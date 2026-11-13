import { useState } from 'react';
import {
  Boxes,
  ChevronRight,
  ClipboardList,
  Cloud,
  Coins,
  Crown,
  FileText,
  Gauge,
  Info,
  KeyRound,
  LifeBuoy,
  LogIn,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Receipt,
  Search,
  Sparkles,
  Terminal,
  Ticket,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

export type ConsoleHomeDestination =
  | 'membership'
  | 'recharge'
  | 'apiKeys'
  | 'usage'
  | 'orders'
  | 'coupons'
  | 'help'
  | 'catalog'
  | 'dashboard'
  | 'signIn'
  | 'signOut';

export interface ConsoleHomeLabels {
  readonly badge: string;
  readonly heroTitleLead: string;
  readonly heroTitleHighlight: string;
  readonly heroSubtitle: string;
  readonly searchPlaceholder: string;
  readonly searchEmpty: string;
  readonly searchClear: string;
  readonly searchResults: string;
  readonly quickTitle: string;
  readonly membership: string;
  readonly recharge: string;
  readonly apiKeys: string;
  readonly usage: string;
  readonly membershipBadge: string;
  readonly rechargeBadge: string;
  readonly servicesTitle: string;
  readonly serviceOrders: string;
  readonly serviceBills: string;
  readonly serviceCoupons: string;
  readonly serviceLedger: string;
  readonly serviceInvoices: string;
  readonly serviceHelp: string;
  readonly serviceNews: string;
  readonly serviceMembership: string;
  readonly serviceModels: string;
  readonly serviceMore: string;
  readonly announcement: string;
  readonly promoBadge: string;
  readonly promoTitle: string;
  readonly promoDesc: string;
  readonly promoCta: string;
  readonly experienceTitle: string;
  readonly experienceMore: string;
  readonly experienceGatewayTitle: string;
  readonly experienceGatewayDesc: string;
  readonly experienceGatewayCta: string;
  readonly experienceConsoleTitle: string;
  readonly experienceConsoleDesc: string;
  readonly experienceConsoleCta: string;
  readonly moreTitle: string;
  readonly moreSignIn: string;
  readonly moreSignOut: string;
  readonly moreHelp: string;
  readonly moreAbout: string;
  readonly moreClose: string;
  readonly statModels: string;
  readonly statVendors: string;
  readonly statUptime: string;
  readonly statRegions: string;
  readonly trust: string;
  readonly footer: string;
}

export interface ConsoleHomeScreenProps {
  readonly labels: ConsoleHomeLabels;
  readonly brandName: string;
  readonly authenticated: boolean;
  readonly onNavigate: (destination: ConsoleHomeDestination) => void;
}

interface HomeAction {
  readonly id: 'membership' | 'recharge' | 'apiKeys' | 'usage';
  readonly label: string;
  readonly badge?: string;
  readonly icon: LucideIcon;
  readonly tone: string;
}

interface HomeService {
  readonly id:
    | 'orders'
    | 'usage'
    | 'coupons'
    | 'ledger'
    | 'invoices'
    | 'help'
    | 'news'
    | 'membership'
    | 'models'
    | 'more';
  readonly label: string;
  readonly icon: LucideIcon;
}

/**
 * Public home tab, positioned as an AI cloud-computing platform app home.
 *
 * The layout follows the mobile cloud-console pattern: a compact platform intro,
 * a product search box, four primary service actions, a ten-entry service grid,
 * an announcement strip, a promotion banner, and a product experience center.
 * Search filters the actions and service grid in place. The page stays public;
 * account actions lead to IAM sign-in or the protected console tab, which renders
 * the in-canvas session prompt.
 */
export function ConsoleHomeScreen({
  labels,
  brandName,
  authenticated,
  onNavigate,
}: ConsoleHomeScreenProps) {
  const [query, setQuery] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const searching = normalizedQuery.length > 0;
  const matches = (value: string) =>
    !searching || value.toLowerCase().includes(normalizedQuery);

  const primaryActionDefs: readonly HomeAction[] = [
    {
      id: 'membership',
      label: labels.membership,
      badge: labels.membershipBadge,
      icon: Crown,
      tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'recharge',
      label: labels.recharge,
      badge: labels.rechargeBadge,
      icon: Coins,
      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'apiKeys',
      label: labels.apiKeys,
      icon: KeyRound,
      tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'usage',
      label: labels.usage,
      icon: Receipt,
      tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ];
  const primaryActions = primaryActionDefs.filter((action) => matches(action.label));

  const serviceDefs: readonly HomeService[] = [
    { id: 'orders', label: labels.serviceOrders, icon: ClipboardList },
    { id: 'usage', label: labels.serviceBills, icon: FileText },
    { id: 'coupons', label: labels.serviceCoupons, icon: Ticket },
    { id: 'ledger', label: labels.serviceLedger, icon: Wallet },
    { id: 'invoices', label: labels.serviceInvoices, icon: Receipt },
    { id: 'help', label: labels.serviceHelp, icon: LifeBuoy },
    { id: 'news', label: labels.serviceNews, icon: Megaphone },
    { id: 'membership', label: labels.serviceMembership, icon: Crown },
    { id: 'models', label: labels.serviceModels, icon: Boxes },
    { id: 'more', label: labels.serviceMore, icon: MoreHorizontal },
  ];
  const services = serviceDefs.filter((service) => matches(service.label));

  const stats = [
    { id: 'models', value: '100+', label: labels.statModels },
    { id: 'vendors', value: '20+', label: labels.statVendors },
    { id: 'uptime', value: '99.99%', label: labels.statUptime },
    { id: 'regions', value: '12', label: labels.statRegions },
  ];

  const handleService = (service: HomeService) => {
    const destinations: Record<HomeService['id'], ConsoleHomeDestination | 'more'> = {
      orders: 'orders',
      usage: 'usage',
      coupons: 'coupons',
      ledger: 'orders',
      invoices: 'orders',
      help: 'help',
      news: 'catalog',
      membership: 'membership',
      models: 'catalog',
      more: 'more',
    };
    const destination = destinations[service.id];
    if (destination === 'more') {
      setMoreOpen(true);
      return;
    }
    onNavigate(destination);
  };

  return (
    <div className="flex flex-col">
      {/* Platform intro + product search */}
      <section className="bg-surface px-[0.9rem] pb-4 pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
          <Cloud className="h-3.5 w-3.5" aria-hidden />
          {labels.badge}
        </span>
        <h2 className="mt-2 text-[18px] font-bold leading-tight tracking-tight text-ink">
          {labels.heroTitleLead}
          <span className="text-brand">{labels.heroTitleHighlight}</span>
        </h2>
        <p className="mt-1 text-[11px] leading-4 text-ink-muted">{labels.heroSubtitle}</p>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden
          />
          <input
            type="text"
            role="searchbox"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {searching ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={labels.searchClear}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-subtle"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </section>

      {/* Four primary cloud-service actions */}
      {primaryActions.length > 0 ? (
        <section aria-label={labels.quickTitle} className="border-t border-line bg-surface px-[0.9rem] py-4">
          <div className="grid grid-cols-4 gap-2">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onNavigate(action.id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-1 transition-colors active:bg-surface-elevated"
                >
                  <span
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${action.tone}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                    {action.badge ? (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#f04438] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                        {action.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] font-medium text-ink">{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Service grid */}
      <section className="border-t border-line bg-surface px-[0.9rem] py-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold text-ink">
            {searching ? labels.searchResults : labels.servicesTitle}
          </h3>
          {searching ? (
            <span className="max-w-[40%] truncate text-[10px] text-ink-subtle">{query.trim()}</span>
          ) : null}
        </div>
        {services.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-subtle">{labels.searchEmpty}</p>
        ) : (
          <div className="mt-3 grid grid-cols-5 gap-y-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleService(service)}
                  className="flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors active:bg-surface-elevated"
                >
                  <Icon className="h-5 w-5 text-ink-muted" aria-hidden />
                  <span className="text-[10px] text-ink-muted">{service.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!searching ? (
        <>
          {/* Announcement strip */}
          <section className="bg-surface px-[0.9rem] pb-2">
            <button
              type="button"
              onClick={() => onNavigate('membership')}
              className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-left"
            >
              <Megaphone className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">
                {labels.announcement}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
            </button>
          </section>

          {/* Promotion banner */}
          <section className="bg-surface px-[0.9rem] pb-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('membership')}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft via-surface to-surface-elevated p-4 text-left ring-1 ring-line"
            >
              <span className="inline-flex items-center rounded-full bg-brand-fill px-2 py-0.5 text-[9px] font-semibold text-on-brand">
                {labels.promoBadge}
              </span>
              <p className="mt-2 text-[18px] font-bold tracking-tight text-ink">{labels.promoTitle}</p>
              <p className="mt-1 max-w-[78%] text-[11px] leading-5 text-ink-muted">{labels.promoDesc}</p>
              <span className="mt-3 inline-flex items-center gap-0.5 rounded-full bg-brand-fill px-3.5 py-1.5 text-[11px] font-semibold text-on-brand">
                {labels.promoCta}
                <ChevronRight className="h-3 w-3" aria-hidden />
              </span>
              <div className="mt-3 flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className={dot === 0 ? 'h-1 w-3 rounded-full bg-brand' : 'h-1 w-1 rounded-full bg-line'}
                  />
                ))}
              </div>
              <Sparkles
                className="pointer-events-none absolute -right-2 -top-2 h-20 w-20 text-brand/10"
                aria-hidden
              />
            </button>
          </section>

          {/* Product experience center */}
          <section className="border-t border-line bg-surface px-[0.9rem] py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink">{labels.experienceTitle}</h3>
              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="flex items-center gap-0.5 text-[11px] text-ink-subtle"
              >
                {labels.experienceMore}
                <ChevronRight className="h-3 w-3" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="mt-3 flex w-full items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Terminal className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  {labels.experienceGatewayTitle}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-ink-subtle">
                  {labels.experienceGatewayDesc}
                </span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-brand">
                  {labels.experienceGatewayCta}
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(authenticated ? 'dashboard' : 'signIn')}
              className="mt-2 flex w-full items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Gauge className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  {labels.experienceConsoleTitle}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-ink-subtle">
                  {labels.experienceConsoleDesc}
                </span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-brand">
                  {labels.experienceConsoleCta}
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </span>
              </span>
            </button>
          </section>

          {/* Trust metrics */}
          <section aria-label={labels.trust} className="grid grid-cols-2 gap-px border-y border-line bg-line">
            {stats.map((stat) => (
              <div key={stat.id} className="bg-surface-elevated px-4 py-3.5">
                <p className="text-lg font-bold tracking-tight text-ink">{stat.value}</p>
                <p className="mt-0.5 text-[11px] text-ink-subtle">{stat.label}</p>
              </div>
            ))}
          </section>
        </>
      ) : null}

      <footer className="bg-canvas px-[0.9rem] py-6 text-center">
        <p className="text-[10px] leading-4 text-ink-subtle">
          {brandName} · {labels.footer}
        </p>
      </footer>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={labels.moreTitle}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-surface px-[0.9rem] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <h3 className="text-[15px] font-semibold text-ink">{labels.moreTitle}</h3>
            <div className="mt-2 divide-y divide-line">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate(authenticated ? 'signOut' : 'signIn');
                }}
                className="flex w-full items-center gap-3 py-3 text-left text-[13px] text-ink"
              >
                {authenticated ? (
                  <LogOut className="h-4 w-4 text-ink-muted" aria-hidden />
                ) : (
                  <LogIn className="h-4 w-4 text-ink-muted" aria-hidden />
                )}
                <span className="flex-1">{authenticated ? labels.moreSignOut : labels.moreSignIn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate('help');
                }}
                className="flex w-full items-center gap-3 py-3 text-left text-[13px] text-ink"
              >
                <LifeBuoy className="h-4 w-4 text-ink-muted" aria-hidden />
                <span className="flex-1">{labels.moreHelp}</span>
              </button>
              <div className="flex items-center gap-3 py-3 text-[13px] text-ink">
                <Info className="h-4 w-4 text-ink-muted" aria-hidden />
                <span className="flex-1">{labels.moreAbout}</span>
                <span className="text-[10px] text-ink-subtle">{brandName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="mt-3 w-full rounded-xl border border-line bg-canvas py-2.5 text-[12px] font-medium text-ink-muted"
            >
              {labels.moreClose}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
