import type { AdminAuthWechatMini } from './admin-auth-wechat-mini';
import type { AdminAuthWechatOfficial } from './admin-auth-wechat-official';

/** Admin auth wechat settings update schema exposed by Claw Router. */
export interface AdminAuthWechatSettingsUpdate {
  /** Mini field on admin auth wechat settings update. */
  mini?: AdminAuthWechatMini[];
  /** Official field on admin auth wechat settings update. */
  official?: AdminAuthWechatOfficial[];
}
