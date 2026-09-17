/** Joins truthy WXSS class names into a single attribute value. */
export function mpClassNames(...values: readonly (string | false | null | undefined)[]): string {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}
