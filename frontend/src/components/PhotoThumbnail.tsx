import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Photo } from '@/api/photos';

interface PhotoThumbnailProps {
  photo: Photo;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (photo: Photo) => void;
  onClick: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
}

export function PhotoThumbnail({
  photo,
  isSelected,
  isSelectionMode,
  onSelect,
  onClick,
  onDelete,
}: PhotoThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy load with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || isSelectionMode) {
      e.preventDefault();
      onSelect(photo);
    } else {
      onClick(photo);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(photo);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(photo);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'group relative aspect-square rounded-lg overflow-hidden cursor-pointer',
        'bg-slate-100 transition-all',
        isSelected && 'ring-2 ring-primary-500 ring-offset-2'
      )}
      onClick={handleClick}
    >
      {/* Skeleton/placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={isVisible ? (photo.thumbnailUrl || photo.storageUrl) : undefined}
        alt={photo.originalName}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
      />

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary-500/20" />
      )}

      {/* Checkbox (top-left) */}
      <div
        className={cn(
          'absolute top-2 left-2 transition-opacity',
          isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <button
          onClick={handleCheckboxClick}
          className={cn(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white/90 border-slate-300 hover:border-primary-400'
          )}
        >
          {isSelected && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Delete button (top-right, hidden in selection mode) */}
      {!isSelectionMode && (
        <button
          onClick={handleDeleteClick}
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-full',
            'bg-black/50 text-white opacity-0 group-hover:opacity-100',
            'hover:bg-red-600 transition-all',
            'flex items-center justify-center'
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

      {/* File name tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{photo.originalName}</p>
      </div>
    </motion.div>
  );
}
