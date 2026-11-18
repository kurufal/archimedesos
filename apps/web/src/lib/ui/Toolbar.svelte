<script lang="ts">
  import { Grid2X2, List, Search } from "@lucide/svelte";
  import { onMount, type Snippet } from "svelte";
  import { demo } from "../session.svelte";
  let {
    query = $bindable(""),
    label = "Search",
    viewKey = "",
    children,
  }: {
    query?: string;
    label?: string;
    viewKey?: string;
    children?: Snippet;
  } = $props();
  let anchor: HTMLDivElement;
  let floating = $state(false), tucked = $state(false);
  onMount(() => {
    const pane = anchor.closest('main');
    if (!pane) return;
    let previous = pane.scrollTop, movement = 0;
    function scroll() {
      if (!pane) return;
      const current = pane.scrollTop;
      const delta = current - previous;
      previous = current;
      movement = Math.sign(delta) === Math.sign(movement) ? movement + delta : delta;
      if (current < 72 || movement < -8) { tucked = false; movement = 0; }
      else if (movement > 8) { tucked = true; movement = 0; }
    }
    const observer = new IntersectionObserver(([entry]) => {
      floating = !entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
    }, { root: pane });
    observer.observe(anchor);
    pane.addEventListener('scroll', scroll, {passive:true});
    return () => { observer.disconnect(); pane.removeEventListener('scroll', scroll); };
  });
</script>

<div class="filter-anchor" aria-hidden="true" bind:this={anchor}></div>
<div class="toolbar filter-strip" class:floating class:tucked={floating && tucked}>
  <label class="search"
    ><Search size={15} /><input
      aria-label={label}
      placeholder={label}
      bind:value={query}
    /></label
  >{@render children?.()}{#if viewKey}<div class="switch">
      {#each ["Tile", "Detailed"] as mode}<button
          title={mode + " view"}
          aria-label={mode + " view"}
          aria-pressed={(demo.views[viewKey] ?? "Tile") === mode}
          onclick={() => (demo.views[viewKey] = mode)}
          >{#if mode === "Tile"}<Grid2X2 size={16} />{:else}<List
              size={16}
            />{/if}</button
        >{/each}
    </div>{/if}
</div>

<style>
  .filter-anchor { height:1px; margin-bottom:-1px; pointer-events:none; }
  .filter-strip { position:sticky; top:0; z-index:4; background:var(--surface); padding:7px; border:1px solid var(--line); transition:transform 180ms ease, box-shadow 180ms ease; }
  .floating { box-shadow:0 12px 24px #0008; border-bottom-color:#48717c; }
  .tucked:not(:focus-within) { transform:translateY(calc(-100% - 1px)); pointer-events:none; }
  .search { flex:1 1 160px; min-height:40px; }
  .search input { width:100%; min-width:0; }
  .filter-strip :global(select),.switch { min-height:40px; }
  @media(prefers-reduced-motion:reduce) { .filter-strip {transition:none} }
</style>
