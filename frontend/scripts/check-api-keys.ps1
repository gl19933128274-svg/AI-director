# AI Director - API Key Checker
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3002"

function Write-Color {
    param([string]$msg, [string]$color = "White")
    Write-Host $msg -ForegroundColor $color
}

function Test-Server {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/chat" -Method GET -TimeoutSec 5 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-Hunyuan {
    Write-Color "`n=== Hunyuan API ===" "Cyan"
    
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/chat" -Method GET -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.apiKeyConfigured -eq $true) {
            Write-Color "[OK] API Key configured" "Green"
            Write-Color "  Mode: $(if ($data.useRealAI) { 'Real' } else { 'Mock' })" "White"
            
            if ($data.useRealAI) {
                Write-Color "  Testing real API..." "Yellow"
                try {
                    $test = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/chat" -Method POST `
                        -ContentType 'application/json' `
                        -Body '{"messages":[{"role":"user","content":"test"}]}' `
                        -TimeoutSec 15
                    
                    if ($test.StatusCode -eq 200) {
                        Write-Color "[OK] API Key is valid!" "Green"
                        return $true
                    } else {
                        Write-Color "[FAIL] Status: $($test.StatusCode)" "Red"
                        return $false
                    }
                } catch {
                    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($err -and $err.error) {
                        Write-Color "[FAIL] Invalid API Key!" "Red"
                        Write-Color "  Type: $($err.error.type)" "Red"
                        Write-Color "  Code: $($err.error.code)" "Red"
                        Write-Color "  Message: $($err.error.message)" "Red"
                    } else {
                        Write-Color "[FAIL] $($_.Exception.Message)" "Red"
                    }
                    return $false
                }
            } else {
                Write-Color "[INFO] Mock mode, not testing" "Yellow"
                return $null
            }
        } else {
            Write-Color "[FAIL] API Key not configured" "Red"
            Write-Color "  Set HUNYUAN_API_KEY in .env.local" "Yellow"
            return $false
        }
    } catch {
        Write-Color "[FAIL] $($_.Exception.Message)" "Red"
        return $false
    }
}

function Test-Kling {
    Write-Color "`n=== Kling AI ===" "Cyan"
    
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/kling/health" -Method GET -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.apiKeyConfigured -eq $true) {
            Write-Color "[OK] API Key configured" "Green"
            Write-Color "  Mode: $($data.mode)" "White"
            Write-Color "  Base: $($data.apiBase)" "White"
            
            if ($data.useRealAI) {
                Write-Color "  Testing real API..." "Yellow"
                try {
                    $test = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/kling/generate" -Method POST `
                        -ContentType 'application/json' `
                        -Body '{"prompt":"test"}' `
                        -TimeoutSec 15
                    
                    if ($test.StatusCode -eq 200) {
                        Write-Color "[OK] API Key is valid!" "Green"
                        return $true
                    } else {
                        Write-Color "[FAIL] Status: $($test.StatusCode)" "Red"
                        return $false
                    }
                } catch {
                    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($err -and $err.error) {
                        Write-Color "[FAIL] Invalid API Key!" "Red"
                        Write-Color "  Error: $($err.error)" "Red"
                    } else {
                        Write-Color "[FAIL] $($_.Exception.Message)" "Red"
                    }
                    return $false
                }
            } else {
                Write-Color "[INFO] Mock mode, not testing" "Yellow"
                return $null
            }
        } else {
            Write-Color "[FAIL] API Key not configured" "Red"
            Write-Color "  Set KLING_API_KEY and KLING_SECRET_KEY in .env.local" "Yellow"
            return $false
        }
    } catch {
        Write-Color "[FAIL] $($_.Exception.Message)" "Red"
        return $false
    }
}

# Main
Write-Color "============================================================" "Cyan"
Write-Color "  AI Director - API Key Checker" "Cyan"
Write-Color "============================================================" "Cyan"

Write-Color "`nChecking server..." "Yellow"
if (-not (Test-Server)) {
    Write-Color "[FAIL] Server not running!" "Red"
    Write-Color "  Run: npm run dev" "Yellow"
    Write-Color "  URL: http://localhost:3002" "Yellow"
    exit 1
}
Write-Color "[OK] Server running" "Green"

$hunyuan = Test-Hunyuan
$kling = Test-Kling

Write-Color "`n============================================================" "Cyan"
Write-Color "  Summary" "Cyan"
Write-Color "============================================================" "Cyan"

Write-Color "`nHunyuan:" "Cyan"
if ($hunyuan -eq $true) {
    Write-Color "  [OK] Valid" "Green"
} elseif ($hunyuan -eq $false) {
    Write-Color "  [FAIL] Invalid or not configured" "Red"
} else {
    Write-Color "  [INFO] Mock mode" "Yellow"
}

Write-Color "`nKling:" "Cyan"
if ($kling -eq $true) {
    Write-Color "  [OK] Valid" "Green"
} elseif ($kling -eq $false) {
    Write-Color "  [FAIL] Invalid or not configured" "Red"
} else {
    Write-Color "  [INFO] Mock mode" "Yellow"
}

Write-Color "`n============================================================" "Cyan"

if ($hunyuan -eq $false -or $kling -eq $false) {
    Write-Color "Result: Invalid keys found" "Red"
    exit 1
} else {
    Write-Color "Result: All keys OK" "Green"
    exit 0
}