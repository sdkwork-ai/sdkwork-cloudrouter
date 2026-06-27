import fs from 'fs';
import path from 'path';

const packages = [
  'sdkwork-clawrouter-pc-types',
  'sdkwork-clawrouter-pc-i18n',
  'sdkwork-clawroutes-pc-commons',
  'sdkwork-clawrouter-pc-core',
  'sdkwork-clawrouter-pc-home',
  'sdkwork-clawrouter-pc-playground',
  'sdkwork-clawrouter-pc-models'
];

const tsconfig = {
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
};

const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      fileName: (format) => \`index.\${format}.js\`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'motion', 'i18next', 'react-i18next'],
    }
  }
});`;

packages.forEach(pkg => {
  const pkgDir = path.join(process.cwd(), 'packages', pkg);

  const packageJson = {
    "name": pkg,
    "private": true,
    "type": "module",
    "main": "./src/index.ts",
    "module": "./src/index.ts",
    "types": "./src/index.ts",
    "exports": {
      ".": {
        "import": "./src/index.ts",
        "types": "./src/index.ts"
      }
    },
    "scripts": {
      "dev": "vite build --watch",
      "build": "vite build",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "devDependencies": {
      "typescript": "~5.8.2",
      "vite": "^6.2.0"
    }
  };

  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(path.join(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  fs.writeFileSync(path.join(pkgDir, 'vite.config.ts'), viteConfig);
  fs.writeFileSync(path.join(pkgDir, 'src', 'index.ts'), 'export {};\n');
});
