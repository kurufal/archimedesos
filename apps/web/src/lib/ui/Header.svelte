<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    title,
    description = "",
    children,
  }: { title: string; description?: string; children?: Snippet } = $props();
</script>

<header class="pagehead">
  <div>
    <h1>{title}</h1>
    {#if description}<p>{description}</p>{/if}
  </div>
  {@render children?.()}
</header>
