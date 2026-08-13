/**
 * RTC admin domain i18n registry (thin boundary).
 *
 * Authored copy lives in locale fragments:
 *   en-US/rtc/admin/rtc.ts, zh-CN/rtc/admin/rtc.ts
 * The host i18n catalog merges this bundle (like the IAM admin bundle);
 * en/zh key parity is enforced by the host merge.
 */
import { en } from './en-US/rtc/admin/rtc';
import { zh } from './zh-CN/rtc/admin/rtc';

export const cloudRouterRtcAdminMessages = { en, zh };
