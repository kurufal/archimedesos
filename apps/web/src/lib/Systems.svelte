<script lang="ts">
  import {
    Server,
    HardDrive,
    Monitor,
    PowerOff,
    ArrowUpRight,
    Box,
    Radio,
    Clock3,
    SlidersHorizontal,
  } from "@lucide/svelte";
  import { hosts, totals, type Host } from "./mock";
  import { demo, notify } from "./session.svelte";
  import Badge from "./ui/Badge.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Table from "./ui/Table.svelte";
  import Modal from "./ui/Modal.svelte";
  let { management = false }: { management?: boolean } = $props();
  let query = $state(""),
    status = $state("All statuses"),
    detail = $state<Host | null>(null),
    address = $state(""),
    tab = $state("Overview");
  const accents = [
    "var(--cyan)",
    "var(--green)",
    "var(--magenta)",
    "var(--muted)",
  ];
  const symbols = [Monitor, Server, HardDrive, PowerOff];
  let rows = $derived(
    hosts.filter(
      (host) =>
        (!demo.host || demo.host === host.id) &&
        (status === "All statuses" ||
          status === (host.online ? "Online" : "Offline")) &&
        `${host.name} ${host.hostname} ${host.ip} ${host.os}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
  );
  function info(host: Host): Record<string, string | number> {
    const counts = totals(host.id, demo.containers);
    return {
      Name: host.name,
      Connection: host.online ? "Online" : "Offline",
      Location: host.local ? "Local" : "Remote",
      Hostname: host.hostname,
      IP: host.ip,
      OS: host.os,
      Processor: host.cpu,
      Cores: host.cores,
      CPU: host.online ? host.usage + "%" : "--",
      Memory: host.online ? `${host.memory}% / ${host.ram} GB` : "--",
      Disk: host.online ? `${host.storage}% / ${host.disk} GB` : "--",
      Containers: counts[2],
      Running: counts[0],
      Stopped: counts[1],
      Uptime: host.uptime,
      Services: host.health,
    };
  }
  function inspect(host: Host) {
    detail = host;
    tab = "Overview";
    address = demo.connections[host.id] ?? host.ip;
  }
</script>

<div class="section-head">
  <h2>
    {management ? "Host inventory" : "Connected systems"}
    <span class="count">{rows.length.toString().padStart(2, "0")}</span>
  </h2>
  <small class="inline"
    ><i class="dotgreen"></i>{rows.filter((host) => host.online).length} online
    <span>/</span>
    {rows.filter((host) => !host.online).length} offline</small
  >
</div>
<Toolbar bind:query label="Search systems..." viewKey="systems"
  ><select aria-label="Connection status" bind:value={status}
    >{#each ["All statuses", "Online", "Offline"] as option}<option
        >{option}</option
      >{/each}</select
  ></Toolbar
>
{#if (demo.views.systems ?? "Tile") === "Tile"}<div class="host-grid">
    {#each rows as host}{@const index = hosts.indexOf(host)}{@const Icon =
        symbols[index]}{@const counts = totals(host.id, demo.containers)}
      <article
        class="host-card"
        class:offline={!host.online}
        style:--accent={accents[index]}
      >
        <div class="host-head">
          <span class="host-icon"><Icon size={22} /></span>
          <div class="host-title">
            <small>{host.local ? "LOCAL HOST" : "REMOTE HOST"}</small>
            <h3>
              <button class="host-name" onclick={() => inspect(host)}
                >{host.name}</button
              >
            </h3>
          </div>
          <Badge value={host.online ? "Online" : "Offline"} />
        </div>
        <div class="spec"><span>{host.os}</span>{#if demo.settings['Show host addresses']}<code>{host.ip}</code>{/if}</div>
        {#if demo.settings['Show capability details']}<div class="spec"><span>{host.health}</span><code>{host.cores}</code></div>{/if}
        <div class="meters">
          {#each [["CPU", host.usage], ["Memory", host.memory], ["Disk", host.storage]] as [label, usage]}<div
            >
              <div class="meter-label">
                {label}<b>{host.online ? usage + "%" : "--"}</b>
              </div>
              <progress
                aria-label={String(label)}
                value={Number(usage)}
                max="100"
              ></progress>
            </div>{/each}
        </div>
        <div class="host-foot">
          <span><Box size={13} />{counts[2]} containers</span><span
            ><Clock3 size={13} />{host.online ? host.uptime : "Offline"}</span
          ><button
            class="link"
            title={"Inspect " + host.name}
            onclick={() => inspect(host)}><ArrowUpRight size={16} /></button
          >
        </div>
      </article>{:else}<p class="empty">No matching systems.</p>{/each}
  </div>{:else}<Table
    {rows}
    columns={Object.keys(info(hosts[0]))}
    value={(row, col) => info(row)[col]}
    >{#snippet cell(row, col)}{#if col === "Name"}<button
          class="link"
          onclick={() => inspect(row)}>{row.name}</button
        >{:else if col === "Connection"}<Badge
          value={String(info(row)[col])}
        />{:else}{info(row)[col]}{/if}{/snippet}</Table
  >{/if}
{#if detail}{@const host = detail}<Modal
    title={host.name}
    close={() => (detail = null)}
    ><div class="tabs">
      {#each ["Overview", "Connection", "Diagnostics"] as name}<button
          class:selected={tab === name}
          onclick={() => (tab = name)}>{name}</button
        >{/each}
    </div>
    {#if tab === "Overview"}<dl>
        {#each Object.entries(info(host)) as [label, value]}<dt>{label}</dt>
          <dd>{value}</dd>{/each}
      </dl>
      <button
        class="primary"
        onclick={() => {
          demo.host = host.id;
          detail = null;
          notify("Active system changed");
        }}><Radio size={14} />Select system</button
      >{:else if tab === "Connection"}<label class="stack"
        >Demo endpoint<input
          bind:value={address}
          placeholder={host.ip}
        /></label
      >
      <p>
        Capabilities: {host.id === "storage"
          ? "Storage pools, Docker inventory"
          : "Docker inventory, Compose projects"}
      </p>
      <button
        onclick={() => {
          demo.connections[host.id] = address;
          notify("Demo connection saved");
          detail = null;
        }}><SlidersHorizontal size={14} />Save mock connection</button
      >{:else}<Badge value={host.online ? "Healthy" : "Offline"} />
      <p>
        {host.online
          ? "Demo agent reachable. Inventory and service checks passed."
          : "Demo agent unreachable. No live telemetry available."}
      </p>{/if}</Modal
  >{/if}

<style>
  .dotgreen {
    width: 5px;
    height: 5px;
    background: var(--green);
    border-radius: 50%;
  }
  .host-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .host-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .host-card:hover {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  }
  .host-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 16px 10px;
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--accent) 7%, var(--surface)),
      transparent
    );
    position: relative;
  }
  .host-head:after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: url("/assets/backgrounds/line-BG.png") center/cover;
    opacity: 0.06;
  }
  .host-icon {
    height: 39px;
    width: 39px;
    display: grid;
    place-items: center;
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  }
  .host-title {
    flex: 1;
  }
  .host-title small {
    font: 9px var(--mono);
    color: var(--accent);
  }
  .host-name {
    border: 0;
    padding: 0;
    background: none;
    min-height: 0;
    font: 600 16px var(--font);
    text-align: left;
  }
  .spec,
  .host-foot,
  .meter-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 7px;
  }
  .spec {
    font-size: 11px;
    color: var(--muted);
    padding: 0 16px 11px;
  }
  .spec code {
    font-size: 10px;
  }
  .meters {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    padding: 10px 16px;
  }
  .meter-label {
    font: 10px var(--mono);
    color: var(--muted);
  }
  .meter-label b {
    color: #d8e1e6;
    font-weight: 400;
  }
  .meters progress {
    --bar: var(--accent);
    height: 3px;
  }
  .host-foot {
    border-top: 1px solid var(--line);
    padding: 7px 16px;
    background: #141a1e;
    font-size: 11px;
    color: var(--muted);
  }
  .host-foot span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .host-foot span:nth-child(2) {
    margin-right: auto;
  }
  .offline .host-icon {
    background: transparent;
  }
  .offline .host-name {
    color: #aab3b9;
  }
  @media (prefers-reduced-motion: no-preference) {
    .host-icon {
      background-image:
        linear-gradient(#121a1ff7, #121a1ff7),
        url("/assets/backgrounds/noise.gif");
    }
  }
  @media (max-width: 1000px) {
    .host-head {
      gap: 7px;
    }
    .spec {
      flex-wrap: wrap;
    }
  }
  @media (max-width: 840px) {
    .host-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
