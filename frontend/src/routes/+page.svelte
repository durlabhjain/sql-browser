<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$stores/auth';

  onMount(() => {
    if ($auth.isAuthenticated) {
      goto('/query');
    } else {
      goto('/login');
    }
  });
</script>

<div class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 16px;
  }
</style>
