import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface AnalysisConfirmDialogProps {
  isOpen: boolean;
  photoCount: number;
  folderCount: number;
  estimatedMinutes: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AnalysisConfirmDialog({
  isOpen,
  photoCount,
  folderCount,
  estimatedMinutes,
  onConfirm,
  onCancel,
  isLoading,
}: AnalysisConfirmDialogProps) {
  const handleClose = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white rounded-xl shadow-xl p-6">
              {/* Icon and title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Ready to Analyze?
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    AI will process your photos and generate a valuation report.
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{photoCount}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Photos
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{folderCount}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Folders
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      ~{estimatedMinutes}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Minutes
                    </p>
                  </div>
                </div>
              </div>

              {/* Info text */}
              <p className="text-sm text-slate-600 mb-6">
                The analysis will identify items in your photos, research current
                prices, and calculate replacement values. You'll receive a detailed
                spreadsheet with the results.
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onConfirm}
                  isLoading={isLoading}
                >
                  Start Analysis
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
