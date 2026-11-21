<script lang="ts">
  import Header from "$lib/ui/Header.svelte";
  import Metrics from "$lib/ui/Metrics.svelte";
  import Systems from "$lib/Systems.svelte";
  import Activity from "$lib/Activity.svelte";
  import { FlaskConical, ArrowUpRight } from "@lucide/svelte";
  import { connection } from "$lib/connection.svelte";
</script>

<Header
  title="Dashboard"
  description="Container inventory, host health and recent operations."
  ><span class="demo-tag">{#if connection.mode === "demo"}<FlaskConical size={13} />Demo mode{:else}<FlaskConical size={13} />Read-only local inventory{/if}</span></Header
><Metrics /><Systems />
<div class="section-head">
  <h2>Recent activity</h2>
  <a class="inline" href="/logs/">View logs <ArrowUpRight size={13} /></a>
</div>
<Activity compact />

<style>
  .demo-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font: 11px var(--mono);
    color: var(--amber);
    background: #29271e;
    border: 1px solid #49422e;
    padding: 5px 8px;
  }
  .section-head a {
    font-size: 12px;
    color: var(--muted);
  }
</style>
