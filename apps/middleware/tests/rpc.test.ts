import { describe, expect, test } from "bun:test";
import { RpcRegistry, validateSchema } from "../src/rpc";
import type { SessionPrincipal } from "../../../shared/contracts";

const principal: SessionPrincipal = { subject: "test", permissions: ["inventory.read"], hostIds: ["local"] };

describe("RPC 2.0 registry", () => {
  test("registers methods explicitly and validates params", async () => {
    const registry = new RpcRegistry();
    registry.register("test.read", {
      permission: "inventory.read",
      params: { type: "object", required: ["limit"], additionalProperties: false, properties: { limit: { type: "integer", minimum: 1, maximum: 10 } } },
      execute: (params) => params,
    });
    expect(await registry.dispatch({ jsonrpc: "2.0", id: 1, method: "test.read", params: { limit: 0 } }, principal)).toMatchObject({ error: { code: -32602 } });
    expect(await registry.dispatch({ jsonrpc: "2.0", id: 1, method: "test.read", params: { limit: 2 } }, principal)).toEqual({ jsonrpc: "2.0", id: 1, result: { limit: 2 } });
  });
  test("returns structured request, method, and permission errors", async () => {
    const registry = new RpcRegistry();
    expect(await registry.dispatch({ method: "test" }, principal)).toMatchObject({ error: { code: -32600 } });
    expect(await registry.dispatch({ jsonrpc: "2.0", id: "x", method: "unknown" }, principal)).toMatchObject({ id: "x", error: { code: -32601 } });
    registry.register("secret.read", { params: { type: "object" }, permission: "secret.read", execute: () => true });
    expect(await registry.dispatch({ jsonrpc: "2.0", id: 2, method: "secret.read" }, principal)).toMatchObject({ error: { code: -32004 } });
  });
  test("JSON Schema-compatible validation reports additional properties", () => {
    expect(validateSchema({ type: "object", additionalProperties: false, properties: { name: { type: "string", minLength: 1 } } }, { name: "", extra: true })).toEqual([
      "value.name: below minLength",
      "value.extra: additional property",
    ]);
  });
});
