<script lang="ts">
  import { Box, FolderTree, Play, Square, RotateCw, Terminal } from '@lucide/svelte';
  import { projectMembers, serviceProcesses, type Project } from './mock';
  import { demo, hostName, operate } from './session.svelte';
  import Badge from './ui/Badge.svelte';

  let { project }: { project: Project } = $props();
  const views = ['Overview', 'Shell', 'Logs', 'Metrics', 'Processes'];
  const actions = [['Start', Play], ['Stop', Square], ['Restart', RotateCw]] as const;
  let selected = $state(''), view = $state('Overview'), command = $state('');
  let transcripts = $state<Record<string,string[]>>({});
  let services = $derived(projectMembers(project, demo.containers));
  let service = $derived(services.find(item => item.name === selected) ?? services[0]);
  let entries = $derived(service ? demo.containerLogs.filter(entry => entry.host === service.host && entry.message.startsWith(service.name + ':')) : []);
  let processes = $derived(service ? serviceProcesses(service) : []);

  function submitCommand(event: SubmitEvent) {
    event.preventDefault();
    if (!service || !command.trim() || service.status === 'Stopped') return;
    const input = command.trim();
    const output = input === 'help' ? 'Commands: help, hostname, ps, clear' : input === 'hostname' ? service.name : input === 'ps' ? processes.map(proc => `${proc.pid}  ${proc.command}`).join('\n') : 'Unknown demo command. Type help.';
    transcripts[service.name] = input === 'clear' ? [] : [...(transcripts[service.name] ?? []), `$ ${input}`, output];
    command = '';
  }
</script>

<div class="service-workspace">
  <aside aria-label="Project services">
    <div class="bar"><strong>Project services</strong><small>{services.length}</small></div>
    <details open><summary><FolderTree size={14}/> {project.name}</summary>
      <ul>{#each services as item (item.name)}<li>
        <button class="leaf" aria-pressed={item === service} onclick={() => {selected = item.name; command = '';}}>
          <Box size={14}/>{item.name}
        </button>
      </li>{/each}</ul>
    </details>
  </aside>
  {#if service}<section aria-label="Service inspector">
    <div class="bar heading"><div><strong>{service.name}</strong> <Badge value={service.status}/></div>
      <div class="actions">{#each actions as [action, Icon] (action)}
        <button class="icon" title={`${action} ${service.name}`} disabled={action === 'Start' ? service.status !== 'Stopped' : service.status === 'Stopped'} onclick={() => operate(service, action)}><Icon size={14}/></button>
      {/each}</div>
    </div>
    <div class="tabs">{#each views as tab}<button class:selected={view === tab} aria-pressed={view === tab} onclick={() => view = tab}>{tab}</button>{/each}</div>
    <div class="inspector">
      {#if view === 'Overview'}<dl>
        <dt>Host</dt><dd>{hostName(service.host)}</dd><dt>Image</dt><dd>{service.image}</dd>
        <dt>Ports</dt><dd>{service.ports}</dd><dt>Uptime</dt><dd>{service.uptime}</dd>
        <dt>Compose</dt><dd>{project.path}</dd>
        <dt>Networks</dt><dd>{demo.networks.filter(net => net.project === project.name && net.host === project.host).map(net => net.name).join(', ') || 'None'}</dd>
        <dt>Mounts</dt><dd>{demo.volumes.filter(volume => volume.container === service.name && volume.host === service.host).map(volume => volume.name).join(', ') || 'None'}</dd>
      </dl>
      {:else if view === 'Metrics'}<dl><dt>CPU usage</dt><dd>{service.cpu}%<progress aria-label="Service CPU" max="100" value={service.cpu}></progress></dd><dt>Memory usage</dt><dd>{service.memory} MB</dd><dt>Uptime</dt><dd>{service.uptime}</dd></dl>
      {:else if view === 'Logs'}<pre>{entries.map(entry => `${entry.time}  ${entry.message}`).join('\n') || 'No service log entries.'}</pre>
      {:else if view === 'Processes'}<div class="table-scroll"><table><thead><tr>{#each ['PID','Command','CPU','Memory'] as label}<th>{label}</th>{/each}</tr></thead><tbody>{#each processes as proc}<tr><td>{proc.pid}</td><td>{proc.command}</td><td>{proc.cpu}%</td><td>{proc.memory} MB</td></tr>{:else}<tr><td colspan="4">No running processes.</td></tr>{/each}</tbody></table></div>
      {:else}<small>Simulated shell · no host connection</small><pre>{(transcripts[service.name] ?? []).join('\n') || 'Type help for demo commands.'}</pre>
        <form onsubmit={submitCommand}><Terminal size={15}/><input aria-label="Demo shell command" autocomplete="off" placeholder={service.status === 'Stopped' ? 'Service stopped' : 'Command'} disabled={service.status === 'Stopped'} bind:value={command}/><button disabled={service.status === 'Stopped' || !command.trim()}>Run</button></form>
      {/if}
    </div>
  </section>{:else}<p class="empty">No services in this project.</p>{/if}
</div>

<style>
  .service-workspace { display:grid; grid-template-columns:215px minmax(0,1fr); min-height:340px; border:1px solid var(--line); background:var(--surface); }
  section,aside { min-width:0; } aside { border-right:1px solid var(--line); }
  .bar,form { display:flex; align-items:center; gap:8px; } .bar { min-height:36px; border-bottom:1px solid var(--line); justify-content:space-between; padding:6px 10px; font-size:12px; }
  .heading { flex-wrap:wrap; } summary { padding:8px; cursor:pointer; font:12px var(--mono); } summary :global(svg) { vertical-align:middle; color:var(--amber); }
  ul { list-style:none; margin:0 0 12px 14px; padding:0; border-left:1px solid var(--line); }
  .leaf { border:0; border-left:2px solid transparent; background:none; width:100%; justify-content:flex-start; font:12px var(--mono); }
  .leaf[aria-pressed=true] { border-color:var(--cyan); color:var(--cyan); background:#203038; }
  .tabs { margin:0; } .inspector { padding:14px; } dl { margin:0; } pre { max-height:260px; overflow:auto; } form input { min-width:0; flex:1; }
  @media(max-width:850px) { .service-workspace { grid-template-columns:minmax(0,1fr); align-content:start; } aside { border:0; border-bottom:1px solid var(--line); max-height:210px; overflow:auto; } }
</style>