/**
 * Host admin surface contract, shared by the locally authored IAM admin pages.
 *
 * Every page in this package renders inside the Cloud Router admin shell, whose
 * canonical list chrome is authored once in the application's `src/index.css`
 * (`embedded-fill-page`, `data-surface`, `admin-list-toolbar`,
 * `admin-list-table`, `admin-list-footer`, `admin-control`, `admin-button`,
 * `admin-badge`, `admin-alert`). Those hooks carry the shell's neutral surface
 * palette, one control geometry and one accent color for light and dark, so a
 * locally authored page matches the composed admin pages mounted in the same
 * shell instead of restating a second, bluish slate theme.
 *
 * The constants are declared once here for the same reason the CSS hooks are
 * declared once in the shell: two IAM pages that align a card, a control or a
 * badge must not drift into two slightly different class strings.
 */

/** Filled accent action (the page's one primary command). */
export const ADMIN_BUTTON_PRIMARY = 'admin-button admin-button--primary';
/** Bordered neutral action (refresh, row actions, paging). */
export const ADMIN_BUTTON_SECONDARY = 'admin-button admin-button--secondary';
/** Text-only action for secondary toolbar commands. */
export const ADMIN_BUTTON_GHOST = 'admin-button admin-button--ghost';
/** Bordered destructive action (opens a confirmation, does not fire it). */
export const ADMIN_BUTTON_DANGER = 'admin-button admin-button--danger';
/** Filled destructive action for the confirm step of a dialog. */
export const ADMIN_BUTTON_DANGER_SOLID =
  'inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50';

/** One control geometry for inputs, selects and textareas (36px, token border). */
export const ADMIN_CONTROL_CLASS = 'admin-control';
/** Field label above a control. */
export const ADMIN_FIELD_LABEL_CLASS = 'admin-field__label';
/** Secondary text color, including helper hints and table sub-values. */
export const ADMIN_MUTED_TEXT_CLASS = 'text-[var(--admin-surface-text-muted)]';
/** Uppercase section heading inside a card or dialog. */
export const ADMIN_SECTION_TITLE_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-[var(--admin-surface-text-muted)]';
/** Dialog/panel surface matching the card surface in both schemes. */
export const ADMIN_MODAL_PANEL_CLASS =
  'max-h-[90vh] w-full overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#171717]';
/** Scrollable bordered region nested inside a dialog (facts, sub-tables). */
export const ADMIN_MODAL_SURFACE_CLASS = 'overflow-auto rounded-lg border border-slate-200 dark:border-white/10';
/** Neutral status/ownership chip. */
export const ADMIN_BADGE_NEUTRAL = 'admin-badge admin-badge--neutral';
