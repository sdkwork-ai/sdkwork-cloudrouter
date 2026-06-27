#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsIndexPath = join(
  root,
  "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx",
);
const siteAdminPath = join(root, "packages/sdkwork-clawrouter-pc-admin-relay-site/src/siteAdmin.tsx");

const source = readFileSync(modelsIndexPath, "utf8");

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`failed to extract between ${startMarker} and ${endMarker}`);
  }
  return source.slice(start, end);
}

const siteAdminFn = extractBetween("export function SiteAdmin()", "type ModelMappingBindingFilter");
const siteComponents = extractBetween("function SiteLogo(", "export function ModelMappingAdmin()");
const siteFormModal = extractBetween("function SiteFormModal(", "function ModelMappingFormModal(");
const siteFormType =
  "type SiteFormFieldErrorKey = 'siteName' | 'displayName' | 'baseUrl' | 'websiteUrl' | 'docsUrl' | 'domains' | 'vendorCodes';\n\n";
const siteValidation = extractBetween("function validateSiteFormDraft(", "function vendorLabel(");
const formInputBlock = extractBetween("function FormInput(", "function StatusPill(");
const statusPillBlock = extractBetween("function StatusPill(", "function validateSiteFormDraft(");
const readFormUtils = extractBetween("function readFormString(formData: FormData, name: string): string {", "function readRequiredFormString(");

const siteAdminFile = `import React, { useEffect, useMemo, useState } from 'react';
import { AdminTableShell, BusinessStateTableRow, readMediaResourceUrl } from '@sdkwork/clawroutes-pc-commons';
import { Edit, Globe2, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModelService, SiteService, type SiteItem, type Vendor } from '@sdkwork/models-pc-admin-catalog/modelService';

${siteFormType}
${siteAdminFn}
${siteComponents}
${siteFormModal}
function ${formInputBlock}
function ${statusPillBlock}
${siteValidation}
function vendorLabel(vendorCode: string, vendors: readonly Vendor[]): string {
  return vendors.find((vendor) => vendor.vendorCode === vendorCode)?.name ?? vendorCode;
}
${readFormUtils}
`;

writeFileSync(siteAdminPath, siteAdminFile, "utf8");

let stripped = source;
for (const block of [
  siteAdminFn,
  siteComponents,
  siteFormModal,
  siteFormType,
  siteValidation,
]) {
  stripped = stripped.replace(block, "");
}
stripped = stripped.replace(
  "import { ModelService, SiteService, ModelMappingService, Vendor, Model, ModelMappingModelOption, SiteItem, ModelMappingRule",
  "import { ModelMappingService, Vendor, Model, ModelMappingModelOption, ModelMappingRule",
);
writeFileSync(modelsIndexPath, stripped, "utf8");
console.log("extracted site admin to", siteAdminPath);
