<script>
  export let columns = [];
  export let data = [];
  export let height = '500px';
  export let rowHeight = 35;

  let container;
  let scrollTop = 0;
  let clientHeight = 0;

  $: visibleStart = Math.floor(scrollTop / rowHeight);
  $: visibleEnd = Math.min(
    data.length,
    Math.ceil((scrollTop + clientHeight) / rowHeight) + 1
  );
  $: visibleData = data.slice(visibleStart, visibleEnd);
  $: offsetY = visibleStart * rowHeight;

  function handleScroll(e) {
    scrollTop = e.target.scrollTop;
  }

  function formatValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
</script>

<div class="virtual-table" style="height: {height}">
  <div class="table-header">
    <div class="table-row">
      {#each columns as column}
        <div class="table-cell header-cell">
          {column}
        </div>
      {/each}
    </div>
  </div>

  <div
    class="table-body"
    bind:this={container}
    bind:clientHeight
    on:scroll={handleScroll}
  >
    <div class="table-content" style="height: {data.length * rowHeight}px;">
      <div class="visible-rows" style="transform: translateY({offsetY}px);">
        {#each visibleData as row, index}
          <div class="table-row" class:even={(visibleStart + index) % 2 === 0}>
            {#each columns as column}
              <div class="table-cell" title={formatValue(row[column])}>
                {formatValue(row[column])}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .virtual-table {
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    overflow: hidden;
    background-color: var(--bg-color);
  }

  .table-header {
    background-color: var(--bg-secondary);
    border-bottom: 2px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .table-body {
    overflow-y: auto;
    overflow-x: auto;
    height: calc(100% - 35px);
  }

  .table-content {
    position: relative;
  }

  .visible-rows {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .table-row {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    min-width: fit-content;
  }

  .table-row.even {
    background-color: var(--bg-secondary);
  }

  .table-cell {
    padding: 8px 12px;
    min-width: 150px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    border-right: 1px solid var(--border-color);
  }

  .header-cell {
    font-weight: 600;
    background-color: var(--bg-secondary);
    position: sticky;
    top: 0;
  }
</style>
