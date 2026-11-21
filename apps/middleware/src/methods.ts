import { EMPTY_PARAMS_SCHEMA, type HostCapability, type SessionPrincipal, type SystemInfo } from "../../../shared/contracts";
import { RpcException, RpcRegistry } from "./rpc";
import type { HostProvider } from "./providers/types";
import { requireCapability } from "./providers/types";

const APP_VERSION = "0.1.0";
const permissions: Record<string, HostCapability> = {
  "system.v1.info": "system.read",
  "host.v1.info": "host.read",
  "docker.v1.containers": "containers.read",
  "docker.v1.images": "images.read",
  "docker.v1.networks": "networks.read",
  "docker.v1.volumes": "volumes.read",
};

export function createRegistry(provider: HostProvider): RpcRegistry {
  const registry = new RpcRegistry();
  const register = (name: string, capability: HostCapability, execute: () => Promise<unknown>) => {
    registry.register(name, {
      params: EMPTY_PARAMS_SCHEMA,
      permission: capability,
      execute: async (_params, principal) => {
        requireCapability(provider, capability);
        authorizeHost(provider, principal);
        return await execute();
      },
    });
  };

  registry.register("system.v1.info", {
    params: EMPTY_PARAMS_SCHEMA,
    permission: "system.read",
    execute: (): SystemInfo => ({
      name: "ArchimedesOS middleware",
      version: APP_VERSION,
      mode: provider.mode,
      protocol: "archimedes.rpc.v1",
      hostTypes: [provider.type],
      capabilities: [...provider.capabilities],
    }),
  });
  register("host.v1.info", "host.read", () => provider.host());
  register("docker.v1.containers", "containers.read", () => provider.containers());
  register("docker.v1.images", "images.read", () => provider.images());
  register("docker.v1.networks", "networks.read", () => provider.networks());
  register("docker.v1.volumes", "volumes.read", () => provider.volumes());
  registry.register("inventory.v1.snapshot", {
    params: EMPTY_PARAMS_SCHEMA,
    permission: "inventory.read",
    execute: async (_params, principal) => {
      authorizeHost(provider, principal);
      const capabilities: HostCapability[] = ["host.read", "containers.read", "images.read", "networks.read", "volumes.read"];
      for (const capability of capabilities) requireCapability(provider, capability);
      const [host, containers, images, networks, volumes] = await Promise.all([
        provider.host(), provider.containers(), provider.images(), provider.networks(), provider.volumes(),
      ]);
      return { hosts: [host], containers, images, networks, volumes };
    },
  });
  return registry;
}

function authorizeHost(provider: HostProvider, principal: SessionPrincipal): void {
  if (principal.hostIds.length && !principal.hostIds.includes(provider.id)) {
    throw new RpcException(-32004, "Host access denied", { hostId: provider.id });
  }
}

export const rpcPermissions = permissions;
