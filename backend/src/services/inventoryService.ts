import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

// Depreciation schedules from project-config.md
const DEPRECIATION_SCHEDULES: Record<string, { usefulLife: number; salvagePercent: number; method: string }> = {
  electronics: { usefulLife: 5, salvagePercent: 0.10, method: 'double_declining' },
  furniture: { usefulLife: 10, salvagePercent: 0.20, method: 'straight_line' },
  clothing: { usefulLife: 3, salvagePercent: 0.40, method: 'straight_line' },
  appliances: { usefulLife: 12, salvagePercent: 0.15, method: 'straight_line' },
  jewelry: { usefulLife: 20, salvagePercent: 0.50, method: 'straight_line' },
  tools: { usefulLife: 10, salvagePercent: 0.30, method: 'straight_line' },
  decor: { usefulLife: 7, salvagePercent: 0.10, method: 'straight_line' },
  kitchenware: { usefulLife: 8, salvagePercent: 0.15, method: 'straight_line' },
  sporting_goods: { usefulLife: 7, salvagePercent: 0.15, method: 'straight_line' },
  default: { usefulLife: 7, salvagePercent: 0.10, method: 'straight_line' },
};

const CONDITION_AGE_MAP: Record<string, number> = {
  new: 0.5,
  'like-new': 1,
  good: 3,
  fair: 5,
  poor: 8,
};

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 0.0,
  'like-new': 0.1,
  good: 0.15,
  fair: 0.25,
  poor: 0.4,
};

/**
 * Recalculate depreciation based on object type, condition, and RCV
 */
function recalculateDepreciation(
  objectType: string,
  condition: string,
  rcv: number
): { depreciationRate: number; depreciationAmount: number; acv: number; ageYears: number; depreciationMethod: string } {
  const category = objectType.toLowerCase().replace(/\s+/g, '_');
  const schedule = DEPRECIATION_SCHEDULES[category] ?? DEPRECIATION_SCHEDULES['default']!;
  const age = CONDITION_AGE_MAP[condition.toLowerCase()] ?? 3;
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition.toLowerCase()] ?? 0.15;

  let depRate: number;

  if (schedule.method === 'double_declining') {
    const annualRate = 2 / schedule.usefulLife;
    let bookValue = 1.0;
    for (let i = 0; i < Math.floor(age); i++) {
      bookValue *= (1 - annualRate);
    }
    // Partial year
    const fractional = age - Math.floor(age);
    if (fractional > 0) {
      bookValue *= (1 - annualRate * fractional);
    }
    depRate = Math.min(1 - bookValue, 1 - schedule.salvagePercent);
  } else {
    // Straight-line
    const annualRate = (1 - schedule.salvagePercent) / schedule.usefulLife;
    const rawRate = Math.min(age * annualRate, 1 - schedule.salvagePercent);
    const adjusted = rawRate * (1 + conditionMultiplier * 0.3);
    depRate = Math.min(adjusted, 1 - schedule.salvagePercent);
  }

  const depreciationAmount = Math.round(rcv * depRate * 100) / 100;
  const acv = Math.round((rcv - depreciationAmount) * 100) / 100;

  return {
    depreciationRate: Math.round(depRate * 10000) / 10000,
    depreciationAmount,
    acv,
    ageYears: age,
    depreciationMethod: schedule.method,
  };
}

/**
 * Verify job ownership and return the job
 */
async function verifyJobOwnership(jobId: string, userId: string) {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: { userId: true },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('AnalysisJob', jobId);
  }

  if (job.project.userId !== userId) {
    throw new ForbiddenError();
  }

  return job;
}

/**
 * List all inventory items for an analysis job
 */
export async function listItemsByJob(jobId: string, userId: string) {
  await verifyJobOwnership(jobId, userId);

  const items = await prisma.inventoryItem.findMany({
    where: { analysisJobId: jobId },
    orderBy: [{ folderId: 'asc' }, { createdAt: 'asc' }],
    include: {
      folder: {
        select: { name: true },
      },
    },
  });

  return items;
}

/**
 * Get aggregated summary for an analysis job
 */
export async function getJobSummary(jobId: string, userId: string) {
  await verifyJobOwnership(jobId, userId);

  const items = await prisma.inventoryItem.findMany({
    where: { analysisJobId: jobId },
    include: {
      folder: {
        select: { id: true, name: true },
      },
    },
  });

  const totalItems = items.length;
  const totalRCV = items.reduce((sum, item) => sum + item.rcv, 0);
  const totalACV = items.reduce((sum, item) => sum + item.acv, 0);
  const totalDepreciation = items.reduce((sum, item) => sum + item.depreciationAmount, 0);
  const averageConfidence = totalItems > 0
    ? items.reduce((sum, item) => sum + item.confidence, 0) / totalItems
    : 0;

  // Group by folder/room
  const roomMap = new Map<string, { roomName: string; count: number; roomRCV: number; roomACV: number }>();
  for (const item of items) {
    const existing = roomMap.get(item.folderId);
    if (existing) {
      existing.count++;
      existing.roomRCV += item.rcv;
      existing.roomACV += item.acv;
    } else {
      roomMap.set(item.folderId, {
        roomName: item.folder.name,
        count: 1,
        roomRCV: item.rcv,
        roomACV: item.acv,
      });
    }
  }

  const itemsByRoom = Array.from(roomMap.entries()).map(([folderId, data]) => ({
    folderId,
    ...data,
  }));

  return {
    totalItems,
    totalRCV: Math.round(totalRCV * 100) / 100,
    totalACV: Math.round(totalACV * 100) / 100,
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    itemsByRoom,
    averageConfidence: Math.round(averageConfidence * 10000) / 10000,
  };
}

/**
 * Get a single inventory item by ID
 */
export async function getItem(itemId: string, userId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      analysisJob: {
        include: {
          project: {
            select: { userId: true },
          },
        },
      },
      folder: {
        select: { name: true },
      },
    },
  });

  if (!item) {
    throw new NotFoundError('InventoryItem', itemId);
  }

  if (item.analysisJob.project.userId !== userId) {
    throw new ForbiddenError();
  }

  // Remove nested ownership data from response
  const { analysisJob: _, ...itemData } = item;
  return itemData;
}

/**
 * Update a single inventory item
 */
export async function updateItem(
  itemId: string,
  userId: string,
  updates: {
    description?: string;
    brand?: string | null;
    model?: string | null;
    condition?: string;
    quantity?: number;
    rcv?: number;
    material?: string | null;
    color?: string | null;
    catselCode?: string;
    isVerified?: boolean;
  }
) {
  // Verify ownership
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      analysisJob: {
        include: {
          project: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!item) {
    throw new NotFoundError('InventoryItem', itemId);
  }

  if (item.analysisJob.project.userId !== userId) {
    throw new ForbiddenError();
  }

  // Build update data
  const data: Record<string, unknown> = { isEdited: true };

  if (updates.description !== undefined) data.description = updates.description;
  if (updates.brand !== undefined) data.brand = updates.brand;
  if (updates.model !== undefined) data.model = updates.model;
  if (updates.condition !== undefined) data.condition = updates.condition;
  if (updates.quantity !== undefined) data.quantity = updates.quantity;
  if (updates.rcv !== undefined) data.rcv = updates.rcv;
  if (updates.material !== undefined) data.material = updates.material;
  if (updates.color !== undefined) data.color = updates.color;
  if (updates.isVerified !== undefined) data.isVerified = updates.isVerified;

  // Parse catselCode into category and selector
  if (updates.catselCode !== undefined) {
    data.catselCode = updates.catselCode;
    const parts = updates.catselCode.split('-');
    if (parts.length >= 2) {
      data.category = parts[0];
      data.selector = parts.slice(1).join('-');
    }
  }

  // Recalculate depreciation if rcv or condition changed
  if (updates.rcv !== undefined || updates.condition !== undefined) {
    const effectiveCondition = updates.condition ?? item.condition;
    const effectiveRcv = updates.rcv ?? item.rcv;
    const depreciation = recalculateDepreciation(item.objectType, effectiveCondition, effectiveRcv);
    data.depreciationRate = depreciation.depreciationRate;
    data.depreciationAmount = depreciation.depreciationAmount;
    data.acv = depreciation.acv;
    data.ageYears = depreciation.ageYears;
    data.depreciationMethod = depreciation.depreciationMethod;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data,
    include: {
      folder: {
        select: { name: true },
      },
    },
  });

  return updated;
}

/**
 * Delete a single inventory item
 */
export async function deleteItem(itemId: string, userId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      analysisJob: {
        include: {
          project: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!item) {
    throw new NotFoundError('InventoryItem', itemId);
  }

  if (item.analysisJob.project.userId !== userId) {
    throw new ForbiddenError();
  }

  await prisma.inventoryItem.delete({
    where: { id: itemId },
  });

  return { success: true };
}

/**
 * Bulk update multiple inventory items
 */
export async function bulkUpdateItems(
  itemIds: string[],
  userId: string,
  updates: {
    condition?: string;
    isVerified?: boolean;
    catselCode?: string;
  }
) {
  // Verify all items exist and belong to the same job owned by user
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      analysisJob: {
        include: {
          project: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (items.length === 0 || items.length !== itemIds.length) {
    throw new NotFoundError('InventoryItem', `${itemIds.length - items.length} items not found`);
  }

  // Verify all items belong to the same job
  const jobIds = new Set(items.map((item) => item.analysisJobId));
  if (jobIds.size !== 1) {
    throw new ForbiddenError('All items must belong to the same analysis job');
  }

  // Verify ownership
  if (items[0]!.analysisJob.project.userId !== userId) {
    throw new ForbiddenError();
  }

  // Build update data
  const data: Record<string, unknown> = { isEdited: true };

  if (updates.condition !== undefined) data.condition = updates.condition;
  if (updates.isVerified !== undefined) data.isVerified = updates.isVerified;

  if (updates.catselCode !== undefined) {
    data.catselCode = updates.catselCode;
    const parts = updates.catselCode.split('-');
    if (parts.length >= 2) {
      data.category = parts[0];
      data.selector = parts.slice(1).join('-');
    }
  }

  const result = await prisma.inventoryItem.updateMany({
    where: { id: { in: itemIds } },
    data,
  });

  return { count: result.count };
}

/**
 * List inventory items for a specific folder/room
 */
export async function listItemsByFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      project: {
        select: { userId: true },
      },
    },
  });

  if (!folder) {
    throw new NotFoundError('Folder', folderId);
  }

  if (folder.project.userId !== userId) {
    throw new ForbiddenError();
  }

  const items = await prisma.inventoryItem.findMany({
    where: { folderId },
    orderBy: { createdAt: 'asc' },
    include: {
      folder: {
        select: { name: true },
      },
    },
  });

  return items;
}
