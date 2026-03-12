import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryItemUpdate } from '@/api/inventory';

interface ItemEditDialogProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: InventoryItemUpdate) => void;
  isLoading: boolean;
}

// Depreciation schedules
const SCHEDULES: Record<string, { usefulLife: number; salvagePercent: number; method: string }> = {
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

const CONDITION_AGE: Record<string, number> = {
  new: 0.5, 'like-new': 1, good: 3, fair: 5, poor: 8, destroyed: 10,
};

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 0.0, 'like-new': 0.1, good: 0.15, fair: 0.25, poor: 0.4, destroyed: 0.6,
};

function calculateDepreciation(objectType: string, condition: string, rcv: number) {
  const category = objectType.toLowerCase().replace(/\s+/g, '_');
  const schedule = SCHEDULES[category] ?? SCHEDULES['default']!;
  const age = CONDITION_AGE[condition] ?? 3;
  const condMult = CONDITION_MULTIPLIERS[condition] ?? 0.15;

  let depRate: number;

  if (schedule.method === 'double_declining') {
    const annualRate = 2 / schedule.usefulLife;
    let bookValue = 1.0;
    for (let i = 0; i < Math.floor(age); i++) {
      bookValue *= (1 - annualRate);
    }
    const frac = age - Math.floor(age);
    if (frac > 0) bookValue *= (1 - annualRate * frac);
    depRate = Math.min(1 - bookValue, 1 - schedule.salvagePercent);
  } else {
    const annualRate = (1 - schedule.salvagePercent) / schedule.usefulLife;
    const rawRate = Math.min(age * annualRate, 1 - schedule.salvagePercent);
    const adjusted = rawRate * (1 + condMult * 0.3);
    depRate = Math.min(adjusted, 1 - schedule.salvagePercent);
  }

  const depAmount = Math.round(rcv * depRate * 100) / 100;
  const acv = Math.round((rcv - depAmount) * 100) / 100;

  return { depRate: Math.round(depRate * 10000) / 10000, depAmount, acv };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'destroyed', label: 'Destroyed' },
];

const selectStyles =
  'w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed';

const textareaStyles =
  'w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm resize-none disabled:bg-slate-100 disabled:cursor-not-allowed';

export function ItemEditDialog({
  item,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: ItemEditDialogProps) {
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rcv, setRcv] = useState(0);
  const [catselCode, setCatselCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setDescription(item.description);
      setBrand(item.brand ?? '');
      setModel(item.model ?? '');
      setCondition(item.condition);
      setMaterial(item.material ?? '');
      setColor(item.color ?? '');
      setQuantity(item.quantity);
      setRcv(item.rcv);
      setCatselCode(item.catselCode);
      setIsVerified(item.isVerified);
      setPhotoExpanded(false);
    }
  }, [item]);

  // Live depreciation preview
  const depPreview = useMemo(() => {
    if (!item) return null;
    return calculateDepreciation(item.objectType, condition, rcv);
  }, [item, condition, rcv]);

  const hasChanges = useMemo(() => {
    if (!item) return false;
    return (
      description !== item.description ||
      brand !== (item.brand ?? '') ||
      model !== (item.model ?? '') ||
      condition !== item.condition ||
      material !== (item.material ?? '') ||
      color !== (item.color ?? '') ||
      quantity !== item.quantity ||
      rcv !== item.rcv ||
      catselCode !== item.catselCode ||
      isVerified !== item.isVerified
    );
  }, [item, description, brand, model, condition, material, color, quantity, rcv, catselCode, isVerified]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !hasChanges) {
      onClose();
      return;
    }

    const updates: InventoryItemUpdate = {};
    if (description !== item.description) updates.description = description;
    if (brand !== (item.brand ?? '')) updates.brand = brand || null;
    if (model !== (item.model ?? '')) updates.model = model || null;
    if (condition !== item.condition) updates.condition = condition;
    if (material !== (item.material ?? '')) updates.material = material || null;
    if (color !== (item.color ?? '')) updates.color = color || null;
    if (quantity !== item.quantity) updates.quantity = quantity;
    if (rcv !== item.rcv) updates.rcv = rcv;
    if (catselCode !== item.catselCode) updates.catselCode = catselCode;
    if (isVerified !== item.isVerified) updates.isVerified = isVerified;

    onSave(updates);
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            <div className="bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900">
                    Edit Item
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {item.objectType} — {item.folder?.name ?? 'Unknown Room'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-6 p-6">
                  {/* Left column — Photo */}
                  <div className="md:w-2/5 shrink-0">
                    {item.thumbnailUrl ? (
                      <button
                        type="button"
                        onClick={() => setPhotoExpanded((v) => !v)}
                        className="w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.description}
                          className={cn(
                            'w-full object-cover transition-all',
                            photoExpanded ? 'max-h-[500px]' : 'max-h-[240px]'
                          )}
                        />
                      </button>
                    ) : (
                      <div className="w-full h-48 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Item metadata below photo */}
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Source</span>
                        <span className="text-slate-700 font-medium">{item.identificationSource}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Source</span>
                        <span className="text-slate-700 font-medium">{item.priceSource}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence</span>
                        <span className={cn(
                          'font-medium',
                          item.confidence > 0.7 ? 'text-green-600' : item.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      {item.pricingSearchQuery && (
                        <div className="flex justify-between">
                          <span>Search Query</span>
                          <span className="text-slate-700 font-medium truncate ml-2 max-w-[160px]" title={item.pricingSearchQuery}>
                            {item.pricingSearchQuery}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column — Form fields */}
                  <div className="flex-1 space-y-4">
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        disabled={isLoading}
                        className={textareaStyles}
                      />
                    </div>

                    {/* Brand + Model row */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g., Samsung"
                        disabled={isLoading}
                      />
                      <Input
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g., QN65Q80B"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Condition
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        disabled={isLoading}
                        className={selectStyles}
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Material + Color row */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Material"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        placeholder="e.g., Leather"
                        disabled={isLoading}
                      />
                      <Input
                        label="Color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g., Black"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Quantity + Age row */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Quantity"
                        type="number"
                        min={1}
                        value={String(quantity)}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={isLoading}
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Age (years)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={item.ageYears}
                          disabled
                          className={cn(selectStyles, 'bg-slate-50 text-slate-500')}
                          title="Age is derived from condition"
                        />
                        <p className="text-xs text-slate-400 mt-0.5">Derived from condition</p>
                      </div>
                    </div>

                    {/* RCV + ACV preview */}
                    <div>
                      <Input
                        label="RCV ($)"
                        type="number"
                        min={0}
                        step={0.01}
                        value={String(rcv)}
                        onChange={(e) => setRcv(Math.max(0, parseFloat(e.target.value) || 0))}
                        disabled={isLoading}
                      />
                      {depPreview && (
                        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">
                              Depreciation: {Math.round(depPreview.depRate * 100)}% ({formatCurrency(depPreview.depAmount)})
                            </span>
                            <span className="font-semibold text-slate-900">
                              ACV: {formatCurrency(depPreview.acv)}
                            </span>
                          </div>
                          {(rcv !== item.rcv || condition !== item.condition) && (
                            <p className="text-xs text-amber-600 mt-1">
                              Changed from {formatCurrency(item.acv)} — will be recalculated on save
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Xactimate Code */}
                    <Input
                      label="Xactimate Code"
                      value={catselCode}
                      onChange={(e) => setCatselCode(e.target.value)}
                      placeholder="ELC/TVFL"
                      disabled={isLoading}
                    />

                    {/* Notes (future use) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={2}
                        disabled={isLoading}
                        placeholder="Add notes for this item..."
                        className={textareaStyles}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      disabled={isLoading}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Mark as Verified</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isLoading}
                      disabled={!hasChanges}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
