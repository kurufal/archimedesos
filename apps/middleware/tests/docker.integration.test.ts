import { describe, expect, test } from "bun:test";
import { DockerUnixSocketTransport, LocalDockerProvider } from "../src/providers/docker";

const socket = process.env.ARCHIMEDES_DOCKER_TEST_SOCKET;
describe.skipIf(!socket)("Docker Unix socket integration", () => {
  test("reads a negotiated disposable Docker environment", async () => {
    const provider = new LocalDockerProvider(new DockerUnixSocketTransport(socket!));
    const host = await provider.host();
    const containers = await provider.containers();
    expect(host.apiVersion).toMatch(/^\d+\.\d+$/);
    expect(Array.isArray(containers)).toBe(true);
  });
});
