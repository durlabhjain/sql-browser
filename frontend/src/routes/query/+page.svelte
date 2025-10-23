<script>
  import { onMount } from 'svelte';
  import MonacoEditor from '$components/MonacoEditor.svelte';
  import VirtualTable from '$components/VirtualTable.svelte';
  import { auth } from '$stores/auth';
  import { connectionApi, queryApi } from '$utils/api';
  import { goto } from '$app/navigation';

  let connections = [];
  let selectedConnection = '';
  let sqlQuery = 'SELECT TOP 100 * FROM sys.tables';
  let queryResults = null;
  let queryError = null;
  let isExecuting = false;
  let currentQueryId = null;
  let executionTime = 0;
  let editor;

  onMount(async () => {
    if (!$auth.isAuthenticated) {
      goto('/login');
      return;
    }

    try {
      const response = await connectionApi.list();
      connections = response.data;

      if (connections.length > 0) {
        selectedConnection = connections[0].id;
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      queryError = 'Failed to load database connections';
    }
  });

  async function executeQuery() {
    if (!selectedConnection || !sqlQuery.trim()) {
      queryError = 'Please select a connection and enter a query';
      return;
    }

    queryError = null;
    queryResults = null;
    isExecuting = true;
    const startTime = Date.now();

    try {
      const result = await queryApi.execute(selectedConnection, sqlQuery);

      executionTime = result.executionTimeMs;
      currentQueryId = result.queryId;

      // Extract columns from data
      const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];

      queryResults = {
        columns,
        data: result.data,
        totalRows: result.totalRows,
        returnedRows: result.returnedRows,
        truncated: result.truncated,
        maxRows: result.maxRows
      };

    } catch (error) {
      queryError = error.message || 'Query execution failed';
      queryResults = null;
    } finally {
      isExecuting = false;
      currentQueryId = null;
    }
  }

  async function cancelQuery() {
    if (!currentQueryId) return;

    try {
      await queryApi.cancel(currentQueryId);
      queryError = 'Query cancelled';
      isExecuting = false;
      currentQueryId = null;
    } catch (error) {
      console.error('Failed to cancel query:', error);
    }
  }

  function handleKeyPress(event) {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      executeQuery();
    }
  }
</script>

<svelte:head>
  <title>Query - SQL Browser</title>
</svelte:head>

<svelte:window on:keydown={handleKeyPress} />

<div class="query-page">
  <div class="query-header">
    <h2>SQL Query Interface</h2>
    <div class="header-actions">
      <div class="connection-selector">
        <label for="connection">Connection:</label>
        <select
          id="connection"
          bind:value={selectedConnection}
          class="form-input"
          disabled={isExecuting || connections.length === 0}
        >
          {#if connections.length === 0}
            <option value="">No connections available</option>
          {:else}
            {#each connections as conn}
              <option value={conn.id}>{conn.name}</option>
            {/each}
          {/if}
        </select>
      </div>

      <div class="actions">
        {#if isExecuting}
          <button on:click={cancelQuery} class="btn btn-danger">
            Cancel Query
          </button>
        {:else}
          <button
            on:click={executeQuery}
            class="btn btn-primary"
            disabled={!selectedConnection || !sqlQuery.trim()}
          >
            Execute (Ctrl+Enter)
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="query-editor">
    <div class="editor-header">
      <h3>SQL Editor</h3>
      <span class="hint">Press Ctrl+Enter to execute</span>
    </div>
    <MonacoEditor
      bind:this={editor}
      bind:value={sqlQuery}
      height="300px"
      language="sql"
      readOnly={isExecuting}
    />
  </div>

  {#if isExecuting}
    <div class="query-status">
      <div class="spinner"></div>
      <span>Executing query...</span>
    </div>
  {/if}

  {#if queryError}
    <div class="alert alert-error">
      <strong>Error:</strong> {queryError}
    </div>
  {/if}

  {#if queryResults}
    <div class="query-results">
      <div class="results-header">
        <h3>Query Results</h3>
        <div class="results-info">
          <span>
            {queryResults.returnedRows} of {queryResults.totalRows} rows
          </span>
          {#if queryResults.truncated}
            <span class="warning">
              (Limited to {queryResults.maxRows} rows by role)
            </span>
          {/if}
          <span class="execution-time">
            Execution time: {executionTime}ms
          </span>
        </div>
      </div>

      {#if queryResults.data.length > 0}
        <VirtualTable
          columns={queryResults.columns}
          data={queryResults.data}
          height="500px"
        />
      {:else}
        <div class="no-results">
          Query executed successfully but returned no rows.
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .query-page {
    max-width: 1600px;
    margin: 0 auto;
  }

  .query-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .query-header h2 {
    font-size: 24px;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .connection-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .connection-selector label {
    font-weight: 500;
    font-size: 14px;
  }

  .connection-selector select {
    min-width: 200px;
  }

  .query-editor {
    margin-bottom: 24px;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .editor-header h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .hint {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .query-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background-color: var(--bg-secondary);
    border-radius: var(--radius);
    margin-bottom: 24px;
  }

  .query-results {
    margin-top: 24px;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .results-header h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .results-info {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .warning {
    color: var(--warning-color);
    font-weight: 500;
  }

  .execution-time {
    font-weight: 500;
    color: var(--success-color);
  }

  .no-results {
    padding: 40px;
    text-align: center;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    border-radius: var(--radius);
  }
</style>
