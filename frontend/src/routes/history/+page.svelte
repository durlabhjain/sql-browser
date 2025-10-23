<script>
  import { onMount } from 'svelte';
  import { queryApi } from '$utils/api';
  import { auth } from '$stores/auth';
  import { goto } from '$app/navigation';

  let historyItems = [];
  let loading = true;
  let error = null;
  let stats = null;

  onMount(async () => {
    if (!$auth.isAuthenticated) {
      goto('/login');
      return;
    }

    await loadHistory();
    await loadStats();
  });

  async function loadHistory() {
    try {
      loading = true;
      error = null;
      const response = await queryApi.getHistory({ limit: 100 });
      historyItems = response.data;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      stats = await queryApi.getStats(30);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatDuration(ms) {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function getStatusClass(status) {
    switch (status) {
      case 'success': return 'status-success';
      case 'error': return 'status-error';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  function truncateSQL(sql, maxLength = 100) {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength) + '...';
  }
</script>

<svelte:head>
  <title>Query History - SQL Browser</title>
</svelte:head>

<div class="history-page">
  <div class="page-header">
    <h2>Query History</h2>
    <button on:click={loadHistory} class="btn btn-secondary" disabled={loading}>
      Refresh
    </button>
  </div>

  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Queries</div>
        <div class="stat-value">{stats.total_queries || 0}</div>
        <div class="stat-sublabel">Last 30 days</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Successful</div>
        <div class="stat-value success">{stats.successful_queries || 0}</div>
        <div class="stat-sublabel">
          {stats.total_queries > 0 ? Math.round((stats.successful_queries / stats.total_queries) * 100) : 0}% success rate
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value error">{stats.failed_queries || 0}</div>
        <div class="stat-sublabel">Errors and cancellations</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Duration</div>
        <div class="stat-value">{formatDuration(stats.avg_execution_time)}</div>
        <div class="stat-sublabel">Average execution time</div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading history...</p>
    </div>
  {:else if error}
    <div class="alert alert-error">{error}</div>
  {:else if historyItems.length === 0}
    <div class="no-data">
      <p>No query history found</p>
      <p class="text-muted">Execute some queries to see them here</p>
    </div>
  {:else}
    <div class="history-table">
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Connection</th>
            <th>SQL Query</th>
            <th>Status</th>
            <th>Rows</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {#each historyItems as item}
            <tr>
              <td>{formatDate(item.createdAt)}</td>
              <td>{item.connectionName || 'Unknown'}</td>
              <td class="sql-cell" title={item.sql}>
                <code>{truncateSQL(item.sql)}</code>
              </td>
              <td>
                <span class="status-badge {getStatusClass(item.status)}">
                  {item.status}
                </span>
              </td>
              <td>{item.rowCount !== null ? item.rowCount.toLocaleString() : '-'}</td>
              <td>{formatDuration(item.executionTimeMs)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .history-page {
    max-width: 1600px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .page-header h2 {
    font-size: 24px;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .stat-card {
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
  }

  .stat-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .stat-value.success {
    color: var(--success-color);
  }

  .stat-value.error {
    color: var(--danger-color);
  }

  .stat-sublabel {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    gap: 16px;
  }

  .no-data {
    text-align: center;
    padding: 60px;
    background-color: var(--bg-secondary);
    border-radius: var(--radius);
  }

  .text-muted {
    color: var(--text-secondary);
    margin-top: 8px;
  }

  .history-table {
    overflow-x: auto;
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background-color: var(--bg-secondary);
    border-bottom: 2px solid var(--border-color);
  }

  th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
  }

  td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    font-size: 13px;
  }

  tbody tr:hover {
    background-color: var(--bg-secondary);
  }

  .sql-cell {
    max-width: 400px;
  }

  .sql-cell code {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    color: var(--text-color);
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-success {
    background-color: #d4edda;
    color: #155724;
  }

  .status-error {
    background-color: #f8d7da;
    color: #721c24;
  }

  .status-cancelled {
    background-color: #fff3cd;
    color: #856404;
  }
</style>
