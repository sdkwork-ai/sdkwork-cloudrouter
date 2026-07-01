import type { AdminAuthWechatMini } from './admin-auth-wechat-mini';
import type { AdminAuthWechatOfficial } from './admin-auth-wechat-official';

/** Admin auth wechat settings schema exposed by Claw Router. */
export interface AdminAuthWechatSettings {
  /** Mini field on admin auth wechat settings. */
  mini?: AdminAuthWechatMini[];
  /** Official field on admin auth wechat settings. */
  official?: AdminAuthWechatOfficial[];
}
