import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { clearStoredAppSessionToken } from './packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts';
import { resetClawRouterSdkClients } from './packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts';
import { ModelMappingService } from './../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts';

const PORTAL_ROOT = import.meta.dirname;
const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

type CapturedBackendRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

function readPortalFile(relativePath: string): string {
  return readFileSync(resolve(PORTAL_ROOT, relativePath), 'utf8');
}

function sourceBetween(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(start, -1, `missing source start token: ${startToken}`);
  assert.notEqual(end, -1, `missing source end token: ${endToken}`);
  return source.substring(start, end);
}

async function withBackendSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedBackendRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedBackendRequest[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    enumerable: true,
    value: {
      dispatchEvent: () => true,
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === 'string' ? init.body : '';
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    captured.push({
      url,
      method: init?.method ?? 'GET',
      headers,
      body,
    });
    const result = handler(url, init);
    return new Response(JSON.stringify({ code: '2000', data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    return await fn(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

test('admin model mapping service is backend SDK backed', () => {
  const modelService = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts');

  for (const token of [
    'export class ModelMappingService',
    'export interface ModelMappingRule',
    'export interface ModelMappingRuleItem',
    'export interface ModelMappingRuleBinding',
    'export interface ModelMappingResolveResult',
    'export interface ModelMappingModelOption',
    'mappingItems: ModelMappingRuleItem[]',
    'bindings: ModelMappingRuleBinding[]',
    'fetchModelOptionsCatalog',
    'normalizeModelMappingModelOption',
    'getModelsBackendSdkClient().ai.modelMappings.list(',
    'getModelsBackendSdkClient().ai.modelMappings.create(',
    'getModelsBackendSdkClient().ai.modelMappings.update(',
    'getModelsBackendSdkClient().ai.modelMappings.delete(',
    'getModelsBackendSdkClient().ai.modelMappings.resolve.create(',
  ]) {
    assert.ok(modelService.includes(token), `missing model mapping service marker: ${token}`);
  }

  for (const forbidden of [
    'fetch(',
    'axios.',
    '/backend/v3/api/ai/model_mappings',
    'rawModelMapping',
  ]) {
    assert.equal(modelService.includes(forbidden), false, `unexpected forbidden model mapping token: ${forbidden}`);
  }
});

test('admin model mapping page exposes route, navigation, and core layout markers', () => {
  const adminHostSource = readPortalFile('src/admin/clawRouterAdminHostMount.tsx');
  const registrySource = readPortalFile('packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const coreI18nSource = readPortalFile('packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts');
  const modelI18nSource = readPortalFile('packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts');

  assert.ok(adminHostSource.includes("route('model/mappings', 'sdkwork-models'"), 'missing admin model mapping contribution');
  assert.ok(adminHostSource.includes("['sdkwork-models-backend-sdk']"), 'missing models backend SDK ownership');
  assert.ok(adminHostSource.includes('ModelMappingAdmin'), 'missing ModelMappingAdmin route component');
  assert.ok(registrySource.includes('/admin/model/mappings'), 'missing admin registry mapping route');
  assert.ok(registrySource.includes('admin.menu.modelMappings'), 'missing admin registry mapping i18n key');
  assert.ok(coreI18nSource.includes('"admin.menu.modelMappings"'), 'missing core navigation i18n mapping key');

  for (const token of [
    'export function ModelMappingAdmin',
    'ModelMappingService.fetchMappings(',
    'ModelMappingService.createMapping(',
    'ModelMappingService.updateMapping(',
    'ModelMappingService.deleteMapping(',
    'admin.model.mapping.title',
    'admin.model.mapping.scope.global',
    'admin.model.mapping.scope.vendor',
    'admin.model.mapping.scope.channel',
  ]) {
    assert.ok(modelAdminSource.includes(token) || modelI18nSource.includes(`"${token}"`), `missing mapping UI marker: ${token}`);
  }
});

test('admin model mapping page is reduced to tabs search add and table without resolve preview chrome', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const modelI18nSource = readPortalFile('packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts');
  const mappingPageSource = sourceBetween(modelAdminSource, 'export function ModelMappingAdmin', 'function ModelMappingFormModal');

  for (const token of [
    'admin.model.mapping.scope.global',
    'admin.model.mapping.scope.vendor',
    'admin.model.mapping.scope.channel',
    'admin.model.mapping.scope.all',
    'admin.model.mapping.search.placeholder',
    'admin.model.mapping.actions.add',
    'AdminTableShell',
    'data-admin-model-mapping-table-card',
    'data-admin-model-mapping-table-viewport',
    'className="flex-1 min-h-0"',
    'viewportClassName="min-h-0 flex-1"',
  ]) {
    assert.ok(modelAdminSource.includes(token) || modelI18nSource.includes(`"${token}"`), `missing minimal mapping chrome marker: ${token}`);
  }

  assert.ok(
    mappingPageSource.includes('className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0f0f10] dark:text-white"'),
    'mapping page should fill the admin viewport without creating document scroll',
  );
  assert.equal(mappingPageSource.includes('min-h-screen'), false, 'mapping page must not use min-h-screen inside AdminLayout');
  for (const layoutMarker of [
    'data-admin-model-mapping-toolbar',
    'data-admin-model-mapping-scope-filter',
    'data-admin-model-mapping-search',
    'data-admin-model-mapping-primary-action',
    'data-admin-model-mapping-table',
    'aria-pressed={bindingFilter === tab.value}',
    'sticky top-0 z-10',
  ]) {
    assert.ok(mappingPageSource.includes(layoutMarker), `missing mapping workspace layout marker: ${layoutMarker}`);
  }
  assert.equal(mappingPageSource.includes('rounded-2xl border border-slate-200'), false, 'mapping table should not nest a decorative card inside AdminTableShell');

  for (const forbidden of [
    'admin.model.mapping.priorityHint',
    'admin.model.mapping.actions.resolve',
    'admin.model.mapping.resolve.title',
    'admin.model.mapping.resolve.unmatched',
    'handleResolveMapping',
    'resolveResult',
    'resolving',
    'ToggleLeft',
    'ToggleRight',
    'xl:grid-cols-[minmax(0,1fr)_420px]',
  ]) {
    assert.equal(modelAdminSource.includes(forbidden), false, `unexpected legacy mapping chrome token: ${forbidden}`);
    assert.equal(modelI18nSource.includes(forbidden), false, `unexpected legacy mapping i18n token: ${forbidden}`);
  }
});

test('admin model mapping modal uses multi-row editable model mapping table', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const vendorPickerSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/vendorPickerModal.tsx');
  const modelI18nSource = readPortalFile('packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts');
  const modalSource = sourceBetween(modelAdminSource, 'function ModelMappingFormModal', 'function ModelMappingRowsTable');
  const rowsTableSource = sourceBetween(modelAdminSource, 'function ModelMappingRowsTable', 'function ModelComboboxCell');
  const comboboxSource = sourceBetween(modelAdminSource, 'function ModelComboboxCell', 'function ModelMappingRelationsCell');
  const mappingInputSource = sourceBetween(modelAdminSource, 'function modelMappingInputFromForm', 'function readMappingPrimaryBindingType');
  const combinedModalSource = `${modelAdminSource}\n${vendorPickerSource}`;

  for (const token of [
    'function ModelMappingFormModal',
    'function ModelMappingRowsTable',
    'function ModelComboboxCell',
    'export function VendorPickerModal',
    'function modelMappingInputFromForm',
    'type ModelMappingRowDraft',
    'createMappingRowDrafts(',
    'rowsJson',
    'bindingsJson',
    'mappingRows',
    'mappingBindings',
    'sourceVendorCode',
    'targetVendorCode',
    'sourceModel',
    'targetModel',
    'bindingType',
    'bindingCode',
    'activeVendorPicker',
    'sourceVendor',
    'targetVendor',
    "setMappingRows((current) => syncRowsForVendor(current, 'sourceModel', vendor.vendorCode, models))",
    "setMappingRows((current) => syncRowsForVendor(current, 'targetModel', vendor.vendorCode, models))",
    'admin.model.mapping.form.sourceVendor',
    'admin.model.mapping.form.targetVendor',
    'admin.model.mapping.form.vendorPicker.searchPlaceholder',
    'admin.model.mapping.form.modelPicker.searchPlaceholder',
    'admin.model.mapping.form.modelInputPlaceholder',
    'admin.model.mapping.form.mappingRowsTitle',
    'admin.model.mapping.form.bindingTitle',
    'admin.model.mapping.form.addBinding',
    'admin.model.mapping.form.removeBinding',
    'admin.model.mapping.form.addRow',
    'admin.model.mapping.form.removeRow',
  ]) {
    assert.ok(combinedModalSource.includes(token) || modelI18nSource.includes(`"${token}"`), `missing modal interaction marker: ${token}`);
  }

  assert.ok(rowsTableSource.includes('admin.model.mapping.form.sourceModel'), 'mapping rows table should show source model header');
  assert.ok(rowsTableSource.includes('admin.model.mapping.form.targetModel'), 'mapping rows table should show target model header');
  assert.ok(rowsTableSource.includes('<ModelComboboxCell'), 'mapping rows table should render editable combobox cells');
  assert.ok(comboboxSource.includes('onChange(event.target.value)'), 'model combobox should allow direct manual input');
  assert.ok(comboboxSource.includes('filteredModels.map((model)'), 'model combobox should keep searchable catalog options');
  assert.ok(modalSource.includes('h-[90vh]'), 'mapping modal should use 90% viewport height');
  assert.ok(modalSource.includes('max-w-[84rem]'), 'mapping modal should be 50% wider than max-w-4xl');
  assert.ok(modalSource.includes('data-model-mapping-form-scroll'), 'mapping modal should keep dynamic editor content in a dedicated scroll area');
  assert.ok(modalSource.includes('data-model-mapping-form-footer'), 'mapping modal should render save actions in a dedicated footer area');
  assert.ok(modalSource.includes('className="min-h-0 flex-1 overflow-y-auto p-5"'), 'mapping modal body should scroll independently from the action footer');
  assert.ok(modalSource.includes('className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-white/10"'), 'mapping modal footer should stay fixed to the bottom of the modal');
  assert.equal(modalSource.includes('className="flex min-h-0 flex-1 flex-col space-y-5 overflow-y-auto p-5"'), false, 'mapping modal form itself must not scroll because footer would move with dynamic rows');
  assert.ok(mappingInputSource.includes('const bindings = readMappingBindingsFromForm(formData, errors)'), 'form payload should be built from binding JSON with validation metadata');
  assert.ok(mappingInputSource.includes('const rows = readMappingRowsFromForm(formData, errors)'), 'form payload should be built from row JSON with validation metadata');
  assert.ok(mappingInputSource.includes('bindings: bindings.map((binding'), 'form payload should persist associated binding content under one rule');
  assert.ok(mappingInputSource.includes('mappingItems: rows.map((row'), 'form payload should persist multiple mapping items under one rule');
  assert.equal(modalSource.includes('{!mapping && ('), false, 'edit mode must show add-row because rule items support CRUD');
  assert.ok(modalSource.includes('setMappingRows((current) => [...current, createMappingRowDraft(null)])'), 'edit mode should be able to add child mapping rows');
  assert.ok(modelAdminSource.includes('editorError'), 'mapping editor should keep modal-local validation errors');
  assert.ok(modelAdminSource.includes('type ModelMappingFormErrors'), 'mapping editor should use structured form errors');
  assert.ok(modelAdminSource.includes('class ModelMappingFormValidationError'), 'form validation should preserve field-level error metadata');
  assert.ok(modalSource.includes('error?.message'), 'mapping modal should render a validation summary inside the dialog');
  assert.ok(modalSource.includes('fieldErrors.sourceVendorCode'), 'source vendor field should render its own validation error');
  assert.ok(modalSource.includes('fieldErrors.targetVendorCode'), 'target vendor field should render its own validation error');
  assert.ok(modalSource.includes('fieldErrors.mappingBindings'), 'binding section should render its own validation error');
  assert.ok(rowsTableSource.includes('fieldErrors.mappingRows'), 'mapping rows table should render table-level validation errors');
  assert.ok(rowsTableSource.includes('data-model-mapping-error-key=\"mappingRows\"'), 'mapping rows table errors should be scroll targets');
  assert.ok(rowsTableSource.includes('rowErrors[row.id]?.sourceModel'), 'source model cell should render row-level validation error');
  assert.ok(rowsTableSource.includes('rowErrors[row.id]?.targetModel'), 'target model cell should render row-level validation error');
  assert.ok(comboboxSource.includes('errorMessage'), 'model combobox should receive and render cell-level error text');
  assert.ok(comboboxSource.includes('aria-invalid'), 'model combobox should expose invalid state for accessibility');
  assert.ok(modalSource.includes('firstErrorKey'), 'mapping modal should track the first invalid form control');
  assert.ok(modalSource.includes('scrollIntoView'), 'mapping modal should scroll to the first invalid form control');
  assert.ok(mappingInputSource.includes("readRequiredFormString(formData, 'sourceVendorCode'"), 'form should require source vendor');
  assert.ok(mappingInputSource.includes("readRequiredFormString(formData, 'targetVendorCode'"), 'form should require target vendor');
  assert.ok(mappingInputSource.includes('Binding content is required'), 'non-global binding rows should require binding content');
  assert.ok(mappingInputSource.includes('Source model is required'), 'each row should require source model');
  assert.ok(mappingInputSource.includes('Target model is required'), 'each row should require target model');
  assert.ok(modelAdminSource.includes('MODEL_MAPPING_MAX_ROWS'), 'form parsing should cap submitted mapping rows');
  assert.ok(modelAdminSource.includes('MODEL_MAPPING_MODEL_VALUE_MAX_LENGTH'), 'form parsing should cap model value length');
  assert.ok(mappingInputSource.includes('validateModelMappingModelValue'), 'form parsing should validate model value length');
  assert.ok(mappingInputSource.includes('validateUniqueModelMappingRows(rows, errors)'), 'form parsing should reject duplicate source model rows');
  assert.ok(mappingInputSource.includes('Duplicate source model mapping is not allowed'), 'duplicate source model rows should have an explicit error');

  for (const legacyFormToken of [
    'ModelMappingSaveState',
    'SearchableModelDropdown',
    'activeModelPicker',
    'savingState',
    'saveFailed',
    'saveFailedRowPrefix',
    'priority',
    'effectiveFrom',
    'effectiveTo',
    'description',
    'targetProviderModel',
    'targetProviderNativeModel',
    'singleMappingTitle',
    'singleMappingHint',
    'pickMode',
    'manualInputMode',
    'switchToPick',
    'switchToManual',
  ]) {
    assert.equal(modalSource.includes(legacyFormToken), false, `unexpected legacy token in mapping modal: ${legacyFormToken}`);
    assert.equal(rowsTableSource.includes(legacyFormToken), false, `unexpected legacy token in mapping rows table: ${legacyFormToken}`);
    assert.equal(mappingInputSource.includes(legacyFormToken), false, `unexpected legacy token in mapping payload builder: ${legacyFormToken}`);
    assert.equal(modelI18nSource.includes(`admin.model.mapping.form.${legacyFormToken}`), false, `unexpected legacy mapping i18n token: ${legacyFormToken}`);
  }
});

test('admin model mapping edit save updates existing rule without creating records', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const saveSource = sourceBetween(modelAdminSource, 'const handleSaveMapping', 'const handleDeleteMapping');
  const editBranchSource = sourceBetween(saveSource, 'if (editingMapping) {', '} else {');

  assert.ok(editBranchSource.includes('ModelMappingService.updateMapping(editingMapping.id'), 'edit save must update the selected mapping id');
  assert.equal(editBranchSource.includes('ModelMappingService.createMapping'), false, 'edit save must never create mapping records');
  assert.equal(editBranchSource.includes('extraInputs'), false, 'edit save must not split child rows into top-level rules');
  assert.equal(saveSource.includes('inputs.map((input) => ModelMappingService.createMapping(input))'), false, 'create mode must create one rule containing many mappingItems');
  assert.ok(saveSource.includes('ModelMappingService.createMapping(input)'), 'create mode should create one mapping rule');
});

test('admin model mapping list renders rule rows with child relation cell list', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const mappingAdminSource = sourceBetween(modelAdminSource, 'export function ModelMappingAdmin', 'function ModelMappingFormModal');
  const tableSource = sourceBetween(mappingAdminSource, '<tbody', '</tbody>');

  assert.equal(modelAdminSource.includes('admin.model.mapping.table.source'), false, 'mapping table should not keep a standalone source model column');
  assert.equal(modelAdminSource.includes('admin.model.mapping.table.target'), false, 'mapping table should not keep a standalone target model column');
  assert.ok(modelAdminSource.includes('admin.model.mapping.table.relations'), 'mapping table should expose one model relation column');
  assert.ok(modelAdminSource.includes('function ModelMappingBindingsCell'), 'mapping table should use a dedicated binding-cell renderer');
  assert.ok(tableSource.includes('<ModelMappingBindingsCell'), 'mapping table should render associated content inside one rule row');
  assert.ok(modelAdminSource.includes('mapping.bindings'), 'mapping rule rows should read binding items');
  assert.ok(modelAdminSource.includes('admin.model.mapping.table.binding'), 'mapping table should include an associated content column');
  assert.ok(modelAdminSource.includes('function ModelMappingRelationsCell'), 'mapping table should use a dedicated relation-cell renderer');
  assert.ok(tableSource.includes('<ModelMappingRelationsCell'), 'mapping table should render child mapping relations inside one rule row');
  assert.ok(modelAdminSource.includes('mapping.mappingItems'), 'mapping rule rows should read child mapping items');
  assert.ok(modelAdminSource.includes('sourceModel') && modelAdminSource.includes('targetModel'), 'relation cell should show source and target model values');
  assert.ok(modelAdminSource.includes('ArrowRightLeft') || modelAdminSource.includes('->'), 'relation cell should visually express source to target direction');
});

test('admin model mapping scope tabs request server-filtered rule rows', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const mappingAdminSource = sourceBetween(modelAdminSource, 'export function ModelMappingAdmin', 'function ModelMappingFormModal');
  const loadSource = sourceBetween(mappingAdminSource, 'const loadMappings = async', 'const loadCatalog = async');
  const catalogSource = sourceBetween(mappingAdminSource, 'const loadCatalog = async', 'const filteredMappings = mappings.filter((mapping) => {');
  const filteredSource = sourceBetween(mappingAdminSource, 'const filteredMappings = mappings.filter((mapping) => {', 'const openCreateMapping = () => {');
  const headerSource = sourceBetween(mappingAdminSource, 'header={(', '{(loadError || catalogError)');

  assert.equal(filteredSource.includes("bindingFilter !== 'all'"), false, 'scope tabs must not filter mapping rows locally');
  assert.equal(filteredSource.includes('mapping.bindingType !== bindingFilter'), false, 'scope tabs must rely on server-filtered rows');
  assert.ok(mappingAdminSource.includes('handleBindingFilterChange'), 'scope tabs should use a dedicated server-load handler');
  assert.ok(headerSource.includes('onClick={() => handleBindingFilterChange(tab.value)}'), 'scope tabs should request the selected server scope directly');
  assert.ok(loadSource.includes('nextBindingFilter'), 'mapping loader should accept the requested scope explicitly');
  assert.ok(loadSource.includes('bindingType: nextBindingFilter'), 'mapping loader should pass the requested scope to the backend SDK service');
  assert.ok(loadSource.includes('setLoading(true)'), 'scope changes should keep the table in loading state while server data is pending');
  assert.ok(catalogSource.includes('ModelMappingService.fetchModelOptionsCatalog()'), 'mapping catalog should use lightweight model options instead of strict priced model records');
  assert.equal(catalogSource.includes('ModelService.fetchInitializedCatalog()'), false, 'mapping catalog must not load strict model admin catalog because region prices are not needed for mapping choices');
});

test('admin model mapping catalog tolerates models without region prices', async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? 'GET';
      if (url === '/backend/v3/api/ai/model_vendors' && method === 'GET') {
        return {
          items: [
            {
              id: 'vendor-openai',
              vendorCode: 'openai',
              name: 'OpenAI',
              status: 'active',
              color: 'bg-indigo-500',
              description: 'OpenAI models',
            },
          ],
        };
      }
      if (url === '/backend/v3/api/ai/models' && method === 'GET') {
        return {
          items: [
            {
              id: 'model-gpt-4o-mini',
              vendorId: 'vendor-openai',
              vendorCode: 'openai',
              model: 'gpt-4o-mini',
              displayName: 'GPT-4o mini',
              name: 'GPT-4o mini',
              type: 'Chat',
              status: 'active',
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const catalog = await ModelMappingService.fetchModelOptionsCatalog();

      assert.deepEqual(catalog.vendors.map((vendor) => vendor.vendorCode), ['openai']);
      assert.deepEqual(catalog.models, [
        {
          id: 'model-gpt-4o-mini',
          vendorId: 'vendor-openai',
          vendorCode: 'openai',
          model: 'gpt-4o-mini',
          displayName: 'GPT-4o mini',
          name: 'GPT-4o mini',
          type: 'Chat',
          status: 'active',
        },
      ]);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          'GET /backend/v3/api/ai/model_vendors',
          'GET /backend/v3/api/ai/models',
        ],
      );
    },
  );
});

test('admin model mapping relation cell opens focused relation editor modal', () => {
  const modelAdminSource = readPortalFile('../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx');
  const relationCellSource = sourceBetween(modelAdminSource, 'function ModelMappingRelationsCell', 'function ModelMappingRelationEditorModal');
  const relationModalSource = sourceBetween(modelAdminSource, 'function ModelMappingRelationEditorModal', 'function ModelMappingBindingsCell');

  assert.ok(modelAdminSource.includes('editingRelationMapping'), 'relation editing should be separate from the full rule editor');
  assert.ok(relationCellSource.includes('onOpenEditor(mapping)'), 'relation cell should open the focused model mapping editor');
  assert.ok(relationModalSource.includes('function ModelMappingRelationEditorModal'), 'focused relation editor modal should exist');
  assert.ok(relationModalSource.includes('<ModelMappingRowsTable'), 'focused relation editor should reuse the same mapping rows table');
  assert.ok(relationModalSource.includes('readMappingRowsFromForm(formData, errors)'), 'focused relation editor should reuse row parsing validation');
  assert.ok(relationModalSource.includes('validateUniqueModelMappingRows(rows, errors)'), 'focused relation editor should reject duplicate source models');
  assert.ok(relationModalSource.includes('ModelMappingService.updateMapping(mapping.id'), 'focused relation editor should update the existing rule');
  assert.equal(relationModalSource.includes('bindingType'), false, 'focused relation editor should not edit associated content bindings');
  assert.equal(relationModalSource.includes('sourceVendorCode'), false, 'focused relation editor should not edit rule vendor fields');
  assert.ok(relationModalSource.includes('h-[90vh]'), 'focused relation editor modal should use 90% viewport height');
  assert.ok(relationModalSource.includes('data-model-mapping-relation-form-scroll'), 'focused relation editor should keep dynamic rows in a dedicated scroll area');
  assert.ok(relationModalSource.includes('data-model-mapping-relation-form-footer'), 'focused relation editor should render save actions in a dedicated footer area');
  assert.ok(relationModalSource.includes('className="min-h-0 flex-1 overflow-y-auto p-5"'), 'focused relation editor body should scroll independently from the action footer');
  assert.ok(relationModalSource.includes('className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-white/10"'), 'focused relation editor footer should stay fixed to the modal bottom');
  assert.equal(relationModalSource.includes('className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5"'), false, 'focused relation editor form itself must not scroll because footer would move with dynamic rows');
  assert.ok(modelAdminSource.includes('admin.model.mapping.relations.editTitle'), 'focused relation editor should have its own title copy');
});
