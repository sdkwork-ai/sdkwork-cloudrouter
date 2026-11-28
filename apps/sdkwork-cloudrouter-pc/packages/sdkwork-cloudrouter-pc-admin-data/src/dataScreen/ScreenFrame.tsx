/**
 * Screen-frame primitives for the operator data screen.
 *
 * The screen is a wall display, so it deliberately leaves the admin console
 * theme: a fixed deep-space background, cyan/violet accents, and panels framed by
 * corner ticks instead of card borders. Keeping those atoms here means each
 * panel component stays about data, not about chrome.
 */

import type { ReactNode } from 'react';

export type ScreenAccent = 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';

const ACCENT_HEX: Readonly<Record<ScreenAccent, string>> = {
  cyan: '#22d3ee',
  violet: '#a78bfa',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
  sky: '#38bdf8',
};

export function accentColor(accent: ScreenAccent): string {
  return ACCENT_HEX[accent];
}

/**
 * Panel frame: a glass slab lifted off the floor by a real 3D extrusion.
 *
 * The depth is not a painted shadow: each panel renders two stacked layers under
 * its face (`__depth`), separated in Z by a CSS 3D transform, so parallax is
 * physically consistent and the display keeps reading as a solid object on a
 * projector. `children` are the panel body.
 */
export function ScreenPanel({
  title,
  eyebrow,
  accent = 'cyan',
  actions,
  footer,
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  accent?: ScreenAccent;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const color = accentColor(accent);
  return (
    <section
      className={`screen-panel ${className}`}
      style={{ ['--screen-accent' as string]: color }}
      data-screen-panel
    >
      <span aria-hidden="true" className="screen-panel__depth" />
      <span aria-hidden="true" className="screen-panel__corner screen-panel__corner--tl" />
      <span aria-hidden="true" className="screen-panel__corner screen-panel__corner--tr" />
      <span aria-hidden="true" className="screen-panel__corner screen-panel__corner--bl" />
      <span aria-hidden="true" className="screen-panel__corner screen-panel__corner--br" />
      {title || actions ? (
        <header className="screen-panel__header">
          <div className="screen-panel__heading">
            <span aria-hidden="true" className="screen-panel__mark" />
            {title ? <h2 className="screen-panel__title">{title}</h2> : null}
            {eyebrow ? <span className="screen-panel__eyebrow">{eyebrow}</span> : null}
          </div>
          {actions ? <div className="screen-panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`screen-panel__body ${bodyClassName}`}>{children}</div>
      {footer ? <footer className="screen-panel__footer">{footer}</footer> : null}
    </section>
  );
}

/** Segment control styled for the screen frame; the active pill is one radio. */
export function ScreenSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div aria-label={label} className="screen-segmented" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            aria-checked={active}
            className="screen-segmented__item"
            data-active={active ? 'true' : 'false'}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Flat action button for the header strip. */
export function ScreenButton({
  children,
  onClick,
  active = false,
  ariaLabel,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      className="screen-button"
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

/** Large numeric readout shared by every stat panel. */
export function ScreenStatValue({
  children,
  unit,
  tone = 'cyan',
}: {
  children: ReactNode;
  unit?: ReactNode;
  tone?: ScreenAccent;
}) {
  return (
    <span className="screen-stat-value" style={{ color: accentColor(tone) }}>
      {children}
      {unit ? <span className="screen-stat-value__unit">{unit}</span> : null}
    </span>
  );
}

/** Thin labelled meter used inside stat panels and ranking rows. */
export function ScreenMeter({
  percent,
  color,
  trackColor = 'rgba(148, 163, 184, 0.16)',
  height = 6,
}: {
  percent: number;
  color: string;
  trackColor?: string;
  height?: number;
}) {
  const width = Math.min(Math.max(Number.isFinite(percent) ? percent : 0, 0), 100);
  return (
    <span className="screen-meter" style={{ background: trackColor, height }}>
      <span className="screen-meter__fill" style={{ background: color, width: `${width}%` }} />
    </span>
  );
}

/** Empty state for a panel whose source returned no rows (still a real answer). */
export function ScreenEmpty({ message }: { message: string }) {
  return <div className="screen-empty">{message}</div>;
}
