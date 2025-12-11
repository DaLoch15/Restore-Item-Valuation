import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface SelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function SelectionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  isDeleting,
}: SelectionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="bg-slate-900 rounded-xl px-4 py-3 shadow-lg flex items-center gap-4">
            <span className="text-white text-sm">
              {selectedCount} {selectedCount === 1 ? 'photo' : 'photos'} selected
            </span>

            <div className="h-6 w-px bg-slate-700" />

            <button
              onClick={onClearSelection}
              className="text-slate-400 hover:text-white text-sm transition-colors"
              disabled={isDeleting}
            >
              Clear selection
            </button>

            <Button
              variant="danger"
              size="sm"
              onClick={onDelete}
              isLoading={isDeleting}
            >
              <svg
                className="w-4 h-4 mr-1.5"
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
              Delete
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
