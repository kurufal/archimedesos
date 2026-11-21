import type { HostProvider } from "./types";
import type { ContainerInfo, HostCapability, HostInfo, ImageInfo, NetworkInfo, VolumeInfo } from "../../../../shared/contracts";

interface DockerVersion { Version: string; ApiVersion: string; MinAPIVersion?: string }
interface DockerInfo { Name: string; OperatingSystem?: string; NCPU?: number; MemTotal?: number; ServerVersion?: string; ContainersRunning?: number; ContainersPaused?: number; ContainersStopped?: number }
interface DockerContainer { Id: string; Names: string[]; Image: string; State: string; Status: string; Ports: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: string }>; Labels?: Record<string,string> }
interface DockerImage { Id: string; RepoTags: string[] | null; Size: number; Created: number }
interface DockerNetwork { Id: string; Name: string; Driver?: string; Scope?: string; IPAM?: { Config?: Array<{ Subnet?: string; Gateway?: string }> }; Labels?: Record<string,string> }
interface DockerVolume { Name: string; Driver: string; Mountpoint: string; Labels?: Record<string,string> }

export interface DockerTransport {
  get<T>(path: string): Promise<T>;
}

export class DockerUnixSocketTransport implements DockerTransport {
  constructor(private readonly socketPath: string) {}
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`http://docker${path}`, { unix: this.socketPath } as RequestInit & { unix: string });
    if (!response.ok) throw new Error(`Docker API ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return await response.json() as T;
  }
}

export class LocalDockerProvider implements HostProvider {
  readonly type = "docker-local";
  readonly mode = "live" as const;
  readonly capabilities = new Set<HostCapability>([
    "system.read", "host.read", "containers.read", "images.read", "networks.read", "volumes.read",
  ]);
  private negotiation?: Promise<DockerVersion & { prefix: string }>;

  constructor(private readonly transport: DockerTransport, readonly id = "local") {}

  async api(): Promise<DockerVersion & { prefix: string }> {
    this.negotiation ??= this.negotiate();
    return await this.negotiation.catch((error) => {
      this.negotiation = undefined;
      throw error;
    });
  }

  private async negotiate(): Promise<DockerVersion & { prefix: string }> {
    const version = await this.transport.get<DockerVersion>("/version");
    const desired = process.env.DOCKER_API_VERSION ?? "1.44";
    const selected = compareVersions(version.ApiVersion, desired) < 0 ? version.ApiVersion : desired;
    if (version.MinAPIVersion && compareVersions(selected, version.MinAPIVersion) < 0) {
      throw new Error(`Docker Engine requires API ${version.MinAPIVersion}; configured ${selected} is older`);
    }
    return { ...version, ApiVersion: selected, prefix: `/v${selected}` };
  }

  async host(): Promise<HostInfo> {
    const api = await this.api();
    const info = await this.transport.get<DockerInfo>(`${api.prefix}/info`);
    return {
      id: this.id,
      name: info.Name || "Local Docker",
      hostname: info.Name || "localhost",
      ip: "127.0.0.1",
      os: info.OperatingSystem || "Local host",
      cpu: "Unknown processor",
      cores: `${info.NCPU ?? 0} CPUs`,
      usage: 0,
      ram: Math.round((info.MemTotal ?? 0) / 1024 ** 3),
      memory: 0,
      disk: 0,
      storage: 0,
      uptime: "Unknown",
      local: true,
      online: true,
      health: `Docker ${api.Version}`,
      provider: this.type,
      dockerVersion: api.Version,
      apiVersion: api.ApiVersion,
    };
  }

  async containers(): Promise<ContainerInfo[]> {
    const { prefix } = await this.api();
    const items = await this.transport.get<DockerContainer[]>(`${prefix}/containers/json?all=1`);
    return items.map((item) => ({
      id: item.Id,
      name: item.Names[0]?.replace(/^\//, "") ?? item.Id.slice(0, 12),
      host: this.id,
      image: item.Image,
      project: item.Labels?.["com.docker.compose.project"] ?? "",
      status: containerStatus(item),
      cpu: 0,
      memory: 0,
      ports: item.Ports.filter((port) => port.PublicPort).map((port) => `${port.IP && port.IP !== "0.0.0.0" ? `${port.IP}:` : ""}${port.PublicPort}:${port.PrivatePort}/${port.Type}`).join(", "),
      uptime: item.Status,
    }));
  }

  async images(): Promise<ImageInfo[]> {
    const { prefix } = await this.api();
    const items = await this.transport.get<DockerImage[]>(`${prefix}/images/json?all=0`);
    return items.flatMap((item) => (item.RepoTags?.length ? item.RepoTags : ["<none>:<none>"]).map((reference) => {
      const separator = reference.lastIndexOf(":");
      return { name: reference, host: this.id, repository: separator > 0 ? reference.slice(0, separator) : reference, tag: separator > 0 ? reference.slice(separator + 1) : "", id: item.Id, size: formatBytes(item.Size), created: new Date(item.Created * 1000).toISOString().slice(0, 10) };
    }));
  }

  async networks(): Promise<NetworkInfo[]> {
    const { prefix } = await this.api();
    const items = await this.transport.get<DockerNetwork[]>(`${prefix}/networks`);
    return items.map((item) => ({ id: item.Id, name: item.Name, host: this.id, driver: item.Driver ?? "", scope: item.Scope ?? "", subnet: item.IPAM?.Config?.[0]?.Subnet ?? "", gateway: item.IPAM?.Config?.[0]?.Gateway ?? "", project: item.Labels?.["com.docker.compose.project"] ?? "" }));
  }

  async volumes(): Promise<VolumeInfo[]> {
    const { prefix } = await this.api();
    const result = await this.transport.get<{ Volumes: DockerVolume[] | null }>(`${prefix}/volumes`);
    return (result.Volumes ?? []).map((item) => ({ name: item.Name, host: this.id, driver: item.Driver, mountpoint: item.Mountpoint, size: "Unknown", container: "" }));
  }
}

function containerStatus(item: DockerContainer): ContainerInfo["status"] {
  if (item.State === "running") return item.Status.toLowerCase().includes("unhealthy") ? "Unhealthy" : "Running";
  if (item.State === "restarting") return "Restarting";
  return "Stopped";
}
function compareVersions(left: string, right: string): number {
  const a = left.split(".").map(Number), b = right.split(".").map(Number);
  return (a[0]! - b[0]!) || (a[1]! - b[1]!);
}
function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
