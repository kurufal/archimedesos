import { hosts } from '../mock';
import { mockFilesystem, type FileEntry } from './filesystem';

const snapshots = $state(Object.fromEntries(hosts.map(host => {
  const entries: Record<string,FileEntry> = {};
  mockFilesystem(host.id,host.online,entries);
  return [host.id,entries];
})));
export const filesystems = Object.fromEntries(hosts.map(host => [host.id,mockFilesystem(host.id,host.online,snapshots[host.id])]));
export const bookmarks = $state<Record<string,string[]>>({});