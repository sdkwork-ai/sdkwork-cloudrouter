import { defineConfig } from 'vitest/config';

/**
 * 包内测试配置。
 *
 * `packages/**` 下的包没有自己的 `node_modules/.bin`（`tsc` / `vitest` 只挂在
 * 应用根的 `.bin` 上），所以脚本用相对路径指向应用根的二进制；配置则留在包内，
 * 让 `include` 只描述本包的测试，`pnpm --filter <本包> test` 成为一条自洽的命令，
 * 不必依赖应用根 `vitest.config.ts` 里那行写着本包路径的 include。
 *
 * 环境固定 jsdom：这是 React 组件的渲染测试。
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
