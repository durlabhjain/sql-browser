import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OutletGrid from './components/OutletGrid';
import SearchBar from './components/SearchBar';
import './styles/App.css';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * App Component
 * Main application component with search and outlet grid
 */
function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <header className="app__header">
          <div className="app__header-content">
            <h1 className="app__title">Outlet Directory</h1>
            <p className="app__subtitle">
              Browse and search through our extensive network of outlets
            </p>
          </div>
        </header>

        <main className="app__main">
          <SearchBar onSearch={handleSearch} placeholder="Search by code or name..." />
          <OutletGrid search={searchTerm} />
        </main>

        <footer className="app__footer">
          <p>Powered by React + React Query</p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
