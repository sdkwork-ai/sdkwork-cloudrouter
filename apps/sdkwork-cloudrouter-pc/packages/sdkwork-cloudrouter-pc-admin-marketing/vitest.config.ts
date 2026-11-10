import { defineConfig } from 'vitest/config';

/**
 * 包内测试配置：`packages/**` 没有自己的 `node_modules/.bin`，测试脚本用
 * 相对路径指向应用根的 vitest 二进制；配置留在包内，`include` 只描述本包，
 * `pnpm --filter <本包> test` 成为一条自活的命令。
 * 环境固定 jsdom：这里是 React 组件渲染测试。
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
