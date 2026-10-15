import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  EyeOff,
  FileArchive,
  Link2,
  Loader2,
  Package,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  formatCloudRouterUploadBytes,
  useCloudRouterUpload,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  DOWNLOAD_CATALOG_ICONS,
  DOWNLOAD_CATALOG_KINDS,
  DOWNLOAD_CATALOG_PLATFORMS,
  DOWNLOAD_CATALOG_PRIMARY_STRATEGIES,
  DOWNLOAD_CATALOG_TONES,
  DOWNLOAD_MAX_ACTIONS_PER_CARD,
  DOWNLOAD_MAX_CARDS,
  createEmptyDownloadCatalogAction,
  createEmptyDownloadCatalogCard,
  findDownloadCatalogActionWarningCodes,
  findDownloadCatalogCardWarningCodes,
  findIncompleteDownloadCatalog,
  isDownloadCatalogDriveHref,
  readInitialDownloadCatalogForm,
  toDownloadCatalogText,
  type DownloadCatalogActionFields,
  type DownloadCatalogCardFields,
  type DownloadCatalogCheck,
  type DownloadCatalogForm,
  type DownloadCatalogWarningCode,
} from './siteContentFields';
import {
  InlineWarning,
  SectionDivider,
  SelectField,
  TextArea,
  TextField,
  ToggleSwitch,
} from './SiteSettingsControls';

/**
 * The `/admin/site` download catalog editor.
 *
 * One document, two editors. The structured editor is how an operator maintains packages by
 * hand — one tab per edition, one row per platform installer, a URL to fill or a file to
 * upload. The JSON editor stays for release pipelines that already produce the document. Both
 * read and write the same canonical text (`value`), so the page's unsaved-changes counter, the
 * save guard and the publishable summary keep working no matter which mode an operator uses.
 *
 * The structured editor seeds itself from what is already live: a published document, or — when
 * nothing is published — the application's bundled catalog (`fallbackCatalog`, handed in by the
 * app composition layer because a console package may not depend on a landing surface). The seed
 * stays editor state, so opening the page and saving publishes nothing; the first edit is what
 * turns it into a published document.
 *
 * An uploaded installer is stored on its action as a Drive node reference plus the read-only
 * share token minted at upload time; the landing page exchanges that token for a fresh download
 * URL at render time (the same chain the public footer uses for Drive-hosted artwork), because
 * Drive download URLs are short-lived presigned links and cannot be pasted into a catalog.
 */

type DownloadEditorMode = 'json' | 'structured';

/** Filename extensions the installer upload accepts; MIME sniffing is unreliable for binaries. */
const INSTALLER_FILE_EXTENSIONS: readonly string[] = [
  '.exe',
  '.msi',
  '.msix',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
  '.appimage',
  '.snap',
  '.tar.gz',
  '.tgz',
  '.zip',
  '.apk',
];

const INSTALLER_ACCEPT_ATTRIBUTE = INSTALLER_FILE_EXTENSIONS.join(',');

function installerExtensionOf(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();
  return INSTALLER_FILE_EXTENSIONS.find((extension) => lower.endsWith(extension));
}

const WARNING_LABEL_KEYS: Record<DownloadCatalogWarningCode, string> = {
  'action.identity': 'admin.siteSettings.downloads.warning.actionIdentity',
  'action.target': 'admin.siteSettings.downloads.warning.actionTarget',
  'card.actions.missing': 'admin.siteSettings.downloads.warning.cardActionsMissing',
  'card.identity': 'admin.siteSettings.downloads.warning.cardIdentity',
  'cards.missing': 'admin.siteSettings.downloads.warning.cardsMissing',
};

export function DownloadCatalogEditor({
  check,
  fallbackCatalog,
  onChange,
  value,
}: {
  check: DownloadCatalogCheck;
  /** The application's bundled catalog, used to seed the editor when nothing is published. */
  fallbackCatalog?: unknown;
  onChange: (next: string) => void;
  value: string;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DownloadEditorMode>('structured');

  /**
   * The editor's working form, seeded from what is already live (published document, else the
   * bundled catalog).
   *
   * State rather than a per-render derivation because the seed must not leak into the document:
   * an operator who opens the page and saves must publish nothing, so the bundled seed only
   * becomes `value` when a structured edit serialises it.
   */
  const [form, setForm] = useState<DownloadCatalogForm | null>(
    () => readInitialDownloadCatalogForm(value, fallbackCatalog),
  );
  /** The text the current form state corresponds to, so outside changes can be told apart. */
  const authoredTextRef = useRef<string>(value);

  useEffect(() => {
    if (value !== authoredTextRef.current) {
      // An outside write (reload, discard, JSON-mode edit, clear) re-seeds the form.
      authoredTextRef.current = value;
      setForm(readInitialDownloadCatalogForm(value, fallbackCatalog));
      return;
    }
    // The bundled seed may arrive late (the composition layer loads it asynchronously) while
    // nothing is published. An empty value cannot hold unserialised structured edits — every
    // structured edit writes text immediately — so re-seeding here is lossless.
    if (value.trim().length === 0) {
      setForm(readInitialDownloadCatalogForm(value, fallbackCatalog));
    }
  }, [value, fallbackCatalog]);

  const unpublished = value.trim().length === 0;

  const patchForm = (next: DownloadCatalogForm) => {
    const text = toDownloadCatalogText(next);
    authoredTextRef.current = text;
    setForm(next);
    onChange(text);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.downloads.intro')}
      </p>

      <div
        className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5"
        data-admin-site-download-editor-mode={mode}
        role="tablist"
      >
        {(
          [
            ['structured', 'admin.siteSettings.downloads.modeStructured'],
            ['json', 'admin.siteSettings.downloads.modeJson'],
          ] as const
        ).map(([candidate, labelKey]) => (
          <button
            aria-selected={mode === candidate}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === candidate
                ? 'bg-lobster-500/10 text-lobster-600 dark:bg-lobster-500/15 dark:text-lobster-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
            key={candidate}
            onClick={() => setMode(candidate)}
            role="tab"
            type="button"
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {mode === 'structured' ? (
        form ? (
          <StructuredCatalogForm form={form} onChange={patchForm} unpublished={unpublished} />
        ) : (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            role="alert"
          >
            {t('admin.siteSettings.downloads.unparseable')}
            <button
              className="ml-3 font-semibold underline underline-offset-2"
              onClick={() => setMode('json')}
              type="button"
            >
              {t('admin.siteSettings.downloads.fixInJson')}
            </button>
          </div>
        )
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('admin.siteSettings.downloads.fieldLabel')}
          </span>
          <textarea
            className="h-80 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
            data-admin-site-download-catalog
            onChange={(event) => onChange(event.target.value)}
            placeholder={t('admin.siteSettings.downloads.placeholder')}
            spellCheck={false}
            value={value}
          />
        </label>
      )}

      <DownloadCatalogStatus check={check} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          disabled={value.trim().length === 0}
          onClick={() => onChange('')}
          type="button"
        >
          {t('admin.siteSettings.downloads.clear')}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('admin.siteSettings.downloads.clearHint')}
        </p>
      </div>
    </div>
  );
}

function DownloadCatalogStatus({ check }: { check: DownloadCatalogCheck }) {
  const { t } = useTranslation();
  const summary = check.summary;
  if (check.ok) {
    return summary ? (
      <div
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        data-admin-site-download-status="publishable"
        role="status"
      >
        {t('admin.siteSettings.downloads.publishable', {
          actions: summary.actions,
          cards: summary.cards,
          name: summary.productName,
          version: summary.version,
        })}
      </div>
    ) : (
      <div
        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        data-admin-site-download-status="unset"
        role="status"
      >
        {t('admin.siteSettings.downloads.unset')}
      </div>
    );
  }
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
      data-admin-site-download-status="invalid"
      role="alert"
    >
      <p className="font-medium">{t('admin.siteSettings.downloads.invalidTitle')}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {check.problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}

function StructuredCatalogForm({
  form,
  onChange,
  unpublished,
}: {
  form: DownloadCatalogForm;
  onChange: (next: DownloadCatalogForm) => void;
  /** Nothing is published yet, so the form is showing the seeded (bundled) catalog. */
  unpublished: boolean;
}) {
  const { t } = useTranslation();
  const warnings = findIncompleteDownloadCatalog(form);
  /**
   * Which card tab is open. Held by card id rather than index so an outside re-seed, a removal
   * or a reorder keeps pointing at the same card whenever it still exists; a stale id falls
   * back to the first tab.
   */
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const activeIndex = form.cards.findIndex((card) => card.id !== '' && card.id === activeCardId);
  const resolvedIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeCard = form.cards[resolvedIndex];

  const patch = (partial: Partial<DownloadCatalogForm>) => onChange({ ...form, ...partial });

  const patchCard = (index: number, partial: Partial<DownloadCatalogCardFields>) =>
    onChange({
      ...form,
      cards: form.cards.map((card, position) =>
        position === index ? { ...card, ...partial } : card),
    });

  const moveCard = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= form.cards.length) {
      return;
    }
    const cards = [...form.cards];
    const [moved] = cards.splice(index, 1);
    cards.splice(target, 0, moved);
    onChange({ ...form, cards });
  };

  const addCard = () => {
    if (form.cards.length >= DOWNLOAD_MAX_CARDS) {
      return;
    }
    const card = createEmptyDownloadCatalogCard();
    // The new tab becomes the working tab: the operator added it in order to fill it.
    setActiveCardId(card.id);
    onChange({ ...form, cards: [...form.cards, card] });
  };

  const removeCard = (index: number) => {
    const removed = form.cards[index];
    onChange({ ...form, cards: form.cards.filter((_, position) => position !== index) });
    if (removed && removed.id === activeCardId) {
      // Land on a neighbour rather than a dead tab: prefer the card that took this slot.
      const nextCards = form.cards.filter((_, position) => position !== index);
      const neighbour = nextCards[index] ?? nextCards[nextCards.length - 1];
      setActiveCardId(neighbour?.id ?? null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      {unpublished ? (
        <div
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
          data-admin-site-download-bundled-hint
          role="note"
        >
          {t('admin.siteSettings.downloads.bundledHint')}
        </div>
      ) : null}

      <SectionDivider title={t('admin.siteSettings.downloads.product.title')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextField
          label={t('admin.siteSettings.downloads.product.productId')}
          maxLength={255}
          onChange={(next) => patch({ productId: next })}
          value={form.productId}
        />
        <TextField
          label={t('admin.siteSettings.downloads.product.productName')}
          maxLength={255}
          onChange={(next) => patch({ productName: next })}
          value={form.productName}
        />
        <TextField
          label={t('admin.siteSettings.downloads.product.productVersion')}
          maxLength={255}
          onChange={(next) => patch({ productVersion: next })}
          value={form.productVersion}
        />
        <TextField
          label={t('admin.siteSettings.downloads.product.productChannel')}
          maxLength={255}
          onChange={(next) => patch({ productChannel: next })}
          value={form.productChannel}
        />
        <TextField
          label={t('admin.siteSettings.downloads.product.productReleaseTag')}
          maxLength={255}
          onChange={(next) => patch({ productReleaseTag: next })}
          value={form.productReleaseTag}
        />
        <TextField
          label={t('admin.siteSettings.downloads.product.productReleaseUrl')}
          maxLength={4096}
          onChange={(next) => patch({ productReleaseUrl: next })}
          value={form.productReleaseUrl}
        />
      </div>

      <SectionDivider title={t('admin.siteSettings.downloads.cards.title')} />

      {/*
        One tab per edition instead of one stacked block per edition: the operator switches
        between Desktop/Server/Mobile rather than scrolling a page of card editors, and the
        amber dot says which edition still needs work without opening it.
      */}
      <div
        aria-label={t('admin.siteSettings.downloads.cards.title')}
        className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1 dark:border-white/10"
        data-admin-site-download-card-tabs
        role="tablist"
      >
        {form.cards.map((card, index) => {
          const cardWarnings = findDownloadCatalogCardWarningCodes(card);
          return (
            <button
              aria-selected={index === resolvedIndex && Boolean(activeCard)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                index === resolvedIndex && Boolean(activeCard)
                  ? 'border-lobster-500 bg-lobster-500/10 text-lobster-600 dark:bg-lobster-500/15 dark:text-lobster-300'
                  : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
              data-admin-site-download-tab={card.id}
              data-admin-site-download-tab-warning={cardWarnings.length > 0 ? 'true' : undefined}
              key={card.id || `card-${index}`}
              onClick={() => setActiveCardId(card.id)}
              role="tab"
              type="button"
            >
              <span className={`max-w-44 truncate ${card.hidden ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                {card.title.trim() || t('admin.siteSettings.downloads.card.untitled')}
              </span>
              {card.hidden ? (
                <span className="shrink-0" title={t('admin.siteSettings.downloads.card.hidden')}>
                  <EyeOff aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </span>
              ) : null}
              {cardWarnings.length > 0 ? (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  title={t(WARNING_LABEL_KEYS[cardWarnings[0]])}
                />
              ) : null}
            </button>
          );
        })}
        <button
          aria-label={t('admin.siteSettings.downloads.cards.add')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lobster-400 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-300 dark:hover:border-lobster-500/60"
          data-admin-site-download-tab-add
          disabled={form.cards.length >= DOWNLOAD_MAX_CARDS}
          onClick={addCard}
          title={t('admin.siteSettings.downloads.cards.add')}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('admin.siteSettings.downloads.cards.add')}
        </button>
      </div>

      {warnings.includes('cards.missing') ? (
        <InlineWarning>{t(WARNING_LABEL_KEYS['cards.missing'])}</InlineWarning>
      ) : null}

      {activeCard ? (
        <DownloadCatalogCardEditor
          actionsWarning={findDownloadCatalogCardWarningCodes(activeCard).includes('card.actions.missing')}
          card={activeCard}
          identityWarning={findDownloadCatalogCardWarningCodes(activeCard).includes('card.identity')}
          isFirst={resolvedIndex === 0}
          isLast={resolvedIndex === form.cards.length - 1}
          key={activeCard.id || `card-${resolvedIndex}`}
          onMoveDown={() => moveCard(resolvedIndex, 1)}
          onMoveUp={() => moveCard(resolvedIndex, -1)}
          onPatch={(partial) => patchCard(resolvedIndex, partial)}
          onRemove={() => removeCard(resolvedIndex)}
        />
      ) : null}
    </div>
  );
}

function DownloadCatalogCardEditor({
  actionsWarning,
  card,
  identityWarning,
  isFirst,
  isLast,
  onMoveDown,
  onMoveUp,
  onPatch,
  onRemove,
}: {
  actionsWarning: boolean;
  card: DownloadCatalogCardFields;
  identityWarning: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onPatch: (partial: Partial<DownloadCatalogCardFields>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  /** The installer whose editing pane is open under this card's tab. */
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const kindOptions = [
    { label: t('admin.siteSettings.downloads.card.kindUnset'), value: '' },
    ...DOWNLOAD_CATALOG_KINDS.map((kind) => ({
      label: t(`admin.siteSettings.downloads.kind.${kind}`),
      value: kind,
    })),
  ];
  const iconOptions = DOWNLOAD_CATALOG_ICONS.map((icon) => ({
    label: t(`admin.siteSettings.downloads.icon.${icon}`),
    value: icon,
  }));
  const toneOptions = DOWNLOAD_CATALOG_TONES.map((tone) => ({
    label: t(`admin.siteSettings.downloads.tone.${tone}`),
    value: tone,
  }));
  const strategyOptions = [
    { label: t('admin.siteSettings.downloads.card.strategyAuto'), value: '' },
    ...DOWNLOAD_CATALOG_PRIMARY_STRATEGIES.map((strategy) => ({
      label: t(`admin.siteSettings.downloads.strategy.${strategy}`),
      value: strategy,
    })),
  ];
  const actionIdOptions = [
    { label: t('admin.siteSettings.downloads.card.primaryAuto'), value: '' },
    ...card.actions
      .filter((action) => action.id.trim() && action.label.trim())
      .map((action) => ({ label: action.label, value: action.id })),
  ];

  const patchAction = (index: number, partial: Partial<DownloadCatalogActionFields>) =>
    onPatch({
      actions: card.actions.map((action, position) =>
        position === index ? { ...action, ...partial } : action),
    });

  const moveAction = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= card.actions.length) {
      return;
    }
    const actions = [...card.actions];
    const [moved] = actions.splice(index, 1);
    actions.splice(target, 0, moved);
    onPatch({ actions });
  };

  const addAction = () => {
    if (card.actions.length >= DOWNLOAD_MAX_ACTIONS_PER_CARD) {
      return;
    }
    const action = createEmptyDownloadCatalogAction();
    // The new sidebar entry becomes the working pane, the same way a new tab does.
    setActiveActionId(action.id);
    onPatch({ actions: [...card.actions, action] });
  };

  const removeAction = (index: number) => {
    const removed = card.actions[index];
    onPatch({ actions: card.actions.filter((_, position) => position !== index) });
    if (removed && removed.id !== '' && removed.id === activeActionId) {
      const nextActions = card.actions.filter((_, position) => position !== index);
      const neighbour = nextActions[index] ?? nextActions[nextActions.length - 1];
      setActiveActionId(neighbour?.id ?? null);
    }
  };

  /**
   * Which installer pane is open, held by id so a removal or reorder keeps pointing at the same
   * installer whenever it still exists; a stale or empty id falls back to the first entry.
   */
  const activeActionIndex = card.actions.findIndex(
    (action) => action.id !== '' && action.id === activeActionId,
  );
  const resolvedActionIndex = activeActionIndex >= 0 ? activeActionIndex : 0;
  const activeAction = card.actions[resolvedActionIndex];

  return (
    <div
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
      data-admin-site-download-card={card.id}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Package className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <p className={`truncate text-sm font-semibold ${card.hidden ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
            {card.title || t('admin.siteSettings.downloads.card.untitled')}
          </p>
          {card.hidden ? (
            <span className="inline-flex shrink-0" title={t('admin.siteSettings.downloads.card.hidden')}>
              <EyeOff aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('admin.siteSettings.downloads.card.hidden')}
            <ToggleSwitch
              checked={card.hidden}
              label={t('admin.siteSettings.downloads.card.hidden')}
              onChange={(hidden) => onPatch({ hidden })}
            />
          </label>
          <RowControls
            moveDownDisabled={isLast}
            moveUpDisabled={isFirst}
            onMoveDown={onMoveDown}
            onMoveUp={onMoveUp}
            onRemove={onRemove}
            removeLabelKey="admin.siteSettings.downloads.cards.remove"
          />
        </div>
      </div>

      {identityWarning ? (
        <div className="mb-3">
          <InlineWarning>{t(WARNING_LABEL_KEYS['card.identity'])}</InlineWarning>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.downloads.card.title')}
          maxLength={255}
          onChange={(title) => onPatch({ title })}
          value={card.title}
        />
        <SelectField
          label={t('admin.siteSettings.downloads.card.kind')}
          onChange={(kind) => onPatch({ kind: kind as DownloadCatalogCardFields['kind'] })}
          options={kindOptions}
          value={card.kind}
        />
        <TextArea
          className="md:col-span-2"
          label={t('admin.siteSettings.downloads.card.description')}
          maxLength={4096}
          onChange={(description) => onPatch({ description })}
          rows={2}
          value={card.description}
        />
        <SelectField
          label={t('admin.siteSettings.downloads.card.icon')}
          onChange={(icon) => onPatch({ icon: icon as DownloadCatalogCardFields['icon'] })}
          options={iconOptions}
          value={card.icon}
        />
        <SelectField
          label={t('admin.siteSettings.downloads.card.tone')}
          onChange={(tone) => onPatch({ tone: tone as DownloadCatalogCardFields['tone'] })}
          options={toneOptions}
          value={card.tone}
        />
        <TextField
          label={t('admin.siteSettings.downloads.card.badge')}
          maxLength={255}
          onChange={(badge) => onPatch({ badge })}
          value={card.badge}
        />
        <SelectField
          label={t('admin.siteSettings.downloads.card.strategy')}
          onChange={(strategy) => onPatch({ primaryActionStrategy: strategy as DownloadCatalogCardFields['primaryActionStrategy'] })}
          options={strategyOptions}
          value={card.primaryActionStrategy}
        />
        <SelectField
          className="md:col-span-2"
          label={t('admin.siteSettings.downloads.card.primaryActionId')}
          onChange={(primaryActionId) => onPatch({ primaryActionId })}
          options={actionIdOptions}
          value={card.primaryActionId}
        />
      </div>

      {/*
        Master-detail instead of one expanded block per installer: the sidebar answers "what does
        this edition ship?" at a glance (name, platform · architecture, source kind, hidden flag,
        warning dot), and the pane edits exactly one installer at full width. Together with the
        edition tabs above, the whole matrix is two clicks deep instead of one long scroll.
      */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('admin.siteSettings.downloads.actions.title')}
        </p>
        {actionsWarning ? (
          <InlineWarning>{t(WARNING_LABEL_KEYS['card.actions.missing'])}</InlineWarning>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <nav
            aria-label={t('admin.siteSettings.downloads.actions.title')}
            aria-orientation="vertical"
            className="flex w-full shrink-0 flex-col gap-1 lg:w-64"
            data-admin-site-download-action-nav
            role="tablist"
          >
            {card.actions.map((action, index) => {
              const actionWarnings = findDownloadCatalogActionWarningCodes(action);
              const selected = index === resolvedActionIndex && Boolean(activeAction);
              return (
                <button
                  aria-selected={selected}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'bg-lobster-500/10 font-semibold text-lobster-600 dark:bg-lobster-500/15 dark:text-lobster-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                  data-admin-site-download-action-tab={action.id}
                  data-admin-site-download-action-tab-warning={actionWarnings.length > 0 ? 'true' : undefined}
                  key={action.id || `action-${index}`}
                  onClick={() => setActiveActionId(action.id)}
                  role="tab"
                  type="button"
                >
                  {actionWarnings.length > 0 ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                      title={t(WARNING_LABEL_KEYS[actionWarnings[0]])}
                    />
                  ) : (
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" />
                  )}
                  {action.drive.nodeId.trim() ? (
                    <FileArchive aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Link2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  )}
                  <span className={`min-w-0 flex-1 truncate ${action.disabled ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}>
                    {action.label.trim() || t('admin.siteSettings.downloads.action.unnamed')}
                  </span>
                  {action.disabled ? (
                    <span className="shrink-0" title={t('admin.siteSettings.downloads.action.disabled')}>
                      <Clock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    </span>
                  ) : null}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      action.platform
                        ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                    }`}
                  >
                    {action.platform
                      ? t(`admin.siteSettings.downloads.platform.${action.platform}`)
                      : t('admin.siteSettings.downloads.action.platformUnsetShort')}
                    {action.architecture.trim() ? ` · ${action.architecture.trim()}` : ''}
                  </span>
                </button>
              );
            })}
            <button
              aria-label={t('admin.siteSettings.downloads.actions.add')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lobster-400 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-300 dark:hover:border-lobster-500/60"
              data-admin-site-download-action-add
              disabled={card.actions.length >= DOWNLOAD_MAX_ACTIONS_PER_CARD}
              onClick={addAction}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.siteSettings.downloads.actions.add')}
            </button>
          </nav>

          {activeAction ? (
            <DownloadCatalogActionEditor
              action={activeAction}
              isFirst={resolvedActionIndex === 0}
              isLast={resolvedActionIndex === card.actions.length - 1}
              key={activeAction.id || `action-${resolvedActionIndex}`}
              onMoveDown={() => moveAction(resolvedActionIndex, 1)}
              onMoveUp={() => moveAction(resolvedActionIndex, -1)}
              onPatch={(partial) => patchAction(resolvedActionIndex, partial)}
              onRemove={() => removeAction(resolvedActionIndex)}
            />
          ) : (
            <div className="min-w-0 flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
              {t('admin.siteSettings.downloads.actions.add')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadCatalogActionEditor({
  action,
  isFirst,
  isLast,
  onMoveDown,
  onMoveUp,
  onPatch,
  onRemove,
}: {
  action: DownloadCatalogActionFields;
  isFirst: boolean;
  isLast: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onPatch: (partial: Partial<DownloadCatalogActionFields>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const platformOptions = [
    { label: t('admin.siteSettings.downloads.action.platformUnset'), value: '' },
    ...DOWNLOAD_CATALOG_PLATFORMS.map((platform) => ({
      label: t(`admin.siteSettings.downloads.platform.${platform}`),
      value: platform,
    })),
  ];
  const actionWarnings = findDownloadCatalogActionWarningCodes(action);
  const identityWarning = actionWarnings.includes('action.identity');
  const targetWarning = actionWarnings.includes('action.target');

  return (
    <div
      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20"
      data-admin-site-download-action={action.id}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {action.label.trim() || t('admin.siteSettings.downloads.action.unnamed')}
          </span>
          {action.disabled ? (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
              {t('admin.siteSettings.downloads.action.disabled')}
            </span>
          ) : null}
        </div>
        <RowControls
          compact
          moveDownDisabled={isLast}
          moveUpDisabled={isFirst}
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
          onRemove={onRemove}
          removeLabelKey="admin.siteSettings.downloads.actions.remove"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.downloads.action.label')}
          maxLength={255}
          onChange={(label) => onPatch({ label })}
          placeholder={t('admin.siteSettings.downloads.action.labelPlaceholder')}
          value={action.label}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label={t('admin.siteSettings.downloads.action.platform')}
            onChange={(platform) => onPatch({ platform: platform as DownloadCatalogActionFields['platform'] })}
            options={platformOptions}
            value={action.platform}
          />
          <TextField
            label={t('admin.siteSettings.downloads.action.architecture')}
            maxLength={255}
            onChange={(architecture) => onPatch({ architecture })}
            value={action.architecture}
          />
        </div>

        <InstallerSourceField action={action} onPatch={onPatch} />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('admin.siteSettings.downloads.action.disabled')}
            <ToggleSwitch
              checked={action.disabled}
              label={t('admin.siteSettings.downloads.action.disabled')}
              onChange={(disabled) => onPatch({ disabled })}
            />
          </label>
        </div>
      </div>

      {identityWarning ? (
        <div className="mt-2">
          <InlineWarning>{t(WARNING_LABEL_KEYS['action.identity'])}</InlineWarning>
        </div>
      ) : null}
      {targetWarning ? (
        <div className="mt-2">
          <InlineWarning>{t(WARNING_LABEL_KEYS['action.target'])}</InlineWarning>
        </div>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          {t('admin.siteSettings.downloads.action.advanced')}
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <TextField
            label={t('admin.siteSettings.downloads.action.fileName')}
            maxLength={255}
            onChange={(fileName) => onPatch({ fileName })}
            value={action.fileName}
          />
          <TextField
            label={t('admin.siteSettings.downloads.action.version')}
            maxLength={255}
            onChange={(version) => onPatch({ version })}
            value={action.version}
          />
          <TextField
            label={t('admin.siteSettings.downloads.action.releaseTag')}
            maxLength={255}
            onChange={(releaseTag) => onPatch({ releaseTag })}
            value={action.releaseTag}
          />
          <TextField
            label={t('admin.siteSettings.downloads.action.sizeBytes')}
            maxLength={24}
            onChange={(sizeBytes) => onPatch({ sizeBytes: sizeBytes.replace(/[^\d]/gu, '') })}
            value={action.sizeBytes}
          />
          <TextField
            className="md:col-span-2"
            label={t('admin.siteSettings.downloads.action.sha256')}
            maxLength={128}
            onChange={(sha256) => onPatch({ sha256 })}
            value={action.sha256}
          />
          <TextField
            className="md:col-span-2"
            label={t('admin.siteSettings.downloads.action.unavailableLabel')}
            maxLength={255}
            onChange={(unavailableLabel) => onPatch({ unavailableLabel })}
            value={action.unavailableLabel}
          />
        </div>
      </details>
    </div>
  );
}

/**
 * One installer row's download source: an external URL, or an uploaded file.
 *
 * An uploaded file lands on the action as a Drive node reference (`drive.spaceId`/`nodeId`) plus
 * the read-only share token, and `href` mirrors the reference. The landing page resolves that
 * reference per visitor, so the URL the operator sees here is deliberately not the address a
 * browser will open.
 */
function InstallerSourceField({
  action,
  onPatch,
}: {
  action: DownloadCatalogActionFields;
  onPatch: (partial: Partial<DownloadCatalogActionFields>) => void;
}) {
  const { t } = useTranslation();
  const upload = useCloudRouterUpload({ slot: 'site-download-installer' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const hasDriveFile = action.drive.nodeId.trim().length > 0;

  const handleFile = async (file: File) => {
    setClientError(null);
    if (!installerExtensionOf(file.name)) {
      setClientError(
        t('admin.siteSettings.downloads.upload.invalidType', {
          extensions: INSTALLER_FILE_EXTENSIONS.join(' '),
        }),
      );
      return;
    }
    const uploaded = await upload.upload(file);
    if (!uploaded) {
      // Rejected client-side or failed remotely; the hook owns the error surface.
      return;
    }
    onPatch({
      drive: {
        nodeId: uploaded.drive.nodeId,
        shareToken: uploaded.drive.shareToken ?? '',
        spaceId: uploaded.drive.spaceId,
      },
      fileName: uploaded.file.name,
      // Fill the package name from the file when the operator has not typed one: the row is
      // otherwise published with a name the homepage would drop.
      ...(action.label.trim().length === 0 ? { label: uploaded.file.name } : {}),
      href: `drive://spaces/${uploaded.drive.spaceId}/nodes/${uploaded.drive.nodeId}`,
      sizeBytes: String(uploaded.file.sizeBytes),
    });
  };

  const clearDriveFile = () => {
    onPatch({
      drive: { nodeId: '', shareToken: '', spaceId: '' },
      fileName: '',
      href: '',
      sizeBytes: '',
    });
  };

  return (
    <div className="md:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('admin.siteSettings.downloads.source.title')}
      </span>
      {hasDriveFile ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
          data-admin-site-download-installer={action.drive.nodeId}
        >
          <FileArchive className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
            {action.fileName || t('admin.siteSettings.downloads.upload.unnamedFile')}
            {action.sizeBytes.trim().length > 0
              ? ` · ${formatCloudRouterUploadBytes(Number(action.sizeBytes))}`
              : ''}
          </span>
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-lobster-600 dark:text-slate-400 dark:hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('admin.siteSettings.downloads.upload.replace')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-red-400"
            onClick={clearDriveFile}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.siteSettings.downloads.upload.clear')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <TextField
            label={t('admin.siteSettings.downloads.action.href')}
            maxLength={4096}
            onChange={(href) => onPatch({ href })}
            placeholder={t('admin.siteSettings.downloads.action.hrefPlaceholder')}
            value={isDownloadCatalogDriveHref(action.href) ? '' : action.href}
          />
          <button
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lobster-400 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-300 dark:hover:border-lobster-500/60"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('admin.siteSettings.downloads.upload.pick')}
          </button>
        </div>
      )}
      {upload.isUploading ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('admin.siteSettings.downloads.upload.uploading', {
            percent: upload.progress?.percent ?? 0,
          })}
        </p>
      ) : null}
      {clientError ?? upload.error ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
          {clientError ?? upload.error}
        </p>
      ) : null}
      <input
        accept={INSTALLER_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first so picking the same file again still fires a change event.
          event.target.value = '';
          if (file) {
            void handleFile(file);
          }
        }}
        ref={fileInputRef}
        type="file"
      />
    </div>
  );
}

/** Shared up/down/remove cluster so card and action rows cannot drift apart. */
function RowControls({
  compact = false,
  moveDownDisabled = false,
  moveUpDisabled = false,
  onMoveDown,
  onMoveUp,
  onRemove,
  removeLabelKey,
}: {
  compact?: boolean;
  moveDownDisabled?: boolean;
  moveUpDisabled?: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  removeLabelKey: string;
}) {
  const { t } = useTranslation();
  const removeLabel = t(removeLabelKey);
  const sizeClass = compact ? 'h-7 w-7' : 'h-8 w-8';
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        aria-label={t('admin.siteSettings.downloads.moveUp')}
        className={`${sizeClass} rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-slate-200`}
        disabled={moveUpDisabled}
        onClick={onMoveUp}
        title={t('admin.siteSettings.downloads.moveUp')}
        type="button"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        aria-label={t('admin.siteSettings.downloads.moveDown')}
        className={`${sizeClass} rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-slate-200`}
        disabled={moveDownDisabled}
        onClick={onMoveDown}
        title={t('admin.siteSettings.downloads.moveDown')}
        type="button"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        aria-label={removeLabel}
        className={`${sizeClass} rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400`}
        onClick={onRemove}
        title={removeLabel}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
