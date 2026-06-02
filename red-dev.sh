#!/bin/bash
# red-dev – RED Engine development launcher (Linux/macOS)
# Usage: ./red-dev.sh [path/to/config.json]
#
# Starts three processes:
#   1. Air  — hot-reloads the Go server on .go / .html changes
#   2. Vite — dev server on :5173, proxies to Go :8080, handles CSS/JS HMR
#
# Open http://localhost:5173 in your browser (not :8080).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Help ---
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo "Usage: $0 [config-file]"
    echo "  config-file   Path to JSON config file (default: config.json)"
    exit 0
fi

# --- Set config path (first argument or default) ---
CONFIG_PATH="${1:-config.json}"
echo -e "${GREEN}Using config file: ${CONFIG_PATH}${NC}"

# --- Check prerequisites ---
command -v go >/dev/null 2>&1 || { echo -e "${RED}Go not found. Please install Go.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm not found. Please install Node.js.${NC}"; exit 1; }

if ! command -v air &>/dev/null; then
    echo -e "${YELLOW}air not found. Installing...${NC}"
    go install github.com/air-verse/air@latest
    export PATH=$PATH:$(go env GOPATH)/bin
fi

# --- Install dependencies (if needed) ---
echo -e "${GREEN}Installing Go dependencies...${NC}"
go mod download

if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}Installing npm dependencies...${NC}"
    npm install
fi

# --- Setup cleanup on exit ---
cleanup() {
    echo -e "\n${YELLOW}Shutting down processes...${NC}"
    kill "$VITE_PID" 2>/dev/null || true
    echo -e "${GREEN}Development environment stopped.${NC}"
}
trap cleanup EXIT INT TERM

# --- Start Vite dev server (CSS HMR + proxy to Go) ---
echo -e "${GREEN}Starting Vite dev server on :5173...${NC}"
NODE_OPTIONS='--disable-warning=DEP0205' npx vite &
VITE_PID=$!

# --- Start Air with DEV_MODE=true and pass config path ---
echo -e "${GREEN}Starting Go server with live reload (DEV_MODE=true, config=${CONFIG_PATH})...${NC}"
echo -e "${YELLOW}Open http://localhost:5173 in your browser.${NC}"
if [ -f ".air.dev.toml" ]; then
    DEV_MODE=true air -c .air.dev.toml -- -config="${CONFIG_PATH}"
else
    echo -e "${YELLOW}No Air config found. Starting with go run...${NC}"
    DEV_MODE=true go run ./cmd/red/main.go -config="${CONFIG_PATH}"
fi
