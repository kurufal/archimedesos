<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { X } from "@lucide/svelte";
  let {
    title,
    close,
    canClose = () => true,
    children,
  }: { title: string; close: () => void; canClose?: () => boolean; children: Snippet } = $props();
  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });
</script>

<dialog bind:this={element} onclose={close} oncancel={event => { if (!canClose()) event.preventDefault(); }} aria-label={title}>
  <div class="modal-head">
    <h2>{title}</h2>
    <button
      class="icon"
      aria-label="Close dialog"
      onclick={() => { if (canClose()) element.close(); }}><X size={17} /></button
    >
  </div>
  <div class="modal-body">{@render children()}</div>
</dialog>
