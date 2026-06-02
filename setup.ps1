<#
.SYNOPSIS
    setup.ps1 - RED Engine unified setup, install, dev, and management script (Windows)
.DESCRIPTION
    Usage: .\setup.ps1 [command] [config-file]

    Commands:
      (default)   Interactive first-time setup wizard, or show status if installed
      dev         Start Vite dev server + Go live reload (Air)
      test        Run Go test suite
      install     Build container image and start production node
      update      Pull latest code, run tests, rebuild, restart node
      restart     Restart the running node (no rebuild)
      token       Rotate the admin token
      backup      Zip the data directory into backups\
      status      Show container status and node health
      help        Show this message
#>

param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [Parameter(Position=1)]
    [string]$ConfigPath = "config.json"
)

$OutputEncoding = [System.Text.Encoding]::UTF8
$ENV_FILE    = ".env"
$CONFIG_FILE = "config.json"
if ($ConfigPath -eq "config.json") { $ConfigPath = $CONFIG_FILE }

# ─── Colours ─────────────────────────────────────────────────────────────────

function Write-Info    { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[v] $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Header  { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Die {
    param($msg)
    Write-Host "[x] $msg" -ForegroundColor Red
    exit 1
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

function Get-ComposeCmd {
    if (Get-Command podman-compose -ErrorAction SilentlyContinue) { return "podman-compose" }
    if (Get-Command docker-compose  -ErrorAction SilentlyContinue) { return "docker-compose"  }
    try {
        $null = & docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) { return "docker compose" }
    } catch {}
    Write-Die "No container engine found. Install Podman or Docker to continue."
}

function Require-Go {
    if (!(Get-Command go -ErrorAction SilentlyContinue)) {
        Write-Die "Go not found. Please install Go from https://golang.org/"
    }
}

function Require-Npm {
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Die "npm not found. Please install Node.js from https://nodejs.org/"
    }
}

function New-Token {
    $bytes = [byte[]]::new(24)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Get-EnvValue {
    param([string]$Key)
    if (!(Test-Path $ENV_FILE)) { return "" }
    $line = Select-String -Path $ENV_FILE -Pattern "^${Key}=" | Select-Object -First 1
    if ($line) { return ($line.Line -replace "^${Key}=", "") }
    return ""
}

function Set-EnvValue {
    param([string]$Key, [string]$Value)
    if (!(Test-Path $ENV_FILE)) { New-Item $ENV_FILE -ItemType File | Out-Null }
    $content = Get-Content $ENV_FILE -Raw -ErrorAction SilentlyContinue
    if ($content -match "(?m)^${Key}=") {
        $content = $content -replace "(?m)^${Key}=.*", "${Key}=${Value}"
    } else {
        $content = $content.TrimEnd() + "`n${Key}=${Value}`n"
    }
    Set-Content $ENV_FILE $content -NoNewline
}

function Initialize-EnvFile {
    if (!(Test-Path $ENV_FILE)) {
        New-Item $ENV_FILE -ItemType File | Out-Null
        Write-Info "Created $ENV_FILE"
    }
    $gitignore = ".gitignore"
    if ((Test-Path $gitignore) -and !(Select-String -Path $gitignore -Pattern "^\.env$" -Quiet)) {
        Add-Content $gitignore ".env"
        Write-Info "Added .env to .gitignore"
    }
}

# ─── Commands ─────────────────────────────────────────────────────────────────

function Invoke-Help {
    $helpText = @"
Usage: .\setup.ps1 [command] [config-file]

Commands:
  (default)   Interactive first-time setup wizard, or show status if installed
  dev         Start Vite dev server + Go live reload (Air)
  test        Run Go test suite
  install     Build container image and start production node
  update      Pull latest code, run tests, rebuild, restart node
  restart     Restart the running node (no rebuild)
  token       Rotate the admin token
  backup      Zip the data directory into backups\
  status      Show container status and node health
  help        Show this message
"@
    Write-Host $helpText
}

function Invoke-Test {
    Require-Go
    Write-Header "Running test suite"
    & go test ./...
    if ($LASTEXITCODE -eq 0) { Write-Success "All tests passed." }
    else { Write-Die "Tests failed." }
}

function Invoke-Dev {
    Require-Go
    Require-Npm

    Write-Header "Starting development server"

    # Install Air if missing
    if (!(Get-Command air -ErrorAction SilentlyContinue)) {
        Write-Warn "air not found. Installing..."
        & go install github.com/air-verse/air@latest
        $goBin = Join-Path (& go env GOPATH) "bin"
        if ($env:Path -notlike "*$goBin*") { $env:Path += ";$goBin" }
    }

    Write-Info "Installing Go dependencies..."
    & go mod download

    if (!(Test-Path "node_modules")) {
        Write-Info "Installing npm dependencies..."
        & npm install --legacy-peer-deps
    }

    # Start Vite dev server in background
    Write-Info "Starting Vite dev server on :5173 (Vue + Tailwind + HMR)..."
    $env:NODE_OPTIONS = "--disable-warning=DEP0205"
    $ViteProc = Start-Process npx -ArgumentList "vite" -NoNewWindow -PassThru

    Write-Warn "Open http://localhost:5173 in your browser."
    Write-Info "Starting Go server with live reload (DEV_MODE=true, config=$ConfigPath)..."
    $env:DEV_MODE = "true"

    try {
        if (Test-Path ".air.dev.toml") {
            & air -c .air.dev.toml -- -config="$ConfigPath"
        } else {
            Write-Warn "No Air config found. Starting with go run..."
            & go run ./cmd/red/main.go -config="$ConfigPath"
        }
    } finally {
        Write-Warn "`nShutting down processes..."
        if ($ViteProc -and !$ViteProc.HasExited) {
            Stop-Process -Id $ViteProc.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Success "Development environment stopped."
    }
}

function Invoke-Status {
    Write-Header "Node status"
    $compose = Get-ComposeCmd

    Write-Info "Container status:"
    if ($compose -eq "docker compose") {
        & docker compose ps
    } else {
        & $compose ps
    }

    # Determine port
    $port = Get-EnvValue "RED_ADDR"
    if ($port) { $port = $port -replace '.*:', '' }
    if (!$port) {
        $port = (Get-Content $CONFIG_FILE -Raw -ErrorAction SilentlyContinue) `
            -replace '(?s).*"addr"[^:]*:[^"]*":([0-9]+).*', '$1'
    }
    if (!$port) { $port = "8080" }

    Write-Host ""
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:${port}/-/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Success "Node health: UP  (http://localhost:${port})"
        }
    } catch {
        Write-Warn "Node health: NOT REACHABLE on port $port"
    }
}

function Invoke-Backup {
    Write-Header "Backing up data"
    if (!(Test-Path "./data")) { Write-Die "./data directory not found." }

    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $dest = ".\backups\data_${stamp}.zip"
    New-Item -ItemType Directory -Force ".\backups" | Out-Null
    Compress-Archive -Path ".\data\*" -DestinationPath $dest -Force
    Write-Success "Backup created: $dest"
}

function Invoke-Token {
    Write-Header "Rotate admin token"
    Initialize-EnvFile

    $current = Get-EnvValue "RED_ADMIN_TOKEN"
    if ($current) {
        Write-Host "  Current token: " -NoNewline
        Write-Host $current -ForegroundColor Yellow
    } else {
        Write-Warn "No token currently set in $ENV_FILE"
    }

    Write-Host ""
    $choice = Read-Host "Generate a new secure token and apply it? [y/N]"
    if ($choice -match '^[yY]$') {
        $newToken = New-Token
        Set-EnvValue "RED_ADMIN_TOKEN" $newToken

        if ((Test-Path $CONFIG_FILE) -and (Select-String -Path $CONFIG_FILE -Pattern '"adminToken"' -Quiet)) {
            $cfg = Get-Content $CONFIG_FILE -Raw
            $cfg = $cfg -replace '("adminToken"\s*:\s*")[^"]*(")', "`${1}${newToken}`${2}"
            Set-Content $CONFIG_FILE $cfg -NoNewline
            Write-Info "Updated token in $CONFIG_FILE"
        }

        Write-Host ""
        Write-Success "New admin token: $newToken"
        $compose = Get-ComposeCmd
        Write-Warn "Restart the node for the change to take effect:"
        Write-Host "      $compose restart red_engine"
    } else {
        Write-Info "Token unchanged."
    }
}

function Invoke-Restart {
    Write-Header "Restarting RED Engine node"
    $compose = Get-ComposeCmd
    Write-Info "Restarting container (no rebuild)..."
    if ($compose -eq "docker compose") { & docker compose restart red_engine }
    else { & $compose restart red_engine }
    if ($LASTEXITCODE -ne 0) { Write-Die "Failed to restart container." }
    Write-Success "Node restarted."
    Start-Sleep 2
    Invoke-Status
}

function Invoke-Update {
    Write-Header "Updating RED Engine node"
    $compose = Get-ComposeCmd

    Write-Info "Pulling latest source..."
    & git pull
    if ($LASTEXITCODE -ne 0) { Write-Warn "git pull failed - continuing with current code." }

    Write-Info "Running tests before rebuild..."
    Require-Go
    & go test ./...
    if ($LASTEXITCODE -ne 0) { Write-Die "Tests failed. Aborting update to protect the running node." }

    Write-Info "Rebuilding container image..."
    if ($compose -eq "docker compose") { & docker compose build red_engine }
    else { & $compose build red_engine }

    Write-Info "Restarting node..."
    if ($compose -eq "docker compose") { & docker compose up -d red_engine }
    else { & $compose up -d red_engine }

    Write-Success "Update complete."
    Invoke-Status
}

function Invoke-Install {
    Write-Header "Installing RED Engine"
    $compose = Get-ComposeCmd

    if (!(Test-Path "./data")) {
        New-Item -ItemType Directory "./data" | Out-Null
        Write-Info "Created ./data directory"
    }

    if (Get-Command go -ErrorAction SilentlyContinue) {
        Write-Info "Running test suite..."
        & go test ./...
        if ($LASTEXITCODE -ne 0) { Write-Die "Tests failed. Fix them before installing." }
        Write-Success "Tests passed."
    } else {
        Write-Warn "Go not found - skipping tests."
    }

    Write-Info "Building container image..."
    if ($compose -eq "docker compose") { & docker compose build red_engine }
    else { & $compose build red_engine }

    Write-Info "Starting node..."
    if ($compose -eq "docker compose") { & docker compose up -d }
    else { & $compose up -d }

    Write-Host ""
    Invoke-Status

    Write-Host ""
    $resp = Read-Host "Set up a scheduled daily backup at 03:00? [Y/n]"
    if ($resp -match '^[nN]$') {
        Write-Info "Backups skipped."
    } else {
        $projectPath = (Get-Location).Path
        $action  = New-ScheduledTaskAction -Execute "powershell.exe" `
                       -Argument "-NonInteractive -File `"$projectPath\setup.ps1`" backup"
        $trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
        Register-ScheduledTask -TaskName "RED-Engine-Backup" -Action $action `
            -Trigger $trigger -RunLevel Highest -Force | Out-Null
        Write-Success "Daily backup task registered in Windows Task Scheduler (03:00)."
    }
}

function Invoke-Setup {
    # Already configured?
    if ((Test-Path $ENV_FILE) -and (Get-EnvValue "RED_ADMIN_TOKEN")) {
        Write-Warn "Node appears to already be configured (.env exists with a token)."
        Write-Host ""
        $overwrite = Read-Host "  Run setup wizard anyway and overwrite? [y/N]"
        if ($overwrite -notmatch '^[yY]$') { Invoke-Status; exit 0 }
    }

    Clear-Host
    Write-Host @"

  ██████╗ ███████╗██████╗     ███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗
  ██╔══██╗██╔════╝██╔══██╗    ██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝
  ██████╔╝█████╗  ██║  ██║    █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗
  ██╔══██╗██╔══╝  ██║  ██║    ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝
  ██║  ██║███████╗██████╔╝    ███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗
  ╚═╝  ╚═╝╚══════╝╚═════╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝

  First-Time Node Setup Wizard
"@ -ForegroundColor Cyan

    Write-Host "  This wizard configures your RED Engine node. It will:"
    Write-Host "    - Generate a secure admin token"
    Write-Host "    - Set your site name and node identity"
    Write-Host "    - Write credentials to .env (survives config.json loss)"
    Write-Host "    - Write a minimal config.json"
    Write-Host "    - Build and start the container"
    Write-Host ""
    Read-Host "  Press Enter to continue, or Ctrl+C to abort"

    Initialize-EnvFile

    # 1. Network & Data
    Write-Header "1/5 - Network and Data"
    Write-Host ""
    $addr    = Read-Host "  Listen address [default: :8080]"
    if (!$addr) { $addr = ":8080" }
    $datadir = Read-Host "  Data directory [default: data]"
    if (!$datadir) { $datadir = "data" }

    # 2. Site name
    Write-Header "2/5 - Site Name"
    Write-Host ""
    Write-Host "  The site name appears in the browser tab and node identity endpoint."
    Write-Host "  You can change this freely at any time via the admin panel."
    Write-Host ""
    $siteName = Read-Host "  Site name [default: RED Engine]"
    if (!$siteName) { $siteName = "RED Engine" }

    # 3. Node name — permanence warning
    Write-Header "3/5 - Node Identity"
    Write-Host ""
    Write-Host @"
  +=================================================================+
  |          WARNING: NODE NAME - PLEASE READ CAREFULLY            |
  +=================================================================+
  |                                                                 |
  |  The node name is your identity in the RED federation network. |
  |                                                                 |
  |  When other nodes add you as a peer or mirror, they register   |
  |  you by this name. If you change it after peers have connected:|
  |                                                                 |
  |    - Existing peers will no longer recognise your node         |
  |    - Sync connections will break and need manual repair        |
  |    - Mirror relationships will be invalidated                  |
  |                                                                 |
  |  You CAN change it later via the admin panel, but it is       |
  |  NOT recommended once you have active peers or mirrors.        |
  |                                                                 |
  +=================================================================+
"@ -ForegroundColor Red

    $ack = Read-Host "  Type 'I understand' to continue"
    if ($ack -ne "I understand") {
        Write-Warn "Acknowledgement not received. Exiting setup."
        exit 1
    }

    Write-Host ""
    $defaultNode = $env:COMPUTERNAME
    $nodeName    = Read-Host "  Node name [default: $defaultNode]"
    if (!$nodeName) { $nodeName = $defaultNode }

    # 4. Security credentials
    Write-Header "4/5 - Security Credentials"
    Write-Host ""
    $adminToken = New-Token
    Write-Host "  A secure 32-character admin token has been generated for you."
    Write-Host "  You can provide your own or press Enter to use the generated one."
    Write-Host ""
    Write-Host "  Generated token: " -NoNewline
    Write-Host $adminToken -ForegroundColor Yellow
    Write-Host ""
    $customToken = Read-Host "  Admin token [press Enter to use generated]"
    if ($customToken) { $adminToken = $customToken }

    Write-Host ""
    Write-Host "  Webhook secret is used to authenticate GitHub push webhooks."
    Write-Host "  Leave blank to disable webhook sync."
    $webhookSecret = Read-Host "  Webhook secret [optional, Enter to skip]"

    # 5. Write config files
    Write-Header "5/5 - Writing configuration"

    $envContent = @"
# RED Engine node configuration
# This file is the primary credential store. Keep it safe.
RED_ADDR=$addr
RED_DATA_DIR=$datadir
RED_ADMIN_TOKEN=$adminToken
RED_WEBHOOK_SECRET=$webhookSecret
RED_SITE_NAME=$siteName
RED_NODE_NAME=$nodeName
"@
    Set-Content $ENV_FILE $envContent -NoNewline
    Write-Success "Written $ENV_FILE"

    if ((Test-Path ".gitignore") -and !(Select-String -Path ".gitignore" -Pattern "^\.env$" -Quiet)) {
        Add-Content ".gitignore" ".env"
        Write-Info "Added .env to .gitignore"
    }

    $cfgContent = @"
{
  "addr": "$addr",
  "dataDir": "$datadir",
  "adminToken": "$adminToken",
  "webhookSecret": "$webhookSecret"
}
"@
    Set-Content $CONFIG_FILE $cfgContent -NoNewline
    Write-Success "Written $CONFIG_FILE"

    # Summary
    Write-Host ""
    Write-Host "+======================================================+" -ForegroundColor Green
    Write-Host "|         Setup complete - save this info              |" -ForegroundColor Green
    Write-Host "+======================================================+" -ForegroundColor Green
    Write-Host "  Site name   : $siteName"
    Write-Host "  Node name   : " -NoNewline
    Write-Host "$nodeName  (treat as permanent)" -ForegroundColor Yellow
    Write-Host "  Listen addr : $addr"
    Write-Host "  Admin token : " -NoNewline
    Write-Host $adminToken -ForegroundColor Yellow
    if ($webhookSecret) { Write-Host "  Webhook sec : $webhookSecret" -ForegroundColor Yellow }
    Write-Host "+======================================================+" -ForegroundColor Green
    Write-Host ""
    Write-Warn "Save your admin token now - it will not be shown again."
    Write-Host ""

    $start = Read-Host "  Proceed to build and start the node? [Y/n]"
    if ($start -match '^[nN]$') {
        Write-Info "Setup done. Run '.\setup.ps1 install' when ready."
        exit 0
    }

    Invoke-Install
}

# ─── Dispatch ─────────────────────────────────────────────────────────────────

switch ($Command.ToLower()) {
    "dev"     { Invoke-Dev     }
    "test"    { Invoke-Test    }
    "install" { Invoke-Install }
    "update"  { Invoke-Update  }
    "restart" { Invoke-Restart }
    "token"   { Invoke-Token   }
    "backup"  { Invoke-Backup  }
    "status"  { Invoke-Status  }
    "help"    { Invoke-Help    }
    ""        { Invoke-Setup   }
    default   { Write-Die "Unknown command: $Command. Run '.\setup.ps1 help' for usage." }
}
