# Web prototype dependency review

ArchimedesOS uses Apache License 2.0 with Commons Clause v1.0, as stated in the repository `LICENSE` and `NOTICE`. The Commons Clause adds a restriction on selling the covered software as defined in its text; this is not an Apache-only grant. It does not change independent upstream licenses. The review does not modify the license or supply legal metadata.

| Browser dependency | Locked versions | License |
| --- | --- | --- |
| Svelte / SvelteKit | 5.57.3 / 2.70.4 | MIT; compiled browser runtime ships despite dev dependency placement |
| xterm.js / Fit addon | 6.0.0 / 0.11.0 | MIT; retain the distinct upstream copyright notices |
| CodeMirror / language and editor packages | 6.0.2 / 6.x, exact versions in `apps/web/bun.lock` | MIT, including Lezer and editor helpers |
| Lucide Svelte | 0.577.0 | ISC package metadata; retain the shipped license text including upstream Feather attribution |
| YAML | 2.9.1 | ISC |
| Audiowide / Inter Variable (Fontsource) | 5.3.0 / 5.3.0 | SIL OFL 1.1; ship original notices, check reserved font names before modification |

The build/check toolchain includes Vite 6.4.6, Rollup 4.68.5, esbuild 0.25.12, adapter-static 3.0.11, vite-plugin-svelte 5.1.1, svelte-check 4.7.8, and Prettier 3.10.1 (MIT); TypeScript 5.9.3 and Playwright 1.65.1 (Apache 2.0) are for checking and testing. Build tools and browser test binaries are not distributed as part of the static site. Review their licenses separately if shipping a toolchain or development image.

The static adapter writes the project `LICENSE` and `NOTICE` and a `THIRD-PARTY-NOTICES.txt` with original notices for the app's runtime dependency tree and the selected browser portions of Svelte and SvelteKit (`clsx`, `esm-env`, and `devalue`). Keep these files with the entire static output. This can include transitives that bundling omits and is not an OS image inventory. Verify the browser dependency set and notices after upgrades; missing license files for included packages fail the build.

Before a distribution release, confirm the provenance and redistribution terms of artwork and textures, review all OS packages separately, and plan for applicable GPL/LGPL license texts, source availability, and relinking requirements. Do not apply the project's Commons Clause to independent packages.

## Mock boundaries

Files providers currently expose synthetic trees and capability flags, with browser-memory drafts, revision checks, and simulated upload/download. A real provider needs host identity and authorization, server-side canonicalization and symlink/mount policy, transfer quotas, conflict checks, and auditing. Terminal transports currently accept only a small simulated command set; a real connection would require explicit backend authorization, a per-target session and privilege policy, safe reconnect/disposal, bounded output and auditing. No local or remote shell, Docker socket, host filesystem, credentials, or persistent multiplexer is used by this prototype.