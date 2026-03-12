import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useAnalysisJob } from '@/hooks/useAnalysis';
import { useJobItems, useJobSummary } from '@/hooks/useInventory';
import { exportXactimateCSV, exportPDF } from '@/api/inventory';
import { formatCurrency, formatProcessingTime } from '@/api/analysis';
import { InventoryTable } from '@/components/inventory';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '@/api/inventory';

function SummaryCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function RoomAccordion({
  room,
  items,
  onEditItem,
  onDeleteItem,
}: {
  room: { folderId: string; roomName: string; count: number; roomRCV: number; roomACV: number };
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const roomItems = items.filter((i) => i.folderId === room.folderId);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-90')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="font-medium text-slate-900">{room.roomName}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {room.count} {room.count === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-500">
            RCV <span className="font-medium text-slate-900">{formatCurrency(room.roomRCV)}</span>
          </span>
          <span className="text-slate-500">
            ACV <span className="font-medium text-slate-900">{formatCurrency(room.roomACV)}</span>
          </span>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4">
          <InventoryTable
            items={roomItems}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            isLoading={false}
          />
        </div>
      )}
    </div>
  );
}

export function AnalysisResultsPage() {
  const { projectId, jobId } = useParams<{ projectId: string; jobId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: job, isLoading: jobLoading } = useAnalysisJob(jobId);
  const { data: items = [], isLoading: itemsLoading } = useJobItems(jobId);
  const { data: summary, isLoading: summaryLoading } = useJobSummary(jobId);

  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportCSV = useCallback(async () => {
    if (!jobId) return;
    setExportingCSV(true);
    try {
      const blob = await exportXactimateCSV(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactimate-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExportingCSV(false);
    }
  }, [jobId]);

  const handleExportPDF = useCallback(async () => {
    if (!jobId) return;
    setExportingPDF(true);
    try {
      const blob = await exportPDF(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPDF(false);
    }
  }, [jobId]);

  const handleEditItem = useCallback((item: InventoryItem) => {
    // TODO: Open edit dialog
    console.log('Edit item:', item.id);
  }, []);

  const handleDeleteItem = useCallback((item: InventoryItem) => {
    // TODO: Open delete confirmation
    console.log('Delete item:', item.id);
  }, []);

  const isLoading = projectLoading || jobLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!project || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {!project ? 'Project not found' : 'Analysis job not found'}
          </h2>
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const triggeredDate = job.triggeredAt ? new Date(job.triggeredAt).toLocaleString() : '—';
  const completedDate = job.completedAt ? new Date(job.completedAt).toLocaleString() : '—';
  const processingTime =
    job.triggeredAt && job.completedAt
      ? formatProcessingTime(new Date(job.completedAt).getTime() - new Date(job.triggeredAt).getTime())
      : '—';

  const confidencePercent = summary ? Math.round(summary.averageConfidence * 100) : 0;
  const confidenceColor =
    confidencePercent > 70
      ? 'text-green-600'
      : confidencePercent >= 50
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900">
                {project.name} — Analysis Results
              </h1>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Triggered: {triggeredDate}</span>
                <span>Completed: {completedDate}</span>
                <span>Duration: {processingTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Items"
            value={summaryLoading ? '...' : String(summary?.totalItems ?? 0)}
            icon={
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <SummaryCard
            label="Total RCV"
            value={summaryLoading ? '...' : formatCurrency(summary?.totalRCV ?? 0)}
            className="border-green-200 bg-green-50"
            icon={
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <SummaryCard
            label="Total ACV"
            value={summaryLoading ? '...' : formatCurrency(summary?.totalACV ?? 0)}
            className="border-blue-200 bg-blue-50"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <SummaryCard
            label="Avg Confidence"
            value={summaryLoading ? '...' : `${confidencePercent}%`}
            icon={
              <svg className={cn('w-5 h-5', confidenceColor)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </section>

        {/* Room Breakdown */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Room Breakdown</h2>
          {summaryLoading || itemsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : summary?.itemsByRoom.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              No items found for this analysis.
            </div>
          ) : (
            <div className="space-y-3">
              {summary?.itemsByRoom.map((room) => (
                <RoomAccordion
                  key={room.folderId}
                  room={room}
                  items={items}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </section>

        {/* Full Inventory Table */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">All Items</h2>
          <InventoryTable
            items={items}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            isLoading={itemsLoading}
          />
        </section>

        {/* Export Actions */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Export & Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleExportCSV} isLoading={exportingCSV}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Xactimate CSV
            </Button>
            <Button variant="secondary" onClick={handleExportPDF} isLoading={exportingPDF}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF Report
            </Button>
            {job.sheetUrl && (
              <a
                href={job.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Google Sheet
              </a>
            )}
            <Button
              variant="ghost"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Re-run Analysis
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
