<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { ArrowLeft, ArrowRight, ArrowUp, RefreshCw, Folder, FileText, FileImage, File, FolderPlus, FilePlus, Upload, Grid2X2, List, Ellipsis, Star, HardDrive, Network, ChevronRight, ChevronDown, Search } from '@lucide/svelte';
  import Header from '$lib/ui/Header.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import { demo, hostName } from '$lib/session.svelte';
  import { basename, canonical, parent, textFile, type FileEntry } from '$lib/tools/filesystem';
  import { bookmarks, filesystems } from '$lib/tools/file-state.svelte';

  let host = $derived(demo.host || 'core');
  let fs = $derived(filesystems[host]);
  let routeHost = $state(''), path = $state('/'), address = $state('/'), history = $state<string[]>([]), cursor = $state(0);
  let selection = $state<string[]>([]), anchor = $state(''), search = $state(''), hidden = $state(false), sort = $state('Name'), descending = $state(false);
  let clipboard = $state<{host:string;paths:string[];move:boolean}|null>(null);
  let dragging = $state<{host:string;paths:string[]}|null>(null);
  let menu = $state(false), dialog = $state(''), name = $state(''), payload = $state(''), error = $state(''), status = $state('');
  let opened = $state<FileEntry|null>(null), draft = $state(''), revision = $state(0), preview = $state('Preview');
  let dirty = $derived(!!opened && opened.kind === 'text' && draft !== (opened.content ?? ''));
  let details = $derived(demo.views.files === 'Detailed');
  let crumbs = $derived(path.split('/').filter(Boolean).map((label,index,parts) => ({label,path:'/' + parts.slice(0,index+1).join('/')})));
  let rows = $derived.by(() => {
    if (!fs.capabilities.browse || fs.get(path)?.kind !== 'directory') return [];
    return fs.list(path).filter(item => (hidden || !basename(item.path).startsWith('.')) && basename(item.path).toLowerCase().includes(search.toLowerCase())).sort((first,second) => {
      if (first.kind === 'directory' && second.kind !== 'directory') return -1;
      if (second.kind === 'directory' && first.kind !== 'directory') return 1;
      const read = (item:FileEntry) => sort === 'Size' ? item.size : sort === 'Type' ? item.kind : sort === 'Modified' ? item.modified : sort === 'Permissions' ? item.permissions : sort === 'Owner / group' ? item.owner + item.group : basename(item.path);
      return String(read(first)).localeCompare(String(read(second)),undefined,{numeric:true}) * (descending ? -1 : 1);
    });
  });
  let chosen = $derived(selection.map(key => fs.get(key)).filter((item):item is FileEntry => !!item));
  $effect(() => {
    if (routeHost === host) return;
    if (routeHost && !canClose()) { demo.host = routeHost; return; }
    closeFile();
    routeHost = host;
    path = fs.locations[0]?.path ?? '/'; address = path; history = [path]; cursor = 0;
    selection = []; anchor = ''; search = ''; error = ''; status = ''; dialog = ''; menu = false;
  });
  beforeNavigate(navigation => {
    if (dirty && (navigation.willUnload || !canClose())) navigation.cancel();
  });
  function canClose() { return !dirty || confirm('Discard unsaved changes to this file?'); }
  function closeFile() { opened = null; draft = ''; }
  function navigate(destination:string, step?:number) {
    try {
      const target = canonical(destination.trim());
      if (fs.get(target)?.kind !== 'directory') throw new Error('Folder not found.');
      if (step !== undefined) cursor = step;
      else if (target !== path) { history = [...history.slice(0,cursor+1),target]; cursor = history.length - 1; }
      path = address = target; selection = []; anchor = ''; search = ''; error = ''; menu = false;
    } catch (reason) { error = (reason as Error).message; }
  }
  function select(event:MouseEvent|KeyboardEvent, item:FileEntry) {
    if (event.shiftKey && anchor) {
      const start = rows.findIndex(row => row.path === anchor), end = rows.indexOf(item);
      selection = start < 0 ? [item.path] : rows.slice(Math.min(start,end),Math.max(start,end)+1).map(row => row.path);
    } else if (event.ctrlKey || event.metaKey) selection = selection.includes(item.path) ? selection.filter(key => key !== item.path) : [...selection,item.path];
    else selection = [item.path];
    anchor = item.path;
  }
  function open(item:FileEntry) {
    menu = false;
    if (item.kind === 'directory') { navigate(item.path); return; }
    opened = item; draft = item.content ?? ''; preview = 'Preview'; error = '';
  }
  function start(action:string) {
    menu = false; error = ''; name = action === 'Rename' && chosen.length === 1 ? basename(chosen[0].path) : '';
    payload = ''; dialog = action;
  }
  function perform() {
    try {
      if (dialog === 'New folder' || dialog === 'New file' || dialog === 'Upload') {
        if (dialog === 'Upload' && !textFile(name)) throw new Error('Demo uploads accept supported text filenames only.');
        const entry = fs.create(path,name,dialog === 'New folder' ? 'directory' : 'text',payload);
        selection = [entry.path];
      } else if (dialog === 'Rename') {
        const old = chosen[0]; fs.transfer([old.path],parent(old.path),true,name);
        const newPath = `${parent(old.path) === '/' ? '' : parent(old.path)}/${name}`;
        bookmarks[host] = (bookmarks[host] ?? []).map(key => key === old.path || key.startsWith(old.path + '/') ? newPath + key.slice(old.path.length) : key);
        history = history.map(key => key === old.path || key.startsWith(old.path + '/') ? newPath + key.slice(old.path.length) : key);
        selection = [newPath];
      } else if (dialog === 'Delete') { fs.remove(selection); selection = []; pruneLocations(); }
      else if (dialog === 'Move') { fs.transfer(selection,canonical(name.trim()),true); selection = []; pruneLocations(); }
      else return;
      status = `${dialog} completed in demo filesystem`; dialog = ''; error = '';
    } catch (reason) { error = (reason as Error).message; }
  }
  function pruneLocations() {
    bookmarks[host] = (bookmarks[host] ?? []).filter(key => fs.get(key));
    history = history.filter(key => fs.get(key)); cursor = history.lastIndexOf(path);
  }
  function paste(destination = path) {
    if (!clipboard || clipboard.host !== host) return;
    try {
      fs.transfer(clipboard.paths,destination,clipboard.move);
      if (clipboard.move) { clipboard = null; selection = []; pruneLocations(); }
      error = ''; status = 'Files pasted in demo filesystem';
    } catch (reason) { error = (reason as Error).message; }
  }
  function copySelection(move:boolean) {
    if (!chosen.length) return;
    clipboard = {host,paths:chosen.map(item => item.path),move};
    status = `${chosen.length} selected for ${move ? 'cut' : 'copy'}`;
    menu = false;
  }
  function entryKey(event:KeyboardEvent,item:FileEntry) {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (modifier && (key === 'c' || key === 'x')) { if (!selection.includes(item.path)) selection = [item.path]; copySelection(key === 'x'); }
    else if (modifier && key === 'v') paste();
    else if (event.key === 'Enter') open(item);
    else if (event.key === 'Delete' || key === 'f2' || key === 'contextmenu' || (event.shiftKey && key === 'f10')) {
      if (!selection.includes(item.path) || (key === 'f2' && selection.length !== 1)) selection = [item.path];
      if (event.key === 'Delete') start('Delete');
      else if (key === 'f2') start('Rename');
      else menu = true;
    } else return;
    event.preventDefault();
  }
  function drop(event:DragEvent,destination:string) {
    if (dragging?.host !== host || dragging.paths.includes(destination)) return;
    event.preventDefault();
    try { fs.transfer(dragging.paths,destination,true); selection = []; pruneLocations(); error = ''; status = 'Files moved in demo filesystem'; }
    catch (reason) { error = (reason as Error).message; }
    finally { dragging = null; }
  }
  function save() {
    if (!opened) return;
    try { opened = fs.save(opened.path,draft,opened.revision); error = ''; status = 'Saved in demo filesystem'; }
    catch (reason) { error = (reason as Error).message; }
  }
  function saveAs() {
    if (!opened) return;
    const target = prompt('Save a copy in the current folder as:',basename(opened.path));
    if (target === null) return;
    try { opened = fs.create(path,target,'text',draft); revision++; error = ''; status = 'Demo copy saved'; }
    catch (reason) { error = (reason as Error).message; }
  }
  function bookmark() {
    const list = bookmarks[host] ?? [];
    bookmarks[host] = list.includes(path) ? list.filter(key => key !== path) : [...list,path];
  }
  function sortBy(value:string) { if (sort === value) descending = !descending; else {sort = value; descending = false;} }
  const columns = ['Name','Size','Type','Modified','Permissions','Owner / group'];
  const iconFor = (file:FileEntry) => file.kind === 'directory' ? Folder : file.kind === 'image' ? FileImage : file.kind === 'text' ? FileText : File;
</script>

<Header title="Files" description={hostName(host) + ' · Demo filesystem'}/>
{#if fs.capabilities.browse}
  <div class="explorer">
    <div class="address-bar">
      <button class="icon" title="Back" disabled={cursor <= 0} onclick={() => navigate(history[cursor-1],cursor-1)}><ArrowLeft size={16}/></button>
      <button class="icon" title="Forward" disabled={cursor >= history.length-1} onclick={() => navigate(history[cursor+1],cursor+1)}><ArrowRight size={16}/></button>
      <button class="icon" title="Up one directory" disabled={path === '/'} onclick={() => navigate(parent(path))}><ArrowUp size={16}/></button>
      <button class="icon" title="Refresh" onclick={() => {try {fs.list(path); selection = selection.filter(key => fs.get(key)); error = ''; status = 'Folder refreshed';} catch (reason) {error = (reason as Error).message;}}}><RefreshCw size={16}/></button>
      <form onsubmit={event => {event.preventDefault(); navigate(address);}}><input aria-label="Location path" bind:value={address}/></form>
      <label class="search"><Search size={14}/><input aria-label="Search this folder" bind:value={search} placeholder="Search folder"/></label>
    </div>
    <nav class="breadcrumbs" aria-label="File location"><button onclick={() => navigate('/')}>Root</button>{#each crumbs as crumb}<ChevronRight size={12}/><button onclick={() => navigate(crumb.path)}>{crumb.label}</button>{/each}</nav>
    <div class="address-bar commands">
      <button title="New file" onclick={() => start('New file')}><FilePlus size={15}/>New file</button>
      <button title="New folder" onclick={() => start('New folder')}><FolderPlus size={15}/>New folder</button>
      <button onclick={() => start('Upload')}><Upload size={15}/>Upload</button>
      <button class="icon" title="Bookmark this folder" aria-pressed={(bookmarks[host] ?? []).includes(path)} onclick={bookmark}><Star size={15}/></button>
      <div class="switch"><button title="Grid view" aria-pressed={!details} onclick={() => demo.views.files='Tile'}><Grid2X2 size={15}/></button><button title="Details view" aria-pressed={details} onclick={() => demo.views.files='Detailed'}><List size={15}/></button></div>
      <select aria-label="Sort files" bind:value={sort}>{#each columns as column}<option>{column}</option>{/each}</select>
      <button class="icon" title={descending ? 'Ascending sort' : 'Descending sort'} onclick={() => descending = !descending} style:transform={descending ? 'rotate(180deg)' : 'none'}><ChevronDown size={16}/></button>
      <button class="icon" title="File actions" aria-expanded={menu} onclick={() => menu = !menu}><Ellipsis size={17}/></button>
    </div>
    {#if menu}<div class="commands address-bar" aria-label="File actions">
      <button disabled={chosen.length !== 1} onclick={() => open(chosen[0])}>Open</button>
      <button disabled={chosen.length !== 1} onclick={() => start('Rename')}>Rename</button>
      {#each ['Copy','Cut'] as action}<button disabled={!chosen.length} onclick={() => copySelection(action === 'Cut')}>{action}</button>{/each}
      <button disabled={!clipboard || clipboard.host !== host} onclick={() => {paste(); menu = false;}}>Paste</button>
      <button disabled={!chosen.length} onclick={() => start('Move')}>Move</button>
      <button disabled={!chosen.length} onclick={() => start('Delete')}>Delete</button>
      <button disabled={chosen.length !== 1} onclick={() => start('Download')}>Download</button>
      <button disabled={chosen.length !== 1} onclick={() => start('Properties')}>Properties</button>
      <label class="inline"><input type="checkbox" bind:checked={hidden}/>Show hidden</label>
    </div>{/if}
    <div class="panes">
      <nav aria-label="Locations" class="locations"><small>Locations</small>
        {#each fs.locations as location}<button aria-current={location.path === path ? 'location' : undefined} onclick={() => navigate(location.path)}>{#if location.kind === 'mount'}<HardDrive size={14}/>{:else if location.kind === 'network'}<Network size={14}/>{:else}<Folder size={14}/>{/if}{location.label}</button>{/each}
        <small>Bookmarks</small>{#each bookmarks[host] ?? [] as entry}<button title={entry} onclick={() => navigate(entry)}><Star size={14}/>{basename(entry)}</button>{:else}<small class="muted">No bookmarks</small>{/each}
      </nav>
      <div class="listing">
        {#snippet entryButton(item:FileEntry)}{@const Icon = iconFor(item)}<button class="entry" aria-pressed={selection.includes(item.path)} onclick={event => select(event,item)} ondblclick={() => open(item)} onkeydown={event => entryKey(event,item)} oncontextmenu={event => {event.preventDefault(); if (!selection.includes(item.path)) selection = [item.path]; menu = true;}} draggable="true" ondragstart={event => {dragging = {host,paths:selection.includes(item.path) ? [...selection] : [item.path]}; if (event.dataTransfer) {event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-archimedes-demo-files','move');}}} ondragend={() => dragging = null} ondragover={event => {if (item.kind === 'directory' && dragging?.host === host && !dragging.paths.includes(item.path)) event.preventDefault();}} ondrop={event => {if (item.kind === 'directory') drop(event,item.path);}}><Icon size={details ? 16 : 32}/><span>{basename(item.path)}</span></button>{/snippet}
        {#if details}<div class="table-scroll"><table><thead><tr>{#each columns as column}<th aria-sort={sort === column ? descending ? 'descending' : 'ascending' : 'none'}><button onclick={() => sortBy(column)}>{column}</button></th>{/each}</tr></thead><tbody>{#each rows as item (item.path)}<tr class:selected={selection.includes(item.path)}><td>{@render entryButton(item)}</td><td>{item.kind === 'directory' ? '—' : `${item.size} B`}</td><td>{item.kind}</td><td>{item.modified.slice(0,16).replace('T',' ')}</td><td><code>{item.permissions}</code></td><td>{item.owner}:{item.group}</td></tr>{/each}</tbody></table></div>
        {:else}<div class="file-grid">{#each rows as item (item.path)}{@render entryButton(item)}{/each}</div>{/if}
        {#if !rows.length}<p class="empty">{search ? 'No matching files.' : 'This folder is empty.'}</p>{/if}
      </div>
    </div>
    <div class="file-status"><span>{rows.length} items · {chosen.length} selected</span><span role="status">{status}</span></div>
    {#if error && !dialog && !opened}<p class="red file-status" role="alert">{error}</p>{/if}
  </div>
{:else}<p class="empty">File browsing is unavailable on this demo system.</p>{/if}

{#if dialog}<Modal title={dialog} close={() => {dialog = ''; error = '';}}>
  {#if dialog === 'Properties' && chosen[0]}{@const item = chosen[0]}<dl><dt>Path</dt><dd>{item.path}</dd><dt>Type</dt><dd>{item.kind}</dd><dt>Size</dt><dd>{item.size} B</dd><dt>Modified</dt><dd>{item.modified}</dd><dt>Permissions</dt><dd>{item.permissions}</dd><dt>Owner / group</dt><dd>{item.owner}:{item.group}</dd></dl>
  {:else if dialog === 'Download' && chosen[0]}<p>Demo download preview: {chosen[0].path}</p><p>{chosen[0].size} bytes · No file is written to your device.</p>
  {:else}<form class="stack" onsubmit={event => {event.preventDefault(); perform();}}>
    {#if dialog === 'Delete'}<p>Delete {chosen.length} selected demo items and their contents?</p>
    {:else}<label class="stack">{dialog === 'Move' ? 'Destination directory' : 'Name'}<input required bind:value={name}/></label>{/if}
    {#if dialog === 'Upload'}<label class="stack">Demo text content<textarea bind:value={payload}></textarea></label>{/if}
    {#if error}<p class="red" role="alert">{error}</p>{/if}<button class="primary">Confirm {dialog.toLowerCase()}</button>
  </form>{/if}
</Modal>{/if}
{#if opened}<Modal title={basename(opened.path)} close={closeFile} {canClose}>
  <div class="actions"><small>{opened.path}{dirty ? ' · Unsaved changes' : ''}</small></div>
  {#if opened.kind === 'text'}
    <div class="tabs"><button aria-pressed={preview==='Preview'} onclick={() => preview='Preview'}>Preview</button><button aria-pressed={preview==='Edit'} disabled={opened.readOnly || !textFile(opened.path)} onclick={() => preview='Edit'}>Edit</button></div>
    {#if preview === 'Edit'}{#key opened.path + revision}{#await import('$lib/editor/CodeEditor.svelte')}<p role="status">Loading editor...</p>{:then Editor}<Editor.default path={opened.path} text={draft} change={value => draft=value} {save} saveAll={save}/>{:catch}<p role="alert">Unable to load editor.</p>{/await}{/key}
    {:else}<pre class="preview">{draft}</pre>{/if}
    <div class="actions"><button disabled={!dirty} onclick={save}>Save</button><button onclick={saveAs}>Save as</button><button disabled={!dirty} onclick={() => {draft = opened?.content ?? ''; revision++;}}>Revert</button></div>
  {:else if opened.kind === 'image'}<img class="preview" src={opened.artwork} alt={basename(opened.path)}/>
  {:else}<p>Binary file · read only · {opened.size} bytes</p>{/if}
  {#if error}<p class="red" role="alert">{error}</p>{/if}
</Modal>{/if}

<style>
  .explorer { border:1px solid var(--line); background:var(--surface); }
  .address-bar,.breadcrumbs,.file-status { display:flex; align-items:center; gap:5px; flex-wrap:wrap; padding:8px; border-bottom:1px solid var(--line); }
  .address-bar form { flex:1 1 170px; min-width:0; } .address-bar form input { width:100%; font-family:var(--mono); }
  .breadcrumbs { gap:3px; } .breadcrumbs button { border:0; min-height:24px; } .commands .switch { margin-left:auto; }
  .panes { display:grid; grid-template-columns:172px minmax(0,1fr); min-height:340px; }
  .locations { border-right:1px solid var(--line); display:flex; flex-direction:column; padding:6px; gap:2px; min-width:0; }
  .locations small { padding:6px 5px 3px; } .locations button { justify-content:flex-start; border:0; background:none; text-align:left; overflow-wrap:anywhere; } .locations [aria-current] { color:var(--cyan); background:#203038; }
  .listing { min-width:0; } .listing .table-scroll { border:0; } .listing td:first-child { padding:3px; }
  .file-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:5px; padding:8px; }
  .entry { gap:7px; color:var(--text); } .entry :global(svg) { flex-shrink:0; color:var(--cyan); }
  .file-grid .entry { min-height:80px; flex-direction:column; justify-content:center; text-wrap:wrap; overflow-wrap:anywhere; min-width:0; }
  .entry[aria-pressed=true],tr.selected td { background:#203844; } .file-status { border-bottom:0; border-top:1px solid var(--line); justify-content:space-between; color:var(--muted); font-size:12px; }
  .preview { max-width:100%; max-height:56vh; overflow:auto; } textarea { background:var(--bg); color:var(--text); min-height:100px; }
  @media(max-width:670px) { .panes { grid-template-columns:minmax(0,1fr); align-content:start; } .locations { flex-direction:row; overflow:auto; border-right:0; border-bottom:1px solid var(--line); } .locations button,.locations small { white-space:nowrap; } }
</style>