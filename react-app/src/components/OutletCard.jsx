import React, { useState } from 'react';
import '../styles/OutletCard.css';

/**
 * OutletCard Component
 * Displays a single outlet card with code, name, and image
 * Implements lazy image loading for performance
 */
function OutletCard({ outlet }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="outlet-card">
      <div className="outlet-card__image-container">
        {!imageLoaded && !imageError && (
          <div className="outlet-card__image-skeleton" />
        )}
        {imageError ? (
          <div className="outlet-card__image-placeholder">
            <span>No Image</span>
          </div>
        ) : (
          <img
            src={outlet.image}
            alt={outlet.name}
            className={`outlet-card__image ${imageLoaded ? 'loaded' : ''}`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
      <div className="outlet-card__content">
        <div className="outlet-card__code">{outlet.code}</div>
        <h3 className="outlet-card__name">{outlet.name}</h3>
      </div>
    </div>
  );
}

export default OutletCard;
