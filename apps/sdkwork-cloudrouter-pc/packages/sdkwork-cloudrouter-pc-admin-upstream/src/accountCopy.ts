/**
 * 供应商账号"复制为新建"的命名投影。
 *
 * 复制动作打开的是**创建**表单：来源账号的配置被预填，提交时创建一条新账号。
 * 账号名称是运营侧标识（`accountCode` 由后端生成，且没有唯一约束），因此这里
 * 只负责给副本一个可区分的默认名称，并保证追加的本地化后缀不越过后端
 * `accountName.maxLength`（200）。
 */

/** 账号名称上限（OpenAPI `accountName.maxLength` / 路由 `MAX_NAME_LENGTH`）。 */
export const ACCOUNT_NAME_MAX_LENGTH = 200;

/**
 * 生成复制后的默认账号名称：`<原名><后缀>`，超长时截断原名，保证整个名称
 * 不超过 200 字符。
 *
 * @param name 来源账号名称
 * @param suffix 本地化副本后缀，如「（副本）」/「 (Copy)」
 */
export function accountCopyName(name: string, suffix: string): string {
  const base = name.trim();
  if (!base) return suffix.trim();
  return `${base.slice(0, Math.max(1, ACCOUNT_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
}
