import path from 'node:path';

function productionTargetDir({ env = process.env, workspaceRoot = process.cwd() } = {}) {
  const configured = env.CARGO_TARGET_DIR;
  if (configured && configured.trim() !== '') {
    return path.isAbsolute(configured)
      ? configured
      : path.join(workspaceRoot, configured);
  }
  return path.join(workspaceRoot, 'target');
}

function productionGatewayBinaryName(platform = process.platform) {
  return platform === 'win32' ? 'clawrouter.exe' : 'clawrouter';
}

function productionGatewayBinaryPath({
  env = process.env,
  platform = process.platform,
  workspaceRoot = process.cwd(),
} = {}) {
  return path.join(
    productionTargetDir({ env, workspaceRoot }),
    'release',
    productionGatewayBinaryName(platform),
  );
}

export {
  productionGatewayBinaryName,
  productionGatewayBinaryPath,
  productionTargetDir,
};
