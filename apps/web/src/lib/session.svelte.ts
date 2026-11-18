import * as seed from "./mock";
export const defaultSettings = { "Show host addresses": true, "Show volume sizes": true };
export const demo = $state({
  host: "",
  collapsed: false,
  activity: false,
  views: {} as Record<string, string>,
  toast: "",
  containers: structuredClone(seed.containers),
  containerLogs: seed.logs.filter(entry => entry.source === 'Container').map(entry => ({...entry})),
  images: structuredClone(seed.images),
  volumes: structuredClone(seed.volumes),
  networks: structuredClone(seed.networks),
  updates: structuredClone(seed.updates),
  clearedVersions: [] as string[],
  updateChecks: {} as Record<string, string>,
  activities: structuredClone(seed.activities),
  files: Object.fromEntries(
    seed.projects.map((project) => [project.name, seed.workspace(project)]),
  ),
  settings: { ...defaultSettings } as Record<string, boolean>,
  connections: {} as Record<string, string>,
  keys: structuredClone(seed.security["API keys"]),
  backups: {} as Record<string, string>,
  directories: Object.fromEntries(seed.projects.map(project => [project.name, [] as string[]])),
});
export const hostName = (id: string) =>
  seed.hosts.find((host) => host.id === id)?.name ?? id;
const versionKey = (job: seed.UpdateJob) => JSON.stringify([job.host, job.type, job.name, job.version]);
export function clearCompletedUpdates(host: string) {
  demo.updates = demo.updates.filter(job => {
    if (job.status !== 'Completed' || (host && job.host !== host)) return true;
    demo.clearedVersions.push(versionKey(job));
    return false;
  });
  notify('Completed updates cleared');
}
export function refreshUpdates(host: string) {
  const known = new Set([...demo.clearedVersions, ...demo.updates.map(versionKey)]);
  const time = new Date().toISOString().slice(11, 19) + ' UTC';
  for (const system of seed.hosts.filter(system => system.online && (!host || system.id === host))) {
    demo.updateChecks[system.id] = time;
    for (const job of seed.updates.filter(job => job.host === system.id)) {
      if (!known.has(versionKey(job))) demo.updates.push({...job});
    }
  }
  if (!host) demo.updateChecks[''] = time;
  notify('Demo update catalog checked');
}
let timer: ReturnType<typeof setTimeout>;
export function notify(message: string) {
  demo.toast = message;
  clearTimeout(timer);
  timer = setTimeout(() => (demo.toast = ""), 3200);
}
export function record(name: string, subject: string, host: string) {
  demo.activities.unshift({
    id: Math.max(0, ...demo.activities.map((item) => item.id)) + 1,
    name,
    subject,
    host,
    status: "Completed",
    progress: 100,
    time: new Date().toISOString().slice(11, 19),
  });
  notify(`${name} · demo`);
}
export function operate(item: seed.Container, action: string) {
  item.status = action === "Stop" ? "Stopped" : "Running";
  item.cpu = action === "Stop" ? 0 : 3;
  item.memory = action === "Stop" ? 0 : 96;
  item.uptime = action === "Stop" ? "--" : "0m";
  record(`Container ${action.toLowerCase()}`, item.name, item.host);
  demo.containerLogs.push({ time: demo.activities[0].time, host: item.host, source: 'Container', message: `${item.name}: ${action.toLowerCase()} (demo), ${item.status.toLowerCase()}` });
}
