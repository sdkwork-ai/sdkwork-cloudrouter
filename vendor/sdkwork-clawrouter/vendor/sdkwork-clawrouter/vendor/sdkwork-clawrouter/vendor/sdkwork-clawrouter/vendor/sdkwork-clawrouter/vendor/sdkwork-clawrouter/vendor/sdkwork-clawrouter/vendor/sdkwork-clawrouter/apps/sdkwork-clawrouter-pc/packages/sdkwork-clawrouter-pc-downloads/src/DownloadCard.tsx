import {
  Download,
  Monitor,
  Play,
  Server,
  Smartphone,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { isBlank } from "@sdkwork/utils";
import type { MouseEvent } from "react";
import type {
  SdkworkDownloadAction,
  SdkworkDownloadCard,
  SdkworkDownloadCardIcon,
  SdkworkDownloadSource,
  SdkworkDownloadCardTone,
  SdkworkDownloadCardViewProps,
  SdkworkDownloadSectionVariant,
} from "./download-types";
import { resolveSdkworkDownloadCardActions } from "./platform-detection";

const iconByName: Record<SdkworkDownloadCardIcon, LucideIcon> = {
  desktop: Monitor,
  download: Download,
  mobile: Smartphone,
  server: Server,
  terminal: Terminal,
};

const iconToneClass: Record<SdkworkDownloadCardTone, string> = {
  brand: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  mobile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300",
  server: "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300",
};

const primaryToneClass: Record<SdkworkDownloadCardTone, string> = {
  brand: "bg-rose-600 text-white hover:bg-rose-700",
  mobile: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20",
  server: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20",
};

function isActionAvailable(action: SdkworkDownloadAction): boolean {
  return !action.disabled && !isBlank(action.href) && action.href.trim() !== "#";
}

function isSourceAvailable(source: SdkworkDownloadSource): boolean {
  return !source.disabled && !isBlank(source.href) && source.href.trim() !== "#";
}

function toActionLabel(action: SdkworkDownloadAction, primary: boolean): string {
  if (!primary) {
    return action.label;
  }

  return action.ctaLabel ?? `Download ${action.label}`;
}

function toUnavailableLabel(action: SdkworkDownloadAction): string {
  return action.unavailableLabel ?? `${action.label} unavailable`;
}

function toSourceAriaLabel(action: SdkworkDownloadAction, source: SdkworkDownloadSource): string {
  if (source.ariaLabel) {
    return source.ariaLabel;
  }

  const label = isSourceAvailable(source)
    ? `Download ${action.label} from ${source.label}`
    : source.unavailableLabel ?? `${action.label} ${source.label} unavailable`;

  return label;
}

function handleActionClick(
  event: MouseEvent<HTMLAnchorElement>,
  action: SdkworkDownloadAction,
  card: SdkworkDownloadCard,
  onDownloadSelect: SdkworkDownloadCardViewProps["onDownloadSelect"],
): void {
  if (!isActionAvailable(action)) {
    event.preventDefault();
    return;
  }

  onDownloadSelect?.(action, card);
}

function handleSourceClick(
  event: MouseEvent<HTMLAnchorElement>,
  action: SdkworkDownloadAction,
  source: SdkworkDownloadSource,
  card: SdkworkDownloadCard,
  onDownloadSelect: SdkworkDownloadCardViewProps["onDownloadSelect"],
): void {
  if (!isSourceAvailable(source)) {
    event.preventDefault();
    return;
  }

  onDownloadSelect?.(action, card, source);
}

function resolveVisibleSources(action: SdkworkDownloadAction): readonly SdkworkDownloadSource[] {
  const sources = action.sources?.filter(isSourceAvailable) ?? [];

  if (sources.length <= 1) {
    return [];
  }

  return [...sources].sort((left, right) => {
    if (left.primary === right.primary) {
      return 0;
    }

    return left.primary ? -1 : 1;
  });
}

function CardIcon({
  icon,
  tone,
  variant,
}: {
  icon: SdkworkDownloadCardIcon | undefined;
  tone: SdkworkDownloadCardTone;
  variant: SdkworkDownloadSectionVariant;
}) {
  const Icon = iconByName[icon ?? "download"];
  const sizeClass = variant === "compact" ? "h-10 w-10 rounded-md" : "h-11 w-11 rounded-md";
  const iconClass = variant === "compact" ? "h-5 w-5" : "h-5 w-5";

  return (
    <div className={`inline-flex items-center justify-center ${sizeClass} ${iconToneClass[tone]}`}>
      <Icon className={iconClass} />
    </div>
  );
}

function DownloadActionLink({
  action,
  card,
  onDownloadSelect,
  primary,
  tone,
}: {
  action: SdkworkDownloadAction;
  card: SdkworkDownloadCard;
  onDownloadSelect: SdkworkDownloadCardViewProps["onDownloadSelect"];
  primary: boolean;
  tone: SdkworkDownloadCardTone;
}) {
  const available = isActionAvailable(action);
  const label = available ? toActionLabel(action, primary) : toUnavailableLabel(action);
  const Icon = primary
    ? iconByName[card.icon ?? "download"]
    : action.platform === "android"
      ? Play
      : Download;

  if (!available) {
    return (
      <button
        aria-label={label}
        className={
          primary
            ? "flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-6 py-4 text-sm font-semibold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
            : "inline-flex cursor-not-allowed items-center gap-1 text-slate-300 dark:text-slate-600"
        }
        disabled
        type="button"
      >
        <Icon className={primary ? "h-5 w-5" : "h-4 w-4"} />
        {label}
      </button>
    );
  }

  return (
    <a
      aria-label={action.ariaLabel ?? label}
      className={
        primary
          ? `flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold transition-all ${primaryToneClass[tone]}`
          : "inline-flex items-center gap-1 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      }
      href={action.href}
      onClick={(event) => handleActionClick(event, action, card, onDownloadSelect)}
      rel={action.external ? "noreferrer" : undefined}
      target={action.external ? "_blank" : undefined}
    >
      <Icon className={primary ? "h-5 w-5" : "h-4 w-4"} />
      {label}
    </a>
  );
}

function DownloadSourceLinks({
  action,
  card,
  onDownloadSelect,
  secondary = false,
}: {
  action: SdkworkDownloadAction;
  card: SdkworkDownloadCard;
  onDownloadSelect: SdkworkDownloadCardViewProps["onDownloadSelect"];
  secondary?: boolean;
}) {
  const sources = resolveVisibleSources(action);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={`${secondary ? "mt-2" : "mt-3"} flex min-h-8 w-full flex-wrap items-center justify-center gap-2 text-xs font-semibold`}>
      {sources.map((source) => (
        <a
          aria-label={toSourceAriaLabel(action, source)}
          className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 px-3 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
          href={source.href}
          key={source.id}
          onClick={(event) => handleSourceClick(event, action, source, card, onDownloadSelect)}
          rel={source.external ?? action.external ? "noreferrer" : undefined}
          target={source.external ?? action.external ? "_blank" : undefined}
        >
          {source.label}
        </a>
      ))}
    </div>
  );
}

function cardClassName(variant: SdkworkDownloadSectionVariant): string {
  const base = "group relative flex flex-col overflow-hidden bg-transparent p-6 text-left dark:bg-transparent";

  if (variant === "hero") {
    return `${base} transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]`;
  }

  if (variant === "compact") {
    return "group relative flex flex-col overflow-hidden bg-transparent p-4 text-left dark:bg-transparent";
  }

  return `${base} transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]`;
}

export function SdkworkDownloadCardView({
  card,
  detectedPlatform,
  onDownloadSelect,
  variant = "section",
}: SdkworkDownloadCardViewProps) {
  const tone = card.tone ?? "neutral";
  const { primaryAction, secondaryActions } = resolveSdkworkDownloadCardActions(
    card,
    detectedPlatform,
  );
  const BackgroundIcon = iconByName[card.icon ?? "download"];

  return (
    <article className={cardClassName(variant)}>
      <div className="pointer-events-none absolute -right-6 -top-6 p-8 opacity-0 transition-all duration-500 group-hover:scale-110 group-hover:opacity-5">
        <BackgroundIcon className="h-48 w-48 text-slate-900 dark:text-white" />
      </div>

      <div className="relative z-10 mb-4">
        <CardIcon icon={card.icon} tone={tone} variant={variant} />
      </div>

      {card.badge ? (
        <div className="relative z-10 mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {card.badge}
        </div>
      ) : null}

      <h3 className="relative z-10 mb-3 text-2xl font-bold text-slate-900 dark:text-white">
        {card.title}
      </h3>
      <p className="relative z-10 mb-6 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {card.description}
      </p>

      <div className="relative z-10 mb-5">
        <DownloadActionLink
          action={primaryAction}
          card={card}
          onDownloadSelect={onDownloadSelect}
          primary
          tone={tone}
        />
        <DownloadSourceLinks
          action={primaryAction}
          card={card}
          onDownloadSelect={onDownloadSelect}
        />
      </div>

      {secondaryActions.length > 0 ? (
        <div className="relative z-10 flex w-full flex-wrap items-start justify-center gap-x-4 gap-y-3 text-xs font-medium">
          {secondaryActions.map((action, index) => (
            <span className="inline-flex items-start gap-x-4" key={action.id}>
              <span className="inline-flex flex-col items-center">
                <DownloadActionLink
                  action={action}
                  card={card}
                  onDownloadSelect={onDownloadSelect}
                  primary={false}
                  tone={tone}
                />
                <DownloadSourceLinks
                  action={action}
                  card={card}
                  onDownloadSelect={onDownloadSelect}
                  secondary
                />
              </span>
              {index < secondaryActions.length - 1 ? (
                <span className="pt-0.5 text-slate-300 dark:text-slate-700">/</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
