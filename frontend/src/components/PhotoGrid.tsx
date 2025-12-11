import { AnimatePresence } from 'framer-motion';
import { PhotoThumbnail } from './PhotoThumbnail';
import type { Photo } from '@/api/photos';

interface PhotoGridProps {
  photos: Photo[];
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  onSelect: (photo: Photo) => void;
  onClick: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
}

export function PhotoGrid({
  photos,
  selectedIds,
  isSelectionMode,
  onSelect,
  onClick,
  onDelete,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <AnimatePresence mode="popLayout">
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            isSelected={selectedIds.has(photo.id)}
            isSelectionMode={isSelectionMode}
            onSelect={onSelect}
            onClick={onClick}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
