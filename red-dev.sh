#!/bin/bash
# red-dev – RED Engine development launcher (Linux/macOS)
# Usage: ./red-dev [path/to/config.json]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Help ---
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Usage: $0 [config-file]"
    echo "  config-file   Path to JSON config file (default: config.json)"
    exit 0
fi

# --- Set config path (first argument or default) ---
CONFIG_PATH="${1:-config.json}"
echo -e "${GREEN}📁 Using config file: ${CONFIG_PATH}${NC}"

# --- Check prerequisites ---
command -v go >/dev/null 2>&1 || { echo -e "${RED}❌ Go not found. Please install Go.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm not found. Please install Node.js.${NC}"; exit 1; }

if ! command -v air &>/dev/null; then
    echo -e "${YELLOW}⚠️  air not found. Installing...${NC}"
    go install github.com/air-verse/air@latest
    export PATH=$PATH:$(go env GOPATH)/bin
fi

# --- Install dependencies (if needed) ---
echo -e "${GREEN}📦 Installing Go dependencies...${NC}"
go mod download

if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing npm dependencies...${NC}"
    npm install
fi

# --- Setup cleanup on exit ---
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down processes...${NC}"
    kill $TAILWIND_PID $AIR_PID 2>/dev/null
    wait $TAILWIND_PID $AIR_PID 2>/dev/null
    echo -e "${GREEN}✅ Development environment stopped.${NC}"
    exit
}
trap cleanup INT TERM

# --- Start Tailwind watcher ---
echo -e "${GREEN}🎨 Starting Tailwind CSS watcher...${NC}"
npm run watch:tailwind &
TAILWIND_PID=$!

# --- Start Air with DEV_MODE=true and pass config path ---
echo -e "${GREEN}🏃 Starting Go server with live reload (DEV_MODE=true)...${NC}"
echo -e "${GREEN}   Config argument: -config=${CONFIG_PATH}${NC}"
DEV_MODE=true air -- -config="${CONFIG_PATH}" &
AIR_PID=$!

echo -e "${GREEN}✅ Both processes running. Press Ctrl+C to stop.${NC}"

# Wait for either process to exit
wait