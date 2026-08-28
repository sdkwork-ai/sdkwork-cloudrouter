// UMD bundle is self-contained and exposes a default export under Vite dev.
// hast-util-to-jsx-runtime imports `style-to-js` as ESM default; the package
// main entry is CJS-only and breaks Vite 8 browser module loading.
// @ts-expect-error style-to-js UMD bundle has no TypeScript types.
import styleToJs from 'style-to-js/umd/style-to-js.js';

export default styleToJs;
