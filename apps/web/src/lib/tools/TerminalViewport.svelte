<script module lang="ts">
  type TerminalModules = [typeof import('@xterm/xterm'), typeof import('@xterm/addon-fit')];
  let loading: Promise<TerminalModules> | undefined;
  export function preloadTerminal() {
    return loading ??= Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]).catch(error => {
      loading = undefined;
      throw error;
    });
  }
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { IDisposable, Terminal } from '@xterm/xterm';
  import type { FitAddon } from '@xterm/addon-fit';
  import { attachDemoTransport, terminalReplay, TERMINAL_SCROLLBACK, type TerminalSession, type TerminalTransport } from './terminal';
  import '@xterm/xterm/css/xterm.css';

  let {session,active,fontSize,cursorBlink,revision,startedAt,shortcut}: {session:TerminalSession;active:boolean;fontSize:number;cursorBlink:boolean;revision:number;startedAt?:number;shortcut:(event:KeyboardEvent)=>boolean} = $props();
  let surface: HTMLDivElement;
  let status = $state<'loading'|'ready'|'failed'>('loading');
  let mounted = false, focusPending = false, frame = 0, fitAttempts = 0;
  let modules: TerminalModules | undefined;
  let instance: Terminal | undefined, fit: FitAddon | undefined, transport: TerminalTransport | undefined, input: IDisposable | undefined;
  let mountedAt = 0, modulesAt = 0, openMs = 0;

  function release() {
    input?.dispose(); input = undefined;
    transport?.dispose(); transport = undefined;
    instance?.dispose(); instance = undefined;
    fit = undefined;
  }
  function fail(error:unknown) {
    if (!mounted) return;
    status = 'failed';
    release();
    if (import.meta.env.DEV) console.warn('[archimedes:terminal] Initialization failed', session.id, error);
  }
  function schedule() {
    if (!mounted || !active || !modules || frame || status === 'failed') return;
    frame = requestAnimationFrame(layout);
  }
  function layout() {
    frame = 0;
    if (!mounted || !active || !modules || !surface.clientWidth || !surface.clientHeight) return;
    try {
      if (!instance) {
        const openingAt = import.meta.env.DEV ? performance.now() : 0;
        const [core, addon] = modules;
        const terminal = instance = new core.Terminal({scrollback:TERMINAL_SCROLLBACK,fontSize,cursorBlink,fontFamily:'Cascadia Code, Consolas, monospace',theme:{background:'#0b0f13',foreground:'#e8edf2',cursor:'#56dce8',selectionBackground:'#34505c'}});
        fit = new addon.FitAddon();
        terminal.loadAddon(fit);
        transport = attachDemoTransport(session,text => terminal.write(text),() => terminal.reset());
        input = terminal.onData(data => transport?.input(data));
        terminal.attachCustomKeyEventHandler(event => !shortcut(event));
        terminal.open(surface);
        terminal.write(terminalReplay(session));
        if (import.meta.env.DEV) openMs = performance.now() - openingAt;
      }
      instance.options.fontSize = fontSize;
      instance.options.cursorBlink = cursorBlink;
      const dimensions = fit?.proposeDimensions();
      if (!dimensions || !Number.isFinite(dimensions.cols) || !Number.isFinite(dimensions.rows)) {
        if (++fitAttempts < 5) { schedule(); return; }
        if (status === 'ready') return;
        throw new Error('Terminal character dimensions are unavailable.');
      }
      fitAttempts = 0;
      const fittingAt = import.meta.env.DEV ? performance.now() : 0;
      fit?.fit();
      transport?.resize(instance.cols,instance.rows);
      if (status === 'loading') {
        status = 'ready';
        if (import.meta.env.DEV && startedAt !== undefined) {
          const now = performance.now();
          console.debug(`[archimedes:terminal] Session ${session.id} ready`, {
            tabMountMs: Math.round(mountedAt - startedAt),
            dependencyWaitMs: Math.round(modulesAt - mountedAt),
            openMs: Math.round(openMs), firstFitMs: Math.round(now - fittingAt),
            clickToReadyMs: Math.round(now - startedAt),
          });
        }
      }
      if (focusPending) {
        focusPending = false;
        if (document.activeElement === document.body || document.activeElement?.closest('[data-terminal-activate], .terminal-viewport[hidden]')) instance.focus();
      }
    } catch (error) { fail(error); }
  }
  onMount(() => {
    mounted = true;
    if (import.meta.env.DEV) mountedAt = performance.now();
    const observer = new ResizeObserver(schedule);
    observer.observe(surface);
    void preloadTerminal().then(loaded => {
      if (!mounted) return;
      modules = loaded;
      if (import.meta.env.DEV) modulesAt = performance.now();
      schedule();
    },fail);
    return () => {
      mounted = false;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      release();
    };
  });
  $effect(() => {
    focusPending = active;
    if (active) untrack(schedule);
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  $effect(() => {
    fontSize; cursorBlink;
    untrack(schedule);
  });
  $effect(() => {
    revision;
    if (instance) { instance.reset(); instance.write(untrack(() => terminalReplay(session))); }
  });
</script>

<div class="terminal-viewport" hidden={!active} data-session-id={session.id}>
  <div class="terminal-surface" bind:this={surface} aria-label="Terminal output"></div>
  {#if status === 'failed'}<p class="empty message" role="alert">Terminal could not initialize. Close this tab or reload the page to retry.</p>
  {:else if status === 'loading'}<p class="empty message" role="status">Loading terminal…</p>{/if}
</div>

<style>
  .terminal-viewport { position:relative; }
  .terminal-viewport[hidden] { display:none; }
  .terminal-surface { height:var(--terminal-height,clamp(280px,52dvh,780px)); min-width:0; background:#0b0f13; padding:8px; overflow:hidden; }
  .terminal-surface :global(.xterm) { height:100%; }
  .message { position:absolute; inset:0; display:grid; place-items:center; margin:0; }
</style>