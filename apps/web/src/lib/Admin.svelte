<script lang="ts">
  import { tick } from "svelte";
  import { RefreshCw, KeyRound, Trash2 } from "@lucide/svelte";
  import { hosts, logs, security, type UpdateJob } from "./mock";
  import { demo, hostName, record, notify, refreshUpdates, clearCompletedUpdates, completeUpdate } from "./session.svelte";
  import Table from "./ui/Table.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Badge from "./ui/Badge.svelte";
  import Modal from "./ui/Modal.svelte";
  let { section }: { section: string } = $props();
  let query = $state(""),
    filter = $state(""),
    tab = $state<keyof typeof security>("Users"),
    follow = $state(true),
    confirm = $state(""),
    keyName = $state("");
  let frozen = $state<typeof logs>([]);
  let live = $derived(
    [
      ...logs.filter(entry => entry.source !== 'Container'),
      ...demo.containerLogs,
      ...demo.activities.map((item) => ({
        time: item.time,
        source: "Activity",
        host: item.host,
        message: `${item.name}: ${item.subject} (${item.status})`,
      })),
    ].sort((a, b) => a.time.localeCompare(b.time)),
  );
  let output = $derived(
    (follow ? live : frozen).filter(
      (item) =>
        (!demo.host || item.host === demo.host) &&
        (!filter || item.source === filter) &&
        [item.message, item.time, hostName(item.host)]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
  );
  let stream = $state<HTMLDivElement>();
  let lastCount = 0;
  $effect(() => {
    const count = output.length;
    if (follow && stream && count !== lastCount) {
      lastCount = count;
      tick().then(() => stream?.scrollTo(0, stream.scrollHeight));
    }
  });
  let updates = $derived(
    demo.updates.filter(
      (item) =>
        (!demo.host || item.host === demo.host) &&
        (!filter || item.status === filter) &&
        item.name.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  const settings: Record<string, string[]> = {
    Appearance: ["Compact rows", "Reduce texture"],
    System: ["Show capability details"],
    Updates: ["Notify about available updates"],
    Network: ["Show host addresses"],
    Storage: ["Show volume sizes"],
    "API and security": ["Mask demo identifiers"],
  };
  let members = $derived(
    (tab === "API keys" ? demo.keys : security[tab]).filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(query.toLowerCase()),
    ),
  );
</script>

{#if section === "updates"}<Toolbar bind:query label="Search updates..."
    ><select bind:value={filter} aria-label="Update status"
      ><option value="">All statuses</option
      >{#each ["Available", "Pending", "In progress", "Completed", "Cancelled"] as name}<option
          >{name}</option
        >{/each}</select
    ><button disabled={!hosts.some(host => host.online && (!demo.host || host.id === demo.host))} onclick={() => refreshUpdates(demo.host)}><RefreshCw size={14}/>Check for updates</button>
    <button disabled={!demo.updates.some(job => job.status === 'Completed' && (!demo.host || job.host === demo.host))} onclick={() => clearCompletedUpdates(demo.host)}><Trash2 size={14}/>Clear completed</button>
    <small role="status">Last checked: {demo.updateChecks[demo.host] ?? 'Not checked this session'}</small></Toolbar
  >{#each hosts.filter( (host) => updates.some((item) => item.host === host.id) ) as host}<div
      class="section-head"
    >
      <h2>{host.name}</h2>
    </div>
    <Table
      rows={updates.filter((item) => item.host === host.id)}
      columns={["Name", "Type", "Version", "Status", "Actions"]}
      value={(item, col) =>
        Object.entries(item).find(([key]) => key === col.toLowerCase())?.[1] ??
        ""}
      >{#snippet cell(item, col)}{#if col === "Status"}<Badge
            value={item.status}
          />{:else if col === "Actions"}<button
            disabled={item.status === "Completed" || item.status === "Cancelled"}
            onclick={() => completeUpdate(item)}
            ><RefreshCw size={13} />Mock update</button
          >{:else}{Object.entries(item).find(
            ([key]) => key === col.toLowerCase(),
          )?.[1]}{/if}{/snippet}</Table
    >{/each}{#if !updates.length}<p class="empty">No matching updates.</p>{/if}
{:else if section === "security"}<div class="tabs">
    {#each Object.keys(security) as key}<button
        class:selected={tab === key}
        onclick={() => (tab = key as keyof typeof security)}>{key}</button
      >{/each}
  </div>
  <Toolbar bind:query label="Search security records..."
    >{#if tab === "API keys"}<button
        onclick={() => {
          keyName = "";
          confirm = "Create demo key";
        }}><KeyRound size={14} />Create demo key</button
      >{/if}</Toolbar
  ><Table
    rows={members}
    columns={tab === "API keys"
      ? ["Name", "Role", "Scope", "Actions"]
      : ["Name", "Role", "Scope"]}
    value={(item, col) => item[col.toLowerCase() as keyof typeof item] ?? ""}
    >{#snippet cell(item, col)}{#if col === "Actions"}<button
          title={"Revoke " + item.name}
          onclick={() => {
            keyName = item.name;
            confirm = "Revoke demo key";
          }}><Trash2 size={13} /></button
        >{:else}{item[
          col.toLowerCase() as keyof typeof item
        ]}{/if}{/snippet}</Table
  >
{:else if section === "logs"}<Toolbar bind:query label="Search logs..."
    ><select aria-label="Log source" bind:value={filter}
      ><option value="">All sources</option><option>System</option><option
        >Activity</option
      ><option>Container</option></select
    ><label class="inline"
      ><input
        type="checkbox"
        checked={follow}
        onchange={() => {
          if (follow) frozen = [...live];
          follow = !follow;
        }}
      />Live follow</label
    ></Toolbar
  >
  <div class="log-stream" bind:this={stream}>
    {#each output as entry}<div>
        <time>{entry.time}</time><b>{entry.source}</b><small
          >{hostName(entry.host)}</small
        ><code>{entry.message}</code>
      </div>{:else}<p class="empty">No matching log entries.</p>{/each}
  </div>
{:else}<div class="settings">
    {#each Object.entries(settings) as [group, options]}<section>
        <h2>{group}</h2>
        {#each options as option}<label class="setting"
            >{option}<input
              type="checkbox"
              checked={demo.settings[option] ?? false}
              onchange={(event) => {
                demo.settings[option] = event.currentTarget.checked;
                notify("Demo preference saved");
              }}
            /></label
          >{/each}{#if group === "Appearance"}<label class="setting"
            >Collapse sidebar<input
              type="checkbox"
              bind:checked={demo.collapsed}
            /></label
          >{#each ["systems", "containers", "projects"] as key}<label
              class="setting"
              >{key} view<select
                value={demo.views[key] ?? "Tile"}
                onchange={(event) =>
                  (demo.views[key] = event.currentTarget.value)}
                ><option>Tile</option><option>Detailed</option></select
              ></label
            >{/each}{/if}
      </section>{/each}
  </div>{/if}
{#if confirm}<Modal title={confirm} close={() => (confirm = "")}
    ><form
      class="stack"
      onsubmit={(event) => {
        event.preventDefault();
        if (confirm.startsWith("Create")) {
          if (
            !keyName.trim() ||
            demo.keys.some((item) => item.name === keyName.trim())
          ) {
            notify("Choose a unique name");
            return;
          }
          demo.keys.push({
            name: keyName.trim(),
            role: "Demo key",
            scope: "inventory:read",
          });
        } else demo.keys = demo.keys.filter((item) => item.name !== keyName);
        notify(confirm + " completed");
        confirm = "";
      }}
    >
      <p>Preview only. No credential is issued or used.</p>
      {#if confirm.startsWith("Create")}<label
          >Key label <input required bind:value={keyName} /></label
        >{:else}<p>{keyName}</p>{/if}<button class="primary">Confirm</button>
    </form></Modal
  >{/if}

<style>
  .log-stream {
    background: #101619;
    border: 1px solid var(--line);
    max-height: 65dvh;
    overflow: auto;
  }
  .log-stream > div {
    display: grid;
    grid-template-columns: 74px 76px 105px 1fr;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
  }
  .log-stream b {
    color: var(--cyan);
    font-weight: 500;
  }
  .settings {
    max-width: 820px;
  }
  .settings section {
    border-top: 1px solid var(--line);
    padding: 16px 0;
  }
  .settings h2 {
    margin-bottom: 10px;
  }
  .setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 2px;
    color: #c2cdd3;
    text-transform: capitalize;
  }
  .setting input {
    accent-color: var(--cyan);
  }
  @media (max-width: 680px) {
    .log-stream > div {
      grid-template-columns: 64px 65px 1fr;
    }
    .log-stream code {
      grid-column: 1/-1;
    }
  }
</style>
