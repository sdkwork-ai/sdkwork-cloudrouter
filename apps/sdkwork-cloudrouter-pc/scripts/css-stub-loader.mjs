import { register } from 'node:module';

// Stub ESM loader for CSS imports under node --test.
//
// The portal packages are consumed from source (`exports` point at `src/`), so
// a test that imports the admin shell barrel also evaluates
// `@sdkwork/appbase-pc-react`'s `AppErrorPage.tsx`, which imports
// `./app-error-page.css`. tsx transpiles TS/TSX but has no CSS loader, so the
// bare `node --import tsx --test` invocation dies with
// ERR_UNKNOWN_FILE_EXTENSION before the first test runs. Vitest neutralizes
// CSS imports itself, which is why only the node --test half of `test:admin`
// needs this hook. The stub matches the vitest CSS transform shape: a module
// with no exports and no side effects.
register('./css-stub-loader-hook.mjs', import.meta.url);
