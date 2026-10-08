$ErrorActionPreference = 'Stop'

$webRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$workspaceRoot = Resolve-Path (Join-Path $webRoot '..\..')
Set-Location $workspaceRoot

$publicOrigin = $env:SOULMAIS_PUBLIC_ORIGIN
if ([string]::IsNullOrWhiteSpace($publicOrigin)) { $publicOrigin = 'http://localhost:3002' }
$publicOrigin = $publicOrigin.TrimEnd('/')

$authContainer = $null
try { $authContainer = (docker inspect supabase_auth_soulmais 2>$null | ConvertFrom-Json)[0] } catch { }
$appPassword = if ($authContainer) {
  (($authContainer.Config.Env | Where-Object { $_ -like 'GOTRUE_SMTP_PASS=*' } | Select-Object -First 1) -replace '^GOTRUE_SMTP_PASS=', '')
} else { '' }

$securePassword = $null
if ($appPassword.Length -ne 16) {
  $securePassword = Read-Host 'Senha de app Gmail (entrada oculta)' -AsSecureString
  $appPassword = ([System.Net.NetworkCredential]::new('', $securePassword).Password -replace '\s', '')
  if ($appPassword.Length -ne 16) {
    $securePassword.Dispose()
    throw 'A senha de app do Gmail deve ter 16 caracteres.'
  }
}

$env:SOULMAIS_GMAIL_APP_PASSWORD = $appPassword
$env:SOULMAIS_SMTP_USER = 'soulmaisespacoalpha@gmail.com'
$env:NEXT_PUBLIC_SITE_URL = $publicOrigin
$env:NEXT_PUBLIC_SUPABASE_URL = $publicOrigin
$env:SUPABASE_URL_INTERNAL = 'http://host.docker.internal:54321'
$env:SOULMAIS_EMAIL_DELIVERY_MODE = 'direct'
$env:NODE_USE_SYSTEM_CA = '1'
$env:SOULMAIS_WEB_DIR = $webRoot

try {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $startOutput = supabase start 2>&1
  $startExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($startExitCode -ne 0) {
    $startOutput | ForEach-Object { $_.ToString() -replace 'sb_(secret|publishable)_[A-Za-z0-9_-]+', '<redacted>' }
    throw 'Supabase CLI não conseguiu iniciar a stack.'
  }
  Write-Output 'Supabase CLI iniciado.'

  supabase migration up --local
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar migrations locais.' }

  $statusOutput = supabase status --output json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao obter credenciais locais da Supabase CLI.' }
  $status = ($statusOutput -join "`n") | ConvertFrom-Json
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $status.PUBLISHABLE_KEY
  $env:SUPABASE_SECRET_KEY = $status.SECRET_KEY

  Set-Location $webRoot
  docker compose -f compose.yaml up --build --detach --wait
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar a app em Docker.' }
  Write-Output "Soul+ disponível em $publicOrigin"
} finally {
  Remove-Item Env:SOULMAIS_GMAIL_APP_PASSWORD,Env:SOULMAIS_SMTP_USER,Env:NEXT_PUBLIC_SITE_URL,Env:NEXT_PUBLIC_SUPABASE_URL,Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,Env:SUPABASE_SECRET_KEY,Env:SUPABASE_URL_INTERNAL,Env:SOULMAIS_EMAIL_DELIVERY_MODE,Env:NODE_USE_SYSTEM_CA,Env:SOULMAIS_WEB_DIR -ErrorAction SilentlyContinue
  if ($securePassword) { $securePassword.Dispose() }
}