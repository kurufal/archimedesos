<script lang="ts">
  import {
    Eye,
    Trash2,
    Pencil,
    Download,
    Plus,
  } from "@lucide/svelte";
  import { hosts } from "./mock";
  import { demo, hostName, record } from "./session.svelte";
  import Table from "./ui/Table.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Modal from "./ui/Modal.svelte";
  import Badge from "./ui/Badge.svelte";
  type Resource = "images" | "networks" | "volumes";
  type Row = {
    name: string;
    host: string;
    attached: string[];
    fields: Record<string, string>;
  };
  let { kind }: { kind: Resource } = $props();
  let query = $state(""),
    usage = $state(""),
    command = $state(""),
    selected = $state<Row | null>(null),
    name = $state(""),
    target = $state("core"),
    error = $state("");
  let inventory = $derived.by(() => {
    return demo[kind].map((item): Row => {
      const members = demo.containers.filter(
        (container) =>
          container.host === item.host &&
          ("repository" in item
            ? container.image === item.name
            : "project" in item
              ? container.project === item.project
              : container.name === item.container),
      );
      const attached = members.map((member) => member.name);
      const fields: Record<string, string> = {
        Name: item.name,
        Host: hostName(item.host),
      };
      if ("repository" in item)
        Object.assign(fields, {
          Repository: item.repository,
          Tag: item.tag,
          ID: demo.settings['Mask demo identifiers'] ? 'Masked' : item.id,
          Size: item.size,
          Created: item.created,
        });
      else if ("subnet" in item)
        Object.assign(fields, {
          Driver: item.driver,
          Scope: item.scope,
          Subnet: item.subnet,
          Gateway: item.gateway,
        });
      else
        Object.assign(fields, {
          Driver: item.driver,
          Mountpoint: item.mountpoint,
          ...(demo.settings['Show volume sizes'] ? { Size: item.size } : {}),
        });
      Object.assign(fields, {
        Usage: attached.length ? "In use" : "Unused",
        Containers: attached.join(", ") || "None",
      });
      return { name: item.name, host: item.host, attached, fields };
    });
  });
  let rows = $derived(
    inventory.filter(
      (item) =>
        (!demo.host || item.host === demo.host) &&
        (!usage || usage === item.fields.Usage) &&
        Object.values(item.fields)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
  );
  function begin(action: string, item: Row | null = null) {
    command = action;
    selected = item;
    target = item?.host || demo.host || "core";
    name = item?.name ?? "";
    error = "";
  }
  function remove(row: Row) {
    const current = inventory.find(item => item.host === row.host && item.name === row.name);
    const fixture = demo[kind].findIndex(
      (item) => item.name === row.name && item.host === row.host,
    );
    if (fixture < 0 || !current || current.attached.length) return false;
    demo[kind].splice(fixture, 1);
    return true;
  }
  function apply() {
    const value = name.trim();
    if (!hosts.some(host => host.id === target && host.online)) {
      error = 'This demo system is unavailable.';
      return;
    }
    if (["Create", "Pull", "Edit"].includes(command)) {
      if (
        !value ||
        inventory.some(
          (item) =>
            item.name === value &&
            item.host === target &&
            item.name !== selected?.name,
        )
      ) {
        error = "Choose a unique resource name.";
        return;
      }
      if (command === "Edit") {
        const network = demo.networks.find(
          (item) => item.name === selected?.name && item.host === target,
        );
        if (!network) { error = 'Network no longer exists.'; return; }
        if (network.name === value) { error = 'Enter a different name.'; return; }
        network.name = value;
      } else if (kind === "volumes") {
        demo.volumes.push({
          name: value,
          host: target,
          driver: "local",
          mountpoint: `/var/lib/docker/volumes/${value}/_data`,
          size: "0 MB",
          container: "",
        });
      } else if (kind === "networks") {
        const used = new Set(demo.networks.filter(network => network.host === target).map(network => network.subnet));
        const index = Array.from({length:225},(_,offset) => offset + 30).find(octet => !used.has(`172.${octet}.0.0/16`));
        if (index === undefined) { error = 'No demo subnets are available.'; return; }
        demo.networks.push({
          name: value,
          host: target,
          driver: "bridge",
          scope: "local",
          subnet: `172.${index}.0.0/16`,
          gateway: `172.${index}.0.1`,
          project: "",
        });
      } else {
        const [repository, tag = "latest"] = value.split(":");
        if (
          demo.images.some(
            (item) =>
              item.host === target && item.name === `${repository}:${tag}`,
          )
        ) {
          error = "Image already exists.";
          return;
        }
        demo.images.push({
          name: `${repository}:${tag}`,
          host: target,
          repository,
          tag,
          id: `demo:${Date.now().toString(16)}`,
          size: "24 MB",
          created: new Date().toISOString().slice(0, 10),
        });
      }
    } else if (command === 'Remove') {
      if (!selected || !remove(selected)) { error = 'Resource no longer exists or is in use.'; return; }
    } else if (command === 'Prune') {
      const candidates = inventory.filter(item => item.host === target && !item.attached.length);
      if (!candidates.length) { error = 'No unused resources to remove.'; return; }
      candidates.forEach(remove);
    } else return;
    record(
      `${kind} ${command.toLowerCase()}`,
      value || hostName(target),
      target,
    );
    command = "";
  }
  const icons = {
    Inspect: Eye,
    Remove: Trash2,
    Edit: Pencil,
  };
</script>

<Toolbar bind:query label={"Search " + kind + "..."}
  ><select aria-label="Resource usage" bind:value={usage}
    ><option value="">All usage</option><option>In use</option><option
      >Unused</option
    ></select
  ><button
    class="primary"
    onclick={() => begin(kind === "images" ? "Pull" : "Create")}
    >{#if kind === "images"}<Download size={14} />Pull image{:else}<Plus
        size={14}
      />Create {kind.slice(0, -1)}{/if}</button
  >{#if kind !== "networks"}<button onclick={() => begin("Prune")}
      ><Trash2 size={14} />Prune unused</button
    >{/if}</Toolbar
>
<Table
  {rows}
  columns={[
    ...Object.keys(inventory[0]?.fields ?? { Name: "", Host: "", Usage: "" }),
    "Actions",
  ]}
  value={(item, col) => item.fields[col] ?? ""}
  >{#snippet cell(item, col)}{#if col === "Name"}<button
        class="link"
        onclick={() => begin("Inspect", item)}>{item.name}</button
      >{:else if col === "Usage"}<Badge
        value={item.fields[col]}
      />{:else if col === "Actions"}<div class="actions">
        {#each Object.entries(icons).filter(([action]) => action !== "Edit" || kind === "networks") as [action, Icon]}<button
            class="icon"
            title={action + " " + item.name}
            disabled={action === "Remove" && !!item.attached.length}
            onclick={() => begin(action, item)}><Icon size={14} /></button
          >{/each}
      </div>{:else}{item.fields[col]}{/if}{/snippet}</Table
>
{#if command}<Modal title={command + " · " + kind} close={() => (command = "")}
    >{#if command === "Inspect" && selected}<dl>
        {#each Object.entries(selected.fields) as [key, value]}<dt>{key}</dt>
          <dd>{value}</dd>{/each}
      </dl>{:else}<form
        class="stack"
        onsubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <label class="stack"
          >Demo system<select
            bind:value={target}
            disabled={!!selected || !!demo.host}
            >{#each hosts as host}<option value={host.id}>{host.name}</option
              >{/each}</select
          ></label
        >{#if ["Create", "Pull", "Edit"].includes(command)}<label class="stack"
            >{kind === "images" ? "Image reference" : "Name"}<input
              required
              bind:value={name}
            /></label
          >{:else}<p>
            {command === "Prune"
              ? `Remove ${inventory.filter((item) => item.host === target && !item.attached.length).length} unused ${kind} from the demo inventory?`
              : `${command} ${name} in the demo inventory?`}
          </p>{/if}{#if error}<p class="red" role="alert">
            {error}
          </p>{/if}<button class="primary"
          >Confirm mock {command.toLowerCase()}</button
        >
      </form>{/if}</Modal
  >{/if}
