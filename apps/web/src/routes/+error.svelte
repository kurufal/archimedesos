<script lang="ts">
  import { page } from '$app/state';
  import Header from '$lib/ui/Header.svelte';
</script>
<Header title={page.status === 404 ? 'Page not found' : 'Unable to load page'} description={page.error?.message} />
<a class="link" href="/">Return to dashboard</a>