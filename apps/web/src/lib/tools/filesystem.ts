export type EntryKind = 'directory' | 'text' | 'image' | 'binary';
export interface FileEntry {
  path: string; kind: EntryKind; modified: string; permissions: string; owner: string; group: string;
  content?: string; artwork?: string; size: number; revision: number; readOnly?: boolean;
}
export interface FileLocation { label: string; path: string; kind: 'local' | 'mount' | 'network'; }
export interface FilesystemProvider {
  readonly capabilities: { browse: boolean; write: boolean; upload: boolean; download: boolean };
  readonly locations: FileLocation[];
  get(path: string): FileEntry | undefined;
  list(path: string): FileEntry[];
  create(directory: string, name: string, kind: 'directory' | 'text', content?: string): FileEntry;
  save(path: string, text: string, revision: number): FileEntry;
  transfer(paths: string[], directory: string, move: boolean, rename?: string): void;
  remove(paths: string[]): void;
}

export const basename = (path: string) => path.split('/').at(-1) || '/';
export const parent = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
const join = (directory: string, name: string) => `${directory === '/' ? '' : directory}/${name}`;
const contains = (directory: string, path: string) => directory === '/' || path === directory || path.startsWith(directory + '/');
const bytes = (text: string) => new TextEncoder().encode(text).length;
export const textFile = (name: string) => /(?:\.(?:txt|md|log|env|ya?ml|xml|json|cfg|conf|ini|toml)|(?:^|\/)(?:README|Dockerfile))$/i.test(name);
export function canonical(path: string) {
  if (!path.startsWith('/') || /[\\\x00-\x1f]/.test(path) || path.split('/').some(part => part === '.' || part === '..')) throw new Error('Enter an absolute path without traversal segments.');
  return '/' + path.split('/').filter(Boolean).join('/');
}
function nameSegment(name: string) {
  if (name.length > 255 || !name.trim() || name === '.' || name === '..' || /[\/\\\x00-\x1f]/.test(name)) throw new Error('Enter one valid file or folder name.');
  return name;
}
const locations = (host: string): FileLocation[] => {
  const home = host === 'storage' ? '/mnt/tank/home' : host === 'compute' ? '/home/operator' : '/home/demo';
  return [
    {label:'Home',path:home,kind:'local'}, {label:'Root filesystem',path:'/',kind:'local'},
    {label:'Documents',path:join(home,'Documents'),kind:'local'}, {label:'Downloads',path:join(home,'Downloads'),kind:'local'},
    {label:'Applications',path:host === 'storage' ? '/mnt/tank/apps' : '/srv',kind:'local'},
    {label:'Storage',path:host === 'storage' ? '/mnt/tank' : '/var/lib',kind:'local'},
    {label:'Mounted drives',path:host === 'storage' ? '/mnt/tank/archive' : '/mnt/archive',kind:'mount'},
    {label:'Network locations',path:host === 'storage' ? '/mnt/tank/shares' : '/mnt/shares',kind:'network'},
  ];
};

export function mockFilesystem(host: string, online = true, snapshot: Record<string,FileEntry> = Object.create(null)): FilesystemProvider {
  const places = online ? locations(host) : [];
  const locked = new Set(places.map(place => place.path));
  const make = (path: string, kind: EntryKind, content?: string): FileEntry => ({ path, kind, content, size:bytes(content ?? ''), modified:'2026-11-17T09:00:00Z', permissions:kind === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--', owner:'demo', group:'users', revision:1 });
  function seed(path: string) {
    if (snapshot[path]) return;
    if (path !== '/') seed(parent(path));
    snapshot[path] = make(path,'directory');
  }
  if (online && !snapshot['/']) {
    places.forEach(place => seed(place.path));
    const docs = places.find(place => place.label === 'Documents')!.path;
    const downloads = places.find(place => place.label === 'Downloads')!.path;
    for (const [name, content] of [['README.md',`# ${host} workspace\n\nSynthetic demo documents.\n`],['settings.yaml','demo: true\n'],['manifest.json','{"demo":true}\n'],['policy.xml','<demo enabled="true" />\n'],['events.log','09:00 Demo ready\n'],['.profile','DEMO=true\n']]) snapshot[join(docs,name)] = make(join(docs,name),'text',content);
    const artwork = join(downloads,'grafana-demo.svg');
    snapshot[artwork] = {...make(artwork,'image'), artwork:'/assets/grafana-demo.svg', readOnly:true};
    const archive = join(downloads,'snapshot.bin');
    snapshot[archive] = {...make(archive,'binary'), size:4096, readOnly:true};
  }
  let nextRevision = Math.max(0,...Object.values(snapshot).map(entry => entry.revision)) + 1;
  function requireOnline() { if (!online) throw new Error('This system cannot browse files.'); }
  function directory(path: string) { requireOnline(); const key = canonical(path); if (snapshot[key]?.kind !== 'directory') throw new Error('Folder not found.'); return key; }
  function get(path: string) { return online ? snapshot[canonical(path)] : undefined; }
  function sources(paths: string[]) {
    requireOnline();
    const unique = [...new Set(paths.map(canonical))];
    if (!unique.length || unique.some(path => !snapshot[path] || path === '/')) throw new Error('Select existing files or folders.');
    return unique.filter(path => !unique.some(other => other !== path && contains(other,path)));
  }
  function checkProtected(paths: string[]) { if (paths.some(path => [...locked].some(place => contains(path,place)))) throw new Error('A built-in location cannot be moved or removed.'); }
  return {
    capabilities:{browse:online,write:online,upload:online,download:online}, locations:places, get,
    list(path) { const key = directory(path); return Object.values(snapshot).filter(entry => entry.path !== '/' && parent(entry.path) === key); },
    create(dir,name,kind,content='') {
      const path = join(directory(dir),nameSegment(name));
      if (snapshot[path]) throw new Error('That name already exists.');
      if (bytes(content) > 1024 * 1024) throw new Error('Demo text files are limited to 1 MiB.');
      if (kind === 'text' && !textFile(path)) throw new Error('Choose a supported text filename, such as notes.txt.');
      return snapshot[path] = {...make(path,kind,content),revision:nextRevision++,modified:new Date().toISOString()};
    },
    save(path,text,revision) {
      requireOnline();
      const key = canonical(path), entry = snapshot[key];
      if (!entry || entry.kind !== 'text' || entry.readOnly || !textFile(key)) throw new Error('This file cannot be edited.');
      if (entry.revision !== revision) throw new Error('The file has changed since it was opened.');
      if (bytes(text) > 1024 * 1024) throw new Error('Demo text files are limited to 1 MiB.');
      return snapshot[key] = {...entry,content:text,size:bytes(text),revision:nextRevision++,modified:new Date().toISOString()};
    },
    transfer(paths,dir,move,rename) {
      const destination = directory(dir), roots = sources(paths);
      if (move) checkProtected(roots);
      const additions: FileEntry[] = [], targets = new Set<string>();
      for (const path of roots) {
        const target = join(destination, rename === undefined ? basename(path) : nameSegment(rename));
        if (contains(path,destination) || (rename !== undefined && roots.length !== 1)) throw new Error('Invalid destination.');
        for (const entry of Object.values(snapshot).filter(entry => contains(path,entry.path))) {
          const next = target + entry.path.slice(path.length);
          if (snapshot[next] || targets.has(next)) throw new Error(`Already exists: ${next}`);
          targets.add(next); additions.push({...entry,path:next,revision:nextRevision++});
        }
      }
      if (move) for (const path of Object.keys(snapshot)) if (roots.some(root => contains(root,path))) delete snapshot[path];
      for (const entry of additions) snapshot[entry.path] = entry;
    },
    remove(paths) {
      const roots = sources(paths); checkProtected(roots);
      for (const path of Object.keys(snapshot)) if (roots.some(root => contains(root,path))) delete snapshot[path];
    },
  };
}