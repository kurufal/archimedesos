import { describe, expect, test } from "bun:test";
import { LocalDockerProvider, type DockerTransport } from "../src/providers/docker";

class FixtureTransport implements DockerTransport {
  readonly paths: string[] = [];
  constructor(private readonly fixtures: Record<string, unknown>) {}
  async get<T>(path: string): Promise<T> {
    this.paths.push(path);
    if (!(path in this.fixtures)) throw new Error(`Unexpected Docker request: ${path}`);
    return this.fixtures[path] as T;
  }
}

describe("LocalDockerProvider", () => {
  test("negotiates the highest supported client API once", async () => {
    const transport = new FixtureTransport({
      "/version": { Version: "27.3.1", ApiVersion: "1.47", MinAPIVersion: "1.24" },
      "/v1.44/info": { Name: "dev-vm", OperatingSystem: "Arch Linux", NCPU: 8, MemTotal: 8 * 1024 ** 3, ServerVersion: "27.3.1" },
    });
    const provider = new LocalDockerProvider(transport);
    const host = await provider.host();
    expect(host.apiVersion).toBe("1.44");
    expect(host.health).toBe("Docker 27.3.1");
    await provider.host();
    expect(transport.paths.filter((path) => path === "/version")).toHaveLength(1);
  });
  test("maps read-only inventory and container health", async () => {
    const transport = new FixtureTransport({
      "/version": { Version: "27", ApiVersion: "1.44" },
      "/v1.44/containers/json?all=1": [{ Id: "abcdef012345", Names: ["/web"], Image: "nginx:latest", State: "running", Status: "Up 2 hours (unhealthy)", Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: "tcp" }], Labels: { "com.docker.compose.project": "site" } }],
      "/v1.44/images/json?all=0": [{ Id: "sha256:1", RepoTags: ["nginx:latest"], Size: 104857600, Created: 1700000000 }],
      "/v1.44/networks": [{ Id: "network-1", Name: "site_default", Driver: "bridge", Scope: "local", IPAM: { Config: [{ Subnet: "172.20.0.0/16", Gateway: "172.20.0.1" }] }, Labels: {} }],
      "/v1.44/volumes": { Volumes: [{ Name: "site-data", Driver: "local", Mountpoint: "/var/lib/docker/volumes/site-data/_data" }] },
    });
    const provider = new LocalDockerProvider(transport);
    expect((await provider.containers())[0]).toMatchObject({ name: "web", status: "Unhealthy", ports: "8080:80/tcp", project: "site" });
    expect((await provider.images())[0]).toMatchObject({ repository: "nginx", tag: "latest", size: "100 MB" });
    expect((await provider.networks())[0]).toMatchObject({ subnet: "172.20.0.0/16" });
    expect((await provider.volumes())[0]).toMatchObject({ name: "site-data" });
  });
});
