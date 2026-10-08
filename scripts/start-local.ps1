$ErrorActionPreference = 'Stop'

$webRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $webRoot

$authContainer = (docker inspect supabase_auth_soulmais | ConvertFrom-Json)[0]
if (-not $authContainer) { throw 'O container Auth do Supabase não está ativo.' }
$appPassword = ($authContainer.Config.Env | Where-Object { $_ -like 'GOTRUE_SMTP_PASS=*' } | Select-Object -First 1) -replace '^GOTRUE_SMTP_PASS=', ''
if ($appPassword.Length -ne 16) { throw 'A senha de app SMTP não está configurada no Auth.' }
$env:SOULMAIS_GMAIL_APP_PASSWORD = $appPassword

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$statusLines = supabase status --output env 2>&1
$statusExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($statusExitCode -ne 0) { throw 'Inicie o Supabase local antes do Soul+.' }
$secretLine = $statusLines | Where-Object { $_ -match '^\s*(?:\$env:)?SECRET_KEY=' } | Select-Object -First 1
if (-not $secretLine) {
  $secretLine = $statusLines | Where-Object { $_ -match '^\s*(?:\$env:)?SERVICE_ROLE_KEY=' } | Select-Object -First 1
}
if (-not $secretLine -or $secretLine -notmatch '^\s*(?:\$env:)?[A-Z_]+=(["'']?)(.*)\1\s*$') {
  throw 'A chave administrativa do Supabase local não foi encontrada.'
}
$adminKey = $Matches[2]

$env:SUPABASE_SECRET_KEY = $adminKey
$env:SOULMAIS_SMTP_USER = 'soulmaisespacoalpha@gmail.com'
$env:NODE_USE_SYSTEM_CA = '1'
$env:SOULMAIS_EMAIL_DELIVERY_MODE = 'direct'
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3003'
$adminKey = $null
$appPassword = $null

try {
  Set-Location $webRoot
  npm run start -- --port 3003
} finally {
  Remove-Item Env:SUPABASE_SECRET_KEY,Env:SOULMAIS_GMAIL_APP_PASSWORD,Env:SOULMAIS_SMTP_USER,Env:NODE_USE_SYSTEM_CA,Env:SOULMAIS_EMAIL_DELIVERY_MODE,Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
}