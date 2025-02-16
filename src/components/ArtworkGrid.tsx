import React from 'react';
import { Link } from 'react-router-dom';
import { ArtworkItem } from '../types';

interface ArtworkGridProps {
  artworks: ArtworkItem[];
}

export const ArtworkGrid: React.FC<ArtworkGridProps> = ({ artworks }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {artworks.map((artwork) => (
        <Link
          key={artwork.id}
          to={`/artwork/${artwork.id}`}
          className="block aspect-square"
        >
          <div className="w-full h-full bg-gray-50 overflow-hidden">
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        </Link>
      ))}
    </div>
  );
};