<script lang="ts">
  import {
    Download,
    Clock3,
    Check,
    RotateCw,
    X,
    Trash2,
    ChevronDown,
    Activity as Pulse,
  } from "@lucide/svelte";
  import { activityNow, changeActivity, demo, hostName, isActivityHistory, notify } from "./session.svelte";
  import type { Activity } from "./mock";
  import Badge from "./ui/Badge.svelte";
  import { onDestroy } from 'svelte';
  let { compact = false }: { compact?: boolean } = $props();
  let filter = $state("All"), activityHover = $state<number | null>(null);
  let requested = $state<Record<string, boolean>>({});
  let loaded = $state<Record<string, boolean>>({});
  let expanded = $state<number | null>(null);
  let frame = 0;
  function leave() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    activityHover = null;
  }
  onDestroy(leave);
  function enter(event: PointerEvent, item: Activity) {
    leave();
    if (!item.art || event.pointerType === 'touch' || !matchMedia('(hover: hover) and (min-width: 761px)').matches) return;
    activityHover = item.id;
    requested[item.art] = true;
    trackActivityPointer(event, item);
  }
  let scoped = $derived(demo.activities.filter(item => !demo.host || item.host === demo.host));
  let rows = $derived(scoped.filter(item => compact || filter === 'All' || item.status === filter));
  let completed = $derived(scoped.filter(item => item.status === 'Completed'));
  let history = $derived(scoped.filter(isActivityHistory));
  function remove(entries: Activity[], message: string) {
    const ids = new Set(entries.map(item => item.id));
    leave();
    demo.activities = demo.activities.filter(item => !ids.has(item.id));
    notify(message);
  }
  function clearAll() {
    const system = demo.host ? hostName(demo.host) : 'all systems';
    if (confirm(`Clear ${history.length} history entries for ${system}? Active and queued operations will remain.`)) {
      remove(history, 'Activity history cleared');
    }
  }
  function trackActivityPointer(event: PointerEvent, item: Activity) {
    if (frame || activityHover !== item.id) return;
    const row = event.currentTarget as HTMLElement;
    const {clientX,clientY} = event;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const bounds = row.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / (bounds.width || 1)));
      const width = 224, height = 126, margin = 12, offset = 19;
      const left = clientX + offset + width + margin <= innerWidth ? clientX + offset : clientX - width - offset;
      const top = clientY + offset + height + margin <= innerHeight ? clientY + offset : clientY - height - offset;
      row.style.setProperty('--preview-left', `${Math.max(margin,Math.min(innerWidth - width - margin,left))}px`);
      row.style.setProperty('--preview-top', `${Math.max(margin,Math.min(innerHeight - height - margin,top))}px`);
      row.style.setProperty('--preview-rotate', `${6 * fraction - 3}deg`);
    });
  }
  const timestamp = (at?:number) => at ? new Date(at).toISOString().slice(11,19) + ' UTC' : 'Not recorded';
  function elapsed(item:Activity) {
    if (!item.startedAt) return 'Not started';
    const seconds = Math.max(0, Math.floor(((item.finishedAt ?? activityNow()) - item.startedAt) / 1000));
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
</script>

{#if !compact}<div class="toolbar">
    <select aria-label="Activity status" bind:value={filter}
      >{#each ["All", "Active", "Queued", "Completed", "Failed", "Cancelled"] as status}<option
          >{status}</option
        >{/each}</select
    ><button
      disabled={!completed.length}
      onclick={() => remove(completed, 'Completed history cleared')}><Trash2 size={14} />Clear completed</button
    >
    <button disabled={!history.length} onclick={clearAll}><Trash2 size={14}/>Clear all</button>
  </div>{/if}
<div class="feed">
  {#each compact ? rows.slice(0, 3) : rows as item (item.id)}<article
      class="event"
      onpointerenter={(event) => enter(event, item)}
      onpointermove={(event) => trackActivityPointer(event, item)}
      onpointerleave={leave}
      onpointercancel={leave}
    >
      {#if item.art && requested[item.art]}{@const src = item.art}
        <div class="art-window" aria-hidden="true"><img class="row-art" class:visible={activityHover === item.id && loaded[src]} {src} alt="" onload={() => loaded[src] = true} onerror={() => loaded[src] = false} /></div>
      {/if}
      <div class="identity"><span class="event-icon" class:green={item.status === "Completed"}
        >{#if item.total}<Download
          />{:else if item.status === "Completed"}<Check
          />{:else if item.status === "Queued"}<Clock3 />{:else}<Pulse
          />{/if}</span
      >
      <div class="event-main">
        <strong>{item.name}</strong><small
          >{item.subject} · {hostName(item.host)}</small
        >
      </div></div>
      <div class="event-end">
        <Badge value={item.status} /><time>{item.time}</time>
      </div>
      <div class="event-progress" class:complete={item.status === 'Completed'}>
        <progress aria-label={'Progress: ' + item.name} value={item.progress} max="100"></progress>
        <small>{item.progress}%{#if item.total != null} · {Math.round(item.total * item.progress / 100)} / {item.total} MB{#if item.speed != null} · {item.status === 'Active' ? item.speed : 0} MB/s{/if}{/if}</small>
      </div>
      <div class="event-actions">
        {#if !compact}<button class="icon" title="Activity details" aria-label={'Details for ' + item.name} aria-expanded={expanded === item.id} onclick={() => expanded = expanded === item.id ? null : item.id}><ChevronDown size={14}/></button>{/if}
        <button class="icon" title="Cancel" aria-label={'Cancel ' + item.name} disabled={isActivityHistory(item)} onclick={() => changeActivity(item,false)}><X size={14}/></button>
        <button class="icon" title="Retry" aria-label={'Retry ' + item.name} disabled={!['Failed','Cancelled'].includes(item.status)} onclick={() => changeActivity(item,true)}><RotateCw size={14}/></button>
        <button class="icon" title={'Remove ' + item.name} disabled={!isActivityHistory(item)} onclick={() => remove([item], 'Activity entry removed')}><Trash2 size={14}/></button>
      </div>
      {#if !compact && expanded === item.id}<dl class="event-details"><dt>Resource</dt><dd>{item.subject}{item.update ? ` · ${item.update.version}` : ''}</dd><dt>Started</dt><dd>{timestamp(item.startedAt)}</dd><dt>Finished</dt><dd>{timestamp(item.finishedAt)}</dd><dt>Elapsed</dt><dd>{elapsed(item)}</dd></dl>{/if}
    </article>{:else}<p class="empty">No activity in this view.</p>{/each}
</div>
<style>
  .event { position:relative; border-bottom:0; display:grid; grid-template-columns:minmax(0,1fr) 122px; gap:9px 12px; align-items:start; }
  .identity { display:flex; align-items:center; gap:8px; min-width:0; overflow-wrap:anywhere; }
  .event-progress,.event-actions { position:relative; z-index:2; align-self:end; }
  .event-progress progress { max-width:none; }
  .event-progress small { font-variant-numeric:tabular-nums; }
  .event-progress.complete { --bar:var(--green); }
  .event-actions { display:flex; justify-content:flex-end; gap:2px; }
  .event::before,.event::after { content:''; position:absolute; pointer-events:none; }
  .event::before { inset:0; background:#20313a; transform:scaleY(0); transform-origin:bottom; transition:transform 220ms ease; }
  .event:is(:hover,:focus-within)::before { transform:scaleY(1); }
  .event::after { inset:auto 0 0; height:2px; opacity:.72; background:url('/assets/backgrounds/line-BG.png') center / 100% 100%; }
  .event:is(:hover,:focus-within)::after { opacity:1; }
  .event-main,.event-end,.event-icon,.event button { position:relative; z-index:2; }
  .event-main,.event-end { text-shadow:0 1px 3px #000; }
  .event-main strong { display:inline-block; transition:transform 220ms ease; }
  .event:is(:hover,:focus-within) strong { transform:translateX(3px); }
  .art-window { position:absolute; inset:0; pointer-events:none; }
  .row-art { position:fixed; z-index:5; top:var(--preview-top,12px); left:var(--preview-left,12px); width:224px; height:126px; object-fit:cover; pointer-events:none; border:1px solid #7596a4; box-shadow:0 16px 42px #000b; opacity:0; visibility:hidden; transform:scale(.97) rotate(var(--preview-rotate,0deg)); transition:opacity 180ms ease, transform 180ms ease, visibility 180ms; }
  .row-art.visible { opacity:1; visibility:visible; transform:rotate(var(--preview-rotate,0deg)); }
  .event-details { position:relative; grid-column:1/-1; margin:0; padding:8px; border-top:1px solid var(--line); font-size:12px; }
  @media(max-width:760px),(hover:none) { .art-window { display:none; } }
  @media(prefers-reduced-motion:reduce) { .row-art,.event::before,.event-main strong { transition:none; } }
</style>
