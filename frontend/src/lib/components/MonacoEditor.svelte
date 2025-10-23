<script>
  import { onMount, onDestroy } from 'svelte';
  import * as monaco from 'monaco-editor';

  export let value = '';
  export let language = 'sql';
  export let theme = 'vs-light';
  export let height = '300px';
  export let readOnly = false;

  let editorContainer;
  let editor;

  onMount(() => {
    // Configure Monaco
    monaco.languages.register({ id: 'sql' });

    // SQL Keywords for autocomplete
    monaco.languages.setMonarchTokensProvider('sql', {
      keywords: [
        'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
        'TABLE', 'VIEW', 'INDEX', 'DATABASE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
        'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ORDER', 'BY', 'GROUP',
        'HAVING', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
        'DECLARE', 'SET', 'BEGIN', 'END', 'IF', 'ELSE', 'WHILE', 'EXEC', 'EXECUTE'
      ],
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/\d+/, 'number'],
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment']
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/'/, 'string', '@pop']
        ]
      }
    });

    // Create editor
    editor = monaco.editor.create(editorContainer, {
      value,
      language,
      theme,
      readOnly,
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      suggest: {
        showKeywords: true,
        showSnippets: true
      }
    });

    // Listen for changes
    editor.onDidChangeModelContent(() => {
      value = editor.getValue();
    });

    return () => {
      if (editor) {
        editor.dispose();
      }
    };
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  // Update editor value when prop changes
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value);
  }

  export function focus() {
    if (editor) {
      editor.focus();
    }
  }

  export function getValue() {
    return editor ? editor.getValue() : value;
  }

  export function setValue(newValue) {
    if (editor) {
      editor.setValue(newValue);
    }
  }
</script>

<div class="monaco-editor-wrapper" style="height: {height}">
  <div bind:this={editorContainer} class="monaco-editor-container"></div>
</div>

<style>
  .monaco-editor-wrapper {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .monaco-editor-container {
    width: 100%;
    height: 100%;
  }
</style>
