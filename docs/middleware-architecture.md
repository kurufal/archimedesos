# Middleware foundation

The middleware is a localhost-only Bun/Elysia service. The web client speaks a versioned JSON-RPC 2.0 protocol over `ws://127.0.0.1:4730/rpc/v1` and can only request read methods in this phase.

## Boundaries

- `shared/contracts.ts` is the typed wire contract shared with the Svelte application.
- `HostProvider` is capability based. Local Docker is the first live implementation; additional provider types can be added without changing the protocol registry.
- `RpcRegistry` owns explicit method registration, JSON Schema-compatible parameter checks, permission checks, host scopes, and structured errors.
- `LocalDockerProvider` negotiates from Docker's unversioned `/version` response. It defaults to API 1.44 and selects a lower advertised version only when necessary; it rejects an API below Docker's advertised minimum.
- The frontend replaces inventory only after a complete successful snapshot. Live connection failures leave the inventory empty and display an error. They never select demo data.

## Methods

All parameters are empty objects at present:

- `system.v1.info`
- `host.v1.info`
- `docker.v1.containers`
- `docker.v1.images`
- `docker.v1.networks`
- `docker.v1.volumes`
- `inventory.v1.snapshot`

## Session direction

`SessionPrincipal` already separates identity, permissions, and host scopes. The current single localhost principal is development-only. A future authentication layer can populate that principal without changing method contracts or providers. Permission checks currently gate `system.read`, `inventory.read`, and resource-specific read capabilities.

## Explicit demo mode

The middleware demo provider is enabled only with `ARCHIMEDES_PROVIDER=demo` and requires a supplied `ARCHIMEDES_DEMO_DATA` snapshot. The frontend enables mock inventory only when built with `VITE_ARCHIMEDES_PROVIDER=demo`. Browser regressions use Svelte's `test` mode and do not exercise demo fallback.

## Docker integration tests

Unit fixtures cover negotiation and mapping without Docker. A disposable Docker daemon can run the integration test by setting `ARCHIMEDES_DOCKER_TEST_SOCKET` to its Unix socket. The test is skipped when the variable is absent. A practical disposable setup is a CI DinD service with the socket mounted into the test runner; do not expose that socket over the network.
