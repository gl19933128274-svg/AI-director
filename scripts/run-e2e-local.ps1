# Local CI simulation script for E2E testing
# With performance timing analysis

$stepTimings = New-Object System.Collections.ArrayList
$totalStartTime = Get-Date

function Start-StepTimer($stepName) {
    return [PSCustomObject]@{
        Name = $stepName
        StartTime = Get-Date
        EndTime = $null
        Duration = $null
        Status = "running"
    }
}

function Stop-StepTimer($timer, $status = "success") {
    $timer.EndTime = Get-Date
    $timer.Duration = ($timer.EndTime - $timer.StartTime).TotalSeconds
    $timer.Status = $status
    [void]$stepTimings.Add($timer)
    
    if ($timer.Duration -lt 1) {
        $durationStr = "{0:F2} ms" -f ($timer.Duration * 1000)
    } else {
        $durationStr = "{0:F2} s" -f $timer.Duration
    }
    
    Write-Host "[TIMING] Step '$($timer.Name)' completed in $durationStr"
}

Write-Host "========================================"
Write-Host "  Local CI E2E Test Simulation"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "========================================"
Write-Host ""

# 1. Clean up old database
$timer = Start-StepTimer "Clean up old database"
Write-Host "[INFO] Step 1: $($timer.Name)"
$dbPath = "frontend/prisma/dev.db"
if (Test-Path $dbPath) {
    Write-Host "[INFO]   Deleting old database file..."
    Remove-Item $dbPath -Force
    Write-Host "[SUCCESS]   Old database deleted"
} else {
    Write-Host "[INFO]   No old database file found"
}
Stop-StepTimer $timer

# 2. Install dependencies
$timer = Start-StepTimer "Install dependencies"
Write-Host ""
Write-Host "[INFO] Step 2: $($timer.Name)"
Set-Location frontend
Write-Host "[INFO]   Running npm ci..."
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR]   Failed to install dependencies"
    Stop-StepTimer $timer "failed"
    exit 1
}
Write-Host "[SUCCESS]   Dependencies installed"
Stop-StepTimer $timer

# 3. Run Prisma migrations
$timer = Start-StepTimer "Run Prisma migrations"
Write-Host ""
Write-Host "[INFO] Step 3: $($timer.Name)"
Write-Host "[INFO]   Running npx prisma migrate dev --name init..."
npx prisma migrate dev --name init --skip-seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR]   Migrations failed"
    Stop-StepTimer $timer "failed"
    exit 1
}
Write-Host "[SUCCESS]   Migrations completed"
Stop-StepTimer $timer

# 4. Build application
$timer = Start-StepTimer "Build application"
Write-Host ""
Write-Host "[INFO] Step 4: $($timer.Name)"
Write-Host "[INFO]   Running npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR]   Build failed"
    Stop-StepTimer $timer "failed"
    exit 1
}
Write-Host "[SUCCESS]   Build completed"
Stop-StepTimer $timer

# 5. Start development server
$timer = Start-StepTimer "Start development server"
Write-Host ""
Write-Host "[INFO] Step 5: $($timer.Name)"
Write-Host "[INFO]   Setting environment variables..."
$env:DATABASE_URL = "file:./dev.db"
$env:JWT_SECRET = "local-test-secret-12345"
$env:NEXT_PUBLIC_API_BASE = "http://localhost:3000"

Write-Host "[INFO]   Starting server..."
$npmPath = Get-Command npm.cmd | Select-Object -ExpandProperty Source
$serverProcess = Start-Process -FilePath $npmPath -ArgumentList "run dev" -PassThru -NoNewWindow
Write-Host "[INFO]   Server started with PID: $($serverProcess.Id)"
Stop-StepTimer $timer

# 6. Wait for server to start
$timer = Start-StepTimer "Wait for server to start"
Write-Host ""
Write-Host "[INFO] Step 6: $($timer.Name)"
$maxAttempts = 30
$success = $false
$attemptCount = 0

for ($i = 1; $i -le $maxAttempts; $i++) {
    $attemptCount = $i
    Write-Host "[INFO]   Attempt $i/$maxAttempts..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "[INFO]   HTTP Status: $($response.StatusCode)"
        if ($response.StatusCode -eq 200) {
            Write-Host "[SUCCESS]   Server is ready"
            $success = $true
            break
        }
    } catch {
        Write-Host "[INFO]   Server not ready yet"
    }
    
    if ($i -eq $maxAttempts) {
        Write-Host "[ERROR]   Server timeout after $maxAttempts attempts"
        $serverProcess.Kill()
        Stop-StepTimer $timer "failed"
        exit 1
    }
    
    Start-Sleep -Seconds 2
}
Write-Host "[INFO]   Server ready after $attemptCount attempts"
Stop-StepTimer $timer

# 7. Run E2E tests
$timer = Start-StepTimer "Run E2E tests"
Write-Host ""
Write-Host "[INFO] Step 7: $($timer.Name)"
$env:API_BASE = "http://localhost:3000"
node tests/v2-full-chain-test.js
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Stop-StepTimer $timer "failed"
} else {
    Stop-StepTimer $timer
}

# 8. Cleanup
$timer = Start-StepTimer "Cleanup"
Write-Host ""
Write-Host "[INFO] Step 8: $($timer.Name)"
Write-Host "[INFO]   Stopping development server..."
$serverProcess.Kill()
Start-Sleep -Seconds 2
Write-Host "[SUCCESS]   Server stopped"
Stop-StepTimer $timer

# 9. Output results and timing summary
$totalEndTime = Get-Date
$totalDuration = ($totalEndTime - $totalStartTime).TotalSeconds

Write-Host ""
Write-Host "========================================"
Write-Host "           PERFORMANCE SUMMARY"
Write-Host "========================================"
Write-Host ""
Write-Host "| Step | Name                     | Status | Duration   |"
Write-Host "|------|--------------------------|--------|------------|"

for ($i = 0; $i -lt $stepTimings.Count; $i++) {
    $step = $stepTimings[$i]
    if ($step.Duration -lt 1) {
        $durationStr = "{0:F2} ms" -f ($step.Duration * 1000)
    } else {
        $durationStr = "{0:F2} s" -f $step.Duration
    }
    $statusIcon = if ($step.Status -eq "success") { "OK" } else { "FAIL" }
    $stepName = $step.Name
    if ($stepName.Length -gt 24) {
        $stepName = $stepName.Substring(0, 24)
    }
    Write-Host ("| {0,4} | {1,-24} | {2,6} | {3,10} |" -f ($i + 1), $stepName, $statusIcon, $durationStr)
}

Write-Host ""
Write-Host "========================================"
if ($totalDuration -lt 60) {
    $totalDurationStr = "{0:F2} seconds" -f $totalDuration
} else {
    $minutes = [Math]::Floor($totalDuration / 60)
    $seconds = $totalDuration % 60
    $totalDurationStr = "{0} minutes {1:F2} seconds" -f $minutes, $seconds
}
Write-Host "Total execution time: $totalDurationStr"
Write-Host "========================================"

Write-Host ""
Write-Host "========================================"
if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] All tests passed!"
} else {
    Write-Host "[ERROR] Tests failed with exit code: $exitCode"
}
Write-Host "========================================"

exit $exitCode