import { useState, useMemo, useCallback } from 'react';
import type { InventoryItem } from '@/api/inventory';
import { cn } from '@/lib/utils';

interface InventoryTableProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  isLoading: boolean;
}

type SortField =
  | 'room'
  | 'description'
  | 'brandModel'
  | 'catselCode'
  | 'condition'
  | 'quantity'
  | 'rcv'
  | 'depreciationRate'
  | 'acv'
  | 'confidence';

type SortDirection = 'asc' | 'desc';

const conditionConfig: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-green-100 text-green-800' },
  'like-new': { label: 'Like New', className: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Good', className: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Fair', className: 'bg-amber-100 text-amber-800' },
  poor: { label: 'Poor', className: 'bg-red-100 text-red-800' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getSortValue(item: InventoryItem, field: SortField): string | number {
  switch (field) {
    case 'room':
      return item.folder?.name ?? '';
    case 'description':
      return item.description;
    case 'brandModel':
      return [item.brand, item.model].filter(Boolean).join(' ');
    case 'catselCode':
      return item.catselCode;
    case 'condition':
      return item.condition;
    case 'quantity':
      return item.quantity;
    case 'rcv':
      return item.rcv;
    case 'depreciationRate':
      return item.depreciationRate;
    case 'acv':
      return item.acv;
    case 'confidence':
      return item.confidence;
  }
}

// Icons as inline SVGs
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <svg className={cn('w-3.5 h-3.5 ml-1 inline-block', active ? 'text-primary-600' : 'text-slate-300')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const color = value > 0.7 ? 'bg-green-500' : value >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2.5 h-2.5 rounded-full', color)} />
      <span className="text-xs text-slate-600">{Math.round(value * 100)}%</span>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export function InventoryTable({
  items,
  onEditItem,
  onDeleteItem,
  isLoading,
}: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('room');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0);

  // Unique rooms for filter dropdown
  const rooms = useMemo(() => {
    const roomSet = new Map<string, string>();
    items.forEach((item) => {
      if (item.folder?.name) {
        roomSet.set(item.folderId, item.folder.name);
      }
    });
    return Array.from(roomSet.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Unique conditions for filter dropdown
  const conditions = useMemo(() => {
    return [...new Set(items.map((item) => item.condition))].sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (roomFilter !== 'all' && item.folderId !== roomFilter) return false;
      if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false;
      if (item.confidence < confidenceThreshold) return false;
      return true;
    });
  }, [items, roomFilter, conditionFilter, confidenceThreshold]);

  // Sort filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sortedItems.length) return new Set();
      return new Set(sortedItems.map((i) => i.id));
    });
  }, [sortedItems]);

  const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const columnHeaders: { field: SortField; label: string; className?: string }[] = [
    { field: 'room', label: 'Room' },
    { field: 'description', label: 'Description' },
    { field: 'brandModel', label: 'Brand/Model' },
    { field: 'catselCode', label: 'CatSel' },
    { field: 'condition', label: 'Condition' },
    { field: 'quantity', label: 'Qty', className: 'text-right' },
    { field: 'rcv', label: 'RCV', className: 'text-right' },
    { field: 'depreciationRate', label: 'Dep%', className: 'text-right' },
    { field: 'acv', label: 'ACV', className: 'text-right' },
    { field: 'confidence', label: 'Conf' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Room</label>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Condition</label>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Conditions</option>
            {conditions.map((c) => (
              <option key={c} value={c}>{conditionConfig[c]?.label ?? c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">
            Min Confidence: {Math.round(confidenceThreshold * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            className="w-24 accent-primary-600"
          />
        </div>

        <div className="ml-auto text-xs text-slate-500">
          {filteredItems.length === items.length
            ? `${items.length} items`
            : `${filteredItems.length} of ${items.length} items`}
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="w-14 px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Photo
              </th>
              {columnHeaders.map((col) => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className={cn(
                    'px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none',
                    col.className
                  )}
                >
                  {col.label}
                  <SortIcon active={sortField === col.field} direction={sortField === col.field ? sortDirection : 'asc'} />
                </th>
              ))}
              <th className="w-20 px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.map((item) => {
              const cond = conditionConfig[item.condition];
              const isClaudeSupplement = item.identificationSource === 'claude_supplementary';
              const needsReview = item.priceSource?.includes('Needs Review');
              const brandModel = [item.brand, item.model].filter(Boolean).join(' ');

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'hover:bg-slate-50 transition-colors',
                    isClaudeSupplement && 'bg-yellow-50',
                    selectedIds.has(item.id) && 'bg-primary-50'
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.description}
                        className="h-12 w-12 rounded object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.folder?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <span className="block truncate text-slate-900 font-medium" title={item.description}>
                      {item.description}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[140px]">
                    <span className="block truncate" title={brandModel}>
                      {brandModel || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {item.catselCode}
                    </code>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', cond?.className ?? 'bg-slate-100 text-slate-700')}>
                      {cond?.label ?? item.condition}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">
                    {formatCurrency(item.rcv)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {Math.round(item.depreciationRate * 100)}%
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1">
                      {formatCurrency(item.acv)}
                      {needsReview && (
                        <WarningIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ConfidenceDot value={item.confidence} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                        aria-label="Edit item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Delete item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-slate-500">
                  {items.length === 0
                    ? 'No inventory items yet.'
                    : 'No items match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout (hidden on desktop) */}
      <div className="md:hidden space-y-3">
        {sortedItems.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            {items.length === 0
              ? 'No inventory items yet.'
              : 'No items match the current filters.'}
          </div>
        )}
        {sortedItems.map((item) => {
          const cond = conditionConfig[item.condition];
          const isClaudeSupplement = item.identificationSource === 'claude_supplementary';
          const needsReview = item.priceSource?.includes('Needs Review');
          const brandModel = [item.brand, item.model].filter(Boolean).join(' ');

          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border border-slate-200 bg-white p-4',
                isClaudeSupplement && 'bg-yellow-50 border-yellow-200',
                selectedIds.has(item.id) && 'ring-2 ring-primary-500'
              )}
            >
              <div className="flex gap-3">
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.description}
                    className="h-16 w-16 rounded object-cover bg-slate-100 shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-slate-400 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {item.description}
                    </h4>
                    <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', cond?.className ?? 'bg-slate-100 text-slate-700')}>
                      {cond?.label ?? item.condition}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.folder?.name ?? '—'}
                    {brandModel && ` \u00B7 ${brandModel}`}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="font-medium text-slate-900">RCV {formatCurrency(item.rcv)}</span>
                    <span className="text-slate-500">{Math.round(item.depreciationRate * 100)}% dep</span>
                    <span className="font-medium text-slate-900">
                      ACV {formatCurrency(item.acv)}
                      {needsReview && <WarningIcon className="w-3.5 h-3.5 text-amber-500 inline ml-1" />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                        {item.catselCode}
                      </code>
                      <ConfidenceDot value={item.confidence} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                        aria-label="Edit item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Delete item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
