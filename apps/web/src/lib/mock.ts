export const navigation = [
  { section:'Management', label:'Dashboard', route:'/', icon:'LayoutDashboard' },
  { section:'Management', label:'Updates', route:'/updates/', icon:'Download' },
  { section:'Management', label:'Projects', route:'/projects/', icon:'FolderGit2' },
  { section:'Management', label:'Security', route:'/security/', icon:'ShieldCheck' },
  { section:'Management', label:'Systems', route:'/systems/', icon:'Server' },
  { section:'Resources', label:'Containers', route:'/containers/', icon:'Box' },
  { section:'Resources', label:'Images', route:'/images/', icon:'Layers' },
  { section:'Resources', label:'Networks', route:'/networks/', icon:'Network' },
  { section:'Resources', label:'Volumes', route:'/volumes/', icon:'Database' },
  { section:'Tools', label:'Files', route:'/files/', icon:'FolderOpen' },
  { section:'Tools', label:'Terminal', route:'/terminal/', icon:'Terminal' },
  { section:'Administration', label:'Logs', route:'/logs/', icon:'ScrollText' },
  { section:'Administration', label:'Settings', route:'/settings/', icon:'Settings' },
] as const;
export const groups = Object.fromEntries([...new Set(navigation.map(item => item.section))].map(section => [section, navigation.filter(item => item.section === section)]));
export const sections = navigation.map(item => item.route.slice(1,-1)).filter(section => section && section !== 'files' && section !== 'terminal');
export type Host = {
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
};
export const hosts: Host[] = [
  {
    id: "core",
    name: "Archimedes Core",
    hostname: "arch-core.local",
    ip: "192.0.2.10",
    os: "ArchimedesOS / Arch Linux",
    cpu: "AMD Ryzen 7 5700G",
    cores: "8C / 16T",
    usage: 24,
    ram: 32,
    memory: 38,
    disk: 1000,
    storage: 42,
    uptime: "18d 6h",
    local: true,
    online: true,
    health: "Docker healthy",
  },
  {
    id: "compute",
    name: "Compute Node",
    hostname: "compute-01.local",
    ip: "192.0.2.21",
    os: "Debian 12",
    cpu: "Intel Core i5-12500",
    cores: "6C / 12T",
    usage: 46,
    ram: 64,
    memory: 52,
    disk: 2000,
    storage: 34,
    uptime: "42d 11h",
    local: false,
    online: true,
    health: "Docker healthy",
  },
  {
    id: "storage",
    name: "Storage Array",
    hostname: "nas-01.local",
    ip: "192.0.2.32",
    os: "TrueNAS SCALE 24.10",
    cpu: "Intel Xeon E-2336",
    cores: "6C / 12T",
    usage: 12,
    ram: 64,
    memory: 68,
    disk: 16000,
    storage: 61,
    uptime: "76d 3h",
    local: false,
    online: true,
    health: "ZFS healthy",
  },
  {
    id: "edge",
    name: "Edge Node",
    hostname: "edge-02.local",
    ip: "192.0.2.43",
    os: "Ubuntu Server 24.04",
    cpu: "Intel N100",
    cores: "4C / 4T",
    usage: 0,
    ram: 16,
    memory: 0,
    disk: 512,
    storage: 0,
    uptime: "Unavailable",
    local: false,
    online: false,
    health: "Agent unavailable",
  },
];
export interface Project {
  name: string;
  host: string;
  path: string;
  updated: string;
  repo: string;
}
export const projects: Project[] = [
  ["Gateway", "core"],
  ["Observability", "core"],
  ["Media Stack", "compute"],
  ["Storage Tools", "storage"],
].map(([name, host]) => ({
  name,
  host,
  path: `/srv/${name.toLowerCase().replaceAll(" ", "-")}/compose.yaml`,
  updated: "09:36 UTC",
  repo: `demo/${name.toLowerCase().replaceAll(" ", "-")}`,
}));
export type ContainerStatus =
  "Running" | "Stopped" | "Unhealthy" | "Restarting";
export interface Container {
  name: string;
  host: string;
  image: string;
  project: string;
  status: ContainerStatus;
  cpu: number;
  memory: number;
  ports: string;
  uptime: string;
}
export const resourceId = (host: string, name: string) => JSON.stringify([host, name]);
export const projectMembers = (project: Pick<Project, 'host' | 'name'>, items: Container[]) => items.filter(item => resourceId(item.host, item.project) === resourceId(project.host, project.name));
export function projectHealth(items: Container[]) {
  if (!items.length) return 'Missing';
  if (items.every(item => item.status === 'Running')) return 'Healthy';
  if (items.every(item => item.status === 'Stopped')) return 'Stopped';
  if (items.some(item => item.status === 'Unhealthy' || item.status === 'Restarting')) return 'Degraded';
  return 'Partially running';
}
const services = [
  ["traefik", "redis", "whoami"],
  ["grafana", "prometheus", "loki", "node-exporter"],
  ["jellyfin", "radarr", "sonarr", "prowlarr"],
  ["minio", "syncthing"],
];
export const containers: Container[] = services.flatMap((names, group) =>
  names.map((name, index) => ({
    name,
    host: projects[group].host,
    image: `${name}:stable`,
    project: projects[group].name,
    status: (index === 2 && group !== 1
      ? "Stopped"
      : name === "loki"
        ? "Unhealthy"
        : name === "prowlarr"
          ? "Restarting"
          : "Running") as ContainerStatus,
    cpu: index === 2 && group !== 1 ? 0 : 3 + index * 2,
    memory: index === 2 && group !== 1 ? 0 : 96 + index * 44,
    ports: `${8080 + group * 10 + index}:80`,
    uptime: index === 2 && group !== 1 ? "--" : "3d 4h",
  })),
);
export interface Image {
  name: string;
  host: string;
  repository: string;
  tag: string;
  id: string;
  size: string;
  created: string;
}
export function serviceProcesses(item: Container) {
  return item.status === 'Stopped' ? [] : [{ pid: 1, command: item.name, cpu: item.cpu, memory: item.memory }];
}
export const images: Image[] = [
  ...containers.map(({ image, host }) => ({ name: image, host })),
  { name: "alpine:3.20", host: "core" },
].map((image, index) => ({
  ...image,
  repository: image.name.split(":")[0],
  tag: image.name.split(":")[1],
  id: `sha256:${(0xac393fed + index).toString(16)}`,
  size: `${31 + index * 12} MB`,
  created: "2026-11-12",
}));
export interface Network {
  name: string;
  host: string;
  driver: string;
  scope: string;
  subnet: string;
  gateway: string;
  project: string;
}
export interface Volume {
  name: string;
  host: string;
  driver: string;
  mountpoint: string;
  size: string;
  container: string;
}
export const networks: Network[] = projects.map((project, index) => ({
  name: project.name.toLowerCase().replaceAll(" ", "-") + "_default",
  host: project.host,
  driver: "bridge",
  scope: "local",
  subnet: `172.${20 + index}.0.0/16`,
  gateway: `172.${20 + index}.0.1`,
  project: project.name,
}));
export const volumes: Volume[] = containers
  .filter((_, index) => index % 2 === 0)
  .map((item) => ({
    name: item.name + "_data",
    host: item.host,
    driver: "local",
    mountpoint: `/var/lib/docker/volumes/${item.name}_data/_data`,
    size: "2.4 GB",
    container: item.name,
  }));
export interface UpdateJob {
  name: string;
  host: string;
  type: string;
  version: string;
  status: string;
}
export const updates: UpdateJob[] = [
  ["grafana", "core", "Image", "11.2.1", "Available"],
  ["linux", "core", "System package", "6.12.4", "Available"],
  ["jellyfin", "compute", "Image", "10.10.2", "Available"],
  ["minio", "storage", "Image", "2026.11", "Pending"],
  ["systemd", "compute", "System package", "257", "In progress"],
  ["redis", "core", "Image", "7.4", "Completed"],
].map(([name, host, type, version, status]) => ({
  name,
  host,
  type,
  version,
  status,
}));
export interface Activity {
  id: number;
  name: string;
  subject: string;
  host: string;
  status: 'Active' | 'Queued' | 'Completed' | 'Failed' | 'Cancelled';
  progress: number;
  time: string;
  total?: number;
  speed?: number;
  art?: string;
  startedAt?: number;
  finishedAt?: number;
  update?: Pick<UpdateJob,'host'|'name'|'version'|'type'>;
}
export const activities: Activity[] = [
  {
    id: 6,
    name: "Pulling application image",
    subject: "grafana:stable",
    host: "core",
    status: "Active",
    progress: 64,
    time: "09:42:18",
    total: 186,
    speed: 8.4,
    art: "/assets/grafana-demo.svg",
  },
  {
    id: 5,
    name: "System package update",
    subject: "systemd",
    host: "compute",
    status: "Active",
    progress: 32,
    time: "09:41:12",
    update: {host:'compute',name:'systemd',type:'System package',version:'257'},
  },
  {
    id: 4,
    name: "Project deployment",
    subject: "Media Stack",
    host: "compute",
    status: "Queued",
    progress: 0,
    time: "09:40:52",
  },
  {
    id: 3,
    name: "Configuration saved",
    subject: "Gateway / compose.yaml",
    host: "core",
    status: "Completed",
    progress: 100,
    time: "09:36:04",
  },
  {
    id: 2,
    name: "Container restart",
    subject: "loki",
    host: "core",
    status: "Failed",
    progress: 0,
    time: "09:34:18",
  },
  {
    id: 1,
    name: "Image update",
    subject: "redis:stable",
    host: "core",
    status: "Completed",
    progress: 100,
    time: "09:32:26",
  },
];
export const logs = [
  {
    time: "09:42:18",
    source: "System",
    host: "core",
    message: "Demo agent heartbeat received",
  },
  {
    time: "09:41:12",
    source: "System",
    host: "compute",
    message: "Package transaction started",
  },
  ...containers.map((item) => ({
    time: "09:30:00",
    source: "Container",
    host: item.host,
    message: `${item.name}: ${item.status.toLowerCase()}`,
  })),
];
export const security = {
  Users: [
    { name: "Demo operator", role: "Administrator", scope: "All demo systems" },
    { name: "Observer", role: "Viewer", scope: "Read inventory" },
  ],
  Sessions: [
    { name: "Local browser", role: "Interactive", scope: "Demo operator" },
  ],
  "API keys": [
    { name: "Inventory reader", role: "Demo key", scope: "inventory:read" },
  ],
  Permissions: [
    { name: "Administrator", role: "Read / write", scope: "Demo resources" },
    { name: "Viewer", role: "Read only", scope: "Inventory" },
  ],
  Audit: [{ name: "09:32:26", role: "Demo operator", scope: "Image updated" }],
};
export function workspace(project: Project) {
  const members = projectMembers(project, containers);
  return {
    "compose.yaml":
      "services:\n" +
      members
        .map(
          (item) =>
            `  ${item.name}:\n    image: ${item.image}\n    ports: ["${item.ports}"]`,
        )
        .join("\n") +
      "\n",
    "compose.override.yaml": "services: {}\n",
    ".env": "DEMO_MODE=true\nDEMO_TOKEN=synthetic-example\n",
    "config/app.json": '{\n  "demo": true\n}\n',
    "config/rules/site.xml": '<site mode="demo" />\n',
    "logs/service.log": "09:30:00 Demo workspace initialized\n",
    "data/cache.db": null,
  } as Record<string, string | null>;
}
export function totals(
  host: string,
  items: Container[] = containers,
  available = updates,
  inventory = images,
  storage = volumes,
) {
  const matches = (item: { host: string }) => !host || item.host === host;
  const subset = items.filter(matches);
  return [
    subset.filter(
      (item) => item.status === "Running" || item.status === "Unhealthy",
    ).length,
    subset.filter((item) => item.status === "Stopped").length,
    subset.length,
    inventory.filter(matches).length,
    storage.filter(matches).length,
    available.filter((item) => matches(item) && item.status === "Available")
      .length,
  ];
}
