<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import {
    FileCode2,
    Folder,
    FolderOpen,
    FilePlus,
    FolderPlus,
    Pencil,
    Trash2,
    Upload,
    Download,
    RefreshCw,
    Save,
    SaveAll,
    Undo2,
    LockKeyhole,
    X,
    FileText,
    Database,
    Braces,
    ChevronRight,
    Eye,
  } from "@lucide/svelte";
  import type { Project } from "../mock";
  import { demo, notify, record } from "../session.svelte";
  import Modal from "../ui/Modal.svelte";
  import { parseDocument } from "yaml";
  let { project }: { project: Project } = $props();
  let files = $derived(demo.files[project.name]);
  let drafts = $state<Record<string, string>>({}),
    opened = $state(["compose.yaml"]),
    current = $state("compose.yaml"),
    selected = $state("compose.yaml"),
    expanded = $state<string[]>([]),
    masked = $state(true),
    revision = $state(0),
    command = $state(""),
    input = $state(""),
    payload = $state(""),
    error = $state(""),
    menu = $state(false);
  let dirs = $derived([
    ...new Set([
      ...Object.keys(files).flatMap((path) =>
        path
          .split("/")
          .slice(0, -1)
          .map((_, index) =>
            path
              .split("/")
              .slice(0, index + 1)
              .join("/"),
          ),
      ),
      ...demo.directories[project.name],
    ]),
  ]);
  let dirty = $derived(
    Object.keys(drafts).filter((path) => drafts[path] !== files[path]),
  );
  let text = $derived(drafts[current] ?? files[current] ?? "");
  let diagnostics = $derived.by(() => {
    if (/\.ya?ml$/.test(current)) {
      const doc = parseDocument(text);
      if (doc.errors.length) return doc.errors[0].message;
      if (current === "compose.yaml" && !doc.has("services"))
        return "Missing services mapping";
    }
    if (current.endsWith(".json")) {
      try {
        JSON.parse(text);
      } catch {
        return "Invalid JSON document";
      }
    }
    return "";
  });
  const protectedFile = (path: string) => path === "compose.yaml";
  const editable = (path: string) => /(?:\.(?:ya?ml|env|json|xml|txt|conf|cfg|ini|toml|log|md|properties)|(?:^|\/)(?:Dockerfile|README))$/i.test(path);
  const binary = (path: string) => /\.(db|sqlite|png|gif|zip|bin)$/i.test(path);
  function open(path: string) {
    selected = path;
    menu = false;
    if (dirs.includes(path)) {
      expanded = expanded.includes(path)
        ? expanded.filter((entry) => entry !== path)
        : [...expanded, path];
      return;
    }
    current = path;
    if (!opened.includes(path)) opened.push(path);
  }
  function save(paths: string[]) {
    const changed = paths.filter((path) => dirty.includes(path));
    for (const path of changed) {
      files[path] = drafts[path];
      delete drafts[path];
    }
    if (changed.length)
      record(
        "Configuration saved",
        `${project.name} / ${changed.join(", ")}`,
        project.host,
      );
    else notify("No unsaved changes");
  }
  function close(path: string) {
    if (dirty.includes(path) && !confirm(`Discard unsaved changes to ${path}?`))
      return;
    delete drafts[path];
    opened = opened.filter((entry) => entry !== path);
    if (current === path) current = opened.at(-1) ?? "";
  }
  export function canLeave() {
    return !dirty.length || confirm("Discard unsaved workspace changes?");
  }
  beforeNavigate((nav) => {
    if (dirty.length) {
      if (nav.willUnload) {
        nav.cancel();
      } else if (!canLeave()) nav.cancel();
    }
  });
  function begin(action: string) {
    menu = false;
    error = "";
    const parent = dirs.includes(selected)
      ? selected
      : selected.split("/").slice(0, -1).join("/");
    input = action === "Rename" ? selected : parent ? parent + "/" : "";
    payload = "";
    command = action;
    if (action === "Refresh") {
      command = "";
      notify("Mock workspace refreshed");
    }
  }
  function apply() {
    const path = input.trim();
    if (["New file", "New folder", "Upload", "Rename"].includes(command)) {
      if (
        !path ||
        path
          .split("/")
          .some((part) => !part || part === "." || part === "..") ||
        /[\\:\x00-\x1f]/.test(path) ||
        path.split('/').some(part => ['__proto__', 'constructor', 'prototype'].includes(part)) ||
        Object.hasOwn(files, path) ||
        dirs.includes(path) ||
        path
          .split("/")
          .slice(0, -1)
          .some((_, index) =>
            Object.hasOwn(
              files,
              path
                .split("/")
                .slice(0, index + 1)
                .join("/"),
            ),
          )
      ) {
        error = "Choose a unique relative workspace path.";
        return;
      }
    }
    if (command === "Rename" || command === "Delete") {
      if (protectedFile(selected)) {
        error = "The base Compose file is protected.";
        return;
      }
      const affected = (entry: string) =>
        entry === selected || entry.startsWith(selected + "/");
      if (command === "Rename" && path.startsWith(selected + "/")) {
        error = "A folder cannot contain itself.";
        return;
      }
      const remap = (entry: string) => path + entry.slice(selected.length);
      for (const entry of Object.keys(files).filter(affected)) {
        if (command === "Rename") {
          files[remap(entry)] = files[entry];
          if (Object.hasOwn(drafts, entry))
            drafts[remap(entry)] = drafts[entry];
        }
        delete files[entry];
        delete drafts[entry];
      }
      const update = (list: string[]) =>
        command === "Delete"
          ? list.filter((entry) => !affected(entry))
          : list.map((entry) => (affected(entry) ? remap(entry) : entry));
      demo.directories[project.name] = update(demo.directories[project.name]);
      expanded = update(expanded);
      opened = update(opened);
      current = opened.includes(current) ? current : (opened.at(-1) ?? "");
      selected = command === "Rename" ? path : current;
    } else if (command === "New folder") {
      demo.directories[project.name].push(path);
      expanded.push(path);
      selected = path;
    } else if (command === "New file" || command === "Upload") {
      files[path] = binary(path) ? null : payload;
      open(path);
    }
    record(`Workspace ${command.toLowerCase()}`, project.name, project.host);
    command = "";
  }
  const tools = [
    ["New file", FilePlus],
    ["New folder", FolderPlus],
    ["Rename", Pencil],
    ["Delete", Trash2],
    ["Upload", Upload],
    ["Download", Download],
    ["Refresh", RefreshCw],
  ] as const;
</script>

<div class="workspace">
  <aside>
    <div class="bar"><strong>Workspace files</strong><small>DEMO</small></div>
    <div class="file-tools">
      {#each tools as [name, Icon]}<button
          title={name}
          aria-label={name}
          disabled={(["Rename", "Delete"].includes(name) &&
            protectedFile(selected)) ||
            (name === "Download" && (!selected || dirs.includes(selected)))}
          onclick={() => begin(name)}><Icon size={14} /></button
        >{/each}
    </div>
    {#snippet branch(parent: string)}{#each [...dirs, ...Object.keys(files)]
        .filter((path) => path.split("/").slice(0, -1).join("/") === parent)
        .sort((a, b) => Number(dirs.includes(b)) - Number(dirs.includes(a)) || a.localeCompare(b)) as path}{@const directory =
          dirs.includes(path)}{@const Icon = directory
          ? expanded.includes(path)
            ? FolderOpen
            : Folder
          : binary(path)
            ? Database
            : path.endsWith(".json")
              ? Braces
              : path.endsWith(".env")
                ? LockKeyhole
                : /yaml|xml/.test(path)
                  ? FileCode2
                  : FileText}<button
          class="file"
          class:selected={path === selected}
          style:padding-left={8 + 12 * (path.split("/").length - 1) + "px"}
          aria-expanded={directory ? expanded.includes(path) : undefined}
          oncontextmenu={(event) => {
            event.preventDefault();
            selected = path;
            menu = true;
          }}
          onkeydown={(event) => {
            if (
              event.key === "ContextMenu" ||
              (event.shiftKey && event.key === "F10")
            ) {
              event.preventDefault();
              selected = path;
              menu = true;
            }
          }}
          onclick={() => open(path)}
          ><Icon size={14} />{path.split("/").at(-1)}{dirty.includes(path)
            ? " *"
            : ""}{#if protectedFile(path)}<LockKeyhole size={10} />{/if}</button
        >{#if directory && expanded.includes(path)}{@render branch(
            path,
          )}{/if}{/each}{/snippet}{@render branch("")}
  </aside>
  <div class="work-main">
    <div class="file-tabs">
      {#each opened as path}<div class:active={current === path}>
          <button onclick={() => open(path)}
            >{path.split("/").at(-1)}{dirty.includes(path) ? " *" : ""}</button
          ><button aria-label={"Close " + path} onclick={() => close(path)}
            ><X size={12} /></button
          >
        </div>{/each}
    </div>
    {#if current}<div class="bar">
        <code>{current}</code>
        <div class="actions">
          <button
            title="Mock save"
            aria-label="Mock save"
            disabled={!dirty.includes(current)}
            onclick={() => save([current])}><Save size={14} /></button
          ><button
            title="Mock save all"
            aria-label="Mock save all"
            disabled={!dirty.length}
            onclick={() => save(dirty)}><SaveAll size={14} /></button
          ><button
            title="Revert changes"
            aria-label="Revert changes"
            disabled={!dirty.includes(current)}
            onclick={() => {
              delete drafts[current];
              revision++;
            }}><Undo2 size={14} /></button
          >{#if current.endsWith(".env")}<button
              title="Toggle value masking"
              onclick={() => (masked = !masked)}><Eye size={14} /></button
            >{/if}
        </div>
      </div>
        {#if files[current] === null || !editable(current)}<p class="empty">
          {files[current] === null ? 'Binary file' : 'Unsupported format'} · read only
        </p>{:else if current.endsWith(".env") && masked}<pre>{text.replace(
            /=.*/g,
            "=********",
          )}</pre>{:else}{#key current + revision}{#await import('./CodeEditor.svelte')}<p class="empty" role="status">Loading editor...</p>{:then editor}<editor.default
            path={current}
            {text}
            change={(value) => (drafts[current] = value)}
            save={() => save([current])}
            saveAll={() => save(dirty)}
          />{:catch}<p class="empty" role="alert">Editor unavailable. Reopen this file to retry.</p>{/await}{/key}{/if}
      <div class="editor-status" role="status">
        {diagnostics ||
          (current.endsWith(".env")
            ? "Demo values only. Never enter real secrets."
            : current === "compose.yaml"
              ? "YAML diagnostics · Compose engine validation not connected"
              : "Session-only workspace")}<span>{dirty.length} unsaved</span>
      </div>{:else}<p class="empty">Select a workspace file.</p>{/if}
  </div>
</div>
{#if menu}<Modal title={selected} close={() => (menu = false)}
    ><div class="actions">
      <button onclick={() => open(selected)}
        ><ChevronRight size={14} />Open / toggle</button
      >{#each tools as [name, Icon]}<button
          disabled={["Rename", "Delete"].includes(name) &&
            protectedFile(selected)}
          onclick={() => begin(name)}><Icon size={14} />{name}</button
        >{/each}
    </div></Modal
  >{/if}
{#if command}<Modal
    title={command + " · demo workspace"}
    close={() => (command = "")}
    >{#if command === "Download"}<p>Download preview: {selected}</p>
      <pre>{selected.endsWith(".env")
          ? "Values masked"
          : (files[selected] ?? "Binary content")}</pre>{:else}<form
        class="stack"
        onsubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        {#if command === "Delete"}<p>
            Delete {selected} and any unsaved changes in this demo workspace?
          </p>{:else}<label class="stack"
            >Workspace path<input required bind:value={input} /></label
          >{#if command === "Upload"}<label class="stack"
              >Synthetic upload content<textarea bind:value={payload}
              ></textarea></label
            >{/if}{/if}{#if error}<p role="alert" class="red">
            {error}
          </p>{/if}<button class="primary"
          >Confirm {command.toLowerCase()}</button
        >
      </form>{/if}</Modal
  >{/if}

<style>
  .workspace {
    display: grid;
    grid-template-columns: 215px minmax(0, 1fr);
    border: 1px solid var(--line);
    background: var(--surface);
  }
  aside {
    border-right: 1px solid var(--line);
    padding-bottom: 12px;
  }
  .bar,
  .editor-status,
  .file-tools,
  .file-tabs,
  .file-tabs > div {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .bar,
  .editor-status {
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
  }
  .bar button,
  .file-tools button,
  .file-tabs button {
    min-height: 26px;
    padding: 4px 5px;
  }
  .file-tools {
    padding: 5px;
    flex-wrap: wrap;
  }
  .file {
    border: 0;
    border-left: 2px solid transparent;
    width: 100%;
    justify-content: flex-start;
    background: none;
    font: 12px var(--mono);
    text-align: left;
    overflow-wrap: anywhere;
  }
  .file :global(svg) {
    color: var(--amber);
    flex: none;
  }
  .file.selected {
    background: #203038;
    border-color: var(--cyan);
  }
  .work-main {
    min-width: 0;
  }
  .file-tabs {
    overflow-x: auto;
    background: var(--bg);
  }
  .file-tabs > div {
    flex: none;
  }
  .file-tabs button {
    border: 0;
    background: none;
  }
  .file-tabs .active {
    box-shadow: inset 0 2px var(--cyan);
    background: var(--surface);
  }
  .editor-status {
    color: var(--muted);
    gap: 10px;
    font-size: 11px;
  }
  .editor-status span {
    white-space: nowrap;
  }
  textarea {
    background: var(--bg);
    color: var(--text);
    min-height: 80px;
  }
  @media (max-width: 850px) {
    .workspace {
      grid-template-columns: minmax(0, 1fr);
    }
    aside {
      border-bottom: 1px solid var(--line);
      max-height: 210px;
      overflow: auto;
    }
  }
</style>
