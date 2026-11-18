<script lang="ts">
  import { onMount } from "svelte";
  import { basicSetup } from "codemirror";
  import { EditorView, keymap } from "@codemirror/view";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { json, jsonParseLinter } from "@codemirror/lang-json";
  import { xml } from "@codemirror/lang-xml";
  import { yaml } from "@codemirror/lang-yaml";
  import { linter, lintGutter } from "@codemirror/lint";
  import { parseDocument } from "yaml";
  let {
    path,
    text,
    change,
    save,
    saveAll,
  }: {
    path: string;
    text: string;
    change: (text: string) => void;
    save: () => void;
    saveAll: () => void;
  } = $props();
  let parent: HTMLDivElement;
  onMount(() => {
    const language = /\.ya?ml$/.test(path)
      ? [
          yaml(),
          linter((view) =>
            parseDocument(view.state.doc.toString()).errors.map((error) => ({
              from: Math.min(error.pos[0], view.state.doc.length),
              to: Math.min(error.pos[1], view.state.doc.length),
              severity: "error",
              message: error.message,
            })),
          ),
        ]
      : path.endsWith(".json")
        ? [json(), linter(jsonParseLinter())]
        : path.endsWith(".xml")
          ? [xml()]
          : [];
    const view = new EditorView({
      parent,
      doc: text,
      extensions: [
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              save();
              return true;
            },
          },
          {
            key: "Mod-Shift-s",
            run: () => {
              saveAll();
              return true;
            },
          },
        ]),
        basicSetup,
        oneDark,
        language,
        lintGutter(),
        EditorView.contentAttributes.of({ "aria-label": `Edit ${path}` }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change(update.state.doc.toString());
        }),
      ],
    });
    return () => view.destroy();
  });
</script>

<div class="editor" bind:this={parent}></div>

<style>
  .editor {
    min-width: 0;
  }
  .editor :global(.cm-editor) {
    height: 350px;
    background: #12181d;
    font: 13px/1.65 var(--mono);
  }
  .editor :global(.cm-gutters) {
    background: #161c21;
    color: #81919c;
  }
  .editor :global(.cm-scroller) {
    overflow: auto;
  }
</style>
