import type {
  JsonSchema,
  RpcError,
  RpcId,
  RpcRequest,
  RpcResponse,
  SessionPrincipal,
} from "../../../shared/contracts";

export class RpcException extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
  }
}

export interface RpcMethod<Params = unknown, Result = unknown> {
  params: JsonSchema;
  permission: string;
  execute: (params: Params, principal: SessionPrincipal) => Promise<Result> | Result;
}

export class RpcRegistry {
  private readonly methods = new Map<string, RpcMethod>();

  register(name: string, method: RpcMethod): void {
    if (this.methods.has(name)) throw new Error(`RPC method already registered: ${name}`);
    this.methods.set(name, method);
  }

  async dispatch(input: unknown, principal: SessionPrincipal): Promise<RpcResponse> {
    const id = requestId(input);
    try {
      const request = parseRequest(input);
      const method = this.methods.get(request.method);
      if (!method) throw new RpcException(-32601, "Method not found");
      if (!principal.permissions.includes(method.permission)) {
        throw new RpcException(-32004, "Insufficient permission");
      }
      const params = request.params ?? {};
      const violations = validateSchema(method.params, params, "params");
      if (violations.length) {
        throw new RpcException(-32602, "Invalid params", { violations });
      }
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: await method.execute(params, principal),
      };
    } catch (error) {
      return rpcError(id, error);
    }
  }
}

function requestId(input: unknown): RpcId {
  if (!input || typeof input !== "object") return null;
  const candidate = (input as { id?: unknown }).id;
  return typeof candidate === "string" || typeof candidate === "number" || candidate === null
    ? candidate
    : null;
}

export function parseRequest(input: unknown): RpcRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RpcException(-32600, "Invalid Request");
  }
  const request = input as Record<string, unknown>;
  if (
    request.jsonrpc !== "2.0" ||
    typeof request.method !== "string" ||
    !request.method ||
    !(typeof request.id === "string" || typeof request.id === "number" || request.id === null)
  ) {
    throw new RpcException(-32600, "Invalid Request");
  }
  return request as unknown as RpcRequest;
}

export function validateSchema(schema: JsonSchema, value: unknown, path = "value"): string[] {
  const errors: string[] = [];
  if (schema.type && !matchesType(schema.type, value)) return [`${path}: expected ${schema.type}`];
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: expected constant value`);
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) errors.push(`${path}: not in enum`);
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${path}: below minLength`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => errors.push(...validateSchema(schema.items!, item, `${path}[${index}]`)));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in record) errors.push(...validateSchema(child, record[key], `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(record)) {
        if (!(key in (schema.properties ?? {}))) errors.push(`${path}.${key}: additional property`);
      }
    }
  }
  return errors;
}

function matchesType(type: NonNullable<JsonSchema["type"]>, value: unknown): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type || (type === "number" && typeof value === "number" && Number.isFinite(value));
}

function rpcError(id: RpcId, error: unknown): RpcError {
  if (error instanceof RpcException) {
    return { jsonrpc: "2.0", id, error: { code: error.code, message: error.message, data: error.data } };
  }
  console.error("Unhandled RPC error", error);
  return { jsonrpc: "2.0", id, error: { code: -32603, message: "Internal error" } };
}
