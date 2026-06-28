param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $repoRoot "dist/cinema-flow/browser"
$runtimeConfig = Join-Path $distDir "assets/runtime-config.js"

Push-Location $repoRoot
try {
  npm install
  npm run build
}
finally {
  Pop-Location
}

@"
window.__CINEMAFLOW_CONFIG__ = {
  apiBaseUrl: '$ApiBaseUrl'
};
"@ | Set-Content -LiteralPath $runtimeConfig -Encoding UTF8

Write-Host "Frontend build is ready:"
Write-Host $distDir
Write-Host "Runtime API base URL:"
Write-Host $ApiBaseUrl
