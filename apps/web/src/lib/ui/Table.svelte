<script lang="ts" generics="Row">
  import type { Snippet } from "svelte";
  import { ChevronsUpDown } from "@lucide/svelte";
  let {
    rows,
    columns,
    cell,
    value,
  }: {
    rows: Row[];
    columns: string[];
    cell: Snippet<[Row, string]>;
    value: (row: Row, column: string) => string | number;
  } = $props();
  let key = $state(""),
    direction = $state(1);
  let sorted = $derived(
    key
      ? [...rows].sort(
          (first, second) =>
            direction *
            String(value(first, key)).localeCompare(
              String(value(second, key)),
              undefined,
              { numeric: true },
            ),
        )
      : rows,
  );
</script>

<div class="table-scroll">
  <table>
    <thead
      ><tr
        >{#each columns as column}<th
            aria-sort={key === column
              ? direction === 1
                ? "ascending"
                : "descending"
              : "none"}
            >{#if ["Actions", "Select"].includes(column)}{column}{:else}<button
                onclick={() => {
                  direction = key === column ? -direction : 1;
                  key = column;
                }}>{column}<ChevronsUpDown size={11} /></button
              >{/if}</th
          >{/each}</tr
      ></thead
    ><tbody
      >{#each sorted as row}<tr
          >{#each columns as column}<td>{@render cell(row, column)}</td
            >{/each}</tr
        >{/each}</tbody
    >
  </table>
  {#if !rows.length}<p class="empty">No matching records.</p>{/if}
</div>
