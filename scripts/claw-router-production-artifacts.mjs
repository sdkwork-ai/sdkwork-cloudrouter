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
  const suffix = platform === 'win32' ? '.exe' : '';
  return `sdkwork-api-clawrouter-standalone-gateway${suffix}`;
}

function productionEdgeBinaryName(platform = process.platform) {
  const suffix = platform === 'win32' ? '.exe' : '';
  return `sdkwork-clawrouter-edge-runtime${suffix}`;
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

function productionEdgeBinaryPath({
  env = process.env,
  platform = process.platform,
  workspaceRoot = process.cwd(),
} = {}) {
  return path.join(
    productionTargetDir({ env, workspaceRoot }),
    'release',
    productionEdgeBinaryName(platform),
  );
}

export {
  productionEdgeBinaryName,
  productionEdgeBinaryPath,
  productionGatewayBinaryName,
  productionGatewayBinaryPath,
  productionTargetDir,
};
