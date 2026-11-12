param(
  [ValidateSet('project', 'report')][string] $Suite = 'project',
  [switch] $VerifyResolutionSql
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Read-DotEnvFile([string] $path) {
  $settings = @{}
  foreach ($line in Get-Content -LiteralPath $path) {
    if ($line -match '^\s*(#|$)') { continue }
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      throw "Invalid environment setting in $path. Use KEY=value lines."
    }
    $name = $matches[1]
    $value = $matches[2].Trim()
    if ($value.Length -ge 2 -and
      (($value.StartsWith('"') -and $value.EndsWith('"')) -or
       ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($settings.ContainsKey($name)) { throw "Duplicate setting $name in $path." }
    $settings[$name] = $value
  }
  return $settings
}

function Require-Setting($settings, [string] $name) {
  $value = $settings[$name]
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Add $name to .env.project-test.local before running the isolated database tests."
  }
  return $value
}

function Set-ProcessVariable([string] $name, [string] $value) {
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

function Read-Secret([string] $prompt) {
  $secure = Read-Host $prompt -AsSecureString
  return [System.Net.NetworkCredential]::new('', $secure).Password
}

function Invoke-ResolutionSqlVerification($settings, [Uri] $isolatedUrl) {
  # A server connection is needed for transactional failure injection; PostgREST
  # deliberately provides no arbitrary-SQL endpoint. Never apply migrations here.
  if ($isolatedUrl.Host -notmatch '^([a-z0-9]+)\.supabase\.co$') {
    throw 'SQL verification requires the isolated project URL in https://<project-ref>.supabase.co form.'
  }
  $isolatedRef = $matches[1]
  $databaseHost = Require-Setting $settings 'PROJECT_TEST_DATABASE_HOST'
  $databaseUser = Require-Setting $settings 'PROJECT_TEST_DATABASE_USER'
  $directConnection = $databaseHost -ieq "db.$isolatedRef.supabase.co" -and $databaseUser -ceq 'postgres'
  $poolerConnection = $databaseHost -match '^[a-zA-Z0-9.-]+\.pooler\.supabase\.com$' -and $databaseUser -ceq "postgres.$isolatedRef"
  if (-not ($directConnection -or $poolerConnection)) {
    throw 'SQL connection must identify the same isolated project: its direct database host with user postgres, or a Supabase pooler with user postgres.<test-project-ref>.'
  }
  $databasePort = 5432
  if ($settings.ContainsKey('PROJECT_TEST_DATABASE_PORT') -and
      (-not [int]::TryParse($settings['PROJECT_TEST_DATABASE_PORT'], [ref] $databasePort) -or $databasePort -lt 1 -or $databasePort -gt 65535)) {
    throw 'PROJECT_TEST_DATABASE_PORT must be between 1 and 65535.'
  }
  $psqlCommand = Get-Command psql -CommandType Application -ErrorAction SilentlyContinue
  if (-not $psqlCommand) { throw 'Install PostgreSQL psql and add it to PATH before using -VerifyResolutionSql.' }

  $sqlVariables = @('PGHOST', 'PGHOSTADDR', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD', 'PGSSLMODE', 'PGCONNECT_TIMEOUT', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS')
  $previousSqlValues = @{}
  foreach ($name in $sqlVariables) { $previousSqlValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
  try {
    foreach ($name in $sqlVariables) { Set-ProcessVariable $name $null }
    Set-ProcessVariable 'PGHOST' $databaseHost
    Set-ProcessVariable 'PGPORT' ([string] $databasePort)
    Set-ProcessVariable 'PGUSER' $databaseUser
    Set-ProcessVariable 'PGDATABASE' 'postgres'
    Set-ProcessVariable 'PGSSLMODE' 'require'
    Set-ProcessVariable 'PGCONNECT_TIMEOUT' '15'
    $databasePassword = Read-Secret 'Isolated test-project database password (not the service-role key)'
    if ([string]::IsNullOrWhiteSpace($databasePassword)) { throw 'An isolated database password is required for SQL verification.' }
    Set-ProcessVariable 'PGPASSWORD' $databasePassword
    $databasePassword = $null
    Write-Host 'Checking resolution/link transaction rollback in the isolated project (migration 012 must already be applied)...'
    & $psqlCommand.Source -X --no-password --set ON_ERROR_STOP=1 --file (Join-Path $PSScriptRoot 'src/features/reports/database/verify_report_resolutions.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Resolution SQL verification failed. Check that migrations 001-012 and test profiles are present in the isolated project.' }
  }
  finally {
    $databasePassword = $null
    foreach ($name in $sqlVariables) { Set-ProcessVariable $name $previousSqlValues[$name] }
  }
}

if ($VerifyResolutionSql -and $Suite -ne 'report') { throw '-VerifyResolutionSql requires -Suite report.' }

$settingsPath = Join-Path $PSScriptRoot '.env.project-test.local'
if (-not (Test-Path -LiteralPath $settingsPath)) {
  throw 'Create the ignored .env.project-test.local file for the isolated Supabase project first.'
}
$settings = Read-DotEnvFile $settingsPath
if ($settings['PROJECT_TEST_ISOLATED'] -ne 'true') {
  throw 'Set PROJECT_TEST_ISOLATED=true in .env.project-test.local to opt in to hosted database tests.'
}

$testUrl = Require-Setting $settings 'VITE_SUPABASE_URL'
$publishableKey = Require-Setting $settings 'VITE_SUPABASE_PUBLISHABLE_KEY'
$parsedUrl = $null
if (-not [Uri]::TryCreate($testUrl, [UriKind]::Absolute, [ref] $parsedUrl) -or
    $parsedUrl.Scheme -ne 'https') {
  throw 'VITE_SUPABASE_URL must be an HTTPS URL for the isolated Supabase project.'
}
$normalSettingsPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $normalSettingsPath)) { throw 'Root .env must identify the production project so the runner can reject it.' }
if (Test-Path -LiteralPath $normalSettingsPath) {
  $normalSettings = Read-DotEnvFile $normalSettingsPath
  $productionUrl = $null
  if (-not [Uri]::TryCreate((Require-Setting $normalSettings 'VITE_SUPABASE_URL'), [UriKind]::Absolute, [ref] $productionUrl) -or
      $productionUrl.Scheme -ne 'https') { throw 'Root .env must contain the HTTPS production project URL.' }
  if ($parsedUrl.GetLeftPart([UriPartial]::Authority) -ieq $productionUrl.GetLeftPart([UriPartial]::Authority)) {
    throw 'The test URL matches .env. Use a separate isolated project in .env.project-test.local.'
  }
}

$secondDeveloperEmail = $settings['PROJECT_TEST_SECOND_DEVELOPER_EMAIL']
if ([string]::IsNullOrWhiteSpace($secondDeveloperEmail)) { $secondDeveloperEmail = Read-Host 'Second developer email' }
$testerEmail = $settings['PROJECT_TEST_TESTER_EMAIL']
if ([string]::IsNullOrWhiteSpace($testerEmail)) { $testerEmail = Read-Host 'Tester email' }
$developerEmail = $settings['PROJECT_TEST_DEVELOPER_EMAIL']
if ([string]::IsNullOrWhiteSpace($developerEmail)) { $developerEmail = Read-Host 'Developer email' }
if ([string]::IsNullOrWhiteSpace($testerEmail) -or [string]::IsNullOrWhiteSpace($developerEmail) -or [string]::IsNullOrWhiteSpace($secondDeveloperEmail)) {
  throw 'Tester and both developer email addresses are required.'
}

$variableNames = @(
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PUBLISHABLE_KEY',
  'PROJECT_TEST_SERVICE_ROLE_KEY', 'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN',
  'PROJECT_TEST_PRODUCTION_URL', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN', 'PROJECT_LOGIN_EMAIL', 'PROJECT_LOGIN_PASSWORD'
)
$previousValues = @{}
foreach ($name in $variableNames) {
  $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

$signInCode = @'
import { createClient } from '@supabase/supabase-js'
const client = createClient(process.env.PROJECT_TEST_URL, process.env.PROJECT_TEST_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const { data, error } = await client.auth.signInWithPassword({
  email: process.env.PROJECT_LOGIN_EMAIL,
  password: process.env.PROJECT_LOGIN_PASSWORD,
})
if (error || !data.session) {
  console.error(error?.message ?? 'Sign-in returned no session.')
  process.exit(1)
}
process.stdout.write(data.session.access_token)
'@

function Get-AccessToken([string] $label, [string] $email) {
  Set-ProcessVariable 'PROJECT_LOGIN_EMAIL' $email
  Set-ProcessVariable 'PROJECT_LOGIN_PASSWORD' (Read-Secret "$label password")
  try {
    $token = & node --input-type=module -e $signInCode
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
      throw "$label sign-in failed. Check its credentials and confirmed email."
    }
    return $token
  }
  finally {
    Set-ProcessVariable 'PROJECT_LOGIN_EMAIL' $null
    Set-ProcessVariable 'PROJECT_LOGIN_PASSWORD' $null
  }
}

$exitCode = 1
try {
  if ($VerifyResolutionSql) { Invoke-ResolutionSqlVerification $settings $parsedUrl }
  Set-ProcessVariable 'PROJECT_TEST_ISOLATED' 'true'
  Set-ProcessVariable 'PROJECT_TEST_URL' $testUrl
  Set-ProcessVariable 'PROJECT_TEST_PUBLISHABLE_KEY' $publishableKey
  Set-ProcessVariable 'PROJECT_TEST_PRODUCTION_URL' (Require-Setting $normalSettings 'VITE_SUPABASE_URL')
  if ([string]::IsNullOrWhiteSpace($previousValues['PROJECT_TEST_SERVICE_ROLE_KEY'])) {
    Set-ProcessVariable 'PROJECT_TEST_SERVICE_ROLE_KEY' (Read-Secret 'Test-project secret/service-role key')
  }
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('PROJECT_TEST_SERVICE_ROLE_KEY', 'Process'))) {
    throw 'A test-project secret/service-role key is required.'
  }

  Set-ProcessVariable 'PROJECT_TEST_TESTER_TOKEN' (Get-AccessToken 'Tester' $testerEmail)
  Set-ProcessVariable 'PROJECT_TEST_DEVELOPER_TOKEN' (Get-AccessToken 'Developer' $developerEmail)
  Set-ProcessVariable 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN' (Get-AccessToken 'Second developer' $secondDeveloperEmail)

  Write-Host "Running isolated Supabase $Suite integration tests..."
  $suiteFiles = if ($Suite -eq 'report') {
    @('src/test/report-database.test.ts', 'src/test/report-workflow-database.test.ts', 'src/test/report-discussion-database.test.ts', 'src/test/report-resolution-database.test.ts', 'src/test/report-edit-database.test.ts', 'src/test/mailbox-database.test.ts')
  } else {
    @('src/test/project-database.test.ts')
  }
  & (Join-Path $PSScriptRoot 'node_modules/.bin/vitest.cmd') --run @suiteFiles
  $exitCode = $LASTEXITCODE
}
finally {
  foreach ($name in $variableNames) {
    Set-ProcessVariable $name $previousValues[$name]
  }
}
exit $exitCode
