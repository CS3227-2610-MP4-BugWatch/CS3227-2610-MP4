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

  Write-Host 'Running isolated Supabase project integration tests...'
  & (Join-Path $PSScriptRoot 'node_modules/.bin/vitest.cmd') --run src/test/project-database.test.ts
  $exitCode = $LASTEXITCODE
}
finally {
  foreach ($name in $variableNames) {
    Set-ProcessVariable $name $previousValues[$name]
  }
}
exit $exitCode
