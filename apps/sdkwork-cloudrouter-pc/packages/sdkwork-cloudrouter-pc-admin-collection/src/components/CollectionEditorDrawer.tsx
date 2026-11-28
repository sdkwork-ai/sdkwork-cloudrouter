import { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Layers3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  COLLECTION_KEY_PATTERN,
  COLLECTION_MAX_TAGS,
  CollectionService,
  sameCollectionItemDrafts,
  toCollectionItemDrafts,
  type AdminCollection,
  type AdminCollectionCategory,
  type CollectionInput,
  type CollectionItemDraft,
  type CollectionKind,
  type CollectionRecordStatus,
  type CollectionVisibility,
} from '../collectionService';
import {
  CheckboxField,
  collectionCategoryLabel,
  formatTagText,
  kindOptions,
  parseTagText,
  recordStatusOptions,
  SelectField,
  TextAreaField,
  TextField,
  visibilityOptions,
} from '../collectionUi';
import { CollectionItemsEditor } from './CollectionItemsEditor';
import { CollectionReleaseHistory } from './CollectionReleaseHistory';

export type CollectionEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; collection: AdminCollection };

export interface CollectionEditorDrawerProps {
  state: CollectionEditorState;
  categories: readonly AdminCollectionCategory[];
  onClose: () => void;
  onSaved: (collection: AdminCollection, options?: { resetToDraft?: boolean }) => void;
}

interface CollectionFormFields {
  name: string;
  collectionKey: string;
  summary: string;
  description: string;
  iconRef: string;
  collectionKind: CollectionKind;
  categoryId: string;
  visibility: CollectionVisibility;
  tagsText: string;
  featured: boolean;
  sortOrder: string;
  status: CollectionRecordStatus;
}

const TEXT_LIMITS = {
  name: 255,
  summary: 1024,
  description: 8000,
  iconRef: 512,
  sortOrder: 10,
} as const;

function initialFields(state: CollectionEditorState): CollectionFormFields {
  if (state.mode === 'create') {
    return {
      name: '',
      collectionKey: '',
      summary: '',
      description: '',
      iconRef: '',
      collectionKind: 'mixed',
      categoryId: '',
      visibility: 'organization',
      tagsText: '',
      featured: false,
      sortOrder: '0',
      status: 'enabled',
    };
  }
  const { collection } = state;
  return {
    name: collection.name,
    collectionKey: collection.collectionKey,
    summary: collection.summary,
    description: collection.description,
    iconRef: collection.iconRef,
    collectionKind: collection.collectionKind,
    categoryId: collection.categoryId ?? '',
    visibility: collection.visibility,
    tagsText: formatTagText(collection.tags),
    featured: collection.featured,
    sortOrder: String(collection.sortOrder),
    status: collection.status,
  };
}

function parseSortOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^[0-9]+$/u.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647 ? parsed : null;
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function dirtySnapshot(fields: CollectionFormFields, items: readonly CollectionItemDraft[]): string {
  return JSON.stringify({
    ...fields,
    tagsText: formatTagText(parseTagText(fields.tagsText)),
    items: items.map((item) => ({
      capabilityType: item.capabilityType,
      capabilityKey: item.capabilityKey,
      capabilityName: item.capabilityName,
      capabilityVersion: item.capabilityVersion,
      capabilityIconRef: item.capabilityIconRef,
      enabled: item.enabled,
      config: item.config,
    })),
  });
}

/**
 * Collection metadata + capability item drawer.
 *
 * Save keeps the two wire writes explicit: metadata goes through
 * `updateCollection`, and the ordered item set goes through
 * `replaceCollectionItems` only when it actually changed. Publishing is a
 * separate list action so a draft can be saved without creating a release.
 * Content edits on a published/archived collection return it to draft; the
 * drawer warns before that happens.
 */
export function CollectionEditorDrawer({ state, categories, onClose, onSaved }: CollectionEditorDrawerProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [fields, setFields] = useState<CollectionFormFields>(() => initialFields(state));
  const [items, setItems] = useState<CollectionItemDraft[]>(() => (state.mode === 'edit'
    ? toCollectionItemDrafts(state.collection.items)
    : []));
  const [initialSnapshot] = useState(() => dirtySnapshot(initialFields(state), state.mode === 'edit'
    ? toCollectionItemDrafts(state.collection.items)
    : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrderError, setSortOrderError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);

  const creating = state.mode === 'create';
  const collectionKind = fields.collectionKind;
  const currentCategoryId = state.mode === 'edit' ? state.collection.categoryId : null;
  const dirty = dirtySnapshot(fields, items) !== initialSnapshot || itemFormOpen;
  const republishNeeded = state.mode === 'edit' && state.collection.publishStatus !== 'draft';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const requestClose = () => {
    if (saving) {
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving || discardOpen) {
        return;
      }
      event.preventDefault();
      requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  const categoryOptions = useMemo(() => {
    const options = categories
      // A disabled category cannot be filed into (the backend rejects it);
      // keep the current one visible so editing never silently unfiles a
      // collection whose category was disabled later.
      .filter((category) => category.collectionKind === collectionKind)
      .filter((category) => category.status === 'enabled' || category.id === currentCategoryId)
      .map((category) => ({ value: category.id, label: collectionCategoryLabel(t, category) }));
    if (
      currentCategoryId
      && !options.some((option) => option.value === currentCategoryId)
      && state.mode === 'edit'
    ) {
      options.unshift({
        value: currentCategoryId,
        label: state.collection.categoryName
          ?? t('admin.collections.fields.categoryCurrent', 'Current category'),
      });
    }
    return [{ value: '', label: t('admin.collections.fields.categoryNone', 'No category') }, ...options];
  }, [categories, collectionKind, currentCategoryId, state, t]);

  const save = async () => {
    const name = fields.name.trim();
    if (!name) {
      setError(t('admin.collections.validation.nameRequired', 'Name is required.'));
      return;
    }
    const sortOrder = parseSortOrder(fields.sortOrder);
    if (sortOrder === null) {
      setSortOrderError(t('admin.collections.validation.sortOrder', 'Sort order must be a non-negative integer.'));
      return;
    }
    if (fields.collectionKey.trim() !== '' && !COLLECTION_KEY_PATTERN.test(fields.collectionKey.trim())) {
      setError(t(
        'admin.collections.validation.collectionKey',
        'Collection key must start with a lowercase letter or digit and contain only lowercase letters, digits, ".", "_" or "-".',
      ));
      return;
    }
    const tags = parseTagText(fields.tagsText);
    if (tags.length > COLLECTION_MAX_TAGS) {
      setError(t('admin.collections.validation.tagsTooMany', {
        max: COLLECTION_MAX_TAGS,
        defaultValue: 'A collection accepts at most {{max}} tags.',
      }));
      return;
    }
    if (tags.some((tag) => tag.length > 64)) {
      setError(t(
        'admin.collections.validation.tagTooLong',
        'Each tag must be at most 64 characters.',
      ));
      return;
    }
    setSortOrderError(null);
    setSaving(true);
    setError(null);
    try {
      if (state.mode === 'create') {
        const created = await CollectionService.createCollection({
          name,
          collectionKey: fields.collectionKey,
          summary: fields.summary,
          description: fields.description,
          iconRef: fields.iconRef,
          collectionKind: fields.collectionKind,
          categoryId: fields.categoryId === '' ? undefined : fields.categoryId,
          visibility: fields.visibility,
          tags: parseTagText(fields.tagsText),
          featured: fields.featured,
          sortOrder,
          items,
        });
        onSaved(created);
        return;
      }

      const { collection } = state;
      const updates: CollectionInput = {};
      if (name !== collection.name) {
        updates.name = name;
      }
      if (fields.summary !== collection.summary) {
        updates.summary = fields.summary;
      }
      if (fields.description !== collection.description) {
        updates.description = fields.description;
      }
      if (fields.iconRef !== collection.iconRef) {
        updates.iconRef = fields.iconRef;
      }
      const nextCategoryId = fields.categoryId === '' ? null : fields.categoryId;
      if (nextCategoryId !== collection.categoryId) {
        updates.categoryId = nextCategoryId;
      }
      if (fields.visibility !== collection.visibility) {
        updates.visibility = fields.visibility;
      }
      const nextTags = parseTagText(fields.tagsText);
      if (!sameStringArray(nextTags, collection.tags)) {
        updates.tags = nextTags;
      }
      if (fields.featured !== collection.featured) {
        updates.featured = fields.featured;
      }
      if (sortOrder !== collection.sortOrder) {
        updates.sortOrder = sortOrder;
      }
      if (fields.status !== collection.status) {
        updates.status = fields.status;
      }

      let saved = collection;
      if (Object.keys(updates).length > 0) {
        saved = await CollectionService.updateCollection(collection.id, updates);
      }
      if (!sameCollectionItemDrafts(items, toCollectionItemDrafts(collection.items))) {
        saved = await CollectionService.replaceCollectionItems(collection.id, items, collection.collectionKind);
      }
      onSaved(saved, {
        resetToDraft: collection.publishStatus !== 'draft' && saved.publishStatus === 'draft',
      });
    } catch (saveError) {
      setError(resolveProblemMessage(
        saveError,
        t,
        t('admin.collections.errors.save', 'Failed to save the collection'),
      ));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-admin-collection-editor
      className="fixed inset-0 z-[70] flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#1a1a1a]/95">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <div id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
                {creating
                  ? t('admin.collections.editor.createTitle', 'New collection')
                  : t('admin.collections.editor.editTitle', 'Edit collection')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {creating
                  ? t('admin.collections.editor.createSubtitle', 'Name the collection, then add its capabilities.')
                  : t('admin.collections.editor.subtitle', 'Metadata and ordered capability items')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('admin.collections.actions.close', 'Close')}
            disabled={saving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4">
          {republishNeeded ? (
            <div
              data-admin-collection-republish-notice
              className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t(
                  'admin.collections.editor.republishNotice',
                  'Saving a content change returns this collection to draft. Publish it again to update the active release.',
                )}
              </span>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              autoFocus
              required
              maxLength={TEXT_LIMITS.name}
              label={t('admin.collections.fields.name', 'Name')}
              value={fields.name}
              onChange={(value) => setFields((current) => ({ ...current, name: value }))}
              dataAttribute={{ 'data-admin-collection-name': true }}
            />
            {creating ? (
              <TextField
                label={t('admin.collections.fields.collectionKey', 'Collection key')}
                value={fields.collectionKey}
                maxLength={128}
                placeholder={t('admin.collections.fields.collectionKeyPlaceholder', 'auto-generated when empty')}
                hint={t(
                  'admin.collections.fields.collectionKeyHint',
                  'Lowercase slug used by integrations. Generated from the name when empty.',
                )}
                onChange={(value) => setFields((current) => ({ ...current, collectionKey: value.toLowerCase() }))}
                dataAttribute={{ 'data-admin-collection-key': true }}
              />
            ) : (
              <TextField
                label={t('admin.collections.fields.collectionKey', 'Collection key')}
                value={fields.collectionKey}
                hint={t('admin.collections.fields.collectionKeyLocked', 'The key is fixed after creation.')}
                onChange={() => undefined}
                disabled
              />
            )}
            <div className="md:col-span-2">
              <TextField
                maxLength={TEXT_LIMITS.summary}
                label={t('admin.collections.fields.summary', 'Summary')}
                value={fields.summary}
                onChange={(value) => setFields((current) => ({ ...current, summary: value }))}
              />
            </div>
            <div className="md:col-span-2">
              <TextAreaField
                maxLength={TEXT_LIMITS.description}
                label={t('admin.collections.fields.description', 'Description')}
                value={fields.description}
                rows={4}
                onChange={(value) => setFields((current) => ({ ...current, description: value }))}
              />
            </div>
            <TextField
              maxLength={TEXT_LIMITS.iconRef}
              label={t('admin.collections.fields.iconRef', 'Icon reference')}
              value={fields.iconRef}
              onChange={(value) => setFields((current) => ({ ...current, iconRef: value }))}
            />
            {creating ? (
              <SelectField
                label={t('admin.collections.fields.collectionKind', 'Collection kind')}
                value={fields.collectionKind}
                options={kindOptions(t)}
                required
                hint={t(
                  'admin.collections.fields.collectionKindHint',
                  'Mixed accepts every capability type; a single-kind collection accepts only its own.',
                )}
                onChange={(value) => setFields((current) => ({
                  ...current,
                  collectionKind: value,
                  categoryId: '',
                }))}
                dataAttribute={{ 'data-admin-collection-kind': true }}
              />
            ) : (
              <SelectField
                label={t('admin.collections.fields.collectionKind', 'Collection kind')}
                value={fields.collectionKind}
                options={kindOptions(t)}
                disabled
                hint={t('admin.collections.fields.collectionKindLocked', 'The kind is fixed after creation.')}
                onChange={() => undefined}
              />
            )}
            <SelectField
              label={t('admin.collections.fields.category', 'Category')}
              value={fields.categoryId}
              options={categoryOptions}
              hint={categories.length === 0
                ? t(
                  'admin.collections.fields.categoryEmptyHint',
                  'No categories yet. Initialize the standard set on the Collection Categories page.',
                )
                : t(
                  'admin.collections.fields.categoryHint',
                  'Only enabled categories of the same collection kind are listed.',
                )}
              onChange={(value) => setFields((current) => ({ ...current, categoryId: value }))}
              dataAttribute={{ 'data-admin-collection-category': true }}
            />
            <SelectField
              label={t('admin.collections.fields.visibility', 'Visibility')}
              value={fields.visibility}
              options={visibilityOptions(t)}
              onChange={(value) => setFields((current) => ({ ...current, visibility: value }))}
            />
            {!creating ? (
              <SelectField
                label={t('admin.collections.fields.status', 'Status')}
                value={fields.status}
                options={recordStatusOptions(t)}
                hint={t(
                  'admin.collections.fields.statusHint',
                  'A disabled collection cannot be published until it is enabled again.',
                )}
                onChange={(value) => setFields((current) => ({ ...current, status: value }))}
                dataAttribute={{ 'data-admin-collection-status': true }}
              />
            ) : null}
            <div className="md:col-span-2">
              <TextField
                label={t('admin.collections.fields.tags', 'Tags')}
                value={fields.tagsText}
                maxLength={2000}
                placeholder={t('admin.collections.fields.tagsPlaceholder', 'Comma separated, up to 20 tags')}
                hint={t('admin.collections.fields.tagsHint', 'Tags are searchable; duplicates are removed automatically.')}
                onChange={(value) => setFields((current) => ({ ...current, tagsText: value }))}
                dataAttribute={{ 'data-admin-collection-tags': true }}
              />
            </div>
            <TextField
              label={t('admin.collections.fields.sortOrder', 'Sort order')}
              value={fields.sortOrder}
              maxLength={TEXT_LIMITS.sortOrder}
              error={sortOrderError}
              onChange={(value) => {
                setSortOrderError(null);
                setFields((current) => ({ ...current, sortOrder: value }));
              }}
            />
            <div className="flex items-end pb-1">
              <CheckboxField
                checked={fields.featured}
                label={t('admin.collections.fields.featured', 'Featured')}
                hint={t('admin.collections.fields.featuredHint', 'Featured collections are promoted on the console.')}
                onChange={(checked) => setFields((current) => ({ ...current, featured: checked }))}
              />
            </div>
          </div>

          <div className="my-5 border-t border-slate-100 dark:border-white/10" />

          <CollectionItemsEditor
            collectionKind={fields.collectionKind}
            items={items}
            disabled={saving}
            onChange={setItems}
            onEditingChange={setItemFormOpen}
          />

          {state.mode === 'edit' ? (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-white/10">
              <CollectionReleaseHistory collectionId={state.collection.id} />
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-[#1a1a1a]">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {itemFormOpen
              ? t(
                'admin.collections.editor.finishItemForm',
                'Finish or cancel the capability form before saving.',
              )
              : dirty
                ? t('admin.collections.editor.unsaved', 'Unsaved changes')
                : t('admin.collections.editor.noChanges', 'No changes yet')}
          </span>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              data-admin-collection-save
              disabled={saving || itemFormOpen || (!creating && !dirty)}
              aria-busy={saving}
              onClick={() => { void save(); }}
              className="rounded-lg bg-lobster-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? t('common.actions.saving', 'Saving...')
                : creating
                  ? t('admin.collections.actions.create', 'Create collection')
                  : t('admin.collections.actions.saveChanges', 'Save changes')}
            </button>
          </div>
        </div>
      </div>

      {discardOpen ? (
        <ConfirmDialog
          title={t('admin.collections.editor.discardTitle', 'Discard unsaved changes?')}
          description={t(
            'admin.collections.editor.discardDescription',
            'Closing now loses the metadata and capability edits made in this drawer.',
          )}
          confirmLabel={t('admin.collections.actions.discard', 'Discard')}
          cancelLabel={t('admin.collections.actions.keepEditing', 'Keep editing')}
          tone="danger"
          onConfirm={() => {
            setDiscardOpen(false);
            onClose();
          }}
          onCancel={() => setDiscardOpen(false)}
        />
      ) : null}
    </div>
  );
}
