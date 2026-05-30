# red-dev.ps1 – RED Engine development environment (Windows)

param(
    [string]$Config = "config.json",
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\red-dev.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  --config, -c <file>   Path to configuration file (default: config.json)"
    Write-Host "  --help, -h            Show this help message"
    exit 0
}

Write-Host "🚀 Starting RED Engine development environment..." -ForegroundColor Green
Write-Host "📄 Using configuration file: $Config" -ForegroundColor Green

# --- Dependency checks ---
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Go not found. Please install Go." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install Node.js." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command air -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  air not found. Installing..." -ForegroundColor Yellow
    go install github.com/air-verse/air@latest
    # Add GOPATH/bin to PATH for this session if needed
    $goPath = go env GOPATH
    $env:Path = "$goPath\bin;$env:Path"
}

# --- Install dependencies ---
Write-Host "📦 Installing Go dependencies..." -ForegroundColor Green
go mod download

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing npm dependencies..." -ForegroundColor Green
    npm install
}

# --- Start background jobs ---
Write-Host "🎨 Starting Tailwind CSS watcher..." -ForegroundColor Green
$tailwindJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run watch:tailwind
}

Write-Host "🏃 Starting Go server with live reload (DEV_MODE=true)..." -ForegroundColor Green
# Set environment variables for the Air process
$env:DEV_MODE = "true"
$env:RED_CONFIG = $Config
$airJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    # Pass the environment variables explicitly (they are inherited from the parent)
    air
}

Write-Host "✅ Both processes running. Press Ctrl+C to stop." -ForegroundColor Green

# Wait for Ctrl+C
try {
    # Wait indefinitely until user presses Ctrl+C
    Wait-Event -Timeout ([System.Threading.Timeout]::Infinite)
}
finally {
    Write-Host "`n🛑 Shutting down processes..." -ForegroundColor Yellow
    Stop-Job $tailwindJob -ErrorAction SilentlyContinue
    Stop-Job $airJob -ErrorAction SilentlyContinue
    Remove-Job $tailwindJob -ErrorAction SilentlyContinue
    Remove-Job $airJob -ErrorAction SilentlyContinue
    Write-Host "✅ Development environment stopped." -ForegroundColor Green
}