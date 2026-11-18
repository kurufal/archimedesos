# ArchimedesOS web prototype

Run these commands from this directory with Bun and Node.js 22 installed:

```sh
bun install --frozen-lockfile
bun run dev
```

`bun run check` checks TypeScript and Svelte. `bun run build` prerenders every management route into `build/`, ready for a static file server that supports directory indexes. For browser regression tests, run `bun run playwright install chromium --only-shell` once, then `bun run test`.

The typed inventory in `src/lib/mock.ts` seeds the in-memory provider in `src/lib/session.svelte.ts`. All host, container, activity and editor actions are simulations. Reloading resets the inventory and workspace files. Only display preferences persist in browser storage. Upload and download are previews; the terminal, Git backup and Compose engine do not connect to any service.