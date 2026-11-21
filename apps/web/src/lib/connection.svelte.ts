import type { InventorySnapshot, RpcRequest, RpcResponse, SystemInfo } from "../../../../shared/contracts";

export const inventoryProvider = (import.meta.env.VITE_ARCHIMEDES_PROVIDER as string | undefined) ?? "live";
export const connection = $state({
  mode: inventoryProvider === "demo" ? "demo" as const : "live" as const,
  status: inventoryProvider === "demo" ? "demo" as const : "connecting" as const,
  error: "",
  system: null as SystemInfo | null,
});

let socket: WebSocket | null = null;
let requestId = 0;
const pending = new Map<number, string>();
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let applySnapshot: ((snapshot: InventorySnapshot) => void) | undefined;

export function connectInventory(apply: (snapshot: InventorySnapshot) => void): void {
  applySnapshot = apply;
  if (connection.mode === "demo" || socket) return;
  openSocket();
}

export function disconnectInventory(): void {
  clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}

function openSocket(): void {
  connection.status = "connecting";
  connection.error = "";
  const endpoint = (import.meta.env.VITE_ARCHIMEDES_RPC_URL as string | undefined) ?? "ws://127.0.0.1:4730/rpc/v1";
  socket = new WebSocket(endpoint);
  socket.onopen = () => {
    request("system.v1.info");
    request("inventory.v1.snapshot");
  };
  socket.onmessage = (event) => {
    let response: RpcResponse;
    try { response = JSON.parse(String(event.data)) as RpcResponse; } catch { return; }
    if ("result" in response) {
      const id = Number(response.id);
      const method = pending.get(id);
      pending.delete(id);
      if (method === "system.v1.info") connection.system = response.result as SystemInfo;
      else if (method === "inventory.v1.snapshot") {
        applySnapshot?.(response.result as InventorySnapshot);
        connection.status = "connected";
        connection.error = "";
      }
      return;
    }
    connection.status = "error";
    connection.error = `${response.error.message} (${response.error.code})`;
  };
  socket.onerror = () => {
    connection.status = "error";
    connection.error = "Cannot reach the local ArchimedesOS middleware.";
  };
  socket.onclose = () => {
    socket = null;
    if (connection.status !== "error") connection.error = "Middleware connection closed.";
    connection.status = "error";
    reconnectTimer = setTimeout(openSocket, 5000);
  };
}

function request(method: string): void {
  const id = ++requestId;
  pending.set(id, method);
  const payload: RpcRequest = { jsonrpc: "2.0", id, method, params: {} };
  socket?.send(JSON.stringify(payload));
}
