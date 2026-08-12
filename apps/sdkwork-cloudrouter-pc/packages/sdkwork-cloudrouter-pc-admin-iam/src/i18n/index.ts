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

export const cloudRouterIamAdminMessages = { en, zh };
