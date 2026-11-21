<script lang="ts">
  import {
    Box,
    Play,
    Square,
    RotateCw,
    ScanEye,
    Terminal,
    ScrollText,
  } from "@lucide/svelte";
  import { demo, hostName, operate } from "./session.svelte";
  import { connection } from "./connection.svelte";
  import { projects, resourceId, type Container } from "./mock";
  import Badge from "./ui/Badge.svelte";
  import Table from "./ui/Table.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Modal from "./ui/Modal.svelte";
  let { project = "" }: { project?: string } = $props();
  let query = $state(""),
    status = $state(""),
    group = $state(""),
    detail = $state<Container | null>(null),
    tab = $state("Overview"),
    selection = $state<string[]>([]);
  let rows = $derived(
    demo.containers.filter(
      (item) =>
        (!demo.host || item.host === demo.host) &&
        (!status || item.status === status) &&
        (!project || item.project === project) &&
        (!group || resourceId(item.host,item.project) === group) &&
        [item.name, item.image, hostName(item.host)]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
    ),
  );
  const id = (item: Container) => resourceId(item.host, item.name);
  let picked = $derived(rows.filter((item) => selection.includes(id(item))));
  const commands = [
    ["Start", Play],
    ["Stop", Square],
    ["Restart", RotateCw],
    ["Inspect", ScanEye],
    ["Logs", ScrollText],
    ["Terminal", Terminal],
  ] as const;
  function action(item: Container, name: string) {
    if (["Start", "Stop", "Restart"].includes(name)) {
      operate(item, name);
      return;
    }
    detail = item;
    tab = name === "Inspect" ? "Overview" : name;
  }
  function info(item: Container): Record<string, string | number> {
    return {
      Name: item.name,
      Status: item.status,
      Image: item.image,
      Project: item.project,
      Host: hostName(item.host),
      CPU: item.cpu + "%",
      Memory: item.memory + " MB",
      Ports: item.ports,
      Uptime: item.uptime,
    };
  }
</script>

<Toolbar bind:query label="Search containers..." viewKey="containers"
  ><select aria-label="Container status" bind:value={status}
    ><option value="">All statuses</option
    >{#each ["Running", "Stopped", "Unhealthy", "Restarting"] as name}<option
        >{name}</option
      >{/each}</select
  >{#if !project}<select aria-label="Compose project" bind:value={group}
        ><option value="">All projects</option>{#each projects.filter(item => !demo.host || item.host === demo.host) as item}<option value={resourceId(item.host,item.name)}
          >{item.name} · {hostName(item.host)}</option
        >{/each}</select
    >{/if}</Toolbar
>
{#if rows}
  {#snippet checkbox(item: Container)}<input
      type="checkbox"
      aria-label={"Select " + item.name}
      checked={selection.includes(id(item))}
      onchange={(event) =>
        (selection = event.currentTarget.checked
          ? [...selection, id(item)]
          : selection.filter((key) => key !== id(item)))}
    />{/snippet}
  {#snippet actions(item: Container)}<div class="actions">
      {#each commands as [name, Icon]}<button
          class="icon"
          title={name + " " + item.name}
          aria-label={name + " " + item.name}
          disabled={connection.mode !== "demo" && ["Start", "Stop", "Restart", "Logs", "Terminal"].includes(name)}
          onclick={() => action(item, name)}><Icon size={13} /></button
        >{/each}
    </div>{/snippet}
  {#if picked.length}<div class="toolbar">
      <strong>{picked.length} selected</strong
      >{#each ["Start", "Stop", "Restart"] as name}<button disabled={connection.mode !== "demo"}
          onclick={() => {
            picked.forEach((item) => operate(item, name));
            selection = [];
          }}>{name} selected</button
        >{/each}
    </div>{/if}
  {#if (demo.views.containers ?? "Tile") === "Tile"}<div class="cards">
      {#each rows as item}<article class="card">
          <div class="inline">
            {@render checkbox(item)}<Box size={17} class="cyan" />
            <h3>
              <button class="link" onclick={() => action(item, "Inspect")}
                >{item.name}</button
              >
            </h3>
            <Badge value={item.status} />
          </div>
          <dl>
            {#each Object.entries(info(item)).slice(2) as [key, value]}<dt>
                {key}
              </dt>
              <dd>{value}</dd>{/each}
          </dl>
          {@render actions(item)}
        </article>{:else}<p class="empty">No matching containers.</p>{/each}
    </div>{:else}<Table
      {rows}
      columns={[
        "Select",
        "Name",
        "Status",
        "Image",
        "Project",
        "Host",
        "CPU",
        "Memory",
        "Ports",
        "Uptime",
        "Actions",
      ]}
      value={(item, column) => info(item)[column] ?? ""}
      >{#snippet cell(item, column)}{#if column === "Select"}{@render checkbox(
            item,
          )}{:else if column === "Actions"}{@render actions(
            item,
          )}{:else if column === "Name"}<button
            class="link"
            onclick={() => action(item, "Inspect")}>{item.name}</button
          >{:else if column === "Status"}<Badge
            value={item.status}
          />{:else}{info(item)[column]}{/if}{/snippet}</Table
    >{/if}
{/if}
{#if detail}{@const item = detail}<Modal
    title={item.name}
    close={() => (detail = null)}
    ><Badge value={item.status} />
    <div class="tabs">
      {#each ["Overview", "Resources", "Configuration", "Logs", "Terminal", "Environment", "Mounts", "Networking"] as name}<button
          class:selected={tab === name}
          onclick={() => (tab = name)}>{name}</button
        >{/each}
    </div>
    {#if tab === "Overview"}<dl>
        {#each Object.entries(info(item)) as [label, value]}<dt>{label}</dt>
          <dd>{value}</dd>{/each}
      </dl>{:else if tab === "Resources"}<p>CPU: {item.cpu}%</p>
      <progress value={item.cpu} max="100"></progress>
      <p>
        Memory: {item.memory} MB
      </p>{:else if tab === "Configuration"}<pre>{JSON.stringify(
          { image: item.image, project: item.project, ports: [item.ports] },
          null,
          2,
        )}</pre>{:else if tab === "Logs"}<pre>{demo.containerLogs
          .filter((log) => log.host === item.host && log.message.startsWith(item.name + ":"))
          .map((log) => log.time + " " + log.message)
          .join(
            "\n",
          )}</pre>{:else if tab === "Terminal"}<pre>Demo terminal · no shell connected</pre>{:else if tab === "Environment"}<pre>{demo.files[
          resourceId(item.host,item.project)
        ]?.[".env"]?.replace(
          /=.*/g,
          "=********",
        )}</pre>{:else if tab === "Mounts"}<pre>{demo.volumes
          .filter((volume) => volume.host === item.host && volume.container === item.name)
          .map((volume) => volume.mountpoint)
          .join("\n") || "No mounts"}</pre>{:else}<pre>{demo.networks
          .filter((network) => network.host === item.host && network.project === item.project)
          .map((network) => network.name + " · " + network.subnet)
          .join("\n") || "No networks"}</pre>{/if}</Modal
  >{/if}
