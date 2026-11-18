<script lang="ts">
  import Header from "$lib/ui/Header.svelte";
  import Containers from "$lib/Containers.svelte";
  import Projects from "$lib/Projects.svelte";
  import Systems from "$lib/Systems.svelte";
  import Resources from "$lib/Resources.svelte";
  import Admin from "$lib/Admin.svelte";
  let { data }: { data: { section: string } } = $props();
  const descriptions: Record<string, string> = {
    projects: "Compose services, configuration files and workspace backups.",
    containers: "Service state and resource usage across the demo inventory.",
    systems: "Host connections, capabilities and diagnostics.",
    images: "Local image repositories and tags.",
    networks: "Container networks, gateways and attachments.",
    volumes: "Persistent storage and container mounts.",
    updates: "Application images and system packages by host.",
    security: "Access, credentials and audit records for the demo workspace.",
    logs: "Timestamped events from systems, applications and containers.",
    settings: "Local display preferences and simulated system settings.",
  };
</script>

<Header
  title={data.section[0].toUpperCase() + data.section.slice(1)}
  description={descriptions[data.section]}
/>{#key data.section}{#if data.section === "projects"}<Projects
    />{:else if data.section === "containers"}<Containers
    />{:else if data.section === "systems"}<Systems
      management
    />{:else if data.section === "images" || data.section === "networks" || data.section === "volumes"}<Resources
      kind={data.section}
    />{:else}<Admin section={data.section} />{/if}{/key}
