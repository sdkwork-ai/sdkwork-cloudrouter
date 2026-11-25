/**
 * IAM admin domain i18n registry (thin boundary).
 *
 * Authored copy lives in locale fragments:
 *   en-US/iam/admin/iam.ts, zh-CN/iam/admin/iam.ts
 * The host i18n catalog merges this bundle (like @sdkwork/cloudrouter-pc-admin-upstream/i18n);
 * en/zh key parity is enforced by the host merge. Missing optional locales fall
 * back to English at runtime.
 */
import { en } from './en-US/iam/admin/iam';
import { zh } from './zh-CN/iam/admin/iam';
// Catalog-only subpaths: the host registers the message catalogs without
// pulling each package's page module graph into the entry bundle.
import { SDKWORK_IAM_ACCOUNT_BINDING_ADMIN_I18N_CATALOG } from '@sdkwork/iam-pc-admin-account-binding/i18n';
import { SDKWORK_IAM_AUDIT_ADMIN_I18N_CATALOG } from '@sdkwork/iam-pc-admin-audit/i18n';
import {
  SDKWORK_IAM_OAUTH_ADMIN_I18N_CATALOG,
  SDKWORK_MINI_PROGRAM_I18N_CATALOG,
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
} from '@sdkwork/iam-pc-admin-oauth/i18n';
import { SDKWORK_IAM_ORGANIZATION_ADMIN_I18N_CATALOG } from '@sdkwork/iam-pc-admin-organization/i18n';
import { SDKWORK_IAM_TENANT_ADMIN_I18N_CATALOG } from '@sdkwork/iam-pc-admin-tenant/i18n';

export const cloudRouterIamAdminMessages = { en, zh };

/**
 * Module catalogs the Identity & Access routes resolve their copy through.
 *
 * Each IAM admin package reads its own namespace with
 * `useSdkworkModuleMessages`, which returns the catalog's default locale unless
 * the host registered the catalog with `SdkworkI18nProvider`. Registering only
 * one of them (the original state: the official-account panel alone) left the
 * tenant / organization / OAuth / audit / account-binding / mini-program pages
 * in English inside a zh-CN console. The host spreads this list into its
 * provider exactly once.
 */
export const CLOUD_ROUTER_IAM_ADMIN_I18N_CATALOGS = [
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SDKWORK_MINI_PROGRAM_I18N_CATALOG,
  SDKWORK_IAM_TENANT_ADMIN_I18N_CATALOG,
  SDKWORK_IAM_ORGANIZATION_ADMIN_I18N_CATALOG,
  SDKWORK_IAM_OAUTH_ADMIN_I18N_CATALOG,
  SDKWORK_IAM_AUDIT_ADMIN_I18N_CATALOG,
  SDKWORK_IAM_ACCOUNT_BINDING_ADMIN_I18N_CATALOG,
] as const;
