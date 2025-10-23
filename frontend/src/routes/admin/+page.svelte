<script>
  import { onMount } from 'svelte';
  import { adminApi } from '$utils/api';
  import { auth } from '$stores/auth';
  import { goto } from '$app/navigation';

  let activeTab = 'users';
  let users = [];
  let connections = [];
  let loading = true;
  let error = null;

  let showUserModal = false;
  let showConnectionModal = false;
  let editingUser = null;
  let editingConnection = null;

  let userForm = {
    username: '',
    password: '',
    email: '',
    role: 'VIEWER',
    isActive: true
  };

  let connectionForm = {
    name: '',
    server: '',
    port: 1433,
    database: '',
    user: '',
    password: '',
    encrypt: true,
    trustServerCertificate: false
  };

  onMount(async () => {
    if (!$auth.isAuthenticated || $auth.user?.role !== 'ADMIN') {
      goto('/query');
      return;
    }

    await loadData();
  });

  async function loadData() {
    loading = true;
    error = null;

    try {
      const [usersRes, connectionsRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listConnections()
      ]);

      users = usersRes.data;
      connections = connectionsRes.data;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function openUserModal(user = null) {
    editingUser = user;
    if (user) {
      userForm = {
        username: user.username,
        password: '',
        email: user.email || '',
        role: user.role,
        isActive: user.isActive
      };
    } else {
      userForm = {
        username: '',
        password: '',
        email: '',
        role: 'VIEWER',
        isActive: true
      };
    }
    showUserModal = true;
  }

  function openConnectionModal(connection = null) {
    editingConnection = connection;
    if (connection) {
      connectionForm = {
        name: connection.name,
        server: '',
        port: 1433,
        database: '',
        user: '',
        password: '',
        encrypt: true,
        trustServerCertificate: false
      };
    } else {
      connectionForm = {
        name: '',
        server: '',
        port: 1433,
        database: '',
        user: '',
        password: '',
        encrypt: true,
        trustServerCertificate: false
      };
    }
    showConnectionModal = true;
  }

  async function saveUser() {
    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, userForm);
      } else {
        await adminApi.createUser(userForm);
      }
      showUserModal = false;
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminApi.deleteUser(userId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function saveConnection() {
    try {
      if (editingConnection) {
        await adminApi.updateConnection(editingConnection.id, connectionForm);
      } else {
        await adminApi.createConnection(connectionForm);
      }
      showConnectionModal = false;
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteConnection(connectionId) {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      await adminApi.deleteConnection(connectionId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }
</script>

<svelte:head>
  <title>Admin Panel - SQL Browser</title>
</svelte:head>

<div class="admin-page">
  <div class="page-header">
    <h2>Admin Panel</h2>
    <button on:click={loadData} class="btn btn-secondary" disabled={loading}>
      Refresh
    </button>
  </div>

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'users'}
      on:click={() => activeTab = 'users'}
    >
      Users ({users.length})
    </button>
    <button
      class="tab"
      class:active={activeTab === 'connections'}
      on:click={() => activeTab = 'connections'}
    >
      Connections ({connections.length})
    </button>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if error}
    <div class="alert alert-error">{error}</div>
  {:else if activeTab === 'users'}
    <div class="section">
      <div class="section-header">
        <h3>Users</h3>
        <button on:click={() => openUserModal()} class="btn btn-primary">
          Add User
        </button>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each users as user}
              <tr>
                <td>{user.username}</td>
                <td>{user.email || '-'}</td>
                <td><span class="role-badge">{user.role}</span></td>
                <td>
                  <span class="status-badge" class:active={user.isActive}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="action-buttons">
                    <button on:click={() => openUserModal(user)} class="btn-icon">Edit</button>
                    <button on:click={() => deleteUser(user.id)} class="btn-icon danger">Delete</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if activeTab === 'connections'}
    <div class="section">
      <div class="section-header">
        <h3>Database Connections</h3>
        <button on:click={() => openConnectionModal()} class="btn btn-primary">
          Add Connection
        </button>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each connections as conn}
              <tr>
                <td>{conn.name}</td>
                <td>
                  <span class="status-badge" class:active={conn.isActive}>
                    {conn.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(conn.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="action-buttons">
                    <button on:click={() => openConnectionModal(conn)} class="btn-icon">Edit</button>
                    <button on:click={() => deleteConnection(conn.id)} class="btn-icon danger">Delete</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

{#if showUserModal}
  <div class="modal-overlay" on:click={() => showUserModal = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>{editingUser ? 'Edit User' : 'Add User'}</h3>
      <form on:submit|preventDefault={saveUser}>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" bind:value={userForm.username} required />
        </div>
        <div class="form-group">
          <label class="form-label">Password {editingUser ? '(leave empty to keep current)' : ''}</label>
          <input type="password" class="form-input" bind:value={userForm.password} required={!editingUser} />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" bind:value={userForm.email} />
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-input" bind:value={userForm.role}>
            <option value="VIEWER">Viewer</option>
            <option value="ANALYST">Analyst</option>
            <option value="DEVELOPER">Developer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" on:click={() => showUserModal = false} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showConnectionModal}
  <div class="modal-overlay" on:click={() => showConnectionModal = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>{editingConnection ? 'Edit Connection' : 'Add Connection'}</h3>
      <form on:submit|preventDefault={saveConnection}>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" bind:value={connectionForm.name} required />
        </div>
        <div class="form-group">
          <label class="form-label">Server</label>
          <input type="text" class="form-input" bind:value={connectionForm.server} required />
        </div>
        <div class="form-group">
          <label class="form-label">Port</label>
          <input type="number" class="form-input" bind:value={connectionForm.port} required />
        </div>
        <div class="form-group">
          <label class="form-label">Database</label>
          <input type="text" class="form-input" bind:value={connectionForm.database} required />
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" bind:value={connectionForm.user} required />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" bind:value={connectionForm.password} required={!editingConnection} />
        </div>
        <div class="modal-actions">
          <button type="button" on:click={() => showConnectionModal = false} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .admin-page {
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

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .tab {
    padding: 12px 24px;
    border: none;
    background: none;
    font-weight: 500;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }

  .tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .data-table {
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
  }

  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .role-badge, .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background-color: var(--bg-secondary);
  }

  .status-badge.active {
    background-color: #d4edda;
    color: #155724;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  .btn-icon {
    padding: 4px 8px;
    border: none;
    background: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 13px;
  }

  .btn-icon.danger {
    color: var(--danger-color);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background-color: var(--bg-color);
    border-radius: var(--radius);
    padding: 24px;
    max-width: 500px;
    width: 100%;
    margin: 20px;
  }

  .modal h3 {
    margin-bottom: 20px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px;
    gap: 16px;
  }
</style>
