<script lang="ts">
  let { value }: { value: string } = $props();
  let tone = $derived(
    /^(online|running|healthy|completed|in use|active session)$/i.test(value)
      ? "green"
      : /failed|unhealthy/i.test(value)
        ? "red"
        : /pending|restarting|available|queued/i.test(value)
          ? "amber"
          : /active|in progress/i.test(value)
            ? "cyan"
            : "muted",
  );
</script>

<span class="badge {tone}"><i></i>{value}</span>
