<script lang="ts">
  import {
    Download,
    Clock3,
    Check,
    RotateCw,
    X,
    Trash2,
    Activity as Pulse,
  } from "@lucide/svelte";
  import { demo, hostName, notify } from "./session.svelte";
  import type { Activity } from "./mock";
  import Badge from "./ui/Badge.svelte";
  import { onDestroy } from 'svelte';
  let { compact = false }: { compact?: boolean } = $props();
  let filter = $state("All"), activityHover = $state<number | null>(null);
  let requested = $state<Record<string, boolean>>({});
  let loaded = $state<Record<string, boolean>>({});
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
  function remove(entries: Activity[], message: string) {
    const ids = new Set(entries.map(item => item.id));
    leave();
    demo.activities = demo.activities.filter(item => !ids.has(item.id));
    notify(message);
  }
  function clearAll() {
    const system = demo.host ? hostName(demo.host) : 'all systems';
    if (confirm(`Clear all ${scoped.length} activity entries for ${system}, including active and queued demo operations?`)) {
      remove(scoped, 'Activity cleared');
    }
  }
  function trackActivityPointer(event: PointerEvent, item: Activity) {
    if (frame || activityHover !== item.id) return;
    const row = event.currentTarget as HTMLElement;
    const clientX = event.clientX;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const bounds = row.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / (bounds.width || 1)));
      row.style.setProperty('--preview-left', `${45 * fraction}%`);
      row.style.setProperty('--preview-rotate', `${6 * fraction - 3}deg`);
    });
  }
  function change(item: Activity, retry = false) {
    item.status = retry ? "Queued" : "Cancelled";
    if (retry) item.progress = 0;
    notify(item.status + " · demo");
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
    <button disabled={!scoped.length} onclick={clearAll}><Trash2 size={14}/>Clear all</button>
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
        <button class="icon" title="Cancel" aria-label={'Cancel ' + item.name} disabled={!['Active','Queued'].includes(item.status)} onclick={() => change(item)}><X size={14}/></button>
        <button class="icon" title="Retry" aria-label={'Retry ' + item.name} disabled={!['Failed','Cancelled'].includes(item.status)} onclick={() => change(item, true)}><RotateCw size={14}/></button>
        <button class="icon" title={'Remove ' + item.name} disabled={!['Completed','Cancelled','Failed'].includes(item.status)} onclick={() => remove([item], 'Activity entry removed')}><Trash2 size={14}/></button>
      </div>
    </article>{:else}<p class="empty">No activity in this view.</p>{/each}
</div>
<style>
  .event { position:relative; isolation:isolate; border-bottom:0; display:grid; grid-template-columns:minmax(0,1fr) 100px; gap:9px 12px; align-items:start; }
  .identity { display:flex; align-items:center; gap:8px; min-width:0; overflow-wrap:anywhere; }
  .event-progress,.event-actions { position:relative; z-index:2; align-self:end; }
  .event-progress progress { max-width:none; }
  .event-progress small { font-variant-numeric:tabular-nums; }
  .event-progress.complete { --bar:var(--green); }
  .event-actions { display:flex; justify-content:flex-end; gap:2px; }
  .event::before,.event::after { content:''; position:absolute; pointer-events:none; }
  .event::before { inset:0; z-index:-1; background:#20313a; transform:scaleY(0); transform-origin:bottom; transition:transform 220ms ease; }
  .event:is(:hover,:focus-within)::before { transform:scaleY(1); }
  .event::after { inset:auto 0 0; height:2px; opacity:.72; background:url('/assets/backgrounds/line-BG.png') center / 100% 100%; }
  .event:is(:hover,:focus-within)::after { opacity:1; }
  .event-main,.event-end,.event-icon,.event button { position:relative; z-index:2; }
  .event-main,.event-end { text-shadow:0 1px 3px #000; }
  .event-main strong { display:inline-block; transition:transform 220ms ease; }
  .event:is(:hover,:focus-within) strong { transform:translateX(3px); }
  .art-window { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
  .row-art { position:absolute; top:14px; left:var(--preview-left,22%); width:55%; max-width:280px; aspect-ratio:16/9; object-fit:cover; pointer-events:none; border:1px solid #7596a4; box-shadow:0 16px 42px #000b; opacity:0; visibility:hidden; transform:translateY(25%) scaleY(1.08) rotate(var(--preview-rotate,0deg)); transition:opacity 240ms ease, transform 240ms ease, left 180ms ease, visibility 240ms; }
  .row-art.visible { opacity:1; visibility:visible; transform:translateY(0) rotate(var(--preview-rotate,0deg)); }
  @media(max-width:760px),(hover:none) { .art-window { display:none; } }
  @media(prefers-reduced-motion:reduce) { .row-art,.event::before,.event-main strong { transition:none; } }
</style>
