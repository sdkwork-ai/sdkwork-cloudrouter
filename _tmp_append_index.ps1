$p = "e:\sdkwork-space\sdkwork-utils\packages\sdkwork-utils-typescript\src\index.ts"
$line = 'export * from "./token_bank.js"'
$c = Get-Content $p -Raw
if ($c.Contains('token_bank')) {
  Write-Output "already present"
} else {
  $c = $c.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
  Set-Content -Path $p -Value $c -NoNewline -Encoding utf8
  Write-Output "appended"
}
Get-Content $p -Tail 2