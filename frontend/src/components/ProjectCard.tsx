import { motion } from 'framer-motion';
import type { Project } from '@/api/projects';
import { Button } from '@/components/ui/Button';

interface ProjectCardProps {
  project: Project;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700',
  },
  READY: {
    label: 'Ready',
    className: 'bg-blue-100 text-blue-700',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-700',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-slate-100 text-slate-500',
  },
};

export function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const status = statusConfig[project.status];
  const hasResults = project.latestAnalysis?.status === 'COMPLETED';
  const rcvTotal = hasResults
    ? (project.latestAnalysis?.resultsSummary as { rcvTotal?: number })?.rcvTotal
    : null;

  const getActionButton = () => {
    switch (project.status) {
      case 'COMPLETED':
        return (
          <Button size="sm" onClick={() => onView(project)}>
            View Results
          </Button>
        );
      case 'PROCESSING':
        return (
          <Button size="sm" variant="secondary" onClick={() => onView(project)}>
            View Progress
          </Button>
        );
      default:
        return (
          <Button size="sm" onClick={() => onView(project)}>
            Continue
          </Button>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <span
          className={`ml-4 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
        <div className="flex items-center gap-1.5">
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span>
            {project.folderCount} {project.folderCount === 1 ? 'folder' : 'folders'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>
            {project.photoCount} {project.photoCount === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      </div>

      {rcvTotal !== null && rcvTotal !== undefined && (
        <div className="mb-4 px-3 py-2 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-medium">RCV Total:</span>{' '}
            ${rcvTotal.toLocaleString()}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(project)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Edit project"
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
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(project)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete project"
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
        </div>
        {getActionButton()}
      </div>
    </motion.div>
  );
}
