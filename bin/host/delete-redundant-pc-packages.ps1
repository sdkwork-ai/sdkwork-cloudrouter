$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\apps\sdkwork-cloudrouter-pc\packages')).Path
$toDelete = @(
  'sdkwork-cloudrouter-pc-admin-announcement',
  'sdkwork-cloudrouter-pc-admin-catalog',
  'sdkwork-cloudrouter-pc-admin-file-platform',
  'sdkwork-cloudrouter-pc-admin-finance',
  'sdkwork-cloudrouter-pc-admin-inventory',
  'sdkwork-cloudrouter-pc-admin-marketing',
  'sdkwork-cloudrouter-pc-admin-memberships',
  'sdkwork-cloudrouter-pc-admin-oauth',
  'sdkwork-cloudrouter-pc-admin-orders',
  'sdkwork-cloudrouter-pc-admin-payments',
  'sdkwork-cloudrouter-pc-admin-wallet',
  'sdkwork-cloudrouter-pc-console-account',
  'sdkwork-cloudrouter-pc-console-checkout',
  'sdkwork-cloudrouter-pc-console-memberships',
  'sdkwork-cloudrouter-pc-console-messages',
  'sdkwork-cloudrouter-pc-console-recharge',
  'sdkwork-cloudrouter-pc-console-settlements',
  'sdkwork-cloudrouter-pc-console-wallet',
  'sdkwork-cloudrouter-pc-forum',
  'sdkwork-cloudrouter-pc-vip'
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
