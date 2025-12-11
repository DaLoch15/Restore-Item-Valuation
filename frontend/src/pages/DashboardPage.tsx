import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { ProjectCard } from '@/components/ProjectCard';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProjects';
import { getErrorMessage } from '@/api/client';
import type { Project } from '@/api/projects';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data: projects, isLoading, error } = useProjects();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleLogout = () => {
    logout();
  };

  const handleCreateProject = async (data: {
    name: string;
    description?: string;
  }) => {
    try {
      await createProject.mutateAsync(data);
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create project:', getErrorMessage(err));
    }
  };

  const handleEditProject = async (data: {
    name?: string;
    description?: string;
  }) => {
    if (!editingProject) return;

    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        input: data,
      });
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to update project:', getErrorMessage(err));
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      await deleteProject.mutateAsync(deletingProject.id);
      setDeletingProject(null);
    } catch (err) {
      console.error('Failed to delete project:', getErrorMessage(err));
    }
  };

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-display font-bold text-primary-600">
              Restoration App
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Welcome, {user?.name}
              </span>
              <Button variant="ghost" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with title and action */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Your Projects
          </h2>
          <Button onClick={() => setIsCreateOpen(true)}>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Project
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">
              Failed to load projects. Please try again.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && projects?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
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
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-500 mb-6">
              Create your first project to start uploading photos for analysis.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              Create Your First Project
            </Button>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && !error && projects && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={handleViewProject}
                  onEdit={setEditingProject}
                  onDelete={setDeletingProject}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreateProjectDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={createProject.isPending}
      />

      <EditProjectDialog
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditProject}
        isLoading={updateProject.isPending}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeletingProject(null)}
        isLoading={deleteProject.isPending}
      />
    </div>
  );
}
