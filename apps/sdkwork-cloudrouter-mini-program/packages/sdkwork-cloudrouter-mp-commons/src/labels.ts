/** Minimal translator shape so commons stays free of i18n framework choices. */
export type MpTranslate = (key: string) => string;

/** Projects a key list into the localized label record a page template binds to. */
export function mpLabels<K extends string>(
  translate: MpTranslate,
  keys: Readonly<Record<K, string>>,
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const [field, key] of Object.entries(keys) as [K, string][]) {
    out[field] = translate(key);
  }
  return out;
}
