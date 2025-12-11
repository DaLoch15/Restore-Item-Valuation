import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { FolderList } from '@/components/FolderList';
import { CreateFolderDialog } from '@/components/CreateFolderDialog';
import { EditFolderDialog } from '@/components/EditFolderDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { PhotoUploader } from '@/components/PhotoUploader';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PhotoPreviewModal } from '@/components/PhotoPreviewModal';
import { SelectionBar } from '@/components/SelectionBar';
import { useProject } from '@/hooks/useProjects';
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useReorderFolders,
} from '@/hooks/useFolders';
import {
  usePhotos,
  useUploadPhotos,
  useDeletePhoto,
  useBulkDeletePhotos,
} from '@/hooks/usePhotos';
import { getErrorMessage } from '@/api/client';
import { getRoomType } from '@/lib/constants';
import type { Folder } from '@/api/folders';
import type { Photo } from '@/api/photos';

export function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: folders = [], isLoading: foldersLoading } = useFolders(projectId);

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const reorderFolders = useReorderFolders();

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);

  // Photo state
  const { data: photos = [], isLoading: photosLoading } = usePhotos(
    selectedFolder?.id
  );
  const uploadPhotos = useUploadPhotos();
  const deletePhotoMutation = useDeletePhoto();
  const bulkDeletePhotos = useBulkDeletePhotos();

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<Photo | null>(null);

  const isSelectionMode = selectedPhotoIds.size > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Folder handlers
  const handleCreateFolder = async (data: { name: string; roomType?: string }) => {
    if (!projectId) return;

    try {
      const newFolder = await createFolder.mutateAsync({
        projectId,
        input: data,
      });
      setIsCreateOpen(false);
      setSelectedFolder(newFolder);
    } catch (err) {
      console.error('Failed to create folder:', getErrorMessage(err));
    }
  };

  const handleEditFolder = async (data: { name?: string; roomType?: string }) => {
    if (!projectId || !editingFolder) return;

    try {
      await updateFolder.mutateAsync({
        projectId,
        folderId: editingFolder.id,
        input: data,
      });
      setEditingFolder(null);
    } catch (err) {
      console.error('Failed to update folder:', getErrorMessage(err));
    }
  };

  const handleDeleteFolder = async () => {
    if (!projectId || !deletingFolder) return;

    try {
      await deleteFolder.mutateAsync({
        projectId,
        folderId: deletingFolder.id,
      });
      if (selectedFolder?.id === deletingFolder.id) {
        setSelectedFolder(null);
      }
      setDeletingFolder(null);
    } catch (err) {
      console.error('Failed to delete folder:', getErrorMessage(err));
    }
  };

  const handleReorder = async (folderIds: string[]) => {
    if (!projectId) return;

    try {
      await reorderFolders.mutateAsync({
        projectId,
        folderIds,
      });
    } catch (err) {
      console.error('Failed to reorder folders:', getErrorMessage(err));
    }
  };

  // Photo handlers
  const handleUploadPhotos = async (files: File[]) => {
    if (!selectedFolder) return;

    try {
      await uploadPhotos.mutateAsync({
        folderId: selectedFolder.id,
        files,
      });
    } catch (err) {
      console.error('Failed to upload photos:', getErrorMessage(err));
    }
  };

  const handleSelectPhoto = useCallback((photo: Photo) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        next.add(photo.id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPhotoIds(new Set());
  }, []);

  const handleDeleteSinglePhoto = async () => {
    if (!selectedFolder || !deletingPhoto) return;

    try {
      await deletePhotoMutation.mutateAsync({
        folderId: selectedFolder.id,
        photoId: deletingPhoto.id,
      });
      setDeletingPhoto(null);
    } catch (err) {
      console.error('Failed to delete photo:', getErrorMessage(err));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedFolder || selectedPhotoIds.size === 0) return;

    try {
      await bulkDeletePhotos.mutateAsync({
        folderId: selectedFolder.id,
        photoIds: Array.from(selectedPhotoIds),
      });
      setSelectedPhotoIds(new Set());
    } catch (err) {
      console.error('Failed to delete photos:', getErrorMessage(err));
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Project not found
          </h2>
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedRoomType = selectedFolder
    ? getRoomType(selectedFolder.roomType)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-slate-400 hover:text-slate-600 transition-colors"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-display font-bold text-slate-900">
                {project.name}
              </h1>
            </div>
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

      {/* Main content - two column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folder list */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-hidden">
          <FolderList
            folders={folders}
            selectedFolderId={selectedFolder?.id || null}
            onSelectFolder={(folder) => {
              setSelectedFolder(folder);
              setSelectedPhotoIds(new Set());
            }}
            onEditFolder={setEditingFolder}
            onDeleteFolder={setDeletingFolder}
            onReorder={handleReorder}
            onAddFolder={() => setIsCreateOpen(true)}
            isLoading={foldersLoading}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          {selectedFolder ? (
            <div className="p-6">
              {/* Folder header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary-600"
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
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {selectedFolder.name}
                  </h2>
                  {selectedRoomType && (
                    <p className="text-sm text-slate-500">
                      {selectedRoomType.label} - {photos.length} photos
                    </p>
                  )}
                </div>
              </div>

              {/* Photo uploader */}
              <div className="mb-6">
                <PhotoUploader
                  onUpload={handleUploadPhotos}
                  isUploading={uploadPhotos.isPending}
                  progress={uploadPhotos.progress}
                />
              </div>

              {/* Photos grid */}
              {photosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : photos.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No photos yet
                  </h3>
                  <p className="text-slate-500">
                    Drag and drop photos above to start uploading.
                  </p>
                </div>
              ) : (
                <PhotoGrid
                  photos={photos}
                  selectedIds={selectedPhotoIds}
                  isSelectionMode={isSelectionMode}
                  onSelect={handleSelectPhoto}
                  onClick={setPreviewPhoto}
                  onDelete={setDeletingPhoto}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
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
                  Select a folder
                </h3>
                <p className="text-slate-500">
                  Choose a folder from the sidebar to view its contents.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Selection bar for bulk actions */}
      <SelectionBar
        selectedCount={selectedPhotoIds.size}
        onClearSelection={handleClearSelection}
        onDelete={handleBulkDelete}
        isDeleting={bulkDeletePhotos.isPending}
      />

      {/* Photo preview modal */}
      <PhotoPreviewModal
        photo={previewPhoto}
        photos={photos}
        onClose={() => setPreviewPhoto(null)}
        onNavigate={setPreviewPhoto}
      />

      {/* Folder dialogs */}
      <CreateFolderDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateFolder}
        isLoading={createFolder.isPending}
      />

      <EditFolderDialog
        folder={editingFolder}
        isOpen={!!editingFolder}
        onClose={() => setEditingFolder(null)}
        onSubmit={handleEditFolder}
        isLoading={updateFolder.isPending}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingFolder}
        title="Delete Folder"
        message={`Are you sure you want to delete "${deletingFolder?.name}"? All photos in this folder will also be deleted.`}
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeletingFolder(null)}
        isLoading={deleteFolder.isPending}
      />

      {/* Photo delete confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deletingPhoto}
        title="Delete Photo"
        message={`Are you sure you want to delete "${deletingPhoto?.originalName}"?`}
        onConfirm={handleDeleteSinglePhoto}
        onCancel={() => setDeletingPhoto(null)}
        isLoading={deletePhotoMutation.isPending}
      />
    </div>
  );
}
