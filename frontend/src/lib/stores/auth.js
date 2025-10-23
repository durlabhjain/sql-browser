import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize auth state from localStorage
function createAuthStore() {
  const storedToken = browser ? localStorage.getItem('auth_token') : null;
  const storedUser = browser ? JSON.parse(localStorage.getItem('auth_user') || 'null') : null;

  const { subscribe, set, update } = writable({
    token: storedToken,
    user: storedUser,
    isAuthenticated: !!storedToken
  });

  return {
    subscribe,
    login: (token, user) => {
      if (browser) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
      set({
        token,
        user,
        isAuthenticated: true
      });
    },
    logout: () => {
      if (browser) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false
      });
    },
    updateUser: (user) => {
      if (browser) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
      update(state => ({
        ...state,
        user
      }));
    }
  };
}

export const auth = createAuthStore();
