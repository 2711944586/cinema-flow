param(
  [string]$Python = "python",
  [string]$OutputDir = "output/deploy",
  [string]$TargetPythonVersion = "3.10",
  [string]$TargetAbi = "cp310",
  [string]$TargetPlatform = "manylinux2014_x86_64"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot "cinemaflow-api"
$thirdParty = Join-Path $apiDir "third_party"
$deployDir = Join-Path $repoRoot $OutputDir
$zipPath = Join-Path $deployDir "cinemaflow-api-cloudbase.zip"

New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

if (Test-Path $thirdParty) {
  Remove-Item -LiteralPath $thirdParty -Recurse -Force
}

& $Python -m pip install `
  --platform $TargetPlatform `
  --implementation cp `
  --python-version $TargetPythonVersion `
  --abi $TargetAbi `
  --only-binary=:all: `
  -r (Join-Path $apiDir "requirements.txt") `
  -t $thirdParty

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$items = @(
  "app.py",
  "models.py",
  "requirements.txt",
  "scf_bootstrap",
  "cinemaflow-data.json",
  "routes",
  "third_party"
)

$bootstrapPath = Join-Path $apiDir "scf_bootstrap"
$bootstrapContent = [System.IO.File]::ReadAllText($bootstrapPath)
$bootstrapContent = $bootstrapContent -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($bootstrapPath, $bootstrapContent, [System.Text.UTF8Encoding]::new($false))

Push-Location $apiDir
try {
  Compress-Archive -Path $items -DestinationPath $zipPath -Force
}
finally {
  Pop-Location
}

Write-Host "CloudBase function package created:"
Write-Host $zipPath
