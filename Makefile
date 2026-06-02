# =============================================================
#  red-engine — dev tooling (Project R.E.D)
# =============================================================

.PHONY: dev air vite build run tidy clean

## dev: run Vite (CSS/JS HMR on :5173) + Air (Go hot reload on :8080)
##      Open http://localhost:5173 in your browser.
dev:
	@./red-dev.sh

## air: hot-reload the Go server only (no Vite, no CSS HMR)
air:
	DEV_MODE=true air -c .air.dev.toml

## vite: start Vite dev server only (requires Go already running on :8080)
vite:
	npx vite

## build: production build — compile CSS/JS via Vite, then the Go binary
build:
	npx vite build
	go build -o ./red ./cmd/red

## run: build + run once (no watching)
run: build
	./red

tidy:
	go mod tidy

clean:
	rm -rf tmp internal/router/static/dist
