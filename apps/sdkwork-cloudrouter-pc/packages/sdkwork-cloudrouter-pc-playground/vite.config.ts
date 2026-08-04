import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

function isBarePackageImport(id: string): boolean {
  return !id.startsWith('.')
    && !id.startsWith('/')
    && !id.startsWith('\0')
    && !WINDOWS_ABSOLUTE_PATH_PATTERN.test(id);
}

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: isBarePackageImport,
    },
  },
});
