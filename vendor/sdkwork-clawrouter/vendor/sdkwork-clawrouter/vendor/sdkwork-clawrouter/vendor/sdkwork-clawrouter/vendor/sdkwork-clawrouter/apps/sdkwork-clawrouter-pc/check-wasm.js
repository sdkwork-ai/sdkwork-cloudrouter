import fs from 'fs';

const files = [
  'public/tree-sitter.wasm',
  'public/tree-sitter-bash.wasm',
  'node_modules/.pnpm/web-tree-sitter@0.24.7/node_modules/web-tree-sitter/tree-sitter.wasm',
  'node_modules/.pnpm/tree-sitter-bash@0.23.3_tree-sitter@0.21.1/node_modules/tree-sitter-bash/tree-sitter-bash.wasm',
  'node_modules/.pnpm/curlconverter@4.12.0/node_modules/curlconverter/dist/tree-sitter-bash.wasm'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    console.log(`${file}: size=${stats.size}, header=${buffer.toString('hex')}`);
  } else {
    console.log(`${file} does not exist`);
  }
}
