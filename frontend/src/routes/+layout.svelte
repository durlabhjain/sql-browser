<script>
  import '../app.css';
  import { auth } from '$stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  $: isAuthenticated = $auth.isAuthenticated;
  $: currentPath = $page.url.pathname;

  function logout() {
    auth.logout();
    goto('/login');
  }
</script>

<div class="app">
  {#if isAuthenticated && currentPath !== '/login'}
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-brand">
          <h1>SQL Browser</h1>
        </div>
        <div class="navbar-menu">
          <a href="/query" class="nav-link" class:active={currentPath === '/query'}>Query</a>
          <a href="/history" class="nav-link" class:active={currentPath === '/history'}>History</a>
          {#if $auth.user?.role === 'ADMIN'}
            <a href="/admin" class="nav-link" class:active={currentPath.startsWith('/admin')}>Admin</a>
          {/if}
        </div>
        <div class="navbar-user">
          <span class="user-info">
            <span class="user-name">{$auth.user?.username}</span>
            <span class="user-role">{$auth.user?.role}</span>
          </span>
          <button on:click={logout} class="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>
    </nav>
  {/if}

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .navbar {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 0;
    height: 60px;
  }

  .navbar-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 20px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .navbar-brand h1 {
    font-size: 20px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .navbar-menu {
    display: flex;
    gap: 20px;
    flex: 1;
    margin-left: 40px;
  }

  .nav-link {
    padding: 8px 16px;
    border-radius: var(--radius);
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .nav-link:hover {
    background-color: var(--border-color);
    text-decoration: none;
  }

  .nav-link.active {
    background-color: var(--primary-color);
    color: white;
  }

  .navbar-user {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .user-name {
    font-weight: 500;
    font-size: 14px;
  }

  .user-role {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }

  .main-content {
    flex: 1;
    padding: 20px;
  }
</style>
