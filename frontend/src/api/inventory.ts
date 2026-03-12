import { apiClient } from './client';

// Types
export interface InventoryItem {
  id: string;
  analysisJobId: string;
  folderId: string;
  photoId: string | null;
  objectType: string;
  category: string;
  selector: string;
  catselCode: string;
  brand: string | null;
  model: string | null;
  description: string;
  condition: string;
  material: string | null;
  color: string | null;
  sizeEstimate: string | null;
  quantity: number;
  rcv: number;
  depreciationRate: number;
  depreciationAmount: number;
  acv: number;
  ageYears: number;
  depreciationMethod: string;
  priceSource: string;
  confidence: number;
  identificationSource: string;
  pricingSearchQuery: string | null;
  thumbnailUrl: string | null;
  isVerified: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  folder?: { name: string };
}

export interface RoomSummary {
  folderId: string;
  roomName: string;
  count: number;
  roomRCV: number;
  roomACV: number;
}

export interface JobSummary {
  totalItems: number;
  totalRCV: number;
  totalACV: number;
  totalDepreciation: number;
  itemsByRoom: RoomSummary[];
  averageConfidence: number;
}

export type InventoryItemUpdate = Partial<
  Pick<
    InventoryItem,
    'description' | 'brand' | 'model' | 'condition' | 'quantity' | 'rcv' | 'material' | 'color' | 'catselCode' | 'isVerified'
  >
>;

// API Functions

export async function fetchJobItems(jobId: string): Promise<InventoryItem[]> {
  const response = await apiClient.get<InventoryItem[]>(`/inventory/job/${jobId}`);
  return response.data;
}

export async function fetchJobSummary(jobId: string): Promise<JobSummary> {
  const response = await apiClient.get<JobSummary>(`/inventory/job/${jobId}/summary`);
  return response.data;
}

export async function fetchFolderItems(folderId: string): Promise<InventoryItem[]> {
  const response = await apiClient.get<InventoryItem[]>(`/inventory/folder/${folderId}`);
  return response.data;
}

export async function updateItem(itemId: string, updates: InventoryItemUpdate): Promise<InventoryItem> {
  const response = await apiClient.patch<InventoryItem>(`/inventory/${itemId}`, updates);
  return response.data;
}

export async function deleteItem(itemId: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(`/inventory/${itemId}`);
  return response.data;
}

export async function bulkUpdateItems(
  itemIds: string[],
  updates: InventoryItemUpdate
): Promise<{ count: number }> {
  const response = await apiClient.patch<{ count: number }>('/inventory/bulk', {
    itemIds,
    updates,
  });
  return response.data;
}

export async function exportXactimateCSV(jobId: string): Promise<Blob> {
  const response = await apiClient.get(`/reports/${jobId}/xactimate`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function exportPDF(jobId: string): Promise<Blob> {
  const response = await apiClient.get(`/reports/${jobId}/pdf`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
