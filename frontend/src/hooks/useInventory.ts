import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchJobItems,
  fetchJobSummary,
  fetchFolderItems,
  updateItem,
  deleteItem,
  bulkUpdateItems,
  type InventoryItemUpdate,
} from '@/api/inventory';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  jobItems: (jobId: string) => [...inventoryKeys.all, 'job', jobId, 'items'] as const,
  jobSummary: (jobId: string) => [...inventoryKeys.all, 'job', jobId, 'summary'] as const,
  folderItems: (folderId: string) => [...inventoryKeys.all, 'folder', folderId] as const,
};

export function useJobItems(jobId: string | null | undefined) {
  return useQuery({
    queryKey: inventoryKeys.jobItems(jobId!),
    queryFn: () => fetchJobItems(jobId!),
    enabled: !!jobId,
  });
}

export function useJobSummary(jobId: string | null | undefined) {
  return useQuery({
    queryKey: inventoryKeys.jobSummary(jobId!),
    queryFn: () => fetchJobSummary(jobId!),
    enabled: !!jobId,
  });
}

export function useFolderItems(folderId: string | null | undefined) {
  return useQuery({
    queryKey: inventoryKeys.folderItems(folderId!),
    queryFn: () => fetchFolderItems(folderId!),
    enabled: !!folderId,
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: InventoryItemUpdate }) =>
      updateItem(itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useBulkUpdateItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemIds, updates }: { itemIds: string[]; updates: InventoryItemUpdate }) =>
      bulkUpdateItems(itemIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
