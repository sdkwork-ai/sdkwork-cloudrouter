/** Admin auth wechat mini schema exposed by Claw Router. */
export interface AdminAuthWechatMini {
  /** App id field on admin auth wechat mini. */
  appId?: string;
  /** Enabled field on admin auth wechat mini. */
  enabled?: boolean;
  /** Env field on admin auth wechat mini. */
  env?: 'release' | 'trial' | 'develop';
  /** Key field on admin auth wechat mini. */
  key?: string;
  /** Name field on admin auth wechat mini. */
  name?: string;
  /** Path field on admin auth wechat mini. */
  path?: string;
  /** Primary field on admin auth wechat mini. */
  primary?: boolean;
  /** Secret ref field on admin auth wechat mini. */
  secretRef?: string;
  /** Url field on admin auth wechat mini. */
  url?: string;
}
