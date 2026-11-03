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
    throw "Add $name to .env.auth-test.local before running the isolated database tests."
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

$settingsPath = Join-Path $PSScriptRoot '.env.auth-test.local'
if (-not (Test-Path -LiteralPath $settingsPath)) {
  throw 'Create the ignored .env.auth-test.local file for the isolated Supabase project first.'
}
$settings = Read-DotEnvFile $settingsPath
if ($settings['AUTH_TEST_ISOLATED'] -ne 'true') {
  throw 'Set AUTH_TEST_ISOLATED=true in .env.auth-test.local to opt in to hosted database tests.'
}

$testUrl = Require-Setting $settings 'VITE_SUPABASE_URL'
$publishableKey = Require-Setting $settings 'VITE_SUPABASE_PUBLISHABLE_KEY'
$unassignedId = Require-Setting $settings 'AUTH_TEST_UNASSIGNED_USER_ID'
$parsedUrl = $null
if (-not [Uri]::TryCreate($testUrl, [UriKind]::Absolute, [ref] $parsedUrl) -or
    $parsedUrl.Scheme -ne 'https') {
  throw 'VITE_SUPABASE_URL must be an HTTPS URL for the isolated Supabase project.'
}
$parsedId = [Guid]::Empty
if (-not [Guid]::TryParse($unassignedId, [ref] $parsedId)) {
  throw 'AUTH_TEST_UNASSIGNED_USER_ID must be the UUID of an Auth user without a profile.'
}

$normalSettingsPath = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $normalSettingsPath) {
  $normalSettings = Read-DotEnvFile $normalSettingsPath
  if ($normalSettings['VITE_SUPABASE_URL'] -and
      $testUrl.TrimEnd('/') -ieq $normalSettings['VITE_SUPABASE_URL'].TrimEnd('/')) {
    throw 'The test URL matches .env. Use a separate isolated project in .env.auth-test.local.'
  }
}

$testerEmail = $settings['AUTH_TEST_TESTER_EMAIL']
if ([string]::IsNullOrWhiteSpace($testerEmail)) { $testerEmail = Read-Host 'Tester email' }
$developerEmail = $settings['AUTH_TEST_DEVELOPER_EMAIL']
if ([string]::IsNullOrWhiteSpace($developerEmail)) { $developerEmail = Read-Host 'Developer email' }
if ([string]::IsNullOrWhiteSpace($testerEmail) -or [string]::IsNullOrWhiteSpace($developerEmail)) {
  throw 'Tester and developer email addresses are required.'
}

$variableNames = @(
  'AUTH_TEST_ISOLATED', 'AUTH_TEST_URL', 'AUTH_TEST_PUBLISHABLE_KEY',
  'AUTH_TEST_SERVICE_ROLE_KEY', 'AUTH_TEST_TESTER_TOKEN', 'AUTH_TEST_DEVELOPER_TOKEN',
  'AUTH_TEST_UNASSIGNED_USER_ID', 'AUTH_LOGIN_EMAIL', 'AUTH_LOGIN_PASSWORD'
)
$previousValues = @{}
foreach ($name in $variableNames) {
  $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

$signInCode = @'
import { createClient } from '@supabase/supabase-js'
const client = createClient(process.env.AUTH_TEST_URL, process.env.AUTH_TEST_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const { data, error } = await client.auth.signInWithPassword({
  email: process.env.AUTH_LOGIN_EMAIL,
  password: process.env.AUTH_LOGIN_PASSWORD,
})
if (error || !data.session) {
  console.error(error?.message ?? 'Sign-in returned no session.')
  process.exit(1)
}
process.stdout.write(data.session.access_token)
'@

function Get-AccessToken([string] $label, [string] $email) {
  Set-ProcessVariable 'AUTH_LOGIN_EMAIL' $email
  Set-ProcessVariable 'AUTH_LOGIN_PASSWORD' (Read-Secret "$label password")
  try {
    $token = & node --input-type=module -e $signInCode
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
      throw "$label sign-in failed. Check its credentials and confirmed email."
    }
    return $token
  }
  finally {
    Set-ProcessVariable 'AUTH_LOGIN_EMAIL' $null
    Set-ProcessVariable 'AUTH_LOGIN_PASSWORD' $null
  }
}

$exitCode = 1
try {
  Set-ProcessVariable 'AUTH_TEST_ISOLATED' 'true'
  Set-ProcessVariable 'AUTH_TEST_URL' $testUrl
  Set-ProcessVariable 'AUTH_TEST_PUBLISHABLE_KEY' $publishableKey
  Set-ProcessVariable 'AUTH_TEST_UNASSIGNED_USER_ID' $unassignedId
  if ([string]::IsNullOrWhiteSpace($previousValues['AUTH_TEST_SERVICE_ROLE_KEY'])) {
    Set-ProcessVariable 'AUTH_TEST_SERVICE_ROLE_KEY' (Read-Secret 'Test-project secret/service-role key')
  }
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('AUTH_TEST_SERVICE_ROLE_KEY', 'Process'))) {
    throw 'A test-project secret/service-role key is required.'
  }

  Set-ProcessVariable 'AUTH_TEST_TESTER_TOKEN' (Get-AccessToken 'Tester' $testerEmail)
  Set-ProcessVariable 'AUTH_TEST_DEVELOPER_TOKEN' (Get-AccessToken 'Developer' $developerEmail)

  Write-Host 'Running isolated Supabase profile integration tests...'
  & (Join-Path $PSScriptRoot 'node_modules/.bin/vitest.cmd') --run src/test/auth-database.test.ts
  $exitCode = $LASTEXITCODE
}
finally {
  foreach ($name in $variableNames) {
    Set-ProcessVariable $name $previousValues[$name]
  }
}
exit $exitCode
