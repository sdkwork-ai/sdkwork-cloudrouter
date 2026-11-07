// CSS stub hook for node --test (see ./css-stub-loader.mjs).
// Any *.css request resolves to an empty ESM module, mirroring vitest's
// default CSS handling so source-consumed component barrels stay loadable.
const CSS_SUFFIXES = ['.css'];

export async function resolve(specifier, context, nextResolve) {
  const path = specifier.split('?')[0];
  if (CSS_SUFFIXES.some((suffix) => path.endsWith(suffix))) {
    return {
      url: 'data:text/javascript,',
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
