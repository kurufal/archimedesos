import * as seed from "./mock";
export const defaultSettings = { "Show host addresses": true, "Show volume sizes": true };
const sessionStart = Date.now();
const demoDay = Date.parse('2026-11-17T00:00:00Z');
export const activityNow = () => demoDay + (9 * 3600 + 43 * 60) * 1000 + Date.now() - sessionStart;
const activityTime = (at:number) => new Date(at).toISOString().slice(11,19);
const initialActivities = seed.activities.map(item => {
  const [hours,minutes,seconds] = item.time.split(':').map(Number);
  const at = demoDay + (hours * 3600 + minutes * 60 + seconds) * 1000;
  return {...item, startedAt:item.status === 'Queued' ? undefined : at - 60000, finishedAt:item.status === 'Completed' || item.status === 'Failed' ? at : undefined };
});
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
  activities: initialActivities,
  files: Object.fromEntries(
    seed.projects.map((project) => [seed.resourceId(project.host, project.name), seed.workspace(project)]),
  ),
  settings: { ...defaultSettings } as Record<string, boolean>,
  connections: {} as Record<string, string>,
  keys: structuredClone(seed.security["API keys"]),
  backups: {} as Record<string, string>,
  directories: Object.fromEntries(seed.projects.map(project => [seed.resourceId(project.host, project.name), [] as string[]])),
});
export const hostName = (id: string) =>
  seed.hosts.find((host) => host.id === id)?.name ?? id;
const versionKey = (job: Pick<seed.UpdateJob,'host'|'type'|'name'|'version'>) => JSON.stringify([job.host, job.type, job.name, job.version]);
let nextActivityId = Math.max(...seed.activities.map(item => item.id)) + 1;
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
export function record(name: string, subject: string, host: string, update?: seed.Activity['update']) {
  const now = activityNow();
  demo.activities.unshift({
    id: nextActivityId++,
    name,
    subject,
    host,
    status: "Completed",
    progress: 100,
    time: activityTime(now),
    startedAt: now,
    finishedAt: now,
    update,
  });
  notify(`${name} · demo`);
}
export const isActivityHistory = (item:seed.Activity) => item.status !== 'Active' && item.status !== 'Queued';
export function changeActivity(item:seed.Activity, retry:boolean) {
  if (retry ? item.status !== 'Failed' && item.status !== 'Cancelled' : isActivityHistory(item)) return;
  item.status = retry ? 'Queued' : 'Cancelled';
  const now = activityNow();
  item.time = activityTime(now);
  item.finishedAt = retry ? undefined : now;
  if (retry) { item.progress = 0; item.startedAt = undefined; }
  const job = item.update && demo.updates.find(job => versionKey(job) === versionKey(item.update!));
  if (job) job.status = retry ? 'Pending' : 'Cancelled';
  notify(item.status + ' · demo');
}
export function completeUpdate(job:seed.UpdateJob) {
  if (job.status === 'Completed' || job.status === 'Cancelled') return;
  job.status = 'Completed';
  const operation = demo.activities.find(item => !isActivityHistory(item) && item.update && versionKey(item.update) === versionKey(job));
  if (operation) {
    const now = activityNow();
    operation.startedAt ??= now; operation.finishedAt = now; operation.time = activityTime(now);
    operation.status = 'Completed'; operation.progress = 100;
    notify('Update completed · demo');
  } else record('Update completed',job.name,job.host,{host:job.host,name:job.name,type:job.type,version:job.version});
}
export function operate(target: seed.Container, action: string) {
  const item = demo.containers.find(item => item.host === target.host && item.name === target.name);
  if (!item || !['Start','Stop','Restart'].includes(action) || (action === 'Stop' ? item.status === 'Stopped' : action === 'Start' && item.status === 'Running')) return;
  item.status = action === "Stop" ? "Stopped" : "Running";
  item.cpu = action === "Stop" ? 0 : 3;
  item.memory = action === "Stop" ? 0 : 96;
  item.uptime = action === "Stop" ? "--" : "0m";
  record(`Container ${action.toLowerCase()}`, item.name, item.host);
  demo.containerLogs.push({ time: demo.activities[0].time, host: item.host, source: 'Container', message: `${item.name}: ${action.toLowerCase()} (demo), ${item.status.toLowerCase()}` });
  if (demo.containerLogs.length > 500) demo.containerLogs.splice(0,demo.containerLogs.length - 500);
}
