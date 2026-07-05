const fs = require('fs');
const path = require('path');

const packages = [
  "sdkwork-clawrouter-pc-admin-dashboard",
  "sdkwork-clawrouter-pc-admin-user",
  "sdkwork-clawrouter-pc-admin-group",
  "sdkwork-clawrouter-pc-admin-relay-site",
  "sdkwork-clawrouter-pc-admin-channel",
  "sdkwork-clawrouter-pc-admin-announcement",
  "sdkwork-clawrouter-pc-admin-marketing",
  "sdkwork-clawrouter-pc-admin-record",
  "sdkwork-clawrouter-pc-admin-monitor"
];

const PROJECT_ROOT = path.join(__dirname, '..');
const packagesDir = path.join(PROJECT_ROOT, 'packages');

for (const pkg of packages) {
  const pkgDir = path.join(packagesDir, pkg);
  if (!fs.existsSync(pkgDir)) {
    fs.mkdirSync(pkgDir, { recursive: true });
  }

  const pkgJsonContent = {
    name: pkg,
    version: "1.0.0",
    main: "src/index.ts",
    dependencies: {
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "lucide-react": "^0.546.0",
      "sdkwork-clawroutes-pc-commons": "file:../sdkwork-clawroutes-pc-commons"
    }
  };

  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJsonContent, null, 2));

  const tsconfigContent = {
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
  fs.writeFileSync(path.join(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfigContent, null, 2));

  const srcDir = path.join(pkgDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  let componentName = pkg.split('-').pop(); // e.g., dashboard
  componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1) + "Admin";

  const indexContent = `import React from 'react';\n\nexport function ${componentName}() {\n  return (\n    <div className="p-6">\n      <h2 className="text-xl font-bold mb-4">${componentName} Moudle</h2>\n      <p>This module provides admin capabilities for ${pkg}.</p>\n    </div>\n  );\n}\n`;
  fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);
}

const rootPkgPath = path.join(PROJECT_ROOT, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

for (const pkg of packages) {
  rootPkg.dependencies[pkg] = "file:./packages/" + pkg;
}

// Sort alphabetically to be nice
const sortedDeps = {};
Object.keys(rootPkg.dependencies).sort().forEach(k => {
  sortedDeps[k] = rootPkg.dependencies[k];
});
rootPkg.dependencies = sortedDeps;

fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

console.log("Packages created successfully!");
