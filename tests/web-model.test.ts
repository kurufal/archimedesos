import { describe, expect, test } from 'bun:test';
import { containers, projectHealth, projectMembers, resourceId } from '../apps/web/src/lib/mock';

describe('host-qualified resources', () => {
  test('duplicate names do not share identity or project membership', () => {
    const local = containers[0];
    const remote = {...local, host:'compute', status:'Stopped' as const};
    expect(resourceId(local.host, local.name)).not.toBe(resourceId(remote.host, remote.name));
    expect(projectMembers({host:local.host,name:local.project},[local,remote])).toEqual([local]);
    expect(projectMembers({host:remote.host,name:remote.project},[local,remote])).toEqual([remote]);
  });
  test('project health distinguishes empty and mixed services', () => {
    const running = {...containers[0],status:'Running' as const};
    const stopped = {...running,status:'Stopped' as const};
    expect(projectHealth([])).toBe('Missing');
    expect(projectHealth([running])).toBe('Healthy');
    expect(projectHealth([stopped])).toBe('Stopped');
    expect(projectHealth([running,stopped])).toBe('Partially running');
    expect(projectHealth([running,{...stopped,status:'Unhealthy'}])).toBe('Degraded');
  });
});