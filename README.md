# ArchimedesOS

ArchimedesOS is a planned Arch Linux-based, bare-metal operating system for application hosting, container management, and system administration. It is designed for headless operation, with the same web interface planned for remote access and an optional local display.

**Planned stack:** Arch Linux, systemd, pacman, Btrfs, Docker Engine and Compose; SvelteKit (Svelte 5), TypeScript, Bun, ElysiaJS, SQLite, and JSON-RPC 2.0 over WebSockets.

**Status:** Early development. The dashboard can read local Docker inventory through the localhost middleware; other operations remain explicit demo features.

## Preview and middleware

```sh
cd apps/middleware
bun install --frozen-lockfile
bun run start
```

In another terminal, run the web app as described below. Live mode is the default. Set `VITE_ARCHIMEDES_PROVIDER=demo` only for an explicit demo build.

## Preview the web UI

**Windows PowerShell:** From the repository root, run:

```powershell
.\preview.cmd
```

The launcher finds Bun and Node.js, installs the locked dependencies, and starts the dev server. On a new machine, install Bun and Node.js 22 first.

**Other platforms:** With Bun and Node.js 22 installed, run:

```sh
bun install --cwd apps/web --frozen-lockfile
bun run --cwd apps/web dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Press `Ctrl+C` to stop it. See [web testing instructions](apps/web/README.md) for automated checks.

**License:** [Apache 2.0 + Commons Clause v1.0](LICENSE). Source-available, not OSI-approved open source.