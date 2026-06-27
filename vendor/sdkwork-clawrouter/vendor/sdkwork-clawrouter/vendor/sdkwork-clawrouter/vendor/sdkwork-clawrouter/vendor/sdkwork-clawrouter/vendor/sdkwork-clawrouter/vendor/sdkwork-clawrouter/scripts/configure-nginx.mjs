#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const DEFAULT_DOMAIN = 'api.sdkwork.com';
const DEFAULT_SITE_FAMILY = 'sdkwork';
const DEFAULT_SITE_TYPE = 'api';
const DEFAULT_UPSTREAM = 'http://127.0.0.1:3900';
const DEFAULT_SERVER_ROOT = '/etc/nginx/sites-enabled';
const DEFAULT_CERT_ROOT = '/opt/certs/letsencrypt/live';
const DEFAULT_CLIENT_MAX_BODY_SIZE = '1100m';

function printHelp() {
  console.log(`Usage: node scripts/configure-nginx.mjs [options]

Render or deploy an SDKWork Claw Router nginx reverse-proxy config.

Options:
  --domain <fqdn>             Full public hostname (default ${DEFAULT_DOMAIN}).
  --site-family <name>        sites-enabled child directory (default ${DEFAULT_SITE_FAMILY}).
  --site-type <api|web>       Comment and profile label (default ${DEFAULT_SITE_TYPE}).
  --upstream <origin>         Claw Router edge origin (default ${DEFAULT_UPSTREAM}).
  --server-root <path>        Canonical nginx root (default ${DEFAULT_SERVER_ROOT}).
  --cert-root <path>          Certificate live root (default ${DEFAULT_CERT_ROOT}).
  --cert-name <name>          Certificate directory name (default derived root domain).
  --client-max-body-size <n>  nginx client_max_body_size (default ${DEFAULT_CLIENT_MAX_BODY_SIZE}).
  --output <path>             Exact local output file path.
  --output-root <path>        Local staging root; writes sites-enabled/<family>/<domain>.conf.
  --platform <os>             Plan as linux, windows, or macos (default current OS).
  --dry-run                   Print the plan and rendered config without writing.
  --write                     Write the rendered config to the selected output path.
  --deploy                    Write the config and print nginx validation/reload commands.
  -h, --help                  Show this help.

Canonical deployment path:
  /etc/nginx/sites-enabled/sdkwork/<domain>.conf

Examples:
  pnpm nginx:plan -- --domain api.sdkwork.com
  pnpm nginx:render -- --domain api.sdkwork.com --output-root target/nginx
  sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
  pnpm nginx:deploy -- --platform windows --domain www.sdkwork.com --output-root target/nginx
`);
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseNginxConfigureArgs(argv = process.argv.slice(2)) {
  const settings = {
    help: false,
    dryRun: false,
    write: false,
    deploy: false,
    domain: DEFAULT_DOMAIN,
    siteFamily: DEFAULT_SITE_FAMILY,
    siteType: DEFAULT_SITE_TYPE,
    upstream: DEFAULT_UPSTREAM,
    serverRoot: DEFAULT_SERVER_ROOT,
    certRoot: DEFAULT_CERT_ROOT,
    certName: null,
    clientMaxBodySize: DEFAULT_CLIENT_MAX_BODY_SIZE,
    output: null,
    outputRoot: null,
    platform: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--write':
        settings.write = true;
        break;
      case '--deploy':
        settings.deploy = true;
        break;
      case '--domain':
        settings.domain = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--site-family':
        settings.siteFamily = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--site-type':
        settings.siteType = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--upstream':
        settings.upstream = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--server-root':
        settings.serverRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--cert-root':
        settings.certRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--cert-name':
        settings.certName = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--client-max-body-size':
        settings.clientMaxBodySize = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--output':
        settings.output = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--output-root':
        settings.outputRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--platform':
        settings.platform = requireValue(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unsupported nginx configure option: ${arg}`);
    }
  }

  if (settings.dryRun && (settings.write || settings.deploy)) {
    throw new Error('--dry-run cannot be combined with --write or --deploy');
  }
  if (settings.output && settings.outputRoot) {
    throw new Error('--output cannot be combined with --output-root');
  }

  return settings;
}

function normalizePlatform(platform = process.platform) {
  if (platform === 'win32' || platform === 'windows') {
    return 'windows';
  }
  if (platform === 'darwin' || platform === 'mac' || platform === 'macos') {
    return 'macos';
  }
  return 'linux';
}

function normalizeDomain(value) {
  const domain = String(value ?? '').trim().replace(/\.$/u, '').toLowerCase();
  const labels = domain.split('.');
  const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
  if (
    domain.length < 4
    || domain.length > 253
    || labels.length < 2
    || labels.some((label) => !labelPattern.test(label))
  ) {
    throw new Error('domain must be a fully qualified hostname');
  }
  return domain;
}

function normalizeSiteFamily(value) {
  const siteFamily = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/u.test(siteFamily)) {
    throw new Error('site-family must be a safe nginx directory name');
  }
  return siteFamily;
}

function normalizeSiteType(value) {
  const siteType = String(value ?? '').trim().toLowerCase();
  if (siteType !== 'api' && siteType !== 'web') {
    throw new Error('site-type must be api or web');
  }
  return siteType;
}

function normalizeOrigin(value, flagName = '--upstream') {
  let parsed;
  try {
    parsed = new URL(String(value ?? '').trim());
  } catch {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin without path, query, or hash`);
  }
  return parsed.origin;
}

function normalizeCertName(value) {
  const certName = String(value ?? '').trim().replace(/\.$/u, '').toLowerCase();
  if (!certName || certName.includes('/') || certName.includes('\\') || certName.includes('..')) {
    throw new Error('cert-name must be a certificate directory name, not a path');
  }
  normalizeDomain(certName);
  return certName;
}

function deriveCertName(domain) {
  const labels = normalizeDomain(domain).split('.');
  return labels.slice(-2).join('.');
}

function normalizeClientMaxBodySize(value) {
  const size = String(value ?? '').trim().toLowerCase();
  if (!/^\d+[kmg]?$/u.test(size)) {
    throw new Error('client-max-body-size must be an nginx size such as 100m or 1100m');
  }
  return size;
}

function trimTrailingSlashes(value) {
  return String(value ?? '').trim().replace(/[\\/]+$/u, '');
}

function normalizePosixRoot(value, flagName) {
  const normalized = trimTrailingSlashes(value).replaceAll('\\', '/');
  if (!normalized.startsWith('/')) {
    throw new Error(`${flagName} must be an absolute nginx path`);
  }
  if (normalized.includes('/../') || normalized.endsWith('/..')) {
    throw new Error(`${flagName} must not contain parent-directory traversal`);
  }
  return normalized || '/';
}

function joinPosix(...parts) {
  return path.posix.join(...parts.map((part) => String(part).replaceAll('\\', '/')));
}

function resolveLocalPath(root, value) {
  if (path.isAbsolute(value)) {
    return path.normalize(value);
  }
  return path.resolve(root, value);
}

function createNginxDeploymentPlan(
  settings = parseNginxConfigureArgs([]),
  {
    platform = settings.platform ?? process.platform,
    workspaceRoot: root = workspaceRoot,
  } = {},
) {
  const normalizedPlatform = normalizePlatform(settings.platform ?? platform);
  const domain = normalizeDomain(settings.domain ?? DEFAULT_DOMAIN);
  const siteFamily = normalizeSiteFamily(settings.siteFamily ?? DEFAULT_SITE_FAMILY);
  const siteType = normalizeSiteType(settings.siteType ?? DEFAULT_SITE_TYPE);
  const upstream = normalizeOrigin(settings.upstream ?? DEFAULT_UPSTREAM);
  const serverRoot = normalizePosixRoot(settings.serverRoot ?? DEFAULT_SERVER_ROOT, '--server-root');
  const certRoot = normalizePosixRoot(settings.certRoot ?? DEFAULT_CERT_ROOT, '--cert-root');
  const certName = normalizeCertName(settings.certName ?? deriveCertName(domain));
  const clientMaxBodySize = normalizeClientMaxBodySize(
    settings.clientMaxBodySize ?? DEFAULT_CLIENT_MAX_BODY_SIZE,
  );
  const fileName = `${domain}.conf`;
  const nginxConfigPath = joinPosix(serverRoot, siteFamily, fileName);
  const localRelativeOutput = path.join('sites-enabled', siteFamily, fileName);
  let outputPath;
  if (settings.output) {
    outputPath = resolveLocalPath(root, settings.output);
  } else if (settings.outputRoot) {
    outputPath = path.join(resolveLocalPath(root, settings.outputRoot), localRelativeOutput);
  } else if (normalizedPlatform === 'linux') {
    outputPath = nginxConfigPath;
  } else {
    outputPath = path.join(root, 'target', 'nginx', localRelativeOutput);
  }

  return {
    platform: normalizedPlatform,
    domain,
    siteFamily,
    siteType,
    fileName,
    nginxConfigPath,
    outputPath,
    upstream,
    serverRoot,
    certRoot,
    certName,
    clientMaxBodySize,
    certificates: {
      fullchain: joinPosix(certRoot, certName, 'fullchain.pem'),
      privkey: joinPosix(certRoot, certName, 'privkey.pem'),
    },
    write: Boolean(settings.write),
    deploy: Boolean(settings.deploy),
    dryRun: Boolean(settings.dryRun),
  };
}

function renderProxyHeaders() {
  return [
    '        proxy_http_version 1.1;',
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto $scheme;',
    '        proxy_set_header X-Forwarded-Host $host;',
    '        proxy_set_header X-Forwarded-Port $server_port;',
    '        proxy_set_header Upgrade $http_upgrade;',
    '        proxy_set_header Connection "upgrade";',
    '        proxy_buffering off;',
    '        proxy_cache off;',
  ].join('\n');
}

function renderDnsVerificationLocation(upstream) {
  return `    location ~ ^/([a-zA-Z0-9_-]+)\\.txt$ {
        set $filename $1.txt;
        set $host_name $host;
        set $proxy_url ${upstream}/backend/v3/api/net/dns/record/verify?filename=$filename&host=$host_name;
        proxy_pass $proxy_url;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }`;
}

function renderApplicationLocation(upstream) {
  return `    location / {
        proxy_pass ${upstream};
${renderProxyHeaders()}
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }`;
}

function renderNginxConfig(plan) {
  return `# SDKWork Claw Router nginx reverse proxy
# Domain: ${plan.domain}
# Site family: ${plan.siteFamily}
# Site type: ${plan.siteType}
# Deploy path: ${plan.nginxConfigPath}
# Upstream: ${plan.upstream}
# Certificate root: ${plan.certRoot}

server {
    listen 80;
    listen [::]:80;
    server_name ${plan.domain};
    access_log /var/log/nginx/${plan.domain}.access.log;
    error_log /var/log/nginx/${plan.domain}.error.log;
    client_max_body_size ${plan.clientMaxBodySize};

${renderDnsVerificationLocation(plan.upstream)}

${renderApplicationLocation(plan.upstream)}
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${plan.domain};
    access_log /var/log/nginx/${plan.domain}.access.log;
    error_log /var/log/nginx/${plan.domain}.error.log;

    ssl_certificate ${plan.certificates.fullchain};
    ssl_certificate_key ${plan.certificates.privkey};
    ssl_session_timeout 1d;
    ssl_session_cache shared:SDKWORK_SSL:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    client_max_body_size ${plan.clientMaxBodySize};

${renderDnsVerificationLocation(plan.upstream)}

${renderApplicationLocation(plan.upstream)}
}
`;
}

function renderNginxDeploymentPlan(plan) {
  const deployCommand = `sudo pnpm nginx:deploy -- --domain ${plan.domain} --cert-name ${plan.certName}`;
  return [
    '[nginx-configure] Deployment Plan',
    `[nginx-configure]   Domain: ${plan.domain}`,
    `[nginx-configure]   Site family: ${plan.siteFamily}`,
    `[nginx-configure]   Canonical nginx path: ${plan.nginxConfigPath}`,
    `[nginx-configure]   Output path: ${plan.outputPath}`,
    `[nginx-configure]   Upstream: ${plan.upstream}`,
    `[nginx-configure]   Certificate: ${plan.certificates.fullchain}`,
    `[nginx-configure]   Key: ${plan.certificates.privkey}`,
    '[nginx-configure] Validation and reload:',
    `[nginx-configure]   ${plan.platform === 'linux' ? deployCommand : `pnpm nginx:deploy -- --platform ${plan.platform} --domain ${plan.domain} --output-root <nginx-conf-root>`}`,
    '[nginx-configure]   sudo nginx -t',
    '[nginx-configure]   sudo systemctl reload nginx',
  ];
}

function writeNginxConfig(plan) {
  const config = renderNginxConfig(plan);
  mkdirSync(path.dirname(plan.outputPath), { recursive: true });
  writeFileSync(plan.outputPath, config, 'utf8');
  return {
    outputPath: plan.outputPath,
    bytes: Buffer.byteLength(config, 'utf8'),
  };
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseNginxConfigureArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }

  const plan = createNginxDeploymentPlan(settings, {
    platform: settings.platform ?? process.platform,
    workspaceRoot,
  });

  for (const line of renderNginxDeploymentPlan(plan)) {
    console.log(line);
  }

  if (settings.dryRun || (!settings.write && !settings.deploy)) {
    console.log('[nginx-configure] Rendered config preview:');
    console.log(renderNginxConfig(plan));
    return;
  }

  try {
    const result = writeNginxConfig(plan);
    console.log(`[nginx-configure] wrote ${result.bytes} bytes to ${result.outputPath}`);
  } catch (error) {
    if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
      throw new Error(
        `Cannot write nginx config to ${plan.outputPath}. On Linux rerun with sudo, or render locally with --output-root target/nginx.`,
      );
    }
    throw error;
  }

  if (settings.deploy) {
    console.log('[nginx-configure] Next commands:');
    console.log('sudo nginx -t');
    console.log('sudo systemctl reload nginx');
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[nginx-configure] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  DEFAULT_CERT_ROOT,
  DEFAULT_DOMAIN,
  DEFAULT_SERVER_ROOT,
  DEFAULT_SITE_FAMILY,
  DEFAULT_UPSTREAM,
  createNginxDeploymentPlan,
  deriveCertName,
  main,
  normalizeDomain,
  normalizePlatform,
  parseNginxConfigureArgs,
  renderNginxConfig,
  renderNginxDeploymentPlan,
  writeNginxConfig,
};
