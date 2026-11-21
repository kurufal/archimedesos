import { Elysia } from "elysia";
import type { SessionPrincipal } from "../../../shared/contracts";
import { createRegistry } from "./methods";
import { DemoProvider, type DemoProviderData } from "./providers/demo";
import { DockerUnixSocketTransport, LocalDockerProvider } from "./providers/docker";
import { RpcException } from "./rpc";

const port = Number(process.env.ARCHIMEDES_MIDDLEWARE_PORT ?? 4730);
const socket = process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";
const providerMode = process.env.ARCHIMEDES_PROVIDER ?? "docker";
const allowedOrigins = new Set((process.env.ARCHIMEDES_ALLOWED_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173").split(",").map((origin) => origin.trim()));
const localPrincipal: SessionPrincipal = {
  subject: "localhost-development",
  permissions: ["system.read", "inventory.read", "host.read", "containers.read", "images.read", "networks.read", "volumes.read"],
  hostIds: ["local", "demo-local"],
};

function provider() {
  if (providerMode === "docker") return new LocalDockerProvider(new DockerUnixSocketTransport(socket));
  if (providerMode === "demo") {
    const data: DemoProviderData = JSON.parse(process.env.ARCHIMEDES_DEMO_DATA ?? "{}") as DemoProviderData;
    if (!data.host) throw new Error("ARCHIMEDES_DEMO_DATA must define host and inventory when demo mode is selected");
    return new DemoProvider(data);
  }
  throw new Error(`Unsupported ARCHIMEDES_PROVIDER value: ${providerMode}`);
}

const registry = createRegistry(provider());
const app = new Elysia()
  .get("/health", () => ({ ok: true, mode: providerMode }))
  .ws("/rpc/v1", {
    beforeHandle({ request, set }) {
      const origin = request.headers.get("origin");
      if (origin && !allowedOrigins.has(origin)) {
        set.status = 403;
        return "Forbidden origin";
      }
    },
    async message(socket, message) {
      let response;
      try {
        const payload = typeof message === "string" ? message : new TextDecoder().decode(message as ArrayBuffer);
        if (payload.length > 65536) throw new RpcException(-32600, "Request too large");
        const request = JSON.parse(payload);
        response = await registry.dispatch(request, localPrincipal);
      } catch (error) {
        const rpc = error instanceof RpcException ? error : new RpcException(-32700, "Parse error");
        response = { jsonrpc: "2.0", id: null, error: { code: rpc.code, message: rpc.message } };
      }
      socket.send(JSON.stringify(response));
    },
  })
  .listen({ hostname: "127.0.0.1", port });

console.log(`ArchimedesOS middleware (${providerMode}) listening on http://127.0.0.1:${port}`);
export type App = typeof app;
