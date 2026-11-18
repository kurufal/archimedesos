<script lang="ts">
  import { ArrowLeft, FolderGit2, UploadCloud } from "@lucide/svelte";
  import { projects, projectMembers, projectHealth, resourceId, type Project } from "./mock";
  import { demo, hostName, record } from "./session.svelte";
  import Table from "./ui/Table.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Badge from "./ui/Badge.svelte";
  import ProjectServices from "./ProjectServices.svelte";
  import Workspace from "./editor/Workspace.svelte";
  let query = $state(""),
    project = $state<Project | null>(null),
    tab = $state("Configuration"),
    editor = $state<Workspace>();
  let rows = $derived(
    projects.filter(
      (item) =>
        (!demo.host || item.host === demo.host) &&
        item.name.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  function info(item: Project) {
    const members = projectMembers(item, demo.containers);
    return {
      Name: item.name,
      Host: hostName(item.host),
      Status: projectHealth(members),
      Services: members.length,
      Running: members.filter((container) =>
        ["Running", "Unhealthy"].includes(container.status),
      ).length,
      Stopped: members.filter((container) => container.status === "Stopped")
        .length,
      Compose: item.path,
      Updated: item.updated,
    };
  }
  function inspect(item: Project) {
    project = item;
    tab = "Configuration";
  }
  $effect(() => {
    if (project && demo.host && demo.host !== project.host) {
      if (editor && !editor.canLeave()) demo.host = project.host;
      else project = null;
    }
  });
</script>

{#if !project}<Toolbar
    bind:query
    label="Search projects..."
    viewKey="projects"
  />{#if (demo.views.projects ?? "Tile") === "Tile"}<div class="cards">
      {#each rows as item}<article class="card">
          <div class="inline">
            <FolderGit2 size={20} class="cyan" />
            <h3>
              <button class="link" onclick={() => inspect(item)}
                >{item.name}</button
              >
            </h3>
            <Badge value={info(item).Status} />
          </div>
          <dl>
            {#each Object.entries(info(item)).filter(([key]) => !["Name", "Status"].includes(key)) as [key, value]}<dt
              >
                {key}
              </dt>
              <dd>{value}</dd>{/each}
          </dl>
          <button onclick={() => inspect(item)}>Open workspace</button>
        </article>{:else}<p class="empty">No matching projects.</p>{/each}
    </div>{:else}<Table
      {rows}
      columns={Object.keys(info(projects[0]))}
      value={(item, col) =>
        Object.entries(info(item)).find(([key]) => key === col)?.[1] ?? ""}
      >{#snippet cell(item, col)}{#if col === "Name"}<button
            class="link"
            onclick={() => inspect(item)}>{item.name}</button
          >{:else}{Object.entries(info(item)).find(
            ([key]) => key === col,
          )?.[1]}{/if}{/snippet}</Table
    >{/if}{:else}{@const item = project}<button
    class="link"
    onclick={() => {
      if (!editor || editor.canLeave()) project = null;
    }}><ArrowLeft size={14} />All projects</button
  >
  <div class="section-head">
    <h2>{item.name}<Badge value={info(item).Status} /></h2>
    <span class="inline"
      >{hostName(item.host)}<button
        onclick={() => record("Mock deployment", item.name, item.host)}
        ><UploadCloud size={14} />Deploy</button
      ></span
    >
  </div>
  <div class="tabs">
    {#each ["Services", "Configuration", "Git Backup"] as name}<button
        class:selected={tab === name}
        onclick={() => (tab = name)}>{name}</button
      >{/each}
  </div>
  <div hidden={tab !== "Configuration"}>
    <Workspace project={item} bind:this={editor} />
  </div>
  <div hidden={tab !== 'Services'}><ProjectServices project={item}/></div>
  {#if tab === "Git Backup"}<h3>Repository backup</h3>
    <dl>
      <dt>Repository</dt>
      <dd>{item.repo}</dd>
      <dt>Connection</dt>
      <dd>Not connected · preview only</dd>
      <dt>Last backup</dt>
      <dd>{demo.backups[resourceId(item.host,item.name)] ?? "No demo backup yet"}</dd>
    </dl>
    <button
      onclick={() => {
        record("Backup preview", item.name, item.host);
        demo.backups[resourceId(item.host,item.name)] = demo.activities[0].time + " UTC (demo)";
      }}>Preview backup</button
    >{/if}{/if}
