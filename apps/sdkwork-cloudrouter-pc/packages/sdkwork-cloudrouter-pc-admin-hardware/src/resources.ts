/**
 * Declarative resource descriptors for the Smart Hardware Center.
 *
 * Six of the AIoT admin collections are the same operator surface: a paged
 * table, a create/edit drawer, and a destructive delete guarded by a
 * confirmation. Instead of writing that six times, each collection declares the
 * shape once here 鈥?columns, form fields, and the exact service calls 鈥?and the
 * shared `ResourceBrowser` renders it. Domain mapping stays in `hardware.ts` and
 * `hardwareService.ts`; this module only decides what the operator sees.
 */

import type {
  AiotFirmwareArtifactCreateRequest,
  AiotFirmwareRolloutCreateRequest,
  AiotMediaResource,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';

import {
  joinListInput,
  jsonText,
  parseJsonInput,
  readJsonValue,
  readText,
  splitListInput,
  type HardwareCapabilityModel,
  type HardwareFirmwareArtifact,
  type HardwareFirmwareRollout,
  type HardwarePage,
  type HardwareProduct,
  type HardwareProfile,
  type HardwareProtocolProfile,
} from './hardware.ts';
import type { HardwareListInput, HardwareService } from './hardwareService.ts';

export interface HardwareResourceRow {
  /** Stable row key; the primary identifier of the record. */
  id: string;
  /** Column key to already-formatted display text. */
  cells: Record<string, string>;
  /** The normalized domain record, used to prefill the edit form. */
  raw: unknown;
}

export interface HardwareFormOption {
  label: string;
  value: string;
}

export type HardwareFormFieldKind = 'json' | 'list' | 'select' | 'text' | 'textarea';

export interface HardwareFormField {
  key: string;
  labelKey: string;
  kind: HardwareFormFieldKind;
  hintKey?: string;
  placeholderKey?: string;
  required?: boolean;
  /** Primary keys stay immutable: the admin API has no rename operation. */
  readOnlyOnEdit?: boolean;
  /** Static options for `select`. */
  options?: readonly HardwareFormOption[];
  /** Expected JSON root shape; the drawer rejects the other shape before submit. */
  jsonShape?: 'array' | 'object';
  /** Loaded when the drawer opens, so a reference picker stays in sync. */
  loadOptions?: () => Promise<readonly HardwareFormOption[]>;
}

export interface HardwareResourceDescriptor {
  id: string;
  titleKey: string;
  descriptionKey: string;
  createLabelKey: string;
  emptyTitleKey: string;
  emptyDescriptionKey: string;
  deleteTitleKey: string;
  deleteDescriptionKey: string;
  formCreateTitleKey: string;
  formEditTitleKey: string;
  columns: readonly { key: string; labelKey: string; mono?: boolean; className?: string }[];
  fields: readonly HardwareFormField[];
  list(input: HardwareListInput): Promise<HardwarePage<HardwareResourceRow>>;
  create(fields: Record<string, string>): Promise<void>;
  update(id: string, fields: Record<string, string>): Promise<void>;
  remove(id: string): Promise<void>;
  /** Initial form values for the create drawer. */
  initialFields?: Record<string, string>;
  /** Prefills the edit drawer from a normalized record. */
  formFromRecord?(record: unknown): Record<string, string>;
}

function toRow(
  id: string,
  cells: Record<string, string>,
  raw: unknown,
): HardwareResourceRow {
  return { cells, id, raw };
}

function mapRows<T>(
  page: HardwarePage<T>,
  toIdentifier: (record: T) => string,
  toCells: (record: T) => Record<string, string>,
): HardwarePage<HardwareResourceRow> {
  return {
    ...page,
    items: page.items.map((record) => toRow(toIdentifier(record), toCells(record), record)),
  };
}

function requireField(fields: Record<string, string>, key: string): string {
  return (fields[key] ?? '').trim();
}

function optionalJsonField(fields: Record<string, string>, key: string): unknown {
  const raw = (fields[key] ?? '').trim();
  if (!raw) {
    return undefined;
  }
  const parsed = parseJsonInput(raw);
  return parsed.ok ? parsed.value : undefined;
}

/**
 * Reads a JSON array of objects. The drawer already rejected a wrong root shape
 * and non-object entries, so this only keeps the values that can reach the typed
 * request.
 */
function jsonObjectArray(fields: Record<string, string>, key: string): readonly Record<string, unknown>[] | undefined {
  const parsed = optionalJsonField(fields, key);
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  return parsed.flatMap((entry): Record<string, unknown>[] =>
    entry && typeof entry === 'object' && !Array.isArray(entry) ? [entry as Record<string, unknown>] : [],
  );
}

function statusOptionList(): readonly HardwareFormOption[] {
  return [
    { label: 'Active', value: 'active' },
    { label: 'Disabled', value: 'disabled' },
    { label: 'Archived', value: 'archived' },
  ];
}

// --------------------------------------------------------------------- product

export function createProductResource(service: HardwareService): HardwareResourceDescriptor {
  const loadProfileOptions = async (): Promise<readonly HardwareFormOption[]> => {
    const page = await service.listHardwareProfiles({ page: 1, pageSize: 100 });
    return page.items.map((profile) => ({
      value: profile.hardwareProfileId,
      label: `${profile.hardwareProfileId} 路 ${profile.chipFamily}`,
    }));
  };
  const loadProtocolOptions = async (): Promise<readonly HardwareFormOption[]> => {
    const page = await service.listProtocolProfiles({ page: 1, pageSize: 100 });
    return page.items.map((profile) => ({
      value: profile.protocolProfileId,
      label: `${profile.protocolProfileId} 路 ${profile.defaultProtocolId}`,
    }));
  };
  const loadCapabilityOptions = async (): Promise<readonly HardwareFormOption[]> => {
    const page = await service.listCapabilityModels({ page: 1, pageSize: 100 });
    return page.items.map((model) => ({
      value: model.capabilityModelId,
      label: `${model.capabilityModelId} 路 ${model.version}`,
    }));
  };

  return {
    id: 'products',
    titleKey: 'admin.hardware.products.title',
    descriptionKey: 'admin.hardware.products.description',
    createLabelKey: 'admin.hardware.products.create',
    emptyTitleKey: 'admin.hardware.products.empty',
    emptyDescriptionKey: 'admin.hardware.products.emptyHint',
    deleteTitleKey: 'admin.hardware.products.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.products.deleteDescription',
    formCreateTitleKey: 'admin.hardware.products.formCreateTitle',
    formEditTitleKey: 'admin.hardware.products.formEditTitle',
    columns: [
      { key: 'productId', labelKey: 'admin.hardware.products.column.productId', mono: true },
      { key: 'displayName', labelKey: 'admin.hardware.products.column.displayName' },
      { key: 'hardwareProfileId', labelKey: 'admin.hardware.products.column.hardwareProfile', mono: true },
      { key: 'protocolProfileId', labelKey: 'admin.hardware.products.column.protocolProfile', mono: true },
      { key: 'capabilityModelId', labelKey: 'admin.hardware.products.column.capabilityModel', mono: true },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
    ],
    fields: [
      {
        key: 'productId',
        labelKey: 'admin.hardware.products.field.productId',
        kind: 'text',
        required: true,
        readOnlyOnEdit: true,
        hintKey: 'admin.hardware.products.field.productIdHint',
        placeholderKey: 'admin.hardware.products.field.productIdPlaceholder',
      },
      {
        key: 'displayName',
        labelKey: 'admin.hardware.products.field.displayName',
        kind: 'text',
        required: true,
      },
      {
        key: 'defaultHardwareProfileId',
        labelKey: 'admin.hardware.products.field.hardwareProfile',
        kind: 'select',
        required: true,
        loadOptions: loadProfileOptions,
        hintKey: 'admin.hardware.products.field.hardwareProfileHint',
      },
      {
        key: 'defaultProtocolProfileId',
        labelKey: 'admin.hardware.products.field.protocolProfile',
        kind: 'select',
        required: true,
        loadOptions: loadProtocolOptions,
      },
      {
        key: 'defaultCapabilityModelId',
        labelKey: 'admin.hardware.products.field.capabilityModel',
        kind: 'select',
        required: true,
        loadOptions: loadCapabilityOptions,
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: statusOptionList(),
      },
    ],
    async list(input) {
      const page = await service.listProducts(input);
      return mapRows(page, (record) => record.productId, (record) => productCells(record));
    },
    async create(fields) {
      await service.createProduct({
        productId: requireField(fields, 'productId'),
        displayName: requireField(fields, 'displayName'),
        defaultHardwareProfileId: requireField(fields, 'defaultHardwareProfileId'),
        defaultProtocolProfileId: requireField(fields, 'defaultProtocolProfileId'),
        defaultCapabilityModelId: requireField(fields, 'defaultCapabilityModelId'),
      });
    },
    async update(id, fields) {
      await service.updateProduct(id, {
        displayName: requireField(fields, 'displayName'),
        defaultHardwareProfileId: requireField(fields, 'defaultHardwareProfileId'),
        defaultProtocolProfileId: requireField(fields, 'defaultProtocolProfileId'),
        defaultCapabilityModelId: requireField(fields, 'defaultCapabilityModelId'),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteProduct(id);
    },
    formFromRecord(record) {
      const product = record as HardwareProduct;
      return {
        productId: product.productId,
        displayName: product.displayName,
        defaultHardwareProfileId: product.hardwareProfileId,
        defaultProtocolProfileId: product.protocolProfileId,
        defaultCapabilityModelId: product.capabilityModelId,
        status: product.status,
      };
    },
  };
}

function productCells(record: HardwareProduct): Record<string, string> {
  return {
    productId: record.productId,
    displayName: record.displayName,
    hardwareProfileId: record.hardwareProfileId,
    protocolProfileId: record.protocolProfileId,
    capabilityModelId: record.capabilityModelId,
    status: record.status,
  };
}

// ----------------------------------------------------------- hardware profile

export function createHardwareProfileResource(service: HardwareService): HardwareResourceDescriptor {
  return {
    id: 'hardware-profiles',
    titleKey: 'admin.hardware.hardwareProfiles.title',
    descriptionKey: 'admin.hardware.hardwareProfiles.description',
    createLabelKey: 'admin.hardware.hardwareProfiles.create',
    emptyTitleKey: 'admin.hardware.hardwareProfiles.empty',
    emptyDescriptionKey: 'admin.hardware.hardwareProfiles.emptyHint',
    deleteTitleKey: 'admin.hardware.hardwareProfiles.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.hardwareProfiles.deleteDescription',
    formCreateTitleKey: 'admin.hardware.hardwareProfiles.formCreateTitle',
    formEditTitleKey: 'admin.hardware.hardwareProfiles.formEditTitle',
    columns: [
      { key: 'hardwareProfileId', labelKey: 'admin.hardware.hardwareProfiles.column.id', mono: true },
      { key: 'chipFamily', labelKey: 'admin.hardware.hardwareProfiles.column.chipFamily', mono: true },
      { key: 'hardwareClasses', labelKey: 'admin.hardware.hardwareProfiles.column.hardwareClasses' },
      { key: 'runtimeProfiles', labelKey: 'admin.hardware.hardwareProfiles.column.runtimeProfiles' },
      { key: 'otaProfiles', labelKey: 'admin.hardware.hardwareProfiles.column.otaProfiles' },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
    ],
    fields: [
      {
        key: 'hardwareProfileId',
        labelKey: 'admin.hardware.hardwareProfiles.field.id',
        kind: 'text',
        required: true,
        readOnlyOnEdit: true,
      },
      {
        key: 'chipFamily',
        labelKey: 'admin.hardware.hardwareProfiles.field.chipFamily',
        kind: 'text',
        required: true,
        hintKey: 'admin.hardware.hardwareProfiles.field.chipFamilyHint',
      },
      {
        key: 'hardwareClasses',
        labelKey: 'admin.hardware.hardwareProfiles.field.hardwareClasses',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'runtimeProfiles',
        labelKey: 'admin.hardware.hardwareProfiles.field.runtimeProfiles',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'connectivityProfiles',
        labelKey: 'admin.hardware.hardwareProfiles.field.connectivityProfiles',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'securityProfiles',
        labelKey: 'admin.hardware.hardwareProfiles.field.securityProfiles',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'otaProfiles',
        labelKey: 'admin.hardware.hardwareProfiles.field.otaProfiles',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: statusOptionList(),
      },
    ],
    async list(input) {
      const page = await service.listHardwareProfiles(input);
      return mapRows(page, (record) => record.hardwareProfileId, (record) => hardwareProfileCells(record));
    },
    async create(fields) {
      await service.createHardwareProfile({
        hardwareProfileId: requireField(fields, 'hardwareProfileId'),
        chipFamily: requireField(fields, 'chipFamily'),
        hardwareClasses: splitListInput(fields.hardwareClasses ?? ''),
        runtimeProfiles: splitListInput(fields.runtimeProfiles ?? ''),
        connectivityProfiles: splitListInput(fields.connectivityProfiles ?? ''),
        securityProfiles: splitListInput(fields.securityProfiles ?? ''),
        otaProfiles: splitListInput(fields.otaProfiles ?? ''),
      });
    },
    async update(id, fields) {
      await service.updateHardwareProfile(id, {
        chipFamily: requireField(fields, 'chipFamily'),
        hardwareClasses: splitListInput(fields.hardwareClasses ?? ''),
        runtimeProfiles: splitListInput(fields.runtimeProfiles ?? ''),
        connectivityProfiles: splitListInput(fields.connectivityProfiles ?? ''),
        securityProfiles: splitListInput(fields.securityProfiles ?? ''),
        otaProfiles: splitListInput(fields.otaProfiles ?? ''),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteHardwareProfile(id);
    },
    formFromRecord(record) {
      const profile = record as HardwareProfile;
      return {
        hardwareProfileId: profile.hardwareProfileId,
        chipFamily: profile.chipFamily,
        hardwareClasses: joinListInput(profile.hardwareClasses),
        runtimeProfiles: joinListInput(profile.runtimeProfiles),
        connectivityProfiles: joinListInput(profile.connectivityProfiles),
        securityProfiles: joinListInput(profile.securityProfiles),
        otaProfiles: joinListInput(profile.otaProfiles),
        status: profile.status,
      };
    },
  };
}

function hardwareProfileCells(record: HardwareProfile): Record<string, string> {
  return {
    hardwareProfileId: record.hardwareProfileId,
    chipFamily: record.chipFamily,
    hardwareClasses: record.hardwareClasses.join(', '),
    runtimeProfiles: record.runtimeProfiles.join(', '),
    otaProfiles: record.otaProfiles.join(', '),
    status: record.status,
  };
}

// ----------------------------------------------------------- protocol profile

export function createProtocolProfileResource(service: HardwareService): HardwareResourceDescriptor {
  return {
    id: 'protocol-profiles',
    titleKey: 'admin.hardware.protocolProfiles.title',
    descriptionKey: 'admin.hardware.protocolProfiles.description',
    createLabelKey: 'admin.hardware.protocolProfiles.create',
    emptyTitleKey: 'admin.hardware.protocolProfiles.empty',
    emptyDescriptionKey: 'admin.hardware.protocolProfiles.emptyHint',
    deleteTitleKey: 'admin.hardware.protocolProfiles.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.protocolProfiles.deleteDescription',
    formCreateTitleKey: 'admin.hardware.protocolProfiles.formCreateTitle',
    formEditTitleKey: 'admin.hardware.protocolProfiles.formEditTitle',
    columns: [
      { key: 'protocolProfileId', labelKey: 'admin.hardware.protocolProfiles.column.id', mono: true },
      { key: 'defaultProtocolId', labelKey: 'admin.hardware.protocolProfiles.column.defaultProtocol', mono: true },
      { key: 'scope', labelKey: 'admin.hardware.protocolProfiles.column.scope' },
      { key: 'allowedTransports', labelKey: 'admin.hardware.protocolProfiles.column.allowedTransports' },
      { key: 'allowedMessageClasses', labelKey: 'admin.hardware.protocolProfiles.column.messageClasses' },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
    ],
    fields: [
      {
        key: 'protocolProfileId',
        labelKey: 'admin.hardware.protocolProfiles.field.id',
        kind: 'text',
        required: true,
        readOnlyOnEdit: true,
      },
      {
        key: 'defaultProtocolId',
        labelKey: 'admin.hardware.protocolProfiles.field.defaultProtocol',
        kind: 'text',
        required: true,
        hintKey: 'admin.hardware.protocolProfiles.field.defaultProtocolHint',
      },
      {
        key: 'scope',
        labelKey: 'admin.hardware.protocolProfiles.field.scope',
        kind: 'select',
        options: [
          { label: 'Product', value: 'product' },
          { label: 'Tenant', value: 'tenant' },
          { label: 'Platform', value: 'platform' },
        ],
      },
      {
        key: 'allowedTransports',
        labelKey: 'admin.hardware.protocolProfiles.field.allowedTransports',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'allowedMessageClasses',
        labelKey: 'admin.hardware.protocolProfiles.field.messageClasses',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'capabilityBridges',
        labelKey: 'admin.hardware.protocolProfiles.field.capabilityBridges',
        kind: 'list',
        hintKey: 'admin.hardware.common.listHint',
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: statusOptionList(),
      },
    ],
    async list(input) {
      const page = await service.listProtocolProfiles(input);
      return mapRows(page, (record) => record.protocolProfileId, (record) => protocolProfileCells(record));
    },
    async create(fields) {
      await service.createProtocolProfile({
        protocolProfileId: requireField(fields, 'protocolProfileId'),
        defaultProtocolId: requireField(fields, 'defaultProtocolId'),
        ...(requireField(fields, 'scope') ? { scope: requireField(fields, 'scope') } : {}),
        allowedTransports: splitListInput(fields.allowedTransports ?? ''),
        allowedMessageClasses: splitListInput(fields.allowedMessageClasses ?? ''),
        capabilityBridges: splitListInput(fields.capabilityBridges ?? ''),
      });
    },
    async update(id, fields) {
      await service.updateProtocolProfile(id, {
        defaultProtocolId: requireField(fields, 'defaultProtocolId'),
        ...(requireField(fields, 'scope') ? { scope: requireField(fields, 'scope') } : {}),
        allowedTransports: splitListInput(fields.allowedTransports ?? ''),
        allowedMessageClasses: splitListInput(fields.allowedMessageClasses ?? ''),
        capabilityBridges: splitListInput(fields.capabilityBridges ?? ''),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteProtocolProfile(id);
    },
    formFromRecord(record) {
      const profile = record as HardwareProtocolProfile;
      return {
        protocolProfileId: profile.protocolProfileId,
        defaultProtocolId: profile.defaultProtocolId,
        scope: profile.scope,
        allowedTransports: joinListInput(profile.allowedTransports),
        allowedMessageClasses: joinListInput(profile.allowedMessageClasses),
        capabilityBridges: joinListInput(profile.capabilityBridges),
        status: profile.status,
      };
    },
  };
}

function protocolProfileCells(record: HardwareProtocolProfile): Record<string, string> {
  return {
    protocolProfileId: record.protocolProfileId,
    defaultProtocolId: record.defaultProtocolId,
    scope: record.scope,
    allowedTransports: record.allowedTransports.join(', '),
    allowedMessageClasses: record.allowedMessageClasses.join(', '),
    status: record.status,
  };
}

// ---------------------------------------------------------- capability model

export function createCapabilityModelResource(service: HardwareService): HardwareResourceDescriptor {
  return {
    id: 'capability-models',
    titleKey: 'admin.hardware.capabilityModels.title',
    descriptionKey: 'admin.hardware.capabilityModels.description',
    createLabelKey: 'admin.hardware.capabilityModels.create',
    emptyTitleKey: 'admin.hardware.capabilityModels.empty',
    emptyDescriptionKey: 'admin.hardware.capabilityModels.emptyHint',
    deleteTitleKey: 'admin.hardware.capabilityModels.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.capabilityModels.deleteDescription',
    formCreateTitleKey: 'admin.hardware.capabilityModels.formCreateTitle',
    formEditTitleKey: 'admin.hardware.capabilityModels.formEditTitle',
    columns: [
      { key: 'capabilityModelId', labelKey: 'admin.hardware.capabilityModels.column.id', mono: true },
      { key: 'displayName', labelKey: 'admin.hardware.capabilityModels.column.displayName' },
      { key: 'version', labelKey: 'admin.hardware.capabilityModels.column.version', mono: true },
      { key: 'capabilityCount', labelKey: 'admin.hardware.capabilityModels.column.capabilities' },
      { key: 'settingCount', labelKey: 'admin.hardware.capabilityModels.column.settings' },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
    ],
    fields: [
      {
        key: 'capabilityModelId',
        labelKey: 'admin.hardware.capabilityModels.field.id',
        kind: 'text',
        required: true,
        readOnlyOnEdit: true,
      },
      {
        key: 'displayName',
        labelKey: 'admin.hardware.capabilityModels.field.displayName',
        kind: 'text',
        required: true,
      },
      {
        key: 'version',
        labelKey: 'admin.hardware.capabilityModels.field.version',
        kind: 'text',
        required: true,
        hintKey: 'admin.hardware.capabilityModels.field.versionHint',
      },
      {
        key: 'capabilities',
        labelKey: 'admin.hardware.capabilityModels.field.capabilities',
        kind: 'json',
        jsonShape: 'array',
        hintKey: 'admin.hardware.capabilityModels.field.capabilitiesHint',
      },
      {
        key: 'settings',
        labelKey: 'admin.hardware.capabilityModels.field.settings',
        kind: 'json',
        jsonShape: 'array',
        hintKey: 'admin.hardware.capabilityModels.field.settingsHint',
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: statusOptionList(),
      },
    ],
    async list(input) {
      const page = await service.listCapabilityModels(input);
      return mapRows(page, (record) => record.capabilityModelId, (record) => capabilityModelCells(record));
    },
    async create(fields) {
      await service.createCapabilityModel({
        capabilityModelId: requireField(fields, 'capabilityModelId'),
        displayName: requireField(fields, 'displayName'),
        version: requireField(fields, 'version'),
        ...(jsonObjectArray(fields, 'capabilities') === undefined
          ? {}
          : { capabilities: jsonObjectArray(fields, 'capabilities') }),
        ...(jsonObjectArray(fields, 'settings') === undefined
          ? {}
          : { settings: jsonObjectArray(fields, 'settings') }),
      });
    },
    async update(id, fields) {
      await service.updateCapabilityModel(id, {
        displayName: requireField(fields, 'displayName'),
        version: requireField(fields, 'version'),
        ...(jsonObjectArray(fields, 'capabilities') === undefined
          ? {}
          : { capabilities: jsonObjectArray(fields, 'capabilities') }),
        ...(jsonObjectArray(fields, 'settings') === undefined
          ? {}
          : { settings: jsonObjectArray(fields, 'settings') }),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteCapabilityModel(id);
    },
    formFromRecord(record) {
      const model = record as HardwareCapabilityModel;
      const raw = record as unknown as Record<string, unknown>;
      return {
        capabilityModelId: model.capabilityModelId,
        displayName: model.displayName,
        version: model.version,
        capabilities: jsonText(Array.isArray(raw.capabilities) ? raw.capabilities : []),
        settings: jsonText(Array.isArray(raw.settings) ? raw.settings : []),
        status: model.status,
      };
    },
  };
}

function capabilityModelCells(record: HardwareCapabilityModel): Record<string, string> {
  return {
    capabilityModelId: record.capabilityModelId,
    displayName: record.displayName,
    version: record.version,
    capabilityCount: String(record.capabilities.length),
    settingCount: String(record.settingCount),
    status: record.status,
  };
}

// --------------------------------------------------------- firmware artifact

export function createFirmwareArtifactResource(service: HardwareService): HardwareResourceDescriptor {
  const buildResource = (fields: Record<string, string>): AiotMediaResource => {
    const source = requireField(fields, 'resourceSource') || 'external_url';
    const resource: AiotMediaResource = { kind: 'archive', source: source as AiotMediaResource['source'] };
    if (source === 'external_url') {
      const url = requireField(fields, 'resourceUrl');
      if (url) {
        resource.url = url;
        resource.fileName = requireField(fields, 'resourceFileName') || undefined;
      }
      return resource;
    }
    const objectBlobId = requireField(fields, 'resourceObjectBlobId');
    if (objectBlobId) {
      resource.objectBlobId = objectBlobId;
    }
    return resource;
  };
  const buildCreateRequest = (fields: Record<string, string>): AiotFirmwareArtifactCreateRequest => ({
    artifactKey: requireField(fields, 'artifactKey'),
    version: requireField(fields, 'version'),
    sha256: requireField(fields, 'sha256'),
    resource: buildResource(fields),
    ...(requireField(fields, 'signature') ? { signature: requireField(fields, 'signature') } : {}),
    ...(requireField(fields, 'targetChipFamily')
      ? { targetChipFamily: requireField(fields, 'targetChipFamily') }
      : {}),
    ...(requireField(fields, 'targetRuntimeProfile')
      ? { targetRuntimeProfile: requireField(fields, 'targetRuntimeProfile') }
      : {}),
  });

  return {
    id: 'firmware-artifacts',
    titleKey: 'admin.hardware.firmwareArtifacts.title',
    descriptionKey: 'admin.hardware.firmwareArtifacts.description',
    createLabelKey: 'admin.hardware.firmwareArtifacts.create',
    emptyTitleKey: 'admin.hardware.firmwareArtifacts.empty',
    emptyDescriptionKey: 'admin.hardware.firmwareArtifacts.emptyHint',
    deleteTitleKey: 'admin.hardware.firmwareArtifacts.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.firmwareArtifacts.deleteDescription',
    formCreateTitleKey: 'admin.hardware.firmwareArtifacts.formCreateTitle',
    formEditTitleKey: 'admin.hardware.firmwareArtifacts.formEditTitle',
    columns: [
      { key: 'artifactKey', labelKey: 'admin.hardware.firmwareArtifacts.column.artifactKey', mono: true },
      { key: 'version', labelKey: 'admin.hardware.firmwareArtifacts.column.version', mono: true },
      { key: 'targetChipFamily', labelKey: 'admin.hardware.firmwareArtifacts.column.targetChipFamily', mono: true },
      { key: 'targetRuntimeProfile', labelKey: 'admin.hardware.firmwareArtifacts.column.targetRuntimeProfile', mono: true },
      { key: 'sha256Preview', labelKey: 'admin.hardware.firmwareArtifacts.column.checksum', mono: true },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
    ],
    fields: [
      {
        key: 'artifactKey',
        labelKey: 'admin.hardware.firmwareArtifacts.field.artifactKey',
        kind: 'text',
        required: true,
        hintKey: 'admin.hardware.firmwareArtifacts.field.artifactKeyHint',
      },
      {
        key: 'version',
        labelKey: 'admin.hardware.firmwareArtifacts.field.version',
        kind: 'text',
        required: true,
      },
      {
        key: 'sha256',
        labelKey: 'admin.hardware.firmwareArtifacts.field.sha256',
        kind: 'text',
        required: true,
        hintKey: 'admin.hardware.firmwareArtifacts.field.sha256Hint',
      },
      {
        key: 'signature',
        labelKey: 'admin.hardware.firmwareArtifacts.field.signature',
        kind: 'text',
        hintKey: 'admin.hardware.firmwareArtifacts.field.signatureHint',
      },
      {
        key: 'targetChipFamily',
        labelKey: 'admin.hardware.firmwareArtifacts.field.targetChipFamily',
        kind: 'text',
      },
      {
        key: 'targetRuntimeProfile',
        labelKey: 'admin.hardware.firmwareArtifacts.field.targetRuntimeProfile',
        kind: 'text',
      },
      {
        key: 'resourceSource',
        labelKey: 'admin.hardware.firmwareArtifacts.field.resourceSource',
        kind: 'select',
        required: true,
        options: [
          { label: 'External URL', value: 'external_url' },
          { label: 'Object storage', value: 'object_storage' },
          { label: 'Drive', value: 'drive' },
        ],
      },
      {
        key: 'resourceUrl',
        labelKey: 'admin.hardware.firmwareArtifacts.field.resourceUrl',
        kind: 'text',
        hintKey: 'admin.hardware.firmwareArtifacts.field.resourceUrlHint',
      },
      {
        key: 'resourceObjectBlobId',
        labelKey: 'admin.hardware.firmwareArtifacts.field.resourceObjectBlobId',
        kind: 'text',
        hintKey: 'admin.hardware.firmwareArtifacts.field.resourceObjectBlobIdHint',
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Deprecated', value: 'deprecated' },
        ],
      },
    ],
    initialFields: { resourceSource: 'external_url', status: 'draft' },
    async list(input) {
      const page = await service.listFirmwareArtifacts(input);
      return mapRows(page, (record) => record.artifactId, (record) => firmwareArtifactCells(record));
    },
    async create(fields) {
      await service.createFirmwareArtifact(buildCreateRequest(fields));
    },
    async update(id, fields) {
      const existing = readText(fields.sha256);
      await service.updateFirmwareArtifact(id, {
        ...(requireField(fields, 'artifactKey') ? { artifactKey: requireField(fields, 'artifactKey') } : {}),
        ...(requireField(fields, 'version') ? { version: requireField(fields, 'version') } : {}),
        ...(existing ? { sha256: existing } : {}),
        resource: buildResource(fields),
        ...(requireField(fields, 'signature') ? { signature: requireField(fields, 'signature') } : {}),
        ...(requireField(fields, 'targetChipFamily')
          ? { targetChipFamily: requireField(fields, 'targetChipFamily') }
          : {}),
        ...(requireField(fields, 'targetRuntimeProfile')
          ? { targetRuntimeProfile: requireField(fields, 'targetRuntimeProfile') }
          : {}),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteFirmwareArtifact(id);
    },
    formFromRecord(record) {
      const artifact = record as HardwareFirmwareArtifact;
      const raw = record as unknown as Record<string, unknown>;
      const resource = readJsonValue(raw.resource) as Record<string, unknown> | undefined;
      return {
        artifactKey: artifact.artifactKey,
        version: artifact.version,
        sha256: artifact.sha256,
        signature: artifact.signature,
        targetChipFamily: artifact.targetChipFamily,
        targetRuntimeProfile: artifact.targetRuntimeProfile,
        resourceSource: readText(resource?.source) || 'external_url',
        resourceUrl: readText(resource?.url),
        resourceObjectBlobId: readText(resource?.objectBlobId),
        status: artifact.status,
      };
    },
  };
}

function firmwareArtifactCells(record: HardwareFirmwareArtifact): Record<string, string> {
  return {
    artifactKey: record.artifactKey,
    version: record.version,
    targetChipFamily: record.targetChipFamily,
    targetRuntimeProfile: record.targetRuntimeProfile,
    sha256Preview: record.sha256.slice(0, 16),
    status: record.status,
  };
}

// ---------------------------------------------------------- firmware rollout

export function createFirmwareRolloutResource(service: HardwareService): HardwareResourceDescriptor {
  return {
    id: 'firmware-rollouts',
    titleKey: 'admin.hardware.firmwareRollouts.title',
    descriptionKey: 'admin.hardware.firmwareRollouts.description',
    createLabelKey: 'admin.hardware.firmwareRollouts.create',
    emptyTitleKey: 'admin.hardware.firmwareRollouts.empty',
    emptyDescriptionKey: 'admin.hardware.firmwareRollouts.emptyHint',
    deleteTitleKey: 'admin.hardware.firmwareRollouts.deleteTitle',
    deleteDescriptionKey: 'admin.hardware.firmwareRollouts.deleteDescription',
    formCreateTitleKey: 'admin.hardware.firmwareRollouts.formCreateTitle',
    formEditTitleKey: 'admin.hardware.firmwareRollouts.formEditTitle',
    columns: [
      { key: 'rolloutId', labelKey: 'admin.hardware.firmwareRollouts.column.id', mono: true },
      { key: 'artifactId', labelKey: 'admin.hardware.firmwareRollouts.column.artifact', mono: true },
      { key: 'targetSummary', labelKey: 'admin.hardware.firmwareRollouts.column.target' },
      { key: 'targetCount', labelKey: 'admin.hardware.firmwareRollouts.column.targetCount' },
      { key: 'status', labelKey: 'admin.hardware.common.status' },
      { key: 'updatedAt', labelKey: 'admin.hardware.common.updatedAt' },
    ],
    fields: [
      {
        key: 'artifactId',
        labelKey: 'admin.hardware.firmwareRollouts.field.artifact',
        kind: 'select',
        required: true,
        loadOptions: async () => {
          const page = await service.listFirmwareArtifacts({ page: 1, pageSize: 100 });
          return page.items.map((artifact) => ({
            value: artifact.artifactId,
            label: `${artifact.artifactKey} 路 ${artifact.version}`,
          }));
        },
      },
      {
        key: 'targetPolicy',
        labelKey: 'admin.hardware.firmwareRollouts.field.targetPolicy',
        kind: 'json',
        jsonShape: 'object',
        required: true,
        hintKey: 'admin.hardware.firmwareRollouts.field.targetPolicyHint',
      },
      {
        key: 'status',
        labelKey: 'admin.hardware.common.status',
        kind: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Running', value: 'running' },
          { label: 'Completed', value: 'completed' },
          { label: 'Canceled', value: 'canceled' },
          { label: 'Failed', value: 'failed' },
        ],
      },
    ],
    initialFields: { targetPolicy: '{\n  "deviceIds": []\n}' },
    async list(input) {
      const page = await service.listFirmwareRollouts(input);
      return mapRows(page, (record) => record.rolloutId, (record) => firmwareRolloutCells(record));
    },
    async create(fields) {
      await service.createFirmwareRollout({
        artifactId: requireField(fields, 'artifactId'),
        targetPolicy: optionalJsonField(fields, 'targetPolicy') ?? {},
      });
    },
    async update(id, fields) {
      await service.updateFirmwareRollout(id, {
        ...(optionalJsonField(fields, 'targetPolicy') === undefined
          ? {}
          : { targetPolicy: optionalJsonField(fields, 'targetPolicy') }),
        ...(requireField(fields, 'status') ? { status: requireField(fields, 'status') } : {}),
      });
    },
    async remove(id) {
      await service.deleteFirmwareRollout(id);
    },
    formFromRecord(record) {
      const rollout = record as HardwareFirmwareRollout;
      const raw = record as unknown as Record<string, unknown>;
      return {
        artifactId: rollout.artifactId,
        targetPolicy: jsonText(raw.targetPolicy ?? {}),
        status: rollout.status,
      };
    },
  };
}

function firmwareRolloutCells(record: HardwareFirmwareRollout): Record<string, string> {
  return {
    rolloutId: record.rolloutId,
    artifactId: record.artifactId,
    targetSummary: record.targetSummary,
    targetCount: String(record.targetCount),
    status: record.status,
    updatedAt: record.updatedAt,
  };
}




