## [Unreleased] - 2026-06-01

### Added
- **Navigation System:** New `internal/navigation` package with filesystem scanner, SQLite-backed index (`nav_folders`, `nav_guides`, `nav_description_overrides` tables), and three HTTP endpoints:
  - `GET /api/navigation` — tree or flat content listing with `path`, `content_type`, and `flat` query params
  - `POST /-/admin/navigation/rescan` — trigger a fresh filesystem walk
  - `PUT /-/admin/navigation/folder/description` — set or override a folder's description
- **DB-Backed Node Settings:** New `node_settings` key-value table in `registry.db`. `site_name` and `node_name` are now runtime-editable without restarting the container. Changes take effect on the next request.
- **Environment Variable Overrides:** All critical config values can now be set via `RED_*` environment variables, taking priority over `config.json`. Supported: `RED_ADMIN_TOKEN`, `RED_WEBHOOK_SECRET`, `RED_ADDR`, `RED_DATA_DIR`, `RED_SITE_NAME`, `RED_NODE_NAME`.
- **Admin Lockdown Mode:** If neither `config.json` nor `RED_ADMIN_TOKEN` is present at startup, the node starts in read-only lockdown — content is served but the admin panel returns HTTP 401. No credentials are auto-generated silently.
- **Unified `setup.sh` Script:** Single entry point replacing four separate scripts. Commands: `test`, `dev`, `install`, `update`, `token`, `backup`, `status`, `help`. Default (no argument) runs the first-time setup wizard.
- **First-Time Setup Wizard:** Interactive wizard in `setup.sh` collects addr, data dir, site name, and node name. Writes credentials to both `.env` (primary resilient store) and `config.json`. Requires the operator to type `I understand` before setting the node name, with an explicit warning about federation identity permanence.
- **One-Time Config Migration:** On first boot, `site_name` and `node_name` values from `config.json` are automatically migrated to the `node_settings` table. `startupSync` entries are migrated to the `registry.db` startup sync table.

### Changed
- **`entrypoint.sh`:** No longer auto-creates a stub `config.json`. If both `config.json` and `RED_ADMIN_TOKEN` are absent, it prints a clear lockdown warning and starts normally. The `chown` of `config.json` is now conditional on the file existing.
- **`docker-compose.yml`:** Added `environment:` block to pass all `RED_*` vars into the container from `.env`. Changed `expose: 8080` to `ports: 127.0.0.1:8080:8080` so the node is directly reachable at `http://localhost:8080` without requiring Caddy. Removed dead `contributors.json` volume mount.
- **`config.json`:** Trimmed to four fields: `addr`, `dataDir`, `adminToken`, `webhookSecret`. Dead fields (`sourceURL`, `sourceType`) removed. `startupSync`, `siteName`, `nodeName` retained only for one-time migration and then ignored.
- **`siteName` / `nodeName` resolution:** Both now read from `registry.GetSetting()` on every request. Fallbacks: `site_name` → `"RED Engine"`, `node_name` → `os.Hostname()`. The config fields are only read during startup migration.
- **`.env` as resilient credential store:** `setup.sh` writes credentials to `.env` as the primary store. If `config.json` is deleted, env vars keep the node fully operational on next restart. `.env` is automatically added to `.gitignore`.

### Removed
- `install-red-engine.sh`, `install-red-engine.ps1`, `install-red-dependencies.pssc` — superseded by `setup.sh`
- `manage-token.sh`, `manage-token.ps1` — superseded by `./setup.sh token`
- `node-test.sh` — superseded by `./setup.sh test`
- `backup-data.sh` — superseded by `./setup.sh backup`
- Dead `sync.RWMutex` field from `config.Config` struct
- Dead `SourceURL`, `SourceType` fields from `config.Config` struct

---

## [Unreleased] - 2026-05-29

### Added
- **Native Git Engine:** Integrated `go-git/go-git/v5` for true delta-pulling and cloning, eliminating the engine's reliance on host OS shell commands and bypassing container permission traps.
- **Granular Memory Hot-Reloading:** Added `Store.UpdateFiles(changedPaths []string)` to surgically patch the active memory map. The engine now drops and re-renders only the specific files modified in a commit or local save, eliminating CPU spikes and full-site downtime during syncs.
- **Smart Webhook Routing:** Added intelligent JSON payload parsing to the `/-/webhook/sync` endpoint. Webhooks now extract the origin URL and only trigger delta-pulls for matching repositories.
- **Container-Safe Local Polling:** Added `radovskyb/watcher` to bypass Docker/Podman hypervisor limitations where `inotify` events fail to cross into the container.

### Changed
- **Replaced `fsnotify`:** Local file watching is now handled by a 2-second interval background poller, which directly feeds into the new granular memory hot-reloading module.
- **Silent Background Poller:** Refactored the 1-minute brute force loop in `cmd/red/main.go`. It now uses `fetch.PullDelta` to silently check for remote Git changes without downloading entire repository archives.
- **Installation Scripts:** Updated `install-red-engine.sh` and `install-red-engine.ps1` to automatically assign global read/write permissions (`chmod 777` and `icacls Everyone`) to the `data/` volume.
- **Docker Dependencies:** Updated `Dockerfile` to install `ca-certificates`, `git`, and `openssh` directly into the Alpine container for native Git support.

### Fixed
- **Podman Permission Trap:** Prevented the restricted `reduser` (UID 1000) from being locked out of the `data/` directory when the host machine auto-creates missing volume mounts as `root`.
- **Mutex Panic in Store:** Fixed a fatal runtime concurrency bug in `store.go` where a deferred `mu.Unlock()` would cause a panic if security definitions (`manifest.json` or `contributors.json`) were modified.
- **Webhook Global Loop Bug:** Fixed an issue where a single webhook ping would force the engine to blindly re-download every tracked repository in the configuration list.
- **ZIP Archive Loop Bug:** Changed default URLs in `config.json` from `/archive/HEAD.zip` to `.git` to prevent the background sync from repeatedly destroying and recreating directories every 60 seconds.
