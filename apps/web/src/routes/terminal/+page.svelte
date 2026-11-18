<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, X, Pencil, Settings, Eraser } from '@lucide/svelte';
  import Header from '$lib/ui/Header.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import { hosts, resourceId } from '$lib/mock';
  import { demo, hostName } from '$lib/session.svelte';
  import { createDemoSession, MAX_TERMINAL_TABS, type TerminalTab, type TerminalTarget } from '$lib/tools/terminal';
  import TerminalViewport, { preloadTerminal } from '$lib/tools/TerminalViewport.svelte';

  let tabs = $state<TerminalTab[]>([]), active = $state(0), target = $state(''), mounted = $state(false);
  let fontSize = $state(14), cursorBlink = $state(false), settings = $state(false), editing = $state(0), title = $state('');
  onMount(() => {
    void preloadTerminal().catch(() => {});
    mounted = true;
  });
  let hostScope = $derived(demo.host || 'core');
  let targets = $derived.by(() => {
    const result:{id:string;target:TerminalTarget}[] = [];
    for (const host of hosts.filter(host => host.online && (!demo.host || host.id === demo.host))) {
      result.push({id:`host:${host.id}`,target:{host:host.id,label:host.name,kind:host.local ? 'local' : 'remote'}});
      for (const item of demo.containers.filter(item => item.host === host.id && item.status !== 'Stopped')) {
        const id = resourceId(item.host,item.name);
        result.push({id:`container:${id}`,target:{host:item.host,label:item.name,kind:'container',containerId:id}});
      }
    }
    return result;
  });
  let chosen = $derived(targets.find(item => item.id === target) ?? targets.find(item => item.id === `host:${hostScope}`) ?? targets[0]);
  let current = $derived(tabs.find(tab => tab.id === active));
  function create() {
    if (!chosen || tabs.length >= MAX_TERMINAL_TABS) return;
    const startedAt = import.meta.env.DEV ? performance.now() : undefined;
    const session = createDemoSession(chosen.target);
    tabs.push({id:session.id,title:chosen.target.label,session,revision:0,startedAt}); active = session.id;
  }
  function close(id:number) {
    const index = tabs.findIndex(tab => tab.id === id);
    if (index < 0) return;
    tabs.splice(index,1);
    if (editing === id) editing = 0;
    if (id === active) active = tabs[Math.min(index,tabs.length-1)]?.id ?? 0;
  }
  function keyboard(event:KeyboardEvent) {
    if (event.type !== 'keydown' || !event.ctrlKey || event.altKey || event.metaKey) return false;
    if (event.shiftKey && event.key.toLowerCase() === 't') create();
    else if (event.key === 'Tab' && tabs.length) {
      const index = tabs.findIndex(tab => tab.id === active);
      active = tabs[(index + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length].id;
    } else return false;
    event.preventDefault(); event.stopPropagation(); return true;
  }
</script>

<Header title="Terminal" description="Demo terminal sessions"/>
<section class="terminal-panel" aria-label="Terminal sessions">
  <div class="terminal-toolbar">
    <select aria-label="New session target" value={chosen?.id ?? ''} onchange={event => target = event.currentTarget.value} disabled={!targets.length}>
      {#each targets as item}<option value={item.id}>{item.target.kind === 'container' ? `${hostName(item.target.host)} / ${item.target.label}` : `${item.target.label} · ${item.target.kind}`}</option>{:else}<option value="">No demo target available</option>{/each}
    </select>
    <button type="button" data-terminal-activate onclick={create} disabled={!mounted || !chosen || tabs.length >= MAX_TERMINAL_TABS}><Plus size={15}/>New tab</button>
    <small>{tabs.length} / {MAX_TERMINAL_TABS}</small>
    <button class="icon" title="Rename tab" disabled={!current} onclick={() => {if (current) { title = current.title; editing = current.id; }}}><Pencil size={14}/></button>
    <button class="icon" title="Clear terminal" disabled={!current} onclick={() => {if(current){current.session.lines = []; current.session.input = ''; current.revision++;}}}><Eraser size={15}/></button>
    <button class="icon" title="Terminal settings" onclick={() => settings=true}><Settings size={15}/></button>
  </div>
  <div class="terminal-tabs" aria-label="Session tabs">
    {#each tabs as tab (tab.id)}<div class:active={tab.id === active} data-tab-id={tab.id}>
      <button type="button" data-terminal-activate aria-pressed={tab.id === active} onclick={() => active=tab.id}>{tab.title}</button>
      <button type="button" class="icon" title={'Close ' + tab.title} onclick={() => close(tab.id)}><X size={14}/></button>
    </div>{/each}
  </div>
  {#if current}
    <div class="terminal-status"><strong>{hostName(current.session.target.host)}{current.session.target.kind === 'container' ? ' / ' + current.session.target.label : ''}</strong><span>{current.session.status} · {current.session.cols} × {current.session.rows}</span></div>
  {:else}<p class="empty">No terminal tabs.</p>{/if}
  {#each tabs as tab (tab.id)}
    <TerminalViewport session={tab.session} active={tab.id === active} {fontSize} {cursorBlink} revision={tab.revision} startedAt={tab.startedAt} shortcut={keyboard}/>
  {/each}
</section>
{#if editing}<Modal title="Rename tab" close={() => editing=0}><form class="stack" onsubmit={event => {event.preventDefault(); const tab = tabs.find(tab => tab.id === editing); if(tab && title.trim()){tab.title=title.trim();editing=0;}}}><label class="stack">Tab name<input maxlength="48" required bind:value={title}/></label><button class="primary">Rename</button></form></Modal>{/if}
{#if settings}<Modal title="Terminal settings" close={() => settings=false}><div class="stack"><label class="stack">Font size <input type="number" min="11" max="22" value={fontSize} onchange={event => fontSize=Math.max(11,Math.min(22,event.currentTarget.valueAsNumber || 14))}/></label><label class="inline"><input type="checkbox" bind:checked={cursorBlink}/>Blink cursor</label></div></Modal>{/if}

<style>
  .terminal-panel { border:1px solid var(--line); background:var(--surface); }
  .terminal-toolbar,.terminal-tabs,.terminal-status,.terminal-tabs>div { display:flex; align-items:center; gap:5px; }
  .terminal-toolbar { flex-wrap:wrap; padding:8px; } .terminal-toolbar select { max-width:min(100%,285px); }
  .terminal-tabs { overflow:auto; background:var(--bg); } .terminal-tabs>div { flex:none; gap:0; border-right:1px solid var(--line); } .terminal-tabs button { border:0; } .terminal-tabs .active { border-top:2px solid var(--cyan); }
  .terminal-status { justify-content:space-between; flex-wrap:wrap; border-block:1px solid var(--line); padding:7px 10px; font-size:12px; } .terminal-status span { color:var(--muted); }
</style>