export const RPC_PROTOCOL = "archimedes.rpc.v1" as const;

export type RpcId = string | number | null;
export interface RpcRequest<TParams = unknown> {
  jsonrpc: "2.0";
  id: RpcId;
  method: string;
  params?: TParams;
}
export interface RpcSuccess<TResult = unknown> {
  jsonrpc: "2.0";
  id: RpcId;
  result: TResult;
}
export interface RpcError {
  jsonrpc: "2.0";
  id: RpcId;
  error: { code: number; message: string; data?: unknown };
}
export type RpcResponse<TResult = unknown> = RpcSuccess<TResult> | RpcError;

export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  const?: unknown;
};

export type HostCapability =
  | "system.read"
  | "host.read"
  | "containers.read"
  | "images.read"
  | "networks.read"
  | "volumes.read";

export interface SessionPrincipal {
  subject: string;
  permissions: string[];
  hostIds: string[];
}
export interface SystemInfo {
  name: string;
  version: string;
  mode: "live" | "demo";
  protocol: typeof RPC_PROTOCOL;
  hostTypes: string[];
  capabilities: HostCapability[];
}
export interface HostInfo {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  os: string;
  cpu: string;
  cores: string;
  usage: number;
  ram: number;
  memory: number;
  disk: number;
  storage: number;
  uptime: string;
  local: boolean;
  online: boolean;
  health: string;
  provider: string;
  dockerVersion?: string;
  apiVersion?: string;
}
export interface ContainerInfo {
  id: string;
  name: string;
  host: string;
  image: string;
  project: string;
  status: "Running" | "Stopped" | "Unhealthy" | "Restarting";
  cpu: number;
  memory: number;
  ports: string;
  uptime: string;
}
export interface ImageInfo {
  name: string;
  host: string;
  repository: string;
  tag: string;
  id: string;
  size: string;
  created: string;
}
export interface NetworkInfo {
  id: string;
  name: string;
  host: string;
  driver: string;
  scope: string;
  subnet: string;
  gateway: string;
  project: string;
}
export interface VolumeInfo {
  name: string;
  host: string;
  driver: string;
  mountpoint: string;
  size: string;
  container: string;
}
export interface InventorySnapshot {
  hosts: HostInfo[];
  containers: ContainerInfo[];
  images: ImageInfo[];
  networks: NetworkInfo[];
  volumes: VolumeInfo[];
}

export type RpcMethods = {
  "system.v1.info": { params: Record<string, never>; result: SystemInfo };
  "host.v1.info": { params: Record<string, never>; result: HostInfo };
  "docker.v1.containers": { params: Record<string, never>; result: ContainerInfo[] };
  "docker.v1.images": { params: Record<string, never>; result: ImageInfo[] };
  "docker.v1.networks": { params: Record<string, never>; result: NetworkInfo[] };
  "docker.v1.volumes": { params: Record<string, never>; result: VolumeInfo[] };
  "inventory.v1.snapshot": { params: Record<string, never>; result: InventorySnapshot };
};

export type RpcMethodName = keyof RpcMethods;
export const EMPTY_PARAMS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};
