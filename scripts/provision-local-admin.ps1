$ErrorActionPreference = "Stop"
$supabaseUrl = "http://127.0.0.1:54321"
$email = "kel1979ssouza@gmail.com"
$secretPointer = [IntPtr]::Zero
$passwordPointer = [IntPtr]::Zero

try {
    $health = Invoke-WebRequest -Uri "$supabaseUrl/auth/v1/health" -TimeoutSec 5 -UseBasicParsing
    if ($health.StatusCode -lt 200 -or $health.StatusCode -ge 300) {
        throw "O Auth local não respondeu com sucesso. Inicie o Supabase CLI primeiro."
    }

    $secretSecure = Read-Host "Cole a chave Secret local exibida por supabase status" -AsSecureString
    $passwordSecure = Read-Host "Digite a senha inicial da conta" -AsSecureString
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $secretKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer).Trim()
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    if ([string]::IsNullOrWhiteSpace($secretKey) -or $secretKey -match '[\x00-\x20\x7f]') {
        throw "Invalid Secret key. Paste only the key, without labels, spaces or control characters."
    }

    if ($password.Length -lt 6) {
        throw "A senha precisa ter pelo menos 6 caracteres conforme a configuração local."
    }
    if ($password.Length -lt 8) {
        Write-Warning "Senha curta para uma conta administrativa. Troque-a após o primeiro login."
    }

    $headers = @{
        apikey = $secretKey
        Authorization = "Bearer $secretKey"
    }
    $createBody = @{
        email = $email
        password = $password
        email_confirm = $true
        user_metadata = @{ full_name = "Professor Administrador" }
    } | ConvertTo-Json -Depth 5

    $user = Invoke-RestMethod `
        -Method Post `
        -Uri "$supabaseUrl/auth/v1/admin/users" `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $createBody

    $roleBody = @{
        app_metadata = @{
            provider = "email"
            providers = @("email")
            role = "teacher"
        }
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod `
        -Method Put `
        -Uri "$supabaseUrl/auth/v1/admin/users/$($user.id)" `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $roleBody | Out-Null

    Write-Output "Conta administrativa provisionada como teacher."
    Write-Output "ID: $($user.id)"
    Write-Output "Entre em http://localhost:3002 com o email configurado no script."
}
catch {
    $detail = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($detail)) {
        $detail = $_.Exception.Message
    }
    Write-Error "Provisionamento falhou: $detail"
    exit 1
}
finally {
    if ($secretPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    }
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Variable secretKey, password, headers, createBody, roleBody, user -ErrorAction SilentlyContinue
}