import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

/**
 * Verify job ownership and return the job
 */
async function verifyJobOwnership(jobId: string, userId: string) {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: { userId: true, name: true },
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
 * Escape a value for CSV output
 */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate Xactimate-compatible CSV for an analysis job
 */
export async function generateXactimateCSV(
  jobId: string,
  userId: string
): Promise<Buffer> {
  await verifyJobOwnership(jobId, userId);

  const items = await prisma.inventoryItem.findMany({
    where: { analysisJobId: jobId },
    orderBy: [
      { folder: { name: 'asc' } },
      { createdAt: 'asc' },
    ],
    include: {
      folder: {
        select: { name: true },
      },
    },
  });

  // CSV header
  const headers = [
    'Line#',
    'Room',
    'Category',
    'Selector',
    'CatSel',
    'Description',
    'Qty',
    'Unit Price',
    'Total RCV',
    'Dep%',
    'Dep Amount',
    'ACV',
    'Age',
    'Condition',
    'Brand',
    'Model',
    'Source',
  ];

  const rows: string[] = [headers.map(csvEscape).join(',')];

  let totalRCV = 0;
  let totalDep = 0;
  let totalACV = 0;

  items.forEach((item, index) => {
    const unitPrice = item.quantity > 0 ? item.rcv / item.quantity : item.rcv;
    totalRCV += item.rcv;
    totalDep += item.depreciationAmount;
    totalACV += item.acv;

    const row = [
      index + 1,
      item.folder.name,
      item.category,
      item.selector,
      item.catselCode,
      item.description,
      item.quantity,
      unitPrice.toFixed(2),
      item.rcv.toFixed(2),
      (item.depreciationRate * 100).toFixed(1) + '%',
      item.depreciationAmount.toFixed(2),
      item.acv.toFixed(2),
      item.ageYears,
      item.condition,
      item.brand ?? '',
      item.model ?? '',
      item.priceSource,
    ];

    rows.push(row.map(csvEscape).join(','));
  });

  // Blank row then summary
  rows.push('');
  const summaryRow = [
    '',
    '',
    '',
    '',
    '',
    'TOTALS',
    items.reduce((sum, i) => sum + i.quantity, 0),
    '',
    totalRCV.toFixed(2),
    '',
    totalDep.toFixed(2),
    totalACV.toFixed(2),
    '',
    '',
    '',
    '',
    '',
  ];
  rows.push(summaryRow.map(csvEscape).join(','));

  const csvString = rows.join('\n');
  return Buffer.from(csvString, 'utf-8');
}

/**
 * Generate summary JSON for report display
 */
export async function generateSummaryJSON(
  jobId: string,
  userId: string
) {
  const job = await verifyJobOwnership(jobId, userId);

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

  // Group by room
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
    roomRCV: Math.round(data.roomRCV * 100) / 100,
    roomACV: Math.round(data.roomACV * 100) / 100,
  }));

  return {
    jobId: job.id,
    projectName: job.project.name,
    status: job.status,
    triggeredAt: job.triggeredAt,
    completedAt: job.completedAt,
    totalItems,
    totalRCV: Math.round(totalRCV * 100) / 100,
    totalACV: Math.round(totalACV * 100) / 100,
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    averageConfidence: Math.round(averageConfidence * 10000) / 10000,
    itemsByRoom,
  };
}
