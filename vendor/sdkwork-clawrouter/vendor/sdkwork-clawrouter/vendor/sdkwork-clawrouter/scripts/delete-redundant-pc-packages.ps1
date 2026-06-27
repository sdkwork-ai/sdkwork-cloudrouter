$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\apps\sdkwork-clawrouter-pc\packages')).Path
$toDelete = @(
  'sdkwork-clawrouter-pc-admin-announcement',
  'sdkwork-clawrouter-pc-admin-catalog',
  'sdkwork-clawrouter-pc-admin-file-platform',
  'sdkwork-clawrouter-pc-admin-finance',
  'sdkwork-clawrouter-pc-admin-inventory',
  'sdkwork-clawrouter-pc-admin-marketing',
  'sdkwork-clawrouter-pc-admin-memberships',
  'sdkwork-clawrouter-pc-admin-oauth',
  'sdkwork-clawrouter-pc-admin-orders',
  'sdkwork-clawrouter-pc-admin-payments',
  'sdkwork-clawrouter-pc-admin-wallet',
  'sdkwork-clawrouter-pc-console-account',
  'sdkwork-clawrouter-pc-console-checkout',
  'sdkwork-clawrouter-pc-console-memberships',
  'sdkwork-clawrouter-pc-console-messages',
  'sdkwork-clawrouter-pc-console-recharge',
  'sdkwork-clawrouter-pc-console-settlements',
  'sdkwork-clawrouter-pc-console-wallet',
  'sdkwork-clawrouter-pc-forum',
  'sdkwork-clawrouter-pc-vip'
)

foreach ($name in $toDelete) {
  $path = Join-Path $root $name
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
    Write-Host "deleted $name"
  } else {
    Write-Host "skip missing $name"
  }
}
