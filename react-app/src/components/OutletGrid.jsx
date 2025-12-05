import React, { useEffect, useRef, useCallback } from 'react';
import OutletCard from './OutletCard';
import { useInfiniteOutlets } from '../hooks/useOutlets';
import '../styles/OutletGrid.css';

/**
 * OutletGrid Component
 * Displays a responsive grid of outlet cards with infinite scrolling
 * Uses Intersection Observer for efficient scroll detection
 */
function OutletGrid({ search = '' }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteOutlets({ limit: 20, search });

  const observerTarget = useRef(null);

  // Intersection Observer callback for infinite scroll
  const handleObserver = useCallback(
    (entries) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // Set up Intersection Observer
  useEffect(() => {
    const element = observerTarget.current;
    const option = {
      root: null,
      rootMargin: '100px', // Start loading 100px before reaching the bottom
      threshold: 0
    };

    const observer = new IntersectionObserver(handleObserver, option);

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  // Loading state
  if (isLoading) {
    return (
      <div className="outlet-grid-container">
        <div className="outlet-grid__loading">
          <div className="spinner"></div>
          <p>Loading outlets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="outlet-grid-container">
        <div className="outlet-grid__error">
          <h3>Error loading outlets</h3>
          <p>{error?.response?.data?.message || error?.message || 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  // Flatten all pages into a single array of outlets
  const outlets = data?.pages?.flatMap((page) => page.outlets) || [];

  // Empty state
  if (outlets.length === 0) {
    return (
      <div className="outlet-grid-container">
        <div className="outlet-grid__empty">
          <h3>No outlets found</h3>
          <p>{search ? `No results for "${search}"` : 'No outlets available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="outlet-grid-container">
      <div className="outlet-grid__stats">
        <p>
          Showing {outlets.length} outlet{outlets.length !== 1 ? 's' : ''}
          {data?.pages?.[0]?.total && ` of ${data.pages[0].total}`}
        </p>
      </div>

      <div className="outlet-grid">
        {outlets.map((outlet) => (
          <OutletCard key={outlet.id} outlet={outlet} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="outlet-grid__observer">
        {isFetchingNextPage && (
          <div className="outlet-grid__loading-more">
            <div className="spinner-small"></div>
            <p>Loading more outlets...</p>
          </div>
        )}
      </div>

      {!hasNextPage && outlets.length > 0 && (
        <div className="outlet-grid__end">
          <p>You've reached the end!</p>
        </div>
      )}
    </div>
  );
}

export default OutletGrid;
