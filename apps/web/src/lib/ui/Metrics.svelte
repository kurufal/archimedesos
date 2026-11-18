<script lang="ts">
  import {
    Play,
    Square,
    Box,
    Layers,
    Database,
    ArrowDownToLine,
  } from "@lucide/svelte";
  import { totals } from "../mock";
  import { demo } from "../session.svelte";
  const labels = [
    "Running",
    "Stopped",
    "Containers",
    "Images",
    "Volumes",
    "Updates",
  ];
  const icons = [Play, Square, Box, Layers, Database, ArrowDownToLine];
  const colors = ["green", "amber", "cyan", "magenta", "violet", "amber"];
  let numbers = $derived(
    totals(demo.host, demo.containers, demo.updates, demo.images, demo.volumes),
  );
</script>

<div class="metrics">
  {#each labels as label, index}{@const Icon = icons[index]}
    <div class="metric" style:--ink={"var(--" + colors[index] + ")"}>
      <span class="metric-icon"><Icon size={16} /></span><strong
        >{numbers[index].toString().padStart(2, "0")}</strong
      ><span>{label}</span>
    </div>{/each}
</div>

<style>
  .metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    --violet: #b8a4e7;
  }
  .metric {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-top: 2px solid color-mix(in srgb, var(--ink) 70%, var(--line));
    background: linear-gradient(
      115deg,
      color-mix(in srgb, var(--ink) 5%, var(--surface)),
      var(--surface)
    );
    padding: 14px;
    display: grid;
    gap: 4px;
  }
  .metric:after {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/assets/backgrounds/line-BG.png") center/cover;
    opacity: 0.035;
    pointer-events: none;
  }
  .metric-icon {
    position: absolute;
    right: 12px;
    top: 14px;
    color: var(--ink);
  }
  .metric strong {
    font: 500 32px var(--mono);
    line-height: 1.2;
  }
  .metric > span:last-child {
    color: #bac5cd;
    font-size: 12px;
  }
  @media (max-width: 1060px) {
    .metrics {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 420px) {
    .metric {
      padding: 10px;
    }
    .metric-icon {
      right: 7px;
      top: 11px;
    }
    .metric strong {
      font-size: 26px;
    }
  }
</style>
