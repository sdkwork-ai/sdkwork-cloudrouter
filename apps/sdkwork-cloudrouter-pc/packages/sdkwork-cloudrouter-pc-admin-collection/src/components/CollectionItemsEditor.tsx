import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JsonValue } from '@sdkwork/cloudrouter-backend-sdk';
import {
  COLLECTION_MAX_ITEMS,
  collectionKindCapabilityTypes,
  formatCollectionConfigJson,
  isCapabilityAllowedForCollectionKind,
  parseCollectionConfigJson,
  type CollectionCapabilityType,
  type CollectionItemDraft,
  type CollectionKind,
} from '../collectionService';
import {
  capabilityTypeLabel,
  capabilityTypeOptions,
  IconButton,
  SelectField,
  TextAreaField,
  TextField,
  type Translate,
} from '../collectionUi';

const ITEM_LIMITS = {
  key: 191,
  name: 255,
  version: 64,
  iconRef: 512,
  config: 16_384,
} as const;

interface ItemFormFields {
  capabilityType: CollectionCapabilityType;
  capabilityKey: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityIconRef: string;
  configText: string;
  enabled: boolean;
}

type ItemFormState =
  | { mode: 'create'; fields: ItemFormFields }
  | { mode: 'edit'; index: number; fields: ItemFormFields };

export interface CollectionItemsEditorProps {
  collectionKind: CollectionKind;
  items: CollectionItemDraft[];
  onChange: (items: CollectionItemDraft[]) => void;
  disabled?: boolean;
  /** Lets the hosting drawer include an open item form in its dirty guard. */
  onEditingChange?: (editing: boolean) => void;
}

function emptyItemFields(collectionKind: CollectionKind): ItemFormFields {
  const allowed = collectionKindCapabilityTypes(collectionKind);
  return {
    capabilityType: allowed[0] ?? 'skill',
    capabilityKey: '',
    capabilityName: '',
    capabilityVersion: '',
    capabilityIconRef: '',
    configText: '',
    enabled: true,
  };
}

function fieldsFromItem(item: CollectionItemDraft): ItemFormFields {
  return {
    capabilityType: item.capabilityType,
    capabilityKey: item.capabilityKey,
    capabilityName: item.capabilityName,
    capabilityVersion: item.capabilityVersion,
    capabilityIconRef: item.capabilityIconRef,
    configText: formatCollectionConfigJson(item.config),
    enabled: item.enabled,
  };
}

/**
 * Ordered capability item editor.
 *
 * Capability selection is by explicit capability key plus a display name: the
 * four capability catalogs live in their own sibling modules, so the console
 * never fakes a cross-domain picker here. The list order is the saved
 * `sortOrder` order (`replaceCollectionItems` reassigns it from the array).
 */
export function CollectionItemsEditor({
  collectionKind,
  items,
  onChange,
  disabled = false,
  onEditingChange,
}: CollectionItemsEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ item: CollectionItemDraft; index: number } | null>(null);

  const allowedTypes = collectionKindCapabilityTypes(collectionKind);
  const typeOptions = capabilityTypeOptions(t).filter((option) => allowedTypes.includes(option.value));
  const mixed = collectionKind === 'mixed';
  const enabledCount = items.filter((item) => item.enabled).length;

  useEffect(() => {
    onEditingChange?.(form !== null);
  }, [form, onEditingChange]);

  useEffect(() => {
    if (!form) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      setForm(null);
      setFormError(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [form]);

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);
    setLastRemoved(null);
    onChange(next);
  };

  const toggleEnabled = (index: number, enabled: boolean) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled } : item)));
  };

  const remove = (index: number) => {
    const removed = items[index];
    if (!removed) {
      return;
    }
    setLastRemoved({ item: removed, index });
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const undoRemove = () => {
    if (!lastRemoved) {
      return;
    }
    const next = [...items];
    next.splice(Math.min(lastRemoved.index, next.length), 0, lastRemoved.item);
    setLastRemoved(null);
    onChange(next);
  };

  const submitForm = () => {
    if (!form) {
      return;
    }
    const { fields } = form;
    const capabilityKey = fields.capabilityKey.trim();
    if (!capabilityKey) {
      setFormError(t('admin.collections.items.keyRequired', 'Capability key is required.'));
      return;
    }
    if (!isCapabilityAllowedForCollectionKind(collectionKind, fields.capabilityType)) {
      setFormError(t('admin.collections.items.kindRestriction', 'This collection kind does not accept the capability type.'));
      return;
    }
    const duplicateIndex = items.findIndex(
      (item, index) => item.capabilityType === fields.capabilityType
        && item.capabilityKey === capabilityKey
        && (form.mode === 'create' || index !== form.index),
    );
    if (duplicateIndex >= 0) {
      setFormError(t('admin.collections.items.duplicate', 'This capability is already in the collection.'));
      return;
    }
    let config: Record<string, JsonValue> = {};
    try {
      config = parseCollectionConfigJson(fields.configText);
    } catch {
      setFormError(t('admin.collections.items.configInvalid', 'Config must be a JSON object.'));
      return;
    }
    if (new TextEncoder().encode(JSON.stringify(config)).byteLength > 16 * 1024) {
      setFormError(t(
        'admin.collections.items.configTooLarge',
        'Config must be at most 16384 bytes as JSON.',
      ));
      return;
    }
    const draft: CollectionItemDraft = {
      capabilityType: fields.capabilityType,
      capabilityKey,
      capabilityName: fields.capabilityName.trim(),
      capabilityVersion: fields.capabilityVersion.trim(),
      capabilityIconRef: fields.capabilityIconRef.trim(),
      config,
      enabled: fields.enabled,
    };
    if (form.mode === 'create') {
      onChange([...items, draft]);
    } else {
      onChange(items.map((item, index) => (index === form.index ? draft : item)));
    }
    setForm(null);
    setFormError(null);
  };

  return (
    <section data-admin-collection-items-editor className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('admin.collections.items.title', 'Capability items')}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.collections.items.hint',
              'The capability key comes from the capability module (skill / MCP / agent / plugin).',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-admin-collection-item-count
            className={`text-xs font-medium ${
              items.length > 0 && enabledCount === 0
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t('admin.collections.items.count', {
              enabled: enabledCount,
              total: items.length,
              max: COLLECTION_MAX_ITEMS,
              defaultValue: '{{enabled}} enabled / {{total}} items (max {{max}})',
            })}
          </span>
          <button
            type="button"
            data-admin-collection-item-add
            disabled={disabled || form !== null || items.length >= COLLECTION_MAX_ITEMS}
            onClick={() => {
              setFormError(null);
              setForm({ mode: 'create', fields: emptyItemFields(collectionKind) });
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lobster-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t('admin.collections.actions.addCapability', 'Add capability')}
          </button>
        </div>
      </div>

      {items.length > 0 && enabledCount === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {t(
            'admin.collections.items.noEnabled',
            'Every item is disabled. Enable at least one before publishing; disabled items are kept in the draft but are not part of the active release.',
          )}
        </p>
      ) : null}

      {lastRemoved ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        >
          <span className="truncate">
            {t('admin.collections.items.removed', {
              key: lastRemoved.item.capabilityKey,
              defaultValue: 'Removed {{key}}.',
            })}
          </span>
          <button
            type="button"
            onClick={undoRemove}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('admin.collections.actions.undo', 'Undo')}
          </button>
        </div>
      ) : null}

      {!mixed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {t(
            'admin.collections.items.kindRestrictionHint',
            'This is a single-kind collection, so only capabilities of the same kind can be added.',
          )}
        </p>
      ) : null}

      {form ? (
        <ItemForm
          allowedTypes={typeOptions}
          fields={form.fields}
          formError={formError}
          mode={form.mode}
          onCancel={() => {
            setForm(null);
            setFormError(null);
          }}
          onChange={(fields) => setForm(form.mode === 'create' ? { mode: 'create', fields } : { ...form, fields })}
          onSubmit={submitForm}
          t={t}
        />
      ) : null}

      {items.length === 0 ? (
        <div
          data-admin-collection-items-empty
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-white/15 dark:bg-white/5"
        >
          <Layers className="mx-auto h-6 w-6 text-slate-400" />
          <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('admin.collections.items.empty', 'No capabilities yet')}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.collections.items.emptyDesc', 'Add the first capability by its key.')}
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-admin-collection-item-list>
          {items.map((item, index) => (
            <li
              key={`${item.capabilityType}:${item.capabilityKey}`}
              data-admin-collection-item
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171717]"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {index + 1}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {capabilityTypeLabel(t, item.capabilityType)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {item.capabilityName || item.capabilityKey}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {item.capabilityKey}
                  {item.capabilityVersion ? `@${item.capabilityVersion}` : ''}
                </div>
              </div>
              <button
                type="button"
                aria-pressed={item.enabled}
                aria-label={item.enabled
                  ? t('admin.collections.items.disable', 'Disable capability')
                  : t('admin.collections.items.enable', 'Enable capability')}
                title={item.enabled
                  ? t('admin.collections.items.disable', 'Disable capability')
                  : t('admin.collections.items.enable', 'Enable capability')}
                onClick={() => toggleEnabled(index, !item.enabled)}
                disabled={disabled}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  item.enabled
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-400'
                }`}
              >
                {item.enabled
                  ? t('admin.collections.status.enabled', 'Enabled')
                  : t('admin.collections.status.disabled', 'Disabled')}
              </button>
              <div className="flex items-center gap-1">
                <IconButton
                  label={t('admin.collections.actions.moveUp', 'Move up')}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t('admin.collections.actions.moveDown', 'Move down')}
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t('admin.collections.actions.edit', 'Edit')}
                  disabled={disabled}
                  onClick={() => {
                    setFormError(null);
                    setForm({ mode: 'edit', index, fields: fieldsFromItem(item) });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t('admin.collections.actions.remove', 'Remove')}
                  tone="danger"
                  disabled={disabled}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemForm({
  allowedTypes,
  fields,
  formError,
  mode,
  onCancel,
  onChange,
  onSubmit,
  t,
}: {
  allowedTypes: Array<{ value: CollectionCapabilityType; label: string }>;
  fields: ItemFormFields;
  formError: string | null;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onChange: (fields: ItemFormFields) => void;
  onSubmit: () => void;
  t: Translate;
}) {
  const singleType = allowedTypes.length === 1;
  return (
    <form
      data-admin-collection-item-form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="rounded-xl border border-lobster-200 bg-lobster-50/50 p-4 dark:border-lobster-500/30 dark:bg-lobster-500/5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          {mode === 'create'
            ? t('admin.collections.items.addTitle', 'Add capability')
            : t('admin.collections.items.editTitle', 'Edit capability')}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('common.actions.cancel', 'Cancel')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label={t('admin.collections.items.type', 'Capability type')}
          value={fields.capabilityType}
          options={allowedTypes}
          disabled={singleType}
          onChange={(value) => onChange({ ...fields, capabilityType: value })}
          dataAttribute={{ 'data-admin-collection-item-type': true }}
        />
        <TextField
          required
          maxLength={ITEM_LIMITS.key}
          label={t('admin.collections.items.key', 'Capability key')}
          value={fields.capabilityKey}
          hint={t(
            'admin.collections.items.keyHint',
            'The key is defined by the capability module, for example skill:code-review or mcp:github.',
          )}
          onChange={(value) => onChange({ ...fields, capabilityKey: value })}
          dataAttribute={{ 'data-admin-collection-item-key': true }}
        />
        <TextField
          maxLength={ITEM_LIMITS.name}
          label={t('admin.collections.items.name', 'Display name')}
          value={fields.capabilityName}
          onChange={(value) => onChange({ ...fields, capabilityName: value })}
        />
        <TextField
          maxLength={ITEM_LIMITS.version}
          label={t('admin.collections.items.version', 'Version')}
          value={fields.capabilityVersion}
          onChange={(value) => onChange({ ...fields, capabilityVersion: value })}
        />
        <TextField
          maxLength={ITEM_LIMITS.iconRef}
          label={t('admin.collections.items.iconRef', 'Icon reference')}
          value={fields.capabilityIconRef}
          onChange={(value) => onChange({ ...fields, capabilityIconRef: value })}
        />
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={fields.enabled}
              onChange={(event) => onChange({ ...fields, enabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-lobster-600 focus:ring-lobster-500 dark:border-white/20 dark:bg-[#121212]"
            />
            {t('admin.collections.status.enabled', 'Enabled')}
          </label>
        </div>
        <div className="md:col-span-2">
          <TextAreaField
            label={t('admin.collections.items.config', 'Config JSON')}
            value={fields.configText}
            rows={4}
            maxLength={ITEM_LIMITS.config}
            monospace
            placeholder="{}"
            hint={t(
              'admin.collections.items.configHint',
              'Optional JSON object passed to the capability at runtime.',
            )}
            onChange={(value) => onChange({ ...fields, configText: value })}
            dataAttribute={{ 'data-admin-collection-item-config': true }}
          />
        </div>
      </div>

      {formError ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
          {formError}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {t('common.actions.cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          data-admin-collection-item-submit
          className="rounded-lg bg-lobster-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-lobster-600"
        >
          {mode === 'create'
            ? t('admin.collections.actions.addCapability', 'Add capability')
            : t('admin.collections.actions.update', 'Update')}
        </button>
      </div>
    </form>
  );
}
