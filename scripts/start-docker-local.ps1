param([string]$PublicOrigin)

$ErrorActionPreference = 'Stop'
$webRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $webRoot
if ([string]::IsNullOrWhiteSpace($PublicOrigin)) { $PublicOrigin = $env:SOULMAIS_PUBLIC_ORIGIN }
if ([string]::IsNullOrWhiteSpace($PublicOrigin)) { $PublicOrigin = 'http://localhost:3002' }
$PublicOrigin = $PublicOrigin.TrimEnd('/')

$authContainer = (docker inspect supabase_auth_soulmais | ConvertFrom-Json)[0]
if (-not $authContainer) { throw 'Inicie o Supabase local antes do Soul+.' }
$appPassword = ($authContainer.Config.Env | Where-Object { $_ -like 'GOTRUE_SMTP_PASS=*' } | Select-Object -First 1) -replace '^GOTRUE_SMTP_PASS=', ''
if ($appPassword.Length -ne 16) { throw 'A senha de app do Gmail não está configurada no Auth local.' }

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$statusLines = supabase status --output env 2>&1
$statusExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($statusExitCode -ne 0) { throw 'Não foi possível ler a configuração do Supabase local.' }

function Get-StatusValue([string]$name) {
  $line = $statusLines | Where-Object { $_ -match "^\s*(?:\`$env:)?$name=" } | Select-Object -First 1
  if (-not $line -or $line -notmatch '^\s*(?:\$env:)?[A-Z_]+=(["'']?)(.*)\1\s*$') {
    throw "A variável $name não foi retornada pelo Supabase CLI."
  }
  return $Matches[2]
}

$env:NEXT_PUBLIC_SUPABASE_URL = $PublicOrigin
$env:NEXT_PUBLIC_SITE_URL = $PublicOrigin
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Get-StatusValue 'PUBLISHABLE_KEY'
$env:SUPABASE_SECRET_KEY = Get-StatusValue 'SECRET_KEY'
$env:SUPABASE_URL_INTERNAL = 'http://host.docker.internal:54321'
$env:SOULMAIS_SMTP_USER = 'soulmaisespacoalpha@gmail.com'
$env:SOULMAIS_GMAIL_APP_PASSWORD = $appPassword
$env:SOULMAIS_PUBLIC_ORIGIN = $PublicOrigin
$appPassword = $null

try {
  Set-Location $webRoot
  docker compose -f compose.yaml up --build --detach --remove-orphans
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não conseguiu iniciar o Soul+.' }
  Write-Output 'Soul+ iniciado em http://localhost:3002.'
} finally {
  Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL,Env:NEXT_PUBLIC_SITE_URL,Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,Env:SUPABASE_SECRET_KEY,Env:SUPABASE_URL_INTERNAL,Env:SOULMAIS_SMTP_USER,Env:SOULMAIS_GMAIL_APP_PASSWORD,Env:SOULMAIS_PUBLIC_ORIGIN -ErrorAction SilentlyContinue
}