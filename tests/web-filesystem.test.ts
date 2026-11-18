import { expect, test } from 'bun:test';
import { mockFilesystem } from '../apps/web/src/lib/tools/filesystem';

test('mock files are host-local and moves validate before mutating', () => {
  const local = mockFilesystem('core'), remote = mockFilesystem('compute');
  const home = local.locations[0].path;
  const folder = local.create(home,'example','directory');
  const child = local.create(folder.path,'one.txt','text','original');
  expect(() => local.transfer([folder.path],folder.path,true)).toThrow();
  expect(local.get(child.path)?.content).toBe('original');
  local.transfer([folder.path],home,true,'renamed');
  expect(local.get(child.path)).toBeUndefined();
  expect(local.get(`${home}/renamed/one.txt`)?.content).toBe('original');
  expect(remote.get(`${home}/renamed/one.txt`)).toBeUndefined();
  local.transfer([`${home}/renamed`],local.locations[2].path,false);
  local.remove([`${home}/renamed`]);
  expect(local.list(`${local.locations[2].path}/renamed`)).toHaveLength(1);
});

test('mock filesystem rejects traversal, stale saves and removal of built-in locations', () => {
  const fs = mockFilesystem('core');
  const docs = fs.locations[2].path;
  const file = fs.create(docs,'notes.txt','text');
  expect(() => fs.create(docs,'../escape','text')).toThrow();
  expect(() => fs.remove([docs])).toThrow();
  expect(fs.save(file.path,'draft',file.revision).content).toBe('draft');
  expect(() => fs.save(file.path,'stale',file.revision)).toThrow();
  fs.remove([file.path]);
  fs.create(docs,'notes.txt','text');
  expect(() => fs.save(file.path,'replaced',file.revision)).toThrow();
  expect(() => fs.create(docs,'snapshot.bin','text')).toThrow();
  expect(mockFilesystem('edge',false).capabilities.write).toBe(false);
});