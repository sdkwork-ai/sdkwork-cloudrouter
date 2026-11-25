/**
 * 价格 × 分组销售倍率的精确十进制乘法。
 *
 * 官方费率与销售倍率都是十进制字符串（最多 6 位小数），用浮点相乘会把
 * `0.004 × 0.08` 显示成 `0.00032000000000000006` 之类的噪声，因此这里用
 * BigInt 按整数位相乘、再按小数位还原，结果不做四舍五入（价格展示不应悄悄改值）。
 */

interface ParsedDecimal {
  sign: 1n | -1n;
  digits: bigint;
  scale: number;
}

const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/u;

export function parseDecimalString(value: string): ParsedDecimal | null {
  const matched = DECIMAL_PATTERN.exec(value.trim());
  if (!matched) return null;
  const [, signPrefix = '', whole = '0', fraction = ''] = matched;
  return {
    sign: signPrefix === '-' ? -1n : 1n,
    digits: BigInt(`${whole}${fraction}`),
    scale: fraction.length,
  };
}

/** 十进制字符串相乘；任一输入非法时原样返回左值，避免把价格展示成空。 */
export function multiplyDecimalStrings(left: string, right: string): string {
  const a = parseDecimalString(left);
  const b = parseDecimalString(right);
  if (!a || !b) return left.trim();
  const product = a.digits * b.digits;
  if (product === 0n) return '0';
  const sign = a.sign * b.sign < 0n ? '-' : '';
  return `${sign}${formatScaledDecimal(product, a.scale + b.scale)}`;
}

/** 截掉小数尾零（"0.000320" → "0.00032"），整数位保持不变。 */
export function trimDecimalZeros(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/u, '').replace(/\.$/u, '');
}

/**
 * 按分组倍率折算模型价格：倍率为空或为 1 时返回官方价本身。
 * 结果与官方价使用同一套小数位裁剪，便于并排对比。
 */
export function multiplyPriceByMultiplier(unitPrice: string, multiplier: string | undefined): string {
  const normalizedMultiplier = multiplier?.trim() ?? '';
  if (normalizedMultiplier === '' || normalizedMultiplier === '1' || normalizedMultiplier === '1.0') {
    return trimDecimalZeros(unitPrice.trim());
  }
  return trimDecimalZeros(multiplyDecimalStrings(unitPrice, normalizedMultiplier));
}

function formatScaledDecimal(digits: bigint, scale: number): string {
  const text = digits.toString().padStart(scale + 1, '0');
  if (scale === 0) return text;
  const whole = text.slice(0, -scale);
  const fraction = text.slice(-scale);
  return `${whole}.${fraction}`;
}
