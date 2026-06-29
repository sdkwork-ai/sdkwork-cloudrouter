#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_BYTES = 32;
const SUPPORTED_ENCODINGS = ['base64', 'base64url', 'hex'];

function printHelp() {
  console.log(`Usage: node scripts/generate-dev-secret.mjs [options]

Generate a cryptographically random secret for local development.

Options:
  --bytes <n>      Number of random bytes (default ${DEFAULT_BYTES}).
  --encoding <enc>  Output encoding: base64, base64url, hex (default base64url).
  --output <path>   Write the secret to a file instead of stdout.
  -h, --help       Show this help.

Examples:
  node scripts/generate-dev-secret.mjs
  node scripts/generate-dev-secret.mjs --bytes 48 --encoding hex
  node scripts/generate-dev-secret.mjs --output .env.postgres.local.secret
`);
}

function parseArgs(argv) {
  const settings = {
    bytes: DEFAULT_BYTES,
    encoding: 'base64url',
    outputPath: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--bytes': {
        index += 1;
        const value = Number.parseInt(argv[index] ?? '', 10);
        if (!Number.isInteger(value) || value < 16) {
          throw new Error('--bytes must be an integer >= 16');
        }
        settings.bytes = value;
        break;
      }
      case '--encoding': {
        index += 1;
        const value = argv[index] ?? '';
        if (!SUPPORTED_ENCODINGS.includes(value)) {
          throw new Error(`--encoding must be one of: ${SUPPORTED_ENCODINGS.join(', ')}`);
        }
        settings.encoding = value;
        break;
      }
      case '--output': {
        index += 1;
        if (!argv[index]) {
          throw new Error('--output requires a path');
        }
        settings.outputPath = argv[index];
        break;
      }
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported option: ${arg}`);
    }
  }

  return settings;
}

function generateSecret(byteLength, encoding) {
  const bytes = randomBytes(byteLength);
  return bytes.toString(encoding);
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const secret = generateSecret(settings.bytes, settings.encoding);

  if (settings.outputPath) {
    const resolved = path.resolve(settings.outputPath);
    await writeFile(resolved, `${secret}\n`, { encoding: 'utf8', mode: 0o600 });
    console.log(`[generate-dev-secret] wrote ${secret.length} chars to ${resolved}`);
  } else {
    process.stdout.write(`${secret}\n`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[generate-dev-secret] ${error.message}`);
    process.exit(1);
  });
}

export { generateSecret, parseArgs, printHelp, SUPPORTED_ENCODINGS };
