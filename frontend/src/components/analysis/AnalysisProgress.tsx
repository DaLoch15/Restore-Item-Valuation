import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAnalysisJob } from '@/hooks/useAnalysis';
import {
  formatCurrency,
  formatProcessingTime,
  type AnalysisJob,
  type AnalysisResults,
} from '@/api/analysis';

const STAGES = [
  { key: 'preparing', label: 'Preparing', description: 'Setting up analysis pipeline...' },
  { key: 'analyzing', label: 'AI Analysis', description: 'Identifying items in photos...' },
  { key: 'pricing', label: 'Price Research', description: 'Researching current market prices...' },
  { key: 'calculating', label: 'Calculations', description: 'Computing replacement values...' },
  { key: 'complete', label: 'Complete', description: 'Analysis finished!' },
];

interface AnalysisProgressProps {
  jobId: string;
  totalPhotos: number;
  onComplete?: (job: AnalysisJob) => void;
}

export function AnalysisProgress({
  jobId,
  totalPhotos,
  onComplete,
}: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const handleComplete = useCallback(
    (job: AnalysisJob) => {
      setProgress(100);
      setStage(4);
      onComplete?.(job);
    },
    [onComplete]
  );

  const { data: job } = useAnalysisJob(jobId, {
    polling: true,
    pollingInterval: 3000,
    onComplete: handleComplete,
  });

  // Simulate progress based on estimated time
  useEffect(() => {
    if (job?.status === 'COMPLETED' || job?.status === 'FAILED') {
      setProgress(100);
      setStage(job.status === 'COMPLETED' ? 4 : stage);
      return;
    }

    // Estimate: 10 seconds per photo
    const estimatedMs = totalPhotos * 10000;
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / estimatedMs) * 100, 95);
      setProgress(p);
      setStage(Math.min(Math.floor(p / 25), 3));
    }, 500);

    return () => clearInterval(interval);
  }, [totalPhotos, job?.status]);

  const isComplete = job?.status === 'COMPLETED';
  const isFailed = job?.status === 'FAILED';

  return (
    <div className="bg-gradient-to-br from-slate-50 to-primary-50 rounded-xl p-8 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {isComplete
              ? 'Analysis Complete!'
              : isFailed
              ? 'Analysis Failed'
              : 'Analyzing Photos'}
          </h3>
          <p className="text-slate-600">
            {isComplete
              ? 'Your valuation report is ready.'
              : isFailed
              ? job?.errorMessage || 'An error occurred during analysis.'
              : `Processing ${totalPhotos} photos...`}
          </p>
        </div>
        {isComplete ? (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
        ) : isFailed ? (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-8">
        <motion.div
          className={`h-full rounded-full ${
            isFailed
              ? 'bg-red-500'
              : isComplete
              ? 'bg-green-500'
              : 'bg-gradient-to-r from-primary-500 to-primary-600'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Stages */}
      {!isFailed && (
        <div className="grid grid-cols-5 gap-2 mb-8">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className={`text-center p-3 rounded-lg transition-all ${
                i < stage
                  ? 'bg-green-50'
                  : i === stage
                  ? 'bg-primary-100 ring-2 ring-primary-500'
                  : 'bg-slate-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center transition-colors ${
                  i < stage
                    ? 'bg-green-500'
                    : i === stage
                    ? 'bg-primary-500'
                    : 'bg-slate-300'
                }`}
              >
                {i < stage ? (
                  <svg
                    className="w-5 h-5 text-white"
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
                ) : (
                  <span className="text-white font-bold text-sm">{i + 1}</span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Current stage description */}
      {!isComplete && !isFailed && (
        <p className="text-center text-sm text-slate-500">
          {STAGES[stage]?.description}
        </p>
      )}

      {/* Results summary */}
      {isComplete && job?.resultsSummary && (
        <ResultsSummary results={job.resultsSummary as AnalysisResults} sheetUrl={job.sheetUrl} />
      )}
    </div>
  );
}

function ResultsSummary({
  results,
  sheetUrl,
}: {
  results: AnalysisResults;
  sheetUrl: string | null;
}) {
  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {results.totalPhotosProcessed}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Photos Processed
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {results.totalItemsIdentified}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Items Found
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(results.totalRCV)}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Replacement Value
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(results.totalACV)}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Actual Cash Value
          </p>
        </div>
      </div>

      {/* Processing time */}
      <p className="text-center text-sm text-slate-500 mb-6">
        Completed in {formatProcessingTime(results.processingTimeMs)}
      </p>

      {/* View results button */}
      {sheetUrl && (
        <div className="flex justify-center">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View Detailed Report
          </a>
        </div>
      )}
    </div>
  );
}
