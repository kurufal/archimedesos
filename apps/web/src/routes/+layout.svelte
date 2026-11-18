<script lang="ts">
  import { onMount, tick } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { page, navigating } from "$app/state";
  import {
    LayoutDashboard,
    Download,
    FolderGit2,
    ShieldCheck,
    Server,
    Box,
    Layers,
    Network,
    Database,
    ScrollText,
    Settings,
    FolderOpen,
    Terminal,
    PanelLeftClose,
    PanelLeftOpen,
    Activity as Pulse,
    ChevronRight,
    Menu,
    X,
    FlaskConical,
    Check,
    Monitor,
  } from "@lucide/svelte";
  import { groups, hosts, navigation } from "$lib/mock";
  import { demo, defaultSettings } from "$lib/session.svelte";
  import Activity from "$lib/Activity.svelte";
  import "../theme.css";
  let { children } = $props();
  const icons = {
    LayoutDashboard,
    Download,
    FolderGit2,
    ShieldCheck,
    Server,
    Box,
    Layers,
    Network,
    Database,
    ScrollText,
    Settings,
    FolderOpen, Terminal,
  };
  let activeEntry = $derived(navigation.find(item => item.route === page.url.pathname));
  let current = $derived(activeEntry?.label ?? 'ArchimedesOS');
  let group = $derived(activeEntry?.section);
  let mobile = $state(false),
    ready = $state(false);
  let main: HTMLElement;
  let active = $derived(
    demo.activities.filter(
      (item) =>
        item.status === "Active" && (!demo.host || item.host === demo.host),
    ).length,
  );
  onMount(() => {
    try {
      const prefs = JSON.parse(
        localStorage.getItem("archimedes.display") ?? "{}",
      );
      demo.collapsed = prefs.collapsed === true;
      demo.views = prefs.views ?? {};
      demo.settings = { ...defaultSettings, ...prefs.settings };
    } catch {}
    ready = true;
  });
  $effect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "archimedes.display",
          JSON.stringify({
            collapsed: demo.collapsed,
            views: demo.views,
            settings: demo.settings,
          }),
        );
      } catch {}
    }
  });
  afterNavigate(() => {
    mobile = false;
    main?.scrollTo(0, 0);
  });
  let drawer = $state<HTMLDialogElement>(null!);
  async function openActivity() {
    demo.activity = true;
    await tick();
    drawer?.showModal();
  }
</script>

<svelte:head><title>{current} | ArchimedesOS</title></svelte:head>
<a class="skip" href="#content">Skip to content</a>
<div
  class="shell"
  class:collapsed={demo.collapsed}
  class:mobile
  class:dense={demo.settings["Compact rows"]}
  class:textureless={demo.settings['Reduce texture']}
>
  {#if mobile}<button
      class="scrim"
      aria-label="Dismiss navigation"
      onclick={() => (mobile = false)}
    ></button>{/if}
  <aside class="sidebar">
    <a href="/" class="brand" title="ArchimedesOS dashboard"
      ><svg width="31" height="31" viewBox="0 0 32 32" aria-hidden="true"
        ><path fill="currentColor" d="M16 1 31 29 18 22l-2-5-3 6-12 6z" /><path
          fill="#10191d"
          d="m16 8 4 9-5-3z"
        /></svg
      ><span>Archimedes<b>OS</b></span></a
    >
    <nav aria-label="Main navigation">
      {#each Object.entries(groups) as [section, items]}<div class="navgroup">
            <small>{section}</small>{#each items ?? [] as item}{@const Icon = icons[item.icon]}<a
              title={item.label}
              href={item.route}
              aria-current={activeEntry === item ? "page" : undefined}
              ><Icon size={17} /><span>{item.label}</span>{#if item.label==='Updates' && demo.settings['Notify about available updates']}<b class="count">{demo.updates.filter(job=>job.status==='Available'&&(!demo.host||job.host===demo.host)).length}</b>{/if}</a
            >{/each}
        </div>{/each}
    </nav>
    <div class="sidefoot">
      <span class="demo-dot"></span><span>Demo workspace</span><button
        class="icon"
        title="Toggle sidebar"
        onclick={() => (demo.collapsed = !demo.collapsed)}
        >{#if demo.collapsed}<PanelLeftOpen />{:else}<PanelLeftClose
          />{/if}</button
      >
    </div>
  </aside>
  <div class="body">
    <div class="topbar">
      <button
        class="mobile-toggle icon"
        aria-label="Open navigation"
        aria-expanded={mobile}
        onclick={async () => {mobile = true;await tick();document.querySelector<HTMLElement>('.sidebar [aria-current]')?.focus()}}><Menu /></button
      >
      <div class="crumb">{group}<ChevronRight size={13} /><b>{current}</b></div>
      <span class="topfill"></span><label class="host-select"
        ><Monitor size={15} /><select
          aria-label="Active system"
          bind:value={demo.host}
          ><option value="">All systems</option>{#each hosts as host}<option
              value={host.id}>{host.name}</option
            >{/each}</select
        ></label
      ><button class="activity-button" onclick={openActivity}
        ><Pulse size={16} /> Activity <b>{active}</b></button
      >
    </div>
    <main id="content" tabindex="-1" bind:this={main} aria-busy={!!navigating.to}>
      {#if navigating.to}<progress aria-label="Loading page"></progress>{/if}
      {@render children()}
    </main>
    <footer>
      <span><i class="demo-dot"></i> Demo environment</span><span
        ><FlaskConical size={12} /> Simulated data</span
      >
    </footer>
  </div>
</div>
{#if demo.activity}<dialog
    class="drawer"
    bind:this={drawer}
    onclose={() => (demo.activity = false)}
    aria-label="Activity queue"
  >
    <div class="modal-head">
      <h2>Activity queue</h2>
      <button
        class="icon"
        aria-label="Close activity"
        onclick={() => drawer.close()}><X /></button
      >
    </div>
    <div class="modal-body"><Activity /></div>
  </dialog>{/if}
{#if demo.toast}<div role="status" class="toast">
    <Check size={16} />{demo.toast}
  </div>{/if}
