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

$prunableDirectories = Get-ChildItem -LiteralPath $thirdParty -Recurse -Force -Directory |
  Where-Object {
    $_.Name -eq "__pycache__" -or
    $_.Name -eq "tests" -or
    $_.Name -eq "test"
  } |
  Sort-Object FullName -Descending |
  Select-Object -ExpandProperty FullName

foreach ($directory in $prunableDirectories) {
  if (Test-Path -LiteralPath $directory) {
    Remove-Item -LiteralPath $directory -Recurse -Force
  }
}

$prunableFiles = Get-ChildItem -LiteralPath $thirdParty -Recurse -Force -File |
  Where-Object { $_.Extension -eq ".pyc" -or $_.Extension -eq ".pyo" } |
  Select-Object -ExpandProperty FullName

foreach ($file in $prunableFiles) {
  if (Test-Path -LiteralPath $file) {
    Remove-Item -LiteralPath $file -Force
  }
}

$binDir = Join-Path $thirdParty "bin"
if (Test-Path -LiteralPath $binDir) {
  Remove-Item -LiteralPath $binDir -Recurse -Force
}

$apiCaches = Get-ChildItem -LiteralPath $apiDir -Recurse -Force -Directory |
  Where-Object { $_.Name -eq "__pycache__" } |
  Sort-Object FullName -Descending |
  Select-Object -ExpandProperty FullName

foreach ($directory in $apiCaches) {
  if (Test-Path -LiteralPath $directory) {
    Remove-Item -LiteralPath $directory -Recurse -Force
  }
}

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
