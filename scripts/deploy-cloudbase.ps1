param(
  [string]$EnvFile = "deploy/cloudbase.env.local",
  [string]$EnvId = "",
  [switch]$CreateEnvironment,
  [switch]$DeployDatabaseSchema,
  [switch]$SkipHealthCheck,
  [switch]$NoLogin,
  [switch]$PlanOnly
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Message)
  Write-Host "    $Message"
}

function Read-EnvFile {
  param([string]$Path)

  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $result
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $result[$key] = $value
  }

  return $result
}

function Get-Setting {
  param(
    [hashtable]$Settings,
    [string]$Name,
    [string]$Default = ""
  )

  $envValue = [Environment]::GetEnvironmentVariable($Name)
  if ($envValue) {
    return $envValue
  }

  if ($Settings.ContainsKey($Name) -and $Settings[$Name]) {
    return $Settings[$Name]
  }

  return $Default
}

function Get-BoolSetting {
  param(
    [hashtable]$Settings,
    [string]$Name,
    [bool]$Default = $false
  )

  $raw = Get-Setting -Settings $Settings -Name $Name -Default ""
  if (-not $raw) {
    return $Default
  }

  return @("1", "true", "yes", "y", "on") -contains $raw.Trim().ToLowerInvariant()
}

function Require-Command {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found. Install it first and retry."
  }
}

function Invoke-CloudBase {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
  )

  & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs
  if ($LASTEXITCODE -ne 0) {
    throw "CloudBase CLI command failed: cloudbase $($CliArgs -join ' ')"
  }
}

function Invoke-CloudBaseCapture {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
  )

  $output = & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "CloudBase CLI command failed: cloudbase $($CliArgs -join ' ')"
  }

  return ($output -join "`n")
}

function Format-CliCommand {
  param([string[]]$CliArgs)

  return "cloudbase " + (($CliArgs | ForEach-Object {
    if ($_ -match "\s") {
      "'$_'"
    }
    else {
      $_
    }
  }) -join " ")
}

function ConvertTo-JsonFile {
  param(
    [object]$Value,
    [string]$Path
  )

  $json = $Value | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$settings = Read-EnvFile -Path (Join-Path $repoRoot $EnvFile)

if (-not $EnvId) {
  $envIdFromEnvironment = [Environment]::GetEnvironmentVariable("CLOUDBASE_ENV_ID")
  if ($envIdFromEnvironment) {
    $EnvId = $envIdFromEnvironment
  }
  elseif ($settings.ContainsKey("CLOUDBASE_ENV_ID")) {
    $EnvId = $settings["CLOUDBASE_ENV_ID"]
  }
  else {
    $EnvId = "constantine-d3gjhwmtz0336c36a"
  }
}

$region = Get-Setting -Settings $settings -Name "CLOUDBASE_REGION" -Default "ap-shanghai"
$envAlias = Get-Setting -Settings $settings -Name "CLOUDBASE_ENV_ALIAS" -Default "cinemaflow"
$package = Get-Setting -Settings $settings -Name "CLOUDBASE_PACKAGE" -Default "baas_personal"
$duration = Get-Setting -Settings $settings -Name "CLOUDBASE_DURATION" -Default "1"
$functionName = Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_NAME" -Default "cinemaflow-api"
$functionRuntime = Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_RUNTIME" -Default "Python3.10"
$functionPath = Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_PATH" -Default "/api"
$functionMemory = [int](Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_MEMORY" -Default "512")
$functionTimeout = [int](Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_TIMEOUT" -Default "15")
$corsOrigins = Get-Setting -Settings $settings -Name "CLOUDBASE_CORS_ORIGINS" -Default "*"
$apiBaseUrl = Get-Setting -Settings $settings -Name "CLOUDBASE_API_BASE_URL" -Default ""
$secretId = Get-Setting -Settings $settings -Name "TENCENT_SECRET_ID" -Default ""
$secretKey = Get-Setting -Settings $settings -Name "TENCENT_SECRET_KEY" -Default ""
$token = Get-Setting -Settings $settings -Name "TENCENT_TOKEN" -Default ""

$shouldCreateEnvironment = $CreateEnvironment.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_CREATE_ENV" -Default $false)
$shouldDeployDatabase = $DeployDatabaseSchema.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_DEPLOY_DATABASE_SCHEMA" -Default $false)
$shouldSkipHealthCheck = $SkipHealthCheck.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_SKIP_HEALTH_CHECK" -Default $false)

Push-Location $repoRoot
try {
  Write-Step "Checking local tools"
  Require-Command "node"
  Require-Command "npm"
  Require-Command "python"
  Write-Info "Node: $(node -v)"
  Write-Info "npm: $(npm -v)"
  Write-Info "Python: $(python --version)"
  Write-Info "CloudBase CLI: $(Invoke-CloudBaseCapture @('--version'))"

  if (-not $NoLogin.IsPresent) {
    Write-Step "Logging in to Tencent Cloud"
    if ($secretId -and $secretKey) {
      $loginArgs = @("login", "--apiKeyId", $secretId, "--apiKey", $secretKey)
      if ($token) {
        $loginArgs += @("--token", $token)
      }
      Invoke-CloudBase @loginArgs
      Write-Info "Logged in with SecretId/SecretKey from $EnvFile or environment variables."
    }
    else {
      Write-Info "No TENCENT_SECRET_ID/TENCENT_SECRET_KEY found. Starting CloudBase browser/device login."
      Invoke-CloudBase login
    }
  }

  if ($PlanOnly.IsPresent) {
    $plannedEnvId = if ($EnvId) { $EnvId } else { "<created-env-id>" }
    $plannedApiBaseUrl = if ($apiBaseUrl) {
      $apiBaseUrl
    }
    else {
      "https://$plannedEnvId.service.tcloudbase.com$functionPath"
    }

    Write-Step "Plan only"
    Write-Info "No cloud resources will be created or changed."
    Write-Info "Environment ID: $plannedEnvId"
    Write-Info "Region: $region"
    Write-Info "Login: $(-not $NoLogin.IsPresent)"
    Write-Info "Create environment: $shouldCreateEnvironment"
    if ($shouldCreateEnvironment -and -not $EnvId) {
      Write-Info "Environment create command: $(Format-CliCommand @('--yes', 'env', 'create', '--alias', $envAlias, '--package', $package, '--region', $region, '--duration', $duration, '--json'))"
    }
    Write-Info "Deploy function: $functionName at $functionPath"
    Write-Info "Deploy static hosting: dist/cinema-flow/browser"
    Write-Info "Deploy database schema: $shouldDeployDatabase"
    Write-Info "Health check: $(-not $shouldSkipHealthCheck)"
    Write-Info "API base URL for frontend: $plannedApiBaseUrl"
    Write-Info "Function deploy command: $(Format-CliCommand @('--yes', '--config-file', '<generated-cloudbaserc>', '-e', $plannedEnvId, 'fn', 'deploy', $functionName, '--dir', 'cinemaflow-api', '--httpFn', '--path', $functionPath, '--runtime', $functionRuntime, '--force', '--json'))"
    Write-Info "Hosting deploy command: $(Format-CliCommand @('hosting', 'deploy', 'dist/cinema-flow/browser', '-e', $plannedEnvId, '--json'))"
    return
  }

  if ($shouldCreateEnvironment -and -not $EnvId) {
    Write-Step "Creating CloudBase environment"
    $createOutput = Invoke-CloudBaseCapture @(
      "--yes",
      "env", "create",
      "--alias", $envAlias,
      "--package", $package,
      "--region", $region,
      "--duration", $duration,
      "--json"
    )
    Write-Host $createOutput
    try {
      $createJson = $createOutput | ConvertFrom-Json
      $EnvId = $createJson.envId
      if (-not $EnvId -and $createJson.data) {
        $EnvId = $createJson.data.envId
      }
    }
    catch {
      Write-Info "Could not parse env create JSON output. Please copy the created environment id into CLOUDBASE_ENV_ID."
    }
  }
  elseif ($shouldCreateEnvironment -and $EnvId) {
    Write-Info "CLOUDBASE_ENV_ID is already set to '$EnvId'; the script will use this existing environment."
  }

  if (-not $EnvId) {
    throw "CLOUDBASE_ENV_ID is empty. Fill deploy/cloudbase.env.local or run with -CreateEnvironment and no EnvId."
  }

  if (-not $apiBaseUrl) {
    $apiBaseUrl = "https://$EnvId.service.tcloudbase.com$functionPath"
  }

  Write-Step "Using CloudBase environment"
  Write-Info "Environment ID: $EnvId"
  Write-Info "Region: $region"
  Write-Info "API base URL for frontend: $apiBaseUrl"
  Invoke-CloudBase @("-e", $EnvId, "env", "use", $EnvId)

  Write-Step "Preparing Flask HTTP function package"
  & powershell -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts/prepare-cloudbase-function.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Backend function package preparation failed."
  }

  $deployDir = Join-Path $repoRoot "output/deploy"
  New-Item -ItemType Directory -Force -Path $deployDir | Out-Null
  $cloudbaseConfigPath = Join-Path $deployDir "cloudbaserc.generated.json"
  $cloudbaseConfig = [ordered]@{
    '$schema' = "https://static.cloudbase.net/cli/cloudbaserc.schema.json"
    envId = $EnvId
    region = $region
    functionRoot = "."
    functions = @(
      [ordered]@{
        name = $functionName
        runtime = $functionRuntime
        timeout = $functionTimeout
        memorySize = $functionMemory
        description = "CinemaFlow Flask REST API"
        envVariables = [ordered]@{
          PORT = "9000"
          CORS_ORIGINS = $corsOrigins
          CINEMAFLOW_DATA_FILE = "/tmp/cinemaflow-data.json"
        }
      }
    )
  }
  ConvertTo-JsonFile -Value $cloudbaseConfig -Path $cloudbaseConfigPath
  Write-Info "Generated CloudBase config: $cloudbaseConfigPath"

  Write-Step "Deploying Flask HTTP function"
  Invoke-CloudBase @(
    "--yes",
    "--config-file", $cloudbaseConfigPath,
    "-e", $EnvId,
    "fn", "deploy", $functionName,
    "--dir", "cinemaflow-api",
    "--httpFn",
    "--path", $functionPath,
    "--runtime", $functionRuntime,
    "--force",
    "--json"
  )

  if ($shouldDeployDatabase) {
    Write-Step "Deploying CloudBase MySQL schema"
    $instanceOutput = Invoke-CloudBaseCapture @("-e", $EnvId, "db", "instance", "list", "--json")
    Write-Host $instanceOutput
    if ($instanceOutput -match "\[\s*\]" -or $instanceOutput -match '"data"\s*:\s*\[\s*\]') {
      Write-Warning "No CloudBase MySQL instance was found. Enable CloudBase MySQL in the console, then rerun with -DeployDatabaseSchema."
    }
    else {
      $schemaPath = Join-Path $repoRoot "docs/database/cloudbase-mysql-schema.sql"
      $schemaSql = [System.IO.File]::ReadAllText($schemaPath)
      Invoke-CloudBase @("-e", $EnvId, "db", "execute", "--sql", $schemaSql, "--json")
      Write-Info "Database schema executed from $schemaPath"
    }
  }
  else {
    Write-Info "Database schema deployment is skipped. Set CLOUDBASE_DEPLOY_DATABASE_SCHEMA=true or pass -DeployDatabaseSchema after enabling CloudBase MySQL."
  }

  Write-Step "Building Angular frontend with runtime API URL"
  & powershell -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts/build-cloudbase-frontend.ps1") -ApiBaseUrl $apiBaseUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed."
  }

  Write-Step "Deploying frontend to CloudBase static hosting"
  Invoke-CloudBase @("hosting", "deploy", "dist/cinema-flow/browser", "-e", $EnvId, "--json")

  if (-not $shouldSkipHealthCheck) {
    Write-Step "Checking API health endpoint"
    $healthUrl = "$($apiBaseUrl.TrimEnd('/'))/health"
    $ok = $false
    for ($attempt = 1; $attempt -le 6; $attempt++) {
      try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 12
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
          Write-Info "Health check passed: $healthUrl"
          Write-Host $response.Content
          $ok = $true
          break
        }
      }
      catch {
        Write-Info "Health check attempt $attempt failed. Waiting before retry..."
        Start-Sleep -Seconds 8
      }
    }

    if (-not $ok) {
      Write-Warning "Health check did not pass yet. Check CloudBase HTTP function logs and verify the API URL: $healthUrl"
    }
  }

  Write-Step "Deployment summary"
  Write-Info "Environment ID: $EnvId"
  Write-Info "Backend API: $apiBaseUrl"
  Write-Info "Frontend files: dist/cinema-flow/browser"
  Write-Info "Static hosting default domain is usually: https://$EnvId.tcloudbaseapp.com"
  Write-Info "If Angular child routes 404 on refresh, enable SPA fallback/rewrite to /index.html in CloudBase static hosting."
}
finally {
  Pop-Location
}
