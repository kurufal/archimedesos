# Middleware security limitations

This phase is suitable for a trusted Arch Linux development VM, not a deployed management plane.

## Current controls

- Elysia binds to `127.0.0.1:4730`, not `0.0.0.0`.
- The RPC surface contains read-only inventory methods only.
- The systemd unit is unprivileged and receives access to the Docker group and `/run/docker.sock`. Docker group access is effectively root-equivalent: compromise of this service must be treated as host compromise.
- Systemd hardening disables capabilities, adds `NoNewPrivileges`, and restricts filesystem and address-family access.
- The Docker transport uses the Unix socket and never accepts a remote Docker endpoint.

## Known limitations

- There is no user authentication, token validation, TLS, session expiry, rate limiting, or audit trail yet. Upgrade requests have an origin allowlist, and individual RPC messages are limited to 64 KiB, but these are not substitutes for authentication and CSRF controls.
- The localhost binding is the primary access boundary. A hostile local process or malicious webpage able to reach localhost can connect until authentication and origin checks are added.
- Docker group membership permits the service process to make arbitrary Docker API calls even though application code exposes only reads.
- Docker inventory can reveal image tags, mounts, container names, labels, ports, and host metadata. Treat the service as sensitive.
- Do not proxy or tunnel this port publicly and do not bind the service on a remote interface. Authentication must exist before remote access.

## Arch VM installation outline

Create an unprivileged `archimedes` user, install Bun, place this repository under `/opt/archimedesos`, add the user to `docker`, and install the service unit. Keep `/opt/archimedesos` owned by root, readable by the service. Enable with `systemctl enable --now archimedes-middleware.service`.
