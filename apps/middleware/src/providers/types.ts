import type {
  ContainerInfo,
  HostCapability,
  HostInfo,
  ImageInfo,
  NetworkInfo,
  VolumeInfo,
} from "../../../../shared/contracts";

export interface HostProvider {
  readonly id: string;
  readonly type: string;
  readonly mode: "live" | "demo";
  readonly capabilities: ReadonlySet<HostCapability>;
  host(): Promise<HostInfo>;
  containers(): Promise<ContainerInfo[]>;
  images(): Promise<ImageInfo[]>;
  networks(): Promise<NetworkInfo[]>;
  volumes(): Promise<VolumeInfo[]>;
}

export function requireCapability(provider: HostProvider, capability: HostCapability): void {
  if (!provider.capabilities.has(capability)) {
    throw new Error(`Provider ${provider.id} does not support ${capability}`);
  }
}
