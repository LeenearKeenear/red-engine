<#
.SYNOPSIS
    red-dev.ps1 – RED Engine development launcher (Windows)
.DESCRIPTION
    Usage: .\red-dev.ps1 [path\to\config.json]
#>

param(
    [Parameter(Position=0)]
    [string]$ConfigPath = "config.json"
)

# Set encoding for proper character display
$OutputEncoding = [System.Text.Encoding]::UTF8

$CSS_IN = "internal/router/static/tailwind-input.css"
$CSS_OUT = "internal/router/static/tailwind.css"

# --- Check prerequisites ---
if (!(Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "[✗] Go not found. Please install Go from https://golang.org/" -ForegroundColor Red
    exit 1
}
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[✗] npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# --- Check and Install Air ---
if (!(Get-Command air -ErrorAction SilentlyContinue)) {
    Write-Host "[!] air not found. Installing..." -ForegroundColor Yellow
    go install github.com/air-verse/air@latest
    $goBin = Join-Path $(go env GOPATH) "bin"
    if ($env:Path -notlike "*$goBin*") {
        $env:Path += ";$goBin"
    }
}

Write-Host "📁 Using config file: $ConfigPath" -ForegroundColor Green

# --- Install dependencies ---
Write-Host "📦 Installing Go dependencies..." -ForegroundColor Green
go mod download

if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing npm dependencies..." -ForegroundColor Green
    npm install
}

# --- Start Processes ---
# We use a background job for Tailwind to allow its output to stream or run silently,
# while keeping the primary Air process in the foreground for interactive debugging.

Write-Host "🎨 Building Tailwind CSS..." -ForegroundColor Green
$env:NODE_OPTIONS = "--no-deprecation"
& npx @tailwindcss/cli -i $CSS_IN -o $CSS_OUT --minify

Write-Host "📡 Starting Tailwind CSS watcher..." -ForegroundColor Green
$TailwindProc = Start-Process npx -ArgumentList "@tailwindcss/cli -i $CSS_IN -o $CSS_OUT --watch" -NoNewWindow -PassThru

Write-Host "🏃 Starting Go server with live reload (DEV_MODE=true)..." -ForegroundColor Green
Write-Host "   Config argument: -config=$ConfigPath" -ForegroundColor Green

# Set environment variable for the current session
$env:DEV_MODE = "true"

try {
    if (Test-Path ".air.dev.toml") {
        # Execute air with the provided config
        & air -c .air.dev.toml -- -config="$ConfigPath"
    }
    else {
        Write-Host "[!] No Air config found. Starting with go run..." -ForegroundColor Yellow
        & go run ./cmd/red/main.go -config="$ConfigPath"
    }
}
catch {
    Write-Host "`n[!] Server interrupted." -ForegroundColor Yellow
}
finally {
    Write-Host "`n🛑 Shutting down processes..." -ForegroundColor Yellow
    if ($TailwindProc -and !$TailwindProc.HasExited) {
        Stop-Process -Id $TailwindProc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Development environment stopped." -ForegroundColor Green
}
