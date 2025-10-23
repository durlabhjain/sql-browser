<script>
  import { auth } from '$stores/auth';
  import { authApi } from '$utils/api';
  import { goto } from '$app/navigation';

  let username = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      const response = await authApi.login(username, password);
      auth.login(response.token, response.user);
      goto('/query');
    } catch (err) {
      error = err.message || 'Login failed. Please check your credentials.';
    } finally {
      loading = false;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleLogin();
  }
</script>

<svelte:head>
  <title>Login - SQL Browser</title>
</svelte:head>

<div class="login-container">
  <div class="login-card card">
    <h1>SQL Browser</h1>
    <p class="subtitle">Sign in to continue</p>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <form on:submit={handleSubmit}>
      <div class="form-group">
        <label for="username" class="form-label">Username</label>
        <input
          id="username"
          type="text"
          class="form-input"
          bind:value={username}
          placeholder="Enter your username"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="password" class="form-label">Password</label>
        <input
          id="password"
          type="password"
          class="form-input"
          bind:value={password}
          placeholder="Enter your password"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="login-footer">
      <p class="text-muted">
        Default credentials: admin / Admin123!
      </p>
    </div>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    margin: 20px;
  }

  h1 {
    text-align: center;
    color: var(--primary-color);
    margin-bottom: 8px;
  }

  .subtitle {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .btn-block {
    width: 100%;
    margin-top: 8px;
  }

  .login-footer {
    margin-top: 20px;
    text-align: center;
  }

  .text-muted {
    color: var(--text-secondary);
    font-size: 13px;
  }
</style>
