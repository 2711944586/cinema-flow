param(
  [string]$EnvFile = "deploy/cloudbase.env.local",
  [string]$EnvId = "",
  [switch]$CreateEnvironment,
  [switch]$DeployDatabaseSchema,
  [switch]$SkipFunctionDeploy,
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

  $npxCommand = Get-Command npx -ErrorAction Stop
  if ($npxCommand.Source -and (Test-Path -LiteralPath $npxCommand.Source)) {
    & $npxCommand.Source --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs
  }
  else {
    & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs
  }
  if ($LASTEXITCODE -ne 0) {
    throw "CloudBase CLI command failed: cloudbase $($CliArgs -join ' ')"
  }
}

function Invoke-CloudBaseCapture {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
  )

  $npxCommand = Get-Command npx -ErrorAction Stop
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    if ($npxCommand.Source -and (Test-Path -LiteralPath $npxCommand.Source)) {
      $output = & $npxCommand.Source --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs 2>&1
    }
    else {
      $output = & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase @CliArgs 2>&1
    }
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "CloudBase CLI command failed: cloudbase $($CliArgs -join ' ')"
  }

  return ($output -join "`n")
}

function Invoke-CloudBaseRouteCommand {
  param(
    [string]$EnvId,
    [string]$Command,
    [string]$RoutePayload
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $previousRouteEnvId = [Environment]::GetEnvironmentVariable("CLOUDBASE_ROUTE_ENV_ID", "Process")
  $previousRouteCommand = [Environment]::GetEnvironmentVariable("CLOUDBASE_ROUTE_COMMAND", "Process")
  $previousRoutePayload = [Environment]::GetEnvironmentVariable("CLOUDBASE_ROUTE_PAYLOAD", "Process")
  $ErrorActionPreference = "Continue"
  try {
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_ENV_ID", $EnvId, "Process")
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_COMMAND", $Command, "Process")
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_PAYLOAD", $RoutePayload, "Process")

    $pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($PSVersionTable.PSVersion.Major -lt 6 -and $pwshCommand) {
      $routeScript = @'
$npxCommand = Get-Command npx -ErrorAction Stop
if ($npxCommand.Source -and (Test-Path -LiteralPath $npxCommand.Source)) {
  & $npxCommand.Source --yes --package "@cloudbase/cli@3.5.8" cloudbase --yes -e $env:CLOUDBASE_ROUTE_ENV_ID routes $env:CLOUDBASE_ROUTE_COMMAND --data $env:CLOUDBASE_ROUTE_PAYLOAD --json
}
else {
  & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase --yes -e $env:CLOUDBASE_ROUTE_ENV_ID routes $env:CLOUDBASE_ROUTE_COMMAND --data $env:CLOUDBASE_ROUTE_PAYLOAD --json
}
exit $LASTEXITCODE
'@
      $encodedRouteScript = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($routeScript))
      $output = & $pwshCommand.Source -NoProfile -EncodedCommand $encodedRouteScript 2>&1
    }
    else {
      $npxCommand = Get-Command npx -ErrorAction Stop
      if ($npxCommand.Source -and (Test-Path -LiteralPath $npxCommand.Source)) {
        $output = & $npxCommand.Source --yes --package "@cloudbase/cli@3.5.8" cloudbase --yes -e $EnvId routes $Command --data $RoutePayload --json 2>&1
      }
      else {
        $output = & npx --yes --package "@cloudbase/cli@3.5.8" cloudbase --yes -e $EnvId routes $Command --data $RoutePayload --json 2>&1
      }
    }
    $exitCode = $LASTEXITCODE
  }
  finally {
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_ENV_ID", $previousRouteEnvId, "Process")
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_COMMAND", $previousRouteCommand, "Process")
    [Environment]::SetEnvironmentVariable("CLOUDBASE_ROUTE_PAYLOAD", $previousRoutePayload, "Process")
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "CloudBase CLI route command failed: routes $Command --data <route-payload>"
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

function New-CloudBaseHttpRoutePayload {
  param(
    [string]$Path,
    [string]$FunctionName
  )

  return ([ordered]@{
    domain = "*"
    routes = @(
      [ordered]@{
        path = $Path
        upstreamResourceType = "WEB_SCF"
        upstreamResourceName = $FunctionName
        enable = $true
        enableAuth = $false
        enablePathTransmission = $true
      }
    )
  } | ConvertTo-Json -Depth 10 -Compress)
}

function Ensure-CloudBaseHttpRoute {
  param(
    [string]$EnvId,
    [string]$Path,
    [string]$FunctionName
  )

  $routePayload = New-CloudBaseHttpRoutePayload -Path $Path -FunctionName $FunctionName
  try {
    Invoke-CloudBaseRouteCommand -EnvId $EnvId -Command "edit" -RoutePayload $routePayload | Write-Host
    Write-Info "HTTP route updated: $Path -> WEB_SCF/$FunctionName"
  }
  catch {
    Write-Info "HTTP route $Path was not editable yet; creating it now."
    Invoke-CloudBaseRouteCommand -EnvId $EnvId -Command "add" -RoutePayload $routePayload | Write-Host
    Write-Info "HTTP route created: $Path -> WEB_SCF/$FunctionName"
  }
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
$functionDeployMode = Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_DEPLOY_MODE" -Default "zip"
$functionMemory = [int](Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_MEMORY" -Default "512")
$functionTimeout = [int](Get-Setting -Settings $settings -Name "CLOUDBASE_FUNCTION_TIMEOUT" -Default "15")
$corsOrigins = Get-Setting -Settings $settings -Name "CLOUDBASE_CORS_ORIGINS" -Default "*"
$apiBaseUrl = Get-Setting -Settings $settings -Name "CLOUDBASE_API_BASE_URL" -Default ""
$secretId = Get-Setting -Settings $settings -Name "TENCENT_SECRET_ID" -Default ""
$secretKey = Get-Setting -Settings $settings -Name "TENCENT_SECRET_KEY" -Default ""
$token = Get-Setting -Settings $settings -Name "TENCENT_TOKEN" -Default ""

$shouldCreateEnvironment = $CreateEnvironment.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_CREATE_ENV" -Default $false)
$shouldDeployDatabase = $DeployDatabaseSchema.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_DEPLOY_DATABASE_SCHEMA" -Default $false)
$shouldSkipFunctionDeploy = $SkipFunctionDeploy.IsPresent -or (Get-BoolSetting -Settings $settings -Name "CLOUDBASE_SKIP_FUNCTION_DEPLOY" -Default $false)
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
  Write-Info "CloudBase CLI: $(Invoke-CloudBaseCapture -CliArgs @('--version'))"

  if (-not $NoLogin.IsPresent) {
    Write-Step "Logging in to Tencent Cloud"
    if ($secretId -and $secretKey) {
      $loginArgs = @("login", "--apiKeyId", $secretId, "--apiKey", $secretKey)
      if ($token) {
        $loginArgs += @("--token", $token)
      }
      Invoke-CloudBase -CliArgs $loginArgs
      Write-Info "Logged in with SecretId/SecretKey from $EnvFile or environment variables."
    }
    else {
      Write-Info "No TENCENT_SECRET_ID/TENCENT_SECRET_KEY found. Starting CloudBase browser/device login."
      Invoke-CloudBase -CliArgs @("login")
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
    Write-Info "Skip function deploy: $shouldSkipFunctionDeploy"
    if (-not $shouldSkipFunctionDeploy) {
      $plannedFunctionDeployArgs = @('--yes', '--config-file', '<generated-cloudbaserc>', '-e', $plannedEnvId, 'fn', 'deploy', $functionName, '--dir', 'cinemaflow-api', '--httpFn', '--runtime', $functionRuntime, '--force', '--json')
      if ($functionDeployMode) {
        $plannedFunctionDeployArgs += @('--deployMode', $functionDeployMode)
      }
      Write-Info "Function deploy command: $(Format-CliCommand $plannedFunctionDeployArgs)"
    }
    Write-Info "Route ensure command: $(Format-CliCommand @('--yes', '-e', $plannedEnvId, 'routes', 'edit/add', '--data', (New-CloudBaseHttpRoutePayload -Path $functionPath -FunctionName $functionName), '--json'))"
    Write-Info "Hosting deploy command: $(Format-CliCommand @('hosting', 'deploy', 'dist/cinema-flow/browser', '-e', $plannedEnvId, '--json'))"
    return
  }

  if ($shouldCreateEnvironment -and -not $EnvId) {
    Write-Step "Creating CloudBase environment"
    $createOutput = Invoke-CloudBaseCapture -CliArgs @(
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
  Invoke-CloudBase -CliArgs @("-e", $EnvId, "env", "use", $EnvId)

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

  if (-not $shouldSkipFunctionDeploy) {
    Write-Step "Preparing Flask HTTP function package"
    & powershell -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts/prepare-cloudbase-function.ps1")
    if ($LASTEXITCODE -ne 0) {
      throw "Backend function package preparation failed."
    }

    Write-Step "Deploying Flask HTTP function"
    $functionDeployArgs = @(
      "--yes",
      "--config-file", $cloudbaseConfigPath,
      "-e", $EnvId,
      "fn", "deploy", $functionName,
      "--dir", "cinemaflow-api",
      "--httpFn",
      "--runtime", $functionRuntime,
      "--force",
      "--json"
    )
    if ($functionDeployMode) {
      $functionDeployArgs += @("--deployMode", $functionDeployMode)
    }
    Invoke-CloudBase -CliArgs $functionDeployArgs
  }
  else {
    Write-Info "Function deployment is skipped. Existing CloudBase function will be reused."
  }

  Write-Step "Ensuring HTTP route targets the HTTP function"
  Ensure-CloudBaseHttpRoute -EnvId $EnvId -Path $functionPath -FunctionName $functionName

  if ($shouldDeployDatabase) {
    Write-Step "Deploying CloudBase MySQL schema"
    $instanceOutput = Invoke-CloudBaseCapture -CliArgs @("-e", $EnvId, "db", "instance", "list", "--json")
    Write-Host $instanceOutput
    if ($instanceOutput -match "\[\s*\]" -or $instanceOutput -match '"data"\s*:\s*\[\s*\]') {
      Write-Warning "No CloudBase MySQL instance was found. Enable CloudBase MySQL in the console, then rerun with -DeployDatabaseSchema."
    }
    else {
      $schemaPath = Join-Path $repoRoot "docs/database/cloudbase-mysql-schema.sql"
      $schemaSql = [System.IO.File]::ReadAllText($schemaPath)
      Invoke-CloudBase -CliArgs @("-e", $EnvId, "db", "execute", "--sql", $schemaSql, "--json")
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
  Invoke-CloudBase -CliArgs @("hosting", "deploy", "dist/cinema-flow/browser", "-e", $EnvId, "--json")

  $hostingDomain = ""
  try {
    $hostingDetail = Invoke-CloudBaseCapture -CliArgs @("hosting", "detail", "-e", $EnvId, "--json")
    $hostingJson = $hostingDetail | ConvertFrom-Json
    if ($hostingJson.data -and $hostingJson.data.cdnDomain) {
      $hostingDomain = $hostingJson.data.cdnDomain
    }
  }
  catch {
    Write-Info "Could not read static hosting detail. Check the CloudBase console for the default domain."
  }

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
  if ($hostingDomain) {
    Write-Info "Static hosting URL: https://$hostingDomain"
  }
  else {
    Write-Info "Static hosting default domain is available in CloudBase static hosting console."
  }
  Write-Info "If Angular child routes 404 on refresh, enable SPA fallback/rewrite to /index.html in CloudBase static hosting."
}
finally {
  Pop-Location
}
