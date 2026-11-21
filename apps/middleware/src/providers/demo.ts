import type { HostProvider } from "./types";
import type { ContainerInfo, HostCapability, HostInfo, ImageInfo, NetworkInfo, VolumeInfo } from "../../../../shared/contracts";

export interface DemoProviderData {
  host: HostInfo;
  containers: ContainerInfo[];
  images: ImageInfo[];
  networks: NetworkInfo[];
  volumes: VolumeInfo[];
}

export class DemoProvider implements HostProvider {
  readonly id = "demo-local";
  readonly type = "demo";
  readonly mode = "demo" as const;
  readonly capabilities = new Set<HostCapability>([
    "system.read", "host.read", "containers.read", "images.read", "networks.read", "volumes.read",
  ]);

  constructor(private readonly data: DemoProviderData) {}
  async host(): Promise<HostInfo> { return structuredClone(this.data.host); }
  async containers(): Promise<ContainerInfo[]> { return structuredClone(this.data.containers); }
  async images(): Promise<ImageInfo[]> { return structuredClone(this.data.images); }
  async networks(): Promise<NetworkInfo[]> { return structuredClone(this.data.networks); }
  async volumes(): Promise<VolumeInfo[]> { return structuredClone(this.data.volumes); }
}
